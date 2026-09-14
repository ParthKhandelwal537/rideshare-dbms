import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, Driver, Vehicle, LocationItem, Ride, Payment, Review, RideFullDetails, RideStatus, RideType, CoRider } from './types';
import { LOCATIONS_DATA, calculateFareForLocations, isLocationOnRoute, RouteMatchResult } from './fare';

export interface RideDynamicMeta {
  status: RideStatus;
  ride_type: RideType;
  passengers_count: number;
  departure_time: string;
  is_scheduled?: boolean;
  pool_ride_id?: string;
  refund_amount?: number;
  original_amount_paid?: number;
  co_riders: CoRider[];
}

export interface PoolInvite {
  invite_id: string;
  sender_ride_id: string;
  receiver_ride_id: string;
  sender_user_id: string;
  sender_name: string;
  receiver_user_id: string;
  receiver_name: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export const poolInvitesStore: PoolInvite[] = [];

export const rideDynamicCache = new Map<string, RideDynamicMeta>([
  ['ccccccc1-cccc-cccc-cccc-cccccccccccc', {
    status: 'completed',
    ride_type: 'solo',
    passengers_count: 1,
    departure_time: '12:00',
    co_riders: []
  }],
  ['ccccccc2-cccc-cccc-cccc-cccccccccccc', {
    status: 'driver_assigned',
    ride_type: 'shared',
    passengers_count: 1,
    departure_time: '21:30',
    co_riders: []
  }],
  ['ccccccc3-cccc-cccc-cccc-cccccccccccc', {
    status: 'in_transit',
    ride_type: 'solo',
    passengers_count: 1,
    departure_time: '18:00',
    co_riders: []
  }]
]);

export function calculateDynamicFare(baseFare: number, rideType: RideType, totalRiders: number): {
  finalFare: number;
  discountPercent: number;
  savings: number;
} {
  if (rideType === 'solo' || totalRiders <= 1) {
    return { finalFare: baseFare, discountPercent: 0, savings: 0 };
  }

  let discount = 0.30;
  if (totalRiders === 3) discount = 0.45;
  if (totalRiders >= 4) discount = 0.55;

  const finalFare = Math.round(baseFare * (1 - discount));
  const savings = baseFare - finalFare;

  return { finalFare, discountPercent: Math.round(discount * 100), savings };
}

// In-memory store with ride_status and ride pooling
const memoryStore = {
  users: [
    { user_id: '11111111-1111-1111-1111-111111111111', name: 'Parth Sharma', email: 'parth@example.com', number: '9876543210' },
    { user_id: '22222222-2222-2222-2222-222222222222', name: 'Aarav Patel', email: 'aarav@example.com', number: '9123456780' },
    { user_id: '33333333-3333-3333-3333-333333333333', name: 'Sneha Rao', email: 'sneha@example.com', number: '9988776655' }
  ] as User[],

  drivers: [
    { driver_id: 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', driver_name: 'Rajesh Kumar', phone_no: '9811223344', license_no: 'DL-KA-01-2019001', ratings: 4.8 },
    { driver_id: 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa', driver_name: 'Vikram Singh', phone_no: '9822334455', license_no: 'DL-KA-02-2020002', ratings: 4.9 },
    { driver_id: 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa', driver_name: 'Mohammed Farhan', phone_no: '9833445566', license_no: 'DL-KA-03-2021003', ratings: 4.7 }
  ] as Driver[],

  vehicles: [
    { vehicle_id: 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbbb', vehicle_number: 'KA-01-AB-1234', vehicle_type: 'Sedan (Toyota Etios)', capacity: 4, driver_id: 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    { vehicle_id: 'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', vehicle_number: 'KA-05-CD-5678', vehicle_type: 'SUV (Hyundai Creta)', capacity: 6, driver_id: 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    { vehicle_id: 'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbbb', vehicle_number: 'KA-03-EF-9012', vehicle_type: 'Hatchback (Maruti Swift)', capacity: 4, driver_id: 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }
  ] as Vehicle[],

  locations: Object.entries(LOCATIONS_DATA).map(([name, coords]) => ({
    name,
    latitude: coords.lat,
    longitude: coords.lon,
  })) as LocationItem[],

  rides: [
    {
      ride_id: 'ccccccc1-cccc-cccc-cccc-cccccccccccc',
      user_id: '11111111-1111-1111-1111-111111111111',
      driver_id: 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      pickup_location: 'Koramangala',
      dropoff_location: 'Airport',
      ride_date: '2026-09-12',
      fare: 417.32,
      ride_status: 'completed',
      ride_type: 'solo',
      passengers_count: 1
    },
    {
      ride_id: 'ccccccc2-cccc-cccc-cccc-cccccccccccc',
      user_id: '22222222-2222-2222-2222-222222222222',
      driver_id: 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      pickup_location: 'MG Road',
      dropoff_location: 'Indiranagar',
      ride_date: '2026-09-13',
      fare: 93.56,
      ride_status: 'driver_assigned',
      ride_type: 'shared',
      passengers_count: 1
    },
    {
      ride_id: 'ccccccc3-cccc-cccc-cccc-cccccccccccc',
      user_id: '33333333-3333-3333-3333-333333333333',
      driver_id: 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      pickup_location: 'Whitefield',
      dropoff_location: 'Electronic City',
      ride_date: '2026-09-13',
      fare: 253.16,
      ride_status: 'in_transit',
      ride_type: 'solo',
      passengers_count: 1
    }
  ] as Ride[],

  payments: [
    { payment_id: 'ddddddd1-dddd-dddd-dddd-dddddddddddd', ride_id: 'ccccccc1-cccc-cccc-cccc-cccccccccccc', payment_mode: 'UPI (Google Pay)', amount: 417.32, payment_status: 'completed' },
    { payment_id: 'ddddddd2-dddd-dddd-dddd-dddddddddddd', ride_id: 'ccccccc2-cccc-cccc-cccc-cccccccccccc', payment_mode: 'Credit Card', amount: 93.56, payment_status: 'pending' },
    { payment_id: 'ddddddd3-dddd-dddd-dddd-dddddddddddd', ride_id: 'ccccccc3-cccc-cccc-cccc-cccccccccccc', payment_mode: 'Cash', amount: 253.16, payment_status: 'pending' }
  ] as Payment[],

  reviews: [
    { review_id: 'eeeeeee1-eeee-eeee-eeee-eeeeeeeeeeee', user_id: '11111111-1111-1111-1111-111111111111', comments: 'Driver was very polite and reached pickup location on time. Great experience!', rating: 5 },
    { review_id: 'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeeee', user_id: '22222222-2222-2222-2222-222222222222', comments: 'Clean car and smooth driving through peak Bangalore traffic.', rating: 5 }
  ] as Review[]
};

// ==========================================
// Locations
// ==========================================
export async function getLocations(): Promise<LocationItem[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('locations').select('*');
    if (!error && data && data.length > 0) return data;
  }
  return memoryStore.locations;
}

// ==========================================
// Users
// ==========================================
export async function getUsers(): Promise<User[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) return data;
  }
  return memoryStore.users;
}

export async function createUser(userData: Omit<User, 'user_id'> & { user_id?: string }): Promise<User> {
  const users = await getUsers();
  const cleanEmail = userData.email?.trim().toLowerCase();
  const cleanNumber = userData.number?.trim();

  if (cleanEmail && users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
    throw new Error(`An account with email "${userData.email}" already exists. Please Sign In.`);
  }

  if (cleanNumber && users.some(u => u.number && u.number === cleanNumber)) {
    throw new Error(`An account with mobile number "${userData.number}" already exists. Please Sign In.`);
  }

  const newUser: User = {
    user_id: userData.user_id || crypto.randomUUID(),
    name: userData.name.trim(),
    email: userData.email.trim(),
    number: userData.number?.trim() || null
  };

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('users').insert(newUser).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  memoryStore.users.push(newUser);
  return newUser;
}

export async function deleteUser(userId: string, cascade: boolean = true): Promise<{ success: boolean; deletedUserId: string }> {
  if (isSupabaseConfigured()) {
    if (cascade) {
      const { data: userRides } = await supabase.from('rides').select('ride_id').eq('user_id', userId);
      const rideIds = userRides ? userRides.map((r: any) => r.ride_id) : [];

      if (rideIds.length > 0) {
        await supabase.from('payments').delete().in('ride_id', rideIds);
        await supabase.from('rides').delete().in('ride_id', rideIds);
      }

      await supabase.from('reviews').delete().eq('user_id', userId);
    }

    const { error } = await supabase.from('users').delete().eq('user_id', userId);
    if (error) throw new Error(error.message);
  }

  if (cascade) {
    const userRides = memoryStore.rides.filter(r => r.user_id === userId);
    const rideIds = new Set(userRides.map(r => r.ride_id));

    memoryStore.payments = memoryStore.payments.filter(p => !rideIds.has(p.ride_id));
    memoryStore.rides = memoryStore.rides.filter(r => r.user_id !== userId);
    memoryStore.reviews = memoryStore.reviews.filter(rev => rev.user_id !== userId);
  }

  memoryStore.users = memoryStore.users.filter(u => u.user_id !== userId);
  return { success: true, deletedUserId: userId };
}

// ==========================================
// Drivers
// ==========================================
export async function getDrivers(): Promise<Driver[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('drivers').select('*');
    if (!error && data) return data;
  }
  return memoryStore.drivers;
}

export async function createDriver(driverData: {
  driver_name: string;
  phone_no?: string | null;
  license_no?: string | null;
  ratings?: number | null;
}): Promise<Driver> {
  // New drivers default to 5.0 (ratings will be updated via user reviews)
  const newDriver: Driver = {
    driver_id: crypto.randomUUID(),
    driver_name: driverData.driver_name,
    phone_no: driverData.phone_no || null,
    license_no: driverData.license_no || null,
    ratings: driverData.ratings !== undefined && driverData.ratings !== null ? Number(driverData.ratings) : 5.0
  };

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('drivers').insert(newDriver).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  memoryStore.drivers.push(newDriver);
  return newDriver;
}

// ==========================================
// Vehicles
// ==========================================
export async function getVehicles(): Promise<Vehicle[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (!error && data) return data;
  }
  return memoryStore.vehicles;
}

