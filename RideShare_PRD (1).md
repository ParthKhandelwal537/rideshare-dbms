# RideShare — Product Requirements Document

**Project:** DBMS Course Deliverable — Ride Sharing Application
**Based on:** Hand-drawn ER diagram (Users, Driver, Vehicle, Ride, Payment, Review)
**Author:** Parth
**Purpose of this doc:** Single source of truth to build, explain, and live-edit the app during evaluation.

---

## 1. Overview

RideShare is a minimal, full-stack ride-booking web application built to demonstrate a working implementation of a relational database designed from an ER diagram. The emphasis is on **traceability** (every screen/table maps back to the ER diagram) and **explainability** (the stack is simple enough to walk through live and modify on the spot during evaluation — including backend/API code, not just the database).

**Primary goal:** Show a correct, working translation of the ER diagram (entities, attributes, keys, and 1:1 / 1:M relationships) into a live relational schema, wired to a real backend API and a working frontend.

**Non-goals:** Production-grade security, scalability, payment gateway integration, or **live map/geocoding APIs (e.g. Google Maps)** — fare is instead calculated offline from a fixed set of locations using a real distance formula (Section 5.6), avoiding API keys, billing, and network dependency during evaluation. These are explicitly out of scope to keep the build simple and defensible.

**One narrow exception:** the Admin/Demo view (Section 5.3, FR11b) uses Supabase Realtime so newly inserted rows appear on screen without a manual refresh, specifically to make live DB connectivity visible during evaluation. This is the one deliberate real-time feature in an otherwise non-real-time app — the rider dashboard and ride detail screens still use plain request/response, no subscriptions.

---

## 1a. CIA 3 Official Requirement Mapping

This project is scoped to satisfy the CIA 3 brief exactly, with no extra features that don't map to a stated requirement.

| CIA 3 Requirement | How this project satisfies it |
|---|---|
| ER Model → Database | Section 2 below shows the ER diagram translated into a relational schema; Section 14 has the full SQL DDL |
| Database (any DB of choice) | PostgreSQL, hosted on Supabase — see Section 4 for justification |
| Front-End Development | Next.js pages (React) — see Section 7 |
| Database Connectivity | Next.js API routes call the Postgres DB directly — see Section 5.5. **Store** = Book Ride (FR3); **Retrieve** = Dashboard/Ride Detail (FR6); **Update** = Edit Ride button (FR6a); **Delete** = Cancel Ride button (FR6b) — all four demonstrated by clicking through the actual front end, not just via SQL |
| Technology Choice | Free choice used deliberately for simplicity + explainability, justified in Section 4 |
| Working Demonstration | Section 10 (Testing Plan) + Section 13 (Evaluation-Day Cheat Sheet) + Section 15 (Live SQL Readiness) |
| Report Submission | Out of scope for this document — this PRD can serve as the basis for the written report, but the report itself is a separate deliverable (hard copy, one per team) |

**Note on scope:** the official brief only requires ER → DB → Front-End → Connectivity → Demo. It does not explicitly require a backend/API layer. The Next.js API-route layer in this plan is an intentional (small) addition beyond the minimum, specifically because you anticipate the evaluator may ask to see or modify "backend" code, not because the rubric demands it — it is not scope creep against the brief, just insurance against a likely question.

---

## 2. Background: ER Diagram Summary

**Entities & attributes**

| Entity | Attributes |
|---|---|
| Users | User_id (PK), Name, Email, Number |
| Driver | Driver_id (PK), Driver_name, Phone_no, License_no, Ratings |
| Vehicle | Vehicle_id (PK), Vehicle_number, Vehicle_type, Capacity |
| Ride | Ride_id (PK), Pickup_location, Dropoff_location, Ride_date, Fare |
| Payment | Payment_id (PK), Payment_mode, Amount, Payment_status |
| Review | Review_id (PK), Comments |

**Keys Reference (Primary / Foreign / Unique / Candidate / Super)**

These are all already implemented in the DDL (Section 16) via `references` and `unique` clauses — this table just makes each one explicit, since the attributes list above only marked PKs for brevity.

| Table | Primary Key | Foreign Key(s) | Unique / Alternate Key(s) | Notes on candidate/super keys |
|---|---|---|---|---|
| `users` | `user_id` | — | `email` | `email` is UNIQUE because Supabase Auth functionally requires it for login — not just theoretical correctness |
| `drivers` | `driver_id` | — | — | `license_no` is stored but **not** given a UNIQUE constraint — nothing in the app checks or relies on it being unique, so adding one would be unenforceable-in-practice theory, not a real need |
| `vehicles` | `vehicle_id` | `driver_id` → `drivers(driver_id)` | `driver_id` (UNIQUE) | `vehicle_number` is stored but **not** UNIQUE, same reasoning as `license_no` above; `driver_id` is both a FK *and* UNIQUE — that combination is what enforces the 1:1 "owns" relationship (a driver can appear at most once here) |
| `locations` | `name` | — | — | `name` is a natural-key PK (no separate uuid needed for a small fixed reference table) |
| `rides` | `ride_id` | `user_id` → `users(user_id)`; `driver_id` → `drivers(driver_id)`; `pickup_location` → `locations(name)`; `dropoff_location` → `locations(name)` | — | Four FKs on one table is normal for a "central" entity that connects to everything else — this is the table with the most relationships in the ER diagram |
| `payments` | `payment_id` | `ride_id` → `rides(ride_id)` | `ride_id` (UNIQUE) | Same 1:1 pattern as vehicles/drivers: FK + UNIQUE together enforce the "has" 1:1 relationship |
| `reviews` | `review_id` | `user_id` → `users(user_id)` | — | Straightforward 1:M FK, matching the "gives" relationship |

**A super key example, for your viva if asked:** `{ride_id, fare}` is a valid super key for `rides` (it does uniquely identify a row, since `ride_id` alone already does) — but it is *not* a candidate key, because it isn't minimal; dropping `fare` still leaves a unique identifier. `{ride_id}` alone is the candidate key (and the chosen primary key).

**Relationships & cardinality**

| Relationship | Between | Cardinality |
|---|---|---|
| gives | Users → Review | 1 : M |
| books | Users → Ride | 1 : M |
| accepts | Driver → Ride | 1 : M |
| owns | Driver → Vehicle | 1 : 1 |
| has | Ride → Payment | 1 : 1 |

**Derived relational schema**

```sql
users(user_id PK, name, email UNIQUE, number)
drivers(driver_id PK, driver_name, phone_no, license_no, ratings)
locations(name PK, latitude, longitude)
vehicles(vehicle_id PK, vehicle_number, vehicle_type, capacity, driver_id FK→drivers UNIQUE)
rides(ride_id PK, user_id FK→users, driver_id FK→drivers, pickup_location FK→locations, dropoff_location FK→locations, ride_date, fare)
payments(payment_id PK, ride_id FK→rides UNIQUE, payment_mode, amount, payment_status)
reviews(review_id PK, user_id FK→users, comments)
```

See the Keys Reference table above for the full breakdown of why each FK/UNIQUE is there. The short version: `vehicles.driver_id` and `payments.ride_id` are UNIQUE *in addition to* being FKs — that combination is what enforces the ER diagram's 1:1 relationships (owns, has), since a plain FK alone only enforces "this value must exist elsewhere," not "at most once."

**One deliberate addition beyond the hand-drawn diagram:** the `locations` reference table (name, latitude, longitude) is introduced to support real fare calculation (see Section 5.6). It's a lookup/reference table, not a new core entity in the ER sense — the same category as a "state codes" or "category" table you'd add in any real schema. `rides.pickup_location` and `rides.dropoff_location` become foreign keys into it, which also tightens data integrity (only valid, known locations can be booked).

---

