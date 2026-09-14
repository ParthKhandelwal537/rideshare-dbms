-- =========================================================
-- RideShare Seed Data (DBMS CIA 3 Deliverable)
-- Provides realistic demonstration rows for all entities
-- =========================================================

-- Clear existing data if resetting
truncate table reviews, payments, rides, vehicles, drivers, users cascade;

-- Seed Users
insert into users (user_id, name, email, number) values
  ('11111111-1111-1111-1111-111111111111', 'Parth Sharma', 'parth@example.com', '9876543210'),
  ('22222222-2222-2222-2222-222222222222', 'Aarav Patel', 'aarav@example.com', '9123456780'),
  ('33333333-3333-3333-3333-333333333333', 'Sneha Rao', 'sneha@example.com', '9988776655');

-- Seed Drivers
insert into drivers (driver_id, driver_name, phone_no, license_no, ratings) values
  ('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rajesh Kumar', '9811223344', 'DL-KA-01-2019001', 4.8),
  ('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vikram Singh', '9822334455', 'DL-KA-02-2020002', 4.9),
  ('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mohammed Farhan', '9833445566', 'DL-KA-03-2021003', 4.7);

-- Seed Vehicles (Enforcing 1:1 owns with UNIQUE on driver_id)
insert into vehicles (vehicle_id, vehicle_number, vehicle_type, capacity, driver_id) values
  ('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'KA-01-AB-1234', 'Sedan (Toyota Etios)', 4, 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'KA-05-CD-5678', 'SUV (Hyundai Creta)', 6, 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'KA-03-EF-9012', 'Hatchback (Maruti Swift)', 4, 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Seed Sample Rides (Trigger trg_calculate_fare will compute fare)
insert into rides (ride_id, user_id, driver_id, pickup_location, dropoff_location, ride_date, ride_status, ride_type, passengers_count) values
  ('ccccccc1-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Koramangala', 'Airport', current_date - interval '1 day', 'completed', 'solo', 1),
  ('ccccccc2-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MG Road', 'Indiranagar', current_date, 'driver_assigned', 'shared', 2),
  ('ccccccc3-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Whitefield', 'Electronic City', current_date, 'in_transit', 'solo', 1);

-- Seed Linked Payments (1:1 has with rides)
insert into payments (payment_id, ride_id, payment_mode, amount, payment_status)
select 
  'ddddddd1-dddd-dddd-dddd-dddddddddddd', 
  'ccccccc1-cccc-cccc-cccc-cccccccccccc', 
  'UPI (Google Pay)', 
  fare, 
  'completed'
from rides where ride_id = 'ccccccc1-cccc-cccc-cccc-cccccccccccc';

insert into payments (payment_id, ride_id, payment_mode, amount, payment_status)
select 
  'ddddddd2-dddd-dddd-dddd-dddddddddddd', 
  'ccccccc2-cccc-cccc-cccc-cccccccccccc', 
  'Credit Card', 
  fare, 
  'pending'
from rides where ride_id = 'ccccccc2-cccc-cccc-cccc-cccccccccccc';

insert into payments (payment_id, ride_id, payment_mode, amount, payment_status)
select 
  'ddddddd3-dddd-dddd-dddd-dddddddddddd', 
  'ccccccc3-cccc-cccc-cccc-cccccccccccc', 
  'Cash', 
  fare, 
  'pending'
from rides where ride_id = 'ccccccc3-cccc-cccc-cccc-cccccccccccc';

-- Seed Reviews (with 1-5 rating)
insert into reviews (review_id, user_id, comments, rating) values
  ('eeeeeee1-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'Driver was very polite and reached pickup location on time. Great experience!', 5),
  ('eeeeeee2-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Clean car and smooth driving through peak Bangalore traffic.', 5);
