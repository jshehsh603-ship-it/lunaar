'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, HelpCircle, RefreshCw, FileText, Lock } from 'lucide-react';
import audioSynth from '../../components/AudioEffects';

export default function BillingSupportPage() {
  const router = useRouter();

  const handleBack = () => {
    audioSynth.playClick();
    router.push('/');
  };

  const handleSegpayPortal = () => {
    audioSynth.playClick();
    window.open('https://cs.segpay.com/', '_blank', 'noopener,noreferrer');
  };

  const handleContactEmail = () => {
    audioSynth.playClick();
    window.location.href = 'mailto:support@lunaar.com?subject=Billing%20Support%20-%20Lunaar';
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0F0514] overflow-x-hidden selection:bg-brand-primary selection:text-white">
      {/* Background Glow */}
      <div 
        className="absolute inset-x-0 top-0 h-[500px] pointer-events-none z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(229, 36, 36, 0.08), rgba(15, 5, 20, 0))'
        }}
      ></div>

      {/* HEADER NAVBAR */}
      <header className="relative z-10 w-full border-b border-white/5 bg-[#0F0514]/60 backdrop-blur-md sticky top-0 premium-header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleBack}>
            <span className="font-extrabold text-xl tracking-[0.2em] text-white premium-glowing-text">
              LUN<span className="text-brand-primary font-sans">AAR</span>
            </span>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* CONTENT CONTAINER */}
      <main className="relative z-10 flex-grow max-w-4xl mx-auto px-6 py-12 md:py-16 w-full flex flex-col gap-8">
        
        {/* Page Title */}
        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-sans">Billing Support</h1>
            <p className="text-xs text-slate-500 mt-1">Last updated: December 10, 2025</p>
          </div>
        </div>

        {/* Legal Text Layout */}
        <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-10 text-left text-slate-300 text-sm leading-relaxed flex flex-col gap-6 font-sans">
          
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">Billing Policies</h2>
            <p>
              While Lunaar provides core random video and text discovery features for free, premium features (such as gender filtering and country selection) require the purchase of a VIP Pass subscription. All purchases are governed by this Billing Support Policy.
            </p>
          </section>

          <section className="flex flex-col gap-2 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-1.5">
              <Lock className="w-4 h-4 shrink-0" /> Secure Payment Processing
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Lunaar does not process, handle, or store your credit/debit card data. All payments are securely routed and processed through our trusted billing partner, <strong className="text-white">SegPay</strong>. Purchases will appear discreetly on your bank statement under the billing name of SegPay.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">Billing Terms & Inquiries</h2>
            
            <div className="flex flex-col gap-1.5">
              <h3 className="font-bold text-white text-sm">Managing Subscriptions</h3>
              <p className="text-xs text-slate-400">
                You are responsible for managing your active subscription tiers. You can review your transaction history, check renew states, update billing information, and cancel your plan directly via the SegPay consumer portal at <a href="https://cs.segpay.com/" target="_blank" rel="noopener noreferrer nofollow" className="text-brand-primary hover:underline font-semibold">cs.segpay.com</a>.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-bold text-white text-sm">Cancellation Policy</h3>
              <p className="text-xs text-slate-400">
                You may cancel your VIP Pass subscription at any time to avoid future renewals. Upon cancellation, your premium features remain active until the end of your current billing cycle, and no further charges will be made.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-bold text-white text-sm">Refund Policy</h3>
              <p className="text-xs text-slate-400">
                All purchases of VIP Passes are final. We do not provide refunds, partial credits, or proration for unused days during an active subscription period. If you believe you have been billed in error, please contact us immediately to review your request.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-bold text-white text-sm">Billing Disputes & Chargebacks</h3>
              <p className="text-xs text-slate-400">
                Misuse of the billing or chargeback process violates our Terms of Service. If you experience billing errors, please reach out to SegPay support or our customer desk first. Lunaar reserves the right to suspend accounts or reclaim access in instances of unresolved chargebacks.
              </p>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex flex-col items-center justify-between p-5 border border-white/5 bg-slate-950/40 rounded-2xl text-center gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5 justify-center">
                  <HelpCircle className="w-4 h-4 text-brand-primary" /> SegPay Billing Support
                </h4>
                <p className="text-[11px] text-slate-500 max-w-[280px]">
                  Use the self-service consumer portal to cancel memberships, check statements, and resolve payment errors.
                </p>
              </div>
              <button
                onClick={handleSegpayPortal}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition"
              >
                Go to SegPay Portal
              </button>
            </div>

            <div className="flex flex-col items-center justify-between p-5 border border-white/5 bg-slate-950/40 rounded-2xl text-center gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5 justify-center">
                  <FileText className="w-4 h-4 text-brand-primary" /> Contact Support Team
                </h4>
                <p className="text-[11px] text-slate-500 max-w-[280px]">
                  If SegPay support is unable to resolve your inquiry, email our billing desk directly for custom support.
                </p>
              </div>
              <button
                onClick={handleContactEmail}
                className="w-full py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-bold transition shadow-lg shadow-brand-primary/10"
              >
                Email Support Team
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-8 border-t border-white/5 bg-[#09030D]/90 text-sm text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs font-bold">
          <div>&copy; {new Date().getFullYear()} Lunaar Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
