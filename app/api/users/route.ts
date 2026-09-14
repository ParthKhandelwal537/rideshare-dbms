import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/db';

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, number } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required.' },
        { status: 400 }
      );
    }

    const newUser = await createUser({ name, email, number });
    return NextResponse.json(
      { success: true, message: "Account created — you're logged in.", data: newUser },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error.message.includes('already registered') ? 400 : 500;
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create user' },
      { status }
    );
  }
}
