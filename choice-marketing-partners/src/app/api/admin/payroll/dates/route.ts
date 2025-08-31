import { NextResponse } from 'next/server';
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