export async function createVehicle(vehicleData: Omit<Vehicle, 'vehicle_id'>): Promise<Vehicle> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('vehicles').insert({
      vehicle_id: crypto.randomUUID(),
      vehicle_number: vehicleData.vehicle_number,
      vehicle_type: vehicleData.vehicle_type || null,
      capacity: vehicleData.capacity || 4,
      driver_id: vehicleData.driver_id
    }).select().single();

    if (error) {
      if (error.message.includes('unique') || error.code === '23505') {
        throw new Error('This driver already has a vehicle.');
      }
      throw new Error(error.message);
    }
    return data;
  }

  const existing = memoryStore.vehicles.find(v => v.driver_id === vehicleData.driver_id);
  if (existing) {
    throw new Error('This driver already has a vehicle.');
  }

  const newVehicle: Vehicle = {
    vehicle_id: crypto.randomUUID(),
    vehicle_number: vehicleData.vehicle_number,
    vehicle_type: vehicleData.vehicle_type || null,
    capacity: vehicleData.capacity || 4,
    driver_id: vehicleData.driver_id
  };
  memoryStore.vehicles.push(newVehicle);
  return newVehicle;
}

// ==========================================
// Rides & Multi-User Pooling
// ==========================================
export async function getRides(filters?: { user_id?: string; driver_id?: string }): Promise<Ride[]> {
  if (isSupabaseConfigured()) {
    let query = supabase.from('rides').select('*');
    if (filters?.user_id) query = query.eq('user_id', filters.user_id);
    if (filters?.driver_id) query = query.eq('driver_id', filters.driver_id);
    const { data, error } = await query.order('ride_date', { ascending: false });
    if (!error && data) return data;
  }

  let result = [...memoryStore.rides];
  if (filters?.user_id) {
    result = result.filter(r => r.user_id === filters.user_id);
  }
  if (filters?.driver_id) {
    result = result.filter(r => r.driver_id === filters.driver_id);
  }
  return result;
}

