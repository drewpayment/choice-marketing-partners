import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/database/client';

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

// GET /api/admin/payroll/status - Get payroll tracking data
export async function GET(request: NextRequest) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const payDate = searchParams.get('payDate');
    const status = searchParams.get('status'); // 'paid', 'unpaid', or 'all'
    const exportFormat = searchParams.get('export'); // 'true' for CSV export

    let query = db
      .selectFrom('payroll')
      .innerJoin('employees', 'payroll.agent_id', 'employees.id')
      .innerJoin('vendors', 'payroll.vendor_id', 'vendors.id')
      .select([
        'payroll.id',
        'payroll.agent_id',
        'payroll.vendor_id',
        'payroll.pay_date',
        'payroll.amount',
        'payroll.is_paid',
        'employees.name as employee_name',
        'vendors.name as vendor_name',
      ])
      .orderBy('payroll.pay_date', 'desc')  // Latest pay dates first
      .orderBy('employees.name', 'asc');    // Then by employee name

    // Apply filters
    if (vendorId && vendorId !== 'all' && vendorId !== '-1') {
      query = query.where('payroll.vendor_id', '=', parseInt(vendorId));
    }

    if (payDate) {
      const dateValue = new Date(payDate);
      query = query.where('payroll.pay_date', '=', dateValue);
    }

    if (status && status !== 'all') {
      const isPaid = status === 'paid' ? 1 : 0;
      query = query.where('payroll.is_paid', '=', isPaid);
    }

    const payrollRecords = await query.execute();

    const formattedRecords = payrollRecords.map(record => ({
      id: record.id,
      employeeId: record.agent_id,
      employeeName: record.employee_name,
      vendorId: record.vendor_id,
      vendorName: record.vendor_name,
      payDate: record.pay_date.toISOString().split('T')[0],
      amount: parseFloat(record.amount.toString()),
      isPaid: record.is_paid === 1,
    }));

    // Handle CSV export
    if (exportFormat === 'true') {
      const csvHeaders = [
        'Employee Name',
        'Vendor Name', 
        'Pay Date',
        'Amount',
        'Status'
      ];
      
      const csvRows = formattedRecords.map(record => [
        record.employeeName,
        record.vendorName,
        record.payDate,
        record.amount.toFixed(2),
        record.isPaid ? 'Paid' : 'Unpaid'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payroll-data-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({
      records: formattedRecords,
      summary: {
        total: formattedRecords.length,
        paid: formattedRecords.filter(r => r.isPaid).length,
        unpaid: formattedRecords.filter(r => !r.isPaid).length,
        totalAmount: formattedRecords.reduce((sum, r) => sum + r.amount, 0),
      }
    });
  } catch (error) {
    console.error('Error fetching payroll status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/payroll/status - Toggle paid status
export async function PUT(request: NextRequest) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { payrollIds, isPaid } = body;

    if (!Array.isArray(payrollIds) || typeof isPaid !== 'boolean') {
      return NextResponse.json({ 
        error: 'Invalid request body. payrollIds must be an array and isPaid must be a boolean.' 
      }, { status: 400 });
    }

    const result = await db
      .updateTable('payroll')
      .set({ is_paid: isPaid ? 1 : 0 })
      .where('id', 'in', payrollIds)
      .execute();

    return NextResponse.json({ 
      success: true, 
      updatedCount: result.length,
      message: `Successfully ${isPaid ? 'marked as paid' : 'marked as unpaid'} ${result.length} record(s)`
    });
  } catch (error) {
    console.error('Error updating payroll status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
