'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import { motion, AnimatePresence, useDragControls, useAnimation } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Video, VideoOff, Mic, MicOff, RefreshCw, Maximize2, Shield, Heart, 
  Send, Smile, Globe, AlertTriangle, UserPlus, Gift, ArrowLeft, Volume2, 
  VolumeX, MessageSquare, Compass, Check, X, Star, Play, ChevronDown,
  ChevronRight, Search, Settings, User, Plus, Award
} from 'lucide-react';
import { COUNTRIES } from '../../constants/countries';
import audioSynth from '../../components/AudioEffects';

// Predefined gifts that can be sent
const GIFTS = [
  { id: 'rose', emoji: '🌹', label: 'Rose' },
  { id: 'coffee', emoji: '☕', label: 'Coffee' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'fire', emoji: '🔥', label: 'Fire' }
];

const EMOJI_LIST = [
  '👋', '😊', '😍', '🔥', '👍', '🇯🇵', '🇺🇸', '❤️', '😂', '😘', 
  '😎', '🎉', '✨', '🙌', '💯', '🤔', '👀', '😜', '😭', '😡',
  '😱', '🥺', '💩', '👏', '🙏', '💪', '🍻', '🍕', '🐱', '🐶',
  '🚀', '💡', '🎵', '✈️', '🌍', '🏳️‍🌈'
];

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const router = useRouter();
  
  // WebRTC & Socket.IO references
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Dragging & Snapping refs for local camera preview
  const parentWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const localPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const controls = useAnimation();
  
  // UI and Match States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [genderFilter, setGenderFilter] = useState<'everyone' | 'male' | 'female'>('everyone');
  const [genderFilterDropdownOpen, setGenderFilterDropdownOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string>('World');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [matchDuration, setMatchDuration] = useState(0);
  const [activeOnlineCount, setActiveOnlineCount] = useState(12450);
  const [maleRatio, setMaleRatio] = useState(0.70); // Fluctuates between 65% and 75%
  const [privateRoomId, setPrivateRoomId] = useState<string | null>(null);
  const [botsEnabled, setBotsEnabled] = useState(true);
  const [botPool, setBotPool] = useState<any[]>([]);

  // Device controls
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  // Media Devices & Settings States
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'video' | 'chat'>('video');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileControlsVisible, setMobileControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showMobileControlsTemporarily = () => {
    setMobileControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isMatchedRef.current && isMobile) {
      controlsTimeoutRef.current = setTimeout(() => {
        setMobileControlsVisible(false);
      }, 3500);
    }
  };

  const handleScreenTap = () => {
    if (!isMobile || !isMatchedRef.current) return;
    if (mobileControlsVisible) {
      setMobileControlsVisible(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      showMobileControlsTemporarily();
    }
  };

  // Auto-hide mobile controls when matched in video chat
  useEffect(() => {
    if (isMatched && isMobile) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setMobileControlsVisible(false);
      }, 3500);
    } else {
      setMobileControlsVisible(true);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isMatched, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Chat message states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const mobileChatBottomRef = useRef<HTMLDivElement | null>(null);

  // Interactivity flags
  const [hasLiked, setHasLiked] = useState(false);
  const [friendAdded, setFriendAdded] = useState(false);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState<{ id: number; left: number }[]>([]);
  const [floatingGifts, setFloatingGifts] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('nsfw');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Local loopback fallback simulation (for single-tab testing)
  const [loopbackMode, setLoopbackMode] = useState(false);
  const loopbackIntervalRef = useRef<any>(null);
  const simTimeoutRef = useRef<any>(null);
  const simMessagesTimeoutsRef = useRef<any[]>([]);

  // Refs to avoid React stale closures in timeouts
  const isMatchedRef = useRef(false);
  const isMatchingRef = useRef(false);
  const initialAutoStartRunRef = useRef(false);
  const startMatchingProcessRef = useRef<() => void>(() => {});

  // Face Mask Filters
  const [localFilter, setLocalFilter] = useState<'none' | 'blur' | 'carnival' | 'visor' | 'cat'>('none');
  const [remoteFilter, setRemoteFilter] = useState<'none' | 'blur' | 'carnival' | 'visor' | 'cat'>('none');
  const [trackingLoaded, setTrackingLoaded] = useState(false);
  const [localFace, setLocalFace] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [remoteFace, setRemoteFace] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const trackerTaskRef = useRef<any>(null);
  const prevLocalFaceRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const prevRemoteFaceRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);


  // Snap local camera preview to the nearest corner on drag release
  const handleDragEnd = (event: any, info: any) => {
    if (!parentWorkspaceRef.current || !localPreviewRef.current) return;

    const parentRect = parentWorkspaceRef.current.getBoundingClientRect();
    const previewRect = localPreviewRef.current.getBoundingClientRect();

    const parentWidth = parentRect.width;
    const parentHeight = parentRect.height;
    const previewWidth = previewRect.width;
    const previewHeight = previewRect.height;

    const margin = 16;
    const maxDragX = parentWidth - previewWidth - margin * 2;
    const maxDragY = parentHeight - previewHeight - margin * 2;

    // Calculate position relative to bottom-left corner origin
    const relativeX = previewRect.left - parentRect.left - margin;
    const relativeBottom = parentRect.bottom - previewRect.bottom - margin;

    // Snap to closest corner:
    // Bottom-Left (0, 0), Bottom-Right (maxDragX, 0)
    // Top-Left (0, -maxDragY), Top-Right (maxDragX, -maxDragY)
    const isRight = relativeX > maxDragX / 2;
    const isTop = relativeBottom > maxDragY / 2;

    const targetX = isRight ? maxDragX : 0;
    const targetY = isTop ? -maxDragY : 0;

    controls.start({
      x: targetX,
      y: targetY,
      transition: { type: 'spring', stiffness: 350, damping: 25 }
    });
  };

  // Fetch available video bots from API
  useEffect(() => {
    const backendUrl = typeof window !== 'undefined'
      ? (window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin)
      : 'http://localhost:3001';
      
    fetch(`${backendUrl}/api/bots`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBotPool(data);
        }
      })
      .catch(err => console.error('Error fetching video bots:', err));
  }, []);

  // Dynamic online gender ratio fluctuation (Male: 65-75%, Female: 25-35%)
  useEffect(() => {
    const interval = setInterval(() => {
      setMaleRatio(prev => {
        const step = (Math.random() - 0.5) * 0.02; // Small step fluctuation
        const next = prev + step;
        return Math.max(0.65, Math.min(0.75, next));
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Keep refs synchronized with React states to prevent stale closures in timeouts
  useEffect(() => {
    isMatchedRef.current = isMatched;
    if (!isMatched) {
      setMobileActiveTab('video');
    }
  }, [isMatched]);

  useEffect(() => {
    isMatchingRef.current = isMatching;
  }, [isMatching]);

  // 1. Initialize media streams and Socket connection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get current user profile
    const savedUserStr = localStorage.getItem('lunaar_user');
    if (!savedUserStr) {
      router.push('/');
      return;
    }
    const userObj = JSON.parse(savedUserStr);
    setCurrentUser(userObj);
    setInterests(userObj.interests || []);
    
    // Auto-detect country based on current IP/location on every load (dynamic VPN support)
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_name) {
          userObj.country = data.country_name;
          localStorage.setItem('lunaar_user', JSON.stringify(userObj));
          setCurrentUser(userObj);
          
          // If the user has not explicitly chosen a target country preference, update countryFilter to keep in sync
          if (!userObj.countryPreference) {
            setCountryFilter(data.country_name);
          }
        }
      })
      .catch(() => {});
    
    // Set initial filters on mount based on user profile and VIP status
    const initialGenderFilter = userObj.isPremium ? (userObj.genderPreference || 'everyone') : 'everyone';
    setGenderFilter(initialGenderFilter);
    setCountryFilter(userObj.countryPreference || userObj.country || 'World');

    // Initialize media stream
    initLocalMedia();

    // Initialize socket connection
    const socketUrl = typeof window !== 'undefined'
      ? (window.location.port === '3000' ? 'http://localhost:3001' : 'https://lunaar-backend.onrender.com')
      : 'http://localhost:3001';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      forceNew: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected to backend server.');
      socket.emit('register_user', {
        userId: userObj.id,
        profile: userObj
      });
    });

    socket.on('registration_success', (profile) => {
      console.log('Profile registered on server successfully:', profile);
      
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      
      if (!initialAutoStartRunRef.current) {
        initialAutoStartRunRef.current = true;
        if (roomParam) {
          setPrivateRoomId(roomParam);
          setIsMatching(true);
          setIsMatched(false);
          setPartnerProfile(null);
          socket.emit('join_private_room', { roomId: roomParam });
          console.log('Emitted join_private_room on registration_success:', roomParam);
        } else {
          startMatchingProcessRef.current();
        }
      } else {
        // If we reconnect and were already in matching state, re-submit matchmaking filters to server
        if (isMatchingRef.current) {
          console.log('Socket reconnected while matching, re-emitting start_matching.');
          startMatchingProcessRef.current();
        }
      }
    });

    socket.on('online_count', (data) => {
      setActiveOnlineCount(data.onlineCount);
    });

    // Handle Match Find
    socket.on('match_found', (data: { partnerId: string; partnerProfile: any; initiator: boolean }) => {
      console.log('Match established. Initiator:', data.initiator);
      audioSynth.playMatch();
      setPartnerProfile(data.partnerProfile);
      setIsMatching(false);
      setIsMatched(true);
      setMessages([]);
      setHasLiked(false);
      setFriendAdded(false);
      setMatchDuration(0);
      setLoopbackMode(false);

      // Setup WebRTC peer connection
      setupPeerConnection(data.initiator);
    });

    // Handle incoming offer
    socket.on('webrtc_offer', async (data: { sdp: any }) => {
      try {
        if (!peerConnectionRef.current) return;
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('webrtc_answer', { sdp: answer });
      } catch (e) {
        console.error('Error handling WebRTC offer:', e);
      }
    });

    // Handle incoming answer
    socket.on('webrtc_answer', async (data: { sdp: any }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
      } catch (e) {
        console.error('Error handling WebRTC answer:', e);
      }
    });

    // Handle incoming ICE Candidate
    socket.on('webrtc_candidate', async (data: { candidate: any }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        console.error('Error adding WebRTC candidate:', e);
      }
    });

    // Handle match text message
    socket.on('match_message', (msg: any) => {
      if (soundEnabled) audioSynth.playMessage();
      setMessages(prev => [...prev, {
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }]);
    });

    // Handle typing state
    socket.on('typing_state', (data: { isTyping: boolean }) => {
      setPartnerTyping(data.isTyping);
    });

    const handlePartnerExit = () => {
      closePeerConnection();
      setIsMatched(false);
      setPartnerProfile(null);
      setLocalFilter('none');
      setRemoteFilter('none');
      setLocalFace(null);
      setRemoteFace(null);
      prevLocalFaceRef.current = null;
      prevRemoteFaceRef.current = null;
      // Automatically re-trigger matching to keep action flowing (addictive discovery)
      startMatchingProcessRef.current();
    };

    socket.on('partner_skipped', () => {
      console.log('Partner skipped us.');
      handlePartnerExit();
    });

    socket.on('partner_disconnected', () => {
      console.log('Partner disconnected.');
      handlePartnerExit();
    });

    socket.on('partner_filter_changed', (data: { filterType: string }) => {
      setRemoteFilter(data.filterType as any);
    });

    socket.on('partner_filter_coordinates', (data: { coords: { x: number; y: number; w: number; h: number } | null }) => {
      if (!data.coords) {
        setRemoteFace(null);
        prevRemoteFaceRef.current = null;
        return;
      }
      
      // Apply Exponential Moving Average (EMA) smoothing to remote face coordinates
      const coords = data.coords;
      const alpha = 0.25; // Smoothing factor (lower = smoother/less jitter, higher = faster follow)
      let smoothed = coords;

      if (prevRemoteFaceRef.current) {
        const prev = prevRemoteFaceRef.current;
        smoothed = {
          x: alpha * coords.x + (1 - alpha) * prev.x,
          y: alpha * coords.y + (1 - alpha) * prev.y,
          w: alpha * coords.w + (1 - alpha) * prev.w,
          h: alpha * coords.h + (1 - alpha) * prev.h,
        };
      }

      prevRemoteFaceRef.current = smoothed;
      setRemoteFace(smoothed);
    });


    // Handle liked or gift notifications
    socket.on('partner_liked', () => {
      triggerHeartAnimation();
    });

    socket.on('gift_received', (data: { giftType: string }) => {
      const gift = GIFTS.find(g => g.id === data.giftType);
      if (gift) {
        triggerGiftAnimation(gift.emoji);
      }
    });

    socket.on('notification', (data: { title: string; message: string }) => {
      console.log('Notification:', data.title, data.message);
    });



    return () => {
      stopLocalMedia();
      closePeerConnection();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (loopbackIntervalRef.current) {
        clearInterval(loopbackIntervalRef.current);
      }
    };
  }, []);

  // Load tracking.js and face-min.js dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadScripts = async () => {
      try {
        if (!(window as any).tracking) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tracking/build/tracking-min.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load tracking-min.js'));
            document.body.appendChild(script);
          });
        }

        if (!(window as any).tracking?.ViolaJones?.classifiers?.face) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tracking/build/data/face-min.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load face-min.js'));
            document.body.appendChild(script);
          });
        }

        console.log('tracking.js and face classifier loaded successfully!');
        setTrackingLoaded(true);
      } catch (err) {
        console.error('Error loading face tracking scripts:', err);
      }
    };

    loadScripts();
  }, []);

  // Face tracking loop on local video element
  useEffect(() => {
    if (!trackingLoaded || !localVideoRef.current || localFilter === 'none') {
      if (trackerTaskRef.current) {
        trackerTaskRef.current.stop();
        trackerTaskRef.current = null;
      }
      setLocalFace(null);
      if (socketRef.current && isMatched) {
        socketRef.current.emit('filter_coordinates', { coords: null });
      }
      return;
    }

    const video = localVideoRef.current;
    let isActive = true;

    // We need tracking.js ObjectTracker
    const tracking = (window as any).tracking;
    if (!tracking || !tracking.ObjectTracker) {
      console.warn('tracking.js ObjectTracker is not loaded yet');
      return;
    }

    const tracker = new tracking.ObjectTracker('face');
    tracker.setInitialScale(1.15); // Further lowered scale to detect faces from normal/slightly far distances
    tracker.setStepSize(1.4);      // Finer search steps for much higher accuracy
    tracker.setEdgesDensity(0.04); // Lower edge density check to avoid missing faces in low-contrast lighting

    tracker.on('track', (event: any) => {
      if (!isActive) return;
      if (!video.videoWidth || !video.videoHeight) return;

      if (event.data && event.data.length > 0) {
        // Find largest face to focus on
        const face = event.data.reduce((max: any, f: any) => 
          (f.width * f.height > max.width * max.height ? f : max), event.data[0]);

        const coords = {
          x: face.x / video.videoWidth,
          y: face.y / video.videoHeight,
          w: face.width / video.videoWidth,
          h: face.height / video.videoHeight
        };

        // Apply Exponential Moving Average (EMA) smoothing to prevent high-frequency jitter/vibration
        const alpha = 0.25; // Lower values = smoother/less jitter, higher = faster tracking speed
        let smoothed = coords;

        if (prevLocalFaceRef.current) {
          const prev = prevLocalFaceRef.current;
          smoothed = {
            x: alpha * coords.x + (1 - alpha) * prev.x,
            y: alpha * coords.y + (1 - alpha) * prev.y,
            w: alpha * coords.w + (1 - alpha) * prev.w,
            h: alpha * coords.h + (1 - alpha) * prev.h,
          };
        }

        prevLocalFaceRef.current = smoothed;
        setLocalFace(smoothed);

        if (socketRef.current && isMatched) {
          if (loopbackMode) {
            // Emulate remote side coordinate update
            const remoteAlpha = 0.25;
            let remoteSmoothed = coords;
            if (prevRemoteFaceRef.current) {
              const prevRemote = prevRemoteFaceRef.current;
              remoteSmoothed = {
                x: remoteAlpha * coords.x + (1 - remoteAlpha) * prevRemote.x,
                y: remoteAlpha * coords.y + (1 - remoteAlpha) * prevRemote.y,
                w: remoteAlpha * coords.w + (1 - remoteAlpha) * prevRemote.w,
                h: remoteAlpha * coords.h + (1 - remoteAlpha) * prevRemote.h,
              };
            }
            prevRemoteFaceRef.current = remoteSmoothed;
            setRemoteFace(remoteSmoothed);
          } else {
            socketRef.current.emit('filter_coordinates', { coords });
          }
        }
      } else {
        // Log occasionally to confirm the tracker loop is active but just not finding a face
        if (Math.random() < 0.05) {
          console.log('Face tracker running, but no face detected in frame.');
        }
      }
    });

    console.log('Initializing tracking.js on local video');
    const trackerTask = tracking.track(video, tracker);
    trackerTaskRef.current = trackerTask;

    return () => {
      isActive = false;
      if (trackerTask) {
        trackerTask.stop();
      }
      trackerTaskRef.current = null;
    };
  }, [trackingLoaded, localFilter, isMatched, loopbackMode]);

  // Helper function to map normalized face coordinates to actual video container dimensions
  const getMaskStyle = (
    coords: { x: number; y: number; w: number; h: number } | null,
    videoEl: HTMLVideoElement | null,
    isMirrored: boolean,
    filterType: string
  ) => {
    if (!coords || !videoEl) return { display: 'none' };

    const Cw = videoEl.clientWidth;
    const Ch = videoEl.clientHeight;
    const Vw = videoEl.videoWidth;
    const Vh = videoEl.videoHeight;

    if (!Vw || !Vh || !Cw || !Ch) return { display: 'none' };

    // Calculate scaling according to object-fit rules: object-cover for local (isMirrored), object-contain for remote
    const scale = isMirrored ? Math.max(Cw / Vw, Ch / Vh) : Math.min(Cw / Vw, Ch / Vh);
    const Dw = Vw * scale;
    const Dh = Vh * scale;
    const dx = (Dw - Cw) / 2;
    const dy = (Dh - Ch) / 2;

    // Convert coordinates to actual scaled dimensions
    const xVideo = coords.x * Vw;
    const yVideo = coords.y * Vh;
    const wVideo = coords.w * Vw;
    const hVideo = coords.h * Vh;

    let left = xVideo * scale - dx;
    let top = yVideo * scale - dy;
    let width = wVideo * scale;
    let height = hVideo * scale;

    // Apply custom offsets per filter type to align them perfectly on facial features
    if (filterType === 'visor') {
      // Move visor up to align with eyes, and make it slightly wider
      top -= height * 0.15;
      width *= 1.1;
      left -= (width * 0.05); // Center the wider visor
    } else if (filterType === 'carnival') {
      // Move carnival mask slightly up to cover eyes/nose
      top -= height * 0.08;
    } else if (filterType === 'cat') {
      // Cat mask should be slightly larger and sit higher to align ears above hair
      top -= height * 0.18;
      width *= 1.35;
      height *= 1.35;
      left -= (width * 0.13); // Center the larger cat mask
    } else if (filterType === 'blur') {
      // Blur circle should be slightly larger than the raw bounding box to ensure ears/chin are fully covered
      width *= 1.25;
      height *= 1.25;
      left -= (width * 0.1);
      top -= (height * 0.1);
    }

    if (isMirrored) {
      left = Cw - (left + width);
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${width}px`, // Emojis size scales automatically with the adjusted width!
      position: 'absolute' as const,
      zIndex: 30,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none' as const
    };
  };

  // Match timer clock
  useEffect(() => {
    let interval: any = null;
    if (isMatched) {
      interval = setInterval(() => {
        setMatchDuration(prev => prev + 1);
      }, 1000);
    } else {
      setMatchDuration(0);
    }
    return () => clearInterval(interval);
  }, [isMatched]);

  // Scroll chat window to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (mobileChatBottomRef.current) {
      mobileChatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, partnerTyping]);

  // Initialize camera and mic
  const initLocalMedia = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedVideoDeviceId 
          ? { deviceId: { exact: selectedVideoDeviceId }, width: 640, height: 480 } 
          : { width: 640, height: 480, facingMode: 'user' },
        audio: selectedAudioDeviceId 
          ? { deviceId: { exact: selectedAudioDeviceId } } 
          : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setCameraPermissionError(null);
      await updateDeviceList();
    } catch (err: any) {
      console.warn('Camera access denied:', err.message);
      setCameraPermissionError(err.message || 'Camera permission denied.');
      // Create empty/dummy stream so we can still chat using voice/text
      try {
        const audioConstraints = selectedAudioDeviceId 
          ? { audio: { deviceId: { exact: selectedAudioDeviceId } } } 
          : { audio: true };
        const audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        localStreamRef.current = audioStream;
        await updateDeviceList();
      } catch (e) {}
    }
  };

  // Enumerate input audio & video devices
  const updateDeviceList = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices.filter(d => d.kind === 'audioinput');
      const video = devices.filter(d => d.kind === 'videoinput');
      setAudioDevices(audio);
      setVideoDevices(video);
      
      // If we don't have selections yet, pre-populate them with the active tracks' deviceId
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (audioTrack && !selectedAudioDeviceId) {
          setSelectedAudioDeviceId(audioTrack.getSettings().deviceId || '');
        }
        if (videoTrack && !selectedVideoDeviceId) {
          setSelectedVideoDeviceId(videoTrack.getSettings().deviceId || '');
        }
      }
    } catch (err) {
      console.error('Error listing devices:', err);
    }
  };

  // Dynamically switch mic or camera input source
  const handleSwitchDevice = async (type: 'audio' | 'video', deviceId: string) => {
    if (type === 'audio') {
      setSelectedAudioDeviceId(deviceId);
    } else {
      setSelectedVideoDeviceId(deviceId);
    }

    try {
      // Build constraints using the newly selected deviceId, keeping the other as-is
      const constraints: MediaStreamConstraints = {
        audio: type === 'audio' 
          ? { deviceId: { exact: deviceId } } 
          : (selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true),
        video: type === 'video' 
          ? { deviceId: { exact: deviceId }, width: 640, height: 480 } 
          : (selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId }, width: 640, height: 480 } : { width: 640, height: 480, facingMode: 'user' })
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (localStreamRef.current) {
        if (type === 'audio') {
          const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];
          const newAudioTrack = newStream.getAudioTracks()[0];
          
          if (oldAudioTrack) {
            oldAudioTrack.stop();
            localStreamRef.current.removeTrack(oldAudioTrack);
          }
          if (newAudioTrack) {
            localStreamRef.current.addTrack(newAudioTrack);
            // Maintain current mic enabled/disabled state
            newAudioTrack.enabled = micEnabled;
          }
          
          // Replace track in active WebRTC peer connection
          if (peerConnectionRef.current) {
            const senders = peerConnectionRef.current.getSenders();
            const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
            if (audioSender && newAudioTrack) {
              await audioSender.replaceTrack(newAudioTrack);
            }
          }
        } else {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          const newVideoTrack = newStream.getVideoTracks()[0];
          
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStreamRef.current.removeTrack(oldVideoTrack);
          }
          if (newVideoTrack) {
            localStreamRef.current.addTrack(newVideoTrack);
            // Maintain current camera enabled/disabled state
            newVideoTrack.enabled = cameraEnabled;
          }
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          
          // Replace track in active WebRTC peer connection
          if (peerConnectionRef.current) {
            const senders = peerConnectionRef.current.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender && newVideoTrack) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error switching ${type} device:`, err);
    }
  };

  const stopLocalMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startMatchingProcess = () => {
    if (!socketRef.current) return;
    setIsMatching(true);
    setIsMatched(false);
    setPartnerProfile(null);
    
    // Read filters from localStorage
    const savedUserStr = localStorage.getItem('lunaar_user');
    const userObj = savedUserStr ? JSON.parse(savedUserStr) : {};
    const isPremium = userObj.isPremium || false;
    
    const filters = {
      gender: isPremium ? (userObj.genderPreference || 'everyone') : 'everyone',
      country: userObj.countryPreference || 'World',
      interests: userObj.interests || [],
      isPremium: isPremium
    };

    socketRef.current.emit('start_matching', { filters });
    console.log('Emitted start_matching with filters:', filters);

    // Setup local loopback simulator fallback if they are alone for 6 seconds
    if (loopbackIntervalRef.current) clearInterval(loopbackIntervalRef.current);
    if (botsEnabled) {
      loopbackIntervalRef.current = setTimeout(() => {
        // If we are still matching after 6 seconds, let's trigger a high-quality simulated partner
        if (socketRef.current && isMatchingRef.current && !isMatchedRef.current) {
          triggerSimulatedPartner();
        }
      }, 6000);
    }
  };

  useEffect(() => {
    startMatchingProcessRef.current = startMatchingProcess;
  }, [startMatchingProcess]);

  // Mock Simulated Partner for zero-dependency standalone sandbox execution
  const triggerSimulatedPartner = () => {
    if (botPool.length === 0) {
      console.log('No simulated partners/bots available in the pool yet. Retrying in 2 seconds...');
      const retryTimeout = setTimeout(() => {
        if (socketRef.current && isMatchingRef.current && !isMatchedRef.current) {
          triggerSimulatedPartner();
        }
      }, 2000);
      simMessagesTimeoutsRef.current.push(retryTimeout);
      return;
    }
    console.log('No other active matches found. Launching Simulated Partner Loopback.');
    if (loopbackIntervalRef.current) clearInterval(loopbackIntervalRef.current);

    const activePool = botPool;

    // Filter bots by user preference (genderFilter and countryFilter)
    let filtered = activePool.filter(bot => {
      if (genderFilter !== 'everyone') {
        return bot.gender === genderFilter;
      }
      return true;
    });

    if (countryFilter !== 'World') {
      const countryFiltered = filtered.filter(bot => bot.country?.toLowerCase() === countryFilter.toLowerCase());
      if (countryFiltered.length > 0) {
        filtered = countryFiltered;
      }
    }

    // Pick random bot from filtered, or fallback to activePool if none matched filters
    const randomPartner = filtered[Math.floor(Math.random() * filtered.length)] || activePool[Math.floor(Math.random() * activePool.length)];

    audioSynth.playMatch();
    setPartnerProfile(randomPartner);
    setIsMatching(false);
    setIsMatched(true);
    setLoopbackMode(true);
    setMessages([]);

    // Bind videoUrl stream to remote video display
    setTimeout(() => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        if (randomPartner.videoUrl) {
          const resolveVideoUrl = (url: string) => {
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            const backendUrl = typeof window !== 'undefined'
              ? (window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin)
              : 'http://localhost:3001';
            const cleanUrl = url.startsWith('/') ? url : `/${url}`;
            return `${backendUrl}${cleanUrl}`;
          };
          remoteVideoRef.current.src = resolveVideoUrl(randomPartner.videoUrl);
          remoteVideoRef.current.loop = true;
          remoteVideoRef.current.muted = false; // play with sound!
          remoteVideoRef.current.play().catch(err => {
            console.warn("Audio autoplay blocked, retrying muted...", err);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.muted = true;
              remoteVideoRef.current.play().catch(playErr => console.error("Muted playback failed", playErr));
            }
          });
        } else {
          // Loopback fallback
          if (localStreamRef.current) {
            remoteVideoRef.current.srcObject = localStreamRef.current;
          }
        }
      }
    }, 500);

    // Schedule automated conversation responses from custom scripted messages
    if (randomPartner.chatEnabled && Array.isArray(randomPartner.chatMessages)) {
      randomPartner.chatMessages.forEach((msg: any) => {
        const delaySecs = Number(msg.delay) || 0;
        const text = msg.text || '';
        if (text.trim() === '') return;

        if (delaySecs > 0) {
          // Schedule typing indicator 2 seconds before the message is sent
          const typingDelay = Math.max(0, delaySecs - 2) * 1000;
          const typingStartTimeout = setTimeout(() => {
            setPartnerTyping(true);
          }, typingDelay);
          simMessagesTimeoutsRef.current.push(typingStartTimeout);

          // Schedule the actual message and turn off typing
          const messageTimeout = setTimeout(() => {
            setPartnerTyping(false);
            setMessages(prev => [...prev, {
              id: `msg_sim_${Math.random()}`,
              senderId: randomPartner.id,
              senderName: randomPartner.username,
              content: text,
              timestamp: new Date()
            }]);
          }, delaySecs * 1000);
          simMessagesTimeoutsRef.current.push(messageTimeout);
        } else {
          // Immediate message (delay = 0)
          setMessages(prev => [...prev, {
            id: `msg_sim_${Math.random()}`,
            senderId: randomPartner.id,
            senderName: randomPartner.username,
            content: text,
            timestamp: new Date()
          }]);
        }
      });

      // Also trigger a simulated Like/Heart animation after 12 seconds
      const heartTimeout = setTimeout(() => {
        triggerHeartAnimation();
      }, 12000);
      simMessagesTimeoutsRef.current.push(heartTimeout);
    }
  };

  const setupPeerConnection = (isInitiator: boolean) => {
    closePeerConnection();

    // Create RTCPeerConnection with default google STUN configuration
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    peerConnectionRef.current = pc;

    // Attach local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Capture remote stream track
    pc.ontrack = (event) => {
      console.log('WebRTC remote track received.');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Forward ICE candidate to server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_candidate', { candidate: event.candidate });
      }
    };

    // Handle ICE connection state changes for diagnostic info
    pc.oniceconnectionstatechange = () => {
      console.log('WebRTC ICE state changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        // Fallback or restart if disconnected
      }
    };

    // If initiator, send offer
    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socketRef.current) {
            socketRef.current.emit('webrtc_offer', { sdp: offer });
          }
        } catch (e) {
          console.error('Error building WebRTC offer:', e);
        }
      };
    }
  };

  const closePeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.removeAttribute('src'); // clear video bot src
      remoteVideoRef.current.load();
    }
    if (loopbackIntervalRef.current) {
      clearInterval(loopbackIntervalRef.current);
    }
    if (simTimeoutRef.current) {
      clearTimeout(simTimeoutRef.current);
      simTimeoutRef.current = null;
    }
    if (simMessagesTimeoutsRef.current) {
      simMessagesTimeoutsRef.current.forEach(t => clearTimeout(t));
      simMessagesTimeoutsRef.current = [];
    }
  };

  // 2. Control toggles
  const handleToggleMic = () => {
    audioSynth.playClick();
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  const handleSelectFilter = (filterType: 'none' | 'blur' | 'carnival' | 'visor' | 'cat') => {
    setLocalFilter(filterType);
    audioSynth.playClick();
    
    // Relay filter change to partner via socket
    if (socketRef.current) {
      if (loopbackMode) {
        setTimeout(() => {
          setRemoteFilter(filterType);
        }, 800);
      } else {
        socketRef.current.emit('change_filter', { filterType });
      }
    }
  };

  const handleToggleCamera = () => {
    audioSynth.playClick();
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  const getCountryFlag = (countryName: string) => {
    if (!countryName || countryName === 'World') return '🗺️';
    const match = COUNTRIES.find(c => c.name.toLowerCase() === countryName.toLowerCase());
    return match ? match.flag : '🗺️';
  };

  const handleStopMatch = () => {
    audioSynth.playClick();
    if (loopbackMode) {
      setLoopbackMode(false);
      if (loopbackIntervalRef.current) {
        clearInterval(loopbackIntervalRef.current);
      }
    }
    if (socketRef.current) {
      socketRef.current.emit('stop_matching');
    }
    closePeerConnection();
    setIsMatching(false);
    setIsMatched(false);
    setPartnerProfile(null);
    setLocalFilter('none');
    setRemoteFilter('none');
    setLocalFace(null);
    setRemoteFace(null);
    prevLocalFaceRef.current = null;
    prevRemoteFaceRef.current = null;
    setMessages([]);
  };

  // Manage bots enabled state changes
  useEffect(() => {
    if (!botsEnabled) {
      if (loopbackIntervalRef.current) {
        clearInterval(loopbackIntervalRef.current);
        loopbackIntervalRef.current = null;
        console.log('Cleared loopback timer due to bots disabled');
      }
      if (loopbackMode) {
        handleStopMatch();
        console.log('Disconnected from simulated partner due to bots disabled');
      }
    }
  }, [botsEnabled, loopbackMode]);

  const handleStartMatch = () => {
    audioSynth.playClick();
    startMatchingProcess();
  };

  const updateLocalUserPreference = (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    const savedUserStr = localStorage.getItem('lunaar_user');
    if (savedUserStr) {
      const userObj = JSON.parse(savedUserStr);
      userObj[key] = value;
      localStorage.setItem('lunaar_user', JSON.stringify(userObj));
      setCurrentUser(userObj);
    }
  };

  const triggerNextWithFilters = (g: string, c: string) => {
    if (!socketRef.current) return;
    
    if (loopbackMode) {
      setLoopbackMode(false);
      if (loopbackIntervalRef.current) {
        clearInterval(loopbackIntervalRef.current);
      }
    }
    
    closePeerConnection();
    
    const savedUserStr = localStorage.getItem('lunaar_user');
    const userObj = savedUserStr ? JSON.parse(savedUserStr) : {};
    const isPremium = userObj.isPremium || false;
    
    const filters = {
      gender: isPremium ? g : 'everyone',
      country: c,
      interests: userObj.interests || [],
      isPremium: isPremium
    };
    
    setIsMatching(true);
    setIsMatched(false);
    setPartnerProfile(null);
    setLocalFilter('none');
    setRemoteFilter('none');
    setLocalFace(null);
    setRemoteFace(null);
    prevLocalFaceRef.current = null;
    prevRemoteFaceRef.current = null;
    setMessages([]);
    
    socketRef.current.emit('next_match', { filters });
    console.log('Filters updated. Restarting matching with:', filters);

    if (loopbackIntervalRef.current) clearInterval(loopbackIntervalRef.current);
    if (botsEnabled) {
      loopbackIntervalRef.current = setTimeout(() => {
        if (socketRef.current && isMatchingRef.current && !isMatchedRef.current) {
          triggerSimulatedPartner();
        }
      }, 6000);
    }
  };

  const handleGenderFilterClick = (newGender: 'everyone' | 'male' | 'female') => {
    audioSynth.playClick();
    if (newGender === 'everyone') {
      setGenderFilter('everyone');
      updateLocalUserPreference('genderPreference', 'everyone');
      if (isMatching || isMatched) {
        triggerNextWithFilters('everyone', countryFilter);
      }
    } else {
      if (currentUser?.isPremium) {
        setGenderFilter(newGender);
        updateLocalUserPreference('genderPreference', newGender);
        if (isMatching || isMatched) {
          triggerNextWithFilters(newGender, countryFilter);
        }
      } else {
        setShowPremiumModal(true);
      }
    }
  };

  const handleCountryFilterClick = (newCountry: string) => {
    audioSynth.playClick();
    const ownCountry = currentUser?.country || 'World';
    if (newCountry === ownCountry || newCountry === 'World') {
      setCountryFilter(newCountry);
      updateLocalUserPreference('countryPreference', newCountry);
      if (isMatching || isMatched) {
        triggerNextWithFilters(genderFilter, newCountry);
      }
    } else {
      if (currentUser?.isPremium) {
        setCountryFilter(newCountry);
        updateLocalUserPreference('countryPreference', newCountry);
        if (isMatching || isMatched) {
          triggerNextWithFilters(genderFilter, newCountry);
        }
      } else {
        setShowPremiumModal(true);
      }
    }
  };

  const handleSimulateUpgrade = () => {
    audioSynth.playClick();
    setShowPremiumModal(false);
    router.push('/upgrade');
  };

  const handleStartClick = () => {
    if (isMatching || isMatched) {
      handleSkipNext();
    } else {
      handleStartMatch();
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !interests.includes(trimmed) && interests.length < 5) {
      const updatedInterests = [...interests, trimmed];
      setInterests(updatedInterests);
      audioSynth.playClick();
      
      const savedUserStr = localStorage.getItem('lunaar_user');
      if (savedUserStr) {
        const userObj = JSON.parse(savedUserStr);
        userObj.interests = updatedInterests;
        localStorage.setItem('lunaar_user', JSON.stringify(userObj));
        setCurrentUser(userObj);
      }
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    const updatedInterests = interests.filter(t => t !== tag);
    setInterests(updatedInterests);
    audioSynth.playClick();
    
    const savedUserStr = localStorage.getItem('lunaar_user');
    if (savedUserStr) {
      const userObj = JSON.parse(savedUserStr);
      userObj.interests = updatedInterests;
      localStorage.setItem('lunaar_user', JSON.stringify(userObj));
      setCurrentUser(userObj);
    }
  };

  const handleQuickAdd = (tag: string) => {
    if (!interests.includes(tag) && interests.length < 5) {
      const updatedInterests = [...interests, tag];
      setInterests(updatedInterests);
      audioSynth.playClick();
      
      const savedUserStr = localStorage.getItem('lunaar_user');
      if (savedUserStr) {
        const userObj = JSON.parse(savedUserStr);
        userObj.interests = updatedInterests;
        localStorage.setItem('lunaar_user', JSON.stringify(userObj));
        setCurrentUser(userObj);
      }
    }
  };

  // 3. User actions
  const handleSkipNext = () => {
    audioSynth.playSkip();
    if (socketRef.current) {
      // Read filters from localStorage
      const savedUserStr = localStorage.getItem('lunaar_user');
      const userObj = savedUserStr ? JSON.parse(savedUserStr) : {};
      
      const filters = {
        gender: userObj.genderPreference || 'everyone',
        country: userObj.countryPreference || 'World',
        interests: userObj.interests || [],
        isPremium: userObj.isPremium || false
      };

      if (loopbackMode) {
        closePeerConnection();
        setIsMatched(false);
        setPartnerProfile(null);
        setLocalFilter('none');
        setRemoteFilter('none');
        setLocalFace(null);
        setRemoteFace(null);
        prevLocalFaceRef.current = null;
        prevRemoteFaceRef.current = null;
        startMatchingProcess();
      } else {
        socketRef.current.emit('next_match', { filters });
        setIsMatching(true);
        setIsMatched(false);
        setPartnerProfile(null);
        setLocalFilter('none');
        setRemoteFilter('none');
        setLocalFace(null);
        setRemoteFace(null);
        prevLocalFaceRef.current = null;
        prevRemoteFaceRef.current = null;
        setMessages([]);

        if (loopbackIntervalRef.current) clearInterval(loopbackIntervalRef.current);
        if (botsEnabled) {
          loopbackIntervalRef.current = setTimeout(() => {
            if (socketRef.current && isMatchingRef.current && !isMatchedRef.current) {
              triggerSimulatedPartner();
            }
          }, 6000);
        }
      }
    }
  };

  const handleLikePartner = () => {
    if (hasLiked) return;
    setHasLiked(true);
    audioSynth.playClick();
    triggerHeartAnimation();
    
    if (socketRef.current && !loopbackMode) {
      socketRef.current.emit('like_partner');
    }
  };

  const handleAddFriend = () => {
    if (friendAdded || !partnerProfile) return;
    setFriendAdded(true);
    
    // Trigger canvas confetti celebrate!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#FF3B3B', '#FF8E8E', '#FFFFFF']
    });

    if (socketRef.current && !loopbackMode) {
      socketRef.current.emit('send_friend_request', { targetUserId: partnerProfile.id });
    }
  };

  const handleSendGift = (giftType: string) => {
    setShowGiftMenu(false);
    audioSynth.playClick();
    
    const gift = GIFTS.find(g => g.id === giftType);
    if (gift) {
      triggerGiftAnimation(gift.emoji);
      
      if (socketRef.current && !loopbackMode) {
        socketRef.current.emit('send_gift', { giftType });
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || !partnerProfile) return;

    const newMsg: ChatMessage = {
      id: `msg_self_${Math.random()}`,
      senderId: currentUser.id,
      senderName: currentUser.username,
      content: trimmed,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setMessageInput('');

    if (socketRef.current) {
      if (loopbackMode) {
        // Simple simulator responder fallback
        const t1 = setTimeout(() => {
          if (!isMatchedRef.current) return;
          setPartnerTyping(true);
          const t2 = setTimeout(() => {
            setPartnerTyping(false);
            if (!isMatchedRef.current) return;
            const simResponses = [
              "Wow, that's really interesting!",
              "Oh cool! I completely agree with that.",
              "Haha nice! Tell me more about what you do.",
              "I love that too! 😄",
              "That is so awesome. Where did you learn about that?"
            ];
            const content = simResponses[Math.floor(Math.random() * simResponses.length)];
            if (soundEnabled) audioSynth.playMessage();
            setMessages(prev => [...prev, {
              id: `msg_sim_${Math.random()}`,
              senderId: partnerProfile.id,
              senderName: partnerProfile.username,
              content,
              timestamp: new Date()
            }]);
          }, 2000);
          simMessagesTimeoutsRef.current.push(t2);
        }, 1500);
        simMessagesTimeoutsRef.current.push(t1);
      } else {
        socketRef.current.emit('send_match_message', { content: trimmed });
      }
    }
  };

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (socketRef.current && !loopbackMode) {
      socketRef.current.emit('typing_state', { isTyping: true });
      
      if (typingTimeout) clearTimeout(typingTimeout);
      
      const timeout = setTimeout(() => {
        socketRef.current?.emit('typing_state', { isTyping: false });
      }, 2000);
      setTypingTimeout(timeout);
    }
  };

  // Open Report Modal
  const handleOpenReport = () => {
    setShowReportModal(true);
    setReportSuccess(false);
  };

  const handleSubmitReport = () => {
    if (!partnerProfile) return;
    
    if (socketRef.current) {
      socketRef.current.emit('report_user', {
        targetUserId: partnerProfile.id,
        reason: reportReason
      });
    }

    setReportSuccess(true);
    setTimeout(() => {
      setShowReportModal(false);
      // Skip the reported user immediately
      handleSkipNext();
    }, 1500);
  };
  const handleQuickEmoji = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    audioSynth.playClick();
  };

  // Custom text translations mockup
  const handleTranslateMessage = (msgId: string) => {
    audioSynth.playClick();
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        // Mock translation helper
        const translatedContent = `🌎 (Translated) ${m.content} [Original English translation]`;
        return {
          ...m,
          content: translatedContent
        };
      }
      return m;
    }));
  };

  // Hearts trigger animation
  const triggerHeartAnimation = () => {
    const newHeart = { id: Date.now(), left: 10 + Math.random() * 80 };
    setFlyingHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setFlyingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 2500);
  };

  // Gifts trigger animation
  const triggerGiftAnimation = (emoji: string) => {
    const newGift = { id: Date.now(), emoji, left: 20 + Math.random() * 60 };
    setFloatingGifts(prev => [...prev, newGift]);
    setTimeout(() => {
      setFloatingGifts(prev => prev.filter(g => g.id !== newGift.id));
    }, 3000);
  };

  // Format timer
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div 
      className="flex-grow flex flex-col bg-brand-darkBg h-screen overflow-hidden selection:bg-brand-primary selection:text-white relative select-none bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 5, 20, 0.88), rgba(80, 10, 30, 0.65), rgba(15, 5, 20, 0.93)), url('/background.png')`
      }}
    >
      {/* Background Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] rounded-full bg-brand-primary/10 blur-[130px] animate-pulse-slow"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-rose-500/10 blur-[140px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-brand-primary/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
      </div>
      
      {/* Flying Hearts Canvas overlay */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {flyingHearts.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ y: '100vh', opacity: 1, scale: 0.8 }}
            animate={{ y: '-10vh', opacity: 0, scale: 1.5, rotate: heart.left > 50 ? 25 : -25 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="absolute text-brand-primary text-4xl"
            style={{ left: `${heart.left}%` }}
          >
            ❤️
          </motion.div>
        ))}
        {floatingGifts.map(gift => (
          <motion.div
            key={gift.id}
            initial={{ y: '100vh', opacity: 1, scale: 0.5 }}
            animate={{ y: '15vh', opacity: [1, 1, 0], scale: [1, 2, 2.5], rotate: [0, 360, 360] }}
            transition={{ duration: 3, ease: 'easeOut' }}
            className="absolute text-6xl"
            style={{ left: `${gift.left}%` }}
          >
            {gift.emoji}
          </motion.div>
        ))}
      </div>

      <header 
        onClick={(e) => e.stopPropagation()}
        className={`z-30 transition-all duration-300 transform flex items-center justify-between flex-shrink-0 ${
          isMobile 
            ? `absolute top-0 left-0 right-0 h-16 bg-transparent border-none pointer-events-none px-4 pt-3 ${
                isMatched && !mobileControlsVisible ? '-translate-y-full' : 'translate-y-0'
              }` 
            : 'h-16 premium-header relative px-6'
        }`}
      >
        {/* Left Section: Back & Logo (Desktop), Profile Avatar (Mobile) */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3">
            <button 
              onClick={() => { audioSynth.playClick(); router.push('/'); }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <a 
              href="/"
              onClick={(e) => {
                e.preventDefault();
                audioSynth.playClick();
                window.location.href = '/';
              }}
              className="font-extrabold text-lg tracking-[0.2em] text-white premium-glowing-text cursor-pointer select-none"
            >
              LUN<span className="text-brand-primary font-sans">AAR</span>
            </a>
          </div>

          {/* Mobile Profile Circle */}
          <button 
            onClick={(e) => { e.stopPropagation(); audioSynth.playClick(); router.push('/'); }}
            className="flex lg:hidden w-10 h-10 rounded-full border-2 border-red-500/80 items-center justify-center overflow-hidden bg-slate-900 focus:outline-none transition active:scale-95 shadow-md pointer-events-auto"
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Me" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-red-500" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown Filters (visible on mobile only when video is active) */}
        {mobileActiveTab === 'video' && (
          <div className="flex lg:hidden items-center gap-2 pointer-events-auto ml-auto">
            {/* Country selector */}
            <div className="relative">
              <select
                value={countryFilter}
                onChange={(e) => handleCountryFilterClick(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-950/45 border border-white/15 rounded-full py-1 pl-2.5 pr-6 text-[10px] font-bold text-slate-300 focus:border-brand-primary outline-none appearance-none cursor-pointer hover:bg-slate-900/60 backdrop-blur-sm transition max-w-[90px] h-8 pointer-events-auto"
              >
                <option value="World">🗺️ World</option>
                {currentUser?.country && currentUser.country !== 'World' && (
                  <option value={currentUser.country}>
                    {getCountryFlag(currentUser.country)} {currentUser.country}
                  </option>
                )}
                {COUNTRIES.filter(c => c.name !== currentUser?.country).map(c => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>

            {/* Gender selector */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  audioSynth.playClick();
                  setGenderFilterDropdownOpen(!genderFilterDropdownOpen);
                }}
                className="bg-slate-950/45 border border-white/15 hover:bg-slate-950/60 rounded-full py-1 pl-2.5 pr-6 text-[10px] font-bold text-slate-300 focus:border-brand-primary outline-none transition flex items-center gap-1.5 max-w-[100px] h-8 relative pointer-events-auto backdrop-blur-sm"
              >
                <img
                  src={genderFilter === 'male' ? '/male.png' : genderFilter === 'female' ? '/female.png' : '/other.png'}
                  alt={genderFilter}
                  className="w-3.5 h-3.5 object-contain"
                />
                <span className="truncate">{genderFilter === 'everyone' ? 'All' : genderFilter === 'female' ? 'Girls' : 'Boys'}</span>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </button>

              <AnimatePresence>
                {genderFilterDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={(e) => { e.stopPropagation(); setGenderFilterDropdownOpen(false); }}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 top-full mt-1.5 w-32 rounded-xl bg-slate-950/95 border border-white/10 p-1 backdrop-blur-md z-50 flex flex-col gap-0.5 shadow-2xl"
                    >
                      {([
                        { value: 'everyone', label: 'Genders: All', img: '/other.png' },
                        { value: 'female', label: 'Girls (VIP)', img: '/female.png' },
                        { value: 'male', label: 'Boys (VIP)', img: '/male.png' }
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            handleGenderFilterClick(opt.value);
                            setGenderFilterDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-[10px] font-bold transition ${
                            genderFilter === opt.value
                              ? 'bg-brand-primary/20 text-white border border-brand-primary/30'
                              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <img src={opt.img} alt={opt.value} className="w-3.5 h-3.5 object-contain" />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Right Section: Online Stats (Desktop), VIP Upgrade (Desktop) */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3.5 bg-white/5 border border-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold select-none mr-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
              <span className="text-white font-semibold font-sans text-xs tracking-wide">{Math.round(activeOnlineCount * maleRatio).toLocaleString()}</span>
              <span className="text-slate-500 text-[9px] uppercase tracking-wider font-extrabold">Males</span>
            </div>
            <span className="h-3 w-px bg-white/10"></span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]"></span>
              <span className="text-white font-semibold font-sans text-xs tracking-wide">{(activeOnlineCount - Math.round(activeOnlineCount * maleRatio)).toLocaleString()}</span>
              <span className="text-slate-500 text-[9px] uppercase tracking-wider font-extrabold">Females</span>
            </div>
          </div>

          {currentUser?.isPremium ? (
            <div className="hidden md:flex px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/30 text-amber-300 items-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.15)] select-none">
              <Award className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>VIP Active</span>
            </div>
          ) : (
            <a 
              href="/upgrade"
              onClick={() => audioSynth.playClick()}
              className="hidden md:flex px-5 py-2.5 rounded-xl text-sm font-bold premium-vip-button items-center gap-2"
            >
              <Star className="w-4 h-4 text-white fill-white animate-pulse" />
              <span>Upgrade to VIP</span>
            </a>
          )}
        </div>
      </header>

      {/* MAIN SCREEN SPLIT WORKSPACE */}
      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative z-10">
        
        {/* LEFT/CENTER WORKSPACE: CAMERA & FEED PREVIEWS */}
        <div className={`flex-grow flex flex-col relative overflow-hidden bg-slate-950/40 border-r border-white/5 justify-center ${
          isMobile ? 'p-0' : 'p-4 lg:p-6'
        }`}>
          
          {/* Main Display: Remote Partner Video Feed */}
          <div 
            ref={parentWorkspaceRef} 
            onClick={handleScreenTap}
            className={`w-full h-full relative flex flex-col lg:block ${
              isMobile ? 'rounded-none border-none bg-transparent' : 'bg-slate-950 rounded-2xl border border-white/10'
            } ${isMobile && isMatched ? 'cursor-pointer' : ''}`}
          >
            
            {/* REMOTE VIDEO CONTAINER WRAPPER (Stacks vertically on mobile, fills on desktop) */}
            <div className={`relative w-full h-1/2 lg:h-full flex items-center justify-center overflow-hidden lg:absolute lg:inset-0 ${
              isMobile ? 'bg-slate-950/55 backdrop-blur-md' : 'bg-slate-950'
            }`}>
              
              {/* Scan Line effect on call active */}
              {isMatched && <div className="absolute inset-0 z-10 pointer-events-none animate-scan-line"></div>}

              {/* Remote Video element */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover lg:object-contain transition-all duration-500 ${
                  isMatched ? 'opacity-100' : 'opacity-0'
                } ${remoteFilter === 'blur' && !remoteFace ? 'filter blur-2xl scale-105' : ''}`}
              />

              {/* Remote Video Filters Overlay */}
              {isMatched && remoteFilter !== 'none' && (
                <>
                  {/* Face-Specific Blur (Backdrop Filter) */}
                  {remoteFilter === 'blur' && remoteFace && (
                    <div
                      style={getMaskStyle(remoteFace, remoteVideoRef.current, false, 'blur')}
                      className="rounded-full border border-white/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] overflow-hidden"
                    >
                      <div className="w-full h-full bg-slate-900/10"></div>
                    </div>
                  )}

                  {/* Emojis Masks */}
                  {remoteFilter !== 'blur' && remoteFace && (
                    <div
                      style={getMaskStyle(remoteFace, remoteVideoRef.current, false, remoteFilter)}
                      className="select-none pointer-events-none"
                    >
                      {remoteFilter === 'carnival' && (
                        <span className="drop-shadow-2xl animate-bounce transform origin-center">🎭</span>
                      )}
                      {remoteFilter === 'visor' && (
                        <span className="drop-shadow-2xl animate-pulse transform origin-center">🕶️</span>
                      )}
                      {remoteFilter === 'cat' && (
                        <span className="drop-shadow-2xl animate-pulse transform origin-center">🐱</span>
                      )}
                    </div>
                  )}

                  {/* Fallback Static Overlays if face coordinates are not yet available */}
                  {((remoteFilter !== 'blur' && !remoteFace) || (remoteFilter === 'blur' && !remoteFace)) && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none select-none">
                      {remoteFilter === 'carnival' && (
                        <span className="text-8xl md:text-9xl drop-shadow-2xl animate-bounce">🎭</span>
                      )}
                      {remoteFilter === 'visor' && (
                        <span className="text-8xl md:text-9xl drop-shadow-2xl animate-pulse">🕶️</span>
                      )}
                      {remoteFilter === 'cat' && (
                        <span className="text-8xl md:text-9xl drop-shadow-2xl animate-pulse">🐱</span>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* If camera permission is denied, or video disabled */}
              {cameraPermissionError && !isMatched && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 ${
                  isMobile ? 'bg-slate-950/55 backdrop-blur-md' : 'bg-slate-950'
                }`}>
                  <AlertTriangle className="w-12 h-12 text-brand-primary mb-3" />
                  <h4 className="font-bold text-white text-lg">Camera Access Required</h4>
                  <p className="text-slate-400 text-sm max-w-sm mt-1">
                    Lunaar requires camera and microphone permissions to stream video. Please permit webcam permissions in your browser.
                  </p>
                </div>
              )}

              {/* MATCHING PENDING STATE SCREEN OVERLAY */}
              <AnimatePresence>
                {isMatching && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4 ${
                      isMobile ? 'bg-slate-950/60 backdrop-blur-md' : 'bg-slate-950/90'
                    }`}
                  >
                    {/* Glowing Match Circles */}
                    <div className="relative w-20 h-20 md:w-36 md:h-36 flex items-center justify-center mb-4 md:mb-8">
                      <div className="absolute inset-0 rounded-full border border-brand-primary/40 animate-match-pulse"></div>
                      <div className="absolute w-14 h-14 md:w-28 md:h-28 rounded-full border border-brand-primary/25 animate-match-pulse" style={{ animationDelay: '0.5s' }}></div>
                      <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-brand-primary flex items-center justify-center shadow-premium relative z-10">
                        <RefreshCw className="w-4 h-4 md:w-6 md:h-6 text-white animate-spin" />
                      </div>
                    </div>

                    <h3 className="text-lg md:text-2xl font-black text-white font-sans">Finding a Match...</h3>
                    <div className="mt-2 md:mt-6 flex flex-col gap-2 items-center text-[10px] md:text-xs font-semibold text-slate-400">
                      <div className="flex gap-4 justify-center items-center">
                        <span>Gender: <span className="text-slate-200">{currentUser?.genderPreference || 'everyone'}</span></span>
                        <span className="text-white/10">|</span>
                        <span>Country: <span className="text-slate-200">{currentUser?.countryPreference || 'World'}</span></span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* MOBILE ONLY: Floating Partner Info Badge (Img 2 style) */}
              {isMatched && partnerProfile && (
                <div className={`absolute bottom-3 left-3 z-20 flex items-center gap-2 p-2 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/10 lg:hidden max-w-[200px] transition-all duration-300 transform ${
                  mobileControlsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}>
                  <div className="w-7 h-7 rounded bg-slate-800 overflow-hidden flex-shrink-0">
                    <img src={partnerProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="font-extrabold text-xs text-white truncate leading-none">{partnerProfile.username}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 truncate">{partnerProfile.country}</span>
                  </div>
                </div>
              )}

              {/* MOBILE ONLY: Floating Report Button */}
              {isMatched && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenReport();
                  }}
                  className={`absolute bottom-3 right-3 z-20 w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 text-red-500 flex items-center justify-center transition-all duration-300 lg:hidden transform ${
                    mobileControlsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                  title="Report User"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}

              {/* MOBILE ONLY: Floating Call Duration Timer */}
              {isMatched && (
                <div className={`absolute bottom-3 right-12 z-20 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/70 backdrop-blur-md border border-white/10 text-emerald-400 text-[10px] font-bold lg:hidden transition-all duration-300 transform ${
                  mobileControlsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{formatTime(matchDuration)}</span>
                </div>
              )}
            </div>

            {/* IDLE STATE INTEREST OVERLAY */}
            {!isMatching && !isMatched && !cameraPermissionError && (
              <>
                {/* Desktop Inline Panel */}
                {!isMobile ? (
                  <div className="absolute inset-0 bg-slate-950/70 z-30 flex items-center justify-center p-6 backdrop-blur-xs">
                    <div className="w-full max-w-sm glass-panel rounded-2xl p-6 flex flex-col gap-4 text-left border border-white/10 shadow-2xl">
                      <div className="flex flex-col gap-1 text-center">
                        <h3 className="font-extrabold text-sm text-white uppercase tracking-widest">
                          Add your interests (optional)
                        </h3>
                        <p className="text-xs text-slate-400">
                          Connect with people who share your passion
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Tags</span>
                          <span className="text-[10px] text-slate-500 font-bold">{interests.length}/5 tags</span>
                        </div>

                        <form onSubmit={handleAddTag} className="flex gap-2">
                          <div className="relative flex-grow">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input
                              type="text"
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              placeholder="e.g. music, coding, travel"
                              className="w-full py-2 pl-9 pr-3 rounded-xl text-xs font-semibold bg-slate-950/60 border border-white/10 text-white focus:border-brand-primary focus:shadow-[0_0_12px_rgba(255,59,59,0.15)] focus:bg-slate-950/80 outline-none transition duration-300"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={interests.length >= 5}
                            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </form>

                        {/* Quick tags selector */}
                        {interests.length < 5 && (
                          <div className="flex flex-wrap gap-1 items-center mt-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mr-1">Popular:</span>
                            {['gaming', 'music', 'travel', 'movies', 'anime'].map((tag) => {
                              const isAdded = interests.includes(tag);
                              if (isAdded) return null;
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleQuickAdd(tag)}
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
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5 mt-1">
                            {interests.map((tag) => (
                              <span 
                                key={tag} 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-brand-primary/15 to-rose-500/5 border border-brand-primary/30 text-white text-[10px] font-bold shadow-sm"
                              >
                                <span className="text-brand-primary font-black">#</span>{tag}
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveTag(tag)}
                                  className="p-0.5 rounded-full hover:bg-brand-primary/20 transition ml-0.5 text-slate-400 hover:text-white"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mobile Simple Inline Input Form matching reference image 1:1 */
                  <div className="absolute inset-0 z-30 flex items-center justify-center p-6 pointer-events-none">
                    <div className="w-full max-w-[280px] pointer-events-auto flex flex-col gap-3">
                      {/* Start Chatting Button */}
                      <button
                        type="button"
                        onClick={handleStartClick}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600/35 via-indigo-600/35 to-violet-600/35 border border-indigo-500/50 text-white font-extrabold text-[14px] tracking-wider transition active:scale-95 shadow-[0_0_25px_rgba(99,102,241,0.25)] backdrop-blur-md flex items-center justify-center gap-2 hover:from-blue-600/45 hover:to-violet-600/45 hover:border-indigo-500/75"
                      >
                        <Play className="w-4 h-4 fill-white text-white" />
                        <span>START CHATTING</span>
                      </button>

                      {/* Lunaar VIP Button */}
                      {currentUser?.isPremium ? (
                        <div
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-600/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[13px] tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.15)] backdrop-blur-md flex items-center justify-center gap-2 select-none"
                        >
                          <span className="text-base animate-pulse">👑</span>
                          <span>VIP ACTIVATED</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            audioSynth.playClick();
                            router.push('/upgrade');
                          }}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600/35 via-red-600/35 to-amber-500/30 border border-rose-500/50 text-white font-extrabold text-[13px] tracking-widest transition active:scale-95 shadow-[0_0_25px_rgba(239,68,68,0.3)] backdrop-blur-md flex items-center justify-center gap-2 hover:from-rose-600/45 hover:to-amber-500/40 hover:border-rose-500/75"
                        >
                          <span className="text-base animate-pulse">👑</span>
                          <span>LUNAAR VIP</span>
                        </button>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAddTag(e);
                        }}
                        onClick={() => {
                          const inputEl = document.getElementById('mobile-tag-input');
                          if (inputEl) (inputEl as HTMLInputElement).focus();
                        }}
                        className="w-full flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl border border-brand-primary/30 bg-slate-950/55 focus-within:border-brand-primary/65 focus-within:shadow-[0_0_20px_rgba(255,59,59,0.15)] shadow-lg transition cursor-text backdrop-blur-md"
                      >
                        {/* Selected Tag Pills rendered inside the same box */}
                        {interests.map((tag) => (
                          <span 
                            key={tag} 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-brand-primary/15 border border-brand-primary/35 text-white text-xs font-bold shadow-sm"
                          >
                            <span className="text-brand-primary font-black font-mono">#</span>
                            <span className="text-white font-semibold">{tag}</span>
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(tag);
                              }}
                              className="p-0.5 rounded-full hover:bg-white/10 transition ml-0.5 text-white/40 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        {/* Custom wrapping placeholder next to or below pills when typing value is empty */}
                        {interests.length > 0 && !tagInput && (
                          <span className="text-white/40 text-[15px] font-medium pointer-events-none select-none">
                            Add your interests (optional)
                          </span>
                        )}

                        {/* Text Input cursor positioned next to pills */}
                        <input
                          id="mobile-tag-input"
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder={interests.length === 0 ? "Add your interests (optional)" : ""}
                          className="flex-grow bg-transparent border-none outline-none text-white text-[15px] placeholder-white/40 font-medium focus:ring-0 focus:outline-none min-w-[60px]"
                        />

                        {/* Plus add button inside input */}
                        {tagInput.trim() && (
                          <button
                            type="submit"
                            disabled={interests.length >= 5}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white transition disabled:opacity-30 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* LOCAL CAMERA FEED PREVIEW (Split screen on mobile, absolute floating on desktop) */}
            <motion.div
              ref={localPreviewRef}
              drag={!isMobile}
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0.1}
              dragConstraints={parentWorkspaceRef}
              onDragEnd={handleDragEnd}
              animate={isMobile ? { x: 0, y: 0 } : controls}
              initial={{ x: 0, y: 0 }}
              className={`flex flex-col group select-none overflow-hidden ${
                isMobile 
                  ? 'relative w-full h-1/2 border-t border-white/10 bg-slate-950/55 backdrop-blur-md' 
                  : 'absolute bottom-4 left-4 z-20 w-40 md:w-60 rounded-xl border-2 border-white/15 bg-slate-950 shadow-2xl'
              }`}
            >
              {/* Drag Handle Top Bar (Desktop only) */}
              {!isMobile && (
                <div 
                  onPointerDown={(e) => dragControls.start(e)}
                  className="h-6 w-full bg-slate-900/90 border-b border-white/10 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing touch-none select-none"
                >
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Drag to Move</span>
                  </div>
                  <div className="flex gap-0.5">
                    <span className="w-0.5 h-2 bg-slate-600 rounded-full" />
                    <span className="w-0.5 h-2 bg-slate-600 rounded-full" />
                    <span className="w-0.5 h-2 bg-slate-600 rounded-full" />
                  </div>
                </div>
              )}

              {/* Main Content Wrapper */}
              <div className={`relative w-full overflow-hidden flex-grow ${
                isMobile ? 'h-full bg-transparent' : 'bg-slate-950 aspect-[4/3]'
              }`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover transform -scale-x-100 transition-all ${
                    localFilter === 'blur' && !localFace ? 'filter blur-xl scale-105' : ''
                  }`}
                />

                {/* Local Video Filters Overlay */}
                {localFilter !== 'none' && (
                  <>
                    {/* Face-Specific Blur (Backdrop Filter) */}
                    {localFilter === 'blur' && localFace && (
                      <div
                        style={getMaskStyle(localFace, localVideoRef.current, true, 'blur')}
                        className="rounded-full border border-white/20 backdrop-blur-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden"
                      >
                        <div className="w-full h-full bg-slate-950/10"></div>
                      </div>
                    )}

                    {/* Emojis Masks */}
                    {localFilter !== 'blur' && localFace && (
                      <div
                        style={getMaskStyle(localFace, localVideoRef.current, true, localFilter)}
                        className="select-none pointer-events-none"
                      >
                        {localFilter === 'carnival' && (
                          <span className="drop-shadow-lg animate-bounce transform origin-center text-3xl">🎭</span>
                        )}
                        {localFilter === 'visor' && (
                          <span className="drop-shadow-lg animate-pulse transform origin-center text-3xl">🕶️</span>
                        )}
                        {localFilter === 'cat' && (
                          <span className="drop-shadow-lg animate-pulse transform origin-center text-3xl">🐱</span>
                        )}
                      </div>
                    )}

                    {/* Fallback Static Overlays if face coordinates are not yet available */}
                    {((localFilter !== 'blur' && !localFace) || (localFilter === 'blur' && !localFace)) && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none select-none">
                        {localFilter === 'carnival' && (
                          <span className="text-4xl drop-shadow-lg animate-bounce">🎭</span>
                        )}
                        {localFilter === 'visor' && (
                          <span className="text-4xl drop-shadow-lg">🕶️</span>
                        )}
                        {localFilter === 'cat' && (
                          <span className="text-4xl drop-shadow-lg">🐱</span>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {/* Local Feed Overlay controls */}
                {!(isMobile && mobileActiveTab === 'chat') && (
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent flex items-end justify-between p-2 z-20">
                    <span className="text-[10px] text-white font-bold">Me</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleMic();
                        }}
                        className="p-1 rounded bg-slate-900/80 text-white hover:bg-slate-800"
                      >
                        {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-brand-primary" />}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCamera();
                        }}
                        className="p-1 rounded bg-slate-900/80 text-white hover:bg-slate-800"
                      >
                        {cameraEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5 text-brand-primary" />}
                      </button>
                    </div>
                  </div>
                )}
                {/* MUTE / VIDEO FEED OVERLAY FOR LOCAL */}
                {!cameraEnabled && (
                   <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 p-2 ${
                     isMobile ? 'bg-slate-950/55 backdrop-blur-md' : 'bg-slate-950'
                   }`}>
                     <VideoOff className="w-8 h-8 text-slate-600 mb-1" />
                     <span className="text-[10px] text-slate-500 font-bold text-center px-1">Camera Off</span>
                   </div>
                 )}

                {/* MOBILE ONLY: TRANSPARENT OVERLAY CHAT PANEL */}
                {isMobile && mobileActiveTab === 'chat' && (
                  <div className="absolute inset-0 z-30 flex flex-col justify-end p-3.5 pb-16 bg-black/15 select-text pointer-events-auto">
                    {/* Chat messages list */}
                    <div className="flex-grow flex flex-col justify-end overflow-y-auto mb-2 pr-1 custom-scrollbar text-right max-h-[calc(100%-88px)] select-text">
                      <div className="flex flex-col gap-1 justify-end select-text">
                        {messages.map((msg, idx) => {
                          const isMe = msg.senderId === currentUser?.id;
                          return (
                            <div
                              key={msg.id || idx}
                              className="text-white text-sm font-bold tracking-wide drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] my-0.5 select-text"
                            >
                              <span>{msg.content}</span>
                              <span className="text-slate-400 font-black ml-1.5">{isMe ? ' -' : ' <'}</span>
                            </div>
                          );
                        })}
                        {partnerTyping && (
                          <div className="text-slate-300 text-[11px] font-extrabold italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-pulse">
                            Partner is typing...
                          </div>
                        )}
                        <div ref={mobileChatBottomRef} />
                      </div>
                    </div>

                    {/* Input Area */}
                    <form
                      onSubmit={(e) => {
                        handleSendMessage(e);
                      }}
                      className="flex items-center gap-2 w-full relative"
                    >
                      <div className="flex-grow relative flex items-center bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 backdrop-blur-md shadow-lg">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={handleTypingInput}
                          disabled={!isMatched}
                          placeholder={isMatched ? "Type your message here ..." : "Waiting for match ..."}
                          className="w-full bg-transparent text-white text-xs font-semibold placeholder-slate-400 outline-none pr-10 focus:ring-0 disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            audioSynth.playClick();
                            setShowEmojiPicker(!showEmojiPicker);
                          }}
                          className="absolute right-3.5 text-slate-400 hover:text-white transition flex items-center justify-center"
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={!messageInput.trim()}
                        className="w-[42px] h-[42px] rounded-xl bg-[#e52424] hover:bg-red-500 text-white flex items-center justify-center transition flex-shrink-0 disabled:opacity-40 active:scale-95 shadow-[0_0_15px_rgba(229,36,36,0.4)]"
                      >
                        <ChevronRight className="w-5 h-5 text-white stroke-[3px]" />
                      </button>

                      {/* Mobile Emoji Picker Popover */}
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute bottom-full mb-3 right-0 left-0 bg-slate-950/95 border border-white/10 rounded-2xl p-3 shadow-2xl z-50 flex flex-col gap-2.5 backdrop-blur-md"
                            >
                              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Emojis</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    audioSynth.playClick();
                                    setShowEmojiPicker(false);
                                  }}
                                  className="p-1 text-slate-400 hover:text-white transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-7 gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                {EMOJI_LIST.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      handleQuickEmoji(emoji);
                                    }}
                                    className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-base active:scale-90 transition"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </form>
                  </div>
                )}
               </div>
             </motion.div>

           </div>

          {/* LOWER ACTION CONTROL PANEL (skip next, likes, reports, gifts) */}
          <div className={`w-full ${
            isMobile 
              ? `fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-none pb-2 transition-all duration-300 transform ${
                  isMatched && !mobileControlsVisible ? 'translate-y-full' : 'translate-y-0'
                }` 
              : 'relative min-h-20 py-2 min-[1300px]:py-0 min-[1300px]:h-20 mt-4 lg:mt-6 px-6 flex flex-col min-[1300px]:flex-row items-center justify-between gap-4 flex-shrink-0'
          }`}>
            
            {/* Left Column: Partner Profile Badge (Hidden on mobile) */}
            <div className="hidden lg:flex w-full min-[1300px]:w-[240px] justify-center min-[1300px]:justify-start flex-shrink-0">
              {isMatched && partnerProfile && (
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center flex-shrink-0">
                    <img src={partnerProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-white leading-none">{partnerProfile.username}</span>
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-1 rounded-sm uppercase font-bold leading-normal">
                        {partnerProfile.country}
                      </span>
                    </div>
                    {partnerProfile.interests && partnerProfile.interests.length > 0 && (
                      <span className="text-[10px] text-brand-primary font-semibold mt-1">
                        Interests: {partnerProfile.interests.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Center Column: Control Buttons */}
            <div className={`flex flex-col items-center z-40 w-full lg:w-auto pointer-events-auto ${
              isMobile ? 'gap-2 px-4' : 'gap-3.5'
            }`}>
              
              {/* Row 1: Camera, Mic, and Settings Toggles (Hidden on mobile - moved to bottom navigation bar) */}
              <div className="hidden lg:flex items-center justify-center gap-3 translate-y-6">
                {/* Microphone Option */}
                <button
                  onClick={handleToggleMic}
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center transition duration-300 active:scale-95 shadow-md ${
                    micEnabled
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                      : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                  }`}
                  title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                {/* Camera Option */}
                <button
                  onClick={handleToggleCamera}
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center transition duration-300 active:scale-95 shadow-md ${
                    cameraEnabled
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                      : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                  }`}
                  title={cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                {/* Device Settings Gear Option */}
                <div className="relative">
                  <button
                    onClick={() => {
                      audioSynth.playClick();
                      setShowSettingsMenu(!showSettingsMenu);
                    }}
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center transition duration-300 active:scale-95 shadow-md ${
                      showSettingsMenu
                        ? 'bg-brand-primary/20 border-brand-primary text-brand-primary shadow-[0_0_15px_rgba(255,59,59,0.15)]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                    }`}
                    title="Webcam & Mic Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {/* Settings Dropdown Popover */}
                  <AnimatePresence>
                    {showSettingsMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-3.5 w-64 backdrop-blur-md"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Media Devices</span>
                            <button
                              onClick={() => {
                                audioSynth.playClick();
                                setShowSettingsMenu(false);
                              }}
                              className="p-1 text-slate-400 hover:text-white transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Microphone Selection */}
                          <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Microphone</label>
                            {audioDevices.length > 0 ? (
                              <select
                                value={selectedAudioDeviceId}
                                onChange={(e) => handleSwitchDevice('audio', e.target.value)}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-900 border border-white/5 text-white outline-none cursor-pointer hover:bg-slate-800 transition"
                              >
                                {audioDevices.map(d => (
                                  <option key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] text-slate-400">No microphones found</span>
                            )}
                          </div>

                          {/* Webcam Selection */}
                          <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Webcam</label>
                            {videoDevices.length > 0 ? (
                              <select
                                value={selectedVideoDeviceId}
                                onChange={(e) => handleSwitchDevice('video', e.target.value)}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-900 border border-white/5 text-white outline-none cursor-pointer hover:bg-slate-800 transition"
                              >
                                {videoDevices.map(d => (
                                  <option key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] text-slate-400">No webcams found</span>
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Row 2: Action Buttons */}
              <div className="flex items-center justify-center gap-3 w-full">
                {/* Report Button (Hidden on mobile) */}
                <button
                  onClick={handleOpenReport}
                  disabled={!isMatched}
                  className="hidden lg:flex w-12 h-12 rounded-xl bg-white/5 hover:bg-red-950/20 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 items-center justify-center transition duration-300 disabled:opacity-20 disabled:cursor-not-allowed active:scale-95 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] -translate-y-11"
                  title="Report User"
                >
                  <Shield className="w-5 h-5 text-red-500/80" />
                </button>

                <div 
                  onClick={(e) => e.stopPropagation()}
                  className={`${
                    isMobile && mobileActiveTab === 'chat' ? 'hidden' : 'flex'
                  } items-center gap-3 w-full max-w-md mx-auto relative lg:translate-x-32 min-[1300px]:translate-x-60 lg:-translate-y-10`}
                >
                  <button
                    onClick={handleStartClick}
                    className={`flex-1 px-4 lg:px-8 h-[52px] lg:h-[68px] rounded-xl lg:rounded-2xl flex items-center justify-center gap-2.5 transition duration-300 active:scale-95 relative overflow-hidden group ${
                      isMobile 
                        ? 'bg-gradient-to-r from-emerald-500/30 to-teal-600/30 border border-emerald-500/50 text-white font-extrabold text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md hover:from-emerald-500/40 hover:to-teal-600/40' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 border-none text-white font-extrabold text-sm lg:text-base hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                    }`}
                    title="Start Match / Next Person"
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform"></span>
                    <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-white text-white group-hover:rotate-12 transition duration-300" />
                    <span>{isMatching || isMatched ? 'Next' : 'Start'}</span>
                  </button>

                  <button
                    onClick={handleStopMatch}
                    disabled={!isMatching && !isMatched}
                    className={`flex-1 px-4 lg:px-8 h-[52px] lg:h-[68px] rounded-xl lg:rounded-2xl border font-extrabold text-sm lg:text-base flex items-center justify-center gap-2.5 transition duration-300 ${
                      isMobile
                        ? !isMatching && !isMatched
                          ? 'bg-slate-950/20 border-white/5 text-slate-600 cursor-not-allowed backdrop-blur-md'
                          : 'bg-gradient-to-r from-red-500/30 to-rose-600/20 border-red-500/50 text-red-400 hover:from-red-500/40 hover:to-rose-600/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-md active:scale-95'
                        : !isMatching && !isMatched
                          ? 'bg-slate-950/40 border-white/5 text-slate-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-red-500/20 to-rose-600/10 border-red-500/40 hover:from-red-500/30 hover:to-rose-600/20 text-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95'
                    }`}
                    title="Stop Matching / Disconnect"
                  >
                    <div className={`w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-sm transition-colors duration-300 ${!isMatching && !isMatched ? 'bg-slate-700' : 'bg-red-400'}`}></div>
                    <span>Stop</span>
                  </button>

                  {/* Call Stats/Timer (Hidden on mobile) */}
                  {isMatched && (
                    <div className="hidden lg:flex absolute left-full ml-4 items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-slate-300 text-xs font-bold pointer-events-auto whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{formatTime(matchDuration)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Call Stats/Timer space keeper (Desktop only) */}
            <div className="hidden min-[1300px]:flex w-[240px] justify-end flex-shrink-0" />

            {/* Mobile Bottom Navigation Bar (Gear, Mic, Video, Masks, Chat) */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="flex lg:hidden items-center justify-around w-full py-2 border-t border-white/10 bg-slate-950/55 backdrop-blur-md mt-1 pointer-events-auto relative z-50"
            >
              {/* Settings Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    audioSynth.playClick();
                    setShowSettingsMenu(!showSettingsMenu);
                  }}
                  className={`p-2.5 rounded-xl transition duration-200 ${
                    showSettingsMenu ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                </button>

                {/* Mobile settings menu container */}
                <AnimatePresence>
                  {showSettingsMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-3.5 w-64 backdrop-blur-md"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Media Devices</span>
                          <button
                            type="button"
                            onClick={() => {
                              audioSynth.playClick();
                              setShowSettingsMenu(false);
                            }}
                            className="p-1 text-slate-400 hover:text-white transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Microphone Selection */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Microphone</label>
                          {audioDevices.length > 0 ? (
                            <select
                              value={selectedAudioDeviceId}
                              onChange={(e) => handleSwitchDevice('audio', e.target.value)}
                              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-900 border border-white/5 text-white outline-none cursor-pointer hover:bg-slate-800 transition"
                            >
                              {audioDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>
                                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] text-slate-400">No microphones found</span>
                          )}
                        </div>

                        {/* Webcam Selection */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Webcam</label>
                          {videoDevices.length > 0 ? (
                            <select
                              value={selectedVideoDeviceId}
                              onChange={(e) => handleSwitchDevice('video', e.target.value)}
                              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-900 border border-white/5 text-white outline-none cursor-pointer hover:bg-slate-800 transition"
                            >
                              {videoDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>
                                  {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] text-slate-400">No webcams found</span>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Mic Toggle Button */}
              <button
                type="button"
                onClick={handleToggleMic}
                className={`p-2.5 rounded-xl transition duration-200 ${
                  micEnabled ? 'text-slate-400 hover:text-white' : 'bg-red-500/10 text-red-500'
                }`}
              >
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Camera Toggle Button */}
              <button
                type="button"
                onClick={handleToggleCamera}
                className={`p-2.5 rounded-xl transition duration-200 ${
                  cameraEnabled ? 'text-slate-400 hover:text-white' : 'bg-red-500/10 text-red-500'
                }`}
              >
                {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>



              {/* Chat Tab Button */}
              <button
                type="button"
                disabled={!isMatched}
                onClick={() => {
                  audioSynth.playClick();
                  setMobileActiveTab(mobileActiveTab === 'chat' ? 'video' : 'chat');
                }}
                className={`p-2.5 rounded-xl relative transition duration-200 ${
                  !isMatched
                    ? 'text-slate-600 opacity-30 cursor-not-allowed'
                    : mobileActiveTab === 'chat'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                {isMatched && messages.length > 0 && messages[messages.length - 1].senderId !== currentUser?.id && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse border border-slate-950"></span>
                )}
              </button>
            </div>

          </div>
        </div>
                    {/* RIGHT SIDE PANEL: LIVE TEXT MESSAGING CHAT (Desktop only, hidden on mobile) */}
        <div className="hidden lg:flex w-full lg:w-[380px] h-full border-t lg:border-t-0 border-white/5 flex-col bg-slate-950/40 backdrop-blur-xl flex-shrink-0">
          
          {/* CHAT CONTROL HEADER */}
          <div className="px-3.5 py-3 border-b border-white/5 bg-slate-950/20 flex items-center justify-between gap-2 text-xs flex-shrink-0 flex-wrap">

            {/* Mobile Back Button to return to Video view */}
            <button
              type="button"
              onClick={() => {
                audioSynth.playClick();
                setMobileActiveTab('video');
              }}
              className="flex lg:hidden items-center gap-1.5 py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-bold text-[10px]">Video Call</span>
            </button>

            <span className="lg:hidden font-extrabold text-white text-[11px] uppercase tracking-wider">Chat Logs</span>

            {/* Desktop Filter Dropdowns (hidden on mobile) */}
            <div className="hidden lg:flex items-center gap-2 w-full justify-between">
              {/* Gender Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    audioSynth.playClick();
                    setGenderFilterDropdownOpen(!genderFilterDropdownOpen);
                  }}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-lg py-1.5 pl-2.5 pr-6 text-[10px] font-bold text-slate-300 focus:border-brand-primary outline-none transition flex items-center gap-2 min-w-[115px] h-8 relative"
                >
                  <img
                    src={genderFilter === 'male' ? '/male.png' : genderFilter === 'female' ? '/female.png' : '/other.png'}
                    alt={genderFilter}
                    className="w-3.5 h-3.5 object-contain"
                  />
                  <span>{genderFilter === 'everyone' ? 'Genders: All' : genderFilter === 'female' ? 'Girls (VIP)' : 'Boys (VIP)'}</span>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </button>

                <AnimatePresence>
                  {genderFilterDropdownOpen && (
                    <>
                      {/* Invisible click-away backdrop */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setGenderFilterDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 top-full mt-1.5 w-32 rounded-xl bg-slate-950/95 border border-white/10 p-1 backdrop-blur-md z-50 flex flex-col gap-0.5 shadow-2xl"
                      >
                        {([
                          { value: 'everyone', label: 'Genders: All', img: '/other.png' },
                          { value: 'female', label: 'Girls (VIP)', img: '/female.png' },
                          { value: 'male', label: 'Boys (VIP)', img: '/male.png' }
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              handleGenderFilterClick(opt.value);
                              setGenderFilterDropdownOpen(false);
                            }}
                            className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-[10px] font-bold transition ${
                              genderFilter === opt.value
                                ? 'bg-brand-primary/20 text-white border border-brand-primary/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <img src={opt.img} alt={opt.value} className="w-3.5 h-3.5 object-contain" />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Country Dropdown */}
              <div className="relative">
                <select
                  value={countryFilter}
                  onChange={(e) => handleCountryFilterClick(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-2 pr-6 text-[10px] font-bold text-slate-300 focus:border-brand-primary outline-none appearance-none cursor-pointer hover:bg-white/10 hover:border-white/20 transition max-w-[100px]"
                >
                  <option value="World">🗺️ World</option>
                  {/* User's own country */}
                  {currentUser?.country && currentUser.country !== 'World' && (
                    <option value={currentUser.country}>
                      {getCountryFlag(currentUser.country)} {currentUser.country}
                    </option>
                  )}
                  {/* List all other countries */}
                  {COUNTRIES.filter(c => c.name !== currentUser?.country).map(c => (
                    <option key={c.name} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Real-time Matchmaking Status Bar */}
          <AnimatePresence>
            {isMatching && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-white/5 bg-slate-950/20 px-5 py-3 flex items-center gap-2.5 text-xs font-bold"
              >
                <Search className="w-4 h-4 text-brand-primary animate-pulse flex-shrink-0" />
                <span className="text-slate-300 tracking-wide font-sans">
                  Searching for a partner in{' '}
                  <span className="text-white">
                    {countryFilter !== 'World' ? countryFilter : (currentUser?.country && currentUser.country !== 'World' ? currentUser.country : 'Nepal')}
                  </span>
                  ..
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Listing area */}
          <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-600">
                <MessageSquare className="w-8 h-8 mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Empty Chat Logs</span>
                <span className="text-[10px] text-slate-600 max-w-[200px] mt-1 leading-normal">
                  Send a friendly message to say hello! Be respectful of our community guidelines.
                </span>
              </div>
            ) : (
              messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[85%] ${
                    msg.senderId === currentUser.id ? 'align-self-end items-end ml-auto' : 'align-self-start items-start mr-auto'
                  }`}
                >
                  <span className="text-[9px] font-bold text-slate-500 mb-0.5 px-1">{msg.senderName}</span>
                  <div className={`p-3 rounded-2xl text-xs relative group/msg ${
                    msg.senderId === currentUser.id 
                      ? 'bg-gradient-to-r from-brand-primary to-rose-500 text-white rounded-tr-none shadow-[0_0_15px_rgba(255,59,59,0.15)]' 
                      : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
                  }`}>
                    <p className="leading-relaxed break-words">{msg.content}</p>

                    {/* Translation Button on remote messages */}
                    {msg.senderId !== currentUser.id && (
                      <button
                        onClick={() => handleTranslateMessage(msg.id)}
                        className="absolute right-2 bottom-1 opacity-0 group-hover/msg:opacity-100 transition p-0.5 rounded bg-slate-950 text-[9px] text-slate-400 hover:text-white"
                        title="Translate to English"
                      >
                        Translate
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Partner Typing status */}
            {partnerTyping && (
              <div className="align-self-start mr-auto flex flex-col max-w-[80%]">
                <span className="text-[9px] font-bold text-slate-500 mb-0.5 px-1">{partnerProfile?.username || 'Stranger'}</span>
                <div className="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 rounded-tl-none text-slate-400 text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </div>
              </div>
            )}
            
            <div ref={chatBottomRef} />
          </div>

          {/* Input text message container */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex items-center gap-2 bg-slate-950/40 flex-shrink-0 relative">
            {/* Smile Button (Emoji Picker Trigger) */}
            <div className="relative flex-shrink-0 z-50">
              <button
                type="button"
                onClick={() => {
                  audioSynth.playClick();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition duration-300 active:scale-95 ${
                  showEmojiPicker
                    ? 'bg-brand-primary/20 border-brand-primary text-brand-primary shadow-[0_0_15px_rgba(255,59,59,0.15)]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Choose Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Emoji Picker Popover */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full mb-3 left-0 bg-slate-950/95 border border-white/10 rounded-2xl p-3 shadow-2xl z-50 flex flex-col gap-2.5 w-64 backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Emojis</span>
                        <button
                          type="button"
                          onClick={() => {
                            audioSynth.playClick();
                            setShowEmojiPicker(false);
                          }}
                          className="p-1 text-slate-400 hover:text-white transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Emojis Grid */}
                      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {EMOJI_LIST.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              handleQuickEmoji(emoji);
                            }}
                            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-lg active:scale-90 transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <input
              type="text"
              value={messageInput}
              onChange={handleTypingInput}
              disabled={!isMatched}
              placeholder={isMatched ? "Type message here..." : "Waiting for match..."}
              className="flex-grow py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white focus:border-brand-primary focus:bg-white/10 outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            />
            <button
              type="submit"
              disabled={!isMatched || !messageInput.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-brand-primary to-rose-500 hover:opacity-95 text-white flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,59,59,0.2)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

      </main>

      {/* MODAL: REPORT MODAL DIALOG */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-panel border border-white/10 w-full max-w-[400px] rounded-3xl p-6 relative"
            >
              <button
                onClick={() => setShowReportModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col gap-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                
                <h3 className="font-extrabold text-xl text-white">Report Content</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Help keep Lunaar safe. Reports undergo active real-time review by moderation systems.
                </p>

                {reportSuccess ? (
                  <div className="py-4 text-emerald-400 font-extrabold flex items-center justify-center gap-2">
                    <Check className="w-5 h-5 animate-bounce" /> Report submitted. Skipping partner.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 text-left">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reason for report</label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 border border-white/5 text-white outline-none"
                      >
                        <option value="nsfw">NSFW / Inappropriate visual exposure</option>
                        <option value="abusive">Abusive text/verbal behavior</option>
                        <option value="spam">Commercial spam or advertising bots</option>
                        <option value="underage">Suspected user under 18 years old</option>
                      </select>
                    </div>

                    <button
                      onClick={handleSubmitReport}
                      className="w-full py-3 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white font-extrabold text-xs transition"
                    >
                      Submit Report & Skip Partner
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: PREMIUM UPGRADE DIALOG */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="glass-panel border border-white/10 w-full max-w-[420px] rounded-3xl p-6 relative overflow-hidden"
            >
              {/* Background gradient flare */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>

              <button
                onClick={() => setShowPremiumModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col gap-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 mx-auto animate-pulse">
                  <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
                </div>
                
                <div className="flex flex-col gap-1">
                  <h3 className="font-black text-2xl text-white">Upgrade to Premium VIP</h3>
                  <p className="text-slate-400 text-xs px-2 leading-relaxed">
                    Unlock elite matchmaking features and customize your discovery experience on Lunaar.
                  </p>
                </div>

                <div className="h-px bg-white/10 my-1"></div>

                <div className="flex flex-col gap-3 text-left bg-slate-900/60 rounded-2xl p-4 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">VIP Premium Benefits</div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Gender Filters:</span> Match exclusively with girls or boys.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Country Target:</span> Focus matching on any specific country.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Priority Queue:</span> Connect up to 2x faster than standard users.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">VIP Badge:</span> Display a premium golden crown badge on your card.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mt-2">
                  <button
                    onClick={handleSimulateUpgrade}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-primary to-rose-500 hover:from-brand-primaryHover hover:to-rose-600 font-extrabold text-sm text-white tracking-wide shadow-premium transition duration-200"
                  >
                    Unlock VIP Access — From $8.99
                  </button>
                  <button
                    onClick={() => setShowPremiumModal(false)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Continue as Free User
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
