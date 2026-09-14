# RideShare — 3-Minute Live-Edit Rehearsal Guide

This guide prepares you for on-the-spot change requests from your evaluator during the live evaluation. Because Next.js hot-reloads both backend API routes and frontend React components instantly without restarting the server, any of these edits can be demoed in under 2 minutes.

---

## Live-Edit 1: Database Trigger Rate Modification (DB Layer)
**Evaluator prompt:** *"Can you change the base fare or the per-kilometer pricing rate?"*

1. Open **Supabase SQL Editor**.
2. Run this snippet to change the base fare from ₹50 to ₹75 and per-km rate from ₹12 to ₹15:
   ```sql
   create or replace function calculate_fare()
   returns trigger as $$
   declare
     base_fare constant numeric := 75;   -- modified from 50
     rate_per_km constant numeric := 15; -- modified from 12
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
   ```
3. In the web app, book a ride or edit an existing ride's destination: the new fare calculation takes effect immediately without touching application code.

---

## Live-Edit 2: Backend Validation Rule (API Route Layer)
**Evaluator prompt:** *"Can you prevent booking rides for past dates?"*

1. Open `app/api/rides/route.ts`.
2. Locate line 28 (inside `POST` method):
   ```typescript
   // Add this 3-line check:
   const today = new Date().toISOString().split('T')[0];
   if (ride_date && ride_date < today) {
     return NextResponse.json(
       { success: false, message: "Cannot book rides in the past." },
       { status: 400 }
     );
   }
   ```
3. Save the file.
4. Go to the web app, pick yesterday's date, and click "Confirm & Book Ride". A red toast alert will instantly appear with `"Cannot book rides in the past."`

---

## Live-Edit 3: Frontend UI Modification (Component Layer)
**Evaluator prompt:** *"Can you show a discount badge or highlight airport rides?"*

1. Open `app/dashboard/page.tsx`.
2. Inside the ride card rendering block (around line 180), add:
   ```tsx
   {ride.dropoff_location === 'Airport' && (
     <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
       ✈️ Airport Express
     </span>
   )}
   ```
3. Save the file. Next.js hot reloads the browser, and all trips heading to the Airport will immediately display the special badge!
