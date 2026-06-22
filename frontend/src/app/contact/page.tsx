'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, ChevronDown, CheckCircle2, MessageSquare, AlertTriangle, Trash2, Ban } from 'lucide-react';
import audioSynth from '../../components/AudioEffects';

type Topic = {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
};

export default function ContactPage() {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState<string>('cl-item-7');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const topics: Topic[] = [
    {
      id: 'cl-item-1',
      label: 'Cancel VIP Membership',
      desc: 'Want to stop your subscription? You can easily cancel renewals in your account settings or click below to check billing resources.',
      icon: <Trash2 className="w-4 h-4 text-rose-500" />
    },
    {
      id: 'cl-item-2',
      label: 'Account & Login Issues',
      desc: 'Having trouble logging in or activating your account? Describe the errors below, and our engineering team will assist you.',
      icon: <Mail className="w-4 h-4 text-blue-500" />
    },
    {
      id: 'cl-item-3',
      label: 'Banned from Chat',
      desc: 'If you believe your profile was banned in error, submit an appeal below. Note that terms violations result in permanent bans.',
      icon: <Ban className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'cl-item-4',
      label: 'Report Bugs or Technical Issues',
      desc: 'Found a visual bug or camera problem? Tell us your browser, device, and steps to reproduce so we can fix it.',
      icon: <AlertTriangle className="w-4 h-4 text-brand-primary" />
    },
    {
      id: 'cl-item-5',
      label: 'Delete My Account',
      desc: 'Ready to delete your data? You can request account deletion below or complete it instantly in your profile dashboard settings.',
      icon: <Trash2 className="w-4 h-4 text-slate-500" />
    },
    {
      id: 'cl-item-6',
      label: 'Report Abuse',
      desc: 'To report safety violations or inappropriate behavior, fill out the details below. We review and act on abuse reports within 24 hours.',
      icon: <ShieldAlertIcon className="w-4 h-4 text-red-500" />
    },
    {
      id: 'cl-item-7',
      label: 'Other Questions',
      desc: 'For general inquiries, partnership requests, or questions, fill out the form below and we will get back to you shortly.',
      icon: <MessageSquare className="w-4 h-4 text-emerald-500" />
    }
  ];

  const currentTopic = topics.find(t => t.id === selectedTopic) || topics[6];

  const handleBack = () => {
    audioSynth.playClick();
    router.push('/');
  };

  const handleSelectTopic = (id: string) => {
    audioSynth.playClick();
    setSelectedTopic(id);
    setIsDropdownOpen(false);
    setSubject(`[${topics.find(t => t.id === id)?.label}] Inquiry`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) return;

    audioSynth.playClick();
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setIsSubmitted(true);
      audioSynth.playMatch();
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 1500);
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
            <Mail className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white font-sans">Contact Support</h1>
            <p className="text-xs text-slate-500 mt-1">Get in touch with the Lunaar support team</p>
          </div>
        </div>

        {/* Legal Text Layout */}
        <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-10 text-left text-slate-300 text-sm leading-relaxed flex flex-col gap-8 font-sans">
          
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">What is this concerning?</label>
            
            {/* Custom Dropdown Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { audioSynth.playClick(); setIsDropdownOpen(!isDropdownOpen); }}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-900/60 border border-white/10 rounded-xl text-left text-sm text-white hover:bg-slate-900/80 outline-none transition"
              >
                <div className="flex items-center gap-2.5">
                  {currentTopic.icon}
                  <span className="font-semibold">{currentTopic.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 z-20 rounded-2xl bg-slate-950/95 border border-white/10 shadow-2xl overflow-hidden py-1.5 backdrop-blur-xl">
                  {topics.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTopic(t.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 text-left transition"
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Topic Explanation */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/5 text-xs text-slate-400 leading-relaxed transition-all">
              {currentTopic.desc}
              {selectedTopic === 'cl-item-1' && (
                <a href="/billing-support" className="inline-block ml-1 text-brand-primary underline hover:text-brand-primaryHover">
                  Billing Policies &rarr;
                </a>
              )}
              {selectedTopic === 'cl-item-6' && (
                <a href="/abuse" className="inline-block ml-1 text-brand-primary underline hover:text-brand-primaryHover">
                  Abuse Policies &rarr;
                </a>
              )}
            </div>
          </div>

          <div className="h-px bg-white/5 w-full"></div>

          {/* Form */}
          <div className="relative">
            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl gap-4 text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-extrabold text-white text-lg">Message Sent!</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Thank you for reaching out. We have received your inquiry regarding &ldquo;{currentTopic.label}&rdquo; and will respond via email as soon as possible.
                  </p>
                </div>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition mt-2"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="cf_name" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Your Name <span className="text-brand-primary">*</span>
                    </label>
                    <input
                      id="cf_name"
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="cf_email" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Email Address <span className="text-brand-primary">*</span>
                    </label>
                    <input
                      id="cf_email"
                      type="email"
                      required
                      placeholder="e.g. john@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="cf_subject" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Subject <span className="text-brand-primary">*</span>
                  </label>
                  <input
                    id="cf_subject"
                    type="text"
                    required
                    placeholder="Brief summary of your inquiry"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="cf_message" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Message Body <span className="text-brand-primary">*</span>
                  </label>
                  <textarea
                    id="cf_message"
                    required
                    rows={6}
                    placeholder="Please details your request here..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full md:w-auto md:self-end px-8 py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-bold transition shadow-lg shadow-brand-primary/10 flex items-center justify-center gap-2"
                >
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
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

function ShieldAlertIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}
