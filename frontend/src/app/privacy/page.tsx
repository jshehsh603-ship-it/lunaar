'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Eye, Lock, Database } from 'lucide-react';
import audioSynth from '../../components/AudioEffects';

export default function PrivacyPage() {
  const router = useRouter();

  const handleBack = () => {
    audioSynth.playClick();
    router.push('/');
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

      {/* PRIVACY CONTENT CONTAINER */}
      <main className="relative z-10 flex-grow max-w-4xl mx-auto px-6 py-12 md:py-16 w-full flex flex-col gap-8">
        
        {/* Page Title */}
        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <Shield className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-sans">Privacy Policy</h1>
            <p className="text-xs text-slate-500 mt-1">Last updated: December 10, 2025</p>
          </div>
        </div>

        {/* Legal Text Layout */}
        <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-10 text-left text-slate-300 text-sm leading-relaxed flex flex-col gap-6 font-sans">
          
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">1. Introduction</h2>
            <p>
              At <strong>Lunaar</strong> (&ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>,&rdquo; or &ldquo;<strong>our</strong>&rdquo;), your privacy is our top priority. This Privacy Policy explains how we collect, use, process, and protect your personal data when you access or interact with our website, video matchmaker, and chat services (collectively, the &ldquo;<strong>Services</strong>&rdquo;).
            </p>
            <p>
              By accessing or using the Services, you acknowledge that you have read, understand, and agree to the data collection and processing practices described in this policy. If you do not agree, please do not use the Services.
            </p>
          </section>

          <section className="flex flex-col gap-2 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-1.5">
              <Lock className="w-4 h-4 shrink-0" /> Protecting Minors
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Lunaar is strictly for individuals who are 18 years of age or older. We do not knowingly collect personal data from anyone under the age of 18. If we discover that a minor has created an account or accessed the Services, we will immediately delete their information and terminate their access.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">2. Data We Collect</h2>
            <p>We collect the following categories of information to provide, secure, and improve our platform:</p>
            <ul className="list-disc pl-5 flex flex-col gap-2 text-xs text-slate-400 mt-1">
              <li>
                <strong className="text-slate-300">Account Information:</strong> If you choose to sign in (e.g., using Google or Apple authentication), we receive basic credentials such as your name, email address, and profile picture. You may also specify gender preferences or interests to customize matches.
              </li>
              <li>
                <strong className="text-slate-300">Device & Usage Data:</strong> We automatically log technical details including your IP address, browser type, device identifiers, operating system, and general geographic location (e.g., country or city level).
              </li>
              <li>
                <strong className="text-slate-300">Communication Content:</strong> To connect you with others, we transmit real-time video, audio, and text chat. To ensure safety and enforce our policies, our systems perform real-time AI moderation. In some instances, limited screenshots or short, anonymized snippets may be analyzed by our automated moderation tools to prevent abuse, harassment, or minor endangerment. These assets are handled securely and are never used for advertising.
              </li>
              <li>
                <strong className="text-slate-300">Payment Information:</strong> If you purchase a VIP Pass, transaction details are collected directly by our third-party payment processors. We do not store or have access to your full credit card number or bank credentials.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">3. How We Use Your Data</h2>
            <p>We process your data for the following essential business purposes:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 text-xs text-slate-400 mt-1">
              <li>Facilitating instant video/text connection matching between users;</li>
              <li>Processing and managing VIP subscriptions and renewals;</li>
              <li>Enforcing our Terms of Service and moderation guidelines via automated detection and user reporting systems;</li>
              <li>Analyzing and optimizing server performance, matching speed, and features;</li>
              <li>Responding to support tickets, resolving platform issues, and providing customer care; and</li>
              <li>Complying with applicable legal processes or responding to lawful government request requests.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">4. Sharing Your Information</h2>
            <p>We do not sell your personal data. We disclose information only as follows:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 text-xs text-slate-400 mt-1">
              <li>
                <strong className="text-slate-300">Service Providers:</strong> To hosting providers, CDN servers, moderation partners, payment processors, and analytics vendors who assist us under strict contractual confidentiality terms.
              </li>
              <li>
                <strong className="text-slate-300">Legal Compliance & Abuse Prevention:</strong> When required by court order, law, or to report severe illegal activity (such as child exploitation content) to law enforcement or child protection agencies (e.g., NCMEC).
              </li>
              <li>
                <strong className="text-slate-300">Corporate Transfers:</strong> In the event of a merger, acquisition, restructuring, or asset transfer, where data is transferred under ongoing protection terms.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">5. Cookies and Tracking</h2>
            <p>
              We use essential cookies to manage your connection session, retain user matching filter choices, and check your age consent checkbox. You can manage, disable, or refuse non-essential cookies via your browser settings. Please note that blocking essential cookies will disrupt site performance and matchmaking queues.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">6. International Data Transfers</h2>
            <p>
              Lunaar is operated out of the United States. Your information may be processed and stored globally. When we transfer personal data out of the EEA, UK, or Switzerland, we utilize standard safeguards such as Standard Contractual Clauses (SCCs) to maintain the security and legality of your data.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">7. Your Rights and Choices</h2>
            <p>Depending on where you live (such as the EEA, UK, Canada, or certain US states), you may have the following data rights:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 text-xs text-slate-400 mt-1">
              <li><strong className="text-slate-300">Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-slate-300">Correction:</strong> Request updates to inaccurate or incomplete personal records.</li>
              <li><strong className="text-slate-300">Erasure:</strong> Request the deletion of your personal data, subject to legal overrides.</li>
              <li><strong className="text-slate-300">Restriction & Objection:</strong> Limit or object to certain data processing activities.</li>
              <li><strong className="text-slate-300">Consent Withdrawal:</strong> Withdraw consent for optional processing at any time.</li>
            </ul>
            <p className="mt-1">
              To exercise any of these rights, please email us at <a href="mailto:support@lunaar.com" className="text-brand-primary hover:underline">support@lunaar.com</a>.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">8. Data Retention & Security</h2>
            <p>
              We retain personal data for as long as necessary to provide the Services, enforce safety policies, and comply with tax or legal records. After account closure, we may keep limited, non-reversible hashed identifiers (like a hash of an email or device footprint) solely to enforce bans and prevent re-registration of malicious users.
            </p>
            <p>
              We utilize robust technical and administrative safeguards designed to protect your data. However, since no internet transmission is 100% secure, any content you transmit is at your own risk.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">9. Updates & Contact Info</h2>
            <p>
              We may modify this Privacy Policy from time to time. Updates will be posted here with a revised last-updated date.
            </p>
            <p>
              For any questions, requests, or privacy inquiries, contact us at: <a href="mailto:support@lunaar.com" className="text-brand-primary hover:underline">support@lunaar.com</a>.
            </p>
          </section>

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
