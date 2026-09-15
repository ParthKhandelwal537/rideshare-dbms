import { NextRequest, NextResponse } from 'next/server';
import { getInvitesForUser } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const invites = await getInvitesForUser(userId);
    return NextResponse.json({ success: true, data: invites });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}
