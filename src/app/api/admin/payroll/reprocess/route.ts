import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/database/client';
import { logger } from '@/lib/utils/logger'

interface ReprocessJob {
  id: string;
  date: string;
  status: 'running' | 'completed' | 'error';
  totalRecords: number;
  recordsProcessed?: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// Global job storage (in production, use proper job queue/database)
declare global {
  var reprocessJobs: Map<string, ReprocessJob> | undefined;
}

// Verify admin access
async function verifyAdminAccess() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  return null;
}

// POST /api/admin/payroll/reprocess - Start payroll reprocessing job
export async function POST(request: NextRequest) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ 
        error: 'Date is required' 
      }, { status: 400 });
    }

    // Validate date format
    const payrollDate = new Date(date);
    if (isNaN(payrollDate.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date format' 
      }, { status: 400 });
    }

    // Count total records for this date
    const totalRecordsResult = await db
      .selectFrom('payroll')
      .select(db => db.fn.count('id').as('count'))
      .where('pay_date', '=', payrollDate)
      .execute();

    const totalRecords = Number(totalRecordsResult[0]?.count) || 0;

    if (totalRecords === 0) {
      return NextResponse.json({ 
        error: 'No payroll records found for the specified date' 
      }, { status: 404 });
    }

    // Generate a job ID
    const jobId = `reprocess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create reprocessing job
    const job: ReprocessJob = {
      id: jobId,
      date: date,
      status: 'running' as const,
      totalRecords,
      startedAt: new Date().toISOString(),
    };

    // Store job in memory (in production, use a proper job queue/database)
    global.reprocessJobs = global.reprocessJobs || new Map<string, ReprocessJob>();
    global.reprocessJobs.set(jobId, job);

    // Start the reprocessing work
    simulateReprocessing(jobId, totalRecords);

    return NextResponse.json({
      success: true,
      jobId,
      totalRecords,
      message: `Payroll reprocessing started for ${date}`,
    });

  } catch (error) {
    logger.error('Error starting payroll reprocessing:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET /api/admin/payroll/reprocess?jobId=xyz - Get job status
export async function GET(request: NextRequest) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ 
        error: 'Job ID is required' 
      }, { status: 400 });
    }

    global.reprocessJobs = global.reprocessJobs || new Map<string, ReprocessJob>();
    const job = global.reprocessJobs.get(jobId);

    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error) {
    logger.error('Error getting job status:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Perform actual payroll reprocessing
async function simulateReprocessing(jobId: string, totalRecords: number) {
  const jobs = global.reprocessJobs as Map<string, ReprocessJob>;
  const job = jobs.get(jobId);
  
  if (!job) return;

  try {
    // Parse the date from the job
    const payrollDate = new Date(job.date);
    
    // Get all payroll records for this date
    const payrollRecords = await db
      .selectFrom('payroll')
      .selectAll()
      .where('pay_date', '=', payrollDate)
      .execute();

    let processed = 0;
    const batchSize = 10; // Process in small batches for progress tracking

    // Process in batches to provide progress updates
    for (let i = 0; i < payrollRecords.length; i += batchSize) {
      const batch = payrollRecords.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Recalculate payroll amounts based on current invoice data
          const invoiceTotal = await db
            .selectFrom('invoices')
            .select(db.fn.sum('amount').as('total'))
            .where('agentid', '=', record.agent_id)
            .where('wkending', '=', record.pay_date)
            .executeTakeFirst();

          const overrideTotal = await db
            .selectFrom('overrides')
            .select(db.fn.sum('total').as('total'))
            .where('agentid', '=', record.agent_id)
            .where('wkending', '=', record.pay_date)
            .executeTakeFirst();

          const expenseTotal = await db
            .selectFrom('expenses')
            .select(db.fn.sum('amount').as('total'))
            .where('agentid', '=', record.agent_id)
            .where('wkending', '=', record.pay_date)
            .executeTakeFirst();

          // Calculate new total
          const invoiceAmount = parseFloat(invoiceTotal?.total?.toString() || '0');
          const overrideAmount = parseFloat(overrideTotal?.total?.toString() || '0');
          const expenseAmount = parseFloat(expenseTotal?.total?.toString() || '0');
          const newAmount = invoiceAmount + overrideAmount + expenseAmount;

          // Update payroll record if amount changed
          if (Math.abs(newAmount - parseFloat(record.amount.toString())) > 0.01) {
            await db
              .updateTable('payroll')
              .set({ 
                amount: newAmount.toString(),
                updated_at: new Date()
              })
              .where('id', '=', record.id)
              .execute();
          }

          processed++;

          // Update progress every batch
          if (processed % batchSize === 0 || processed === payrollRecords.length) {
            const updatedJob: ReprocessJob = {
              ...job,
              recordsProcessed: processed,
              status: processed >= totalRecords ? 'completed' : 'running',
              completedAt: processed >= totalRecords ? new Date().toISOString() : undefined,
            };
            jobs.set(jobId, updatedJob);
          }

        } catch (recordError) {
          logger.error(`Error processing payroll record ${record.id}:`, recordError);
          // Continue processing other records even if one fails
        }
      }

      // Small delay to allow progress updates to be visible
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final completion update
    const completedJob: ReprocessJob = {
      ...job,
      recordsProcessed: processed,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    jobs.set(jobId, completedJob);

  } catch (error) {
    logger.error('Error during payroll reprocessing:', error);
    
    // Mark job as failed
    const failedJob: ReprocessJob = {
      ...job,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'An error occurred during reprocessing',
      completedAt: new Date().toISOString(),
    };
    
    jobs.set(jobId, failedJob);
  }
}
