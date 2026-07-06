'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Radio, FileText, LayoutDashboard, AlertCircle, 
  Trash2, ShieldAlert, Crown, LogOut, RefreshCw, Search, 
  ArrowLeft, Lock, CheckCircle2, ShieldOff, Video, Upload, X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import audioSynth from '../../components/AudioEffects';
import { COUNTRIES } from '../../constants/countries';

// Interface definitions
interface AdminStats {
  totalUsers: number;
  vipUsers: number;
  activeConnections: number;
  activeMatches: number;
  queueCount: number;
  totalReports: number;
  unresolvedReports: number;
}

interface UserRecord {
  id: string;
  username: string;
  email?: string;
  avatarUrl: string;
  bio: string;
  interests: string[];
  gender: string;
  country: string;
  isPremium: boolean;
  createdAt: string;
  isOnline: boolean;
  activated?: boolean;
  activationToken?: string;
}

interface ReportRecord {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  timestamp: string;
  reporterName: string;
  reportedName: string;
  screenshotUrl?: string;
}

interface SocketRecord {
  socketId: string;
  userId: string;
  username: string;
  country: string;
  isPremium: boolean;
  state: string;
}

export default function AdminPage() {
  const router = useRouter();
  
  // Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'deleted' | 'reports' | 'sockets' | 'vip' | 'bots'>('overview');
  
  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedReportScreenshot, setSelectedReportScreenshot] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<{ id: string; username: string; email?: string; deletedAt: string }[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [sockets, setSockets] = useState<SocketRecord[]>([]);
  
  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterVip, setUserFilterVip] = useState<'all' | 'vip' | 'free'>('all');
  const [userFilterOnline, setUserFilterOnline] = useState<'all' | 'online' | 'offline'>('all');
  const [userFilterActivation, setUserFilterActivation] = useState<'all' | 'activated' | 'pending'>('all');
  
  const [loading, setLoading] = useState(false);
  
  // Bot States
  const [bots, setBots] = useState<any[]>([]);
  const [newBotUsername, setNewBotUsername] = useState('');
  const [newBotGender, setNewBotGender] = useState<'male' | 'female'>('female');
  const [newBotCountry, setNewBotCountry] = useState('');
  const [newBotBio, setNewBotBio] = useState('');
  const [newBotInterests, setNewBotInterests] = useState('');
  const [newBotVideoUrl, setNewBotVideoUrl] = useState('');
  const [botChatEnabled, setBotChatEnabled] = useState(false);
  const [botChatMessages, setBotChatMessages] = useState<{ text: string; delay: number }[]>([]);
  const [newBotIsPremium, setNewBotIsPremium] = useState(false);
  const [newBotSkipAfterDuration, setNewBotSkipAfterDuration] = useState(false);
  const [newBotSkipDurationSeconds, setNewBotSkipDurationSeconds] = useState(30);
  const [newBotSkipNearEnd, setNewBotSkipNearEnd] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const getApiUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin;
  };

  const resolveBotVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const backendUrl = typeof window !== 'undefined'
      ? (window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin)
      : 'http://localhost:3001';
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${backendUrl}${cleanUrl}`;
  };

  const adminFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('lunaar_admin_token') : null;
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    };
    const res = await fetch(`${getApiUrl()}${endpoint}`, {
      ...options,
      headers
    });
    
    if (res.status === 401) {
      setIsAdminLoggedIn(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lunaar_admin_logged_in');
        sessionStorage.removeItem('lunaar_admin_token');
      }
      showToast('Session expired or unauthorized. Please log in again.');
      throw new Error('Unauthorized');
    }
    return res;
  };

  // Check login status on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedIn = sessionStorage.getItem('lunaar_admin_logged_in');
      if (loggedIn === 'true') {
        setIsAdminLoggedIn(true);
      }
    }
  }, []);

  const fetchAllData = async () => {
    if (!isAdminLoggedIn) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, deletedRes, reportsRes, socketsRes, botsRes] = await Promise.all([
        adminFetch('/api/admin/stats'),
        adminFetch('/api/admin/users'),
        adminFetch('/api/admin/deleted-users'),
        adminFetch('/api/admin/reports'),
        adminFetch('/api/admin/sockets'),
        adminFetch('/api/admin/bots')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (deletedRes.ok) setDeletedUsers(await deletedRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
      if (socketsRes.ok) setSockets(await socketsRes.json());
      if (botsRes.ok) setBots(await botsRes.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
      if (err instanceof Error && err.message === 'Unauthorized') return;
      showToast('Error connecting to backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 10000); // refresh every 10s
      return () => clearInterval(interval);
    }
  }, [isAdminLoggedIn]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    setLoginError('');
    setLoading(true);
    
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('lunaar_admin_token', data.token);
        sessionStorage.setItem('lunaar_admin_logged_in', 'true');
        setIsAdminLoggedIn(true);
        confetti({ particleCount: 50, spread: 45 });
        audioSynth.playMatch();
      } else {
        setLoginError(data.error || 'Invalid Administrator Security Password.');
      }
    } catch (err) {
      console.error('Login connection error:', err);
      setLoginError('Error connecting to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    audioSynth.playClick();
    setIsAdminLoggedIn(false);
    const token = sessionStorage.getItem('lunaar_admin_token');
    sessionStorage.removeItem('lunaar_admin_logged_in');
    sessionStorage.removeItem('lunaar_admin_token');
    
    try {
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/admin/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Logout connection error:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleVip = async (userId: string) => {
    audioSynth.playClick();
    setActionLoading(`vip-${userId}`);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/vip`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`User ${data.user.username} VIP status updated!`);
        
        // Optimistic update of local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isPremium: data.user.isPremium } : u));
        if (stats) {
          setStats({
            ...stats,
            vipUsers: stats.vipUsers + (data.user.isPremium ? 1 : -1)
          });
        }
      } else {
        showToast('Failed to toggle VIP status.');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActivation = async (userId: string) => {
    audioSynth.playClick();
    setActionLoading(`activate-${userId}`);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/activate`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`User ${data.user.username} activation status updated!`);
        
        // Optimistic update of local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, activated: data.user.activated, activationToken: data.user.activationToken } : u));
      } else {
        showToast('Failed to toggle activation status.');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    if (!confirm(`Are you absolutely sure you want to ban and delete the user "${username}"?`)) return;
    audioSynth.playClick();
    setActionLoading(`ban-${userId}`);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`User ${username} has been permanently banned.`);
        // Remove from local lists
        setUsers(prev => prev.filter(u => u.id !== userId));
        setSockets(prev => prev.filter(s => s.userId !== userId));
        setReports(prev => prev.filter(r => r.reportedId !== userId && r.reporterId !== userId));
        if (stats) {
          setStats({
            ...stats,
            totalUsers: Math.max(0, stats.totalUsers - 1)
          });
        }
      } else {
        showToast('Failed to ban user.');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    audioSynth.playClick();
    setActionLoading(`bot-${botId}`);
    try {
      const res = await adminFetch(`/api/admin/bots/${botId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast('Video Bot deleted successfully.');
          setBots(prev => prev.filter(b => b.id !== botId));
        } else {
          showToast('Failed to delete Video Bot.');
        }
      } else {
        showToast('Server error while deleting Video Bot.');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while deleting Video Bot.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    audioSynth.playClick();
    if (!newBotVideoUrl) {
      showToast('Video URL is required.');
      return;
    }
    setActionLoading('add-bot');
    
    try {
      const res = await adminFetch('/api/admin/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: newBotUsername,
          gender: newBotGender,
          country: newBotCountry,
          bio: newBotBio,
          interests: newBotInterests.split(',').map(i => i.trim()).filter(Boolean),
          videoUrl: newBotVideoUrl,
          chatEnabled: botChatEnabled,
          chatMessages: botChatMessages,
          isPremium: newBotIsPremium,
          skipAfterDuration: newBotSkipAfterDuration,
          skipDurationSeconds: newBotSkipDurationSeconds,
          skipNearEnd: newBotSkipNearEnd
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast(`Video Bot "${data.bot.username}" added!`);
          setBots(prev => [...prev, data.bot]);
          // Reset form fields
          setNewBotUsername('');
          setNewBotGender('female');
          setNewBotCountry('');
          setNewBotBio('');
          setNewBotInterests('');
          setNewBotVideoUrl('');
          setBotChatEnabled(false);
          setBotChatMessages([]);
          setNewBotIsPremium(false);
          setNewBotSkipAfterDuration(false);
          setNewBotSkipDurationSeconds(30);
          setNewBotSkipNearEnd(false);
        } else {
          showToast(data.error || 'Failed to add Video Bot.');
        }
      } else {
        showToast('Server error while adding Video Bot.');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while adding Video Bot.');
    } finally {
      setActionLoading(null);
    }
  };

  // Upload Video File Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // File size check (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('Video file size exceeds 100MB limit.');
      return;
    }
    
    // Type check
    if (!file.type.startsWith('video/')) {
      setUploadError('Only video files are allowed.');
      return;
    }
    
    setUploadingFile(true);
    setUploadError(null);
    audioSynth.playClick();
    
    const formData = new FormData();
    formData.append('video', file);
    
    try {
      const res = await adminFetch('/api/admin/bots/upload-video', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setNewBotVideoUrl(data.videoUrl);
        showToast('Video uploaded successfully!');
      } else {
        setUploadError(data.error || 'Failed to upload video.');
        showToast('Failed to upload video.');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Network error while uploading video.');
      showToast('Network error while uploading video.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    audioSynth.playClick();
    setActionLoading(`report-${reportId}`);
    try {
      const res = await adminFetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('Report resolved/dismissed.');
        setReports(prev => prev.filter(r => r.id !== reportId));
        if (stats) {
          setStats({
            ...stats,
            totalReports: Math.max(0, stats.totalReports - 1),
            unresolvedReports: Math.max(0, stats.unresolvedReports - 1)
          });
        }
      } else {
        showToast('Failed to resolve report.');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered Users computation
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          (user.email && user.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
                          user.id.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesVip = userFilterVip === 'all' || 
                       (userFilterVip === 'vip' && user.isPremium) || 
                       (userFilterVip === 'free' && !user.isPremium);
    const matchesOnline = userFilterOnline === 'all' || 
                          (userFilterOnline === 'online' && user.isOnline) || 
                          (userFilterOnline === 'offline' && !user.isOnline);
    const matchesActivation = userFilterActivation === 'all' ||
                              (userFilterActivation === 'activated' && user.activated) ||
                              (userFilterActivation === 'pending' && !user.activated);
    return matchesSearch && matchesVip && matchesOnline && matchesActivation;
  });

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0F0514] text-white font-sans selection:bg-brand-primary selection:text-white">
      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[-15%] w-[45vw] h-[45vw] rounded-full bg-brand-primary/5 blur-[140px] animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-purple-500/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-50 w-full premium-header h-16 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { audioSynth.playClick(); router.push('/'); }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-extrabold text-lg tracking-[0.2em] text-white premium-glowing-text select-none">
            LUN<span className="text-brand-primary font-sans">AAR</span> <span className="text-[10px] bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-2 py-0.5 rounded ml-2 font-bold uppercase tracking-wider">Admin</span>
          </div>
        </div>

        {isAdminLoggedIn && (
          <button
            onClick={handleAdminLogout}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 flex items-center gap-1.5 transition active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        )}
      </header>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-white/15 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-7xl mx-auto">
        {!isAdminLoggedIn ? (
          /* LOGIN GATED SCREEN */
          <div className="w-full max-w-sm glass-panel p-8 rounded-3xl border border-white/10 shadow-premium flex flex-col gap-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/25 flex items-center justify-center text-brand-primary mx-auto">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white font-sans">Security Gateway</h2>
              <p className="text-xs text-slate-400">Enter your Administrator security key to access platform dashboards.</p>
            </div>

            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Security Key</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-3 px-4 rounded-xl text-sm font-medium bg-slate-950/60 border border-white/5 text-white focus:border-brand-primary focus:shadow-[0_0_15px_rgba(255,59,59,0.15)] focus:bg-slate-950 outline-none transition duration-300"
                />
              </div>

              {loginError && (
                <p className="text-xs text-brand-primary font-bold text-left pl-1 flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold bg-brand-primary hover:bg-brand-primaryHover text-white transition active:scale-98 shadow-premium"
              >
                Access Administrator Area
              </button>
            </form>
            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wide">
              Hint: use password admin123
            </div>
          </div>
        ) : (
          /* ADMIN WORKSPACE */
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch justify-start h-full">
            
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-60 flex flex-col gap-2 flex-shrink-0">
              <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                <button
                  onClick={() => { audioSynth.playClick(); setActiveTab('overview'); }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                    activeTab === 'overview' 
                      ? 'bg-brand-primary text-white shadow-premium' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard Overview</span>
                </button>

                <button
                  onClick={() => { audioSynth.playClick(); setActiveTab('users'); }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                    activeTab === 'users' 
                      ? 'bg-brand-primary text-white shadow-premium' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>User Directory</span>
                </button>

                <button
                  onClick={() => { audioSynth.playClick(); setActiveTab('deleted'); }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                    activeTab === 'deleted' 
                      ? 'bg-brand-primary text-white shadow-premium' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Deleted Users ({deletedUsers.length})</span>
                </button>

                <button
                  onClick={() => { audioSynth.playClick(); setActiveTab('vip'); }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                    activeTab === 'vip' 
                      ? 'bg-brand-primary text-white shadow-premium' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  <span>VIP Premium ({users.filter(u => u.isPremium).length})</span>
                </button>

                <button
                  onClick={() => { audioSynth.playClick(); setActiveTab('reports'); }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                    activeTab === 'reports' 
                      ? 'bg-brand-primary text-white shadow-premium' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Abuse Reports ({reports.length})</span>
                </button>

                <button
                  onClick={() => { audioSynth.playClick(); setActiveTab('sockets'); }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                    activeTab === 'sockets' 
                      ? 'bg-brand-primary text-white shadow-premium' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>Live Sockets ({sockets.length})</span>
                </button>

                <button
                  onClick={() => { audioSynth.playClick(); setActiveTab('bots'); }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                    activeTab === 'bots' 
                      ? 'bg-brand-primary text-white shadow-premium' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Streaming Bots ({bots.length})</span>
                </button>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-wider flex flex-col gap-1.5 items-center justify-center text-center">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-primary' : ''}`} />
                  <span>{loading ? 'Syncing...' : 'Real-time Link Active'}</span>
                </span>
                <button
                  onClick={() => { audioSynth.playClick(); fetchAllData(); }}
                  className="mt-1 text-[9px] text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/10 rounded px-2 py-0.5"
                >
                  Refresh Now
                </button>
              </div>
            </div>

            {/* Dashboard Workspace */}
            <div className="flex-grow glass-panel border border-white/10 rounded-3xl p-6 lg:p-8 flex flex-col gap-6 overflow-hidden min-h-[500px]">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-6 w-full animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white font-sans">Platform Metrics</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Summary of registrations, active live connections, and system load.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stat Card 1 */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden">
                      <div className="absolute right-4 top-4 text-white/5">
                        <Users className="w-16 h-16" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Users</span>
                      <span className="text-3xl font-black text-white font-sans mt-1">
                        {stats ? stats.totalUsers.toLocaleString() : '---'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1">
                        Registered member accounts
                      </span>
                    </div>

                    {/* Stat Card 2: VIP Premium */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden">
                      <div className="absolute right-4 top-4 text-white/5">
                        <Crown className="w-16 h-16 text-amber-400/10" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">VIP Premium</span>
                      <span className="text-3xl font-black text-amber-400 font-sans mt-1">
                        {stats ? stats.vipUsers.toLocaleString() : '---'}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-400/80 mt-1">
                        {stats && stats.totalUsers > 0 
                          ? `${((stats.vipUsers / stats.totalUsers) * 100).toFixed(0)}% of registered members`
                          : '0% of registered members'}
                      </span>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden">
                      <div className="absolute right-4 top-4 text-white/5">
                        <Radio className="w-16 h-16" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Socket Connections</span>
                      <span className="text-3xl font-black text-white font-sans mt-1">
                        {stats ? stats.activeConnections.toLocaleString() : '---'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1">
                        Real-time active web sockets
                      </span>
                    </div>

                    {/* Stat Card 4 */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden">
                      <div className="absolute right-4 top-4 text-white/5">
                        <ShieldAlert className="w-16 h-16" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Load</span>
                      <span className="text-3xl font-black text-brand-primary font-sans mt-1">
                        {stats ? `${stats.activeMatches} Pairs` : '---'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {stats ? stats.queueCount : '0'} in Matchmaking Queue
                      </span>
                    </div>
                  </div>

                  {/* Reports Overview Banner */}
                  {stats && stats.unresolvedReports > 0 && (
                    <div className="w-full border border-red-500/20 bg-red-950/10 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex gap-3 items-center">
                        <AlertCircle className="w-10 h-10 text-red-500 flex-shrink-0" />
                        <div>
                          <h4 className="font-extrabold text-sm text-white">Unresolved Abuse Reports</h4>
                          <p className="text-xs text-slate-400 mt-0.5">There are currently {stats.unresolvedReports} pending abuse reports that require moderation action.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('reports')}
                        className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-bold transition active:scale-95 flex-shrink-0"
                      >
                        Review Reports Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: USER DIRECTORY */}
              {activeTab === 'users' && (
                <div className="flex flex-col gap-4 w-full animate-fadeIn overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white font-sans">User Directory</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Moderation control panel for all registered member profiles.</p>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                      {/* Search */}
                      <div className="relative flex-grow md:flex-grow-0 md:w-56">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder="Search username, email..."
                          className="w-full py-2 pl-9 pr-3 rounded-xl text-xs font-semibold bg-slate-900 border border-white/5 text-white outline-none focus:border-brand-primary transition"
                        />
                      </div>
                      
                      {/* Filters */}
                      <select
                        value={userFilterVip}
                        onChange={(e) => setUserFilterVip(e.target.value as any)}
                        className="bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="all">All VIP/Free</option>
                        <option value="vip">💎 VIP Only</option>
                        <option value="free">Stranger Free</option>
                      </select>

                      <select
                        value={userFilterOnline}
                        onChange={(e) => setUserFilterOnline(e.target.value as any)}
                        className="bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="all">All Connection States</option>
                        <option value="online">🟢 Online</option>
                        <option value="offline">⚪ Offline</option>
                      </select>

                      <select
                        value={userFilterActivation}
                        onChange={(e) => setUserFilterActivation(e.target.value as any)}
                        className="bg-slate-900 border border-white/5 rounded-xl py-2 px-3 text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="all">All Activation States</option>
                        <option value="activated">✅ Activated Only</option>
                        <option value="pending">⏳ Pending Activation</option>
                      </select>
                    </div>
                  </div>

                   {/* Users Table */}
                  <div className="w-full overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-900/40 text-slate-500 font-extrabold uppercase tracking-wider">
                          <th className="p-4">Profile</th>
                          <th className="p-4">Location</th>
                          <th className="p-4">Gender</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Activation</th>
                          <th className="p-4">Joined</th>
                          <th className="p-4 text-right">Moderation Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                              No user profiles found matching filters.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                              <td className="p-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 relative">
                                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-white flex items-center gap-1.5">
                                    {user.username}
                                    {user.isPremium && (
                                      <span title="VIP Account">
                                        <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-500">{user.email || 'No email associated'}</span>
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-slate-300">
                                {user.country}
                              </td>
                              <td className="p-4 font-semibold text-slate-300 capitalize">
                                {user.gender || 'Unknown'}
                              </td>
                              <td className="p-4">
                                {user.isOnline ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Online
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 text-[10px] font-bold uppercase">
                                    Offline
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                {user.activated ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    Activated
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-slate-400 font-semibold">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => handleToggleActivation(user.id)}
                                  disabled={actionLoading !== null}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                                    user.activated
                                      ? 'bg-slate-950/20 border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/20'
                                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {actionLoading === `activate-${user.id}` ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                                  ) : user.activated ? (
                                    'Deactivate'
                                  ) : (
                                    'Activate'
                                  )}
                                </button>

                                {!user.activated && user.activationToken && (
                                  <button
                                    onClick={() => {
                                      const link = `${window.location.origin}/activate?token=${user.activationToken}`;
                                      navigator.clipboard.writeText(link);
                                      showToast('Activation link copied to clipboard!');
                                      audioSynth.playClick();
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold border bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition"
                                  >
                                    Copy Link
                                  </button>
                                )}

                                <button
                                  onClick={() => handleToggleVip(user.id)}
                                  disabled={actionLoading !== null}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                                    user.isPremium
                                      ? 'bg-slate-950/20 border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/20'
                                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                  }`}
                                >
                                  {actionLoading === `vip-${user.id}` ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                                  ) : user.isPremium ? (
                                    'Revoke VIP'
                                  ) : (
                                    'Grant VIP'
                                  )}
                                </button>

                                <button
                                  onClick={() => handleBanUser(user.id, user.username)}
                                  disabled={actionLoading !== null}
                                  className="px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition flex items-center justify-center"
                                  title="Ban and delete user"
                                >
                                  {actionLoading === `ban-${user.id}` ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ABUSE REPORTS */}
              {activeTab === 'deleted' && (
                <div className="flex flex-col gap-4 w-full animate-fadeIn overflow-hidden">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white font-sans text-left">Deleted Accounts</h2>
                    <p className="text-xs text-slate-400 mt-0.5 text-left">Audit log of accounts permanently deleted by the users themselves.</p>
                  </div>

                  <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
                        <tr>
                          <th className="py-4 px-6">User ID</th>
                          <th className="py-4 px-6">Username</th>
                          <th className="py-4 px-6">Email Address</th>
                          <th className="py-4 px-6">Deletion Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {deletedUsers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center font-bold text-slate-500">
                              No deleted accounts found in the audit logs.
                            </td>
                          </tr>
                        ) : (
                          deletedUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-white/5 transition">
                              <td className="py-3.5 px-6 font-mono text-slate-400 select-all">{u.id}</td>
                              <td className="py-3.5 px-6 font-bold text-white">{u.username}</td>
                              <td className="py-3.5 px-6 text-slate-300">{u.email || 'N/A'}</td>
                              <td className="py-3.5 px-6 text-slate-400">{new Date(u.deletedAt).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="flex flex-col gap-4 w-full animate-fadeIn overflow-hidden">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white font-sans">Abuse Reports</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Review and resolve claims of inappropriate behavior or terms violations.</p>
                  </div>

                  <div className="w-full overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-900/40 text-slate-500 font-extrabold uppercase tracking-wider">
                          <th className="p-4">Reported Stranger</th>
                          <th className="p-4">Flagged By</th>
                          <th className="p-4">Abuse Reason</th>
                          <th className="p-4">Snapshot</th>
                          <th className="p-4">Incident Timestamp</th>
                          <th className="p-4 text-right">Moderation Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                              No pending abuse reports found. Hooray!
                            </td>
                          </tr>
                        ) : (
                          reports.map((rep) => (
                            <tr key={rep.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                              <td className="p-4 font-extrabold text-white">
                                {rep.reportedName} <span className="text-[9px] text-slate-600 block mt-0.5">UID: {rep.reportedId}</span>
                              </td>
                              <td className="p-4 font-semibold text-slate-300">
                                {rep.reporterName} <span className="text-[9px] text-slate-600 block mt-0.5">UID: {rep.reporterId}</span>
                              </td>
                              <td className="p-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-brand-primary text-[10px] font-bold uppercase tracking-wide">
                                  {rep.reason}
                                </span>
                              </td>
                              <td className="p-4">
                                {rep.screenshotUrl ? (
                                  <div 
                                    className="relative group cursor-pointer w-16 h-10 rounded-lg border border-white/10 overflow-hidden bg-slate-950/60 shadow-sm"
                                    onClick={() => {
                                      audioSynth.playClick();
                                      setSelectedReportScreenshot(rep.screenshotUrl || null);
                                    }}
                                  >
                                    <img 
                                      src={
                                        (typeof window !== 'undefined'
                                          ? (window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin)
                                          : 'http://localhost:3001') + rep.screenshotUrl
                                      } 
                                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                      alt="Report Snapshot" 
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                      <Search className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">N/A</span>
                                )}
                              </td>
                              <td className="p-4 text-slate-400 font-semibold">
                                {new Date(rep.timestamp).toLocaleString()}
                              </td>
                              <td className="p-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => handleResolveReport(rep.id)}
                                  disabled={actionLoading !== null}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
                                >
                                  {actionLoading === `report-${rep.id}` ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                                  ) : (
                                    'Dismiss'
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => handleBanUser(rep.reportedId, rep.reportedName)}
                                  disabled={actionLoading !== null}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition flex items-center gap-1"
                                >
                                  <ShieldOff className="w-3 h-3" />
                                  <span>Ban Reported</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: LIVE SOCKETS */}
              {activeTab === 'sockets' && (
                <div className="flex flex-col gap-4 w-full animate-fadeIn overflow-hidden">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white font-sans">WebSocket Monitor</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Real-time mapping of active connections and client engine states.</p>
                  </div>

                  <div className="w-full overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-900/40 text-slate-500 font-extrabold uppercase tracking-wider">
                          <th className="p-4">Socket ID</th>
                          <th className="p-4">User Association</th>
                          <th className="p-4">Country</th>
                          <th className="p-4">VIP</th>
                          <th className="p-4">Engine State</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sockets.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                              No active WebSocket connections found.
                            </td>
                          </tr>
                        ) : (
                          sockets.map((sock) => (
                            <tr key={sock.socketId} className="border-b border-white/5 hover:bg-white/[0.02] transition font-mono">
                              <td className="p-4 font-semibold text-brand-primary text-[10px]">
                                {sock.socketId}
                              </td>
                              <td className="p-4 font-semibold text-slate-300 font-sans">
                                {sock.username} <span className="text-[9px] text-slate-600 block mt-0.5">UID: {sock.userId}</span>
                              </td>
                              <td className="p-4 font-semibold text-slate-400 font-sans">
                                {sock.country}
                              </td>
                              <td className="p-4 font-sans">
                                {sock.isPremium ? (
                                  <span className="text-amber-400 font-extrabold text-[10px] uppercase">Yes</span>
                                ) : (
                                  <span className="text-slate-600 font-extrabold text-[10px] uppercase">No</span>
                                )}
                              </td>
                              <td className="p-4 font-sans font-bold">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border ${
                                  sock.state.startsWith('In Match')
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : sock.state === 'In Matchmaking Queue'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                    : 'bg-white/5 border-white/10 text-slate-400'
                                }`}>
                                  {sock.state}
                                </span>
                              </td>
                              <td className="p-4 text-right font-sans">
                                <button
                                  onClick={() => handleBanUser(sock.userId, sock.username)}
                                  className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-bold transition"
                                >
                                  Kick/Ban
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: VIP PREMIUM DIRECTORY */}
              {activeTab === 'vip' && (
                <div className="flex flex-col gap-6 w-full animate-fadeIn overflow-y-auto max-h-[600px] pr-2">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white font-sans flex items-center gap-2">
                        <Crown className="w-6 h-6 fill-amber-400 text-amber-400 animate-pulse" />
                        VIP Premium Members
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Showing all upgraded profiles with full profile details, bios, and interests.</p>
                    </div>
                    <div className="bg-slate-900 border border-white/5 rounded-xl py-1.5 px-3 text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      Total: {users.filter(u => u.isPremium).length} Premium Accounts
                    </div>
                  </div>

                  {users.filter(u => u.isPremium).length === 0 ? (
                    <div className="w-full py-16 text-center border border-white/5 bg-slate-950/20 rounded-2xl flex flex-col items-center justify-center gap-3">
                      <Crown className="w-12 h-12 text-slate-600" />
                      <p className="text-sm font-bold text-slate-500">No VIP Premium accounts registered in the database.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {users.filter(u => u.isPremium).map((user) => (
                        <div key={user.id} className="bg-slate-900/60 border border-amber-500/20 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden transition hover:border-amber-500/40">
                          {/* Decorative subtle top right glow */}
                          <div className="absolute -right-10 -top-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

                          {/* Profile Header */}
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-400/60 relative flex-shrink-0">
                              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-base text-white">{user.username}</span>
                                {user.isOnline ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase">
                                    Online
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 text-[8px] font-bold uppercase">
                                    Offline
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 font-mono">ID: {user.id}</span>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email Address</span>
                              <span className="text-white font-semibold break-all">{user.email || 'None'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Country / Location</span>
                              <span className="text-white font-semibold">{user.country || 'Unknown'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Gender</span>
                              <span className="text-white font-semibold capitalize">{user.gender || 'Unknown'}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Joined Date</span>
                              <span className="text-white font-semibold">
                                {new Date(user.createdAt).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Bio */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Bio description</span>
                            <p className="text-xs text-slate-300 italic bg-white/[0.02] border border-white/5 rounded-xl p-3">
                              {user.bio || "This user hasn't written a biography yet."}
                            </p>
                          </div>

                          {/* Interests */}
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Interests & Tags</span>
                            <div className="flex flex-wrap gap-1.5">
                              {user.interests && user.interests.length > 0 ? (
                                user.interests.map((interest, idx) => (
                                  <span key={idx} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                    {interest}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">No interests specified.</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-2 pt-4 border-t border-white/5 flex justify-end">
                            <button
                              onClick={() => handleToggleVip(user.id)}
                              disabled={actionLoading !== null}
                              className="px-4 py-2 rounded-xl text-xs font-bold border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition active:scale-95 flex items-center gap-1.5"
                            >
                              {actionLoading === `vip-${user.id}` ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <ShieldOff className="w-3.5 h-3.5" />
                                  <span>Revoke VIP Status</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: STREAMING BOTS CONTROL */}
              {activeTab === 'bots' && (
                <div className="flex flex-col gap-6 w-full animate-fadeIn pr-2">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tight text-white font-sans flex items-center gap-2">
                        <Video className="w-6 h-6 text-brand-primary animate-pulse" />
                        Video Streaming Bots
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Configure pre-recorded videos to stream as mock partners in matchmaking.</p>
                    </div>
                    <div className="bg-slate-900 border border-white/5 rounded-xl py-1.5 px-3 text-xs font-bold text-brand-primary flex items-center gap-1.5 font-sans">
                      Total: {bots.length} Active Bots
                    </div>
                  </div>

                  {/* Add Bot Form */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-950/40">
                    <h3 className="text-sm font-extrabold uppercase text-white mb-4 tracking-wider">Add New Streaming Bot</h3>
                    <form onSubmit={handleAddBot} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Username</label>
                        <input
                          type="text"
                          placeholder="e.g. Liam_99 (or leave blank to auto-generate)"
                          value={newBotUsername}
                          onChange={(e) => setNewBotUsername(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-primary transition"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Gender Preference</label>
                        <select
                          value={newBotGender}
                          onChange={(e) => setNewBotGender(e.target.value as 'male' | 'female')}
                          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-primary transition font-bold"
                        >
                          <option value="female">Female 👩</option>
                          <option value="male">Male 👨</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Tier Section</label>
                        <select
                          value={newBotIsPremium ? 'premium' : 'general'}
                          onChange={(e) => setNewBotIsPremium(e.target.value === 'premium')}
                          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-primary transition font-bold"
                        >
                          <option value="general">General (Free) 🆓</option>
                          <option value="premium">Premium (VIP) 👑</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Country</label>
                        <select
                          value={newBotCountry}
                          onChange={(e) => setNewBotCountry(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-primary transition font-bold cursor-pointer"
                        >
                          <option value="">Auto-generate 🌍</option>
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.name}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">
                          Option A: Upload Video File (MP4/WebM, Max 100MB)
                        </label>
                        <div className="relative border border-dashed border-white/10 hover:border-brand-primary/50 transition rounded-xl bg-slate-900/60 p-3 flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer h-[50px] group">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            disabled={uploadingFile}
                          />
                          {uploadingFile ? (
                            <span className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 text-brand-primary animate-spin" />
                              <span className="text-slate-300 font-bold">Uploading video... Please wait</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Upload className="w-4 h-4 text-slate-400 group-hover:text-brand-primary transition" />
                              <span className="text-slate-400 font-semibold">
                                {newBotVideoUrl && newBotVideoUrl.startsWith('/uploads/') ? (
                                  <span className="text-emerald-400 font-bold">✓ Video Uploaded: {newBotVideoUrl.substring(newBotVideoUrl.lastIndexOf('/') + 1)}</span>
                                ) : (
                                  'Choose video file or Drag & Drop here'
                                )}
                              </span>
                            </span>
                          )}
                          {uploadError && <span className="text-[10px] text-brand-primary font-bold">{uploadError}</span>}
                        </div>
                      </div>

                       <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">
                          Option B: Streaming Asset URL / Path
                        </label>
                        <input
                          type="text"
                          placeholder="https://... or /uploads/..."
                          value={newBotVideoUrl}
                          onChange={(e) => {
                            setNewBotVideoUrl(e.target.value);
                            setUploadError(null);
                          }}
                          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-primary transition font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Interests & Tags (Comma-separated)</label>
                        <input
                          type="text"
                          placeholder="anime, music, photography"
                          value={newBotInterests}
                          onChange={(e) => setNewBotInterests(e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-primary transition"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 md:col-span-3">
                        <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Short Bio / Greeting</label>
                        <textarea
                          placeholder="Let's talk about photography! 📸"
                          value={newBotBio}
                          onChange={(e) => setNewBotBio(e.target.value)}
                          rows={2}
                          className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-primary transition resize-none"
                        />
                      </div>

                      {/* Bot Chat Configuration */}
                      <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-extrabold uppercase text-white tracking-wider">Bot Chat Configuration</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Control whether this bot will send automated chat messages and script specific triggers.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enable Chat Messages</span>
                            <select
                              value={botChatEnabled ? 'on' : 'off'}
                              onChange={(e) => {
                                setBotChatEnabled(e.target.value === 'on');
                                if (e.target.value === 'on' && botChatMessages.length === 0) {
                                  // Seed initial message
                                  setBotChatMessages([{ text: 'Hello! Nice to meet you! 😊', delay: 3 }]);
                                }
                              }}
                              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-brand-primary cursor-pointer"
                            >
                              <option value="off">Off ⚪</option>
                              <option value="on">On 💬</option>
                            </select>
                          </div>
                        </div>

                        {botChatEnabled && (
                          <div className="flex flex-col gap-3 bg-slate-900/40 border border-white/5 rounded-2xl p-4 animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scripted Messages Flow</span>
                              <button
                                type="button"
                                onClick={() => setBotChatMessages(prev => [...prev, { text: '', delay: 5 }])}
                                className="px-3 py-1.5 rounded-lg border border-brand-primary/20 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[10px] font-bold transition"
                              >
                                + Add Scripted Message
                              </button>
                            </div>

                            {botChatMessages.length === 0 ? (
                              <p className="text-xs text-slate-500 italic text-center py-2">No scripted messages added yet. Click "+ Add Scripted Message" to add one.</p>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {botChatMessages.map((msg, index) => (
                                  <div key={index} className="flex gap-2 items-center text-xs">
                                    <div className="flex-grow flex flex-col gap-1">
                                      <input
                                        type="text"
                                        placeholder="Type bot message here..."
                                        value={msg.text}
                                        onChange={(e) => {
                                          const newMsgs = [...botChatMessages];
                                          newMsgs[index].text = e.target.value;
                                          setBotChatMessages(newMsgs);
                                        }}
                                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-primary transition"
                                      />
                                    </div>
                                    <div className="w-32 flex flex-col gap-1">
                                      <div className="relative">
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="Delay"
                                          value={msg.delay}
                                          onChange={(e) => {
                                            const newMsgs = [...botChatMessages];
                                            newMsgs[index].delay = Math.max(0, parseInt(e.target.value) || 0);
                                            setBotChatMessages(newMsgs);
                                          }}
                                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-3 pr-10 py-2 text-white focus:outline-none focus:border-brand-primary transition"
                                        />
                                        <span className="absolute right-3 top-2.5 text-[9px] font-bold text-slate-500 uppercase">Secs</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setBotChatMessages(prev => prev.filter((_, i) => i !== index))}
                                      className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition flex items-center justify-center flex-shrink-0"
                                      title="Remove message"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bot Auto-Skip Behavior */}
                      <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 flex flex-col gap-4">
                        <div>
                          <h4 className="text-sm font-extrabold uppercase text-white tracking-wider">Bot Auto-Skip Behavior</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Control how this bot automatically skips/nexts users during simulated matchmaking.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Duration skip */}
                          <div className="flex flex-col gap-3 bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skip After Duration</span>
                              <select
                                value={newBotSkipAfterDuration ? 'on' : 'off'}
                                onChange={(e) => setNewBotSkipAfterDuration(e.target.value === 'on')}
                                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-brand-primary cursor-pointer"
                              >
                                <option value="off">Off ⚪</option>
                                <option value="on">On ⏳</option>
                              </select>
                            </div>
                            {newBotSkipAfterDuration && (
                              <div className="flex flex-col gap-1.5 animate-fadeIn">
                                <label className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">Duration (Seconds)</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    value={newBotSkipDurationSeconds}
                                    onChange={(e) => setNewBotSkipDurationSeconds(Math.max(1, parseInt(e.target.value) || 30))}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-primary transition"
                                  />
                                  <span className="absolute right-4 top-3 text-[10px] font-bold text-slate-500 uppercase">Seconds</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Near end skip */}
                          <div className="flex flex-col gap-3 bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex-grow justify-between">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto-Skip Before Video Ends</span>
                                <span className="text-[9px] text-slate-500 block mt-0.5">Automatically skips user 5 seconds before the video ends.</span>
                              </div>
                              <select
                                value={newBotSkipNearEnd ? 'on' : 'off'}
                                onChange={(e) => setNewBotSkipNearEnd(e.target.value === 'on')}
                                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-brand-primary cursor-pointer"
                              >
                                <option value="off">Off ⚪</option>
                                <option value="on">On ⏭️</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-3 flex justify-end mt-2">
                        <button
                          type="submit"
                          disabled={actionLoading === 'add-bot'}
                          className="px-6 py-2.5 rounded-xl font-bold bg-brand-primary text-white shadow-premium hover:bg-brand-primary/95 transition flex items-center gap-2 active:scale-[0.98]"
                        >
                          {actionLoading === 'add-bot' ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Video className="w-4 h-4" />
                              <span>Register Streaming Bot</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Active Bot Directory Table */}
                  <div className="w-full overflow-x-auto rounded-3xl border border-white/5 bg-slate-950/20 premium-scrollbar">
                    <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-900/40 text-slate-500 font-extrabold uppercase tracking-wider">
                          <th className="p-4">Profile</th>
                          <th className="p-4">Tier</th>
                          <th className="p-4">Gender</th>
                          <th className="p-4">Location</th>
                          <th className="p-4">Interests</th>
                          <th className="p-4">Chat</th>
                          <th className="p-4">Auto-Skip</th>
                          <th className="p-4">Video Asset</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bots.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-500 font-bold">
                              No video streaming bots configured in database pool.
                            </td>
                          </tr>
                        ) : (
                          [...bots]
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((bot) => (
                            <tr key={bot.id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                              <td className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-white/10 flex-shrink-0">
                                  <img src={bot.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-white text-sm font-sans">{bot.username}</span>
                                  <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{bot.bio}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                {bot.isPremium ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wide">
                                    👑 Premium
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wide">
                                    🆓 General
                                  </span>
                                )}
                              </td>
                              <td className="p-4 capitalize font-semibold text-slate-300">
                                {bot.gender === 'female' ? 'Female 👩' : 'Male 👨'}
                              </td>
                              <td className="p-4 font-semibold text-slate-300 font-sans">
                                {bot.country}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {bot.interests.map((tag: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400 text-[9px] font-bold">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4">
                                {bot.chatEnabled ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                                    💬 On ({bot.chatMessages?.length || 0})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                                    ⚪ Off
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1">
                                  {bot.skipAfterDuration ? (
                                    <span className="inline-flex items-center gap-1 text-slate-300 text-[10px] font-semibold">
                                      ⏳ Skip after {bot.skipDurationSeconds}s
                                    </span>
                                  ) : null}
                                  {bot.skipNearEnd ? (
                                    <span className="inline-flex items-center gap-1 text-slate-300 text-[10px] font-semibold">
                                      ⏭️ Skip 5s before end
                                    </span>
                                  ) : null}
                                  {!bot.skipAfterDuration && !bot.skipNearEnd ? (
                                    <span className="text-[10px] text-slate-500 italic">No skip rules</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="p-4 font-mono text-slate-400 truncate max-w-[200px]">
                                <a
                                  href={resolveBotVideoUrl(bot.videoUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-primary hover:underline font-semibold"
                                >
                                  Preview 🔗
                                </a>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleDeleteBot(bot.id)}
                                  disabled={actionLoading !== null}
                                  className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition active:scale-95 flex items-center gap-1 ml-auto font-sans"
                                >
                                  {actionLoading === `bot-${bot.id}` ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Remove</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FULLSCREEN PREVIEW MODAL ZOOM OVERLAY */}
      {selectedReportScreenshot && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn cursor-zoom-out" 
          onClick={() => setSelectedReportScreenshot(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl animate-scaleUp cursor-default" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedReportScreenshot(null)}
              className="absolute -top-10 right-0 p-2 text-slate-400 hover:text-white transition flex items-center gap-1.5 font-bold text-xs"
            >
              <X className="w-4 h-4" /> Close Preview
            </button>
            <img 
              src={
                (typeof window !== 'undefined'
                  ? (window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin)
                  : 'http://localhost:3001') + selectedReportScreenshot
              } 
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl bg-slate-955 bg-slate-950" 
              alt="Abuse Snapshot Proof" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