export async function getRideById(id: string): Promise<{
  ride: Ride;
  payment?: Payment;
  driver?: Driver;
  vehicle?: Vehicle;
  user?: User;
} | null> {
  if (isSupabaseConfigured()) {
    const { data: ride, error } = await supabase.from('rides').select('*').eq('ride_id', id).single();
    if (error || !ride) return null;

    const [paymentRes, driverRes, userRes] = await Promise.all([
      supabase.from('payments').select('*').eq('ride_id', id).maybeSingle(),
      supabase.from('drivers').select('*').eq('driver_id', ride.driver_id).maybeSingle(),
      supabase.from('users').select('*').eq('user_id', ride.user_id).maybeSingle()
    ]);

    let vehicle = null;
    if (ride.driver_id) {
      const vRes = await supabase.from('vehicles').select('*').eq('driver_id', ride.driver_id).maybeSingle();
      vehicle = vRes.data;
    }

    const cached = rideDynamicCache.get(id);
    const finalStatus = cached?.status || ride.ride_status || 'driver_assigned';
    const finalType = cached?.ride_type || ride.ride_type || 'solo';
    const finalPassengers = cached?.passengers_count || ride.passengers_count || 1;
    const finalDeparture = cached?.departure_time || '20:30';
    const finalCoRiders = cached?.co_riders || (finalType === 'shared' ? [
      { id: 'co-1', name: 'Aarav Patel', pickup: ride.pickup_location, dropoff: ride.dropoff_location, seats: 1 }
    ] : []);
    const finalRefund = cached?.refund_amount !== undefined ? cached.refund_amount : (paymentRes.data?.refund_amount || 0);

    return {
      ride: {
        ...ride,
        ride_status: finalStatus,
        ride_type: finalType,
        passengers_count: finalPassengers,
        departure_time: finalDeparture,
        is_scheduled: cached?.is_scheduled !== undefined ? cached.is_scheduled : ride.is_scheduled,
        pool_ride_id: cached?.pool_ride_id || ride.pool_ride_id,
        co_riders: finalCoRiders
      },
      payment: paymentRes.data ? { ...paymentRes.data, refund_amount: finalRefund } : undefined,
      driver: driverRes.data || undefined,
      vehicle: vehicle || undefined,
      user: userRes.data || undefined
    };
  }

  const ride = memoryStore.rides.find(r => r.ride_id === id);
  if (!ride) return null;

  const cached = rideDynamicCache.get(id);
  const finalStatus = cached?.status || ride.ride_status || 'driver_assigned';
  const finalType = cached?.ride_type || ride.ride_type || 'solo';
  const finalPassengers = cached?.passengers_count || ride.passengers_count || 1;
  const finalDeparture = cached?.departure_time || '20:30';
  const finalCoRiders = cached?.co_riders || (finalType === 'shared' ? [
    { id: 'co-1', name: 'Aarav Patel', pickup: ride.pickup_location, dropoff: ride.dropoff_location, seats: 1 }
  ] : []);

  const payment = memoryStore.payments.find(p => p.ride_id === id);
  const finalRefund = cached?.refund_amount !== undefined ? cached.refund_amount : (payment?.refund_amount || 0);
  const driver = memoryStore.drivers.find(d => d.driver_id === ride.driver_id);
  const vehicle = memoryStore.vehicles.find(v => v.driver_id === ride.driver_id);
  const user = memoryStore.users.find(u => u.user_id === ride.user_id);

  return {
    ride: {
      ...ride,
      ride_status: finalStatus,
      ride_type: finalType,
      passengers_count: finalPassengers,
      departure_time: finalDeparture,
      is_scheduled: cached?.is_scheduled !== undefined ? cached.is_scheduled : ride.is_scheduled,
      pool_ride_id: cached?.pool_ride_id || ride.pool_ride_id,
      co_riders: finalCoRiders
    },
    payment: payment ? { ...payment, refund_amount: finalRefund } : undefined,
    driver,
    vehicle,
    user
  };
}

/**
 * Sequential Booking Flow with Multi-User Ride Sharing (Pooling):
 * - Checks vehicle capacity constraint
 * - Applies 30% pooling discount if ride_type === 'shared'
 */
