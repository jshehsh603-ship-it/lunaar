'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Video, Globe, Shield, Sparkles, Heart, Users, MessageSquare, 
  Search, Check, Zap, HelpCircle, Lock, Menu, X, ArrowRight, Star, RefreshCw,
  ChevronDown, User, Mail
} from 'lucide-react';
import audioSynth from '../components/AudioEffects';



// Sample interests tags
const POPULAR_TAGS = ['gaming', 'music', 'travel', 'movies', 'anime', 'tech', 'coding', 'languages', 'cooking', 'fitness', 'art'];


export default function LandingPage() {
  const router = useRouter();
  
  // Navigation states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // User Match Preference States
  const [gender, setGender] = useState<'male' | 'female' | 'everyone'>('everyone');
  const [country, setCountry] = useState('World');
  const [interests, setInterests] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [showAgeWarning, setShowAgeWarning] = useState(false);
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false);
  const [cookieConsentOk, setCookieConsentOk] = useState(true); // default true for SSR safety, updated in useEffect

  // Profile data (initialized on client load)
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('resetToken');
      if (token) {
        setResetToken(token);
        setAuthMode('reset');
        setShowAuthModal(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  
  // Auth Form Fields
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Activation states
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationEmail, setActivationEmail] = useState('');
  const [newActivationEmail, setNewActivationEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  const getApiUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    setAuthLoading(true);
    setAuthError('');
    const apiUrl = getApiUrl();
    try {
      const res = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setIsLoggedIn(true);
        setUserEmail(data.user.email);
        setUsername(data.user.username);
        setAvatar(data.user.avatarUrl);
        setIsPremium(data.user.isPremium || false);

        if (typeof window !== 'undefined') {
          const savedUserStr = localStorage.getItem('lunaar_user');
          const savedUserObj = savedUserStr ? JSON.parse(savedUserStr) : {};
          const newUserObj = {
            ...savedUserObj,
            id: data.user.id,
            username: data.user.username,
            avatarUrl: data.user.avatarUrl,
            email: data.user.email,
            isPremium: data.user.isPremium || false
          };
          localStorage.setItem('lunaar_user', JSON.stringify(newUserObj));
        }

        setShowAuthModal(false);
        confetti({ particleCount: 80, spread: 60 });
        audioSynth.playMatch();
      } else {
        setAuthError(data.error || 'Google Sign-In failed.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Failed to connect to authentication server.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    let checkGoogle: any = null;
    const initGoogleBtn = () => {
      checkGoogle = setInterval(() => {
        if ((window as any).google) {
          clearInterval(checkGoogle);
          try {
            (window as any).google.accounts.id.initialize({
              client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '104732848046-m7r4mt7ab0uu1nmmail7e3rak24m5fmm.apps.googleusercontent.com',
              callback: handleGoogleCredentialResponse,
              cancel_on_tap_outside: false
            });

            // Try rendering Google Sign-In button if element is present
            const btnParent = document.getElementById('google-signin-btn');
            if (btnParent) {
              (window as any).google.accounts.id.renderButton(btnParent, {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: 372,
                locale: 'en'
              });
            }
          } catch (e) {
            console.error('Failed to initialize Google Auth:', e);
          }
        }
      }, 500);
    };

    initGoogleBtn();

    return () => {
      if (checkGoogle) clearInterval(checkGoogle);
    };
  }, [mounted, showAuthModal]);

  // Authentication Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setAuthError('');
    
    if (authMode === 'forgot') {
      if (!emailInput) {
        setAuthError('Please enter your email address.');
        return;
      }
      setAuthLoading(true);
      const apiUrl = getApiUrl();
      try {
        const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput })
        });
        const data = await response.json();
        if (response.ok) {
          setForgotSuccess(true);
        } else {
          setAuthError(data.error || 'Password reset request failed.');
        }
      } catch (err) {
        setAuthError('Failed to connect to authentication server.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }
    
    if (authMode === 'reset') {
      if (!passwordInput || !confirmPasswordInput) {
        setAuthError('Please fill in all fields.');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setAuthError('Passwords do not match.');
        return;
      }
      setAuthLoading(true);
      const apiUrl = getApiUrl();
      try {
        const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: resetToken,
            password: passwordInput
          })
        });
        const data = await response.json();
        if (response.ok) {
          alert('Password reset successful! You can now log in.');
          setAuthMode('login');
          setPasswordInput('');
          setConfirmPasswordInput('');
          setResetToken('');
        } else {
          setAuthError(data.error || 'Password reset failed.');
        }
      } catch (err) {
        setAuthError('Failed to connect to authentication server.');
      } finally {
        setAuthLoading(false);
      }
      return;
    }
    
    if (!emailInput || !passwordInput) {
      setAuthError('Please fill in all fields.');
      return;
    }
    
    if (authMode === 'signup' && !nicknameInput) {
      setAuthError('Please enter a display username.');
      return;
    }

    setAuthLoading(true);
    const apiUrl = getApiUrl();
    
    try {
      if (authMode === 'signup') {
        const response = await fetch(`${apiUrl}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: nicknameInput,
            email: emailInput,
            password: passwordInput
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          if (data.activated && data.user) {
            // Auto-login since SMTP is bypassed in this env
            setIsLoggedIn(true);
            setUserEmail(data.user.email);
            setUsername(data.user.username);
            setAvatar(data.user.avatarUrl);
            setIsPremium(data.user.isPremium || false);

            if (typeof window !== 'undefined') {
              const savedUserStr = localStorage.getItem('lunaar_user');
              const savedUserObj = savedUserStr ? JSON.parse(savedUserStr) : {};
              const newUserObj = {
                ...savedUserObj,
                id: data.user.id,
                username: data.user.username,
                avatarUrl: data.user.avatarUrl,
                email: data.user.email,
                isPremium: data.user.isPremium || false
              };
              localStorage.setItem('lunaar_user', JSON.stringify(newUserObj));
            }
            setShowAuthModal(false);
          } else {
            setActivationEmail(emailInput);
            setNewActivationEmail('');
            setResendMessage('');
            setResendError('');
            setShowAuthModal(false);
            setShowActivationModal(true);
          }
        } else {
          setAuthError(data.error || 'Registration failed.');
        }
      } else {
        const response = await fetch(`${apiUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailInput,
            password: passwordInput
          })
        });

        const data = await response.json();

        if (response.ok) {
          setIsLoggedIn(true);
          setUserEmail(data.user.email);
          setUsername(data.user.username);
          setAvatar(data.user.avatarUrl);
          setIsPremium(data.user.isPremium || false);

          if (typeof window !== 'undefined') {
            const savedUserStr = localStorage.getItem('lunaar_user');
            let userObj = savedUserStr ? JSON.parse(savedUserStr) : {};
            userObj.email = data.user.email;
            userObj.username = data.user.username;
            userObj.avatarUrl = data.user.avatarUrl;
            userObj.isPremium = data.user.isPremium;
            localStorage.setItem('lunaar_user', JSON.stringify(userObj));
          }

          setShowAuthModal(false);
          confetti({ particleCount: 60, spread: 50 });
          audioSynth.playMatch();
        } else {
          if (data.error === 'PENDING_ACTIVATION') {
            setActivationEmail(data.email || emailInput);
            setNewActivationEmail('');
            setResendMessage('');
            setResendError('');
            setShowAuthModal(false);
            setShowActivationModal(true);
          } else {
            setAuthError(data.error || 'Invalid email or password.');
          }
        }
      }
    } catch (err) {
      console.error(err);
      setAuthError('Connection error. Make sure the backend is running.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setResendMessage('');
    setResendError('');
    setResendLoading(true);

    const apiUrl = getApiUrl();
    const targetEmail = newActivationEmail.trim() || activationEmail;

    try {
      const response = await fetch(`${apiUrl}/api/resend-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldEmail: activationEmail,
          newEmail: newActivationEmail.trim() ? newActivationEmail.trim() : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage(`We sent a new activation link to ${data.email}!`);
        setActivationEmail(data.email);
        setNewActivationEmail('');
      } else {
        setResendError(data.error || 'Failed to resend activation link.');
      }
    } catch (err) {
      console.error(err);
      setResendError('Connection error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };


  const handleLogout = () => {
    audioSynth.playClick();
    setIsLoggedIn(false);
    setUserEmail('');
    
    if (typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('lunaar_user');
      if (savedUserStr) {
        let userObj = JSON.parse(savedUserStr);
        delete userObj.email;
        localStorage.setItem('lunaar_user', JSON.stringify(userObj));
      }
    }
  };

  // Server Stats State
  const [stats, setStats] = useState({
    onlineCount: 12450,
    activeMatches: 62040,
    dailyConversations: 248900,
    averageConnectionMs: 5200
  });

  // Fetch live stats from backend
  useEffect(() => {
    // Generate a random username & avatar if not set in local storage
    if (typeof window !== 'undefined') {
      const consentLocal = localStorage.getItem('lunaar_cookie_consent');
      const cookieMatch = document.cookie.match(/(^| )lunaar_cookie_consent=([^;]+)/);
      const consentCookie = cookieMatch ? cookieMatch[2] === 'true' : false;
      setCookieConsentOk(consentLocal === 'true' || consentCookie);
      const savedUser = localStorage.getItem('lunaar_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUsername(parsed.username || '');
          setAvatar(parsed.avatarUrl || '');
          if (parsed.gender) setGender(parsed.gender);
          if (parsed.interests) setInterests(parsed.interests);
          if (parsed.email) {
            setIsLoggedIn(true);
            setUserEmail(parsed.email);
            setIsPremium(parsed.isPremium || false);
          }
        } catch (e) {}
      } else {
        const randId = Math.floor(1000 + Math.random() * 9000);
        const randomName = `Stranger_${randId}`;
        const randomAv = `https://api.dicebear.com/7.x/lorelei/svg?seed=${randomName}`;
        setUsername(randomName);
        setAvatar(randomAv);
        localStorage.setItem('lunaar_user', JSON.stringify({
          id: `u_${Math.random().toString(36).substring(2, 11)}`,
          username: randomName,
          avatarUrl: randomAv,
          bio: 'Hey there! Nice to meet you.',
          interests: [],
          gender: 'everyone',
          country: 'World',
          isPremium: false
        }));
      }
    }

    const fetchStats = async () => {
      try {
        const backendUrl = typeof window !== 'undefined'
          ? (window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin)
          : 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        // Fallback holds static numbers
      }
    };
    
    fetchStats();
    
    let timeoutId: NodeJS.Timeout;
    const scheduleNextFetch = () => {
      const intervals = [10000, 15000, 20000];
      const randomInterval = intervals[Math.floor(Math.random() * intervals.length)];
      timeoutId = setTimeout(async () => {
        await fetchStats();
        scheduleNextFetch();
      }, randomInterval);
    };
    scheduleNextFetch();

    return () => clearTimeout(timeoutId);
  }, []);

  // Synchronize authentication state across tabs (e.g. automatically log in when activated in another tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lunaar_user') {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed.email) {
              setIsLoggedIn(true);
              setUserEmail(parsed.email);
              setUsername(parsed.username || '');
              setAvatar(parsed.avatarUrl || '');
              setIsPremium(parsed.isPremium || false);
              
              // Automatically close any auth/activation modals since we are now signed in
              setShowAuthModal(false);
              setShowActivationModal(false);
            } else {
              setIsLoggedIn(false);
              setUserEmail('');
              setIsPremium(false);
            }
          } catch (err) {
            console.error('Error parsing cross-tab storage user updates:', err);
          }
        } else {
          // Storage item was removed, treat as logout
          setIsLoggedIn(false);
          setUserEmail('');
          setIsPremium(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const togglePremiumLocal = () => {
    if (typeof window === 'undefined') return;
    const savedUserStr = localStorage.getItem('lunaar_user');
    if (savedUserStr) {
      const userObj = JSON.parse(savedUserStr);
      const nextVal = !userObj.isPremium;
      userObj.isPremium = nextVal;
      localStorage.setItem('lunaar_user', JSON.stringify(userObj));
      setIsPremium(nextVal);
      audioSynth.playMatch();
      if (nextVal) {
        confetti({ particleCount: 50, spread: 40 });
      }
      
      const backendUrl = window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;
      fetch(`${backendUrl}/api/admin/users/${userObj.id}/vip`, { method: 'POST' }).catch(() => {});
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !interests.includes(trimmed) && interests.length < 5) {
      setInterests([...interests, trimmed]);
      audioSynth.playClick();
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setInterests(interests.filter(t => t !== tag));
    audioSynth.playClick();
  };

  const handleQuickAdd = (tag: string) => {
    if (!interests.includes(tag) && interests.length < 5) {
      setInterests([...interests, tag]);
      audioSynth.playClick();
    }
  };

  const handleStartChat = () => {
    audioSynth.playClick();
    if (!isLoggedIn) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    if (!ageVerified) {
      setShowAgeWarning(true);
      return;
    }

    // Save matching parameters to localStorage
    if (typeof window !== 'undefined') {
      const savedUserStr = localStorage.getItem('lunaar_user');
      let userObj = savedUserStr ? JSON.parse(savedUserStr) : {};
      
      // Update with matching filters
      userObj.gender = gender;
      userObj.genderPreference = 'everyone';
      userObj.countryPreference = country;
      userObj.interests = interests;
      
      localStorage.setItem('lunaar_user', JSON.stringify(userObj));
    }
    
    router.push('/chat');
  };

  const handleAcceptCookies = () => {
    audioSynth.playClick();
    if (typeof window !== 'undefined') {
      localStorage.setItem('lunaar_cookie_consent', 'true');
      document.cookie = "lunaar_cookie_consent=true; path=/; max-age=31536000; SameSite=Lax";
    }
    setCookieConsentOk(true);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0F0514] overflow-x-hidden selection:bg-brand-primary selection:text-white">
      {/* Background Image & Glowing Orbs */}
      <div 
        className="absolute inset-x-0 top-0 h-screen overflow-hidden pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(15, 5, 20, 0.65), rgba(80, 10, 30, 0.35), #0F0514), url("/background.png")'
        }}
      >
        <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] rounded-full bg-brand-primary/10 blur-[130px] animate-pulse-slow"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-rose-500/10 blur-[140px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-brand-primary/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 w-full premium-header">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a 
              href="/"
              onClick={(e) => {
                e.preventDefault();
                audioSynth.playClick();
                window.location.href = '/';
              }}
              className="font-extrabold text-2xl tracking-[0.2em] text-white premium-glowing-text cursor-pointer select-none"
            >
              LUN<span className="text-brand-primary font-sans">AAR</span>
            </a>
          </div>



          <div className="hidden md:flex items-center gap-4">

            
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold premium-signout-button"
                >
                  Sign Out
                </button>
                <a href="/profile" className="premium-avatar-ring block cursor-pointer">
                  <div className="w-9 h-9 rounded-[10px] border border-brand-primary/30 bg-brand-primary/5 flex items-center justify-center">
                    <User className="w-5 h-5 text-brand-primary" strokeWidth={1.5} />
                  </div>
                </a>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); audioSynth.playClick(); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primaryHover text-white transition shadow-premium"
              >
                Sign In / Join
              </button>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white transition"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-brand-primary/25 bg-brand-darkCard"
            >
              <div className="px-6 py-6 flex flex-col gap-4 text-base font-semibold">
                <a href="/" className="text-brand-primary py-2">Home</a>
                <a href="/profile" className="text-slate-300 py-2">My Dashboard</a>
                
                <div className="h-px bg-white/10 my-2"></div>
                
                {isLoggedIn ? (
                  <div className="flex items-center justify-between py-2 bg-white/5 rounded-xl px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg border border-brand-primary/30 bg-brand-primary/5 flex items-center justify-center">
                        <User className="w-4.5 h-4.5 text-brand-primary" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-semibold text-white">{username}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-xs text-brand-primary font-bold"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAuthMode('login'); setShowAuthModal(true); setMobileMenuOpen(false); audioSynth.playClick(); }}
                    className="w-full py-2.5 rounded-xl bg-brand-primary text-white font-bold text-center text-sm"
                  >
                    Sign In / Register
                  </button>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {stats.onlineCount.toLocaleString()} Users Online
                  </div>
                  {isPremium ? (
                    <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold text-center select-none">
                      VIP Active
                    </div>
                  ) : (
                    <a 
                      href="/upgrade"
                      className="px-4 py-2 rounded-lg bg-brand-primary text-white text-xs font-bold text-center"
                    >
                      VIP Upgrades
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow flex flex-col items-center justify-start px-6 pt-6 pb-16 relative z-10 w-full">
        <div className="w-full max-w-lg flex flex-col items-center gap-8 text-center mx-auto">
          
          {/* Headline */}
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-white font-sans uppercase">
              Who&apos;s your next <br />
              <span className="bg-gradient-to-r from-brand-primary to-rose-400 bg-clip-text text-transparent">connection?</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-md mx-auto font-medium">
              Lunaar is a free social discovery video chat. Instant peer connection with no signup required for preview.
            </p>
          </div>

          {/* Centered Match Card */}
          <div className="w-full premium-glow-card rounded-3xl pt-4 pb-6 px-6 md:pt-5 md:pb-7 md:px-8 flex flex-col gap-6 shadow-premium border border-white/10 bg-slate-950/40 backdrop-blur-xl relative overflow-hidden premium-card-accent">
            
            {/* Live stats online indicator header */}
            <div className="flex items-center justify-start border-b border-white/5 pb-2.5 mb-0.5">
              {mounted && isDev ? (
                isPremium ? (
                  <button
                    type="button"
                    onClick={togglePremiumLocal}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-[9px] font-bold text-brand-primary uppercase tracking-wide cursor-pointer hover:bg-brand-primary/20 transition duration-300"
                    title="Click to toggle VIP status"
                  >
                    👑 VIP Enabled (Click to toggle)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={togglePremiumLocal}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-wide cursor-pointer hover:bg-white/10 transition duration-300"
                    title="Click to toggle VIP status"
                  >
                    🆓 Free Account (Click for VIP Pass)
                  </button>
                )
              ) : (
                isPremium ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-[9px] font-bold text-brand-primary uppercase tracking-wide select-none">
                    <span>VIP Enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-wide select-none">
                    <span>Free Account</span>
                  </div>
                )
              )}
            </div>

            {/* Gender selector grid cards */}
            <div className="flex flex-col gap-2 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Whats your gender</label>
              <div className="grid grid-cols-3 gap-3">
                {(['male', 'female', 'everyone'] as const).map((g) => {
                  const isActive = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => { setGender(g); audioSynth.playClick(); }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                        isActive 
                          ? 'bg-gradient-to-b from-brand-primary/20 to-brand-primary/5 border-brand-primary shadow-[0_0_15px_rgba(255,59,59,0.15)] text-white scale-[1.02]' 
                          : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-white hover:border-white/10 hover:bg-slate-900/60'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></span>
                      )}
                      
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center p-2 transition-transform duration-300 ${
                        isActive ? 'bg-brand-primary/10' : 'bg-slate-950/40'
                      }`}>
                        <img 
                          src={g === 'male' ? '/male.png' : g === 'female' ? '/female.png' : '/other.png'} 
                          alt={g === 'everyone' ? 'Other' : g} 
                          className="w-full h-full object-contain" 
                        />
                      </div>
                      <span className="text-[10px] font-extrabold tracking-wider uppercase">
                        {g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>



            {/* Interest tag selector */}
            <div className="flex flex-col gap-2 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">My Interests (Optional)</label>
                <span className="text-xs text-slate-500 font-semibold">{interests.length}/5 tags</span>
              </div>
              
              <form onSubmit={handleAddTag} className="flex gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="e.g. music, coding, travel"
                    className="w-full py-3 pl-10 pr-4 rounded-xl text-sm font-medium bg-slate-900/60 border border-white/5 text-white focus:border-brand-primary focus:shadow-[0_0_15px_rgba(255,59,59,0.15)] focus:bg-slate-900/80 outline-none transition duration-300"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={interests.length >= 5}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition"
                >
                  Add
                </button>
              </form>

              {/* Quick tags selector */}
              {interests.length < 5 && (
                <div className="flex flex-wrap gap-1.5 mt-0.5 items-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mr-1">Popular:</span>
                  {['gaming', 'music', 'travel', 'movies', 'anime'].map((tag) => {
                    const isAdded = interests.includes(tag);
                    if (isAdded) return null;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (interests.length < 5) {
                            setInterests([...interests, tag]);
                            audioSynth.playClick();
                          }
                        }}
                        className="text-[9px] font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-full px-2 py-0.5 transition"
                      >
                        +{tag}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected tags list */}
              {interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {interests.map((tag) => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-primary/15 to-rose-500/5 border border-brand-primary/30 text-white text-xs font-semibold shadow-sm"
                    >
                      <span className="text-brand-primary text-[10px] font-bold">#</span>{tag}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTag(tag)}
                        className="p-0.5 rounded-full hover:bg-brand-primary/20 transition ml-0.5 text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Age Verification Box */}
            <div className="flex flex-col gap-2 text-left">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ageVerified}
                  onChange={(e) => {
                    setAgeVerified(e.target.checked);
                    if (e.target.checked) setShowAgeWarning(false);
                  }}
                  className="mt-0.5 w-4.5 h-4.5 rounded-md border-white/10 text-brand-primary focus:ring-brand-primary bg-slate-900 cursor-pointer accent-brand-primary"
                />
                <span className="text-xs text-slate-400 leading-tight">
                  I confirm that I am at least 18 years old and agree to the <a href="/terms" className="underline text-brand-primary hover:text-brand-primaryHover transition">Terms of Service</a> and <a href="/privacy" className="underline text-brand-primary hover:text-brand-primaryHover transition">Community Guidelines</a>.
                </span>
              </label>
              
              <AnimatePresence>
                {showAgeWarning && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-brand-primary font-bold mt-1 flex items-center gap-1.5 animate-pulse"
                  >
                    <Shield className="w-3.5 h-3.5" /> Please check the age verification box before starting.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Start Chat Button */}
            <button
              onClick={handleStartChat}
              className="relative overflow-hidden w-full py-4 rounded-2xl font-extrabold text-lg tracking-wide text-white flex items-center justify-center gap-2 group transition duration-300 premium-glow-button"
            >
              {/* Shimmer sweep effect */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform"></span>
              <Video className="w-5 h-5 group-hover:rotate-12 transition duration-300" />
              <span>Start Chatting Now</span>
              <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1.5 transition duration-300" />
            </button>

          </div>
        </div>
      </main>

      {/* TRUST/STATS SECTION */}
      <section className="relative z-10 w-full py-10 bg-[#0D0514]/50 border-y border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col gap-1">
            <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-sans">
              {stats.onlineCount.toLocaleString()}+
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Users Online</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-sans">
              200k+
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Daily Connections</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-3xl md:text-4xl font-extrabold text-brand-primary tracking-tight font-sans font-black">
              5.2 Sec
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Avg Matching Speed</span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 flex flex-col gap-12">
        <div className="text-center flex flex-col gap-3">
          <h2 className="text-3xl md:text-5xl font-black font-sans text-white uppercase tracking-wider">How Lunaar Works</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base font-medium">
            Start meeting people instantly with 3 simple steps. Customize your targeting and let our intelligent matchmaker connect you securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Step 1 */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-bl-[100px] flex items-center justify-end pr-4 pt-4 text-4xl font-black text-white/5">
              01
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <SlidersIcon className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-xl text-white">Choose Preferences</h3>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Select who you&apos;d like to match with. Choose gender, filter by location filters, and add your interest tags to target matching conversations.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-bl-[100px] flex items-center justify-end pr-4 pt-4 text-4xl font-black text-white/5">
              02
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-xl text-white">Start Matchmaking</h3>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Click Start Chatting. Our real-time matchmaking queue pairs you with online users matching your settings using high-speed Socket.IO servers.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-bl-[100px] flex items-center justify-end pr-4 pt-4 text-4xl font-black text-white/5">
              03
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-xl text-white">Meet Instantly</h3>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              A premium WebRTC connection establishes immediately. Enjoy crystal clear HD video, high-fidelity audio, instant text messages, and direct friend requests.
            </p>
          </div>

        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col gap-12">
        <div className="text-center flex flex-col gap-3">
          <h2 className="text-3xl md:text-5xl font-black font-sans text-white uppercase tracking-wider">Next-Level Video Experience</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base font-medium">
            Packed with advanced real-time social networking and safety features to create a smooth, highly addictive interaction flow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="glass-card rounded-xl p-5 flex flex-col gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-brand-primary">
              <Video className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-base text-white">HD Video Quality</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">Crystal clear peer-to-peer real-time video streams using WebRTC technology optimized for cellular data.</p>
          </div>

          <div className="glass-card rounded-xl p-5 flex flex-col gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-brand-primary">
              <Globe className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-base text-white">Target Filters</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">Filter matches by country, language, and interests, allowing you to connect with specific people anywhere.</p>
          </div>

          <div className="glass-card rounded-xl p-5 flex flex-col gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-brand-primary">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-base text-white">AI Moderation</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">Active background AI filters face validation. Users receive instant bans for inappropriate reports or flags.</p>
          </div>

        </div>
      </section>

      {/* PREMIUM MEMBERSHIP PRICING */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 flex flex-col gap-12 w-full">
        <div className="text-center flex flex-col gap-3">
          <h2 className="text-3xl md:text-5xl font-black font-sans text-white uppercase tracking-wider">Upgrade to Premium VIP</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base font-medium">
            Get exclusive search parameters, priority matching queue, unlimited target connections, and boost your matching success.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
          
          {/* Plan 1 */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col justify-between text-left">
            <div className="flex flex-col gap-4">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Basic Tier</div>
              <h3 className="font-extrabold text-2xl text-white">Standard Chat</h3>
              <div className="text-3xl font-black">$0 <span className="text-xs text-slate-500 font-semibold">/ lifetime</span></div>
              <div className="h-px bg-white/5"></div>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Unlimited matching</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Real-time text messaging</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Add friends & follow</li>
                <li className="flex items-center gap-2 text-slate-600"><Lock className="w-3.5 h-3.5" /> Gender filters locked</li>
                <li className="flex items-center gap-2 text-slate-600"><Lock className="w-3.5 h-3.5" /> Country filters locked</li>
              </ul>
            </div>
            <button 
              onClick={() => router.push('/chat')}
              className="mt-6 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold text-xs transition"
            >
              Start Free
            </button>
          </div>

          {/* Plan 2 */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col justify-between text-left">
            <div className="flex flex-col gap-4">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Short Term Pass</div>
              <h3 className="font-extrabold text-2xl text-white">1 Week VIP Pass</h3>
              <div className="text-3xl font-black">$8.99 <span className="text-xs text-slate-500 font-semibold">/ week</span></div>
              <div className="h-px bg-white/5"></div>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Unlock Gender filters</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Unlimited Country matching</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> 2x Priority Matching Queue</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> VIP Golden Profile badge</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Zero Ads & boosted visibility</li>
              </ul>
            </div>
            {isPremium ? (
              <div className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-600/10 border border-amber-500/30 text-amber-300 font-extrabold text-xs text-center select-none">
                VIP Accessed
              </div>
            ) : (
              <a 
                href="/upgrade?plan=week"
                className="mt-6 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold text-xs text-center transition"
              >
                Get 1 Week VIP
              </a>
            )}
          </div>

          {/* Plan 3 - Recommended */}
          <div className="glass-panel rounded-2xl p-6 border-2 border-brand-primary relative flex flex-col justify-between text-left shadow-premium">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-brand-primary text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full">
              POPULAR
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="text-brand-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> premium level
              </div>
              <h3 className="font-extrabold text-2xl text-white">1 Month VIP Pass</h3>
              <div className="text-3xl font-black">$24.99 <span className="text-xs text-slate-500 font-semibold">/ month</span></div>
              <div className="h-px bg-white/15"></div>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Unlock Gender filters</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Unlimited Country matching</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> 2x Priority Matching Queue</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> VIP Golden Profile badge</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary" /> Zero Ads & boosted visibility</li>
              </ul>
            </div>
            {isPremium ? (
              <div className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-600/15 border border-amber-500/40 text-amber-300 font-extrabold text-xs text-center select-none">
                VIP Accessed
              </div>
            ) : (
              <a 
                href="/upgrade?plan=month"
                className="mt-6 w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white font-bold text-xs text-center transition shadow-md"
              >
                Get 1 Month VIP
              </a>
            )}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-12 border-t border-white/5 bg-[#09030D]/90 text-sm text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-6 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-[0.2em] text-white premium-glowing-text">
                  LUN<span className="text-brand-primary font-sans">AAR</span>
                </span>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-slate-500">
                Lunaar is a premium random social discovery platform. We connect verified real users worldwide for real-time visual encounters. Safety, trust, and quality are our pillars.
              </p>
              <div className="text-[10px] text-slate-600">
                &copy; {new Date().getFullYear()} Lunaar Inc. All rights reserved.
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col gap-3 text-left">
              <span className="font-bold text-white text-xs uppercase tracking-widest">Product</span>
              <a href="/chat" className="hover:text-white transition text-xs text-slate-400">Live Chat Matcher</a>
              <a href="/profile" className="hover:text-white transition text-xs text-slate-400">Profile dashboard</a>
              <a href="/upgrade" className="hover:text-white transition text-xs text-slate-400">Pricing & VIP Pass</a>
            </div>

            <div className="md:col-span-3 flex flex-col gap-3 text-left">
              <span className="font-bold text-white text-xs uppercase tracking-widest">Safety & Privacy</span>
              <a href="#" className="hover:text-white transition text-xs text-slate-400">Community Rules</a>
              <a href="#" className="hover:text-white transition text-xs text-slate-400">AI Face Moderation</a>
              <a href="#" className="hover:text-white transition text-xs text-slate-400">Report & Disconnect</a>
            </div>
          </div>

          <div className="h-px bg-white/5 w-full my-2"></div>

          {/* Horizontal Links Footer */}
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

      {/* COOKIE CONSENT BANNER */}
      <AnimatePresence>
        {!cookieConsentOk && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-6 z-50 max-w-sm p-5 rounded-2xl bg-slate-950/90 border border-white/10 shadow-2xl backdrop-blur-lg flex flex-col gap-3"
          >
            <p className="text-xs text-slate-300 leading-relaxed text-left">
              We use cookies to improve your matching quality and save preferences. By continuing, you agree to our cookie policy.
            </p>
            <div className="flex justify-end">
              <button
                onClick={handleAcceptCookies}
                className="px-4 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-bold transition"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AUTHENTICATION MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center p-6 z-50 backdrop-blur-md animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className={
                authMode === 'forgot' || authMode === 'reset'
                  ? 'bg-white w-full max-w-[420px] rounded-3xl p-6 md:p-8 relative shadow-2xl border border-slate-100'
                  : 'glass-panel border border-white/10 w-full max-w-[420px] rounded-3xl p-6 md:p-8 relative shadow-premium'
              }
            >
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError('');
                  setForgotSuccess(false);
                  if (authMode === 'forgot' || authMode === 'reset') {
                    setAuthMode('login');
                  }
                }}
                className={`absolute top-5 right-5 p-1 rounded-xl transition ${
                  authMode === 'forgot' || authMode === 'reset'
                    ? 'text-slate-455 hover:text-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col gap-6 text-left">
                {(authMode === 'login' || authMode === 'signup') && (
                  <>
                    <div className="text-center flex flex-col gap-2">
                      <h3 className="font-extrabold text-2xl text-white font-sans">
                        {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        {authMode === 'login' 
                          ? 'Sign in to access your matches, history, and contact book.' 
                          : 'Join Lunaar today to start video matching with verified users.'}
                      </p>
                    </div>

                    {/* Tab selector */}
                    <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-900/60 border border-white/5">
                      <button
                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                        className={`py-2 rounded-lg text-xs font-bold transition ${
                          authMode === 'login' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                        className={`py-2 rounded-lg text-xs font-bold transition ${
                          authMode === 'signup' ? 'bg-brand-primary text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Register
                      </button>
                    </div>
                  </>
                )}

                {/* Auth Error Display */}
                {authError && (
                  <div className="p-3.5 rounded-xl bg-brand-primary/10 border border-brand-primary/25 text-brand-primary text-xs font-semibold text-center">
                    {authError}
                  </div>
                )}

                {/* Form fields */}
                {(authMode === 'login' || authMode === 'signup') && (
                  <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                    {authMode === 'signup' && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Display Username</label>
                        <input
                          type="text"
                          value={nicknameInput}
                          onChange={(e) => setNicknameInput(e.target.value)}
                          placeholder="e.g. JohnDoe"
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="e.g. name@example.com"
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none"
                      />
                      {authMode === 'login' && (
                        <div className="flex justify-end mt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('forgot');
                              setAuthError('');
                              setEmailInput('');
                              setForgotSuccess(false);
                            }}
                            className="text-xs font-semibold text-brand-primary hover:text-brand-primaryHover transition hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 mt-2 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white font-extrabold text-xs transition flex items-center justify-center gap-2"
                    >
                      {authLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : authMode === 'login' ? (
                        'Sign In'
                      ) : (
                        'Create Account'
                      )}
                    </button>
                    {authMode === 'signup' && (
                      <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed font-medium">
                        Note: Please check your <strong className="text-slate-350">Spam or Junk folder</strong> if you do not see the activation email in your inbox.
                      </p>
                    )}
                  </form>
                )}

                {/* FORGOT PASSWORD FORM (Image 2) */}
                {authMode === 'forgot' && !forgotSuccess && (
                  <div className="flex flex-col gap-5 text-center mt-2">
                    <h3 className="font-extrabold text-3xl text-slate-900 font-sans tracking-tight">
                      Lost Password?
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed text-left px-1 font-medium">
                      Type your e-mail below and we'll send you an e-mail with instructions to reset your password.
                    </p>
                    <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 text-left">
                      <div className="flex flex-col gap-1.5 relative">
                        <input
                          type="email"
                          required
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="Email Address"
                          className="w-full py-3 px-4 pr-10 rounded-xl text-sm font-medium bg-[#f8fafc] border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#e52424] focus:bg-white outline-none transition"
                        />
                        <div className="absolute right-4 top-[14px] text-slate-450">
                          <User className="w-5 h-5" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3.5 mt-2 rounded-xl bg-[#e52424] hover:bg-[#c91d1d] text-white font-extrabold text-sm transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                      >
                        {authLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Send'
                        )}
                      </button>
                    </form>
                    
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAuthError(''); }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-850 transition hover:underline mt-1"
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}

                {/* FORGOT PASSWORD SUCCESS POPUP (Image 3) */}
                {authMode === 'forgot' && forgotSuccess && (
                  <div className="flex flex-col gap-5 text-center mt-2 py-4">
                    <h3 className="font-extrabold text-3xl text-slate-900 font-sans tracking-tight">
                      Lost Password?
                    </h3>
                    <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-2xl bg-red-50 border-2 border-[#e52424]/20 text-[#e52424]">
                      <Mail className="w-10 h-10" />
                    </div>
                    <p className="text-slate-800 font-bold text-sm leading-relaxed max-w-[280px] mx-auto">
                      If this e-mail exists a password reset link has been sent.
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-[260px] mx-auto font-medium leading-relaxed">
                      Please check your <strong>Spam or Junk folder</strong> if the email does not show up in a few minutes.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAuthModal(false);
                        setForgotSuccess(false);
                        setAuthMode('login');
                        setAuthError('');
                        setEmailInput('');
                      }}
                      className="w-full py-3.5 mt-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition active:scale-[0.98]"
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* RESET PASSWORD FORM (Image 5) */}
                {authMode === 'reset' && (
                  <div className="flex flex-col gap-5 text-center mt-2">
                    <h3 className="font-extrabold text-3xl text-slate-900 font-sans tracking-tight">
                      Lost Password?
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed text-left px-1 font-medium">
                      Type your new password in the box below:
                    </p>
                    <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 text-left">
                      <div className="flex flex-col gap-1.5 relative">
                        <input
                          type="password"
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Enter Password"
                          className="w-full py-3 px-4 pr-10 rounded-xl text-sm font-medium bg-[#f8fafc] border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#e52424] focus:bg-white outline-none transition"
                        />
                        <div className="absolute right-4 top-[14px] text-slate-450">
                          <Lock className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 relative">
                        <input
                          type="password"
                          required
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          placeholder="Confirm Password"
                          className="w-full py-3 px-4 pr-10 rounded-xl text-sm font-medium bg-[#f8fafc] border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#e52424] focus:bg-white outline-none transition"
                        />
                        <div className="absolute right-4 top-[14px] text-slate-455">
                          <Lock className="w-5 h-5" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3.5 mt-2 rounded-xl bg-[#e52424] hover:bg-[#c91d1d] text-white font-extrabold text-sm transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                      >
                        {authLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Confirm'
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* Divider temporarily removed
                <div className="flex items-center gap-3 my-4">
                  <div className="h-px bg-white/10 flex-grow"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Or Continue With</span>
                  <div className="h-px bg-white/10 flex-grow"></div>
                </div>
                */}

                {/* Google OAuth button temporarily removed
                <div className="w-full flex justify-center mt-2 min-h-[40px]">
                  <div id="google-signin-btn"></div>
                </div>
                */}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REGISTRATION SUCCESSFUL / ACTIVATION PENDING MODAL */}
      <AnimatePresence>
        {showActivationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center p-6 z-50 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white text-slate-800 w-full max-w-[420px] rounded-[28px] overflow-hidden relative shadow-2xl flex flex-col font-sans select-text"
            >
              {/* Close Button */}
              <button
                onClick={() => { setShowActivationModal(false); }}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-700 transition z-10"
              >
                <X className="w-5 h-5 stroke-[2.5px]" />
              </button>

              {/* Top White Section */}
              <div className="p-8 pt-10 text-center flex flex-col gap-5">
                {/* Custom Envelope Icon with Checkmark Badge */}
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <svg className="w-16 h-16 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <div className="absolute top-1.5 right-1 w-6 h-6 bg-[#E53E3E] rounded-full border-2 border-white flex items-center justify-center shadow">
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h3 className="font-extrabold text-[26px] text-slate-900 leading-tight">
                    Registration Successful!
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed px-2">
                    We sent an email to <span className="font-bold text-slate-900">{activationEmail}</span> with a link to activate your account.
                  </p>
                </div>

                {/* Bold Red Warning Box */}
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-955 flex flex-col gap-1 text-left shadow-sm mx-2">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-red-700">⚠️ IMPORTANT</span>
                  <p className="font-bold text-xs leading-normal">
                    Gmail and other mail providers often put this email in your <span className="underline decoration-wavy decoration-red-500 font-black text-red-650">Spam or Junk folder</span>. Please check there first!
                  </p>
                </div>

                {/* Go to Gmail.com Button */}
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl bg-[#E53E3E] hover:bg-[#C53030] text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  Go to Gmail.com
                  <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </a>
              </div>

              {/* Bottom Light Grey-Blue Section */}
              <div className="bg-[#F0F4F8] p-8 border-t border-slate-200 text-left flex flex-col gap-5">
                <div className="text-xs text-slate-600 leading-relaxed flex flex-col gap-3">
                  <p>Depending on your email provider, it could take a few minutes until you receive the email.</p>
                  <div>
                    <span className="font-bold text-slate-800">Didn't receive an email?</span>
                    <p className="mt-1">Please check your <span className="font-bold text-slate-800">spam folder</span> or enter a new email address below.</p>
                  </div>
                </div>

                {/* Resend/Update Form */}
                <form onSubmit={handleResendActivation} className="flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={newActivationEmail}
                      onChange={(e) => setNewActivationEmail(e.target.value)}
                      placeholder="New Valid Email Address"
                      className="w-full py-3 pl-4 pr-10 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none transition shadow-sm"
                    />
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>

                  {resendMessage && (
                    <div className="text-xs font-bold text-emerald-600 text-center bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-100">
                      {resendMessage}
                    </div>
                  )}

                  {resendError && (
                    <div className="text-xs font-bold text-rose-600 text-center bg-rose-50 py-2 px-3 rounded-lg border border-rose-100">
                      {resendError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full py-3 rounded-xl bg-[#D2D6DC] hover:bg-[#BFC4CD] disabled:bg-slate-200 text-slate-800 font-extrabold text-xs transition flex items-center justify-center gap-2 border border-slate-300"
                  >
                    {resendLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                    ) : (
                      'Send Again'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}


// Custom sliders icon since sliders-horizontal might be missing
function SlidersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  );
}

