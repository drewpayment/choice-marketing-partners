import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/database/client';
import { CompanyOptionsResponse, CompanyOptionsUpdateRequest } from '@/lib/types/admin';
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

// GET /api/admin/company/options
export async function GET() {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const options = await db
      .selectFrom('company_options')
      .selectAll()
      .executeTakeFirst();

    if (!options) {
      return NextResponse.json({ error: 'Company options not found' }, { status: 404 });
    }

    const response: CompanyOptionsResponse = {
      id: options.id,
      hasPaystubNotifications: options.has_paystub_notifications === 1,
      createdAt: options.created_at?.toISOString() || '',
      updatedAt: options.updated_at?.toISOString() || '',
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching company options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/company/options
export async function PUT(request: NextRequest) {
  const authError = await verifyAdminAccess();
  if (authError) return authError;

  try {
    const body: CompanyOptionsUpdateRequest = await request.json();

    // Validate request body
    if (typeof body.hasPaystubNotifications !== 'boolean') {
      return NextResponse.json({ 
        error: 'Invalid request body. hasPaystubNotifications must be a boolean.' 
      }, { status: 400 });
    }

    const updatedOptions = await db
      .updateTable('company_options')
      .set({
        has_paystub_notifications: body.hasPaystubNotifications ? 1 : 0,
        updated_at: new Date(),
      })
      .where('id', '=', 1) // Assuming single row configuration
      .returningAll()
      .executeTakeFirst();

    if (!updatedOptions) {
      return NextResponse.json({ error: 'Failed to update company options' }, { status: 500 });
    }

    const response: CompanyOptionsResponse = {
      id: updatedOptions.id,
      hasPaystubNotifications: updatedOptions.has_paystub_notifications === 1,
      createdAt: updatedOptions.created_at?.toISOString() || '',
      updatedAt: updatedOptions.updated_at?.toISOString() || '',
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error updating company options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