export async function bookRide(params: {
  user_id: string;
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  ride_type?: RideType;
  passengers_count?: number;
  is_scheduled?: boolean;
  departure_time?: string;
}): Promise<{ ride: Ride; payment: Payment }> {
  if (params.pickup_location === params.dropoff_location) {
    throw new Error("Pickup and dropoff can't be the same.");
  }

  const passengers = params.passengers_count || 1;
  const rideType = params.ride_type || 'solo';
  const isScheduled = !!params.is_scheduled;
  const departureTime = params.departure_time || (isScheduled ? '20:30' : 'Immediate (Within 5-10m)');

  const drivers = await getDrivers();
  if (!drivers || drivers.length === 0) {
    throw new Error('No drivers available right now.');
  }

  const vehicles = await getVehicles();

  // Pick an available driver whose vehicle can hold the requested seats
  let assignedDriver = drivers[0];
  let assignedVehicle: Vehicle | undefined = undefined;

  for (const drv of drivers) {
    const v = vehicles.find(veh => veh.driver_id === drv.driver_id);
    const capacity = v?.capacity || 4;
    if (capacity >= passengers) {
      assignedDriver = drv;
      assignedVehicle = v;
      break;
    }
  }

  // Capacity check
  const vehicleCapacity = assignedVehicle?.capacity || 4;
  if (passengers > vehicleCapacity) {
    throw new Error(`Requested passengers (${passengers}) exceeds vehicle capacity (${vehicleCapacity} seats).`);
  }

  const rideId = crypto.randomUUID();

  // Base fare from distance formula
  const { fare: standardFare } = calculateFareForLocations(params.pickup_location, params.dropoff_location);

  // Apply 30% discount for shared rides!
  const finalFare = rideType === 'shared'
    ? Math.round(standardFare * 0.70)
    : standardFare;

  // Cache ride dynamic metadata
  rideDynamicCache.set(rideId, {
    status: 'driver_assigned',
    ride_type: rideType,
    passengers_count: passengers,
    departure_time: departureTime,
    is_scheduled: isScheduled,
    co_riders: []
  });

  if (isSupabaseConfigured()) {
    const corePayload = {
      ride_id: rideId,
      user_id: params.user_id,
      driver_id: assignedDriver.driver_id,
      pickup_location: params.pickup_location,
      dropoff_location: params.dropoff_location,
      ride_date: params.ride_date || new Date().toISOString().split('T')[0],
      fare: finalFare
    };

    let rideData: any = null;
    const { data: fullInsertData, error: fullInsertError } = await supabase
      .from('rides')
      .insert({
        ...corePayload,
        ride_status: 'driver_assigned',
        ride_type: rideType,
        passengers_count: passengers
      })
      .select()
      .single();

    if (!fullInsertError && fullInsertData) {
      rideData = fullInsertData;
    } else {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('rides')
        .insert(corePayload)
        .select()
        .single();
      if (fallbackError) throw new Error(fallbackError.message);
      rideData = fallbackData;
    }

    const paymentId = crypto.randomUUID();
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_id: paymentId,
        ride_id: rideId,
        payment_mode: 'Pending Selection',
        amount: finalFare,
        payment_status: 'pending'
      })
      .select()
      .single();

    if (paymentError) throw new Error(paymentError.message);

    const fullRide: Ride = {
      ...rideData,
      ride_status: 'driver_assigned',
      ride_type: rideType,
      passengers_count: passengers,
      departure_time: departureTime,
      is_scheduled: isScheduled,
      co_riders: []
    };

    return { ride: fullRide, payment: paymentData };
  }

  // Memory fallback
  const newRide: Ride = {
    ride_id: rideId,
    user_id: params.user_id,
    driver_id: assignedDriver.driver_id,
    pickup_location: params.pickup_location,
    dropoff_location: params.dropoff_location,
    ride_date: params.ride_date || new Date().toISOString().split('T')[0],
    fare: finalFare,
    ride_status: 'driver_assigned',
    ride_type: rideType,
    passengers_count: passengers,
    departure_time: departureTime,
    is_scheduled: isScheduled,
    co_riders: []
  };

  const newPayment: Payment = {
    payment_id: crypto.randomUUID(),
    ride_id: rideId,
    payment_mode: 'Pending Selection',
    amount: finalFare,
    payment_status: 'pending'
  };

  memoryStore.rides.unshift(newRide);
  memoryStore.payments.unshift(newPayment);

  return { ride: newRide, payment: newPayment };
}

/**
 * Advances the ride tracking lifecycle:
 * driver_assigned -> driver_arrived -> in_transit -> completed
 */
export async function advanceRideStatus(rideId: string): Promise<Ride> {
  const rideDetail = await getRideById(rideId);
  if (!rideDetail) throw new Error('Ride not found.');

  const currentStatus = rideDetail.ride.ride_status || 'driver_assigned';
  const statusCycle: Record<RideStatus, RideStatus> = {
    driver_assigned: 'driver_arrived',
    driver_arrived: 'in_transit',
    in_transit: 'completed',
    completed: 'completed',
    cancelled: 'cancelled'
  };

  const nextStatus = statusCycle[currentStatus];

  // Save to persistent dynamic cache
  const meta: RideDynamicMeta = rideDynamicCache.get(rideId) || {
    status: currentStatus,
    ride_type: rideDetail.ride.ride_type || 'solo',
    passengers_count: rideDetail.ride.passengers_count || 1,
    departure_time: rideDetail.ride.departure_time || '20:30',
    co_riders: rideDetail.ride.co_riders || []
  };
  meta.status = nextStatus;
  rideDynamicCache.set(rideId, meta);

  const rideIndex = memoryStore.rides.findIndex(r => r.ride_id === rideId);
  if (rideIndex !== -1) {
    memoryStore.rides[rideIndex].ride_status = nextStatus;
    if (nextStatus === 'completed') {
      const pIdx = memoryStore.payments.findIndex(p => p.ride_id === rideId);
      if (pIdx !== -1) memoryStore.payments[pIdx].payment_status = 'completed';
    }
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('rides').update({ ride_status: nextStatus }).eq('ride_id', rideId);
    } catch {
      // dynamic cache handles memory state
    }

    if (nextStatus === 'completed' && rideDetail.payment?.payment_status !== 'completed') {
      try {
        await completePayment(rideDetail.payment!.payment_id);
      } catch (e) {
        console.error('Error auto-completing payment:', e);
      }
    }
  }

  return { ...rideDetail.ride, ride_status: nextStatus };
}

export async function resetRideStatus(rideId: string): Promise<Ride> {
  const rideDetail = await getRideById(rideId);
  if (!rideDetail) throw new Error('Ride not found.');

  const meta: RideDynamicMeta = rideDynamicCache.get(rideId) || {
    status: 'driver_assigned',
    ride_type: rideDetail.ride.ride_type || 'solo',
    passengers_count: rideDetail.ride.passengers_count || 1,
    departure_time: rideDetail.ride.departure_time || '20:30',
    co_riders: rideDetail.ride.co_riders || []
  };
  meta.status = 'driver_assigned';
  rideDynamicCache.set(rideId, meta);

  const rideIndex = memoryStore.rides.findIndex(r => r.ride_id === rideId);
  if (rideIndex !== -1) {
    memoryStore.rides[rideIndex].ride_status = 'driver_assigned';
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('rides').update({ ride_status: 'driver_assigned' }).eq('ride_id', rideId);
    } catch {}
  }

  return { ...rideDetail.ride, ride_status: 'driver_assigned' };
}

