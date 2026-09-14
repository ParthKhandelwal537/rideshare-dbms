'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { User } from '@/lib/types';
import {
  Car,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  UserPlus,
  LogIn,
  Smartphone,
  Copy,
  RotateCcw,
  Check,
  ShieldAlert
} from 'lucide-react';

const DEMO_USERS: User[] = [
  { user_id: '11111111-1111-1111-1111-111111111111', name: 'Parth Sharma', email: 'parth@example.com', number: '9876543210' },
  { user_id: '22222222-2222-2222-2222-222222222222', name: 'Aarav Patel', email: 'aarav@example.com', number: '9123456780' },
  { user_id: '33333333-3333-3333-3333-333333333333', name: 'Sneha Rao', email: 'sneha@example.com', number: '9988776655' }
];

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useAuth();
  const { showToast } = useToast();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<'input' | 'otp'>('input');

  // Sign In inputs
  const [signInIdentifier, setSignInIdentifier] = useState('');

  // Sign Up inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');

  // OTP Simulator State
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Status & validation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestionAction, setSuggestionAction] = useState<'switch_to_signup' | 'switch_to_signin' | null>(null);

  // Timer countdown for resending OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCountdown]);

  // Switch tabs
  const handleTabChange = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setStep('input');
    setErrorMessage(null);
    setSuggestionAction(null);
    setOtpError(null);
    setEnteredOtp('');
  };

  // Trigger Send OTP with strict existence check
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuggestionAction(null);
    setOtpError(null);

    setIsSubmitting(true);
    try {
      // 1. Fetch current users list
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      const currentUsers: User[] = usersData.success && Array.isArray(usersData.data) ? usersData.data : [];

      if (authMode === 'signin') {
        // --- SIGN IN MODE: User must already exist ---
        const identifier = signInIdentifier.trim();
        if (!identifier) {
          showToast('Please enter your registered email address or mobile number.', 'error');
          setIsSubmitting(false);
          return;
        }

        const cleanInput = identifier.toLowerCase();
        const matched = currentUsers.find((u) => {
          const emailMatch = u.email && u.email.toLowerCase() === cleanInput;
          const phoneMatch = u.number && (u.number === identifier || u.number.replace(/\D/g, '') === identifier.replace(/\D/g, ''));
          return emailMatch || phoneMatch;
        });

        if (!matched) {
          const isEmailLike = identifier.includes('@');
          const msg = `No registered account found with ${isEmailLike ? 'email' : 'mobile number'} "${identifier}". Please create a new account.`;
          setErrorMessage(msg);
          setSuggestionAction('switch_to_signup');
          showToast('Account not found. Please Sign Up first.', 'error');
          setIsSubmitting(false);
          return;
        }

        // Account exists! Proceed to OTP Simulator
        setVerifiedUser(matched);
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedOtp(otp);
        setResendCountdown(30);
        setStep('otp');
        setEnteredOtp(''); // Clear so user can type or click auto-fill
        showToast(`📱 Simulated OTP sent to ${matched.name}: ${otp}`, 'info');

      } else {
        // --- SIGN UP MODE: User must NOT already exist ---
        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPhone = number.trim();

        if (!trimmedName || !trimmedEmail || !trimmedPhone) {
          showToast('Name, email, and mobile number are all required for registration.', 'error');
          setIsSubmitting(false);
          return;
        }

        // Check if email already exists
        const existingEmailUser = currentUsers.find(
          (u) => u.email && u.email.toLowerCase() === trimmedEmail
        );
        if (existingEmailUser) {
          const msg = `An account with email "${trimmedEmail}" already exists (${existingEmailUser.name}). Please Sign In instead.`;
          setErrorMessage(msg);
          setSuggestionAction('switch_to_signin');
          showToast('This email is already registered! Please sign in.', 'error');
          setIsSubmitting(false);
          return;
        }

        // Check if mobile number already exists
        const cleanPhone = trimmedPhone.replace(/\D/g, '');
        const existingPhoneUser = currentUsers.find(
          (u) => u.number && (u.number === trimmedPhone || u.number.replace(/\D/g, '') === cleanPhone)
        );
        if (existingPhoneUser) {
          const msg = `An account with mobile number "${trimmedPhone}" already exists (${existingPhoneUser.name}). Please Sign In instead.`;
          setErrorMessage(msg);
          setSuggestionAction('switch_to_signin');
          showToast('This mobile number is already registered! Please sign in.', 'error');
          setIsSubmitting(false);
          return;
        }

        // Details are unique! Proceed to OTP Simulator
        setVerifiedUser(null);
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        setGeneratedOtp(otp);
        setResendCountdown(30);
        setStep('otp');
        setEnteredOtp('');
        showToast(`📱 Simulated SMS OTP sent to ${trimmedPhone}: ${otp}`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Verification failed. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP in simulator
  const handleResendOtp = () => {
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);
    setResendCountdown(30);
    setOtpError(null);
    setEnteredOtp('');
    showToast(`📱 New simulated OTP dispatched: ${newOtp}`, 'info');
  };

  // 1-Click Copy Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedOtp);
    setCopied(true);
    showToast(`Code ${generatedOtp} copied to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // 1-Click Auto-Fill Code
  const handleAutofillCode = () => {
    setEnteredOtp(generatedOtp);
    setOtpError(null);
    showToast(`Code ${generatedOtp} auto-filled.`, 'success');
  };

  // Verify OTP and complete authentication
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setOtpError(`Invalid OTP code "${enteredOtp}". Code does not match the 4-digit code (${generatedOtp}) shown in the simulated notification.`);
      showToast('Invalid OTP entered. Please check code.', 'error');
      return;
    }

    setOtpError(null);
    setIsSubmitting(true);
    try {
      if (authMode === 'signup') {
        // Create user in database
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            number: number.trim()
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Account registration failed.');

        setCurrentUser(data.data);
        showToast(`Account created successfully! Welcome to RideShare, ${name.trim()}!`, 'success');
        router.push('/dashboard');
      } else {
        // Sign In with verified registered user
        if (verifiedUser) {
          setCurrentUser(verifiedUser);
          showToast(`Welcome back, ${verifiedUser.name}!`, 'success');
          router.push('/dashboard');
        } else {
          showToast('Session error. Please sign in again.', 'error');
          setStep('input');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click login for demo accounts
  const handleQuickLogin = (user: User) => {
    setCurrentUser(user);
    showToast(`Logged in as ${user.name}`, 'success');
    router.push('/dashboard');
  };

  // Quick switch from notification action
  const handlePerformSuggestion = () => {
    if (suggestionAction === 'switch_to_signup') {
      const isEmail = signInIdentifier.includes('@');
      if (isEmail) setEmail(signInIdentifier);
      else setNumber(signInIdentifier);
      handleTabChange('signup');
    } else if (suggestionAction === 'switch_to_signin') {
      if (email) setSignInIdentifier(email);
      else if (number) setSignInIdentifier(number);
      handleTabChange('signin');
    }
  };

  return (
    <div className="max-w-md mx-auto my-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3 shadow-inner">
          <Car className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {step === 'otp'
            ? 'Verify Verification Code'
            : authMode === 'signup'
            ? 'Create Rider Profile'
            : 'Sign In to RideShare'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {step === 'otp'
            ? `Enter the 4-digit code sent to ${authMode === 'signup' ? number || email : signInIdentifier}`
            : authMode === 'signup'
            ? 'Register as a new rider with phone & email verification'
            : 'Enter your registered email or mobile number to continue'}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
        
        {/* Auth Mode Toggle Tabs (Sign In vs Sign Up) */}
        {step === 'input' && (
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                authMode === 'signin'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                authMode === 'signup'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>
        )}

        {/* Validation & Notification Alert Box */}
        {errorMessage && step === 'input' && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 animate-in fade-in space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
            {suggestionAction && (
              <div className="pt-2 border-t border-rose-900/50 flex justify-end">
                <button
                  type="button"
                  onClick={handlePerformSuggestion}
                  className="px-3 py-1 bg-rose-600/40 hover:bg-rose-600/60 border border-rose-500/50 text-white rounded-lg text-xs font-semibold transition-all"
                >
                  {suggestionAction === 'switch_to_signup' ? 'Switch to Create Account →' : 'Switch to Sign In →'}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'input' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            
            {/* SIGN IN FORM (Existing User) */}
            {authMode === 'signin' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number or Email Address
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210 or parth@example.com"
                    value={signInIdentifier}
                    onChange={(e) => {
                      setSignInIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Checks database: only registered riders can sign in.
                </span>
              </div>
            ) : (
              /* SIGN UP FORM (New User) */
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Malhotra"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="vikram@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Must be unique; checked against existing accounts.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mobile Number (for SMS Verification)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="9812345678"
                      value={number}
                      onChange={(e) => {
                        setNumber(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Must be unique; verified via one-time password.
                  </span>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <span>Checking Database...</span>
              ) : (
                <>
                  <span>{authMode === 'signin' ? 'Verify & Send OTP' : 'Send Verification Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* OTP Verification Step with Interactive Smartphone Simulator */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            
            {/* SIMULATED PUSH NOTIFICATION (Smartphone SMS / Email Banner) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500/20 text-indigo-300 border-b border-l border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live SMS / Push Simulator
              </div>

              <div className="flex items-start gap-3 mt-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">Messages • VM-RIDESH</span>
                    <span className="text-[10px] text-slate-400">Just Now</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    RideShare Security: Your one-time verification code is <strong className="text-amber-400 font-mono text-sm px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">{generatedOtp}</strong>. Valid for 5 minutes. Do not share.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-indigo-500/20">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                  To: <strong className="text-slate-200">{authMode === 'signup' ? number || email : signInIdentifier}</strong>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutofillCode}
                    className="px-3 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-semibold border border-blue-500/40 transition-all flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Auto-Fill</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error message if user enters wrong code */}
            {otpError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{otpError}</div>
              </div>
            )}

            {/* 4-Digit Input */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
                Enter 4-Digit Verification Code
              </label>
              <div className="relative max-w-[220px] mx-auto">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  maxLength={4}
                  required
                  autoFocus
                  placeholder="••••"
                  value={enteredOtp}
                  onChange={(e) => {
                    setEnteredOtp(e.target.value.replace(/\D/g, ''));
                    if (otpError) setOtpError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-xl tracking-[0.4em] text-center font-bold text-white focus:outline-none focus:border-blue-500 transition-colors font-mono shadow-inner"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || enteredOtp.length !== 4}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting
                ? 'Verifying...'
                : authMode === 'signup'
                ? 'Verify Code & Create Profile'
                : 'Verify Code & Sign In'}
            </button>

            {/* Resend and Navigation Controls */}
            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setErrorMessage(null);
                  setOtpError(null);
                  setEnteredOtp('');
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change Details
              </button>

              {resendCountdown > 0 ? (
                <span className="text-slate-500 font-mono">
                  Resend code in <strong className="text-slate-400">{resendCountdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Quick Demo Profiles (1-Click Access) */}
      <div className="mt-8 p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Quick Profiles (1-Click Access)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_USERS.map((user) => (
            <button
              key={user.user_id}
              onClick={() => handleQuickLogin(user)}
              className="p-2 text-center rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-200 transition-all hover:scale-[1.02]"
            >
              <div className="text-xs font-semibold truncate">{user.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{user.email.split('@')[0]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
