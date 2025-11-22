import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/database/client';
import { PayrollRestrictionResponse, PayrollRestrictionUpdateRequest } from '@/lib/types/admin';
import { logger } from '@/lib/utils/logger'

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

// GET /api/admin/payroll/restrictions
export async function GET() {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const restriction = await db
      .selectFrom('payroll_restriction')
      .selectAll()
      .where('id', '=', 1) // Assuming single row configuration
      .executeTakeFirst();

    if (!restriction) {
      return NextResponse.json({ error: 'Payroll restriction not found' }, { status: 404 });
    }

    const response: PayrollRestrictionResponse = {
      id: restriction.id,
      hour: restriction.hour,
      minute: restriction.minute,
      modifiedBy: restriction.modified_by,
      createdAt: restriction.created_at?.toISOString() || '',
      updatedAt: restriction.updated_at?.toISOString() || '',
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching payroll restriction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/payroll/restrictions
export async function PUT(request: NextRequest) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const session = await getServerSession(authOptions);
    const body: PayrollRestrictionUpdateRequest = await request.json();

    // Validate request body
    if (typeof body.hour !== 'number' || body.hour < 0 || body.hour > 23) {
      return NextResponse.json({ 
        error: 'Invalid hour. Must be between 0 and 23.' 
      }, { status: 400 });
    }

    if (typeof body.minute !== 'number' || body.minute < 0 || body.minute > 59) {
      return NextResponse.json({ 
        error: 'Invalid minute. Must be between 0 and 59.' 
      }, { status: 400 });
    }

    const updatedRestriction = await db
      .updateTable('payroll_restriction')
      .set({
        hour: body.hour,
        minute: body.minute,
        modified_by: parseInt(session!.user.id),
        updated_at: new Date(),
      })
      .where('id', '=', 1) // Assuming single row configuration
      .returningAll()
      .executeTakeFirst();

    if (!updatedRestriction) {
      return NextResponse.json({ error: 'Failed to update payroll restriction' }, { status: 500 });
    }

    const response: PayrollRestrictionResponse = {
      id: updatedRestriction.id,
      hour: updatedRestriction.hour,
      minute: updatedRestriction.minute,
      modifiedBy: updatedRestriction.modified_by,
      createdAt: updatedRestriction.created_at?.toISOString() || '',
      updatedAt: updatedRestriction.updated_at?.toISOString() || '',
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error updating payroll restriction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
