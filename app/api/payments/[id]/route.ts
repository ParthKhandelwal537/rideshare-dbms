import { NextRequest, NextResponse } from 'next/server';
import { completePayment } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let payment_mode = 'UPI (Google Pay)';

    try {
      const body = await request.json();
      if (body.payment_mode) payment_mode = body.payment_mode;
    } catch {
      // Empty body is acceptable; defaults to UPI
    }

    const updatedPayment = await completePayment(id, payment_mode);

    return NextResponse.json({
      success: true,
      message: 'Payment successful.',
      data: updatedPayment
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Payment failed' },
      { status: 500 }
    );
  }
}
