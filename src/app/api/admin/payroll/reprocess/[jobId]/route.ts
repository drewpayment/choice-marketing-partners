import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
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

// GET /api/admin/payroll/reprocess/[jobId] - Get job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const { jobId } = await params;
    
    if (!global.reprocessJobs) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    const job = global.reprocessJobs.get(jobId);
    
    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error) {
    logger.error('Error fetching job status:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE /api/admin/payroll/reprocess/[jobId] - Cancel job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const { jobId } = await params;
    
    if (!global.reprocessJobs) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    const job = global.reprocessJobs.get(jobId);
    
    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found' 
      }, { status: 404 });
    }

    if (job.status !== 'running') {
      return NextResponse.json({ 
        error: 'Job is not running and cannot be cancelled' 
      }, { status: 400 });
    }

    // Mark job as cancelled
    const cancelledJob: ReprocessJob = {
      ...job,
      status: 'error',
      errorMessage: 'Cancelled by user',
      completedAt: new Date().toISOString(),
    };

    global.reprocessJobs.set(jobId, cancelledJob);

    return NextResponse.json({ 
      success: true, 
      message: 'Job cancelled successfully' 
    });

  } catch (error) {
    logger.error('Error cancelling job:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