## 3. Goals & Success Criteria

| Goal | Success criteria |
|---|---|
| Faithful schema translation | Every entity, attribute, PK/FK, and cardinality from the ER diagram exists in the live DB |
| Working end-to-end flow | A user can sign up, book a ride, get a payment record, and leave a review, without errors |
| Real, explainable backend | API routes exist as actual code (not just auto-generated), organized one-route-per-operation, so evaluator questions about "backend" have a real answer |
| Explainability | Every table/screen/API-route triplet can be narrated in under 1 minute |
| Live-editability | A new column, field, API route change, or component change can be made and demoed in under 5 minutes during evaluation, on both frontend and backend, without restarting the dev server |
| Clean deploy | App is reachable via a public URL, DB is reachable via dashboard, both before eval day |

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework (frontend + backend) | **Next.js (App Router)** | Single codebase and single dev server for both frontend pages/components AND backend API routes — hot reload on both, no context-switching or restarts during a live evaluation |
| Frontend | React components inside Next.js (`/app`) | Standard, no extra framework to explain |
| Styling | Plain CSS or Tailwind (optional) | Keep visual layer simple — avoid over-engineering |
| Backend/API | **Next.js API routes** (`/app/api/*/route.ts`) | Real, readable backend code — one route per operation (e.g., `POST /api/rides`, `GET /api/rides/[id]`) — this is what you show if asked "walk me through the backend" |
| Database | **Supabase-hosted PostgreSQL** (used purely as the DB — not its auto-REST layer) | Relational — matches ER diagram directly; accessed from API routes via `@supabase/supabase-js` or a Postgres client |
| Auth | Supabase Auth (email/password), called from API routes or client | Minimal login for Users; optional for Drivers/Admin |
| Hosting | **Vercel** (hosts both frontend and API routes together) | One deploy target for the whole app; DB stays on Supabase |
| Live demo updates | **Supabase Realtime** (`@supabase/supabase-js` client-side subscriptions), Admin/Demo view only | Lets the Admin/Demo screen (FR11b) reflect INSERT/UPDATE/DELETE the instant they happen, without a manual refresh — a deliberate, narrow exception to the "no real-time features" non-goal, kept off the rider-facing pages to avoid unnecessary complexity there |
| Build agent | Antigravity | Used to scaffold and iterate on the codebase from structured prompts |
| UI design generation | **Google Stitch**, connected to Antigravity via its official MCP server | Antigravity generates the 5 screens' visual design (Section 7) directly through Stitch — free, generous daily credits (no billing tier), no manual export/import step; Google publishes a dedicated Antigravity+Stitch MCP codelab for this exact workflow. Timeboxed (Stage 5, ~20-30 min): if the MCP connection is flaky, fall back to Antigravity building the screens directly from Section 7's descriptions with plain Tailwind styling — the design layer is not graded, so it must never be allowed to block the graded parts (Stages 1-4, 7-9) |

