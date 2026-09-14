import { NextResponse } from 'next/server';
import { getPayments } from '@/lib/db';

export async function GET() {
  try {
    const payments = await getPayments();
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
