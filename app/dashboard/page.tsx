'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Ride, Payment, Driver } from '@/lib/types';
import { PlusCircle, Calendar, MapPin, ArrowRight, ShieldCheck, Clock, CheckCircle2, Car, Trash2, AlertTriangle, Users, Sparkles, Radio } from 'lucide-react';

interface EnhancedRide extends Ride {
  payment?: Payment;
  driver?: Driver;
}

interface DashboardInvite {
  invite_id: string;
  sender_ride_id: string;
  receiver_ride_id: string;
  sender_user_id: string;
  sender_name: string;
  receiver_user_id: string;
  receiver_name: string;
  sender_pickup?: string;
  sender_dropoff?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const { showToast } = useToast();

  const [rides, setRides] = useState<EnhancedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [invites, setInvites] = useState<DashboardInvite[]>([]);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  const fetchRides = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/rides?user_id=${currentUser.user_id}`);
      const data = await res.json();

      if (res.ok && data.data) {
        // Fetch linked payments to show live status badge
        const paymentsRes = await fetch('/api/payments');
        const paymentsData = await paymentsRes.json();
        const paymentsMap: Record<string, Payment> = {};
        if (paymentsData.data) {
          paymentsData.data.forEach((p: Payment) => {
            paymentsMap[p.ride_id] = p;
          });
        }

        const driversRes = await fetch('/api/drivers');
        const driversData = await driversRes.json();
        const driversMap: Record<string, Driver> = {};
        if (driversData.data) {
          driversData.data.forEach((d: Driver) => {
            driversMap[d.driver_id] = d;
          });
        }

        const combined: EnhancedRide[] = data.data.map((r: Ride) => ({
          ...r,
          payment: paymentsMap[r.ride_id],
          driver: driversMap[r.driver_id]
        }));

        setRides(combined);
      }

      // Fetch pending invites where current user is receiver
      const invitesRes = await fetch(`/api/invites?user_id=${currentUser.user_id}`);
      const invitesData = await invitesRes.json();
      if (invitesRes.ok && Array.isArray(invitesData.data)) {
        setInvites(invitesData.data);
      }
    } catch {
      showToast('Failed to load ride history', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  const handleRespondToInvite = async (invite: DashboardInvite, action: 'accept' | 'decline') => {
    setRespondingInviteId(invite.invite_id);
    try {
      const res = await fetch(`/api/rides/${invite.receiver_ride_id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_ride_id: invite.sender_ride_id,
          action
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update invite');

      showToast(data.message, 'success');
      await fetchRides();
    } catch (err: any) {
      showToast(err.message || 'Error updating invite', 'error');
    } finally {
      setRespondingInviteId(null);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const totalSpent = rides.reduce((acc, r) => acc + (Number(r.fare) || 0), 0);
  const pendingRides = rides.filter(r => r.payment?.payment_status === 'pending');
  const completedRides = rides.filter(r => r.payment?.payment_status === 'completed');

  const handleDeleteSelfAccount = async () => {
    if (!currentUser) return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch(`/api/users/${currentUser.user_id}?cascade=true`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete account');

      showToast('Your account and associated trips have been removed from the database.', 'success');
      logout();
      router.push('/login');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-900/30 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Rider Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {mounted && currentUser ? currentUser.name : 'Rider'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your trips, payment receipts, and book new destinations in Bangalore.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] shrink-0"
          >
            <PlusCircle className="w-5 h-5" />
            Book a Ride
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 hover:border-rose-800/60 hover:text-rose-300 border border-slate-800 text-slate-400 text-xs font-semibold transition-all shadow-sm shrink-0"
            title="Delete your profile and details from database"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Delete Profile</span>
          </button>
        </div>
      </div>

      {/* PENDING POOLING INVITES BANNER (Alert when another rider invited you to pool!) */}
      {invites.filter(inv => inv.receiver_user_id === currentUser?.user_id && inv.status === 'pending').length > 0 && (
        <div className="bg-gradient-to-r from-indigo-950/80 via-blue-950/60 to-slate-900 border-2 border-indigo-500/50 rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-800/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Ride Pooling Invitations Received
              </h2>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              {invites.filter(inv => inv.receiver_user_id === currentUser?.user_id && inv.status === 'pending').length} Pending
            </span>
          </div>

          <div className="space-y-2.5">
            {invites
              .filter(inv => inv.receiver_user_id === currentUser?.user_id && inv.status === 'pending')
              .map(inv => (
                <div
                  key={inv.invite_id}
                  className="bg-slate-950/80 border border-indigo-900/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Ride Available on This Route!</span>
                      {inv.sender_pickup && inv.sender_dropoff && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                          {inv.sender_pickup} &rarr; {inv.sender_dropoff}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      There is an active ride in this route available to pool cabs together! Accepting will merge your trips into a shared vehicle, reducing both fares by <strong>30%</strong> (automated refund if you already paid).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRespondToInvite(inv, 'decline')}
                      disabled={respondingInviteId === inv.invite_id}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespondToInvite(inv, 'accept')}
                      disabled={respondingInviteId === inv.invite_id}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all hover:scale-105"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {respondingInviteId === inv.invite_id ? 'Pooling...' : 'Accept & Join Pool'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Rides</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{rides.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total trips booked</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pending Payments</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{pendingRides.length}</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting completion</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Completed Trips</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completedRides.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total ₹{totalSpent} processed</div>
        </div>
      </div>

      {/* Rides List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Trip History</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {rides.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800/60">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Loading your trips...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800/60">
            <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-200">No rides found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              You haven&apos;t booked any trips yet. Click below to book your first ride.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Book Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rides.map((ride) => {
              const isPaid = ride.payment?.payment_status === 'completed';
              return (
                <div
                  key={ride.ride_id}
                  className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition-all hover:shadow-blue-500/5 group flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Date & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>{ride.ride_date || 'Today'}</span>
                        {ride.departure_time && (
                          <span className="text-slate-500 font-mono text-[11px]">({ride.departure_time})</span>
                        )}
                        {ride.is_scheduled ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                            📅 Scheduled
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            ⚡ Ride Now
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {isPaid ? 'Paid' : 'Pending Payment'}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="space-y-2 mb-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                      <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="truncate">{ride.pickup_location}</span>
                      </div>
                      <div className="w-0.5 h-3 bg-slate-700 ml-1" />
                      <div className="flex items-center gap-2.5 text-sm font-medium text-slate-200">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{ride.dropoff_location}</span>
                      </div>
                    </div>

                    {/* Shared Ride Matching Status Notification */}
                    {ride.ride_type === 'shared' && (
                      (!ride.co_riders || ride.co_riders.length === 0) ? (
                        <div className="mb-3.5 p-3 rounded-xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-indigo-500/40 flex items-center gap-2.5 text-xs text-indigo-200 shadow-sm animate-in fade-in-50">
                          <Radio className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>Matching in Progress</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">FCFS</span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-0.5">
                              We are trying to match you with other people along your route. Auto-invites dispatched!
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3.5 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in-50">
                          <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            <strong>Pooled Cab:</strong> Ride shared along this route ({ride.co_riders.length} co-rider joined) &bull; 30% discount applied
                          </span>
                        </div>
                      )
                    )}

                    {/* Driver summary if assigned */}
                    {ride.driver && (
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Driver: <strong className="text-slate-200">{ride.driver.driver_name}</strong></span>
                        </div>
                        <span className="text-amber-400 font-medium">★ {ride.driver.ratings || '5.0'}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: Fare & Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/70">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Calculated Fare</span>
                      <span className="text-lg font-bold text-white tracking-tight">₹{ride.fare}</span>
                    </div>

                    <Link
                      href={`/rides/${ride.ride_id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors group-hover:bg-blue-600 group-hover:text-white"
                    >
                      <span>Manage Trip</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Delete Self Account Confirmation */}
      {showDeleteModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Rider Account?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to delete your profile (<strong className="text-white">{currentUser.name}</strong> &bull; {currentUser.email})?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Database Cleanup Notice:</div>
              <div>• All trips and payments associated with this account will be removed.</div>
              <div>• You will be logged out immediately.</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSelfAccount}
                disabled={isDeletingAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingAccount ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
