import { NextRequest, NextResponse } from 'next/server';
import { getMatchingBookedRides } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matches = await getMatchingBookedRides(id);
    return NextResponse.json({ success: true, data: matches });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to find matching booked rides' },
      { status: 500 }
    );
  }
}
