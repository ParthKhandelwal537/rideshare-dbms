import { NextRequest, NextResponse } from 'next/server';
import { advanceRideStatus, resetRideStatus } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // body optional
    }

    const updatedRide = body?.reset
      ? await resetRideStatus(id)
      : await advanceRideStatus(id);

    return NextResponse.json({
      success: true,
      message: `Trip status updated: ${updatedRide.ride_status}`,
      data: updatedRide
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to advance ride status' },
      { status: 500 }
    );
  }
}
