import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/database/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all vendors for admin view
    const vendors = await db
      .selectFrom('vendors')
      .select([
        'id',
        'name',
        'is_active'
      ])
      .where('is_active', '=', 1)
      .orderBy('name', 'asc')
      .execute();
    
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors for admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
