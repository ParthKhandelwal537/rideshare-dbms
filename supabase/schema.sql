-- =========================================================
-- RideShare Relational Schema (DBMS CIA 3 Deliverable)
-- Source: RideShare_PRD (1).md
-- Evaluator-Ready PostgreSQL DDL
-- =========================================================

-- Drop views and tables in reverse dependency order if recreating
drop view if exists ride_full_details;
drop table if exists reviews cascade;
drop table if exists payments cascade;
drop table if exists rides cascade;
drop table if exists vehicles cascade;
drop table if exists drivers cascade;
drop table if exists users cascade;
drop table if exists locations cascade;
drop function if exists calculate_fare() cascade;
drop function if exists haversine_km(double precision, double precision, double precision, double precision) cascade;

-- Enable UUID extension if not enabled
create extension if not exists "pgcrypto";

-- 1. Locations Reference Table (Lookup for fare calculation)
create table locations (
  name text primary key,
  latitude double precision not null,
  longitude double precision not null
);

-- Seed initial 6 Bangalore locations
insert into locations (name, latitude, longitude) values
  ('MG Road', 12.9757, 77.6079),
  ('Whitefield', 12.9698, 77.7500),
  ('Koramangala', 12.9352, 77.6245),
  ('Airport', 13.1986, 77.7066),
  ('Electronic City', 12.8452, 77.6602),
  ('Indiranagar', 12.9719, 77.6412);

-- 2. Users Entity (Riders)
create table users (
  user_id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  number text
);

-- 3. Drivers Entity
create table drivers (
  driver_id uuid primary key default gen_random_uuid(),
  driver_name text not null,
  phone_no text,
  license_no text,
  ratings numeric default 0
);

-- 4. Vehicles Entity (1:1 with Drivers via UNIQUE on driver_id)
create table vehicles (
  vehicle_id uuid primary key default gen_random_uuid(),
  vehicle_number text not null,
  vehicle_type text,
  capacity int,
  driver_id uuid unique references drivers(driver_id) on delete restrict
);

-- 5. Rides Entity (Central relation connecting Rider, Driver, Pickup & Dropoff)
create table rides (
  ride_id uuid primary key default gen_random_uuid(),
  user_id uuid references users(user_id) on delete restrict,
  driver_id uuid references drivers(driver_id) on delete restrict,
  pickup_location text references locations(name) on delete restrict,
  dropoff_location text references locations(name) on delete restrict,
  ride_date date default current_date,
  fare numeric,
  ride_status text default 'driver_assigned', -- 'driver_assigned', 'driver_arrived', 'in_transit', 'completed', 'cancelled'
  ride_type text default 'solo',              -- 'solo' or 'shared' (pooling)
  passengers_count int default 1              -- constrained by vehicle capacity
);

-- 6. Payments Entity (1:1 with Rides via UNIQUE on ride_id, ON DELETE CASCADE)
create table payments (
  payment_id uuid primary key default gen_random_uuid(),
  ride_id uuid unique references rides(ride_id) on delete cascade,
  payment_mode text,
  amount numeric,
  payment_status text default 'pending' -- 'pending' or 'completed'
);

-- 7. Reviews Entity (1:M with Users)
create table reviews (
  review_id uuid primary key default gen_random_uuid(),
  user_id uuid references users(user_id) on delete restrict,
  comments text not null,
  rating int default 5 check (rating between 1 and 5)
);

-- =========================================================
-- Fare calculation: Haversine distance function + trigger
-- =========================================================

create or replace function haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns numeric as $$
declare
  r constant double precision := 6371; -- Earth radius in km
  dlat double precision := radians(lat2 - lat1);
  dlon double precision := radians(lon2 - lon1);
  a double precision;
  c double precision;
begin
  a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  return round((r * c)::numeric, 2);
end;
$$ language plpgsql immutable;

create or replace function calculate_fare()
returns trigger as $$
declare
  base_fare constant numeric := 50;   -- Live-edit target: base fare in INR
  rate_per_km constant numeric := 12; -- Live-edit target: rate per km in INR
  pickup_lat double precision;
  pickup_lon double precision;
  drop_lat double precision;
  drop_lon double precision;
  distance numeric;
begin
  select latitude, longitude into pickup_lat, pickup_lon
    from locations where name = new.pickup_location;

  select latitude, longitude into drop_lat, drop_lon
    from locations where name = new.dropoff_location;

  if pickup_lat is not null and drop_lat is not null then
    distance := haversine_km(pickup_lat, pickup_lon, drop_lat, drop_lon);
    new.fare := base_fare + (rate_per_km * distance);
  else
    new.fare := base_fare;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_calculate_fare
before insert or update of pickup_location, dropoff_location
on rides
for each row
execute function calculate_fare();

-- =========================================================
-- View: Single joined read for the Admin/Demo screen
-- =========================================================

create or replace view ride_full_details as
select
  r.ride_id,
  r.pickup_location,
  r.dropoff_location,
  r.ride_date,
  r.fare,
  r.ride_status,
  r.ride_type,
  r.passengers_count,
  u.name as rider_name,
  u.email as rider_email,
  d.driver_name,
  d.phone_no as driver_phone,
  v.vehicle_number,
  v.vehicle_type,
  v.capacity as vehicle_capacity,
  p.payment_mode,
  p.amount,
  p.payment_status
from rides r
join users u on r.user_id = u.user_id
left join drivers d on r.driver_id = d.driver_id
left join vehicles v on d.driver_id = v.driver_id
left join payments p on p.ride_id = r.ride_id;

-- =========================================================
-- Indexes: Performance optimizations for frequent lookups
-- =========================================================

create index if not exists idx_rides_user_id on rides(user_id);
create index if not exists idx_rides_driver_id on rides(driver_id);
create index if not exists idx_payments_ride_id on payments(ride_id);
