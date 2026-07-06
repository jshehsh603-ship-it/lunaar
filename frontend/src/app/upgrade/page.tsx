'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Shield, Sparkles, Star, Check, ArrowLeft, Award, Lock,
  ChevronDown, ChevronUp, CreditCard, Loader2, X
} from 'lucide-react';
import audioSynth from '../../components/AudioEffects';
import { COUNTRIES } from '../../constants/countries';
interface PayPalButtonProps {
  plan: 'week' | 'month';
  userId: string;
  onSuccess: (updatedUser: any) => void;
  onError: (errorMsg: string) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

const PayPalButton: React.FC<PayPalButtonProps> = ({
  plan,
  userId,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const backendUrl = typeof window !== 'undefined' && window.location.port === '3000'
          ? 'http://localhost:3001'
          : window.location.origin;
        const res = await fetch(`${backendUrl}/api/config/paypal`);
        const data = await res.json();
        setPaypalClientId(data.clientId);
      } catch (err) {
        console.error('Failed to fetch PayPal config:', err);
        setPaypalClientId('your-paypal-sandbox-client-id-here');
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!paypalClientId) return;

    const scriptId = 'paypal-sdk-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initializeButtons = () => {
      setSdkReady(true);
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&components=buttons&disable-funding=paypal,paylater,venmo`;
      script.async = true;
      script.onload = initializeButtons;
      document.body.appendChild(script);
    } else {
      if ((window as any).paypal) {
        initializeButtons();
      } else {
        script.addEventListener('load', initializeButtons);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', initializeButtons);
      }
    };
  }, [paypalClientId]);

  useEffect(() => {
    if (!sdkReady || !(window as any).paypal || !containerRef.current) return;

    // Clear previous button content if any
    containerRef.current.innerHTML = '';

    try {
      (window as any).paypal.Buttons({
        fundingSource: (window as any).paypal.FUNDING.CARD,
        style: {
          color: 'black',
          shape: 'rect',
          label: 'checkout'
        },
        createOrder: (data: any, actions: any) => {
          const amount = plan === 'week' ? '8.99' : '24.99';
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  currency_code: 'USD',
                  value: amount
                }
              }
            ]
          });
        },
        onApprove: async (data: any, actions: any) => {
          setIsProcessing(true);
          try {
            const backendUrl = typeof window !== 'undefined' && window.location.port === '3000'
              ? 'http://localhost:3001'
              : window.location.origin;
            const res = await fetch(`${backendUrl}/api/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                orderId: data.orderID,
                plan: plan,
                userId: userId
              })
            });

            const result = await res.json();
            if (result.success) {
              onSuccess(result.user);
            } else {
              onError(result.error || 'Payment verification failed.');
            }
          } catch (err: any) {
            console.error('PayPal verification exception', err);
            onError(err.message || 'Verification connection failed.');
          } finally {
            setIsProcessing(false);
          }
        },
        onError: (err: any) => {
          console.error('PayPal Buttons error', err);
          onError('PayPal transaction encountered an error. Please try again.');
        }
      }).render(containerRef.current);
    } catch (e) {
      console.error('Error rendering PayPal buttons:', e);
    }
  }, [sdkReady, plan, userId]);

  return (
    <div className="w-full relative flex flex-col gap-2">
      {(!sdkReady || isProcessing) && (
        <div className="flex items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-2xl gap-2 text-slate-550 text-slate-500 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-slate-450" />
          <span>{isProcessing ? 'Verifying transaction...' : 'Loading PayPal buttons...'}</span>
        </div>
      )}
      <div ref={containerRef} className={isProcessing ? 'pointer-events-none opacity-55' : ''} />
    </div>
  );
};

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get('embed') === 'true';

  // Profile data
  const [profile, setProfile] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'select' | 'payment'>('select');

  // Load selected plan from query parameters if present
  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam === 'week' || planParam === 'month') {
      setSelectedPlan(planParam);
      setStep('payment');
    }
  }, [searchParams]);

  // Load user data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('lunaar_user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          setProfile(userObj);
          setIsPremium(userObj.isPremium || false);
        } catch (e) {
          console.error('Failed to parse user profile:', e);
        }
      }
      setLoading(false);
    }
  }, []);

  // Lock body scroll when payment modal is open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (step === 'payment') {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [step]);

  const handleBackClick = () => {
    audioSynth.playClick();
    if (step === 'payment') {
      setStep('select');
    } else {
      router.back();
    }
  };

  // Checkout state variables
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [hasInteractedWithAddress, setHasInteractedWithAddress] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  const getRenewalDate = () => {
    const date = new Date();
    if (selectedPlan === 'week') {
      date.setDate(date.getDate() + 7);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 16);
    const matches = value.match(/\d{1,4}/g);
    setCardNumber(matches ? matches.join(' ') : '');
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 4);
    if (value.length > 2) {
      setExpiryDate(`${value.substring(0, 2)} / ${value.substring(2, 4)}`);
    } else {
      setExpiryDate(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCvv(value.substring(0, 4));
  };

  const handleCardConfirm = async () => {
    audioSynth.playClick();
    
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      alert('Please enter a valid 16-digit credit card number.');
      return;
    }
    if (expiryDate.replace(/\s/g, '').length !== 5) {
      alert('Please enter a valid expiry date (MM / YY).');
      return;
    }
    if (cvv.length < 3) {
      alert('Please enter a valid 3 or 4 digit CVV code.');
      return;
    }
    if (!cardholderName.trim()) {
      alert("Please enter the cardholder's full name.");
      return;
    }
    if (!billingAddress.trim()) {
      alert('Please enter your billing street address.');
      return;
    }
    if (!city.trim()) {
      alert('Please enter your billing city.');
      return;
    }
    if (!state.trim()) {
      alert('Please enter your billing state.');
      return;
    }
    if (!postalCode.trim()) {
      alert('Please enter your billing postal/ZIP code.');
      return;
    }

    setIsProcessing(true);

    try {
      const backendUrl = typeof window !== 'undefined' && window.location.port === '3000'
        ? 'http://localhost:3001'
        : window.location.origin;
      const response = await fetch(`${backendUrl}/api/payments/process-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cardNumber,
          expiryDate,
          cvv,
          cardholderName,
          streetAddress: billingAddress,
          city,
          state,
          postalCode,
          countryCode,
          plan: selectedPlan,
          userId: profile?.id
        })
      });
      
      const result = await response.json();
      if (result.success) {
        const updated = {
          ...profile,
          isPremium: true
        };
        setProfile(updated);
        setIsPremium(true);
        localStorage.setItem('lunaar_user', JSON.stringify(updated));
        
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage({ type: 'UPGRADE_SUCCESS', user: updated }, '*');
        }
        
        if (profile.email) {
          const accountsStr = localStorage.getItem('lunaar_accounts');
          if (accountsStr) {
            const accounts = JSON.parse(accountsStr);
            if (accounts[profile.email]) {
              accounts[profile.email].isPremium = true;
              localStorage.setItem('lunaar_accounts', JSON.stringify(accounts));
            }
          }
        }
        
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF3B3B']
        });
        
        alert('Payment confirmed! Your Lunaar VIP Pass is now active.');
      } else {
        alert(`Payment failed: ${result.error || 'Unknown transaction error'}`);
      }
    } catch (err: any) {
      console.error('Card checkout error:', err);
      alert(`Checkout failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0813] text-white flex items-center justify-center font-extrabold text-sm">
        Loading Checkout...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0c0813] text-white flex flex-col items-center justify-center p-6 gap-4">
        <Lock className="w-12 h-12 text-rose-500 animate-pulse" />
        <h3 className="font-extrabold text-xl">Access Denied</h3>
        <p className="text-slate-400 text-xs text-center max-w-xs">
          Please log in or register on the homepage to upgrade your account to VIP status.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0813] text-white font-sans flex flex-col selection:bg-brand-primary selection:text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/10 blur-[120px] pointer-events-none"></div>

      {/* HEADER NAVBAR */}
      {!isEmbedded && (
        <header className="relative z-20 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md premium-header">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackClick}
                className="py-1.5 px-3.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              
              <div className="h-4 w-px bg-white/10 mx-1"></div>
              
              <div className="flex items-center gap-2">
                <a href="/" className="font-extrabold text-lg tracking-[0.2em] text-white premium-glowing-text flex items-center select-none animate-pulse-slow">
                  LUN<span className="text-brand-primary font-sans">AAR</span>
                </a>
                <div className="flex flex-col text-[8px] uppercase font-extrabold text-slate-500 tracking-wider leading-none border-l border-white/10 pl-2">
                  <span>Secured</span>
                  <span className="mt-0.5">Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-grow flex items-center justify-center p-6 md:p-12 animate-fade-in">
        
        {/* Always render the VIP Selection Card in the background */}
        <div className={`w-full max-w-[460px] glass-panel border border-white/10 rounded-[32px] p-6 text-white shadow-2xl flex flex-col gap-6 relative transition-all duration-350 ${
          step === 'payment'
            ? 'opacity-0 invisible scale-95 pointer-events-none'
            : 'opacity-100 visible scale-100'
        }`}>
          {/* Selection Title */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex flex-col gap-0.5">
              <div className="text-brand-primary text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary shrink-0 animate-pulse" /> VIP PREMIUM ACCESS
              </div>
              <h3 className="font-black text-2xl text-white tracking-tight">Choose Your VIP Pass</h3>
            </div>
            {!isEmbedded && (
              <button
                onClick={handleBackClick}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Plan Choice Options */}
          <div className="flex flex-col gap-4">
            {/* Weekly */}
            <button
              type="button"
              onClick={() => { audioSynth.playClick(); setSelectedPlan('week'); }}
              className={`w-full p-5 rounded-2xl border text-left flex items-center justify-between transition ${
                selectedPlan === 'week'
                  ? 'border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary/20'
                  : 'border-white/5 bg-slate-900/60 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1 Week Pass</span>
                <span className="text-[11px] text-slate-300 font-medium leading-tight">Weekly renewal. Cancel at any time.</span>
              </div>
              <div className="text-right flex flex-col gap-0.5 shrink-0">
                <span className="text-xl font-black text-white">$8.99</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase">/ week</span>
              </div>
            </button>

            {/* Monthly */}
            <button
              type="button"
              onClick={() => { audioSynth.playClick(); setSelectedPlan('month'); }}
              className={`w-full p-5 rounded-2xl border text-left flex items-center justify-between relative transition ${
                selectedPlan === 'month'
                  ? 'border-brand-primary bg-brand-primary/10 ring-2 ring-brand-primary/20'
                  : 'border-white/5 bg-slate-900/60 hover:bg-slate-900/80'
              }`}
            >
              <div className="absolute top-0 right-5 -translate-y-1/2 bg-brand-primary text-white font-extrabold text-[8px] tracking-wider uppercase px-2.5 py-0.5 rounded-full animate-pulse">
                Best Value
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1 Month Pass</span>
                <span className="text-[11px] text-slate-300 font-medium leading-tight">Monthly renewal. Cancel at any time.</span>
              </div>
              <div className="text-right flex flex-col gap-0.5 shrink-0">
                <span className="text-xl font-black text-white">$24.99</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase">/ month</span>
              </div>
            </button>
          </div>

          {/* Benefits box */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 text-xs text-slate-300 flex flex-col gap-3">
            <div className="font-bold text-slate-200">Included VIP Pass Benefits:</div>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary shrink-0" /> Target matches by Gender Selection</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary shrink-0" /> Filter matches by specific Countries</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary shrink-0" /> 2x priority matching queue speed</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-primary shrink-0" /> Premium Golden Crown avatar badges</li>
            </ul>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={() => { audioSynth.playClick(); setStep('payment'); }}
            className="w-full py-4 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white font-extrabold text-sm tracking-wide transition active:scale-[0.98] shadow-md flex items-center justify-center gap-2 shadow-brand-primary/20"
          >
            <span>Continue to Payment</span>
          </button>
        </div>

        {/* Modal Payment Overlay */}
        <AnimatePresence>
          {step === 'payment' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="w-full max-w-[440px] max-h-[80vh] overflow-y-auto premium-scrollbar bg-white rounded-[32px] p-5 text-slate-900 shadow-2xl flex flex-col gap-3.5 border border-slate-100 relative scroll-smooth"
              >
                
                {/* VIP Active Overlay */}
                {isPremium && (
                  <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm">
                    <Award className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
                    <h4 className="font-extrabold text-2xl text-white">VIP Status Active</h4>
                    <p className="text-slate-400 text-xs max-w-sm mt-2 leading-relaxed">
                      Thank you for supporting Lunaar! You have unlocked all premium benefits including gender filters, global selectors, zero ads, and priority matchmaking speeds.
                    </p>
                    <button
                      onClick={() => router.push('/chat')}
                      className="mt-6 px-6 py-3 bg-brand-primary hover:bg-brand-primaryHover text-white font-extrabold text-sm rounded-xl transition duration-300 active:scale-95 shadow-md shadow-brand-primary/20"
                    >
                      Start VIP Matching
                    </button>
                  </div>
                )}

                {/* Title Header with Back/Close button to Select Step */}
                <div className="flex items-center justify-between pb-0.5">
                  <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Subscription</h3>
                  <button
                    onClick={handleBackClick}
                    className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Collapsible Subscription Summary Card */}
                <div className="border border-slate-255/90 border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5 bg-white">
                  <button
                    type="button"
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-slate-800">Subscription</span>
                    </div>
                    {isSummaryExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  {isSummaryExpanded && (
                    <div className="flex flex-col gap-3 pt-3 border-t border-slate-150 text-[13px] text-slate-600">
                      <p className="leading-relaxed text-slate-500 font-medium text-xs">
                        Subscription renews automatically on {getRenewalDate()} for ${selectedPlan === 'week' ? '8.99' : '24.99'}/{selectedPlan === 'week' ? 'week' : 'month'}. No commitment, cancel anytime.
                      </p>
                      
                      <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                        This payment is processed in USD
                      </p>

                      <div className="flex flex-col gap-2 pt-1 text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="font-semibold text-slate-800">${selectedPlan === 'week' ? '7.55' : '20.99'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">VAT</span>
                          <span className="font-semibold text-slate-800">${selectedPlan === 'week' ? '1.13' : '3.15'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Fee</span>
                          <span className="font-semibold text-slate-800">${selectedPlan === 'week' ? '0.31' : '0.85'}</span>
                        </div>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                          <span>Total to pay</span>
                          <span className="text-base font-black text-slate-900">${selectedPlan === 'week' ? '8.99' : '24.99'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3.5 mt-4">
                  <PayPalButton
                    plan={selectedPlan}
                    userId={profile?.id}
                    onSuccess={(updatedUser) => {
                      const updated = {
                        ...profile,
                        isPremium: true
                      };
                      setProfile(updated);
                      setIsPremium(true);
                      localStorage.setItem('lunaar_user', JSON.stringify(updated));
                      
                      if (typeof window !== 'undefined' && window.parent) {
                        window.parent.postMessage({ type: 'UPGRADE_SUCCESS', user: updated }, '*');
                      }
                      
                      if (profile?.email) {
                        const accountsStr = localStorage.getItem('lunaar_accounts');
                        if (accountsStr) {
                          const accounts = JSON.parse(accountsStr);
                          if (accounts[profile.email]) {
                            accounts[profile.email].isPremium = true;
                            localStorage.setItem('lunaar_accounts', JSON.stringify(accounts));
                          }
                        }
                      }

                      confetti({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#FFD700', '#FFA500', '#FF3B3B']
                      });
                      
                      alert('Payment confirmed! Your Lunaar VIP Pass is now active.');
                    }}
                    onError={(err) => {
                      alert(err);
                    }}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                  />
                </div>
 
                  {/* Terms disclaimer */}
                  <p className="text-[11px] text-slate-450 text-slate-500 leading-normal text-center mt-1 font-medium">
                    By continuing you agree to Lunaar's{' '}
                    <a href="/terms" className="underline hover:text-slate-700 transition">
                      Terms and Conditions
                    </a>
                    . The charges on your card statement will appear as "LUNAAR".
                  </p>
 
                  {/* PCI/SSL Compliance Badges */}
                  <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-100 text-slate-400 text-[11px] font-semibold">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                      <span>PCI Compliant</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" strokeWidth="2.5" />
                      <span>SSL Encrypted</span>
                    </div>
                  </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-12 border-t border-white/5 bg-slate-950/80 text-sm text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold text-slate-400">
            <a href="/" className="text-brand-primary underline hover:text-brand-primaryHover transition">Home</a>
            <a href="/terms" className="hover:text-white transition">Terms</a>
            <a href="/privacy" className="hover:text-white transition">Privacy</a>
            <a href="/abuse" className="hover:text-white transition">Abuse</a>
            <a href="/billing-support" className="hover:text-white transition">Billing Support</a>
            <a href="/contact" className="hover:text-white transition">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#0c0813] flex items-center justify-center text-white font-bold">
        Loading...
      </div>
    }>
      <UpgradeContent />
    </React.Suspense>
  );
}