export interface MatchedBookedRide {
  ride_id: string;
  user_id: string;
  rider_name: string;
  rider_number?: string | null;
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  departure_time: string;
  ride_status: RideStatus;
  passengers_count: number;
  match_type: 'midway_dropoff' | 'midway_pickup' | 'same_route' | 'corridor_detour';
  detour_km: number;
  detour_ratio: number;
  corridor_description: string;
  current_fare: number;
  potential_pooled_fare: number;
  potential_savings: number;
  invite_status: 'none' | 'pending' | 'accepted' | 'declined';
  invite_id?: string;
  is_sender?: boolean;
}

/**
 * Searches the database and memory store for OTHER active booked rides
 * whose route falls along or midway on the user's travel corridor.
 */
export async function getMatchingBookedRides(rideId: string): Promise<MatchedBookedRide[]> {
  const currentDetail = await getRideById(rideId);
  if (!currentDetail) return [];

  const currentRide = currentDetail.ride;
  const currentPickup = currentRide.pickup_location;
  const currentDropoff = currentRide.dropoff_location;

  // Retrieve all rides
  let allRides: Ride[] = [];
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('rides').select('*');
    if (data && data.length > 0) allRides = data;
    else allRides = memoryStore.rides;
  } else {
    allRides = memoryStore.rides;
  }

  const users = await getUsers();
  const matchedList: MatchedBookedRide[] = [];

  for (const candidate of allRides) {
    // Ignore current ride and rides by same user
    if (candidate.ride_id === rideId || candidate.user_id === currentRide.user_id) {
      continue;
    }

    // Candidate ride must be an active booked ride
    const cached = rideDynamicCache.get(candidate.ride_id);
    const candidateStatus = cached?.status || candidate.ride_status || 'driver_assigned';
    if (candidateStatus === 'completed' || candidateStatus === 'cancelled') {
      continue;
    }

    // Check corridor geometry: does candidate route fall along or midway on current route?
    const match = isLocationOnRoute(
      currentPickup,
      currentDropoff,
      candidate.pickup_location,
      candidate.dropoff_location
    );

    if (match.isMatch) {
      const rider = users.find(u => u.user_id === candidate.user_id);
      const riderName = rider ? rider.name : 'Verified Rider';
      const riderNumber = rider?.number || null;

      // Base fare calculation for potential pooling
      const { fare: standardFare } = calculateFareForLocations(currentPickup, currentDropoff);
      const totalRiders = 2; // Joining together
      const { finalFare: pooledFare, savings } = calculateDynamicFare(standardFare, 'shared', totalRiders);

      // Check existing invite
      const existingInvite = poolInvitesStore.find(
        inv =>
          (inv.sender_ride_id === rideId && inv.receiver_ride_id === candidate.ride_id) ||
          (inv.sender_ride_id === candidate.ride_id && inv.receiver_ride_id === rideId)
      );

      matchedList.push({
        ride_id: candidate.ride_id,
        user_id: candidate.user_id,
        rider_name: riderName,
        rider_number: riderNumber,
        pickup_location: candidate.pickup_location,
        dropoff_location: candidate.dropoff_location,
        ride_date: candidate.ride_date,
        departure_time: cached?.departure_time || '20:30',
        ride_status: candidateStatus,
        passengers_count: cached?.passengers_count || candidate.passengers_count || 1,
        match_type: match.matchType,
        detour_km: match.detourKm,
        detour_ratio: match.detourRatio,
        corridor_description: match.description,
        current_fare: candidate.fare,
        potential_pooled_fare: pooledFare,
        potential_savings: savings,
        invite_status: existingInvite ? existingInvite.status : 'none',
        invite_id: existingInvite?.invite_id,
        is_sender: existingInvite ? existingInvite.sender_ride_id === rideId : false
      });
    }
  }

  return matchedList;
}

/**
 * Sends or accepts a pooling invite between two real booked rides.
 * Dynamically adjusts fares and applies automatic refund adjustments for both riders.
 */
