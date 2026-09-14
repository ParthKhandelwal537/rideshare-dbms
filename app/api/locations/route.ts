import { NextResponse } from 'next/server';
import { getLocations } from '@/lib/db';

export async function GET() {
  try {
    const locations = await getLocations();
    return NextResponse.json({ success: true, data: locations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