**Why this changed from the earlier plan:** the original plan (React + Supabase's auto-generated REST API) has no custom backend code to point to — if an evaluator asks you to modify "the backend," there's nothing there to edit. Next.js API routes give you a real, minimal backend layer in the *same* project and *same* dev server as the frontend, so both are equally live-editable without adding real operational complexity (no second server process, no separate deploy).

**Why not a separate Express server (Option C):** functionally similar backend capability, but it's a second process/terminal to run and juggle during a live demo — pure overhead for this project's scope.

**Why not Firebase/Firestore:** Firestore is a NoSQL document store; forcing your relational ER diagram (with explicit 1:1/1:M cardinalities) into it would fight the diagram rather than express it.

**Why PostgreSQL specifically (vs. MySQL/Oracle/MongoDB, all allowed by the brief):**
- Your ER diagram has explicit 1:1 and 1:M cardinalities and FK relationships — a relational engine is the direct, defensible translation; a NoSQL choice (MongoDB) would need extra justification for flattening a relational design.
- You've already worked with Oracle SQL this term — Postgres is close enough in syntax (joins, constraints, sequences, CTEs) that live queries or edits during evaluation draw on skills you already have.
- Supabase (which hosts the Postgres instance) includes a SQL Editor, so if the evaluator asks you to "execute some instructions" live, you can run real INSERT/SELECT/UPDATE/DELETE statements directly against the production DB in front of them — see Section 15.

**Why Stitch (vs. v0 or building UI unaided):** v0 by Vercel was considered — tighter React/Tailwind/shadcn output and same vendor as the Vercel deploy target — but its free tier is capped at $5/month in credits and ~7 messages/day, which is genuinely tight for an agent that will need a few iterations across 5 screens; Stitch's free daily allowance is far more generous with no billing tier at all, which matters more for a zero-budget student project than v0's slightly tighter stack fit. The trade-off is real and worth naming if asked: Stitch's output needs more translation into the actual Next.js/Tailwind code than v0's would, and its MCP integration with Antigravity is newer and has at least one reported connection failure — hence the explicit timebox and fallback above.

---

## 5. Functional Requirements

### 5.1 User-facing (Rider)
- FR1: Rider can sign up and log in.
- FR2: Rider can view their profile (Name, Email, Number).
- FR3: Rider can book a ride by selecting a pickup location and dropoff location from a **fixed dropdown list** (not free text) and a ride date. `POST /api/rides` does three plain, sequential steps: (1) query `drivers` for a random available row, (2) insert the ride (the trigger from Section 5.6 auto-computes `fare`), (3) insert a linked `payments` row with status `pending`. **Fare is not entered by the rider** — it is derived server-side, matching the ER diagram's implication that Fare is a property of the Ride driven by its locations, not an independent input. The route rejects a booking where pickup and dropoff are the same location (400 error), since that's a meaningless ride rather than a valid zero-fare edge case.
- FR3a: If step (1) finds **no rows** in `drivers`, the route returns a clear 400 error ("No drivers available") before attempting the ride insert. Seed data in Stage 1 guarantees this won't happen in the default demo, but the route should handle it gracefully in case a teammate deletes all drivers live during evaluation.
- FR4: System records a Ride row linked to the rider and the randomly assigned driver.
- FR5: Each ride gets a `payments` row automatically at booking (status `pending`, amount = the trigger-computed fare). Rider can mark it paid from the Ride Detail screen — a "Pay Now" button calls `PATCH /api/payments/[id]` to set `payment_status = 'completed'`. This gives Payments its own Update demonstration, not just Rides.
- FR6: Rider can view their ride history via `GET /api/rides?user_id=...`.
- FR6a: Rider can **edit** an existing ride's **pickup, dropoff, or date** from the Ride Detail screen — calls `PATCH /api/rides/[id]`. **Fare is never a directly-editable field** — if pickup/dropoff changes, the trigger from Section 5.6 recomputes `fare` automatically, and the same API call updates the linked `payments.amount` to match, so the two tables never disagree about the price. This is the front-end-driven **Update** demonstration required by CIA 3.
- FR6b: Rider can **delete/cancel** a ride from the Ride Detail screen — calls `DELETE /api/rides/[id]`. This is the front-end-driven **Delete** demonstration required by CIA 3.
- FR6c: Edit and Delete are only allowed while the linked payment's status is `pending`. Once `payment_status = 'completed'`, the ride is locked — no further edits or deletion. This mirrors a real invoice: you don't rewrite a ride after it's been paid for, and it closes the gap where an edited fare could otherwise silently disagree with an already-completed payment.
- FR7: Rider can leave a Review (comments) tied to their user_id via `POST /api/reviews`.

### 5.2 Driver-facing
- FR8: Driver record exists with name, phone, license number, and rating.
- FR9: Driver owns exactly one Vehicle (vehicle number, type, capacity).
- FR10: Driver can view rides assigned/accepted via `GET /api/rides?driver_id=...`.

### 5.3 Admin/demo view (optional but recommended)
- FR11: A read-only screen listing all six tables (via simple `GET /api/<table>` routes), for live demonstration of both schema and API during evaluation.
- FR11a: Simple "Add Driver" and "Add Vehicle" forms on this screen (`POST /api/drivers`, `POST /api/vehicles`) — gives an in-app Insert demonstration for these two tables, which otherwise only had seed data from Stage 1.
- FR11b: The Admin/Demo view subscribes to **Supabase Realtime** on all six tables. When a row is inserted, updated, or deleted anywhere — including from a completely separate browser tab or device (e.g. booking a ride in the rider app) — the corresponding table on this screen updates automatically, with no page refresh. This is purely a demo aid: it makes "the frontend action really did write to the database, right now" visible without needing to alt-tab to the Supabase Table Editor.

### 5.4 Data integrity
- FR12: Foreign keys enforced at the DB level (rides.user_id → users.user_id, rides.driver_id → drivers.driver_id, payments.ride_id → rides.ride_id, vehicles.driver_id → drivers.driver_id, reviews.user_id → users.user_id).
- FR13: 1:1 relationships (owns, has) enforced via UNIQUE constraints on the FK column.
- FR14: `ON DELETE` behavior is explicit for every FK (Section 16), not left to Postgres's default: `RESTRICT` everywhere a parent row (user, driver, location) shouldn't disappear while dependent rides/vehicles/reviews still reference it, and `CASCADE` only on `payments.ride_id` — deleting a ride cleans up its own payment record rather than leaving an orphan.

### 5.5 API surface (reference)

| Route | Method | Purpose |
|---|---|---|
| `/api/users` | GET/POST | List / create users |
| `/api/drivers` | GET/POST | List / create drivers |
| `/api/vehicles` | GET/POST | List / create vehicles |
| `/api/rides` | GET/POST | List (filter by user/driver) / create rides — POST does the 3-step sequence from FR3 as plain code in the route (no stored procedure) |
| `/api/rides/[id]` | GET/PATCH/**DELETE** | Get / update / **delete** a single ride. PATCH only accepts pickup/dropoff/date (never fare directly) and, if the linked payment is still `pending`, also updates `payments.amount` to match the recomputed fare. Both PATCH and DELETE are refused (400) once the linked payment is `completed` (FR6c). These fulfil the "update and delete" part of CIA 3's Database Connectivity requirement, driven from the UI, not just SQL |
| `/api/payments` | GET/POST | List / create payments (create is normally handled as step 3 inside `POST /api/rides`, but the route stays available for direct testing) |
| `/api/payments/[id]` | PATCH | Mark a payment as `completed` — the "Pay Now" button's Update operation |
| `/api/reviews` | GET/POST | List / create reviews |

Keeping each route to a single, small, obvious responsibility is deliberate — it's what makes "change this on the spot" tractable.

### 5.6 Fare Calculation Logic

Fare is **not typed in by the rider** — it's derived from the pickup/dropoff pair, matching your ER diagram's implication that Fare is a property of the Ride, not an independent input.

**How it works:**
1. A `locations` table holds ~6 fixed points (e.g., MG Road, Whitefield, Koramangala, Airport, Electronic City, Indiranagar) with real latitude/longitude.
2. The Book-a-Ride form uses **dropdowns**, not free text, so pickup/dropoff always match a row in `locations`.
3. A PostgreSQL **trigger** (`trg_calculate_fare`) fires `BEFORE INSERT OR UPDATE` on `rides`. It looks up both locations' coordinates, computes the great-circle distance between them using the **Haversine formula** (a real distance calculation, not a made-up number), and sets `fare = base_fare + rate_per_km × distance`.
4. `base_fare` and `rate_per_km` are constants inside the trigger function — a single line each, and a good "live-edit" target if asked to change pricing.

**Why a trigger (in the DB) instead of doing this math in the Next.js API route:** it means fare is correct no matter *how* a row gets inserted — through your app, through a raw SQL insert in the evaluation, or through any future client — which is a genuine, defensible reason to use a trigger, not just "because the course covers triggers." Full SQL is in Section 16.

**Alternative considered:** compute fare in the API route (application-layer JavaScript) instead of a DB trigger. Simpler to explain if you're not comfortable with PL/pgSQL, but then fare would *not* be enforced if someone inserts a row directly via SQL — weaker for a DBMS course specifically, since the whole point is showing logic living in the database.

### 5.7 DBMS Concepts Applied (Course Alignment)

Kept deliberately minimal — only concepts that solve a real problem in this app, each explainable in under a minute:

| Concept | Where used | What it does | Why here (not just app code) |
|---|---|---|---|
| **Trigger** | `trg_calculate_fare` on `rides` | Auto-computes `fare` before every insert/update of a ride | Guarantees fare is always correct regardless of what inserts the row (Section 5.6) — no simpler way to make fare genuinely "derived" |
| **View** | `ride_full_details` | One `SELECT` that joins rides, users, drivers, vehicles, and payments | The Admin/Demo screen queries one view instead of the API route doing 4 separate joins in JavaScript |
| **Index** | on `rides.user_id`, `rides.driver_id`, `payments.ride_id` | Speeds up the exact lookups your app does constantly (a rider's ride history, a driver's assigned rides) | Ties to Unit 3 (storage/query processing) — a real, if small-scale, performance argument |

**Considered and deliberately dropped:**
- **Stored procedure for atomic booking (transaction demo):** would have wrapped driver-assignment + ride-insert + payment-insert as one atomic DB function, called via RPC. Cut because it adds a second PL/pgSQL object and a harder-to-reason-about failure mode, for a concept (transactions) that isn't worth the added surface area here. Driver assignment and payment creation happen as plain sequential steps in the `POST /api/rides` route instead (Section 5.5) — simpler, and still real backend code you can walk through line by line.
- **Cursor:** there's no natural need for one in this app (picking one random driver is a single query, not row-by-row processing) — including one anyway would be unused complexity you'd struggle to justify if asked "why is this here?"

**Normalization note (Unit 2):** the schema is already in a normalized form appropriate for this scale — every non-key attribute depends only on its table's primary key, no repeating groups, and the `locations` lookup table avoids duplicating coordinate data across every ride. Worth a one-line mention in your report/viva ("normalized to remove redundant location data") since normalization is an explicit rubric line item.

### 5.8 In-App Feedback (UI Notifications)

- FR15: Every state-changing action shows the user a clear, immediate **in-app confirmation or error message** (toast/snackbar or an inline banner near the form — implementation detail, not prescribed) after the API call resolves. This is UI feedback only — **not** push/email/SMS notifications to a different user (see Section 18 — real cross-user notifications remain explicitly out of scope). The required cases:

| Action | Route | Success message (example) | Failure message (example) |
|---|---|---|---|
| Sign up | Supabase Auth | "Account created — you're logged in." | e.g. "That email is already registered." |
| Log in | Supabase Auth | "Welcome back." | "Incorrect email or password." |
| Book a Ride | `POST /api/rides` | "Ride booked — fare ₹X." | "No drivers available right now." / "Pickup and dropoff can't be the same." |
| Pay Now | `PATCH /api/payments/[id]` | "Payment successful." | Generic failure message on a non-2xx response. |
| Edit ride | `PATCH /api/rides/[id]` | "Ride updated — new fare ₹X." | "This ride can't be edited after payment." |
| Delete/Cancel ride | `DELETE /api/rides/[id]` | "Ride cancelled." | "This ride can't be cancelled after payment." |
| Leave a review | `POST /api/reviews` | "Review submitted." | Validation error (e.g. empty comment). |
| Admin: Add Driver | `POST /api/drivers` | "Driver added." | Generic failure message on a non-2xx response. |
| Admin: Add Vehicle | `POST /api/vehicles` | "Vehicle added." | "This driver already has a vehicle." (UNIQUE constraint, FR13) |

- FR15a: Messages should surface the **actual reason** returned by the API (e.g. the 400 body's message) rather than a generic "Something went wrong" wherever the route already returns a specific one (FR3a, FR6c, FR13) — this doubles as a live demonstration that your backend validation is real, not decorative.

---

## 6. Non-Functional Requirements

- **Simplicity over completeness:** prefer fewer, well-understood moving parts over "complete" features.
- **Explainability, frontend and backend:** no code should exist in the app — page, component, or API route — that Parth cannot personally walk through line by line.
- **Live-editability:** Next.js dev server (`next dev`) hot-reloads both pages/components and API routes, so changes are visible in seconds on either layer, in the same terminal and browser tab.
- **Performance:** irrelevant at this scale (single evaluator, low traffic) — not a design priority.
- **Security:** basic only (Supabase Auth, simple validation in API routes) — explicitly not a goal to harden.

---

## 7. Design / UI

**Screens (5, deliberately minimal):**
1. **Login / Signup** — Supabase Auth email+password form.
2. **Dashboard** — list of the logged-in rider's past/current rides (calls `GET /api/rides`).
3. **Book a Ride** — form: pickup/dropoff **dropdowns** (from `locations`), date → calls `POST /api/rides`, which assigns a driver, creates the ride (fare auto-computed), and creates a pending payment. Fare is not shown as an input field — it appears after booking, already calculated.
4. **Ride Detail** — shows fare/payment status/mode/review, a **Pay Now** button (`PATCH /api/payments/[id]`), plus **Edit** (pickup/dropoff/date only — via `PATCH /api/rides/[id]`, which re-triggers fare calculation and resyncs the payment amount) and **Delete/Cancel Ride** (via `DELETE /api/rides/[id]`) buttons — both are disabled once the payment is marked paid (FR6c). This screen alone demonstrates Store/Retrieve/Update/Delete across two tables (rides and payments) end-to-end through the connected front end.
5. **Admin/Demo view** (optional but recommended) — raw table listings for Users, Drivers, Vehicles, Rides, Payments, Reviews, for live schema/API demonstration, **plus simple "Add Driver" and "Add Vehicle" forms** (calling `POST /api/drivers` and `POST /api/vehicles`) — this closes the gap where those two tables previously only had seed data, giving you an in-app Insert demonstration for every entity, not just Rides.

**Design principles:**
- Card/table-based layout, minimal custom components.
- Every screen should visually correspond to one or two DB tables *and* one or two API routes, so the schema, backend, and UI can all be narrated together.
- Avoid animation, complex state management, or design systems that add explanation overhead.
- Every action that calls the API shows a clear success or error message per FR15/5.8 — a single shared toast/banner component is enough; no need for a design system.

**UI generation workflow:** the 5 screens' visual design is generated by Antigravity through Google Stitch, connected via its MCP server (Section 4), rather than designed manually. Antigravity generates the screens from the descriptions above, then builds the actual Next.js/Tailwind pages against that design. This is timeboxed — see Stage 5 — since the visual layer isn't graded and shouldn't be allowed to block the parts that are. Concrete workflow: Section 7a.

---

## 7a. Using Stitch (MCP already connected)

Stitch MCP is already set up (API key attached in Antigravity). This section is the operational "how and where" — not setup.

**Where Stitch fits in the build, and where it doesn't:**
- **Use it for:** generating the visual design of the 5 screens in Section 7 — layout, spacing, color, component look-and-feel.
- **Don't use it for:** anything behind the screen — schema (Stage 1), API routes (Stage 3), auth logic (Stage 4), the fare trigger (Section 5.6), or Realtime wiring (FR11b). Stitch has no visibility into your DB or backend, and shouldn't — those stay hand-built and explainable per the Constraints in Section 9.

**When to invoke it:** at the start of Stage 5, before any frontend code is written — not per-component later, and not to "polish" an already-built screen. One generation pass per screen, reviewed, then built against. Going back to Stitch mid-Stage-5 to regenerate a screen is allowed but counts against the same ~20-30 min timebox from Stage 5 — don't let iteration creep past it.

**What to actually ask Stitch for, per screen** (give Antigravity these as the prompts to pass through the Stitch MCP tools):
1. **Login/Signup** — "A clean, minimal login/signup form for a ride-booking app. Email and password fields, a toggle between login and signup, a single primary action button."
2. **Dashboard** — "A dashboard listing a rider's past and current rides as cards — pickup, dropoff, date, fare, and status badge (pending/completed) per card. A 'Book a Ride' button prominent at the top."
3. **Book a Ride** — "A ride-booking form with a pickup location dropdown, a dropoff location dropdown, and a date picker. No fare field — fare is not entered by the user."
4. **Ride Detail** — "A ride detail view showing pickup, dropoff, date, fare, payment status, and a review section. Include a 'Pay Now' button, an 'Edit' button, and a 'Cancel Ride' button, with Edit/Cancel visually disabled/grayed out when payment is complete."
5. **Admin/Demo view** — "A read-only admin dashboard with 6 data tables (Users, Drivers, Vehicles, Rides, Payments, Reviews) and two small forms at the top: 'Add Driver' and 'Add Vehicle'."

Keep one consistent style direction across all 5 prompts (e.g. "clean, minimal, card-based, one accent color") so the screens don't look like 5 unrelated apps stitched together.

**What to pull back and use:** the generated layout, spacing, and color/style direction (design tokens) — Antigravity should translate this into real Next.js/React/Tailwind components in Stage 5, not embed Stitch's raw export as-is. The toast/banner component (FR15), the pickup≠dropoff validation, the fare-never-editable rule, and the Edit/Delete-disabled-after-payment logic (FR6c) are functional requirements Stitch doesn't know about — Antigravity must add them on top of whatever Stitch generates, per Section 5.8 and 5.1.

**If a generation looks wrong or generic:** re-prompt Stitch once with more specific direction rather than accepting a bad screen — but stay inside the Stage 5 timebox. If it's still not usable after one retry, drop Stitch for that screen and let Antigravity build it directly in Tailwind instead; don't let one stubborn screen block the other four.

---

## 8. Users / Roles

| Role | Maps to | Capabilities |
|---|---|---|
| Rider | `users` table | Book rides, view history, pay, review |
| Driver | `drivers` table (+ `vehicles`) | Own a vehicle, accept/view rides |
| Admin (optional) | no dedicated table — UI-only role | Read-only view across all tables and routes, for demo |

---

## 9. Constraints

- Must be explainable end-to-end live — on frontend, backend, and database — no unexplainable generated code.
- Must support on-the-spot schema, API, and UI edits without long rebuild or redeploy cycles.
- Schema must mirror the submitted ER diagram's entities, attributes, keys, and cardinalities exactly.
- Time-boxed build — explicitly excludes maps, real payment gateways, real-time tracking, and matching algorithms.
- Single-developer build (Parth), using an AI coding agent (Antigravity) for scaffolding.

---

## 10. Testing Plan

### 10.1 Schema-level tests
- Insert a Ride with a non-existent `user_id` → should fail (FK constraint).
- Insert two Vehicles for the same `driver_id` → should fail (UNIQUE constraint, enforces 1:1 owns).
- Insert two Payments for the same `ride_id` → should fail (UNIQUE constraint, enforces 1:1 has).
- Delete a User with existing Rides → verify FK behavior (restrict or cascade, chosen deliberately and explainable).
- Insert a ride with a known pickup/dropoff pair → confirm `fare` is auto-populated by `trg_calculate_fare` and matches a manual Haversine calculation for that pair.
- `SELECT * FROM ride_full_details` → confirm the view returns correctly joined data.
- `EXPLAIN` a ride-history query before/after adding the indexes (Section 16) to see the query plan use the index — good live "explain a concept" moment.

### 10.2 API-level tests
- `POST /api/rides` with valid data → 201 + new ride row **and** a linked `payments` row with status `pending`.
- `POST /api/rides` with missing/invalid fields, or pickup = dropoff → 400 with a clear error (shows real backend validation, a good live-edit target).
- `GET /api/rides?user_id=...` → only that user's rides.
- `PATCH /api/payments/[id]` → payment status flips to `completed`.
- `PATCH /api/rides/[id]` changing pickup/dropoff, payment still pending → `rides.fare` and `payments.amount` both update and match.
- `PATCH` or `DELETE /api/rides/[id]` after the linked payment is `completed` → 400, ride unchanged (FR6c).

### 10.3 Flow-level tests (manual click-through)
- Sign up → log in → book a ride → see it in dashboard → open ride detail → see payment → leave review.
- **Edit a ride's pickup/dropoff** from Ride Detail (while payment is still pending) and confirm both `rides.fare` and `payments.amount` update together and match (Update).
- **Delete/cancel a ride** from Ride Detail while payment is pending and confirm it disappears from the dashboard and DB (Delete).
- Mark a payment as paid ("Pay Now"), then confirm the Edit and Delete controls become disabled/rejected for that ride (FR6c).
- Confirm ride history correctly filters to the logged-in user only.
- Open the Admin/Demo view and the rider app in two separate tabs; book a ride (or add a driver) in one and confirm it appears on the Admin/Demo view within a second or two, with no manual refresh (FR11b).
- Trigger each success and failure case in Section 5.8's table (e.g. try to edit a paid ride, try to add a duplicate vehicle) and confirm a visible, specific message appears each time (FR15/FR15a).

### 10.4 Live-edit rehearsal
- Practice adding one new column (e.g., `rides.status`) end-to-end: DB change → API route change → frontend change → hot-reload → demonstrate.
- Practice one API-level change live (e.g., add a query filter to `GET /api/rides`, add a new validation rule to `POST /api/rides`).
- Practice one pure-frontend change live (e.g., add a field to the booking form).

---

## 11. Timeline (suggested)

| Phase | Content |
|---|---|
| 1 | Supabase project setup: create the 6 tables, FKs, UNIQUE constraints |
| 2 | Next.js scaffold + Supabase client connection (server-side) |
| 3 | API routes: users, drivers, vehicles, rides, payments, reviews |
| 4 | Frontend pages wired to API routes: auth, dashboard, book ride, ride detail |
| 5 | Admin/demo view + polish |
| 6 | Deploy (Vercel) + rehearse live-edit (frontend, backend, and DB) and explanation |

---

## 12. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supabase free-tier project auto-pauses after inactivity | Medium | High (app looks broken at eval) | Log in and "wake" the project the morning of evaluation |
| Evaluator asks to see/modify backend code | High (now expected) | Low, now mitigated | Next.js API routes give a real backend to open and edit — this risk is now the reason for the stack choice, not an unaddressed gap |
| Live edit requested that wasn't rehearsed | Medium | Medium | Pre-identify 2–3 plausible changes on each layer (DB, API route, frontend component) and rehearse each |
| Auth complexity derails the demo | Low | Medium | Keep auth to email/password only; no OAuth, no email verification flows |
| Scope creep (maps, gateways, matching algorithm) eats build time | Medium | High | Explicitly listed as out-of-scope in this PRD; revisit only if core flows are done early |
| Deployed frontend/backend env vars misconfigured (Supabase keys) | Low | High (nothing loads) | Test the deployed Vercel URL (not just localhost) at least once before evaluation day, confirming API routes work in production too |

---

## 13. Evaluation-Day Cheat Sheet

- Open the deployed Vercel app URL in one tab, showing the Admin/Demo view (FR11b).
- Open the same deployed app in a second tab/device as a "rider" — book a ride there and point at the first tab as the row appears live, with no refresh. This is the single best "it's really connected" moment in the demo; rehearse it once beforehand.
- Keep the Supabase dashboard (Table Editor) open in a third tab as a backup/cross-check, and for anything Realtime doesn't cover (e.g. running live SQL from Section 15).
- Have the project open in your editor with `next dev` running, so any requested change (frontend or backend) is a save away from being live.
- Know your 2–3 rehearsed "live edit" changes cold, across DB / API route / frontend.
- Be ready to point at any UI screen and immediately name the table(s) and API route(s) behind it.
- Have the ER diagram (this doc's Section 2) mentally mapped to the schema — evaluators often ask "show me where this cardinality is enforced."

---

## 14. Setup & Secrets (.env)

No live third-party/paid APIs are required for this project (maps and payment gateway are explicitly out of scope). All connectivity is to your own Supabase project.

| Variable | Secret? | Used where | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Not sensitive | Client + server | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Not sensitive (protected by RLS) | Client + server | Normal authenticated read/write |
| `SUPABASE_SERVICE_ROLE_KEY` | **Real secret — full DB access** | Server-side only (inside API routes) | Only if an API route needs to bypass RLS (e.g. admin view); start without it, add only if needed |

- Store these in `.env.local` (Next.js default, already gitignored) for local dev.
- Add the same variables again in Vercel → Project Settings → Environment Variables before deploying.
- Never prefix the service role key with `NEXT_PUBLIC_` — that would ship it to the browser.

---

## 15. Live SQL / On-the-Spot Instruction Readiness

If the evaluator asks you to "execute some instructions," they most likely mean run live SQL against the real database, separate from the app UI. Rehearse these directly in the Supabase SQL Editor (not just through the app) so you're not caught off guard:

```sql
-- INSERT (Create)
insert into users (name, email, number)
values ('Test Rider', 'test.rider@example.com', '9999999999');

-- SELECT (Read) — simple and with a join
select * from rides where user_id = '<some-user-id>';

select r.ride_id, u.name, r.pickup_location, r.dropoff_location, r.fare
from rides r
join users u on r.user_id = u.user_id;

-- UPDATE
update rides set fare = 250 where ride_id = '<some-ride-id>';

-- DELETE
delete from reviews where review_id = '<some-review-id>';

-- Demonstrate a constraint (1:1 "owns" relationship)
-- This should FAIL if a driver already has a vehicle:
insert into vehicles (vehicle_number, vehicle_type, capacity, driver_id)
values ('KA-99-XX-1234', 'Sedan', 4, '<a-driver-id-that-already-has-a-vehicle>');
```

Also be ready to explain, in plain language, what each of the four CRUD operations corresponds to in the app UI (e.g., "this INSERT is what happens when a rider clicks 'Book Ride'") — this directly demonstrates the required store/retrieve/update/delete capability from the brief.

---

## 16. Appendix: Full SQL Schema (reference)

```sql
create table users (
  user_id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  number text
);

create table drivers (
  driver_id uuid primary key default gen_random_uuid(),
  driver_name text not null,
  phone_no text,
  license_no text,
  ratings numeric default 0
);

create table vehicles (
  vehicle_id uuid primary key default gen_random_uuid(),
  vehicle_number text not null,
  vehicle_type text,
  capacity int,
  driver_id uuid unique references drivers(driver_id) on delete restrict
);

create table locations (
  name text primary key,
  latitude double precision not null,
  longitude double precision not null
);

insert into locations (name, latitude, longitude) values
  ('MG Road', 12.9757, 77.6079),
  ('Whitefield', 12.9698, 77.7500),
  ('Koramangala', 12.9352, 77.6245),
  ('Airport', 13.1986, 77.7066),
  ('Electronic City', 12.8452, 77.6602),
  ('Indiranagar', 12.9719, 77.6412);

create table rides (
  ride_id uuid primary key default gen_random_uuid(),
  user_id uuid references users(user_id) on delete restrict,
  driver_id uuid references drivers(driver_id) on delete restrict,
  pickup_location text references locations(name) on delete restrict,
  dropoff_location text references locations(name) on delete restrict,
  ride_date date,
  fare numeric
);

create table payments (
  payment_id uuid primary key default gen_random_uuid(),
  ride_id uuid unique references rides(ride_id) on delete cascade,
  payment_mode text,
  amount numeric,
  payment_status text
);

create table reviews (
  review_id uuid primary key default gen_random_uuid(),
  user_id uuid references users(user_id) on delete restrict,
  comments text
);

-- =========================================================
-- Fare calculation: Haversine distance function + trigger
-- =========================================================

create or replace function haversine_km(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
) returns numeric as $$
declare
  r constant double precision := 6371; -- Earth's radius in km
  dlat double precision := radians(lat2 - lat1);
  dlon double precision := radians(lon2 - lon1);
  a double precision;
  c double precision;
begin
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  return round((r * c)::numeric, 2);
end;
$$ language plpgsql immutable;

create or replace function calculate_fare()
returns trigger as $$
declare
  base_fare constant numeric := 50;   -- live-edit target: base fare in ₹
  rate_per_km constant numeric := 12; -- live-edit target: per-km rate in ₹
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

  distance := haversine_km(pickup_lat, pickup_lon, drop_lat, drop_lon);
  new.fare := base_fare + (rate_per_km * distance);

  return new;
end;
$$ language plpgsql;

create trigger trg_calculate_fare
before insert or update of pickup_location, dropoff_location
on rides
for each row
execute function calculate_fare();

-- =========================================================
-- View: single joined read for the Admin/Demo screen
-- =========================================================

create or replace view ride_full_details as
select
  r.ride_id, r.pickup_location, r.dropoff_location, r.ride_date, r.fare,
  u.name as rider_name, u.email as rider_email,
  d.driver_name, d.phone_no as driver_phone,
  v.vehicle_number, v.vehicle_type,
  p.payment_mode, p.amount, p.payment_status
from rides r
join users u on r.user_id = u.user_id
left join drivers d on r.driver_id = d.driver_id
left join vehicles v on d.driver_id = v.driver_id
left join payments p on p.ride_id = r.ride_id;

-- =========================================================
-- Indexes: speed up the lookups the app does constantly
-- =========================================================

create index idx_rides_user_id on rides(user_id);
create index idx_rides_driver_id on rides(driver_id);
create index idx_payments_ride_id on payments(ride_id);
```

---

## 17. Stage-Wise Execution Plan (For AI Agent)

This section is written so an AI coding agent (Antigravity) can execute the build **one stage at a time**, in order, without skipping ahead. Each stage lists its objective, concrete tasks, deliverables, and an acceptance checkpoint — do not proceed to the next stage until the current stage's checkpoint passes. Each stage also includes a ready-to-paste **Agent prompt** — give these to Antigravity one at a time, in order, and confirm the checkpoint before moving to the next.

### Stage 0 — Project & Environment Setup
- **Objective:** Get a runnable Next.js project and a Supabase project ready to connect.
- **Tasks:**
  - Create a new Next.js (App Router, TypeScript) project.
  - Create a Supabase project; note the project URL and anon key.
  - Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see Section 14).
  - Install `@supabase/supabase-js`.
- **Deliverable:** `npm run dev` serves the default Next.js page locally.
- **Checkpoint:** Project runs with no errors; `.env.local` is gitignored.

> **Agent prompt (paste into Antigravity):**
> ```
> Create a new Next.js (App Router, TypeScript) project for this repo. Set up a Supabase project and add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (create .env.local.example too, without real values). Install @supabase/supabase-js. Confirm `npm run dev` serves the default page with no errors, and confirm .env.local is in .gitignore.
> ```

### Stage 1 — Database Schema
- **Objective:** Translate the ER diagram into live tables, plus the small DBMS logic layer (trigger, view, indexes).
- **Tasks:**
  - Run the full DDL from Section 16 (Appendix) in the Supabase SQL Editor: `locations` (with seed rows), `users`, `drivers`, `vehicles`, `rides`, `payments`, `reviews`.
  - Create `haversine_km()`, the `calculate_fare()` trigger function, and `trg_calculate_fare` on `rides`.
  - Create the `ride_full_details` view and the three indexes.
  - Insert seed/test data into `users`, `drivers`, `vehicles` (2–3 rows each) for later testing.
- **Deliverable:** All 7 tables (including `locations`), the trigger, the view, and the indexes all exist and are visible in Supabase.
- **Checkpoint:** Run the constraint-violation test from Section 15 (duplicate vehicle for one driver) and confirm it fails as expected. Manually insert a test row into `rides` with a known pickup/dropoff pair and confirm `fare` comes out auto-populated and correct. Confirm the explicit `ON DELETE` behavior (Section 5.4/FR14): deleting a `driver` with existing `rides` is rejected (RESTRICT), deleting a `ride` with a linked `payment` removes the payment too (CASCADE).

> **Agent prompt (paste into Antigravity):**
> ```
> Set up the Supabase Postgres schema for this project exactly as specified in RideShare_PRD.md, Section 16 (Appendix: Full SQL Schema). Create all 7 tables (locations, users, drivers, vehicles, rides, payments, reviews) with the exact PKs, FKs, UNIQUE constraints, and ON DELETE behavior shown there (RESTRICT everywhere except payments.ride_id which is CASCADE). Seed the locations table with the 6 rows given. Create the haversine_km function, the calculate_fare() trigger function, and the trg_calculate_fare trigger (BEFORE INSERT OR UPDATE of pickup_location/dropoff_location on rides). Create the ride_full_details view and the three indexes on rides.user_id, rides.driver_id, and payments.ride_id. Seed 2-3 sample users, drivers, and their vehicles (1:1) for testing. Run this as real SQL against the Supabase project, not just a .sql file. Then run the checkpoint tests from Section 1's Stage 1 checkpoint (duplicate-vehicle constraint failure, a test ride insert with correct auto-computed fare, and the ON DELETE behavior for drivers vs. rides/payments) and report the results.
> ```

### Stage 2 — Supabase Connection Layer
- **Objective:** Create a single, reusable server-side Supabase client.
- **Tasks:**
  - Add a `lib/supabaseClient.ts` (or similar) that initializes the Supabase client using the env vars.
  - Confirm the connection with a simple test query (e.g., count rows in `users`) from a temporary script or route.
- **Deliverable:** One shared client used by all API routes — no duplicated connection logic.
- **Checkpoint:** Test query returns real data from Stage 1's seed rows.

> **Agent prompt (paste into Antigravity):**
> ```
> Create lib/supabaseClient.ts (or equivalent) that initializes a single reusable server-side Supabase client from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Confirm the connection with a temporary test query (e.g., count rows in users) proving it returns the seed data from Stage 1, then remove the throwaway code. All API routes built in later stages should import this one shared client — no duplicated connection logic.
> ```

### Stage 3 — API Routes (Backend Layer)
- **Objective:** Build the backend surface listed in Section 5.5.
- **Tasks:**
  - Implement `GET`/`POST` for `/api/users`, `/api/drivers`, `/api/vehicles`, `/api/payments`, `/api/reviews`.
  - Implement `POST /api/rides` as plain sequential code (Section 5.5/FR3): query a random driver → insert the ride → insert a linked pending payment. Reject pickup = dropoff with a 400. No stored procedure.
  - Implement `GET`/`PATCH`/**`DELETE`** for `/api/rides/[id]`. PATCH accepts only pickup/dropoff/date (never fare directly); if the linked payment is `completed`, both PATCH and DELETE return 400 (FR6c). If pickup/dropoff changes while payment is still `pending`, also update `payments.amount` to match the recomputed fare in the same request.
  - Implement `PATCH /api/payments/[id]` to set `payment_status = 'completed'`.
  - Add basic input validation (required fields) with clear error responses (400 + message) — this is a deliberate live-edit target (see Section 10.2, 10.4) and feeds directly into the in-app feedback messages required by FR15/FR15a (Section 5.8).
- **Deliverable:** All routes testable independently (e.g., via curl/Postman/browser) before any frontend exists.
- **Checkpoint:** Each route performs its CRUD operation correctly against the real DB, **including a successful update and a successful delete**; `POST /api/rides` returns a ride with a non-null trigger-computed fare and a linked pending payment; invalid input (including pickup = dropoff) returns a 400, not a crash; **booking a ride with zero rows in `drivers` returns a clean 400 ("No drivers available") instead of crashing or inserting a null**; editing a ride's route resyncs `payments.amount`; editing/deleting a ride with a `completed` payment is rejected.

> **Agent prompt (paste into Antigravity):**
> ```
> Build the Next.js API routes exactly as listed in RideShare_PRD.md Section 5.5, using the shared Supabase client from Stage 2: GET/POST for /api/users, /api/drivers, /api/vehicles, /api/payments, /api/reviews. POST /api/rides as plain sequential code — query a random row from drivers, insert the ride (trigger auto-computes fare), insert a linked pending payment — returning a clean 400 ("No drivers available") if no drivers exist (FR3a), and rejecting pickup === dropoff with a 400 ("Pickup and dropoff can't be the same"). GET/PATCH/DELETE for /api/rides/[id]: PATCH accepts only pickup/dropoff/date (never fare directly) and, if the linked payment is still pending, also updates payments.amount to match the recomputed fare in the same request; both PATCH and DELETE return 400 ("This ride can't be edited/cancelled after payment") once the linked payment is completed (FR6c). PATCH /api/payments/[id] sets payment_status to completed. POST /api/vehicles returns 400 with a clear message if the driver already has a vehicle (UNIQUE constraint, FR13). Add required-field validation with clear 400 + message responses on every route, matching the example messages in Section 5.8's table — these messages get surfaced directly in the frontend's toast/banner in Stage 5/6. Test each route independently (curl/Postman) against the real DB before any frontend exists, and report the results against this stage's checkpoint list.
> ```

### Stage 4 — Auth
- **Objective:** Minimal working login/signup.
- **Tasks:**
  - Wire up Supabase Auth (email/password) for sign up and log in.
  - Store/read the logged-in user's `user_id` for use in ride booking and history.
- **Deliverable:** A user can sign up, log in, log out.
- **Checkpoint:** Logged-in state persists across a page refresh.

> **Agent prompt (paste into Antigravity):**
> ```
> Wire up Supabase Auth (email/password) for sign up and log in, with success/error toasts per FR15 (e.g. "Account created — you're logged in.", "Incorrect email or password."). Store/read the logged-in user's user_id client-side so it can be used for ride booking and history lookups in later stages. Confirm a user can sign up, log in, log out, and that the logged-in state survives a page refresh.
> ```

### Stage 5 — Frontend Pages
- **Objective:** Build the 4 core rider-facing screens from Section 7, using Stitch for the visual design layer.
- **Tasks:**
  - **Connect Stitch MCP first, timeboxed to ~20-30 min:** generate a Stitch API key (Stitch settings → API key), add the Stitch MCP server in Antigravity's Agent Manager, and have Antigravity generate the 5 screens' design from Section 7's descriptions. If the connection fails or output isn't usable within the timebox, drop it and go straight to building the screens directly with plain Tailwind — do not let this block the rest of the stage.
  - Login/Signup page.
  - Dashboard (calls `GET /api/rides` filtered by the logged-in user).
  - Book a Ride form (calls `POST /api/rides`).
  - Ride Detail page (fare/payment via `POST /api/payments`, review via `POST /api/reviews`), **plus an Edit form (`PATCH /api/rides/[id]`) and a Delete/Cancel button (`DELETE /api/rides/[id]`)**.
  - A shared toast/banner component wired into every API call across these 4 screens per FR15/Section 5.8, showing the success/error messages from that section's table.
- **Deliverable:** Functional requirements FR1–FR7 including FR6a/FR6b (Section 5.1) all work end-to-end through the UI — full Create/Retrieve/Update/Delete on rides, driven entirely by clicking through the app.
- **Checkpoint:** Full manual click-through from Section 10.3 passes with no errors, **including editing and deleting a ride from the UI, and confirming Edit/Delete become disabled after Pay Now is used**; every action in the click-through produces a visible success or error message (FR15).

> **Agent prompt (paste into Antigravity):**
> ```
> First, generate the visual design for the 5 screens using Stitch (MCP already connected) — follow RideShare_PRD.md Section 7a exactly: use the 5 per-screen prompts given there, one generation pass per screen, staying inside the ~20-30 minute timebox. Pull back the layout/style direction and translate it into real Next.js/Tailwind components — don't embed Stitch's raw export as-is.
>
> Then build the 4 rider-facing screens from RideShare_PRD.md Section 7 against that design (or plain Tailwind if Stitch was skipped): Login/Signup, Dashboard (GET /api/rides filtered by the logged-in user), Book a Ride (pickup/dropoff dropdowns sourced from locations, a date field, POST /api/rides — fare is never shown as an input, only after booking), and Ride Detail (fare/payment status/mode/review, a Pay Now button calling PATCH /api/payments/[id], an Edit form for pickup/dropoff/date only calling PATCH /api/rides/[id], and a Delete/Cancel button calling DELETE /api/rides/[id]). Edit and Delete must be disabled in the UI once payment_status is completed (FR6c). Add a single shared toast/banner component and wire it into every API call on these screens, showing the success/error messages from Section 5.8's table (FR15/FR15a) — surface the actual message from the API's error response rather than a generic failure message wherever the route provides one. Run the full manual click-through from Section 10.3 and confirm it passes with no errors, including the edit/delete/disabled-after-payment checks and that every action shows visible feedback.
> ```

### Stage 6 — Admin/Demo View (optional but recommended)
- **Objective:** One screen that lists all 6 tables, for live evaluation demonstration, plus lets you add drivers/vehicles from the UI, and updates itself live as data changes (FR11b).
- **Tasks:**
  - Build a simple page that calls `GET` on each of the 6 API routes and renders each as a table, styled consistently with the Stitch design (or plain Tailwind) from Stage 5.
  - Add a simple "Add Driver" form (`POST /api/drivers`) and "Add Vehicle" form (`POST /api/vehicles`, linked to a driver) — each shows a success/error toast per FR15 (e.g. surfacing the "driver already has a vehicle" UNIQUE-constraint error).
  - Enable Realtime on all 6 tables in the Supabase dashboard (Database → Replication), then subscribe to `postgres_changes` (INSERT/UPDATE/DELETE) for each table from this page using `@supabase/supabase-js`'s client-side realtime client; on any event, merge the change into local state instead of refetching the whole table.
- **Deliverable:** A single page where every table's current data is visible at a glance, updates itself without a refresh, and new drivers/vehicles can be inserted without touching SQL.
- **Checkpoint:** Data shown here matches what's in the Supabase Table Editor exactly; a newly added driver/vehicle appears immediately after submission; **booking a ride from a second, separate browser tab makes it appear on this screen within a second or two, with no refresh anywhere.**

> **Agent prompt (paste into Antigravity):**
> ```
> Build the Admin/Demo view from RideShare_PRD.md Section 5.3 (FR11, FR11a, FR11b). List all 6 tables via GET on their respective API routes, include "Add Driver" and "Add Vehicle" forms (POST /api/drivers, POST /api/vehicles) with success/error toasts per FR15 (e.g. surfacing "This driver already has a vehicle" when the UNIQUE constraint fires), and add Supabase Realtime auto-refresh: enable Realtime replication on all 6 tables in the Supabase dashboard (Database → Replication), then subscribe to postgres_changes (INSERT/UPDATE/DELETE) for each table from this page using @supabase/supabase-js's client-side realtime client, merging incoming changes into local state rather than refetching the whole table. Confirm data here matches the Supabase Table Editor exactly, a new driver/vehicle appears immediately after submission with a confirmation toast, and booking a ride from a second browser tab makes it appear here within a second or two with no refresh anywhere.
> ```

### Stage 7 — Testing Pass
- **Objective:** Run the full testing plan from Section 10 before deployment.
- **Tasks:**
  - Schema-level tests (10.1), API-level tests (10.2), flow-level tests (10.3).
- **Deliverable:** A short written note of what was tested and the result of each.
- **Checkpoint:** No failing tests; any known issues are explicitly logged, not silently left broken.

> **Agent prompt (paste into Antigravity):**
> ```
> Run through the full testing plan in RideShare_PRD.md Section 10: 10.1 schema-level tests, 10.2 API-level tests, 10.3 flow-level tests (including the two-tab Realtime check), and 10.4 live-edit rehearsal. Report which pass and which fail, with a short written note per test, and fix any failures before moving on. Do not leave a known issue silently unfixed — log it explicitly if it's deliberately deferred.
> ```

### Stage 8 — Deployment
- **Objective:** Get a public, working URL.
- **Tasks:**
  - Push the project to GitHub.
  - Deploy to Vercel; add the env vars from Section 14 in Vercel's dashboard.
  - Re-run the Stage 5 click-through against the deployed URL, not just localhost.
- **Deliverable:** A public Vercel URL that fully works.
- **Checkpoint:** Booking a ride, seeing payment, and leaving a review all work on the live deployed link.

> **Agent prompt (paste into Antigravity):**
> ```
> Push the project to GitHub. Deploy it to Vercel and add all env vars from RideShare_PRD.md Section 14 to Vercel's Project Settings → Environment Variables. Re-run the Stage 5 click-through and the Stage 6 Realtime two-tab check against the deployed Vercel URL, not just localhost, and confirm booking a ride, seeing the payment, and leaving a review all work in production.
> ```

### Stage 9 — Live-Edit & Evaluation Rehearsal
- **Objective:** Prepare for on-the-spot changes and questions.
- **Tasks:**
  - Rehearse the live-edit exercises from Section 10.4 (one DB change, one API change, one frontend change).
  - Rehearse the SQL instructions from Section 15 in the Supabase SQL Editor.
  - Walk through the Evaluation-Day Cheat Sheet (Section 13) once, out loud, end to end.
- **Deliverable:** Confidence that any single reasonable request (DB, backend, or frontend) can be handled live in under 5 minutes.
- **Checkpoint:** A full dry run of the demonstration, timed, with no unrehearsed surprises.

> **Agent prompt (paste into Antigravity):**
> ```
> Help me rehearse for evaluation day per RideShare_PRD.md Section 10.4 and Section 13. Walk through one DB-layer live-edit change (e.g. adding a rides.status column), one API-layer change, and one frontend-only change, each end-to-end with hot reload, no restart. Then walk through the live SQL instructions in Section 15 directly in the Supabase SQL Editor. Then run a full timed dry run of the demo flow described in Section 13: deployed app open in one tab as the Admin/Demo view, the same deployed app open in a second tab/device as a rider — book a ride there and confirm it appears live in the first tab with no refresh. Flag anything that didn't go smoothly.
> ```

---

## 18. Known Limitations, Security Trade-offs & Future Scope

Honest documentation of what this project deliberately doesn't handle — worth including in your written report, since naming a limitation you're aware of reads very differently from an evaluator discovering one you weren't.

### Security trade-offs (accepted, not oversights)
- **No Row Level Security (RLS).** Supabase's anon key ships inside the frontend bundle — technically, anyone could extract it and query tables directly via Supabase's REST layer, bypassing the Next.js API routes entirely. The Admin/Demo view's Realtime subscriptions (FR11b) use this same anon key and inherit the same exposure — one more reason Realtime is scoped only to the Admin/Demo view, not the rider-facing pages. Acceptable for a graded academic demo with no real user data at stake; not acceptable for a real deployment.
- **No server-side session check on `GET /api/rides?user_id=...`.** Anyone could pass a different `user_id` and read another rider's history. Same category as above.
- **Auth is email/password only** — no email verification, no password reset flow, no rate limiting on login attempts.

### Functional/data-modeling limitations
- **Reviews aren't linked to a specific Ride or Driver** — this matches your original hand-drawn ER diagram exactly (Review only relates to Users), but means `drivers.ratings` is static seed data, never actually computed from real reviews. A ride-sharing app would normally review a specific ride/driver.
- **Fare uses straight-line (Haversine) distance, not real road distance** — a genuine formula, but not what a real fare would be, since roads aren't straight lines.
- **Driver assignment is random**, not based on actual availability, location proximity, or whether they're already on another ride — there's no concept of a driver being "busy."
- **No ride status lifecycle** (e.g. requested → ongoing → completed → cancelled) — a ride's existence plus its payment status is the only state currently tracked.

### Scalability
This is explicitly scoped for classroom/demo scale, not production:
- Supabase's free tier pauses on inactivity and caps storage/rows/concurrent connections — irrelevant at demo scale, a real constraint beyond it.
- List endpoints (`GET /api/rides`, etc.) return all matching rows with no pagination — fine for a handful of demo rides, would need pagination at real volume.
- No caching layer, no rate limiting, no background job queue for things like payment processing or notifications.
- `@supabase/supabase-js` talks to Supabase over HTTPS rather than opening raw Postgres connections, which avoids the classic "serverless functions exhaust the DB connection limit" problem you'd risk on Vercel with a direct `pg` client — worth knowing why that choice matters, not just that it was made.

### Future scope (natural next steps, not part of this build)
- Link Reviews to a specific Ride/Driver, and derive `drivers.ratings` from real review averages via a trigger.
- Integrate a real routing API for road-distance-based fare, once live network dependency during evaluation isn't a constraint.
- Enable RLS policies and server-side session validation to close the accepted security trade-offs above.
- Add a proper ride status lifecycle instead of the current implicit model.
- Real payment gateway integration.
- Driver-side app with live location and genuine availability-based matching (the single biggest gap between this project and a real ride-sharing platform).
- Pagination, caching, and a background job queue if this ever needed to scale beyond a classroom demo.

---

## 19. Team & Report Notes

This is a **team submission** — one hard-copy project report per team, per the CIA 3 brief.

**Suggested role split for the live demo** (adjust to your actual team):
- One member drives the **DB/SQL side** — schema walkthrough, live SQL from Section 15, explaining cardinalities/constraints.
- One member drives the **backend/API side** — walking through API routes, handling a live code-change request there.
- One member drives the **frontend/UI side** — click-through demo, handling a live UI change request.

Even with a split, every teammate should be able to explain the whole flow end-to-end (schema → API → UI) at a basic level, in case the evaluator asks a specific person a question outside their "assigned" area.

**Report drafting:** the written report (hard copy, one per team) is a separate deliverable from this PRD. Once the app is built, I can draft the report — reusing this PRD's ER diagram summary, schema, screens, and testing sections — as a formatted document (e.g., Word/.docx) ready for printing. Just ask when you're at that stage.

---

*End of document. Ready for review — say "approve" to receive the step-by-step Antigravity prompts, one per stage above, to build this.*
