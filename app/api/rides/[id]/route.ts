import { NextRequest, NextResponse } from 'next/server';
import { getRideById, updateRide, deleteRide } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rideDetail = await getRideById(id);

    if (!rideDetail) {
      return NextResponse.json(
        { success: false, message: 'Ride not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rideDetail });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch ride' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { pickup_location, dropoff_location, ride_date, ride_type, passengers_count, co_riders, departure_time } = body;

    const result = await updateRide(id, {
      pickup_location,
      dropoff_location,
      ride_date,
      ride_type,
      passengers_count,
      co_riders,
      departure_time
    });

    return NextResponse.json({
      success: true,
      message: `Ride updated — new dynamic fare ₹${result.ride.fare}.`,
      data: result
    });
  } catch (error: any) {
    const isValidationError =
      error.message.includes("can't be edited after payment") ||
      error.message.includes("Pickup and dropoff can't be the same");
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update ride' },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteRide(id);

    return NextResponse.json({
      success: true,
      message: 'Ride cancelled.'
    });
  } catch (error: any) {
    const isValidationError = error.message.includes("can't be cancelled after payment");
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to cancel ride' },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
