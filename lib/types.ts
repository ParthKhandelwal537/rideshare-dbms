export interface User {
  user_id: string;
  name: string;
  email: string;
  number?: string | null;
}

export interface Driver {
  driver_id: string;
  driver_name: string;
  phone_no?: string | null;
  license_no?: string | null;
  ratings?: number | null;
}

export interface Vehicle {
  vehicle_id: string;
  vehicle_number: string;
  vehicle_type?: string | null;
  capacity?: number | null;
  driver_id: string;
}

export interface LocationItem {
  name: string;
  latitude: number;
  longitude: number;
}

export type RideStatus = 'driver_assigned' | 'driver_arrived' | 'in_transit' | 'completed' | 'cancelled';
export type RideType = 'solo' | 'shared';

export interface CoRider {
  id: string;
  name: string;
  pickup: string;
  dropoff: string;
  seats: number;
}

export interface Ride {
  ride_id: string;
  user_id: string;
  driver_id: string;
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  fare: number;
  ride_status?: RideStatus;
  ride_type?: RideType;
  passengers_count?: number;
  departure_time?: string;
  is_scheduled?: boolean;
  pool_ride_id?: string;
  co_riders?: CoRider[];
}

export interface Payment {
  payment_id: string;
  ride_id: string;
  payment_mode: string;
  amount: number;
  payment_status: 'pending' | 'completed';
  refund_amount?: number;
}

export interface Review {
  review_id: string;
  user_id: string;
  comments: string;
  rating?: number;
}

export interface RideFullDetails {
  ride_id: string;
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  fare: number;
  rider_name: string;
  rider_email: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  vehicle_capacity?: number | null;
  payment_mode?: string | null;
  amount?: number | null;
  payment_status?: 'pending' | 'completed' | null;
  refund_amount?: number | null;
  ride_status?: RideStatus;
  ride_type?: RideType;
  passengers_count?: number;
  departure_time?: string;
  is_scheduled?: boolean;
  co_riders?: CoRider[];
}
