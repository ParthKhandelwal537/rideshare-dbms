import { NextRequest, NextResponse } from 'next/server';
import { sendOrAcceptPoolInvite } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { target_ride_id, action } = body;

    if (!target_ride_id || !action) {
      return NextResponse.json(
        { success: false, message: 'Target ride ID and action (send/accept/decline) are required.' },
        { status: 400 }
      );
    }

    const result = await sendOrAcceptPoolInvite(id, target_ride_id, action);
    return NextResponse.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process pooling invite' },
      { status: 400 }
    );
  }
}
