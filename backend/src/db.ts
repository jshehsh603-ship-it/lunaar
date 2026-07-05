import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

export interface VideoBot {
  id: string;
  username: string;
  avatarUrl: string;
  bio: string;
  gender: 'male' | 'female' | 'everyone';
  country: string;
  interests: string[];
  videoUrl: string;
  createdAt: Date;
  chatEnabled: boolean;
  chatMessages: { text: string; delay: number }[];
  isPremium: boolean;
  skipAfterDuration: boolean;
  skipDurationSeconds: number;
  skipNearEnd: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatarUrl: string;
  bio: string;
  interests: string[];
  gender: 'male' | 'female' | 'everyone';
  country: string;
  isPremium: boolean;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  password?: string;
  activated?: boolean;
  activationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface MatchHistory {
  id: string;
  userA: string;
  userB: string;
  durationSeconds: number;
  timestamp: Date;
}

const BOTS_FILE_PATH = path.join(__dirname, '../uploads/bots.json');

class DatabaseService extends EventEmitter {
  private users = new Map<string, UserProfile>();
  private friends = new Map<string, Set<string>>();
  private followers = new Map<string, Set<string>>();
  private following = new Map<string, Set<string>>();
  private messages: DirectMessage[] = [];
  private matches: MatchHistory[] = [];
  private blocked = new Map<string, Set<string>>();
  private currentOnlineCount = 12450;
  private reports: { id: string; reporterId: string; reportedId: string; reason: string; timestamp: Date }[] = [];
  private videoBots: VideoBot[] = [];

  constructor() {
    super();
    this.seedInitialData();
    this.loadBotsFromFile();
    this.startOnlineCountFluctuation();
  }

  private loadBotsFromFile() {
    try {
      if (fs.existsSync(BOTS_FILE_PATH)) {
        const data = fs.readFileSync(BOTS_FILE_PATH, 'utf-8');
        this.videoBots = JSON.parse(data);
        console.log(`[Database] Loaded ${this.videoBots.length} video bots from persistent storage.`);
      } else {
        this.videoBots = [];
      }
    } catch (err) {
      console.error('[Database] Error loading video bots from file:', err);
      this.videoBots = [];
    }
  }

