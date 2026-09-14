import { NextRequest, NextResponse } from 'next/server';
import { getDrivers, createDriver } from '@/lib/db';

export async function GET() {
  try {
    const drivers = await getDrivers();
    return NextResponse.json({ success: true, data: drivers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch drivers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driver_name, phone_no, license_no, ratings } = body;

    if (!driver_name) {
      return NextResponse.json(
        { success: false, message: 'Driver name is required.' },
        { status: 400 }
      );
    }

    const newDriver = await createDriver({
      driver_name,
      phone_no,
      license_no,
      ratings: ratings ? parseFloat(ratings) : 5.0
    });

    return NextResponse.json(
      { success: true, message: 'Driver added.', data: newDriver },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to add driver' },
      { status: 400 }
    );
  }
}
