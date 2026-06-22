'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, FileText } from 'lucide-react';
import audioSynth from '../../components/AudioEffects';

export default function TermsPage() {
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

      {/* TERMS CONTENT CONTAINER */}
      <main className="relative z-10 flex-grow max-w-4xl mx-auto px-6 py-12 md:py-16 w-full flex flex-col gap-8">
        
        {/* Page Title */}
        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-sans">Terms of Service</h1>
            <p className="text-xs text-slate-500 mt-1">Last updated: December 10, 2025</p>
          </div>
        </div>

        {/* Legal Text Layout */}
        <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-10 text-left text-slate-300 text-sm leading-relaxed flex flex-col gap-6 font-sans">
          
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">1. Introduction and Acceptance</h2>
            <p>
              These terms of service (&ldquo;<strong>Terms</strong>&rdquo;) constitute a legally binding agreement between you (&ldquo;<strong>you</strong>&rdquo; or &ldquo;<strong>your</strong>&rdquo;) and <strong>Lunaar</strong> (&ldquo;<strong>Company</strong>,&rdquo; &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>,&rdquo; or &ldquo;<strong>our</strong>&rdquo;). These Terms govern your access to and use of all features, functionalities, and services provided by us (collectively, the &ldquo;<strong>Services</strong>&rdquo;) via our website and related platforms.
            </p>
            <p>
              Please read these Terms carefully before you access or use the Services. By accessing or using the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and all additional policies incorporated by reference, including our Community Guidelines, Safety and Reporting Policy, Cookie Use Policy, and Privacy Policy. If you do not agree to these Terms, you must not use or access the Services.
            </p>
          </section>

          <section className="flex flex-col gap-2 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-1.5">
              <Shield className="w-4 h-4 shrink-0" /> Important Notice Regarding Dispute Resolution
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              These Terms include a binding arbitration provision and a waiver of your right to participate in class actions or other representative proceedings. Except where prohibited by law, you agree that disputes arising out of or relating to your use of the Services will be resolved through binding individual arbitration rather than in court.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">2. Overview of the Services</h2>
            <p>
              The Services enable users to connect and communicate through real-time video and text chat. You may interact with other users randomly or through available filters (such as region, interests, or language). Some features require creating an account, providing limited information, or enabling device permissions such as access to your camera, microphone, or notifications.
            </p>
            <p>
              The Services may include optional features, including but not limited to the ability to upload profile content, purchase virtual membership passes (VIP Pass), filter matches, and access premium features.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">3. Eligibility and Account Requirements</h2>
            <h3 className="font-bold text-white text-sm mt-1">Age Requirement</h3>
            <p>
              You must be at least 18 years old (or the age of majority in your jurisdiction) to use the Services. Persons under this age are strictly prohibited from accessing or using the Services. By using the Services, you state that you are at least 18 years of age and have the legal capacity to enter into this Agreement. If we reasonably believe that you are under 18, we may restrict, suspend, or terminate your access to the Services without notice.
            </p>
            
            <h3 className="font-bold text-white text-sm mt-1">Compliance with Laws</h3>
            <p>
              You may use the Services only where doing so is lawful and complies with all applicable laws and regulations. You are solely responsible for ensuring that your use of the Services is lawful in the jurisdiction where you access them.
            </p>

            <h3 className="font-bold text-white text-sm mt-1">Accounts and Registration</h3>
            <p>
              Some features may require you to create an account or sign in using a third-party provider (for example, Google). When registering for an account, you agree to provide accurate, current, and complete information; keep your credentials confidential; and promptly update your info. You are responsible for all activity occurring under your account.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">4. Access to and Use of the Services</h2>
            <h3 className="font-bold text-white text-sm mt-1">License to Use</h3>
            <p>
              Subject to your full compliance with this Agreement, we hereby grant you a limited, non-exclusive, non-transferable, non-sublicensable, and revocable license to access and use the Services for personal, non-commercial purposes only. This license does not grant you any ownership rights in the Services or any associated software, content, or intellectual property.
            </p>

            <h3 className="font-bold text-white text-sm mt-1">User Conduct and Restrictions</h3>
            <p>You agree not to use the Services in any manner that:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 text-xs text-slate-400 mt-1">
              <li>Violates any applicable local, state, national, or international law;</li>
              <li>Harasses, threatens, defames, stalk, or discriminates against other members;</li>
              <li>Involves exploitation, solicitation, or endangerment of minors;</li>
              <li>Includes illegal, violent, self-harming, or malicious content;</li>
              <li>Attempts to bypass geographic locks, automated moderation systems, or account bans;</li>
              <li>Uses bots, web scrapers, or other automated scripts to index, harvest, or manipulate the platform; or</li>
              <li>Impersonates any individual or entity.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">5. VIP Premium Passes and Billing</h2>
            <h3 className="font-bold text-white text-sm mt-1">Subscriptions and Purchases</h3>
            <p>
              Some features (such as gender filtering and country matching) require paid VIP passes. We offer two subscription plan choices: <strong>1 Week VIP Pass ($8.99)</strong> and <strong>1 Month VIP Pass ($24.99)</strong>. Plans and pricing are disclosed at the time of purchase.
            </p>

            <h3 className="font-bold text-white text-sm mt-1">Auto-Renewal and Cancellations</h3>
            <p>
              Subscriptions automatically renew for successive periods at the current rate unless canceled before the end of the billing cycle. You may cancel your subscription at any time to avoid future renewals.
            </p>

            <h3 className="font-bold text-white text-sm mt-1">Refund Policy</h3>
            <p>
              All purchases of VIP Premium passes are final and non-refundable, except where required by law.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">6. User Content and AI Moderation</h2>
            <p>
              &ldquo;User Content&rdquo; refers to all streams, video, audio, text chat, and images transmitted during your active sessions. You retain your intellectual property ownership of your User Content, but grant us a royalty-free license to transmit, display, and perform this content to facilitate your live connections.
            </p>
            <p>
              To maintain platform safety, we implement real-time AI moderation checks (such as face filters and validation checking). Automated screenshot captures or video snippets may be analyzed by our moderation systems to prevent violation of terms. All such processing is done safely in compliance with our Privacy Policy.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">7. Disclaimers and Limitations of Liability</h2>
            <p className="italic text-slate-400">
              The Services are provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis. We do not represent or warrant that the services will be secure, uninterrupted, or error-free. We perform no background checks on users and you chat at your own discretion.
            </p>
            <p>
              To the maximum extent permitted by law, Lunaar and its affiliates shall not be liable for any indirect, special, incidental, or consequential damages arising out of your use of the website, video matcher, or chat modules.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider border-b border-white/5 pb-2">8. Governing Law</h2>
            <p>
              Wyoming law governs all adversarial proceedings arising out of these Terms or your access to or use of the Services. Any informal dispute resolution requests or support tickets can be sent to <a href="mailto:support@lunaar.com" className="text-brand-primary hover:underline">support@lunaar.com</a>.
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
