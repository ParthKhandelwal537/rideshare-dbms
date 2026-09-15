'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Ride, Payment, Driver, Vehicle, LocationItem, RideStatus, RideType, CoRider } from '@/lib/types';
import { formatFriendlyId } from '@/lib/idHelper';
import { calculateFareForLocations, calculateDynamicFare } from '@/lib/fare';
import {
  Calendar,
  CreditCard,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ShieldCheck,
  Car,
  MessageSquare,
  Send,
  Lock,
  Phone,
  AlertTriangle,
  Play,
  Navigation,
  MapPin,
  Star,
  Users,
  UserPlus,
  UserMinus,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Radio
} from 'lucide-react';

export default function RideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const rideId = resolvedParams.id;

  const router = useRouter();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [ride, setRide] = useState<Ride | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPickup, setEditPickup] = useState('');
  const [editDropoff, setEditDropoff] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDepartureTime, setEditDepartureTime] = useState('20:30');
  const [editRideType, setEditRideType] = useState<RideType>('solo');
  const [isUpdating, setIsUpdating] = useState(false);

  // Ride Sharing & Dynamic Fare State
  const [sharingType, setSharingType] = useState<RideType>('solo');
  const [coRiders, setCoRiders] = useState<CoRider[]>([]);
  const [isUpdatingPooling, setIsUpdatingPooling] = useState(false);
  const [fareConfirmedSuccess, setFareConfirmedSuccess] = useState(false);

  // Corridor Matched Booked Rides & Invites
  const [matchedBookedRides, setMatchedBookedRides] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Payment State
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMode, setPaymentMode] = useState('UPI (Google Pay)');

  // Review State
  const [comment, setComment] = useState('');
  const [selectedRating, setSelectedRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewsList, setReviewsList] = useState<any[]>([]);

  // Action States
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdvancingStatus, setIsAdvancingStatus] = useState(false);

  const fetchMatchedBookedRides = useCallback(async () => {
    try {
      setLoadingMatches(true);
      const res = await fetch(`/api/rides/${rideId}/matches`);
      const data = await res.json();
      if (res.ok && data.data) {
        setMatchedBookedRides(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMatches(false);
    }
  }, [rideId]);

  const fetchRideData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rides/${rideId}`);
      const data = await res.json();

      if (!res.ok || !data.data) {
        throw new Error(data.message || 'Ride not found');
      }

      const { ride, payment, driver, vehicle } = data.data;
      setRide(ride);
      setPayment(payment || null);
      setDriver(driver || null);
      setVehicle(vehicle || null);

      setEditPickup(ride.pickup_location);
      setEditDropoff(ride.dropoff_location);
      setEditDate(ride.ride_date);
      setEditDepartureTime(ride.departure_time || '20:30');
      setEditRideType(ride.ride_type || 'solo');

      setSharingType(ride.ride_type || 'solo');
      setCoRiders(ride.co_riders || []);

      const locRes = await fetch('/api/locations');
      const locData = await locRes.json();
      if (locData.data) setLocations(locData.data);

      const revRes = await fetch('/api/reviews');
      const revData = await revRes.json();
      if (revData.data) {
        setReviewsList(revData.data.filter((rev: any) => rev.user_id === ride.user_id));
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading ride details', 'error');
    } finally {
      setLoading(false);
    }
  }, [rideId, showToast]);

  useEffect(() => {
    fetchRideData();
    fetchMatchedBookedRides();
  }, [fetchRideData, fetchMatchedBookedRides]);

  // Handle Send or Accept Pooling Invite
  const handleSendOrAcceptInvite = async (targetRideId: string, action: 'send' | 'accept') => {
    setProcessingInviteId(targetRideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_ride_id: targetRideId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to process invite');

      showToast(data.message, 'success');
      await fetchRideData();
      await fetchMatchedBookedRides();
    } catch (err: any) {
      showToast(err.message || 'Invite error', 'error');
    } finally {
      setProcessingInviteId(null);
    }
  };

  const isPaid = payment?.payment_status === 'completed';

  // Dynamic Fare Calculation in Real-Time
  const baseSoloFare = ride ? calculateFareForLocations(ride.pickup_location, ride.dropoff_location).fare : 0;
  const totalRiders = sharingType === 'shared' ? 1 + coRiders.length : 1;
  const dynamicFareInfo = calculateDynamicFare(baseSoloFare, sharingType, totalRiders);

  // Switch between Solo and Shared Pool
  const handleToggleSharingType = (type: RideType) => {
    if (isPaid) {
      showToast("Payment already completed. Click 'Modify Trip' to change pool or route.", "info");
      return;
    }
    setSharingType(type);
    setFareConfirmedSuccess(false);
  };

  // Add / Match next verified Co-Rider along route
  const handleAddCoRider = () => {
    if (isPaid) {
      showToast("Payment already completed. Click 'Modify Trip' to add co-riders or share.", "info");
      return;
    }

    const maxCapacity = vehicle?.capacity || 4;
    if (1 + coRiders.length >= maxCapacity) {
      showToast(`Vehicle seating capacity reached (${maxCapacity} seats maximum).`, 'info');
      return;
    }

    const coRiderIndex = coRiders.length + 1;
    const newCoRider: CoRider = {
      id: `corider-${Date.now()}`,
      name: `Co-Rider #${coRiderIndex}`,
      pickup: ride?.pickup_location || 'MG Road',
      dropoff: ride?.dropoff_location || 'Airport',
      seats: 1
    };

    setCoRiders([...coRiders, newCoRider]);
    setFareConfirmedSuccess(false);
    showToast('A co-rider on this route has joined! Dynamic fare reduced. Confirm before payment.', 'info');
  };

  // Remove Co-Rider from pool
  const handleRemoveCoRider = (id: string) => {
    if (isPaid) {
      showToast("Payment already completed. Click 'Modify Trip' to adjust co-riders.", "info");
      return;
    }
    setCoRiders(coRiders.filter(c => c.id !== id));
    setFareConfirmedSuccess(false);
    showToast('Co-rider removed. Dynamic fare recalculated.', 'info');
  };

  // Lock and Confirm Dynamic Fare Before Payment
  const handleConfirmDynamicFare = async () => {
    setIsUpdatingPooling(true);
    try {
      const res = await fetch(`/api/rides/${rideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_type: sharingType,
          co_riders: coRiders,
          passengers_count: totalRiders
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update dynamic fare');

      setRide(data.data.ride);
      if (data.data.payment) setPayment(data.data.payment);
      setFareConfirmedSuccess(true);
      showToast(`Dynamic fare of ₹${data.data.ride.fare} confirmed for payment!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating fare', 'error');
    } finally {
      setIsUpdatingPooling(false);
    }
  };

  // Handle Pay Now
  const handlePayNow = async () => {
    if (!payment) return;
    setIsPaying(true);
    try {
      const res = await fetch(`/api/payments/${payment.payment_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_mode: paymentMode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment failed');

      setPayment(data.data);
      showToast('Payment successful.', 'success');
      await fetchRideData();
    } catch (err: any) {
      showToast(err.message || 'Payment failed', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  // Handle Edit Ride
  const handleEditRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editPickup === editDropoff) {
      showToast("Pickup and dropoff can't be the same.", 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/rides/${rideId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: editPickup,
          dropoff_location: editDropoff,
          ride_date: editDate,
          departure_time: editDepartureTime,
          ride_type: editRideType,
          co_riders: editRideType === 'shared' ? coRiders : []
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update ride');

      setRide(data.data.ride);
      if (data.data.payment) setPayment(data.data.payment);
      setShowEditModal(false);
      showToast(data.message || `Ride updated — new fare ₹${data.data.ride.fare}.`, 'success');
      await fetchRideData();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Cancel Ride (Policy: Up to 3 hours before trip departure)
  const handleCancelRide = async () => {
    const refundNotice = payment?.payment_status === 'completed'
      ? `\n\nNote: Payment of ₹${payment.amount} has been marked for full instant refund.`
      : '';
    if (!confirm(`Are you sure you want to cancel this ride?${refundNotice}`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/rides/${rideId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel ride');

      showToast('Ride cancelled successfully.', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel ride', 'error');
      setIsDeleting(false);
    }
  };

  // Advance Live Ride Tracker Stage (Viva Demonstration)
  const handleAdvanceStatus = async () => {
    setIsAdvancingStatus(true);
    try {
      const res = await fetch(`/api/rides/${rideId}/status`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to advance status');

      setRide(data.data);
      showToast(`Trip Stage Updated: ${data.data.ride_status}`, 'info');

      // Refresh full ride details to update payment status and tracker
      await fetchRideData();
    } catch (err: any) {
      showToast(err.message || 'Failed to advance status', 'error');
    } finally {
      setIsAdvancingStatus(false);
    }
  };

  // Reset Live Ride Tracker for repeat viva demonstrations
  const handleResetStatus = async () => {
    setIsAdvancingStatus(true);
    try {
      const res = await fetch(`/api/rides/${rideId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset status');

      setRide(data.data);
      showToast('Trip Tracker reset to Stage 1 (Driver Assigned).', 'info');
      await fetchRideData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset status', 'error');
    } finally {
      setIsAdvancingStatus(false);
    }
  };

  // Handle Review Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast('Please enter your review comments.', 'error');
      return;
    }
    if (!currentUser) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          comments: comment.trim(),
          rating: selectedRating
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      setReviewsList([data.data, ...reviewsList]);
      setComment('');
      showToast('Review submitted. Driver rating updated!', 'success');
      await fetchRideData();
    } catch (err: any) {
      showToast(err.message || 'Error submitting review', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">Loading ride details...</p>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">Ride Not Found</h2>
        <p className="text-sm text-slate-400 mt-1 mb-4">The requested ride does not exist or has been cancelled.</p>
        <Link href="/dashboard" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const status: RideStatus = ride.ride_status || 'driver_assigned';
  const isCompleted = status === 'completed';
  const isBoardedOrDone = status === 'in_transit' || isCompleted;

  // 3-Hour modification & cancellation policy:
  // Allowed up to 3 hours before departure while driver is assigned or arrived.
  // Locked only after rider has boarded the cab (in_transit or completed).
  const isActionLocked = isBoardedOrDone;

  // Tracker Stages
  const stages = [
    { key: 'driver_assigned', label: 'Driver Heading to Pickup', distance: '1.8 km away', eta: '3 mins' },
    { key: 'driver_arrived', label: 'Driver Arrived at Pickup', distance: 'At Pickup Point', eta: 'Boarding' },
    { key: 'in_transit', label: 'In Transit to Destination', distance: 'En Route', eta: 'Active' },
    { key: 'completed', label: 'Arrived at Destination', distance: 'Trip Completed', eta: 'Done' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Edit / Delete Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            disabled={isActionLocked}
            title={
              isBoardedOrDone
                ? 'Rides cannot be edited after rider has boarded the cab'
                : 'Modify pickup, dropoff, date, or departure time (Allowed up to 3 hours before departure)'
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isActionLocked
                ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white shadow-sm'
            }`}
          >
            {isActionLocked ? <Lock className="w-3.5 h-3.5 text-slate-600" /> : <Edit3 className="w-3.5 h-3.5 text-blue-400" />}
            Edit Ride
          </button>

          <button
            onClick={handleCancelRide}
            disabled={isActionLocked || isDeleting}
            title={
              isBoardedOrDone
                ? 'Rides cannot be cancelled after rider has boarded the cab'
                : 'Cancel this ride (Allowed up to 3 hours before departure)'
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isActionLocked
                ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/50 text-rose-300 hover:text-rose-100 shadow-sm'
            }`}
          >
            {isActionLocked ? <Lock className="w-3.5 h-3.5 text-slate-600" /> : <Trash2 className="w-3.5 h-3.5 text-rose-400" />}
            {isDeleting ? 'Cancelling...' : 'Cancel Ride'}
          </button>
        </div>
      </div>

      {/* 3-Hour Cancellation & Modification Policy Banner */}
      {!isBoardedOrDone ? (
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/50 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>3-Hour Policy Active:</strong> Free route modifications and cancellations are allowed up to 3 hours before scheduled trip departure (Scheduled: {ride.departure_time || '20:30'}).
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800/50 shrink-0">
            Modifiable & Cancellable
          </span>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-400">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Trip is in transit or completed. As per safety policy, route modification and cancellation are locked once the passenger boards the cab.</span>
        </div>
      )}

      {/* LIVE RIDE TRACKER & PROGRESS TIMELINE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Live Trip Tracking</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold uppercase">
              {status.replace('_', ' ')}
            </span>
          </div>

          {/* Simulator button for live viva demonstration */}
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <button
                onClick={handleAdvanceStatus}
                disabled={isAdvancingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition-all hover:scale-105"
              >
                <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                <span>
                  {isAdvancingStatus
                    ? 'Advancing...'
                    : `Simulate Next Stage (${
                        status === 'driver_assigned'
                          ? 'Driver Arrives'
                          : status === 'driver_arrived'
                          ? 'Board Cab (In Transit)'
                          : 'Reach Destination'
                      })`}
                </span>
              </button>
            )}

            <button
              onClick={handleResetStatus}
              disabled={isAdvancingStatus}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all hover:scale-105"
              title="Reset tracker to Stage 1 (Driver Assigned)"
            >
              <RefreshCw className="w-3 h-3 text-slate-400" />
              <span>Reset Tracker</span>
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 relative my-2">
          {stages.map((stg, idx) => {
            const isPassed = currentStageIndex >= idx;
            const isCurrent = currentStageIndex === idx;

            return (
              <div key={stg.key} className="text-center">
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-lg shadow-blue-600/40 scale-110'
                      : isPassed
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isPassed && !isCurrent ? '✓' : idx + 1}
                </div>
                <div className={`text-[11px] font-semibold mt-2 ${isCurrent ? 'text-blue-300 font-bold' : isPassed ? 'text-slate-200' : 'text-slate-500'}`}>
                  {stg.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{stg.distance}</div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Telematics Alert */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Car className="w-4 h-4 text-blue-400" />
            <span>
              {status === 'driver_assigned' && `Driver ${driver?.driver_name || 'Rajesh'} is 1.8 km away, arriving at ${ride.pickup_location} in ~3 minutes.`}
              {status === 'driver_arrived' && `Driver has arrived at ${ride.pickup_location}. Waiting for rider to board vehicle ${vehicle?.vehicle_number || ''}.`}
              {status === 'in_transit' && `Trip in progress! In transit to ${ride.dropoff_location}. En route via Bangalore arterial roads.`}
              {status === 'completed' && `Destination reached at ${ride.dropoff_location}! Trip successfully completed.`}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">GPS Telematics</span>
        </div>
      </div>

      {/* MULTI-USER RIDE SHARING & DYNAMIC FARE CONFIRMATION MODULE */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-xl space-y-5">
        
        {/* Paid Lock Notice Banner */}
        {isPaid && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Ride Booked & Paid:</strong> Inline edits are locked. To add co-riders, match corridor rides, or adjust your route, please click <strong>Modify Trip</strong>. (Any fare decrease is automatically refunded!)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold shrink-0 transition-all flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modify Trip &rarr;
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Multi-User Ride Sharing & Dynamic Fare Pool
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Share cab with verified co-riders along your route. As riders join, fare dynamically reduces. Confirm before payment.
            </p>
          </div>

          {/* Ride Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleToggleSharingType('solo')}
              disabled={isPaid}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sharingType === 'solo'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              } ${isPaid ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={isPaid ? 'Payment completed. Click Modify Trip to change mode.' : undefined}
            >
              Solo Cab
            </button>
            <button
              type="button"
              onClick={() => handleToggleSharingType('shared')}
              disabled={isPaid}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                sharingType === 'shared'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              } ${isPaid ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={isPaid ? 'Payment completed. Click Modify Trip to change mode.' : undefined}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Shared Pool (Save up to 55%)
            </button>
          </div>
        </div>

        {/* If Shared Pool is Active */}
        {sharingType === 'shared' ? (
          <div className="space-y-4">
            {/* Vehicle Capacity Status */}
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400">
                Seating Capacity: <strong>{totalRiders} of {vehicle?.capacity || 4} seats occupied</strong>
              </span>
              <span className="text-emerald-400 font-semibold text-[11px]">
                {(vehicle?.capacity || 4) - totalRiders} seats available in {vehicle?.vehicle_type || 'Sedan'}
              </span>
            </div>

            {/* Co-Riders List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Riders Matched in this Vehicle:
                </span>
                <button
                  type="button"
                  onClick={handleAddCoRider}
                  disabled={isPaid || totalRiders >= (vehicle?.capacity || 4)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    isPaid
                      ? 'text-slate-500 cursor-not-allowed opacity-50'
                      : 'text-indigo-400 hover:text-indigo-300'
                  }`}
                  title={isPaid ? 'Payment completed. Click Modify Trip to add co-riders.' : undefined}
                >
                  {isPaid ? <Lock className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {isPaid ? 'Locked (Paid - Use Modify Trip)' : '+ Add / Match Co-Rider'}
                </button>
              </div>

              {/* Primary Rider */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center font-bold text-blue-300 text-xs">
                    You
                  </div>
                  <div>
                    <div className="font-semibold text-white">Parth Sharma (You - Booking Owner)</div>
                    <div className="text-[11px] text-slate-400">{ride.pickup_location} → {ride.dropoff_location}</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">
                  Primary
                </span>
              </div>

              {/* Co-Riders / Matching in Progress Banner */}
              {coRiders.length === 0 ? (
                <div className="p-4 bg-gradient-to-r from-blue-950/60 via-indigo-950/50 to-slate-950 border border-indigo-500/50 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                      <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Matching in Progress</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                          First-Come, First-Served ({vehicle?.capacity || 4} Seats Max)
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Scanning for eligible riders along your route corridor (with departure deviation &le; 30 minutes). Once matched riders join, this banner will clear and pool discounts will apply!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in-50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Matched & Joined!</strong> Co-rider pool active ({1 + coRiders.length} of {vehicle?.capacity || 4} seats filled on first-come, first-served basis). 30% pooling discount applied.
                    </span>
                  </div>

                  {coRiders.map((co) => (
                    <div
                      key={co.id}
                      className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs hover:border-indigo-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-semibold text-indigo-300 text-xs">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">Co-Rider on Route</div>
                          <div className="text-[11px] text-slate-400">{co.pickup} &rarr; {co.dropoff}</div>
                        </div>
                      </div>
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCoRider(co.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove co-rider from pool"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Fare Calculation Table */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-900/40 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Standard Solo Fare:</span>
                <span className="line-through text-slate-500 font-mono">₹{baseSoloFare}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Riders Sharing Vehicle:</span>
                <span className="font-semibold text-slate-200">{totalRiders} passengers</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                <span>Dynamic Pooling Discount ({dynamicFareInfo.discountPercent}% Off):</span>
                <span>-₹{dynamicFareInfo.savings}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-white">Dynamic Confirmed Fare:</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  ₹{dynamicFareInfo.finalFare}
                </span>
              </div>
            </div>

            {/* Confirm Fare Before Payment CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {isPaid ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Paid in Full (Locked) &middot; To add co-riders or modify route, click &ldquo;Modify Trip&rdquo; above.</span>
                </div>
              ) : fareConfirmedSuccess ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dynamic fare of ₹{dynamicFareInfo.finalFare} locked & confirmed for payment!</span>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Click to lock in this dynamic pooling rate prior to making payment.
                </div>
              )}

              {!isPaid && (
                <button
                  type="button"
                  onClick={handleConfirmDynamicFare}
                  disabled={isUpdatingPooling}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {isUpdatingPooling ? 'Confirming...' : `Confirm Dynamic Fare (₹${dynamicFareInfo.finalFare})`}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Solo Ride Selected */
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-white block">Solo Cab Currently Booked</span>
              <span>Full vehicle reserved exclusively for 1 passenger. Standard route fare applies. You can invite other solo riders on your route corridor below to pool together and save 30%!</span>
            </div>
            <span className="text-base font-bold text-white font-mono shrink-0">₹{baseSoloFare}</span>
          </div>
        )}

        {/* LIVE CORRIDOR ROUTE MATCHING & INVITE SYSTEM (Visible for BOTH Solo and Shared Rides) */}
        <div className="pt-4 border-t border-indigo-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Live Booked Riders on Your Route Corridor
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                Geometry Match &le; 25% Detour
              </span>
            </div>
            <button
              type="button"
              onClick={fetchMatchedBookedRides}
              disabled={loadingMatches}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMatches ? 'animate-spin' : ''}`} />
              <span>Scan Route</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            {sharingType === 'solo'
              ? 'You have chosen a private Solo Ride. No automatic pool matching or invitations are dispatched for solo trips. If you wish to pool and save 30%, switch to Shared Cab above.'
              : 'Shared Pool Ride: Automatically matches with active riders along this route or slightly deviating corridor (departure deviation &le; 30 minutes). You can pool together with 1-click on a first-come, first-served basis up to vehicle capacity!'}
          </div>

          {matchedBookedRides.length === 0 ? (
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 text-center space-y-1">
              <div className="font-semibold text-slate-300">No other booked rides on this exact corridor right now</div>
              <div className="text-[11px] text-slate-500">
                Matches only appear when another rider books along your path ({ride.pickup_location} &rarr; {ride.dropoff_location}) or midway on the corridor.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {matchedBookedRides.map((candidate) => (
                <div
                  key={candidate.ride_id}
                  className="p-3.5 bg-slate-950/80 border border-indigo-900/40 hover:border-indigo-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Ride on this route</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                        {candidate.pickup_location} &rarr; {candidate.dropoff_location}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                        +{candidate.detour_km} km corridor
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>{candidate.corridor_description}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Scheduled: {candidate.ride_date} at {candidate.departure_time} &bull; Pooled Fare: ₹{candidate.potential_pooled_fare} (Save 30%)
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {candidate.invite_status === 'none' && (
                      <button
                        type="button"
                        onClick={() => handleSendOrAcceptInvite(candidate.ride_id, 'send')}
                        disabled={processingInviteId === candidate.ride_id}
                        className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {processingInviteId === candidate.ride_id ? 'Sending Invite...' : 'Send Pool Invite'}
                      </button>
                    )}

                    {candidate.invite_status === 'pending' && (
                      <div className="flex items-center gap-2">
                        {candidate.is_sender ? (
                          <span className="text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            Invite Sent &bull; Awaiting Rider Response
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                            Ride on this route invited you to pool
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSendOrAcceptInvite(candidate.ride_id, 'accept')}
                          disabled={processingInviteId === candidate.ride_id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1"
                          title="Accept invite and pool trips together"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          {processingInviteId === candidate.ride_id ? 'Pooling...' : 'Accept & Join Pool'}
                        </button>
                      </div>
                    )}

                    {candidate.invite_status === 'accepted' && (
                      <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Pool Active &middot; Shared Ride Linked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Trip Details + Payment Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Route & Driver */}
        <div className="md:col-span-2 space-y-6">
          {/* Route Card */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-blue-400">Trip Overview</span>
                <span className="font-mono text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50 font-bold">
                  {formatFriendlyId(ride.ride_id, 'RIDE')}
                </span>
              </div>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {ride.ride_date || 'Today'} &middot; {ride.departure_time || 'Immediate'}
                {ride.is_scheduled ? (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    📅 Scheduled
                  </span>
                ) : (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⚡ Ride Now
                  </span>
                )}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Pickup</span>
                  <span className="text-base font-semibold text-white">{ride.pickup_location}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 mt-1 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Dropoff</span>
                  <span className="text-base font-semibold text-white">{ride.dropoff_location}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver & Vehicle Card */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-indigo-400">Assigned Driver</span>
                <span className="font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/50 font-bold">
                  {formatFriendlyId(driver?.driver_id, 'DRV')}
                </span>
              </div>
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {driver?.ratings ? Number(driver.ratings).toFixed(1) : '5.0'} Rating
              </span>
            </div>

            {driver ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Driver Details</span>
                  <div className="font-semibold text-white text-base flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {driver.driver_name}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {driver.phone_no || '9811223344'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">Lic: {driver.license_no || 'DL-KA-01-2019001'}</div>
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Vehicle Details</span>
                    <span className="font-mono text-blue-300 text-[10px] bg-blue-950 px-1.5 py-0.2 rounded">
                      {formatFriendlyId(vehicle?.vehicle_id, 'VEH')}
                    </span>
                  </div>
                  <div className="font-semibold text-white text-base flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-blue-400" />
                    {vehicle?.vehicle_number || 'KA-01-AB-1234'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {vehicle?.vehicle_type || 'Sedan'} &middot; {vehicle?.capacity || 4} Passenger Capacity
                  </div>
                  <div className="text-[11px] text-emerald-400/90 font-medium">
                    Seats Available: {(vehicle?.capacity || 4) - totalRiders}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">No driver assigned</div>
            )}
          </div>
        </div>

        {/* Right Col: Payment & Billing */}
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wider text-emerald-400">Payment</span>
                  <span className="font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50 font-bold">
                    {formatFriendlyId(payment?.payment_id, 'PAY')}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                    isPaid
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {isPaid ? 'Completed' : 'Pending'}
                </span>
              </div>

              {/* Price Display */}
              <div className="my-4 text-center">
                <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                  Confirmed Fare to Pay
                </span>
                <div className="text-4xl font-extrabold text-white tracking-tight">₹{payment?.amount ?? ride.fare}</div>
                {ride.ride_type === 'shared' && (
                  <span className="text-[11px] text-emerald-400 mt-1 block font-semibold flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" /> Includes Dynamic Pooling Discount
                  </span>
                )}
              </div>

              {/* Payment Action */}
              {!isPaid ? (
                <div className="space-y-3 mt-6">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Select Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/60 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="UPI (Google Pay)">UPI (Google Pay)</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>

                  <button
                    onClick={handlePayNow}
                    disabled={isPaying}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isPaying ? 'Processing...' : `Pay Now (₹${payment?.amount ?? ride.fare})`}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 text-center mt-6 space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-emerald-200">Paid in Full</div>
                  <div className="text-[11px] text-emerald-400/80">Mode: {payment?.payment_mode}</div>

                  {payment?.refund_amount && payment.refund_amount > 0 ? (
                    <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 text-left space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-200">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        ₹{payment.refund_amount} Pooling Refund Processed
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        Dynamic discount applied. Excess ₹{payment.refund_amount} credited to your {payment.payment_mode || 'UPI'}.
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews & Feedback Section — UNLOCKED ONLY WHEN RIDE IS COMPLETED! */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Trip Feedback & Driver Rating
            </h3>
          </div>
          {!isCompleted && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Unlocks after trip completion
            </span>
          )}
        </div>

        {isCompleted ? (
          /* Active Review Form once completed */
          <form onSubmit={handleReviewSubmit} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300">Rate Driver:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        selectedRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Share your experience (e.g. clean vehicle, polite driving)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSubmittingReview || !comment.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Feedback
              </button>
            </div>
          </form>
        ) : (
          /* Informational placeholder before completion */
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
            Trip is currently in progress. You will be invited to rate {driver?.driver_name || 'the driver'} and leave a review once the vehicle reaches your destination.
          </div>
        )}

        {/* Existing Reviews */}
        {reviewsList.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Past Reviews by You:</span>
            {reviewsList.map((rev) => (
              <div
                key={rev.review_id}
                className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/60 text-xs text-slate-300 flex items-center justify-between"
              >
                <span className="text-slate-300">&ldquo;{rev.comments}&rdquo;</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-amber-400 font-bold text-xs tracking-wider">
                    {'★'.repeat(rev.rating || 5)}{'☆'.repeat(Math.max(0, 5 - (rev.rating || 5)))}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono font-bold">({rev.rating || 5}/5)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Ride Modal (Policy: Allowed up to 3 hours before departure) */}
      {showEditModal && (() => {
        const previewDistAndFare = calculateFareForLocations(editPickup, editDropoff);
        const previewRiderCount = editRideType === 'shared' ? Math.max(2, totalRiders) : 1;
        const previewFareObj = calculateDynamicFare(previewDistAndFare.fare, editRideType, previewRiderCount);
        const previewFinalFare = previewFareObj.finalFare;
        const originalPaidAmount = isPaid ? (payment?.amount ?? ride.fare) + (payment?.refund_amount || 0) : null;
        const previewRefund = originalPaidAmount && previewFinalFare < originalPaidAmount
          ? Math.round(originalPaidAmount - previewFinalFare)
          : 0;
        const previewBalance = originalPaidAmount && previewFinalFare > originalPaidAmount
          ? Math.round(previewFinalFare - originalPaidAmount)
          : 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-400" />
                    Modify Trip (3-Hour Policy)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust route, switch to shared pool, match corridor rides, or recalculate fares.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleEditRide} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Pickup Location
                    </label>
                    <select
                      value={editPickup}
                      onChange={(e) => setEditPickup(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {locations.map((l) => (
                        <option key={l.name} value={l.name}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Dropoff Location
                    </label>
                    <select
                      value={editDropoff}
                      onChange={(e) => setEditDropoff(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {locations.map((l) => (
                        <option key={l.name} value={l.name}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Departure Time
                    </label>
                    <input
                      type="time"
                      value={editDepartureTime}
                      onChange={(e) => setEditDepartureTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Trip Mode
                  </label>
                  <select
                    value={editRideType}
                    onChange={(e) => setEditRideType(e.target.value as RideType)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="solo">Solo Cab (Private Vehicle, Standard Fare)</option>
                    <option value="shared">Shared Cab (Multi-Rider Pool &middot; 30% Discount)</option>
                  </select>
                </div>

                {/* Real-time Fare & Adjustment Preview */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-900/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Base Distance & Standard Fare:</span>
                    <span className="font-mono text-white">{previewDistAndFare.distanceKm} km &middot; ₹{previewDistAndFare.fare}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Selected Mode:</span>
                    <span className="font-semibold text-slate-200">
                      {editRideType === 'shared' ? 'Shared Cab (30% Pooling Discount)' : 'Solo Cab'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-bold">
                    <span className="text-white">New Confirmed Fare:</span>
                    <span className="text-emerald-400 text-sm font-mono">₹{previewFinalFare}</span>
                  </div>

                  {isPaid ? (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Amount Previously Paid:</span>
                        <span className="font-mono text-white">₹{originalPaidAmount}</span>
                      </div>
                      {previewRefund > 0 ? (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            Instant Partial Refund:
                          </span>
                          <span className="font-mono text-emerald-400 text-sm font-bold">₹{previewRefund}</span>
                        </div>
                      ) : previewBalance > 0 ? (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            Balance Due to Pay:
                          </span>
                          <span className="font-mono text-amber-400 text-sm font-bold">₹{previewBalance}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 text-right">No price adjustment needed</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      Payable invoice will update to ₹{previewFinalFare} upon saving.
                    </div>
                  )}
                </div>

                {/* Corridor Matched Booked Rides */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Booked Riders on Route Corridor
                    </label>
                    <button
                      type="button"
                      onClick={fetchMatchedBookedRides}
                      disabled={loadingMatches}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingMatches ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {matchedBookedRides.length === 0 ? (
                    <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl text-xs text-slate-500 text-center">
                      No other active booked rides currently overlap with {editPickup} &rarr; {editDropoff}.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {matchedBookedRides.map((candidate) => (
                        <div
                          key={candidate.ride_id}
                          className="p-3 bg-slate-950/80 border border-indigo-900/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{candidate.rider_name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                                {candidate.pickup_location} &rarr; {candidate.dropoff_location}
                              </span>
                            </div>
                            <div className="text-[11px] text-emerald-400 font-medium">
                              {candidate.corridor_description}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Booked for {candidate.ride_date} at {candidate.departure_time} &middot; Save 30% dynamically
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {candidate.invite_status === 'none' && (
                              <button
                                type="button"
                                onClick={() => handleSendOrAcceptInvite(candidate.ride_id, 'send')}
                                disabled={processingInviteId === candidate.ride_id}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-all flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                {processingInviteId === candidate.ride_id ? 'Sending...' : 'Send Pool Invite'}
                              </button>
                            )}

                            {candidate.invite_status === 'pending' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                  Invite Sent
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSendOrAcceptInvite(candidate.ride_id, 'accept')}
                                  disabled={processingInviteId === candidate.ride_id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all"
                                  title="Accept invite and pool trips together"
                                >
                                  {processingInviteId === candidate.ride_id ? 'Pooling...' : 'Accept & Pool'}
                                </button>
                              </div>
                            )}

                            {candidate.invite_status === 'accepted' && (
                              <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Pooled & Shared
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20"
                  >
                    {isUpdating ? 'Saving Changes...' : 'Save & Apply Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
