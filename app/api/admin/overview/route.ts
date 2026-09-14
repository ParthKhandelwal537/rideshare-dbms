import { NextResponse } from 'next/server';
import { getFullRideDetails, getUsers, getDrivers, getVehicles, getRides, getPayments, getReviews } from '@/lib/db';

export async function GET() {
  try {
    const [fullDetails, users, drivers, vehicles, rides, payments, reviews] = await Promise.all([
      getFullRideDetails(),
      getUsers(),
      getDrivers(),
      getVehicles(),
      getRides(),
      getPayments(),
      getReviews()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        fullDetails,
        tables: {
          users,
          drivers,
          vehicles,
          rides,
          payments,
          reviews
        },
        counts: {
          users: users.length,
          drivers: drivers.length,
          vehicles: vehicles.length,
          rides: rides.length,
          payments: payments.length,
          reviews: reviews.length
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch admin overview' },
      { status: 500 }
    );
  }
}
