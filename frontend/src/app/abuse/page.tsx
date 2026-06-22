'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, ShieldAlert, Mail } from 'lucide-react';
import audioSynth from '../../components/AudioEffects';

export default function AbusePage() {
  const router = useRouter();

  const handleBack = () => {
    audioSynth.playClick();
    router.push('/');
  };

  const handleReportEmail = () => {
    audioSynth.playClick();
    window.location.href = 'mailto:support@lunaar.com?subject=Report%20Abuse%20-%20Lunaar';
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
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-sans">Abuse Reporting & Content Removal</h1>
            <p className="text-xs text-slate-500 mt-1">Last updated: December 10, 2025</p>
          </div>
        </div>

        {/* Legal Text Layout */}
        <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-10 text-left text-slate-300 text-sm leading-relaxed flex flex-col gap-6 font-sans">
          
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">Our Commitment</h2>
            <p>
              At <strong>Lunaar</strong>, we are committed to maintaining a secure, respectful, and law-abiding platform. We do not tolerate illegal activity, harassment, abuse, or intellectual property infringement. This document outlines our policy and procedures for handling reports of abuse and requests for content removal.
            </p>
          </section>

          <section className="flex flex-col gap-2 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" /> Zero Tolerance Policy
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Any content or behavior involving minor exploitation, explicit sharing without consent, violence, or malicious threats is taken down immediately. Accounts in violation of these rules are permanently banned from the platform and reported to the National Center for Missing & Exploited Children (NCMEC) and appropriate law enforcement authorities.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">Procedures and Timelines</h2>
            
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-white text-sm">1. Submission of Abuse Complaints</h3>
              <p className="text-xs text-slate-400">
                Users can report any alleged unlawful activity, policy violations, or inappropriate behavior encountered during active matchmaking sessions. Reports can be filed instantly using the in-chat flag controls or by emailing our moderation desk directly at <a href="mailto:support@lunaar.com" className="text-brand-primary hover:underline font-semibold">support@lunaar.com</a>. We review all formal complaints within five (5) business days.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-white text-sm">2. Content Removal & Depiction Appeals</h3>
              <p className="text-xs text-slate-400">
                If your image, voice, or profile is depicted without your explicit consent or in an infringing manner, you have the right to request immediate removal. Once an appeal is received, we will verify the consent credentials. If consent cannot be established or is void under law, the content is permanently purged. Consent disputes are referred to a neutral, third-party arbitrator.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-white text-sm">3. Automatic Reporting & Legal Cooperation</h3>
              <p className="text-xs text-slate-400">
                Lunaar complies with all state, federal, and international reporting laws. We work closely with cybercrime divisions and payment networks. Valid evidence of illegal operations is handed over to law enforcement and relevant security organizations immediately.
              </p>
            </div>
          </section>

          {/* Call to action */}
          <div className="flex flex-col items-center justify-center p-6 border border-white/5 bg-slate-950/40 rounded-2xl gap-4 text-center mt-4">
            <div className="flex flex-col gap-1">
              <h4 className="font-extrabold text-white text-base">Need to File a Report?</h4>
              <p className="text-xs text-slate-500 max-w-md">
                Send details, screenshots, usernames, or transaction tokens to our abuse resolution desk for immediate investigation.
              </p>
            </div>
            <button
              onClick={handleReportEmail}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-bold transition shadow-lg shadow-brand-primary/10 hover:shadow-brand-primary/20"
            >
              <Mail className="w-4 h-4" />
              <span>Email Abuse Resolution Desk</span>
            </button>
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