export async function sendOrAcceptPoolInvite(
  senderRideId: string,
  targetRideId: string,
  action: 'send' | 'accept' | 'decline'
): Promise<{
  success: boolean;
  message: string;
  invite?: PoolInvite;
  refundProcessedA?: number;
  refundProcessedB?: number;
  updatedFareA?: number;
  updatedFareB?: number;
}> {
  const rideA = await getRideById(senderRideId);
  const rideB = await getRideById(targetRideId);

  if (!rideA || !rideB) {
    throw new Error('One or both rides could not be found.');
  }

  let invite = poolInvitesStore.find(
    inv =>
      (inv.sender_ride_id === senderRideId && inv.receiver_ride_id === targetRideId) ||
      (inv.sender_ride_id === targetRideId && inv.receiver_ride_id === senderRideId)
  );

  if (action === 'send') {
    if (!invite) {
      invite = {
        invite_id: `inv-${Date.now()}`,
        sender_ride_id: senderRideId,
        receiver_ride_id: targetRideId,
        sender_user_id: rideA.ride.user_id,
        sender_name: rideA.user?.name || 'Rider A',
        receiver_user_id: rideB.ride.user_id,
        receiver_name: rideB.user?.name || 'Rider B',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      poolInvitesStore.push(invite);
    } else {
      invite.status = 'pending';
    }

    return {
      success: true,
      message: `Ride pooling invite sent to ${rideB.user?.name || 'co-rider'}. Awaiting response.`,
      invite
    };
  }

  if (action === 'decline') {
    if (invite) invite.status = 'declined';
    return {
      success: true,
      message: 'Pooling invite declined.',
      invite
    };
  }

  if (action === 'accept') {
    if (invite) {
      invite.status = 'accepted';
    } else {
      invite = {
        invite_id: `inv-${Date.now()}`,
        sender_ride_id: senderRideId,
        receiver_ride_id: targetRideId,
        sender_user_id: rideA.ride.user_id,
        sender_name: rideA.user?.name || 'Rider A',
        receiver_user_id: rideB.ride.user_id,
        receiver_name: rideB.user?.name || 'Rider B',
        status: 'accepted',
        created_at: new Date().toISOString()
      };
      poolInvitesStore.push(invite);
    }

    // Both rides are pooled together!
    const poolId = `pool-${senderRideId.slice(0, 8)}-${targetRideId.slice(0, 8)}`;

    // Standard base fare for Ride A and Ride B
    const { fare: standardFareA } = calculateFareForLocations(rideA.ride.pickup_location, rideA.ride.dropoff_location);
    const { fare: standardFareB } = calculateFareForLocations(rideB.ride.pickup_location, rideB.ride.dropoff_location);

    // 30% pooling discount applied to each rider's route!
    const { finalFare: pooledFareA } = calculateDynamicFare(standardFareA, 'shared', 2);
    const { finalFare: pooledFareB } = calculateDynamicFare(standardFareB, 'shared', 2);

    // Prepare CoRider objects
    const coRiderForA: CoRider = {
      id: `co-${rideB.ride.user_id.slice(0, 8)}`,
      name: rideB.user?.name || 'Matched Co-Rider',
      pickup: rideB.ride.pickup_location,
      dropoff: rideB.ride.dropoff_location,
      seats: rideB.ride.passengers_count || 1
    };

    const coRiderForB: CoRider = {
      id: `co-${rideA.ride.user_id.slice(0, 8)}`,
      name: rideA.user?.name || 'Matched Co-Rider',
      pickup: rideA.ride.pickup_location,
      dropoff: rideA.ride.dropoff_location,
      seats: rideA.ride.passengers_count || 1
    };

    // Calculate Payment adjustments for Ride A
    const oldFareA = rideA.ride.fare;
    const isPaidA = rideA.payment?.payment_status === 'completed';
    let refundA = 0;
    if (isPaidA && oldFareA > pooledFareA) {
      refundA = Math.round(oldFareA - pooledFareA);
    }

    // Calculate Payment adjustments for Ride B
    const oldFareB = rideB.ride.fare;
    const isPaidB = rideB.payment?.payment_status === 'completed';
    let refundB = 0;
    if (isPaidB && oldFareB > pooledFareB) {
      refundB = Math.round(oldFareB - pooledFareB);
    }

    // Update Cache for Ride A
    const cachedA = rideDynamicCache.get(senderRideId);
    const currentCoRidersA = cachedA?.co_riders || rideA.ride.co_riders || [];
    const updatedCoRidersA = currentCoRidersA.some(c => c.name === coRiderForA.name)
      ? currentCoRidersA
      : [...currentCoRidersA, coRiderForA];

    rideDynamicCache.set(senderRideId, {
      status: cachedA?.status || rideA.ride.ride_status || 'driver_assigned',
      ride_type: 'shared',
      passengers_count: 2,
      departure_time: cachedA?.departure_time || rideA.ride.departure_time || '20:30',
      pool_ride_id: poolId,
      refund_amount: (cachedA?.refund_amount || rideA.payment?.refund_amount || 0) + refundA,
      co_riders: updatedCoRidersA
    });

    // Update Cache for Ride B
    const cachedB = rideDynamicCache.get(targetRideId);
    const currentCoRidersB = cachedB?.co_riders || rideB.ride.co_riders || [];
    const updatedCoRidersB = currentCoRidersB.some(c => c.name === coRiderForB.name)
      ? currentCoRidersB
      : [...currentCoRidersB, coRiderForB];

    rideDynamicCache.set(targetRideId, {
      status: cachedB?.status || rideB.ride.ride_status || 'driver_assigned',
      ride_type: 'shared',
      passengers_count: 2,
      departure_time: cachedB?.departure_time || rideB.ride.departure_time || '20:30',
      pool_ride_id: poolId,
      refund_amount: (cachedB?.refund_amount || rideB.payment?.refund_amount || 0) + refundB,
      co_riders: updatedCoRidersB
    });

    // Sync Memory Store / Supabase
    const rIdxA = memoryStore.rides.findIndex(r => r.ride_id === senderRideId);
    if (rIdxA !== -1) {
      memoryStore.rides[rIdxA].fare = pooledFareA;
      memoryStore.rides[rIdxA].ride_type = 'shared';
      memoryStore.rides[rIdxA].passengers_count = 2;
    }
    const pIdxA = memoryStore.payments.findIndex(p => p.ride_id === senderRideId);
    if (pIdxA !== -1) {
      memoryStore.payments[pIdxA].amount = pooledFareA;
      if (refundA > 0) {
        memoryStore.payments[pIdxA].refund_amount = (memoryStore.payments[pIdxA].refund_amount || 0) + refundA;
      }
    }

    const rIdxB = memoryStore.rides.findIndex(r => r.ride_id === targetRideId);
    if (rIdxB !== -1) {
      memoryStore.rides[rIdxB].fare = pooledFareB;
      memoryStore.rides[rIdxB].ride_type = 'shared';
      memoryStore.rides[rIdxB].passengers_count = 2;
    }
    const pIdxB = memoryStore.payments.findIndex(p => p.ride_id === targetRideId);
    if (pIdxB !== -1) {
      memoryStore.payments[pIdxB].amount = pooledFareB;
      if (refundB > 0) {
        memoryStore.payments[pIdxB].refund_amount = (memoryStore.payments[pIdxB].refund_amount || 0) + refundB;
      }
    }

    if (isSupabaseConfigured()) {
      await Promise.all([
        supabase.from('rides').update({ fare: pooledFareA }).eq('ride_id', senderRideId),
        supabase.from('rides').update({ fare: pooledFareB }).eq('ride_id', targetRideId),
        supabase.from('payments').update({ amount: pooledFareA }).eq('ride_id', senderRideId),
        supabase.from('payments').update({ amount: pooledFareB }).eq('ride_id', targetRideId)
      ]);
    }

    let refundMsg = '';
    if (refundA > 0) {
      refundMsg += ` Automated refund of ₹${refundA} credited for your ride.`;
    }

    return {
      success: true,
      message: `Pooling confirmed! Ride shared with ${rideB.user?.name || 'co-rider'}. Fare reduced to ₹${pooledFareA}.${refundMsg}`,
      invite,
      refundProcessedA: refundA,
      refundProcessedB: refundB,
      updatedFareA: pooledFareA,
      updatedFareB: pooledFareB
    };
  }

  throw new Error('Invalid invite action');
}

/**
 * Edit Ride (FR6a & FR6c):
 * - Allowed up to 3 hours before trip scheduled departure while in 'driver_assigned' or 'driver_arrived'.
 * - Locked once boarded ('in_transit' or 'completed').
 * - Dynamically adjusts fare when ride_type or co-riders change.
 * - Handles automated refunds if ride was already paid.
 */
export async function updateRide(
  rideId: string,
  updates: {
    pickup_location?: string;
    dropoff_location?: string;
    ride_date?: string;
    departure_time?: string;
    ride_type?: RideType;
    passengers_count?: number;
    is_scheduled?: boolean;
    pool_ride_id?: string;
    co_riders?: CoRider[];
  }
): Promise<{ ride: Ride; payment?: Payment }> {
  const rideDetail = await getRideById(rideId);
  if (!rideDetail) throw new Error('Ride not found.');

  const status = rideDetail.ride.ride_status || 'driver_assigned';
  if (status === 'in_transit' || status === 'completed') {
    throw new Error("This ride can't be modified after the rider has boarded the cab.");
  }

  const pickup = updates.pickup_location || rideDetail.ride.pickup_location;
  const dropoff = updates.dropoff_location || rideDetail.ride.dropoff_location;
  const rideType = updates.ride_type || rideDetail.ride.ride_type || 'solo';
  const passengers = updates.passengers_count || rideDetail.ride.passengers_count || 1;
  const coRiders = updates.co_riders !== undefined ? updates.co_riders : (rideDetail.ride.co_riders || []);
  const departureTime = updates.departure_time || rideDetail.ride.departure_time || '20:30';

  if (pickup === dropoff) {
    throw new Error("Pickup and dropoff can't be the same.");
  }

  // Base fare from Haversine
  const { fare: standardFare } = calculateFareForLocations(pickup, dropoff);

  // Dynamic pooling calculation based on co-riders
  const totalRiders = rideType === 'shared' ? 1 + coRiders.length : 1;
  const { finalFare } = calculateDynamicFare(standardFare, rideType, totalRiders);

  // Handle refund if ride was already paid and fare decreased
  const oldFare = rideDetail.ride.fare;
  const wasPaid = rideDetail.payment?.payment_status === 'completed';
  let refundDifference = 0;
  if (wasPaid && oldFare > finalFare) {
    refundDifference = Math.round(oldFare - finalFare);
  }
  const existingRefund = rideDetail.payment?.refund_amount || 0;
  const totalRefund = existingRefund + refundDifference;

  // Save to dynamic cache
  rideDynamicCache.set(rideId, {
    status,
    ride_type: rideType,
    passengers_count: passengers,
    departure_time: departureTime,
    is_scheduled: updates.is_scheduled !== undefined ? updates.is_scheduled : rideDetail.ride.is_scheduled,
    pool_ride_id: updates.pool_ride_id || rideDetail.ride.pool_ride_id,
    refund_amount: totalRefund,
    co_riders: coRiders
  });

  if (isSupabaseConfigured()) {
    const { data: updatedRide, error: rideError } = await supabase
      .from('rides')
      .update({
        pickup_location: pickup,
        dropoff_location: dropoff,
        ride_date: updates.ride_date || rideDetail.ride.ride_date,
        fare: finalFare
      })
      .eq('ride_id', rideId)
      .select()
      .single();

    if (rideError) throw new Error(rideError.message);

    // Sync payment amount
    const { data: updatedPayment } = await supabase
      .from('payments')
      .update({ amount: finalFare })
      .eq('ride_id', rideId)
      .select()
      .single();

    return {
      ride: {
        ...updatedRide,
        ride_status: status,
        ride_type: rideType,
        passengers_count: passengers,
        departure_time: departureTime,
        is_scheduled: updates.is_scheduled !== undefined ? updates.is_scheduled : rideDetail.ride.is_scheduled,
        pool_ride_id: updates.pool_ride_id || rideDetail.ride.pool_ride_id,
        co_riders: coRiders,
        fare: finalFare
      },
      payment: updatedPayment ? { ...updatedPayment, refund_amount: totalRefund } : undefined
    };
  }

  const rideIndex = memoryStore.rides.findIndex(r => r.ride_id === rideId);
  if (rideIndex === -1) throw new Error('Ride not found.');

  memoryStore.rides[rideIndex] = {
    ...memoryStore.rides[rideIndex],
    pickup_location: pickup,
    dropoff_location: dropoff,
    ride_date: updates.ride_date || memoryStore.rides[rideIndex].ride_date,
    fare: finalFare,
    ride_type: rideType,
    passengers_count: passengers
  };

  const paymentIndex = memoryStore.payments.findIndex(p => p.ride_id === rideId);
  if (paymentIndex !== -1) {
    memoryStore.payments[paymentIndex].amount = finalFare;
    if (totalRefund > 0) {
      memoryStore.payments[paymentIndex].refund_amount = totalRefund;
    }
  }

  return {
    ride: {
      ...memoryStore.rides[rideIndex],
      departure_time: departureTime,
      is_scheduled: updates.is_scheduled !== undefined ? updates.is_scheduled : rideDetail.ride.is_scheduled,
      pool_ride_id: updates.pool_ride_id || rideDetail.ride.pool_ride_id,
      co_riders: coRiders
    },
    payment: paymentIndex !== -1 ? { ...memoryStore.payments[paymentIndex], refund_amount: totalRefund } : undefined
  };
}

/**
 * Delete Ride (FR6b & FR6c):
 * - Allowed up to 3 hours before trip scheduled departure while in 'driver_assigned' or 'driver_arrived'.
 * - Locked once boarded.
 */
export async function deleteRide(rideId: string): Promise<boolean> {
  const rideDetail = await getRideById(rideId);
  if (!rideDetail) throw new Error('Ride not found.');

  const status = rideDetail.ride.ride_status || 'driver_assigned';
  if (status === 'in_transit' || status === 'completed') {
    throw new Error("This ride can't be cancelled after the rider has boarded the cab.");
  }

  rideDynamicCache.delete(rideId);

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('rides').delete().eq('ride_id', rideId);
    if (error) throw new Error(error.message);
    return true;
  }

  memoryStore.rides = memoryStore.rides.filter(r => r.ride_id !== rideId);
  memoryStore.payments = memoryStore.payments.filter(p => p.ride_id !== rideId);
  return true;
}

