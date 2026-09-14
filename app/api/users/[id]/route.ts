import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, getUsers } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const users = await getUsers();
    const user = users.find((u) => u.user_id === id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cascade = searchParams.get('cascade') !== 'false';

    await deleteUser(id, cascade);

    return NextResponse.json({
      success: true,
      message: 'User and all associated database records deleted successfully.',
      data: { deletedUserId: id }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete user' },
      { status: 400 }
    );
  }
}
