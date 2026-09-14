# RideShare — DBMS CIA 3 Evaluation & Viva Cheat Sheet

**Candidate:** Parth Sharma  
**Deliverable:** Relational Database Design, Implementation & Full-Stack Web Application  
**Tech Stack:** PostgreSQL (Supabase), Next.js (App Router, TypeScript), Tailwind CSS  

---

## 1. ER-to-Relational Mapping & Cardinality Enforcement

| Relationship | Entities Involved | Cardinality | How It Is Enforced in PostgreSQL Schema |
|---|---|---|---|
| **books** | Users → Ride | **1 : M** | `rides.user_id` Foreign Key references `users(user_id)` with `ON DELETE RESTRICT`. One user can book many rides; each ride belongs to one rider. |
| **accepts** | Driver → Ride | **1 : M** | `rides.driver_id` Foreign Key references `drivers(driver_id)` with `ON DELETE RESTRICT`. A driver accepts multiple rides. |
| **owns** | Driver → Vehicle | **1 : 1** | `vehicles.driver_id` Foreign Key references `drivers(driver_id)` **with a `UNIQUE` constraint**. The FK ensures valid driver association, while `UNIQUE` guarantees at most one vehicle per driver. |
| **has** | Ride → Payment | **1 : 1** | `payments.ride_id` Foreign Key references `rides(ride_id)` **with a `UNIQUE` constraint** and `ON DELETE CASCADE`. Each ride has exactly one payment record. |
| **gives** | Users → Review | **1 : M** | `reviews.user_id` Foreign Key references `users(user_id)` with `ON DELETE RESTRICT`. A user can leave multiple reviews. |

### Summary of Aligned Attributes
- **`rides`**: `ride_id` (PK), `user_id` (FK), `driver_id` (FK), `pickup_location` (FK), `dropoff_location` (FK), `ride_date`, `fare`, `ride_status` (lifecycle), `ride_type` (solo/shared), `passengers_count`.
- **`vehicles`**: `vehicle_id` (PK), `vehicle_number`, `vehicle_type`, `capacity` (enforces passenger limit), `driver_id` (FK & UNIQUE).
- **`reviews`**: `review_id` (PK), `user_id` (FK), `comments`, `rating` (1–5, feeds `drivers.ratings`).
- *(Full diagram & viva defense guide: [ER_DIAGRAM_SPECIFICATION.md](file:///c:/Users/sw/Desktop/2nd%20year%20NOTES/CIA/DBMS/ER_DIAGRAM_SPECIFICATION.md))*

---

## 2. Key Definitions for Viva

### Primary Key vs. Foreign Key
- **Primary Key (PK):** Uniquely identifies each record within a table without duplicates or null values (`user_id`, `driver_id`, `vehicle_id`, `ride_id`, `payment_id`, `review_id`).
- **Foreign Key (FK):** A column (or set of columns) referring to the Primary Key of another table, ensuring referential integrity (`rides.user_id`, `vehicles.driver_id`, etc.).

### Candidate Key vs. Super Key (Viva Target)
- **Super Key:** Any set of attributes that uniquely identifies a row in a relation.  
  *Example:* `{ride_id, fare}` is a valid super key for `rides` because knowing `ride_id` already guarantees uniqueness, regardless of adding `fare`.
- **Candidate Key:** A minimal super key (no attribute can be removed without losing uniqueness).  
  *Example:* `{ride_id}` is minimal, making it the candidate key (and selected as the Primary Key).

---

## 3. DBMS Concepts Implemented

### A. Database Trigger (`trg_calculate_fare`)
- **Event:** `BEFORE INSERT OR UPDATE OF pickup_location, dropoff_location ON rides FOR EACH ROW`
- **Function:** `calculate_fare()`
- **Business Logic:** Looks up geographical coordinates of pickup and dropoff from the `locations` reference table, computes great-circle distance using the **Haversine formula**, and assigns:
  $$\text{Fare} = \text{Base Fare (₹50)} + (\text{Rate per km (₹12)} \times \text{Distance in km})$$
- **Why in the Database?** Logic lives in PostgreSQL directly so that fare is guaranteed correct even if rows are inserted via raw SQL or external tools, not just the web UI.

### B. Relational View (`ride_full_details`)
- Combines 5 related tables (`rides`, `users`, `drivers`, `vehicles`, `payments`) using joins.
- Allows the Admin console to perform a single query (`SELECT * FROM ride_full_details`) instead of multiple queries in application code.

### C. Performance Indexes (Unit 3 Optimization)
- `idx_rides_user_id` on `rides(user_id)`: Speeds up dashboard queries (`GET /api/rides?user_id=...`).
- `idx_rides_driver_id` on `rides(driver_id)`: Accelerates driver trip history lookups.
- `idx_payments_ride_id` on `payments(ride_id)`: Facilitates instant 1:1 payment status lookups.

---

## 4. Demonstrating CRUD via Front-End

1. **Create (Store):**
   - Click **"Book a Ride"** in the navigation bar.
   - Choose pickup and dropoff (e.g. *Indiranagar* to *Airport*).
   - The system calls `POST /api/rides`, assigns an available driver, triggers fare calculation in PostgreSQL, and generates a linked pending payment.

2. **Retrieve:**
   - On the **Dashboard**, view all personal trips filtered by `user_id`.
   - On the **Admin / Live DB** screen, see real-time updates across all 6 tables and the joined SQL view.

3. **Update:**
   - Open any pending trip, click **"Edit Ride"**, and change the destination (e.g. to *Whitefield*).
   - Calls `PATCH /api/rides/[id]`: PostgreSQL re-triggers `calculate_fare()`, and the API route synchronizes `payments.amount`.
   - Click **"Pay Now"**: Calls `PATCH /api/payments/[id]` to flip `payment_status` to `completed`.

4. **Delete:**
   - Click **"Cancel Ride"** on a pending trip: Calls `DELETE /api/rides/[id]`, which removes the ride and cascades (`ON DELETE CASCADE`) to remove the linked pending payment.

---

## 5. Constraint Enforcement Demonstration (FR6c & FR13)

- **Rule FR6c (Invoice Lock):** Once a ride is marked as **Paid / Completed**, both the **Edit** and **Cancel** actions are disabled and rejected with HTTP 400 (`"This ride can't be edited/cancelled after payment"`).
- **Rule FR13 (1:1 Owns):** In the Admin screen, attempting to add a vehicle for a driver who already has one will trigger the PostgreSQL `UNIQUE` constraint and show: `"This driver already has a vehicle."`