  private saveBotsToFile() {
    try {
      const dir = path.dirname(BOTS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(BOTS_FILE_PATH, JSON.stringify(this.videoBots, null, 2), 'utf-8');
      console.log('[Database] Saved video bots to persistent storage.');
    } catch (err) {
      console.error('[Database] Error saving video bots to file:', err);
    }
  }

  getOnlineCount(): number {
    return this.currentOnlineCount;
  }

  private startOnlineCountFluctuation() {
    const update = () => {
      const change = Math.floor(Math.random() * 300) - 150;
      // Keep it within a realistic fluctuation envelope between 9000 and 16000
      this.currentOnlineCount = Math.max(9000, Math.min(16000, this.currentOnlineCount + change));
      
      this.emit('online_count_change', this.currentOnlineCount);
      
      const nextInterval = Math.floor(Math.random() * 15000) + 10000; // 10 to 25 seconds
      setTimeout(update, nextInterval);
    };
    
    const nextInterval = Math.floor(Math.random() * 15000) + 10000; // 10 to 25 seconds
    setTimeout(update, nextInterval);
  }

  private seedInitialData() {
    // Generate some mock users for visual enrichment in our social feeds
    const mockUsers: UserProfile[] = [
      {
        id: 'user_sophia',
        username: 'Sophia_Globe',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        bio: 'Wanderlust explorer. Let’s talk about history, cooking, and languages!',
        interests: ['travel', 'cooking', 'languages', 'music'],
        gender: 'female',
        country: 'France',
        isPremium: true,
        followersCount: 1240,
        followingCount: 320,
        createdAt: new Date()
      },
      {
        id: 'user_alex',
        username: 'AlexTech',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        bio: 'Software developer from SF. Tell me your favorite movie!',
        interests: ['tech', 'movies', 'music', 'coding'],
        gender: 'male',
        country: 'United States',
        isPremium: false,
        followersCount: 843,
        followingCount: 412,
        createdAt: new Date()
      },
      {
        id: 'user_yuki',
        username: 'Yuki_K',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        bio: 'Anime enthusiast and casual photographer. Nice to meet you!',
        interests: ['anime', 'photography', 'art', 'gaming'],
        gender: 'female',
        country: 'Japan',
        isPremium: true,
        followersCount: 3105,
        followingCount: 156,
        createdAt: new Date()
      },
      {
        id: 'user_mateo',
        username: 'Mateo_V',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        bio: 'Guitar player and coffee lover. Let’s share some music vibes!',
        interests: ['music', 'coffee', 'guitars', 'sports'],
        gender: 'male',
        country: 'Spain',
        isPremium: false,
        followersCount: 450,
        followingCount: 520,
        createdAt: new Date()
      }
    ];

    mockUsers.forEach(user => {
      this.users.set(user.id, user);
      this.friends.set(user.id, new Set());
      this.followers.set(user.id, new Set());
      this.following.set(user.id, new Set());
    });

    // Make some friendships
    this.addFriendRelation('user_sophia', 'user_alex');
    this.addFriendRelation('user_sophia', 'user_yuki');

    // Seed some initial messages
    this.addMessage('user_sophia', 'user_alex', 'Hey Alex, great chatting with you today!');
    this.addMessage('user_alex', 'user_sophia', 'Same here! We should catch up again soon.');

    // Seed default video bots (disabled - only administrator-added bots will appear)
    this.videoBots = [];
  }

  // User methods
  getUser(id: string): UserProfile | undefined {
    return this.users.get(id);
  }

  createOrUpdateUser(profile: Partial<UserProfile> & { id: string }): UserProfile {
    const existing = this.users.get(profile.id);
    const updated: UserProfile = {
      id: profile.id,
      username: profile.username || existing?.username || `User_${profile.id.substring(0, 6)}`,
      email: profile.email !== undefined ? profile.email : existing?.email,
      avatarUrl: profile.avatarUrl || existing?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: profile.bio !== undefined ? profile.bio : existing?.bio || '',
      interests: profile.interests || existing?.interests || [],
      gender: profile.gender || existing?.gender || 'everyone',
      country: profile.country || existing?.country || 'World',
      isPremium: profile.isPremium !== undefined ? profile.isPremium : existing?.isPremium || false,
      followersCount: profile.followersCount !== undefined ? profile.followersCount : existing?.followersCount || 0,
      followingCount: profile.followingCount !== undefined ? profile.followingCount : existing?.followingCount || 0,
      createdAt: existing?.createdAt || new Date(),
      password: profile.password !== undefined ? profile.password : existing?.password,
      activated: profile.activated !== undefined ? profile.activated : (existing?.activated !== undefined ? existing.activated : true),
      activationToken: profile.activationToken !== undefined ? profile.activationToken : existing?.activationToken,
      resetPasswordToken: profile.resetPasswordToken !== undefined ? profile.resetPasswordToken : existing?.resetPasswordToken,
      resetPasswordExpires: profile.resetPasswordExpires !== undefined ? profile.resetPasswordExpires : existing?.resetPasswordExpires
    };
    this.users.set(profile.id, updated);
    if (!this.friends.has(profile.id)) this.friends.set(profile.id, new Set());
    if (!this.followers.has(profile.id)) this.followers.set(profile.id, new Set());
    if (!this.following.has(profile.id)) this.following.set(profile.id, new Set());
    return updated;
  }

  getUserByEmail(email: string): UserProfile | undefined {
    return Array.from(this.users.values()).find(
      u => u.email && u.email.toLowerCase() === email.toLowerCase()
    );
  }

  getUserByActivationToken(token: string): UserProfile | undefined {
    return Array.from(this.users.values()).find(u => u.activationToken === token);
  }

  getUserByResetToken(token: string): UserProfile | undefined {
    return Array.from(this.users.values()).find(u => u.resetPasswordToken === token);
  }

  getAllUsers(): UserProfile[] {
    return Array.from(this.users.values());
  }

  // Friend methods
  getFriends(userId: string): UserProfile[] {
    const friendIds = this.friends.get(userId) || new Set();
    return Array.from(friendIds)
      .map(id => this.getUser(id))
      .filter((u): u is UserProfile => !!u);
  }

  addFriendRelation(userA: string, userB: string): void {
    if (!this.friends.has(userA)) this.friends.set(userA, new Set());
    if (!this.friends.has(userB)) this.friends.set(userB, new Set());

    this.friends.get(userA)!.add(userB);
    this.friends.get(userB)!.add(userA);
  }

  removeFriendRelation(userA: string, userB: string): void {
    this.friends.get(userA)?.delete(userB);
    this.friends.get(userB)?.delete(userA);
  }

  isFriend(userA: string, userB: string): boolean {
    return this.friends.get(userA)?.has(userB) || false;
  }

  // Followers / Following
  followUser(followerId: string, followingId: string): void {
    if (!this.followers.has(followingId)) this.followers.set(followingId, new Set());
    if (!this.following.has(followerId)) this.following.set(followerId, new Set());

    this.followers.get(followingId)!.add(followerId);
    this.following.get(followerId)!.add(followingId);

    // Update counts
    const follower = this.getUser(followerId);
    const following = this.getUser(followingId);
    if (follower) follower.followingCount = this.following.get(followerId)!.size;
    if (following) following.followersCount = this.followers.get(followingId)!.size;
  }

  unfollowUser(followerId: string, followingId: string): void {
    this.followers.get(followingId)?.delete(followerId);
    this.following.get(followerId)?.delete(followingId);

    const follower = this.getUser(followerId);
    const following = this.getUser(followingId);
    if (follower) follower.followingCount = this.following.get(followerId)?.size || 0;
    if (following) following.followersCount = this.followers.get(followingId)?.size || 0;
  }

  getFollowers(userId: string): UserProfile[] {
    const list = this.followers.get(userId) || new Set();
    return Array.from(list).map(id => this.getUser(id)).filter((u): u is UserProfile => !!u);
  }

  getFollowing(userId: string): UserProfile[] {
    const list = this.following.get(userId) || new Set();
    return Array.from(list).map(id => this.getUser(id)).filter((u): u is UserProfile => !!u);
  }

  // Messaging methods
  getMessagesBetween(userA: string, userB: string): DirectMessage[] {
    return this.messages.filter(
      m => (m.senderId === userA && m.receiverId === userB) || 
           (m.senderId === userB && m.receiverId === userA)
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  addMessage(senderId: string, receiverId: string, content: string): DirectMessage {
    const msg: DirectMessage = {
      id: `msg_${Math.random().toString(36).substring(2, 11)}`,
      senderId,
      receiverId,
      content,
      timestamp: new Date(),
      read: false
    };
    this.messages.push(msg);
    this.emit('messageCreated', msg);
    return msg;
  }

  // Match History
  addMatchHistory(userA: string, userB: string, durationSeconds: number): MatchHistory {
    const match: MatchHistory = {
      id: `match_${Math.random().toString(36).substring(2, 11)}`,
      userA,
      userB,
      durationSeconds,
      timestamp: new Date()
    };
    this.matches.push(match);
    return match;
  }

  getMatchHistory(userId: string): MatchHistory[] {
    return this.matches.filter(m => m.userA === userId || m.userB === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Block/Report
  blockUser(blockerId: string, blockedId: string): void {
    if (!this.blocked.has(blockerId)) {
      this.blocked.set(blockerId, new Set());
    }
    this.blocked.get(blockerId)!.add(blockedId);
    this.removeFriendRelation(blockerId, blockedId);
  }

  isBlocked(userA: string, userB: string): boolean {
    return (this.blocked.get(userA)?.has(userB) || this.blocked.get(userB)?.has(userA)) || false;
  }

  reportUser(reporterId: string, reportedId: string, reason: string): void {
    this.reports.push({
      id: `rep_${Math.random().toString(36).substring(2, 11)}`,
      reporterId,
      reportedId,
      reason,
      timestamp: new Date()
    });
    this.blockUser(reporterId, reportedId);
  }

  // Video Bots Methods
  getVideoBots(): VideoBot[] {
    return this.videoBots;
  }

  addVideoBot(bot: VideoBot): void {
    this.videoBots.push(bot);
    this.saveBotsToFile();
  }

  deleteVideoBot(id: string): boolean {
    const initialLen = this.videoBots.length;
    this.videoBots = this.videoBots.filter(b => b.id !== id);
    const deleted = this.videoBots.length < initialLen;
    if (deleted) {
      this.saveBotsToFile();
    }
    return deleted;
  }
}

export const db = new DatabaseService();
