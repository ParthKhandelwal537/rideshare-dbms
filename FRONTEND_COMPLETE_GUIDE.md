# RideShare — Complete Frontend Guide
> **For evaluation, viva, and on-spot live edits.**
> Server: **http://localhost:3000** | Every `.tsx` save auto-updates in under 1 second (Turbopack HMR).

---

## How to Read This Guide

Every edit entry follows this format:

```
WHAT:   What you are changing
WHERE:  Which UI component / section you see on screen
FILE:   Which file to open in your editor
LINES:  Which line numbers to find
DO:     Exactly what to change
```

---

## Table of Contents
1. [Project Structure — File Map](#1-project-structure--file-map)
2. [How the App Loads — Root Layout](#2-how-the-app-loads)
3. [Navigation Bar](#3-navigation-bar)
4. [Front Page / Landing](#4-front-page--landing)
5. [Book a Ride Page](#5-book-a-ride-page)
6. [User Dashboard](#6-user-dashboard)
7. [Ride Detail Page](#7-ride-detail-page)
8. [Admin / Live DB Inspector](#8-admin--live-db-inspector)
9. [Login / Profile Picker](#9-login--profile-picker)
10. [Fare Engine](#10-fare-engine)
11. [Global State](#11-global-state)
12. [Styling System](#12-styling-system)
13. [LIVE-EDIT CHEAT SHEET](#13-live-edit-cheat-sheet)
14. [Demo Profiles Reference](#14-demo-profiles-reference)
15. [All Locations Reference](#15-all-locations-reference)
16. [Keyboard Shortcuts](#16-keyboard-shortcuts)
17. [Quick Reference Table](#17-quick-reference-table)

---

## 1. Project Structure — File Map

```
app/
├── layout.tsx               ← Root layout: Navbar + Providers (wraps ALL pages)
├── globals.css              ← Global dark theme, Tailwind base styles
├── page.tsx                 ← HOME PAGE (/)
├── book/
│   └── page.tsx             ← BOOK A RIDE PAGE (/book)
├── dashboard/
│   └── page.tsx             ← USER DASHBOARD (/dashboard)
├── rides/
│   └── [id]/
│       └── page.tsx         ← RIDE DETAIL PAGE (/rides/:id)
├── admin/
│   └── page.tsx             ← ADMIN / LIVE DB INSPECTOR (/admin)
├── login/
│   └── page.tsx             ← LOGIN / PROFILE PICKER (/login)
└── api/                     ← Backend API routes (NOT frontend, don't touch for UI)

components/
├── Navbar.tsx               ← Top navigation bar (shown on EVERY page)
└── ToastContainer.tsx       ← Slide-in popup notifications

context/
├── AuthContext.tsx           ← Who is logged in (global state)
└── ToastContext.tsx          ← Notification system (global state)

lib/
├── fare.ts                  ← ALL fare math: distance, pricing, discounts
├── supabaseClient.ts        ← Supabase DB connection
├── types.ts                 ← TypeScript type definitions
└── idHelper.ts              ← UUID shortening for display
```

---

## 2. How the App Loads

**File:** `app/layout.tsx`

This file wraps every single page. It loads the Navbar, global providers, and sets the browser tab title and body background. You rarely need to edit this unless changing the title or global colors.

| What it sets | Value |
|---|---|
| Browser tab title | "RideShare — Urban Mobility & Ride Pooling" |
| Body background | `bg-slate-950` (very dark near-black) |
| Body text color | `text-slate-100` (off-white) |
| Global providers | AuthProvider, ToastProvider |
| Components on every page | `<Navbar />`, `<ToastContainer />` |

---

## 3. Navigation Bar

**UI Location:** Top bar visible on EVERY page  
**File:** `components/Navbar.tsx`

### What it shows:

| Element on screen | Location in file | Description |
|---|---|---|
| Logo + "RideShare" text | Lines 30–38 | Blue car icon + brand name + subtitle |
| Nav links (Home, Book, Admin...) | Lines 18–23 | `navItems` array |
| Active page highlight | Line 49–53 | Blue if current page matches href |
| Logged-in user pill (right side) | Lines 61–91 | Shows name, switch/logout buttons |

---

## 4. Front Page / Landing

**File:** `app/page.tsx`  
**URL:** `http://localhost:3000/`  
**Total Lines:** 437

This has 5 visible sections on screen. Here is the full breakdown:

---

### Section A — Hero Card (Lines 80–166)
**UI Location:** The big dark glowing card at the very top of the home page

| Element visible | Lines | Description |
|---|---|---|
| Top sparkle badge | 88–91 | Small pill with "Next-Gen Urban Transit..." text |
| Main H1 headline | 94–100 | "Smarter Commutes. Lower Fares. Shared Routes." |
| Subtitle paragraph | 103–105 | Platform description text |
| "Get Started" button | 118–125 | Primary blue button → /login |
| "Book a Ride" button | 127–133 | Secondary button → /book |
| "Inspect Database" button | 135–141 | Small dark button → /admin |
| Quick-login pills | 145–164 | 3 demo user buttons (Parth, Sneha, Aarav) |

---

### Section B — Fare Estimator (Lines 168–288)
**UI Location:** Second section — dark card with two dropdowns and 3 output cards

| Element visible | Lines | Description |
|---|---|---|
| Section badge "Corridor Estimator" | 172–175 | Small label above heading |
| Section H2 heading | 176–178 | "Test Real-Time Distance & Pooling Discounts" |
| Section subtext | 179–181 | Description of what the estimator does |
| Pickup dropdown | 191–201 | Location selector |
| Dropoff dropdown | 209–219 | Location selector |
| Distance result card | 226–238 | Shows km distance (Haversine calculation) |
| Private fare result card | 241–254 | Shows solo fare in Rs. |
| Pooled fare result card | 256–274 | Shows shared fare + savings badge |
| "Book This Corridor Trip" button | 279–285 | Links to /book with route pre-filled |

---

### Section C — Architecture Pillars (Lines 290–374)
**UI Location:** Third section — 2x2 grid of dark feature cards

| Card | Lines | Title | Icon Color |
|---|---|---|---|
| Pillar 1 | 306–321 | Smart Corridor Geometry Matching | Blue |
| Pillar 2 | 323–338 | First-Come, First-Served Seating | Indigo |
| Pillar 3 | 340–355 | Independent Cancellation Isolation | Emerald |
| Pillar 4 | 357–372 | Dynamic Pooling & Automated Refunds | Purple |

---

### Section D — Corridors Grid (Lines 376–423)
**UI Location:** Fourth section — 4-column grid of route cards

| Card | Route | Tag |
|---|---|---|
| Card 1 | MG Road → Airport | Airport Express |
| Card 2 | Koramangala → Indiranagar | City Commute |
| Card 3 | Indiranagar → Whitefield | Tech Artery |
| Card 4 | Whitefield → Electronic City | ORR Corridor |

---

### Section E — Footer (Lines 425–433)
**UI Location:** Bottom of home page — small centered text

---

## 5. Book a Ride Page

**File:** `app/book/page.tsx`  
**URL:** `http://localhost:3000/book`

### Form Controls (all visible on this one page):

| UI Control | Lines | What it does |
|---|---|---|
| "Book Now" / "Schedule for Later" toggle | 186–234 | Timing selection |
| "Private Ride" / "Shared Cab" toggle | 236–282 | Trip mode selection |
| Vehicle category cards (5 cards) | 284–345 | Hatchback / Sedan / SUV / XL MUV / Any |
| Seating capacity pills | 347–384 | 4 / 6 / 7 / Any seats |
| Passenger count buttons | 386–435 | 1–N number buttons |
| Pickup dropdown | ~437–460 | Location selector |
| Dropoff dropdown | ~461–480 | Location selector |
| Date picker | shown when "Schedule for Later" | Calendar input |
| Time picker | shown when "Schedule for Later" | Time input |
| Price breakdown card | ~490–540 | Live fare calculation display |
| "Confirm & Book Ride" button | ~560–580 | Submit form button |

---

## 6. User Dashboard

**File:** `app/dashboard/page.tsx`  
**URL:** `http://localhost:3000/dashboard`

### What's visible on screen:

| UI Section | Description |
|---|---|
| Stats row (top) | Total Rides, Total Spent, Pending Rides, Completed |
| Pending Pool Invites section | Accept / Decline invite cards from other users |
| Active Rides list | All your booked rides as cards |
| Each ride card | Route, date, type badge, status, fare, driver, co-riders, Cancel/View buttons |
| Account Danger Zone (bottom) | Delete account button |

---

## 7. Ride Detail Page

**File:** `app/rides/[id]/page.tsx`  
**URL:** `http://localhost:3000/rides/:rideId`

| UI Section | What it shows |
|---|---|
| Ride info card | Route, date, time, fare, vehicle type |
| Driver card | Driver name, phone, license |
| Vehicle card | Type, number plate, capacity |
| Co-riders list | Other passengers in this pool |
| Corridor match card | Detour ratio, match type |
| Cancel button | Cancel only your booking |
| Live dot badge | "Live" indicator via Supabase Realtime |

---

## 8. Admin / Live DB Inspector

**File:** `app/admin/page.tsx`  
**URL:** `http://localhost:3000/admin`

| Tab | What it shows |
|---|---|
| Live Overview | All rides with full joined data |
| Users | All rows in users table |
| Drivers | All drivers + Add Driver form |
| Vehicles | All vehicles + Add Vehicle form |
| Rides | Raw rides table |
| Payments | payments table |
| Reviews | reviews table with star ratings |

---

## 9. Login / Profile Picker

**File:** `app/login/page.tsx`  
**URL:** `http://localhost:3000/login`

Shows 3 demo user cards. Clicking one logs in instantly and goes to `/dashboard`.

---

## 10. Fare Engine

**File:** `lib/fare.ts`

### Key constants:
```ts
// Line 11:
export const BASE_FARE = 50;      // Base fare in Rs. (added to every trip)

// Line 12:
export const RATE_PER_KM = 12;    // Per-km rate in Rs.

// Formula applied:
fare = BASE_FARE + (RATE_PER_KM × distanceKm)
```

### Vehicle pricing (lines 48–53):
```ts
Hatchback: { baseFare: 50,  ratePerKm: 12 }
Sedan:     { baseFare: 65,  ratePerKm: 15 }
SUV:       { baseFare: 85,  ratePerKm: 19 }
XL MUV:    { baseFare: 110, ratePerKm: 23 }
```

### Pooling discounts (lines 162–164):
```ts
2 riders → 30% off
3 riders → 45% off
4+ riders → 55% off
```

### Corridor matching rule (lines 235, 254, 273):
```ts
Maximum detour ratio: 1.25 (= 25% extra distance allowed)
```

---

## 11. Global State

| File | Purpose | Key values |
|---|---|---|
| `context/AuthContext.tsx` | Who is logged in | `currentUser`, `setCurrentUser`, `logout` |
| `context/ToastContext.tsx` | Notifications | `showToast(message, 'success'/'error'/'info')` |

---

## 12. Styling System

- **Framework:** TailwindCSS v4 (dark forced)
- **Background:** `bg-slate-950`
- **Cards:** `bg-slate-900/70` with `border-slate-800/80`
- **Primary:** `from-blue-600 to-indigo-600`
- **Success/Pool:** `emerald-500`
- **Danger:** `red-600`

---

## 13. LIVE-EDIT CHEAT SHEET

> ⚡ All changes reflect in **under 1 second** after `Ctrl+S`.
> Format for each edit: **WHAT → WHERE on screen → FILE → LINES → CODE**

---

### EDIT 1 — Change the Main Homepage Headline

```
WHAT:   The big H1 text at the top of the homepage
WHERE:  Home Page (/), Section A — Hero Card, center of the card
FILE:   app/page.tsx
LINES:  94–100
```
```tsx
// FIND:
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
  Smarter Commutes.{' '}
  <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
    Lower Fares.
  </span>{' '}
  Shared Routes.
</h1>

// CHANGE the 3 text phrases to anything you want, e.g.:
  Bangalore's Smartest Ride.{' '}
  <span ...>Lower Costs.</span>{' '}
  Pooled Routes.
```

---

### EDIT 2 — Change the Top Pill Badge Text

```
WHAT:   The small sparkle pill badge above the headline
WHERE:  Home Page (/), Section A — Hero Card, very top of the card
FILE:   app/page.tsx
LINES:  88–91
```
```tsx
// FIND:
<span>Next-Gen Urban Transit &bull; Real-Time Corridor Pooling</span>

// CHANGE to:
<span>Bangalore's #1 Cab Pool Platform</span>
```

---

### EDIT 3 — Change the Subtitle/Description Paragraph

```
WHAT:   The paragraph under the headline
WHERE:  Home Page (/), Section A — Hero Card, below the headline
FILE:   app/page.tsx
LINES:  103–105
```
```tsx
// FIND:
<p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
  The multi-user ride sharing platform engineered for Bangalore...
</p>

// CHANGE the text between the <p> tags to anything
```

---

### EDIT 4 — Change the "Get Started" Button Text

```
WHAT:   The primary blue CTA button
WHERE:  Home Page (/), Section A — Hero Card, action buttons row
FILE:   app/page.tsx
LINES:  118–125 (the <Link> block inside the else branch)
```
```tsx
// FIND:
<span>Get Started / Sign In</span>

// CHANGE to:
<span>Login Now</span>
// or: <span>Start Riding</span>
```

---

### EDIT 5 — Change the "Book a Ride" Button Text

```
WHAT:   The secondary button next to "Get Started"
WHERE:  Home Page (/), Section A — Hero Card, action buttons row
FILE:   app/page.tsx
LINES:  127–133
```
```tsx
// FIND:
<span>Book a Ride</span>

// CHANGE to:
<span>Book Your Cab Now</span>
```

---

### EDIT 6 — Add a Promo/Discount Banner

```
WHAT:   A new announcement banner (doesn't exist yet — you ADD it)
WHERE:  Home Page (/), Section A — Hero Card, above or below the top badge
FILE:   app/page.tsx
LINES:  Add after line 91 (inside the hero <section>, inside the center <div>)
```
```tsx
// ADD this block after the existing pill badge (line 91):
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
  <span>🎉 Student Discount: 20% off on all campus routes!</span>
</div>
```

---

### EDIT 7 — Add a New Button in the Hero

```
WHAT:   A new CTA button (doesn't exist yet — you ADD it)
WHERE:  Home Page (/), Section A — Hero Card, action buttons row
FILE:   app/page.tsx
LINES:  Add after line 141 (still inside the flex buttons <div>)
```
```tsx
// ADD this after the "Inspect Database" Link block:
<Link
  href="/help"
  className="px-6 py-3.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm flex items-center gap-2 transition-all"
>
  <span>Help / FAQ</span>
</Link>
```

---

### EDIT 8 — Change the Estimator Section Heading

```
WHAT:   The H2 heading inside the fare estimator section
WHERE:  Home Page (/), Section B — Fare Estimator Card, at the top of that card
FILE:   app/page.tsx
LINES:  176–178
```
```tsx
// FIND:
<h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
  Test Real-Time Distance &amp; Pooling Discounts
</h2>

// CHANGE to:
<h2 ...>Live Fare Calculator for Bangalore Routes</h2>
```

---

### EDIT 9 — Change the Estimator Small Label Badge

```
WHAT:   The tiny uppercase label above the estimator heading
WHERE:  Home Page (/), Section B — Fare Estimator Card, very top of card
FILE:   app/page.tsx
LINES:  172–175
```
```tsx
// FIND:
<span>Bangalore Transit Corridor Estimator</span>

// CHANGE to:
<span>Real-Time Fare Preview</span>
```

---

### EDIT 10 — Change Base Fare and Per-KM Rate (affects Estimator + Book Page)

```
WHAT:   The fare formula used in all calculations
WHERE:  Home Page Section B (estimator cards) AND Book Page (price breakdown)
FILE:   lib/fare.ts
LINES:  11–12
```
```ts
// FIND:
export const BASE_FARE = 50;
export const RATE_PER_KM = 12;

// CHANGE to any values, e.g.:
export const BASE_FARE = 75;
export const RATE_PER_KM = 15;

// Both the homepage estimator and the book page update instantly on save.
```

---

### EDIT 11 — Change Pooling Discount Percentages (affects Estimator + Book Page)

```
WHAT:   The % discount applied to shared rides
WHERE:  Home Page Section B (pooled fare card) AND Book Page (price breakdown)
FILE:   lib/fare.ts
LINES:  162–164
```
```ts
// FIND:
let discount = 0.30;
if (totalRiders === 3) discount = 0.45;
if (totalRiders >= 4)  discount = 0.55;

// CHANGE to, e.g.:
let discount = 0.40;              // 2 riders = 40% off
if (totalRiders === 3) discount = 0.50;
if (totalRiders >= 4)  discount = 0.60;
```

---

### EDIT 12 — Change Vehicle Rates in Booking Form

```
WHAT:   The per-km rates shown on each vehicle card
WHERE:  Book Page (/book), Vehicle Category section — the 5 vehicle cards
FILE:   lib/fare.ts  (actual math) + app/book/page.tsx (display text)
LINES:  lib/fare.ts lines 48–53 for math; app/book/page.tsx lines 294–299 for display
```
```ts
// In lib/fare.ts (lines 48–53) — actual calculation:
Sedan: { baseFare: 65, ratePerKm: 15, ... }
SUV:   { baseFare: 85, ratePerKm: 19, ... }
```
```tsx
// In app/book/page.tsx (lines 294–299) — display text on each card:
{ id: 'Sedan', rate: '₹15/km', ... }
// Change the rate string to match what you changed in fare.ts
```

---

### EDIT 13 — Add a New Pillar Card (Architecture Section)

```
WHAT:   A 5th feature card added to the 4-pillar grid
WHERE:  Home Page (/), Section C — Architecture Pillars, the 2x2 grid
FILE:   app/page.tsx
LINES:  Copy one card block (e.g. lines 306–321) and paste after line 372 (before </div>)
```
```tsx
// COPY one pillar card block and change:
<div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-rose-500/40 transition-all space-y-3">
  <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
    <Zap className="w-5 h-5" />
  </div>
  <h3 className="text-base font-bold text-white tracking-tight">
    5. Real-Time Driver Dispatch
  </h3>
  <p className="text-xs text-slate-300 leading-relaxed">
    Nearest available driver is auto-assigned immediately after booking confirmation.
  </p>
  <div className="pt-2 text-[11px] font-mono text-rose-300 flex items-center gap-1.5">
    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    <span>GPS-based proximity matching • Live status updates</span>
  </div>
</div>
```

---

### EDIT 14 — Change a Pillar Card's Title and Description

```
WHAT:   The title and body text of any of the 4 feature cards
WHERE:  Home Page (/), Section C — Architecture Pillars
FILE:   app/page.tsx
LINES:  Pillar 1: 312 (title), 315 (description)
        Pillar 2: 329 (title), 332 (description)
        Pillar 3: 346 (title), 349 (description)
        Pillar 4: 363 (title), 366 (description)
```
```tsx
// FIND the pillar you want — e.g. Pillar 1 title at line 312:
<h3 className="text-base font-bold text-white tracking-tight">
  1. Smart Corridor Geometry Matching
</h3>

// CHANGE the text inside <h3>...</h3>
// Then find the <p> below it and change the description too
```

---

### EDIT 15 — Change the Architecture Section Heading

```
WHAT:   The H2 heading above the 4 pillar cards
WHERE:  Home Page (/), Section C — Architecture Pillars, above the grid
FILE:   app/page.tsx
LINES:  297–299
```
```tsx
// FIND:
<h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
  Engineered Multi-User Architecture
</h2>

// CHANGE to:
<h2 ...>Core DBMS Features & System Design</h2>
```

---

### EDIT 16 — Add a New Corridor Route Card

```
WHAT:   A new clickable route card in the corridor grid
WHERE:  Home Page (/), Section D — Bangalore Corridors Grid
FILE:   app/page.tsx
LINES:  Add a new object in the array starting at line 397
```
```tsx
// FIND the array starting at line 397:
{[
  { from: 'MG Road', to: 'Airport', dist: '33.1 km', time: '45-60 min', tag: 'Airport Express' },
  { from: 'Koramangala', to: 'Indiranagar', dist: '6.4 km', time: '20-25 min', tag: 'City Commute' },
  { from: 'Indiranagar', to: 'Whitefield', dist: '13.7 km', time: '35-45 min', tag: 'Tech Artery' },
  { from: 'Whitefield', to: 'Electronic City', dist: '24.7 km', time: '50-65 min', tag: 'ORR Corridor' },
  // ADD NEW ROUTE HERE:
  { from: 'Koramangala', to: 'Electronic City', dist: '10.2 km', time: '30-40 min', tag: 'South Loop' },
].map(...)}
```

---

### EDIT 17 — Change a Corridor Route Tag or Details

```
WHAT:   The tag label ("Airport Express", "City Commute" etc.) on a corridor card
WHERE:  Home Page (/), Section D — Bangalore Corridors Grid
FILE:   app/page.tsx
LINES:  398–401 (the array objects)
```
```tsx
// FIND at line 398:
{ from: 'MG Road', to: 'Airport', dist: '33.1 km', time: '45-60 min', tag: 'Airport Express' },

// CHANGE tag, dist, or time:
{ from: 'MG Road', to: 'Airport', dist: '33.1 km', time: '40-55 min', tag: '✈️ VIP Airport Shuttle' },
```

---

### EDIT 18 — Remove/Hide a Homepage Section

```
WHAT:   Completely hiding a full section from the home page
WHERE:  Home Page (/) — any of the 5 main sections
FILE:   app/page.tsx
LINES:  See table below — wrap the <section>...</section> in {/* ... */}
```

| Section to hide | Start line | End line |
|---|---|---|
| Hero Card | 81 | 166 |
| Fare Estimator | 169 | 288 |
| Architecture Pillars | 291 | 374 |
| Corridors Grid | 377 | 423 |
| Footer | 425 | 433 |

```tsx
// Example — hide the estimator:
{/*
<section className="bg-slate-900/70 ...">
  ... all estimator content ...
</section>
*/}
```

---

### EDIT 19 — Change the Footer Text

```
WHAT:   The small text at the very bottom of the home page
WHERE:  Home Page (/), Section E — Footer
FILE:   app/page.tsx
LINES:  428–432
```
```tsx
// FIND:
<p>
  RideShare &bull; Advanced DBMS Project with Multi-User Ride Sharing, Automated Pricing &amp; Cancellation Isolation.
</p>
<p className="text-[11px] text-slate-600">
  Powered by Next.js 16, PostgreSQL / Supabase, Haversine Trigonometry, and ACID Transaction Guarantees.
</p>

// CHANGE to e.g.:
<p>RideShare | CIA-3 DBMS Project | Christ University | 2025</p>
<p className="text-[11px] text-slate-600">Built with Next.js 16, Supabase (PostgreSQL), and TailwindCSS</p>
```

---

### EDIT 20 — Change the Browser Tab Title

```
WHAT:   The title shown in the browser tab
WHERE:  Browser tab (affects ALL pages)
FILE:   app/layout.tsx
LINES:  9
```
```tsx
// FIND:
title: 'RideShare — Urban Mobility & Ride Pooling',

// CHANGE to:
title: 'RideShare | CIA-3 DBMS Project',
```

---

### EDIT 21 — Add a New Nav Link

```
WHAT:   A new link in the top navigation bar
WHERE:  Navbar — visible on every page, the nav links row
FILE:   components/Navbar.tsx
LINES:  18–23 (the navItems array)
```
```tsx
// FIND:
const navItems = [
  { label: 'Home',            href: '/',          icon: Car },
  ...(currentUser ? [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }] : []),
  { label: 'Book Ride',       href: '/book',       icon: PlusCircle },
  { label: 'Admin / Live DB', href: '/admin',      icon: Database },
];

// ADD a new item:
  { label: 'Help / FAQ',  href: '/help',  icon: HelpCircle },
// Also add HelpCircle to the import on line 7:
import { Car, LayoutDashboard, PlusCircle, Database, UserCheck, LogOut, HelpCircle } from 'lucide-react';
```

---

### EDIT 22 — Change the Brand Name in the Navbar

```
WHAT:   The "RideShare" text in the logo area
WHERE:  Navbar — top-left logo section on every page
FILE:   components/Navbar.tsx
LINES:  35
```
```tsx
// FIND:
<span className="font-bold text-lg text-white tracking-tight">RideShare</span>

// CHANGE "RideShare" to any name:
<span className="font-bold text-lg text-white tracking-tight">CabPool Pro</span>
```

---

### EDIT 23 — Change the Navbar Subtitle Under Logo

```
WHAT:   The small grey text "Urban Mobility & Ride Pooling" under the logo
WHERE:  Navbar — top-left logo area on every page
FILE:   components/Navbar.tsx
LINES:  36
```
```tsx
// FIND:
<span className="text-xs text-slate-400 block -mt-0.5">Urban Mobility &amp; Ride Pooling</span>

// CHANGE to:
<span className="text-xs text-slate-400 block -mt-0.5">Bangalore Cab Pool Platform</span>
```

---

### EDIT 24 — Add Airport Badge to Ride Cards on Dashboard

```
WHAT:   An "Airport Express" badge on rides going to the Airport
WHERE:  User Dashboard (/dashboard), Active Rides section, inside each ride card
FILE:   app/dashboard/page.tsx
LINES:  Find where ride.dropoff_location or route info is rendered in a ride card
```
```tsx
// FIND the area in the ride card that shows route text (search "dropoff_location"):
// Add this right after the route display:
{ride.dropoff_location === 'Airport' && (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
    ✈️ Airport Express
  </span>
)}
```

---

### EDIT 25 — Change "Total Spent" Label on Dashboard

```
WHAT:   The stat label in the stats row at the top
WHERE:  User Dashboard (/dashboard), Stats Row — the 4 stat cards at the top
FILE:   app/dashboard/page.tsx
LINES:  Search for "Total Spent" (Ctrl+F)
```
```tsx
// FIND:
"Total Spent"

// CHANGE to:
"Total Paid"
// or: "Amount Spent"
```

---

### EDIT 26 — Change the Admin Default Tab

```
WHAT:   Which tab opens by default when you go to /admin
WHERE:  Admin Page (/admin) — the tab bar at the top
FILE:   app/admin/page.tsx
LINES:  28
```
```tsx
// FIND:
const [activeTab, setActiveTab] = useState<'view' | 'users' | 'drivers' | 'vehicles' | 'rides' | 'payments' | 'reviews'>('view');

// CHANGE 'view' to any tab:
('rides')    // opens Rides table by default
('users')    // opens Users table by default
('payments') // opens Payments table by default
```

---

### EDIT 27 — Add a New Bangalore Location to All Dropdowns

```
WHAT:   A new city location that appears in Pickup/Dropoff dropdowns everywhere
WHERE:  Home Page Estimator dropdowns + Book Page (/book) pickup/dropoff selectors
FILE:   lib/fare.ts (frontend math) + Supabase SQL Editor (database)
LINES:  lib/fare.ts lines 2–9
```
```ts
// Step 1 — In lib/fare.ts, add to LOCATIONS_DATA:
'Christ University': { lat: 12.9344, lon: 77.6060 },
'HSR Layout':        { lat: 12.9116, lon: 77.6474 },
'Marathahalli':      { lat: 12.9563, lon: 77.7010 },

// Step 2 — In Supabase SQL Editor, insert the row:
INSERT INTO locations (name, latitude, longitude)
VALUES ('Christ University', 12.9344, 77.6060);

// New location now appears in ALL dropdowns on both pages automatically.
```

---

### EDIT 28 — Change the 25% Corridor Detour Rule

```
WHAT:   The maximum allowed detour for corridor ride matching
WHERE:  Affects the corridor pooling logic — shown in Admin page and Ride Detail page
FILE:   lib/fare.ts
LINES:  235, 254, 273
```
```ts
// FIND (appears 3 times):
if (detourRatio <= 1.25 && ...)
//                ^^^^  = 25% max detour

// CHANGE:
1.10  = 10% max (stricter matching)
1.25  = 25% max (current default)
1.50  = 50% max (looser matching)
```

---

### EDIT 29 — Change the "SAVE 30%" Badge on Book Page

```
WHAT:   The green badge that says "SAVE 30%" on the Shared Cab button
WHERE:  Book Page (/book), Trip Mode section — the "Shared Cab (Pool)" toggle card
FILE:   app/book/page.tsx
LINES:  275–277
```
```tsx
// FIND:
<span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
  SAVE 30%
</span>

// CHANGE text:
SAVE 40%
// (also update actual discount in lib/fare.ts if you want the math to match)
```

---

### EDIT 30 — Change the Instant Pickup Time Text

```
WHAT:   The "5-10 MINS" badge on the "Book Now" timing option
WHERE:  Book Page (/book), Ride Timing section — the "Book Ride Now" card
FILE:   app/book/page.tsx
LINES:  208–210
```
```tsx
// FIND:
<span className="text-[10px] font-bold ...">
  5-10 MINS
</span>

// CHANGE to:
2-5 MINS
// or: INSTANT
```

---

### EDIT 31 — Change Default Pickup and Dropoff in Book Form

```
WHAT:   The location pre-selected in the dropdowns when the page first loads
WHERE:  Book Page (/book), Pickup and Dropoff dropdowns
FILE:   app/book/page.tsx
LINES:  18–19
```
```tsx
// FIND:
const [pickup, setPickup] = useState('MG Road');
const [dropoff, setDropoff] = useState('Airport');

// CHANGE to any valid location name:
const [pickup, setPickup] = useState('Koramangala');
const [dropoff, setDropoff] = useState('Whitefield');
```

---

### EDIT 32 — Add a New Demo User for Quick Login

```
WHAT:   A 4th quick-login button on the home page (under "1-Click Quick Demo Access")
WHERE:  Home Page (/), Section A — Hero Card, demo login pills row
FILE:   app/page.tsx
LINES:  27–49 (DEMO_PROFILES array at the top of the file)
```
```tsx
// FIND:
const DEMO_PROFILES = [
  { user_id: '11111111-...', name: 'Parth Sharma', ... },
  { user_id: '33333333-...', name: 'Sneha Rao', ... },
  { user_id: '22222222-...', name: 'Aarav Patel', ... },
];

// ADD a new profile:
  {
    user_id: '44444444-4444-4444-4444-444444444444',
    name: 'Rahul Singh',
    email: 'rahul@example.com',
    number: '9000000001',
    role: 'Airport Commuter'
  },
```

---

### EDIT 33 — Change the "Cancel Ride" Button Text

```
WHAT:   The text on the red cancel button in each ride card
WHERE:  User Dashboard (/dashboard), Active Rides section, inside each ride card
FILE:   app/dashboard/page.tsx
LINES:  Search for "Cancel Ride" with Ctrl+F
```
```tsx
// FIND:
"Cancel Ride"

// CHANGE to:
"Cancel This Trip"
// or: "Remove Booking"
```

---

### EDIT 34 — Change Primary Button Colors Globally

```
WHAT:   The blue gradient on all primary CTA buttons
WHERE:  Affects Home Page, Book Page, and Dashboard buttons
FILE:   Use Ctrl+Shift+F (search across all files) to find all instances
SEARCH: from-blue-600 to-indigo-600
```
```tsx
// Current (blue-indigo):
className="... bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 ..."

// Green version:
className="... bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 ..."

// Purple version:
className="... bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 ..."
```

---

### EDIT 35 — Change the Global Page Background Color

```
WHAT:   The dark background color of the entire app
WHERE:  Entire site — the dark background you see behind all cards
FILE:   app/layout.tsx
LINES:  21
```
```tsx
// FIND:
className="bg-slate-950 text-slate-100 min-h-screen ..."

// CHANGE bg-slate-950 to:
bg-gray-950   // slightly different dark
bg-zinc-950   // warm dark
bg-black      // pure black
bg-slate-900  // slightly lighter
```

---

## 14. Demo Profiles Reference

| Name | UUID prefix | Email | Role |
|---|---|---|---|
| **Parth Sharma** | `11111111-1111-...` | parth@example.com | Primary Commuter |
| **Sneha Rao** | `33333333-3333-...` | sneha@example.com | Corridor Rider |
| **Aarav Patel** | `22222222-2222-...` | aarav@example.com | Pool Participant |

**Location:** `app/page.tsx` lines 27–49, `DEMO_PROFILES` constant

---

## 15. All Locations Reference

| Location Name | Latitude | Longitude | Zone |
|---|---|---|---|
| MG Road | 12.9757 | 77.6079 | Central |
| Whitefield | 12.9698 | 77.7500 | East IT Hub |
| Koramangala | 12.9352 | 77.6245 | South |
| Airport | 13.1986 | 77.7066 | North (KIAL) |
| Electronic City | 12.8452 | 77.6602 | South IT Hub |
| Indiranagar | 12.9719 | 77.6412 | Central-East |

**Adding a new location:**
1. Add to `LOCATIONS_DATA` in `lib/fare.ts` lines 2–9
2. Insert row into Supabase `locations` table via SQL Editor

---

## 16. Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Save file (triggers hot reload) | `Ctrl + S` |
| Find text in current file | `Ctrl + F` |
| Find text across ALL files | `Ctrl + Shift + F` |
| Open terminal | `Ctrl + ` (backtick) |
| Switch between open files | `Ctrl + Tab` |
| Jump to line number | `Ctrl + G` |
| Select same word (multi-cursor) | `Ctrl + D` |
| Undo last change | `Ctrl + Z` |
| Go to definition of a function | `F12` |

---

## 17. Quick Reference Table

| Teacher asks... | UI Component/Section | File | Ctrl+F for... |
|---|---|---|---|
| "Change the headline" | Home Page → Hero Card → H1 | `app/page.tsx` | `Smarter Commutes` |
| "Change the badge at top" | Home Page → Hero Card → Top pill | `app/page.tsx` | `Next-Gen Urban Transit` |
| "Change description text" | Home Page → Hero Card → Paragraph | `app/page.tsx` | `multi-user ride sharing` |
| "Change Get Started button" | Home Page → Hero Card → Buttons row | `app/page.tsx` | `Get Started / Sign In` |
| "Add a promo banner" | Home Page → Hero Card → Top area | `app/page.tsx` | line 91 |
| "Change the base fare" | Home Page Estimator + Book Page | `lib/fare.ts` | `BASE_FARE` |
| "Change per-km rate" | Home Page Estimator + Book Page | `lib/fare.ts` | `RATE_PER_KM` |
| "Change pooling discount %" | Home Page Estimator + Book Page | `lib/fare.ts` | `let discount = 0.30` |
| "Change estimator heading" | Home Page → Estimator Section → H2 | `app/page.tsx` | `Test Real-Time Distance` |
| "Change pillar card text" | Home Page → Architecture Section → Cards | `app/page.tsx` | `Smart Corridor Geometry` |
| "Add a 5th pillar card" | Home Page → Architecture Section | `app/page.tsx` | after line 372 |
| "Add a new corridor" | Home Page → Corridors Grid | `app/page.tsx` | `Airport Express` |
| "Change a route tag" | Home Page → Corridors Grid → Card tag | `app/page.tsx` | `Airport Express` |
| "Hide a section" | Any section on Home Page | `app/page.tsx` | `<section` |
| "Change the footer" | Home Page → Footer | `app/page.tsx` | `RideShare &bull;` |
| "Change tab title" | Browser tab (all pages) | `app/layout.tsx` | `title:` |
| "Add a nav link" | Navbar → Nav links row (all pages) | `components/Navbar.tsx` | `navItems` |
| "Change brand name" | Navbar → Logo area (all pages) | `components/Navbar.tsx` | `RideShare` (line 35) |
| "Change navbar subtitle" | Navbar → Logo subtitle (all pages) | `components/Navbar.tsx` | `Urban Mobility` |
| "Add airport badge to rides" | Dashboard → Active Rides → Ride card | `app/dashboard/page.tsx` | `dropoff_location` |
| "Change Total Spent label" | Dashboard → Stats row | `app/dashboard/page.tsx` | `Total Spent` |
| "Change Cancel button text" | Dashboard → Ride card → Cancel btn | `app/dashboard/page.tsx` | `Cancel Ride` |
| "Change admin default tab" | Admin Page → Tab bar | `app/admin/page.tsx` | `useState<'view'` |
| "Add location to dropdowns" | Book Page dropdowns + Home Estimator | `lib/fare.ts` | `LOCATIONS_DATA` |
| "Change vehicle rates" | Book Page → Vehicle cards | `lib/fare.ts` + `app/book/page.tsx` | `VEHICLE_PRICING` |
| "Change SAVE 30% badge" | Book Page → Trip Mode → Shared card | `app/book/page.tsx` | `SAVE 30%` |
| "Change 5-10 mins badge" | Book Page → Timing → Book Now card | `app/book/page.tsx` | `5-10 MINS` |
| "Change default pickup" | Book Page → Pickup dropdown | `app/book/page.tsx` | `useState('MG Road')` |
| "Add a demo user" | Home Page → Hero → Login pills | `app/page.tsx` | `DEMO_PROFILES` (line 27) |
| "Change button colors" | All pages → Primary buttons | all `.tsx` files | `from-blue-600 to-indigo-600` |
| "Change background color" | Entire site background | `app/layout.tsx` | `bg-slate-950` |

---

*Generated for CIA-3 DBMS Evaluation — RideShare Project*
*Next.js 16 (Turbopack) • PostgreSQL / Supabase • TailwindCSS v4 • TypeScript*
