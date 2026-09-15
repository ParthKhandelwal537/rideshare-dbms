'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { LocationItem } from '@/lib/types';
import { calculateFareForLocations } from '@/lib/fare';
import { Car, MapPin, Calendar, ArrowRight, AlertCircle, Calculator, Sparkles, Users, UserCheck } from 'lucide-react';

export default function BookRidePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [pickup, setPickup] = useState('MG Road');
  const [dropoff, setDropoff] = useState('Airport');
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);

  // Compute min time: if selected date is today, allow at least +5 minutes from now
  const getNowPlusMins = (mins: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + mins);
    return d.toTimeString().slice(0, 5); // "HH:MM"
  };
  const minTime = date === todayStr ? getNowPlusMins(5) : '00:00';
  const [bookingTiming, setBookingTiming] = useState<'now' | 'later'>('now');
  const [scheduledTime, setScheduledTime] = useState('20:30');
  const [rideType, setRideType] = useState<'solo' | 'shared'>('shared');
  const [vehiclePreference, setVehiclePreference] = useState<'any' | 'Hatchback' | 'Sedan' | 'SUV' | 'XL MUV'>('any');
  const [capacityPreference, setCapacityPreference] = useState<number>(0);
  const [passengersCount, setPassengersCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const getSelectedVehicleMaxCapacity = () => {
    if (capacityPreference > 0) return capacityPreference;
    if (vehiclePreference === 'XL MUV') return 7;
    if (vehiclePreference === 'SUV') return 6;
    if (vehiclePreference === 'Sedan' || vehiclePreference === 'Hatchback') return 4;
    return 4;
  };

  const handleSelectVehicle = (type: 'any' | 'Hatchback' | 'Sedan' | 'SUV' | 'XL MUV', cap: number) => {
    setVehiclePreference(type);
    setCapacityPreference(cap);
    const maxCap = cap > 0 ? cap : (type === 'XL MUV' ? 7 : type === 'SUV' ? 6 : 4);
    if (passengersCount > maxCap) {
      setPassengersCount(maxCap);
    }
  };

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/locations');
        const data = await res.json();
        if (res.ok && data.data && data.data.length > 0) {
          setLocations(data.data);
          setPickup(data.data[0].name);
          setDropoff(data.data[data.data.length > 1 ? 3 : 0].name);
        }
      } catch {
        showToast('Failed to load locations', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, [showToast]);

  const isSameLocation = pickup === dropoff;
  const standardEstimate = !isSameLocation
    ? calculateFareForLocations(pickup, dropoff)
    : { distanceKm: 0, fare: 0 };

  // 30% discount if shared ride
  const effectiveFare = rideType === 'shared'
    ? Math.round(standardEstimate.fare * 0.70)
    : standardEstimate.fare;

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('Please sign in or select a rider first.', 'error');
      router.push('/login');
      return;
    }

    if (isSameLocation) {
      showToast("Pickup and dropoff can't be the same.", 'error');
      return;
    }

    const maxCapacity = getSelectedVehicleMaxCapacity();
    if (passengersCount > maxCapacity) {
      showToast(`Selected vehicle capacity is ${maxCapacity} passengers max.`, 'error');
      return;
    }

    // Past date/time guard
    if (bookingTiming === 'later') {
      const now = new Date();
      const selectedDateTime = new Date(`${date}T${scheduledTime}:00`);
      if (selectedDateTime <= now) {
        showToast('Scheduled time must be in the future. Please pick a later date or time.', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const travelDate = bookingTiming === 'now'
        ? new Date().toISOString().split('T')[0]
        : date;
      const departureTime = bookingTiming === 'now'
        ? 'Immediate (Within 5-10m)'
        : scheduledTime;

      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          pickup_location: pickup,
          dropoff_location: dropoff,
          ride_date: travelDate,
          ride_type: rideType,
          passengers_count: passengersCount,
          is_scheduled: bookingTiming === 'later',
          departure_time: departureTime,
          vehicle_type_preference: vehiclePreference !== 'any' ? vehiclePreference : undefined,
          seating_capacity_preference: capacityPreference > 0 ? capacityPreference : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Booking failed');
      }

      showToast(data.message || `Ride booked — fare ₹${data.data.ride.fare}.`, 'success');
      router.push(`/rides/${data.data.ride.ride_id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to book ride', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Ride Booking</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-xs text-slate-400">Solo & Multi-User Ride Sharing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Book a Trip
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Select origin and destination. Choose between a <strong>Solo Cab</strong> or <strong>Shared Ride (30% discount)</strong> enforced by vehicle capacity.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl">
        <form onSubmit={handleBooking} className="space-y-6">
          
          {/* Ride Timing Selection (Ride Now vs Schedule for Later) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>When do you need the ride?</span>
              <span className="text-[10px] text-blue-400 font-mono">
                {bookingTiming === 'now' ? '⚡ Instant Dispatch' : '📅 Advance Reservation'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBookingTiming('now')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  bookingTiming === 'now'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-600/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Book Ride Now
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    5-10 MINS
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Immediate pickup nearby</div>
              </button>

              <button
                type="button"
                onClick={() => setBookingTiming('later')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  bookingTiming === 'later'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-300">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Schedule for Later
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Advance</span>
                </div>
                <div className="text-[11px] text-slate-400">Pick date and departure time</div>
              </button>
            </div>
          </div>

          {/* Ride Mode Selection (Solo vs Shared Pooling) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Trip Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRideType('solo')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  rideType === 'solo'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-600/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    Solo Ride
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Standard</span>
                </div>
                <div className="text-[11px] text-slate-400">Private vehicle for yourself</div>
              </button>

              <button
                type="button"
                onClick={() => setRideType('shared')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  rideType === 'shared'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-600/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-300">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Shared Cab (Pool)
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    SAVE 30%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Split fare with co-passengers</div>
              </button>
            </div>
          </div>

          {/* Vehicle Category & Car Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Vehicle Category
              </label>
              <span className="text-[11px] text-blue-400 font-medium">Smart Load-Balanced Driver Assignment</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'any', name: 'Any Cab', badge: 'Fastest Match', models: 'Auto-assigns idle driver', cap: 0, capText: '4-7 Seats' },
                { id: 'Hatchback', name: 'Hatchback', badge: 'Swift / i20', models: 'Budget friendly city ride', cap: 4, capText: '4 Seats' },
                { id: 'Sedan', name: 'Sedan', badge: 'City / Etios', models: 'Smooth ride & spacious trunk', cap: 4, capText: '4 Seats' },
                { id: 'SUV', name: 'SUV', badge: 'Creta / Innova', models: 'High clearance & 6 seats', cap: 6, capText: '6 Seats' },
                { id: 'XL MUV', name: 'XL MUV', badge: 'Maruti Ertiga', models: 'Spacious 7 seater capacity', cap: 7, capText: '7 Seats' },
              ].map((veh) => {
                const isSelected = vehiclePreference === veh.id;
                return (
                  <button
                    key={veh.id}
                    type="button"
                    onClick={() => handleSelectVehicle(veh.id as any, veh.cap)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-600/25 border-blue-500 text-white shadow-lg shadow-blue-600/20 scale-[1.02]'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold flex items-center gap-1">
                        <Car className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        {veh.name}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800 text-slate-400'}`}>
                        {veh.capText}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">{veh.badge}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{veh.models}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seating Capacity Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Seating Capacity Preference
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { cap: 0, label: 'Any Capacity' },
                { cap: 4, label: '4 Seats (Hatchback / Sedan)' },
                { cap: 6, label: '6 Seats (SUV)' },
                { cap: 7, label: '7 Seats (XL MUV)' },
              ].map((opt) => (
                <button
                  key={opt.cap}
                  type="button"
                  onClick={() => {
                    setCapacityPreference(opt.cap);
                    if (opt.cap === 4 && (vehiclePreference === 'SUV' || vehiclePreference === 'XL MUV')) {
                      setVehiclePreference('Sedan');
                    } else if (opt.cap === 6 && vehiclePreference !== 'SUV') {
                      setVehiclePreference('SUV');
                    } else if (opt.cap === 7 && vehiclePreference !== 'XL MUV') {
                      setVehiclePreference('XL MUV');
                    }
                    const maxCap = opt.cap > 0 ? opt.cap : getSelectedVehicleMaxCapacity();
                    if (passengersCount > maxCap) setPassengersCount(maxCap);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    capacityPreference === opt.cap
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Passenger Count / Seats Needed */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  {rideType === 'shared' ? 'Seats Needed For Your Party' : 'Passengers Count'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {rideType === 'shared'
                    ? `Max vehicle capacity: ${getSelectedVehicleMaxCapacity()} passengers`
                    : `Party size (Max: ${getSelectedVehicleMaxCapacity()})`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: getSelectedVehicleMaxCapacity() }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPassengersCount(num)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      passengersCount === num
                        ? rideType === 'shared'
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanatory banner for Shared vs Solo */}
            {rideType === 'shared' ? (
              <div className="pt-2 border-t border-slate-800/60 text-[11px] text-emerald-300/90 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Shared Ride Active:</strong> Your {vehiclePreference === 'any' ? 'assigned vehicle' : vehiclePreference} has {getSelectedVehicleMaxCapacity()} total seats. You reserve <strong>{passengersCount} seat(s)</strong>; up to <strong>{getSelectedVehicleMaxCapacity() - passengersCount} co-riders</strong> along your corridor can join on a first-come, first-served basis.
                </span>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800/60 text-[11px] text-blue-300/90 flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  <strong>Private Solo Cab:</strong> The entire {getSelectedVehicleMaxCapacity()}-seater {vehiclePreference === 'any' ? 'vehicle' : vehiclePreference} is reserved exclusively for your party.
                </span>
              </div>
            )}
          </div>

          {/* Pickup Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Pickup Location
            </label>
            <div className="relative">
              <select
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {locations.map((loc) => (
                  <option key={loc.name} value={loc.name} className="bg-slate-900 text-white">
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dropoff Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Dropoff Location
            </label>
            <div className="relative">
              <select
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {locations.map((loc) => (
                  <option key={loc.name} value={loc.name} className="bg-slate-900 text-white">
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule Timing Details (If Schedule for Later selected) */}
          {bookingTiming === 'later' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30">
              {/* Date Picker with Explicit Calendar Button */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Scheduled Date
                </label>
                <div className="relative flex items-center">
                  <input
                    ref={dateInputRef}
                    type="date"
                    required
                    value={date}
                    min={todayStr}
                    onChange={(e) => {
                      setDate(e.target.value);
                      // If user switches to today and current scheduledTime is now in the past, reset it
                      if (e.target.value === todayStr) {
                        const minT = getNowPlusMins(5);
                        if (scheduledTime < minT) setScheduledTime(minT);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        dateInputRef.current?.showPicker();
                      } catch {
                        dateInputRef.current?.focus();
                      }
                    }}
                    className="absolute right-3 p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Open Calendar"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Time Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Departure Time
                </label>
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  min={minTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                />
                {date === todayStr && (
                  <p className="mt-1 text-[10px] text-indigo-400/80">
                    ⏱ Must be at least 5 minutes from now ({minTime} or later)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-300 text-xs">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span><strong>Ride Now Selected:</strong> Driver will be assigned immediately for departure today ({date}).</span>
            </div>
          )}

          {/* Same location error warning */}
          {isSameLocation && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Pickup and dropoff cannot be the same point. Please pick a different destination.</span>
            </div>
          )}

          {/* Business Rule / Distance & Fare Preview */}
          {!isSameLocation && (
            <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-400" />
                  Great-Circle Distance:
                </span>
                <span className="font-semibold text-white">{standardEstimate.distanceKm} km</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {rideType === 'shared' ? 'Discounted Shared Fare (30% Off):' : 'Standard Solo Fare:'}
                </span>
                <div className="text-right">
                  {rideType === 'shared' && (
                    <span className="text-xs line-through text-slate-500 mr-2">₹{standardEstimate.fare}</span>
                  )}
                  <span className="font-bold text-base text-emerald-400">₹{effectiveFare}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Transparent dynamic fare calculation &middot; Capacity verified</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || isSameLocation || loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            {submitting ? (
              <span>Checking Capacity & Assigning Driver...</span>
            ) : (
              <>
                <Car className="w-4 h-4" />
                <span>Confirm & Book {rideType === 'shared' ? 'Shared Cab' : 'Solo Ride'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
