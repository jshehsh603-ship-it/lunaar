'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  User, Shield, Sparkles, Heart, Globe, Star, Check, Camera, 
  Settings, Award, RefreshCw, Mail, Calendar, ArrowLeft, Trash2, X, Loader2
} from 'lucide-react';
import audioSynth from '../../components/AudioEffects';
import { COUNTRIES } from '../../constants/countries';


interface MatchItem {
  id: string;
  partnerName: string;
  partnerCountry: string;
  duration: string;
  date: string;
}

function ProfileContent() {
  const router = useRouter();

  // Profile data
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'everyone'>('everyone');
  const [country, setCountry] = useState('World');
  const [isPremium, setIsPremium] = useState(false);

  // Account Deletion States
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Stats info
  const [followers, setFollowers] = useState(48);
  const [following, setFollowing] = useState(62);
  const [totalMatches, setTotalMatches] = useState(189);



  // Load profile from localStorage and auto-detect country location
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedUserStr = localStorage.getItem('lunaar_user');
    let parsed: any = null;
    if (savedUserStr) {
      try {
        parsed = JSON.parse(savedUserStr);
        setProfile(parsed);
        setUsername(parsed.username || '');
        setBio(parsed.bio || '');
        setGender(parsed.gender || 'everyone');
        setCountry(parsed.country || 'World');
        setIsPremium(parsed.isPremium || false);
      } catch (e) {}
    }

    // Auto-detect country based on current IP/location
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_name) {
          const detectedCountry = data.country_name;
          
          if (parsed) {
            const hasVip = parsed.isPremium || false;
            // If they don't have VIP, force the country to match their actual location
            if (!hasVip) {
              setCountry(detectedCountry);
              const updated = { ...parsed, country: detectedCountry };
              setProfile(updated);
              localStorage.setItem('lunaar_user', JSON.stringify(updated));
            } else if (!parsed.country || parsed.country === 'World') {
              // If they have VIP but no country is set yet, initialize it
              setCountry(detectedCountry);
              const updated = { ...parsed, country: detectedCountry };
              setProfile(updated);
              localStorage.setItem('lunaar_user', JSON.stringify(updated));
            }
          }
        }
      })
      .catch(() => {});
  }, []);



  // Account Deletion Handlers
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setDeleteError('');
    setDeleteLoading(true);

    try {
      const backendUrl = typeof window !== 'undefined' && (window.location.port === '3000' || window.location.hostname.includes('vercel.app')) ? 'https://lunaar-backend.onrender.com' : window.location.origin;

      const res = await fetch(`${backendUrl}/api/users/delete-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: deleteEmail, password: deletePassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowVerifyModal(false);
        setShowConfirmModal(true);
      } else {
        setDeleteError(data.error || 'Invalid password. Please try again.');
      }
    } catch (err) {
      setDeleteError('Connection error. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    audioSynth.playClick();
    setDeleteLoading(true);

    try {
      const backendUrl = typeof window !== 'undefined' && (window.location.port === '3000' || window.location.hostname.includes('vercel.app')) ? 'https://lunaar-backend.onrender.com' : window.location.origin;

      const res = await fetch(`${backendUrl}/api/users/${profile.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Your account has been deleted successfully.');
        localStorage.removeItem('lunaar_user');
        localStorage.removeItem('lunaar_token');
        
        // Remove from accounts map as well
        if (profile.email) {
          const accountsStr = localStorage.getItem('lunaar_accounts');
          if (accountsStr) {
            try {
              const accounts = JSON.parse(accountsStr);
              delete accounts[profile.email];
              localStorage.setItem('lunaar_accounts', JSON.stringify(accounts));
            } catch (e) {}
          }
        }

        router.push('/');
      } else {
        alert(data.error || 'Failed to delete account. Please try again.');
      }
    } catch (err) {
      alert('Connection error. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Save changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    if (!profile) return;

    const updated = {
      ...profile,
      username,
      bio,
      gender,
      country
    };

    setProfile(updated);
    localStorage.setItem('lunaar_user', JSON.stringify(updated));
    
    // Play sound notification
    audioSynth.playMessage();
    
    alert('Profile saved successfully!');
  };

  // PayPal buy-flow is now integrated directly in the checkout buttons below



  if (!profile) {
    return (
      <div className="flex-grow flex items-center justify-center bg-brand-darkBg text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-brand-darkBg pb-16 selection:bg-brand-primary selection:text-white relative">
      {/* Ambient backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-brand-primary/5 blur-[90px] pointer-events-none"></div>

      {/* HEADER SECTION */}
      <header className="h-20 flex items-center justify-between px-6 premium-header sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { audioSynth.playClick(); router.push('/'); }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-xl">User Profile Dashboard</span>
        </div>

        {isPremium && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-wider uppercase">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            VIP Member
          </div>
        )}
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="max-w-6xl mx-auto px-6 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left column (Avatar and general account highlights) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
            {/* VIP Glow badge */}
            {isPremium && (
              <div className="absolute inset-0 border border-amber-500/20 rounded-3xl pointer-events-none animate-pulse"></div>
            )}

            {/* Avatar container */}
            <div className="mb-4">
              <div className="w-32 h-32 rounded-full border-2 border-brand-primary/30 bg-brand-primary/5 shadow-xl relative flex items-center justify-center">
                <User className="w-16 h-16 text-brand-primary" strokeWidth={1.5} />
              </div>
            </div>

            {/* User Title display */}
            <h2 className="font-black text-2xl flex items-center gap-1.5">
              {username || 'Stranger'}
              {isPremium && <Award className="w-5 h-5 text-amber-400" />}
            </h2>
            <p className="text-slate-500 text-xs mt-1 max-w-[200px] leading-relaxed break-words">
              {bio || 'Add a brief bio description below to tell matches about yourself.'}
            </p>

          </div>

          {/* Settings / System details cards */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-primary" /> Settings & System
            </h3>
            
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">Account ID</span>
                <span className="font-mono text-slate-300 select-all">{profile.id}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">User Registered</span>
                <span className="text-slate-300">June 15, 2026</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">VIP Subscription</span>
                {isPremium ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    Enabled (Active)
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold">
                    Disabled (Free Tier)
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Match Server Connection</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              </div>
            </div>
            
            <div className="h-px bg-white/5 my-2"></div>
            <button
              type="button"
              onClick={() => {
                audioSynth.playClick();
                setDeleteEmail(profile.email || '');
                setDeletePassword('');
                setDeleteError('');
                setShowVerifyModal(true);
              }}
              className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete My Account</span>
            </button>
          </div>
        </div>

        {/* Right column (Edit forms & Match history logs) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Edit Profile Form */}
          <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10">
            <h3 className="font-extrabold text-xl mb-6">Edit Profile Details</h3>
            
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Display Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter display name"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none"
                  />
                </div>

                {/* Country */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>My Country Location</span>
                    {!isPremium && (
                      <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 normal-case">
                        <Star className="w-3 h-3 fill-amber-500" />
                        VIP required to change
                      </span>
                    )}
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={!isPremium}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 border border-white/5 text-white outline-none focus:border-brand-primary ${!isPremium ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="World">World (No Filter)</option>
                    {COUNTRIES.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Biography */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biographical Summary</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Introduce yourself to strangers here..."
                  rows={3}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none resize-none"
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Gender Identity</label>
                <div className="flex gap-4">
                  {(['male', 'female', 'everyone'] as const).map(g => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-semibold capitalize">
                      <input
                        type="radio"
                        name="my-gender"
                        checked={gender === g}
                        onChange={() => setGender(g)}
                        className="text-brand-primary focus:ring-brand-primary"
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-white text-brand-darkBg hover:bg-slate-200 transition font-black text-xs w-fit"
              >
                Save Profile Changes
              </button>
            </form>
          </div>



          {/* Pricing Grid removed - payment checkout is on a separate /upgrade route */}
        </div>

      </main>

      {/* SECURITY VERIFICATION MODAL */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] w-full max-w-[420px] p-8 border border-slate-100 shadow-2xl relative text-slate-800 animate-scaleUp">
            <button
              onClick={() => { audioSynth.playClick(); setShowVerifyModal(false); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-extrabold text-center text-rose-600 mb-1">
              Lunaar <span className="text-slate-800">Login</span>
            </h2>
            <p className="text-xs font-bold text-center text-slate-500 mb-6">
              For your security, please login to continue
            </p>

            <form onSubmit={handleVerifyPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  disabled
                  value={deleteEmail}
                  className="w-full py-3 px-4 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 outline-none text-xs font-semibold cursor-not-allowed"
                  placeholder="Email Address"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 focus:border-rose-500 outline-none text-xs font-semibold"
                  placeholder="Password"
                />
              </div>

              {deleteError && (
                <p className="text-rose-600 text-xs font-bold text-center">{deleteError}</p>
              )}

              <button
                type="submit"
                disabled={deleteLoading}
                className="w-full py-3.5 mt-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm transition active:scale-[0.98] shadow-md shadow-rose-600/20 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-[550px] p-8 border border-slate-100 shadow-2xl relative text-slate-800 animate-scaleUp">
            <button
              onClick={() => { audioSynth.playClick(); setShowConfirmModal(false); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-black text-slate-850 text-slate-800 text-center mb-6">
              What do you want to do?
            </h2>

            <div className="flex flex-col items-center justify-center p-6 text-center border-t border-slate-100">
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[400px] mb-6">
                Removes your account and data permanently and it's not possible to recover it
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-8 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm transition active:scale-[0.98] shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete my account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-12 border-t border-white/5 bg-slate-950/80 text-sm text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
          {/* Horizontal Links Footer (As requested by user) */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold text-slate-400">
            <a href="/" className="text-brand-primary underline hover:text-brand-primaryHover transition">Home</a>
            <a href="/terms" className="hover:text-white transition">Terms</a>
            <a href="/privacy" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">2257</a>
            <a href="/abuse" className="hover:text-white transition">Abuse</a>
            <a href="/billing-support" className="hover:text-white transition">Billing Support</a>
            <a href="#" className="hover:text-white transition">DMCA Policy</a>
            <a href="/contact" className="hover:text-white transition">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold">
        Loading...
      </div>
    }>
      <ProfileContent />
    </React.Suspense>
  );
}
