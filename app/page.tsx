'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { calculateFareForLocations, calculateDynamicFare, LOCATIONS_DATA } from '@/lib/fare';
import {
  Car,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  TrendingDown,
  Compass,
  Database,
  Navigation,
  Zap,
  Lock,
  ChevronRight,
  UserCheck
} from 'lucide-react';

const DEMO_PROFILES = [
  {
    user_id: '11111111-1111-1111-1111-111111111111',
    name: 'Parth Sharma',
    email: 'parth@example.com',
    number: '9876543210',
    role: 'Primary Commuter'
  },
  {
    user_id: '33333333-3333-3333-3333-333333333333',
    name: 'Sneha Rao',
    email: 'sneha@example.com',
    number: '9988776655',
    role: 'Corridor Rider'
  },
  {
    user_id: '22222222-2222-2222-2222-222222222222',
    name: 'Aarav Patel',
    email: 'aarav@example.com',
    number: '9123456780',
    role: 'Pool Participant'
  }
];

export default function HomePage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Estimator State
  const [pickup, setPickup] = useState('MG Road');
  const [dropoff, setDropoff] = useState('Airport');

  useEffect(() => {
    setMounted(true);
  }, []);

  const locationNames = Object.keys(LOCATIONS_DATA);

  // Fare calculations for selected route
  const fareResult = calculateFareForLocations(pickup, dropoff);
  const soloFare = fareResult.fare;
  const pooledFare2 = calculateDynamicFare(soloFare, 'shared', 2).finalFare;
  const pooledFare3 = calculateDynamicFare(soloFare, 'shared', 3).finalFare;
  const savings = soloFare - pooledFare2;

  const handleSelectDemoProfile = (profile: typeof DEMO_PROFILES[0]) => {
    setCurrentUser(profile);
    router.push('/dashboard');
  };

  return (
    <div className="space-y-16 py-4 animate-in fade-in-50 duration-300">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-blue-950/50 via-slate-900/80 to-slate-950 border border-blue-900/40 p-8 sm:p-12 lg:p-16 shadow-2xl backdrop-blur-xl">
        {/* Glow ambient background circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          {/* Top pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Next-Gen Urban Transit &bull; Real-Time Corridor Pooling</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Smarter Commutes.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
              Lower Fares.
            </span>{' '}
            Shared Routes.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            The multi-user ride sharing platform engineered for Bangalore. Automatically matches passengers travelling along identical route corridors, lowers trip costs by 30%, and guarantees complete cancellation isolation.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {mounted && currentUser ? (
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                <span>Go to Your Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105"
              >
                <span>Get Started / Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              href="/book"
              className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700 text-slate-200 hover:text-white font-semibold text-sm shadow-md flex items-center gap-2 transition-all hover:scale-105"
            >
              <Car className="w-4 h-4 text-blue-400" />
              <span>Book a Ride</span>
            </Link>

            <Link
              href="/admin"
              className="px-5 py-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-xs flex items-center gap-2 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Inspect Database &amp; Triggers</span>
            </Link>
          </div>

          {/* 1-Click Quick Demo Sign In Pills */}
          {mounted && !currentUser && (
            <div className="pt-6 border-t border-slate-800/60 max-w-xl mx-auto space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1-Click Quick Demo Access (Exam &amp; Viva Testing):
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {DEMO_PROFILES.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => handleSelectDemoProfile(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-600/50 text-slate-300 hover:text-white text-xs font-semibold transition-all hover:scale-105"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({p.role})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* INTERACTIVE ROUTE & DYNAMIC POOLING FARE ESTIMATOR */}
      <section className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl backdrop-blur-xl">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <Compass className="w-4 h-4" />
              <span>Bangalore Transit Corridor Estimator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Test Real-Time Distance &amp; Pooling Discounts
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Select any origin and destination across Bangalore to preview the computed Haversine distance, solo rate, and automated 30% pooling savings.
            </p>
          </div>

          {/* Route Selector Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Pickup Location</span>
              </label>
              <select
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locationNames.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Dropoff Location</span>
              </label>
              <select
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locationNames.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculated Output Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Distance */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Route Distance
              </span>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {fareResult.distanceKm}
                </span>
                <span className="text-sm text-slate-400 ml-1">km</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Haversine coordinate calculation
              </span>
            </div>

            {/* Standard Private Fare */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Private Standard Fare
              </span>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-slate-300 font-mono">
                  ₹{soloFare}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                ₹50 base + ₹12/km rate
              </span>
            </div>

            {/* Pooled Cab Fare */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-blue-950/50 to-slate-950 border border-indigo-500/50 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  Shared Pool Fare (30% Off)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Save ₹{savings}
                </span>
              </div>
              <div className="my-2">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  ₹{pooledFare2}
                </span>
              </div>
              <span className="text-[11px] text-indigo-200">
                Drops to ₹{pooledFare3} with 3 riders (45% off)
              </span>
            </div>
          </div>

          {/* Route CTA */}
          <div className="text-center pt-2">
            <Link
              href={`/book?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all hover:scale-105"
            >
              <span>Book This Corridor Trip Now</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES: THE 4 ARCHITECTURAL PILLARS */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
            <Zap className="w-4 h-4" />
            <span>Built for High-Concurreny Pooling</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Engineered Multi-User Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            A comprehensive system integrating geometry route matching, strict seating capacity, and isolated safety policies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1: Smart Corridor Geometry */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              <Navigation className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              1. Smart Corridor Geometry Matching
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Calculates mid-route pickups and dropoffs within a strict <strong>&le; 25% detour ratio</strong>. Automatically connects commuters heading in the same direction without burdensome route diversions.
            </p>
            <div className="pt-2 text-[11px] font-mono text-blue-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Haversine coordinate matching &bull; Bangalore transit hub validation</span>
            </div>
          </div>

          {/* Pillar 2: Background Auto-Dispatch & FCFS Seating */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              2. First-Come, First-Served Seating
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              When a commuter chooses a shared ride, the app automatically dispatches invitations to all eligible corridor riders. Seats are claimed on a <strong>first-come, first-served basis</strong> up to vehicle capacity (4 for Sedans, 6 for SUVs).
            </p>
            <div className="pt-2 text-[11px] font-mono text-indigo-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strict vehicle capacity guard &bull; Excess pending invites auto-closed</span>
            </div>
          </div>

          {/* Pillar 3: Cancellation Isolation */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              3. Independent Cancellation Isolation
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              If one co-rider cancels their booking, <strong>other passengers in the vehicle never have their trip cancelled</strong>. The cancelling user is removed, and remaining riders stay assigned to their driver and vehicle without interruption.
            </p>
            <div className="pt-2 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Isolated database cascade &bull; Active driver assignment preserved</span>
            </div>
          </div>

          {/* Pillar 4: Automated Refunds & Pricing */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              4. Dynamic Pooling &amp; Automated Refunds
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fares dynamically scale: <strong>30% off</strong> with 2 riders, <strong>45% off</strong> with 3, and <strong>55% off</strong> with 4+. If a solo rider paid in advance and later joins a pool, the fare difference is automatically refunded to their receipt.
            </p>
            <div className="pt-2 text-[11px] font-mono text-purple-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-time difference refund calculation &bull; UPI/Card sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR BANGALORE TRANSIT CORRIDORS */}
      <section className="bg-slate-950/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Active Transit Corridors in Bangalore
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              High-frequency commute paths supported with live geometric pooling.
            </p>
          </div>
          <Link
            href="/book"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Routes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { from: 'MG Road', to: 'Airport', dist: '33.1 km', time: '45-60 min', tag: 'Airport Express' },
            { from: 'Koramangala', to: 'Indiranagar', dist: '6.4 km', time: '20-25 min', tag: 'City Commute' },
            { from: 'Indiranagar', to: 'Whitefield', dist: '13.7 km', time: '35-45 min', tag: 'Tech Artery' },
            { from: 'Whitefield', to: 'Electronic City', dist: '24.7 km', time: '50-65 min', tag: 'ORR Corridor' },
          ].map((corridor, i) => (
            <Link
              key={i}
              href={`/book?pickup=${encodeURIComponent(corridor.from)}&dropoff=${encodeURIComponent(corridor.to)}`}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900 transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block mb-2.5">
                  {corridor.tag}
                </span>
                <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {corridor.from} &rarr; {corridor.to}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800/60">
                <span>{corridor.dist}</span>
                <span>{corridor.time}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-8 pb-4 border-t border-slate-800/60 text-center text-xs text-slate-500 space-y-2">
        <p>
          RideShare &bull; Advanced DBMS Project with Multi-User Ride Sharing, Automated Pricing &amp; Cancellation Isolation.
        </p>
        <p className="text-[11px] text-slate-600">
          Powered by Next.js 16, PostgreSQL / Supabase, Haversine Trigonometry, and ACID Transaction Guarantees.
        </p>
      </footer>
    </div>
  );
}