// ==========================================
// Payments
// ==========================================
export async function getPayments(): Promise<Payment[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('payments').select('*');
    if (!error && data) return data;
  }
  return memoryStore.payments;
}

export async function completePayment(paymentId: string, paymentMode?: string): Promise<Payment> {
  const mode = paymentMode || 'UPI (Google Pay)';

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('payments')
      .update({
        payment_status: 'completed',
        payment_mode: mode
      })
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const payment = memoryStore.payments.find(p => p.payment_id === paymentId);
  if (!payment) throw new Error('Payment record not found.');

  payment.payment_status = 'completed';
  payment.payment_mode = mode;
  return payment;
}

// ==========================================
// Reviews
// ==========================================
export async function getReviews(): Promise<Review[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('reviews').select('*');
    if (!error && data) {
      return data.map((rev: any) => {
        let rating = rev.rating;
        let comments = rev.comments || '';
        const match = comments.match(/^\[RATING:(\d+)\]\s*([\s\S]*)$/);
        if (match) {
          rating = parseInt(match[1], 10);
          comments = match[2];
        } else if (rating === undefined || rating === null) {
          const mem = memoryStore.reviews.find(m => m.review_id === rev.review_id);
          rating = mem?.rating ?? 5;
        }
        return {
          ...rev,
          comments,
          rating: typeof rating === 'number' ? rating : 5
        };
      });
    }
  }
  return memoryStore.reviews;
}

