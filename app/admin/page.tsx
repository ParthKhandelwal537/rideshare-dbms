'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useToast } from '@/context/ToastContext';
import { User, Driver, Vehicle, Ride, Payment, Review, RideFullDetails } from '@/lib/types';
import { formatFriendlyId } from '@/lib/idHelper';
import {
  Database,
  Users,
  Car,
  UserCheck,
  CreditCard,
  MessageSquare,
  Plus,
  RefreshCw,
  Eye,
  Radio,
  Sparkles,
  Star,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function AdminDemoPage() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'view' | 'users' | 'drivers' | 'vehicles' | 'rides' | 'payments' | 'reviews'>('view');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Table Data States
  const [fullDetails, setFullDetails] = useState<RideFullDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Add Driver Form State
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  // Add Vehicle Form State
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [vehicleCapacity, setVehicleCapacity] = useState('4');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  // Fetch all tables from API
  const fetchOverviewData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);

      const res = await fetch('/api/admin/overview');
      const data = await res.json();

      if (res.ok && data.data) {
        setFullDetails(data.data.fullDetails || []);
        setUsers(data.data.tables.users || []);
        setDrivers(data.data.tables.drivers || []);
        setVehicles(data.data.tables.vehicles || []);
        setRides(data.data.tables.rides || []);
        setPayments(data.data.tables.payments || []);
        setReviews(data.data.tables.reviews || []);

        if (data.data.tables.drivers?.length > 0 && !selectedDriverId) {
          setSelectedDriverId(data.data.tables.drivers[0].driver_id);
        }
      }
    } catch {
      showToast('Error loading database tables', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDriverId, showToast]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  // Setup Supabase Realtime Subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('admin-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          showToast(`Live DB update: ${payload.eventType} on ${payload.table}`, 'info');
          fetchOverviewData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOverviewData, showToast]);

  // Handle Add Driver (Without manual rating input!)
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName) return;

    setIsAddingDriver(true);
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_name: driverName,
          phone_no: driverPhone,
          license_no: driverLicense
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to add driver');

      showToast('Driver added (Default 5.0 rating).', 'success');
      setShowAddDriver(false);
      setDriverName('');
      setDriverPhone('');
      setDriverLicense('');
      fetchOverviewData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to add driver', 'error');
    } finally {
      setIsAddingDriver(false);
    }
  };

  // Handle Add Vehicle (1:1 UNIQUE driver_id)
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber || !selectedDriverId) return;

    setIsAddingVehicle(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_number: vehicleNumber,
          vehicle_type: vehicleType,
          capacity: parseInt(vehicleCapacity, 10),
          driver_id: selectedDriverId
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to add vehicle');

      showToast('Vehicle added.', 'success');
      setShowAddVehicle(false);
      setVehicleNumber('');
      fetchOverviewData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to add vehicle', 'error');
    } finally {
      setIsAddingVehicle(false);
    }
  };

  // Delete User with Relational Cascade
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.user_id}?cascade=true`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');

      showToast(`User "${userToDelete.name}" and associated records deleted.`, 'success');
      setUserToDelete(null);
      fetchOverviewData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const tabs = [
    { id: 'view', label: 'View: ride_full_details', count: fullDetails.length, icon: Eye },
    { id: 'rides', label: 'rides', count: rides.length, icon: Car },
    { id: 'payments', label: 'payments', count: payments.length, icon: CreditCard },
    { id: 'users', label: 'users', count: users.length, icon: Users },
    { id: 'drivers', label: 'drivers', count: drivers.length, icon: UserCheck },
    { id: 'vehicles', label: 'vehicles', count: vehicles.length, icon: Car },
    { id: 'reviews', label: 'reviews', count: reviews.length, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Admin Evaluation Console</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Supabase Realtime Sync Active</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Database className="w-7 h-7 text-blue-500" />
            Live Database Inspector
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Inspect all 6 relational tables and the joined <code className="text-blue-300 font-mono text-xs">ride_full_details</code> view in real time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddDriver(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            Add Driver
          </button>

          <button
            onClick={() => setShowAddVehicle(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            Add Vehicle
          </button>

          <button
            onClick={() => fetchOverviewData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors shadow-sm"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area with Friendly IDs */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Querying live schema...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* VIEW: ride_full_details */}
            {activeTab === 'view' && (
              <div>
                {/* search bar */}

                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Ride ID</th>
                      <th className="p-3.5">Route</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Fare</th>
                      <th className="p-3.5">Rider</th>
                      <th className="p-3.5">Driver</th>
                      <th className="p-3.5">Vehicle</th>
                      <th className="p-3.5">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {fullDetails.map((row) => (
                      <tr key={row.ride_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono text-blue-400 font-bold" title={row.ride_id}>
                          {formatFriendlyId(row.ride_id, 'RIDE')}
                        </td>
                        <td className="p-3.5 font-medium text-white">{row.pickup_location} → {row.dropoff_location}</td>
                        <td className="p-3.5">{row.ride_date}</td>
                        <td className="p-3.5 font-bold text-emerald-400">₹{row.fare}</td>
                        <td className="p-3.5">{row.rider_name}</td>
                        <td className="p-3.5">{row.driver_name || 'Unassigned'}</td>
                        <td className="p-3.5 font-mono text-slate-300">{row.vehicle_number || 'None'}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              row.payment_status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {row.payment_status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABLE: users */}
            {activeTab === 'users' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">user_id (PK)</th>
                    <th className="p-3.5">name</th>
                    <th className="p-3.5">email (UNIQUE)</th>
                    <th className="p-3.5">number</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-blue-400 font-bold" title={u.user_id}>
                        {formatFriendlyId(u.user_id, 'USER')}
                      </td>
                      <td className="p-3.5 font-semibold text-white">{u.name}</td>
                      <td className="p-3.5 text-blue-400">{u.email}</td>
                      <td className="p-3.5">{u.number || '—'}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-rose-100 text-xs font-semibold transition-all hover:scale-105"
                          title="Delete user from database"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TABLE: drivers */}
            {activeTab === 'drivers' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">driver_id (PK)</th>
                    <th className="p-3.5">driver_name</th>
                    <th className="p-3.5">phone_no</th>
                    <th className="p-3.5">license_no</th>
                    <th className="p-3.5">ratings (From Reviews)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {drivers.map((d) => (
                    <tr key={d.driver_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-indigo-400 font-bold" title={d.driver_id}>
                        {formatFriendlyId(d.driver_id, 'DRV')}
                      </td>
                      <td className="p-3.5 font-semibold text-white">{d.driver_name}</td>
                      <td className="p-3.5">{d.phone_no || '—'}</td>
                      <td className="p-3.5 font-mono text-slate-400">{d.license_no || '—'}</td>
                      <td className="p-3.5 text-amber-400 font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {d.ratings ? Number(d.ratings).toFixed(1) : '5.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TABLE: vehicles */}
            {activeTab === 'vehicles' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">vehicle_id (PK)</th>
                    <th className="p-3.5">vehicle_number</th>
                    <th className="p-3.5">vehicle_type</th>
                    <th className="p-3.5">capacity (Capacity Constraint)</th>
                    <th className="p-3.5">driver_id (FK & UNIQUE)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vehicles.map((v) => (
                    <tr key={v.vehicle_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-blue-400 font-bold" title={v.vehicle_id}>
                        {formatFriendlyId(v.vehicle_id, 'VEH')}
                      </td>
                      <td className="p-3.5 font-semibold text-white font-mono">{v.vehicle_number}</td>
                      <td className="p-3.5">{v.vehicle_type}</td>
                      <td className="p-3.5 font-bold text-emerald-400">{v.capacity || 4} Passengers</td>
                      <td className="p-3.5 font-mono text-indigo-400" title={v.driver_id}>
                        {formatFriendlyId(v.driver_id, 'DRV')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TABLE: rides */}
            {activeTab === 'rides' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ride_id (PK)</th>
                    <th className="p-3.5">user_id (FK)</th>
                    <th className="p-3.5">driver_id (FK)</th>
                    <th className="p-3.5">Route</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Fare (Trigger)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rides.map((r) => (
                    <tr key={r.ride_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-blue-400 font-bold" title={r.ride_id}>
                        {formatFriendlyId(r.ride_id, 'RIDE')}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400" title={r.user_id}>
                        {formatFriendlyId(r.user_id, 'USER')}
                      </td>
                      <td className="p-3.5 font-mono text-indigo-400" title={r.driver_id}>
                        {formatFriendlyId(r.driver_id, 'DRV')}
                      </td>
                      <td className="p-3.5 font-medium text-white">{r.pickup_location} → {r.dropoff_location}</td>
                      <td className="p-3.5">{r.ride_date}</td>
                      <td className="p-3.5 font-bold text-emerald-400">₹{r.fare}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TABLE: payments */}
            {activeTab === 'payments' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">payment_id (PK)</th>
                    <th className="p-3.5">ride_id (FK & UNIQUE)</th>
                    <th className="p-3.5">payment_mode</th>
                    <th className="p-3.5">amount</th>
                    <th className="p-3.5">payment_status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payments.map((p) => (
                    <tr key={p.payment_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-emerald-400 font-bold" title={p.payment_id}>
                        {formatFriendlyId(p.payment_id, 'PAY')}
                      </td>
                      <td className="p-3.5 font-mono text-blue-400" title={p.ride_id}>
                        {formatFriendlyId(p.ride_id, 'RIDE')}
                      </td>
                      <td className="p-3.5">{p.payment_mode || '—'}</td>
                      <td className="p-3.5 font-bold text-white">₹{p.amount}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.payment_status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {p.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TABLE: reviews */}
            {activeTab === 'reviews' && (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">review_id (PK)</th>
                    <th className="p-3.5">user_id (FK)</th>
                    <th className="p-3.5">comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reviews.map((rev) => (
                    <tr key={rev.review_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-amber-400 font-bold" title={rev.review_id}>
                        {formatFriendlyId(rev.review_id, 'REV')}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400" title={rev.user_id}>
                        {formatFriendlyId(rev.user_id, 'USER')}
                      </td>
                      <td className="p-3.5 text-white">&ldquo;{rev.comments}&rdquo;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal: Add Driver (Manual rating removed!) */}
      {showAddDriver && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-white">Add Driver (drivers Table)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ratings start at 5.0 (New Driver) and are dynamically updated by rider reviews.
              </p>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Driver Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand R"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="9844556677"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">License No</label>
                <input
                  type="text"
                  placeholder="DL-KA-04-2022004"
                  value={driverLicense}
                  onChange={(e) => setDriverLicense(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Initial Rating: <strong>5.0 ★ (New Driver)</strong>. Updated dynamically via rider reviews.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDriver(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingDriver}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
                >
                  {isAddingDriver ? 'Adding...' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Vehicle */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div>
              <h3 className="text-lg font-bold text-white">Add Vehicle</h3>
              <p className="text-xs text-slate-400 mt-1">
                Register and assign a vehicle to an active driver.
              </p>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Assign to Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  {drivers.map((d) => (
                    <option key={d.driver_id} value={d.driver_id}>
                      {d.driver_name} ({formatFriendlyId(d.driver_id, 'DRV')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Vehicle Number</label>
                <input
                  type="text"
                  required
                  placeholder="KA-04-GH-3456"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Type</label>
                <input
                  type="text"
                  placeholder="Sedan / SUV / Hatchback"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Passenger Capacity</label>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={vehicleCapacity}
                  onChange={(e) => setVehicleCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingVehicle}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  {isAddingVehicle ? 'Adding...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete User from Database?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently delete <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email})?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Relational Cascade Notice:</div>
              <div>• Any booked rides and associated payments linked to this rider will be removed.</div>
              <div>• Any reviews written by this rider will be cleaned up.</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingUser ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
