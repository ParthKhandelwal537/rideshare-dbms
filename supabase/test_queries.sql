-- =========================================================
-- RideShare Verification & Viva Query Pack (CIA 3)
-- Covers Section 10 (Testing Plan) & Section 15 (Live SQL Readiness)
-- =========================================================

-- 1. Test View: Joined read across 5 tables
select * from ride_full_details;

-- 2. Test Constraint: 1:1 Owns relationship
-- This query MUST FAIL because driver 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa' already owns vehicle 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
insert into vehicles (vehicle_number, vehicle_type, capacity, driver_id)
values ('KA-99-TEST-9999', 'Sedan', 4, 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- 3. Test Trigger: Haversine distance and Fare calculation
-- Inserting a ride without specifying fare -> trigger trg_calculate_fare should auto-compute fare
insert into rides (user_id, driver_id, pickup_location, dropoff_location, ride_date)
values (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'MG Road',
  'Airport',
  current_date
) returning ride_id, pickup_location, dropoff_location, fare;

-- 4. Test FK Constraint (User must exist)
-- This query MUST FAIL because user_id does not exist
insert into rides (user_id, driver_id, pickup_location, dropoff_location, ride_date)
values (
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Koramangala',
  'Indiranagar',
  current_date
);

-- 5. Test ON DELETE RESTRICT on Driver
-- This query MUST FAIL because the driver is referenced by existing rides
delete from drivers where driver_id = 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- 6. Test ON DELETE CASCADE on Ride Payments
-- Deleting a ride should automatically remove its linked payment
-- First create a test ride & payment:
insert into rides (ride_id, user_id, driver_id, pickup_location, dropoff_location)
values ('fffffff1-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Indiranagar', 'MG Road');

insert into payments (payment_id, ride_id, payment_mode, amount, payment_status)
values ('fffffff2-ffff-ffff-ffff-ffffffffffff', 'fffffff1-ffff-ffff-ffff-ffffffffffff', 'Cash', 150, 'pending');

-- Now delete the ride:
delete from rides where ride_id = 'fffffff1-ffff-ffff-ffff-ffffffffffff';

-- Verify the payment was cascaded away (should return 0 rows):
select * from payments where payment_id = 'fffffff2-ffff-ffff-ffff-ffffffffffff';

-- 7. Query Index Usage (Performance demonstration)
explain analyze
select * from rides where user_id = '11111111-1111-1111-1111-111111111111';
