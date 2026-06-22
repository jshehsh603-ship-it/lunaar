'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageSquare, Send, Globe, Star, ArrowLeft, RefreshCw, 
  UserMinus, Ban, Smile, Sparkles, MessageCircle, Volume2, VolumeX
} from 'lucide-react';
import audioSynth from '../../components/AudioEffects';

interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
}

interface FriendItem {
  id: string;
  username: string;
  avatarUrl: string;
  bio: string;
  country: string;
  interests: string[];
  isOnline: boolean;
  isPremium?: boolean;
}

export default function FriendsPage() {
  const router = useRouter();
  
  // Socket.IO connection
  const socketRef = useRef<Socket | null>(null);
  
  // User Profile
  const [currentUser, setCurrentUser] = useState<any>(null);

  // States
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  // Chat window tracking
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  
  // 1. Initialize Socket.IO and register
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Fetch user details
    const savedUserStr = localStorage.getItem('lunaar_user');
    if (!savedUserStr) {
      router.push('/');
      return;
    }
    const userObj = JSON.parse(savedUserStr);
    setCurrentUser(userObj);

    // Initialize list of fallback seed friends in case server is loading
    const initialSeedFriends: FriendItem[] = [
      {
        id: 'user_sophia',
        username: 'Sophia_Globe',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        bio: 'Wanderlust explorer. Let’s talk about history, cooking, and languages!',
        interests: ['travel', 'cooking', 'languages', 'music'],
        country: 'France',
        isOnline: true,
        isPremium: true
      },
      {
        id: 'user_alex',
        username: 'AlexTech',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        bio: 'Software developer from SF. Tell me your favorite movie!',
        interests: ['tech', 'movies', 'music', 'coding'],
        country: 'United States',
        isOnline: false,
        isPremium: false
      },
      {
        id: 'user_yuki',
        username: 'Yuki_K',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        bio: 'Anime enthusiast and casual photographer. Nice to meet you!',
        interests: ['anime', 'photography', 'art', 'gaming'],
        country: 'Japan',
        isOnline: true,
        isPremium: true
      }
    ];

    setFriends(initialSeedFriends);

    // Connect to Socket.IO Server
    const socketUrl = typeof window !== 'undefined'
      ? (window.location.port === '3000' ? 'http://localhost:3001' : window.location.origin)
      : 'http://localhost:3001';
    const socket = io(socketUrl, {
      transports: ['websocket'],
      forceNew: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Friends socket active.');
      socket.emit('register_user', {
        userId: userObj.id,
        profile: userObj
      });
      // Fetch friends from server db
      socket.emit('get_friends');
    });

    socket.on('online_count', (data) => {
      setOnlineCount(data.onlineCount);
    });

    socket.on('friends_list', (serverFriendsList: FriendItem[]) => {
      if (serverFriendsList && serverFriendsList.length > 0) {
        // Merge server friends with local seed
        setFriends(serverFriendsList);
      }
    });

    // Handle Direct Message Incoming
    socket.on('direct_message', (msg: any) => {
      // Check if this message belongs to the currently active conversation
      const messageTime = new Date(msg.timestamp);
      
      const newMsg: DirectMessage = {
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        timestamp: messageTime
      };

      // Play chime sound
      audioSynth.playMessage();

      // If we are currently viewing the sender's channel, add to messages list
      if (selectedFriend && (msg.senderId === selectedFriend.id || msg.receiverId === selectedFriend.id)) {
        setMessages(prev => [...prev, newMsg]);
      } else {
        // Increment unread indicator/notification
        console.log('Unread DM received from:', msg.senderId);
      }
    });

    // Handle Message History
    socket.on('direct_messages_history', (data: { partnerId: string; messages: any[] }) => {
      if (selectedFriend && selectedFriend.id === data.partnerId) {
        setMessages(data.messages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          receiverId: m.receiverId,
          content: m.content,
          timestamp: new Date(m.timestamp)
        })));
        setLoadingHistory(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedFriend]);

  // Autoscroll chat logs to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Open Chat thread with friend
  const handleSelectFriend = (friend: FriendItem) => {
    audioSynth.playClick();
    setSelectedFriend(friend);
    setLoadingHistory(true);
    setMessages([]);

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('get_direct_messages', { partnerId: friend.id });
    } else {
      // Offline/Local mock simulation fallback logs
      setTimeout(() => {
        const mockLogs: DirectMessage[] = [
          { id: '1', senderId: friend.id, receiverId: currentUser.id, content: `Hey! I really enjoyed our random matching call earlier. How are you doing?`, timestamp: new Date(Date.now() - 3600000) },
          { id: '2', senderId: currentUser.id, receiverId: friend.id, content: `I'm doing great! Thanks for adding me. Your country looks beautiful.`, timestamp: new Date(Date.now() - 3000000) }
        ];
        setMessages(mockLogs);
        setLoadingHistory(false);
      }, 500);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || !selectedFriend) return;

    const newMsg: DirectMessage = {
      id: `msg_dm_${Math.random()}`,
      senderId: currentUser.id,
      receiverId: selectedFriend.id,
      content: trimmed,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setMessageInput('');

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_direct_message', {
        receiverId: selectedFriend.id,
        content: trimmed
      });
    } else {
      // Local Simulator automated reply helper
      setTimeout(() => {
        // Echo mock response
        const mockResponses = [
          `That sounds amazing! Let's jump on a private video chat sometime soon. 🎥`,
          `Haha true! That makes a lot of sense.`,
          `I am working on some photography updates today. Talk soon!`,
          `I appreciate you messaging me! Keep in touch. ✨`
        ];
        const content = mockResponses[Math.floor(Math.random() * mockResponses.length)];
        audioSynth.playMessage();
        setMessages(prev => [...prev, {
          id: `msg_dm_sim_${Math.random()}`,
          senderId: selectedFriend.id,
          receiverId: currentUser.id,
          content,
          timestamp: new Date()
        }]);
      }, 2000);
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    audioSynth.playClick();
    if (confirm('Are you sure you want to delete this user from your friends list?')) {
      setFriends(friends.filter(f => f.id !== friendId));
      if (selectedFriend && selectedFriend.id === friendId) {
        setSelectedFriend(null);
      }
      // Emit trigger
      if (socketRef.current) {
        socketRef.current.emit('block_user', { targetUserId: friendId });
      }
    }
  };

  const handleInviteCall = () => {
    audioSynth.playClick();
    // Invite direct to private chat page
    alert(`Call invite link generated! Launching Live Chat.`);
    router.push('/chat');
  };

  return (
    <div className="flex-grow flex flex-col bg-brand-darkBg h-screen overflow-hidden selection:bg-brand-primary selection:text-white relative select-none">
      
      {/* HEADER NAVBAR */}
      <header className="h-16 flex items-center justify-between px-6 premium-header sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { audioSynth.playClick(); router.push('/'); }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-lg">My Friends & Messages</span>
        </div>

        <div className="text-xs text-slate-500 font-semibold hidden md:block">
          Network Speed: Fast • Match server connected
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <main className="flex-grow flex overflow-hidden">
        
        {/* LEFT BAR: FRIENDS LIST */}
        <div className="w-full md:w-[320px] h-full border-r border-white/5 flex flex-col bg-slate-950/20 flex-shrink-0">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="font-extrabold text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-primary" /> Contacts ({friends.length})
            </span>
          </div>

          <div className="flex-grow overflow-y-auto p-2 flex flex-col gap-1.5">
            {friends.length === 0 ? (
              <div className="text-center py-10 text-slate-600 text-xs">
                Your contact list is empty. Go matching to find friends!
              </div>
            ) : (
              friends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend)}
                  className={`w-full p-3 rounded-2xl flex items-center gap-3 transition text-left ${
                    selectedFriend && selectedFriend.id === friend.id
                      ? 'bg-brand-primary/10 border border-brand-primary/20 text-white'
                      : 'bg-white/[0.02] border border-white/5 hover:bg-white/5 text-slate-300'
                  }`}
                >
                  {/* Status Indicator Avatar */}
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-slate-900 flex-shrink-0 flex items-center justify-center">
                    <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    
                    {/* Online light status */}
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                      friend.isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}></div>
                  </div>

                  <div className="flex-grow flex flex-col justify-center min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-white truncate max-w-[130px]">{friend.username}</span>
                      {friend.isPremium && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">{friend.bio || 'Available to chat'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT AREA: CONVERSATION PANEL */}
        <div className="flex-grow h-full flex flex-col bg-slate-900/10">
          
          {selectedFriend ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Active Conversation Friend Header */}
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center">
                    <img src={selectedFriend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-white">{selectedFriend.username}</span>
                      <span className="text-[9px] bg-slate-800 px-1 rounded-sm text-slate-400 uppercase font-black">
                        {selectedFriend.country}
                      </span>
                    </div>
                    <span className="text-[10px] text-brand-primary font-semibold truncate max-w-[300px]">
                      Tags: {selectedFriend.interests.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Call buttons / Delete actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleInviteCall}
                    className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white font-extrabold text-xs flex items-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-4 h-4" /> Start Call
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(selectedFriend.id)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-500 hover:text-brand-primary transition"
                    title="Remove Friend"
                  >
                    <UserMinus className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Chat log listing logs */}
              <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-3.5 bg-slate-950/20">
                {loadingHistory ? (
                  <div className="flex-grow flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${
                        msg.senderId === currentUser.id ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div className={`p-3.5 rounded-2xl text-xs ${
                        msg.senderId === currentUser.id 
                          ? 'bg-brand-primary text-white rounded-tr-none'
                          : 'bg-slate-900 text-slate-200 border border-white/5 rounded-tl-none'
                      }`}>
                        <p className="leading-relaxed break-words">{msg.content}</p>
                      </div>
                      <span className="text-[9px] text-slate-600 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input direct message form panel */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex items-center gap-2 bg-slate-950/60">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={`Send direct message to ${selectedFriend.username}...`}
                  className="flex-grow py-3 px-4 rounded-xl text-xs font-semibold bg-slate-900 border border-white/5 text-white focus:border-brand-primary outline-none"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="w-10 h-10 rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-600">
              <MessageSquare className="w-12 h-12 mb-3 text-brand-primary/30" />
              <h4 className="font-extrabold text-white text-base">Select a Conversation</h4>
              <p className="text-slate-500 text-xs max-w-xs mt-1 leading-normal">
                Choose a contact from the left list sidebar panel to open direct message logs, review profiles, or make private calls.
              </p>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
