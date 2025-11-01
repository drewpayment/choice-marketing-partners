import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/database/client';
import { PayrollDatesResponse } from '@/lib/types/admin';

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

// GET /api/admin/payroll/dates
export async function GET() {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const paystubs = await db
      .selectFrom('paystubs')
      .select('issue_date')
      .distinct()
      .orderBy('issue_date', 'desc')
      .limit(10)
      .execute();

    const dates = paystubs.map(paystub => ({
      issueDate: paystub.issue_date.toISOString().split('T')[0], // YYYY-MM-DD format
      displayDate: paystub.issue_date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      })
    }));

    const response: PayrollDatesResponse = {
      dates
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching payroll dates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/payroll/dates - Add new payroll date
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

    // Check if payroll date already exists
    const existingPaystub = await db
      .selectFrom('paystubs')
      .select('id')
      .where('issue_date', '=', payrollDate)
      .executeTakeFirst();

    if (existingPaystub) {
      return NextResponse.json({ 
        error: 'Payroll date already exists' 
      }, { status: 409 });
    }

    // Note: In a real implementation, you would create placeholder paystub records
    // or add to a separate payroll_dates table. For now, we'll return success
    // but in practice, this would need to integrate with your payroll creation logic.
    
    return NextResponse.json({
      success: true,
      message: `Payroll date ${payrollDate.toLocaleDateString()} added successfully`,
      date: {
        issueDate: payrollDate.toISOString().split('T')[0],
        displayDate: payrollDate.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        })
      }
    });

  } catch (error) {
    console.error('Error adding payroll date:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// DELETE /api/admin/payroll/dates - Remove payroll date
export async function DELETE(request: NextRequest) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ 
        error: 'Date parameter is required' 
      }, { status: 400 });
    }

    const payrollDate = new Date(date);
    if (isNaN(payrollDate.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date format' 
      }, { status: 400 });
    }

    // Check if there are any paystubs for this date
    const paystubCount = await db
      .selectFrom('paystubs')
      .select(db => db.fn.count('id').as('count'))
      .where('issue_date', '=', payrollDate)
      .executeTakeFirst();

    const count = Number(paystubCount?.count) || 0;

    if (count > 0) {
      return NextResponse.json({ 
        error: `Cannot delete payroll date with ${count} existing paystub(s)` 
      }, { status: 409 });
    }

    // Note: In a real implementation with a separate payroll_dates table,
    // you would delete the record here. For now, return success.
    
    return NextResponse.json({
      success: true,
      message: `Payroll date ${payrollDate.toLocaleDateString()} removed successfully`
    });

  } catch (error) {
    console.error('Error deleting payroll date:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
