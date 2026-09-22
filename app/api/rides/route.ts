import { NextRequest, NextResponse } from 'next/server';
import { getRides, bookRide } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id') || undefined;
    const driver_id = searchParams.get('driver_id') || undefined;

    const rides = await getRides({ user_id, driver_id });
    return NextResponse.json({ success: true, data: rides });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch rides' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      pickup_location,
      dropoff_location,
      ride_date,
      ride_type,
      passengers_count,
      is_scheduled,
      departure_time,
      vehicle_type_preference,
      seating_capacity_preference
    } = body;

    if (!user_id || !pickup_location || !dropoff_location) {
      return NextResponse.json(
        { success: false, message: 'User, pickup, and dropoff locations are required.' },
        { status: 400 }
      );
    }

    if (pickup_location === dropoff_location) {
      return NextResponse.json(
        { success: false, message: "Pickup and dropoff can't be the same." },
        { status: 400 }
      );
    }

    const { ride, payment } = await bookRide({
      user_id,
      pickup_location,
      dropoff_location,
      ride_date: ride_date || new Date().toISOString().split('T')[0],
      ride_type: ride_type || 'solo',
      passengers_count: passengers_count ? parseInt(passengers_count, 10) : 1,
      is_scheduled: !!is_scheduled,
      departure_time,
      vehicle_type_preference: vehicle_type_preference || undefined,
      seating_capacity_preference: seating_capacity_preference ? parseInt(seating_capacity_preference, 10) : undefined
    });

    const isShared = ride.ride_type === 'shared';
    return NextResponse.json(
      {
        success: true,
        message: isShared
          ? `Shared cab booked (${passengers_count || 1} seat${(passengers_count || 1) > 1 ? 's' : ''}) — discounted fare ₹${ride.fare}.`
          : `Private ride booked — fare ₹${ride.fare}.`,
        data: { ride, payment }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('ERROR IN POST /api/rides:', error);
    const isClientError =
      error.message?.includes('No drivers available') ||
      error.message?.includes("Pickup and dropoff can't be the same") ||
      error.message?.includes('exceeds vehicle capacity');
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to book ride' },
      { status: isClientError ? 400 : 500 }
    );
  }
}