export async function createReview(userId: string, comments: string, rating: number = 5): Promise<Review> {
  if (!comments || comments.trim() === '') {
    throw new Error('Review comments cannot be empty.');
  }

  const cleanComments = comments.trim();
  const newReview: Review = {
    review_id: crypto.randomUUID(),
    user_id: userId,
    comments: cleanComments,
    rating
  };

  if (isSupabaseConfigured()) {
    let reviewData: any = null;
    const { data: fullRevData, error: fullRevError } = await supabase
      .from('reviews')
      .insert({
        review_id: newReview.review_id,
        user_id: newReview.user_id,
        comments: newReview.comments,
        rating: newReview.rating
      })
      .select()
      .single();

    if (!fullRevError && fullRevData) {
      reviewData = fullRevData;
    } else {
      const encodedComments = `[RATING:${rating}] ${cleanComments}`;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('reviews')
        .insert({
          review_id: newReview.review_id,
          user_id: newReview.user_id,
          comments: encodedComments
        })
        .select()
        .single();
      if (fallbackError) throw new Error(fallbackError.message);
      reviewData = { ...fallbackData, comments: cleanComments, rating };
    }

    memoryStore.reviews.unshift({
      review_id: newReview.review_id,
      user_id: userId,
      comments: cleanComments,
      rating
    });

    return reviewData;
  }

  memoryStore.reviews.unshift(newReview);
  return newReview;
}

// ==========================================
// Admin Overview
// ==========================================
export async function getFullRideDetails(): Promise<RideFullDetails[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('ride_full_details').select('*');
    if (!error && data) {
      return data.map(r => ({
        ...r,
        ride_status: 'driver_assigned',
        ride_type: 'solo',
        passengers_count: 1
      }));
    }
  }

  return memoryStore.rides.map(r => {
    const user = memoryStore.users.find(u => u.user_id === r.user_id);
    const driver = memoryStore.drivers.find(d => d.driver_id === r.driver_id);
    const vehicle = driver ? memoryStore.vehicles.find(v => v.driver_id === driver.driver_id) : undefined;
    const payment = memoryStore.payments.find(p => p.ride_id === r.ride_id);

    return {
      ride_id: r.ride_id,
      pickup_location: r.pickup_location,
      dropoff_location: r.dropoff_location,
      ride_date: r.ride_date,
      fare: r.fare,
      rider_name: user ? user.name : 'Unknown Rider',
      rider_email: user ? user.email : '',
      driver_name: driver ? driver.driver_name : null,
      driver_phone: driver ? driver.phone_no : null,
      vehicle_number: vehicle ? vehicle.vehicle_number : null,
      vehicle_type: vehicle ? vehicle.vehicle_type : null,
      vehicle_capacity: vehicle ? vehicle.capacity : 4,
      payment_mode: payment ? payment.payment_mode : null,
      amount: payment ? payment.amount : null,
      payment_status: payment ? payment.payment_status : null,
      ride_status: r.ride_status || 'driver_assigned',
      ride_type: r.ride_type || 'solo',
      passengers_count: r.passengers_count || 1
    };
  });
}
