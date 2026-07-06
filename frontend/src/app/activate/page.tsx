'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import audioSynth from '../../components/AudioEffects';

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(3);

  const getApiUrl = () => {
    if (typeof window === 'undefined') return '';
    return (window.location.port === '3000' || window.location.hostname.includes('vercel.app')) ? 'https://lunaar-backend.onrender.com' : window.location.origin;
  };

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No activation token found in the URL. Please verify your link.');
      return;
    }

    const activateAccount = async () => {
      const apiUrl = getApiUrl();
      try {
        const response = await fetch(`${apiUrl}/api/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          
          audioSynth.playMatch();
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });

          if (typeof window !== 'undefined') {
            const savedUserStr = localStorage.getItem('lunaar_user');
            let userObj = savedUserStr ? JSON.parse(savedUserStr) : {};
            userObj.email = data.user.email;
            userObj.username = data.user.username;
            userObj.avatarUrl = data.user.avatarUrl;
            userObj.isPremium = data.user.isPremium;
            localStorage.setItem('lunaar_user', JSON.stringify(userObj));
          }

          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                window.location.href = '/';
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Failed to activate account. The link may have expired.');
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
        setErrorMsg('Could not connect to the activation server.');
      }
    };

    activateAccount();
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-glow-card rounded-3xl p-8 md:p-10 max-w-md w-full text-center relative z-10 border border-white/10 bg-slate-950/40 backdrop-blur-xl overflow-hidden"
    >
      <div className="flex flex-col gap-6 items-center">
        {status === 'loading' && (
          <>
            <RefreshCw className="w-16 h-16 animate-spin text-brand-primary" />
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black uppercase text-white font-sans tracking-wide">Activating Account</h2>
              <p className="text-slate-400 text-sm">Please wait while we verify your activation link...</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 animate-bounce" />
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black uppercase text-white font-sans tracking-wide">Account Activated!</h2>
              <p className="text-slate-200 text-sm mt-1">Welcome to Lunaar! Your account is now fully active.</p>
              <p className="text-slate-400 text-xs mt-3">Redirecting you to the home page in <span className="text-brand-primary font-bold">{countdown}</span> seconds...</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white font-bold text-sm transition shadow-premium"
            >
              Go to Home
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-rose-500 animate-pulse" />
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black uppercase text-white font-sans tracking-wide">Activation Failed</h2>
              <p className="text-rose-400 text-sm font-semibold">{errorMsg}</p>
              <p className="text-slate-400 text-xs mt-2">The link might be invalid, expired, or has already been used.</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition border border-white/10"
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function ActivatePage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#0F0514] overflow-x-hidden selection:bg-brand-primary selection:text-white justify-center items-center px-6">
      <div className="absolute top-[10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-brand-primary/10 blur-[130px] animate-pulse-slow"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-rose-500/10 blur-[140px] animate-pulse-slow"></div>

      <Suspense fallback={
        <div className="premium-glow-card rounded-3xl p-8 md:p-10 max-w-md w-full text-center relative z-10 border border-white/10 bg-slate-950/40 backdrop-blur-xl flex flex-col items-center gap-6">
          <RefreshCw className="w-16 h-16 animate-spin text-brand-primary" />
          <h2 className="text-2xl font-black uppercase text-white font-sans tracking-wide">Loading</h2>
        </div>
      }>
        <ActivateContent />
      </Suspense>
    </div>
  );
}
