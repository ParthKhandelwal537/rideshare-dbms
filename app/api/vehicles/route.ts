import { NextRequest, NextResponse } from 'next/server';
import { getVehicles, createVehicle } from '@/lib/db';

export async function GET() {
  try {
    const vehicles = await getVehicles();
    return NextResponse.json({ success: true, data: vehicles });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicle_number, vehicle_type, capacity, driver_id } = body;

    if (!vehicle_number || !driver_id) {
      return NextResponse.json(
        { success: false, message: 'Vehicle number and driver are required.' },
        { status: 400 }
      );
    }

    const newVehicle = await createVehicle({
      vehicle_number,
      vehicle_type,
      capacity: capacity ? parseInt(capacity, 10) : 4,
      driver_id
    });

    return NextResponse.json(
      { success: true, message: 'Vehicle added.', data: newVehicle },
      { status: 201 }
    );
  } catch (error: any) {
    const isConflict = error.message.includes('already has a vehicle');
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to register vehicle' },
      { status: isConflict ? 400 : 500 }
    );
  }
}
