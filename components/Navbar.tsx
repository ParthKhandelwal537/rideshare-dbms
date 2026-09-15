'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Car, LayoutDashboard, PlusCircle, Database, UserCheck, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: currentUser ? 'Dashboard' : 'Home', href: currentUser ? '/dashboard' : '/', icon: LayoutDashboard },
    { label: 'Book Ride', href: '/book', icon: PlusCircle },
    { label: 'Admin / Live DB', href: '/admin', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">RideShare</span>
            <span className="text-xs text-slate-400 block -mt-0.5">Urban Mobility &amp; Ride Pooling</span>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User state */}
        <div className="flex items-center gap-3">
          {!mounted ? (
            <div className="w-20 h-8" />
          ) : currentUser ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full pl-3 pr-2 py-1">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">{currentUser.name}</span>
              <button
                onClick={logout}
                title="Switch User / Logout"
                className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
