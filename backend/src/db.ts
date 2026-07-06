import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

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
  private pool: Pool | null = null;
  private users = new Map<string, UserProfile>();
  private friends = new Map<string, Set<string>>();
  private followers = new Map<string, Set<string>>();
  private following = new Map<string, Set<string>>();
  private messages: DirectMessage[] = [];
  private matches: MatchHistory[] = [];
  private blocked = new Map<string, Set<string>>();
  private currentOnlineCount = 12450;
  private reports: { id: string; reporterId: string; reportedId: string; reason: string; timestamp: Date; screenshotUrl?: string }[] = [];
  private videoBots: VideoBot[] = [];
  private deletedUsers = new Map<string, { id: string; username: string; email?: string; deletedAt: string }>();

  constructor() {
    super();
    this.seedInitialData();
    this.loadBotsFromFile();
    this.startOnlineCountFluctuation();
    this.setupPostgres();
  }

  private async setupPostgres() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('[Database] DATABASE_URL not set. Running in-memory mode.');
      return;
    }

    try {
      console.log('[Database] Connecting to PostgreSQL...');
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });

      // Test connection
      await this.pool.query('SELECT NOW()');
      console.log('[Database] Connected to PostgreSQL successfully!');

      // Bootstrap tables
      await this.bootstrapTables();
    } catch (err) {
      console.error('[Database] Failed to connect to PostgreSQL. Falling back to in-memory mode.', err);
      this.pool = null;
    }
  }

  private async bootstrapTables() {
    if (!this.pool) return;

    console.log('[Database] Bootstrapping database tables...');
    try {
      // 1. Users table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          avatar_url TEXT NOT NULL,
          bio TEXT DEFAULT '',
          interests TEXT[] DEFAULT '{}',
          gender VARCHAR(50) DEFAULT 'everyone',
          country VARCHAR(255) DEFAULT 'World',
          is_premium BOOLEAN DEFAULT FALSE,
          followers_count INT DEFAULT 0,
          following_count INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          password VARCHAR(255),
          activated BOOLEAN DEFAULT TRUE,
          activation_token VARCHAR(255),
          reset_password_token VARCHAR(255),
          reset_password_expires TIMESTAMP WITH TIME ZONE
        );
      `);

      // 2. Messages table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(255) PRIMARY KEY,
          sender_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          read BOOLEAN DEFAULT FALSE
        );
      `);

      // 3. Friends table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS friends (
          user_a VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_b VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (user_a, user_b)
        );
      `);

      // 4. Follows table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS follows (
          follower_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          following_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (follower_id, following_id)
        );
      `);

      // 5. Blocks table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS blocks (
          blocker_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          blocked_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (blocker_id, blocked_id)
        );
      `);

      // 6. Reports table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id VARCHAR(255) PRIMARY KEY,
          reporter_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reported_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          screenshot_url TEXT
        );
      `);
      await this.pool.query(`
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
      `);

      // 7. Match History table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS match_history (
          id VARCHAR(255) PRIMARY KEY,
          user_a VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_b VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          duration_seconds INT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 8. Deleted Users table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS deleted_users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('[Database] Database tables bootstrapped successfully.');
    } catch (err) {
      console.error('[Database] Error bootstrapping database tables:', err);
      throw err;
    }
  }

  private mapUserRow(row: any): UserProfile {
    return {
      id: row.id,
      username: row.username,
      email: row.email || undefined,
      avatarUrl: row.avatar_url,
      bio: row.bio || '',
      interests: row.interests || [],
      gender: row.gender || 'everyone',
      country: row.country || 'World',
      isPremium: row.is_premium || false,
      followersCount: row.followers_count || 0,
      followingCount: row.following_count || 0,
      createdAt: new Date(row.created_at),
      password: row.password || undefined,
      activated: row.activated,
      activationToken: row.activation_token || undefined,
      resetPasswordToken: row.reset_password_token || undefined,
      resetPasswordExpires: row.reset_password_expires ? new Date(row.reset_password_expires) : undefined
    };
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
      this.currentOnlineCount = Math.max(9000, Math.min(16000, this.currentOnlineCount + change));
      this.emit('online_count_change', this.currentOnlineCount);
      const nextInterval = Math.floor(Math.random() * 15000) + 10000;
      setTimeout(update, nextInterval);
    };
    const nextInterval = Math.floor(Math.random() * 15000) + 10000;
    setTimeout(update, nextInterval);
  }

  private seedInitialData() {
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

    this.addFriendRelation('user_sophia', 'user_alex');
    this.addFriendRelation('user_sophia', 'user_yuki');
    this.messages.push({
      id: 'msg_initial_1',
      senderId: 'user_sophia',
      receiverId: 'user_alex',
      content: 'Hey Alex, great chatting with you today!',
      timestamp: new Date(),
      read: false
    });
    this.messages.push({
      id: 'msg_initial_2',
      senderId: 'user_alex',
      receiverId: 'user_sophia',
      content: 'Same here! We should catch up again soon.',
      timestamp: new Date(),
      read: false
    });

    this.videoBots = [];
  }

  // Account Deletion methods
  async deleteUser(userId: string): Promise<boolean> {
    if (this.pool) {
      // 1. Fetch user to store snapshot in audit table
      const userRes = await this.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (!user) return false;

      // 2. Insert snapshot into deleted_users audit log
      await this.pool.query(
        'INSERT INTO deleted_users (id, username, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [user.id, user.username, user.email]
      );

      // 3. Delete from users table (triggering cascading deletes)
      await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
      return true;
    }

    // In-memory fallback
    const user = this.users.get(userId);
    if (!user) return false;

    this.deletedUsers.set(userId, {
      id: user.id,
      username: user.username,
      email: user.email,
      deletedAt: new Date().toISOString()
    });

    this.users.delete(userId);
    return true;
  }

  async getDeletedUsers(): Promise<Array<{ id: string; username: string; email?: string; deletedAt: string }>> {
    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM deleted_users ORDER BY deleted_at DESC');
      return res.rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email || undefined,
        deletedAt: row.deleted_at.toISOString()
      }));
    }
    return Array.from(this.deletedUsers.values());
  }

  // User methods
  async getUser(id: string): Promise<UserProfile | undefined> {
    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] ? this.mapUserRow(res.rows[0]) : undefined;
    }
    return this.users.get(id);
  }

  async createOrUpdateUser(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile> {
    if (this.pool) {
      const existing = await this.getUser(profile.id);
      const username = profile.username || existing?.username || `User_${profile.id.substring(0, 6)}`;
      const email = profile.email !== undefined ? profile.email : existing?.email;
      const avatarUrl = profile.avatarUrl || existing?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
      const bio = profile.bio !== undefined ? profile.bio : existing?.bio || '';
      const interests = profile.interests || existing?.interests || [];
      const gender = profile.gender || existing?.gender || 'everyone';
      const country = profile.country || existing?.country || 'World';
      const isPremium = profile.isPremium !== undefined ? profile.isPremium : existing?.isPremium || false;
      const followersCount = profile.followersCount !== undefined ? profile.followersCount : existing?.followersCount || 0;
      const followingCount = profile.followingCount !== undefined ? profile.followingCount : existing?.followingCount || 0;
      const createdAt = existing?.createdAt || new Date();
      const password = profile.password !== undefined ? profile.password : existing?.password;
      const activated = profile.activated !== undefined ? profile.activated : (existing?.activated !== undefined ? existing.activated : true);
      const activationToken = profile.activationToken !== undefined ? profile.activationToken : existing?.activationToken;
      const resetPasswordToken = profile.resetPasswordToken !== undefined ? profile.resetPasswordToken : existing?.resetPasswordToken;
      const resetPasswordExpires = profile.resetPasswordExpires !== undefined ? profile.resetPasswordExpires : existing?.resetPasswordExpires;

      await this.pool.query(`
        INSERT INTO users (
          id, username, email, avatar_url, bio, interests, gender, country, is_premium, 
          followers_count, following_count, created_at, password, activated, 
          activation_token, reset_password_token, reset_password_expires
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          avatar_url = EXCLUDED.avatar_url,
          bio = EXCLUDED.bio,
          interests = EXCLUDED.interests,
          gender = EXCLUDED.gender,
          country = EXCLUDED.country,
          is_premium = EXCLUDED.is_premium,
          followers_count = EXCLUDED.followers_count,
          following_count = EXCLUDED.following_count,
          password = EXCLUDED.password,
          activated = EXCLUDED.activated,
          activation_token = EXCLUDED.activation_token,
          reset_password_token = EXCLUDED.reset_password_token,
          reset_password_expires = EXCLUDED.reset_password_expires;
      `, [
        profile.id, username, email, avatarUrl, bio, interests, gender, country, isPremium,
        followersCount, followingCount, createdAt, password, activated,
        activationToken, resetPasswordToken, resetPasswordExpires
      ]);

      return {
        id: profile.id, username, email, avatarUrl, bio, interests, gender, country, isPremium,
        followersCount, followingCount, createdAt, password, activated,
        activationToken, resetPasswordToken, resetPasswordExpires
      };
    }

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

  async getUserByEmail(email: string): Promise<UserProfile | undefined> {
    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      return res.rows[0] ? this.mapUserRow(res.rows[0]) : undefined;
    }
    return Array.from(this.users.values()).find(
      u => u.email && u.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUserByActivationToken(token: string): Promise<UserProfile | undefined> {
    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE activation_token = $1', [token]);
      return res.rows[0] ? this.mapUserRow(res.rows[0]) : undefined;
    }
    return Array.from(this.users.values()).find(u => u.activationToken === token);
  }

  async getUserByResetToken(token: string): Promise<UserProfile | undefined> {
    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE reset_password_token = $1', [token]);
      return res.rows[0] ? this.mapUserRow(res.rows[0]) : undefined;
    }
    return Array.from(this.users.values()).find(u => u.resetPasswordToken === token);
  }

  async getAllUsers(): Promise<UserProfile[]> {
    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
      return res.rows.map(row => this.mapUserRow(row));
    }
    return Array.from(this.users.values());
  }

  // Friend methods
  async getFriends(userId: string): Promise<UserProfile[]> {
    if (this.pool) {
      const res = await this.pool.query(`
        SELECT u.* FROM users u
        INNER JOIN friends f ON (f.user_a = u.id AND f.user_b = $1) OR (f.user_b = u.id AND f.user_a = $1)
      `, [userId]);
      return res.rows.map(row => this.mapUserRow(row));
    }
    const friendIds = this.friends.get(userId) || new Set();
    return Array.from(friendIds)
      .map(id => this.users.get(id))
      .filter((u): u is UserProfile => !!u);
  }

  async addFriendRelation(userA: string, userB: string): Promise<void> {
    if (this.pool) {
      await this.pool.query(`
        INSERT INTO friends (user_a, user_b)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [userA, userB]);
      return;
    }
    if (!this.friends.has(userA)) this.friends.set(userA, new Set());
    if (!this.friends.has(userB)) this.friends.set(userB, new Set());
    this.friends.get(userA)!.add(userB);
    this.friends.get(userB)!.add(userA);
  }

  async removeFriendRelation(userA: string, userB: string): Promise<void> {
    if (this.pool) {
      await this.pool.query(`
        DELETE FROM friends
        WHERE (user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1)
      `, [userA, userB]);
      return;
    }
    this.friends.get(userA)?.delete(userB);
    this.friends.get(userB)?.delete(userA);
  }

  async isFriend(userA: string, userB: string): Promise<boolean> {
    if (this.pool) {
      const res = await this.pool.query(`
        SELECT 1 FROM friends
        WHERE (user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1)
      `, [userA, userB]);
      return res.rows.length > 0;
    }
    return this.friends.get(userA)?.has(userB) || false;
  }

  // Followers / Following
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (this.pool) {
      await this.pool.query(`
        INSERT INTO follows (follower_id, following_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [followerId, followingId]);
      await this.pool.query(`
        UPDATE users SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = $1) WHERE id = $1;
      `, [followerId]);
      await this.pool.query(`
        UPDATE users SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = $1) WHERE id = $1;
      `, [followingId]);
      return;
    }
    if (!this.followers.has(followingId)) this.followers.set(followingId, new Set());
    if (!this.following.has(followerId)) this.following.set(followerId, new Set());
    this.followers.get(followingId)!.add(followerId);
    this.following.get(followerId)!.add(followingId);
    const follower = this.users.get(followerId);
    const following = this.users.get(followingId);
    if (follower) follower.followingCount = this.following.get(followerId)!.size;
    if (following) following.followersCount = this.followers.get(followingId)!.size;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    if (this.pool) {
      await this.pool.query(`
        DELETE FROM follows
        WHERE follower_id = $1 AND following_id = $2
      `, [followerId, followingId]);
      await this.pool.query(`
        UPDATE users SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = $1) WHERE id = $1;
      `, [followerId]);
      await this.pool.query(`
        UPDATE users SET followers_count = (SELECT COUNT(*) FROM follows WHERE following_id = $1) WHERE id = $1;
      `, [followingId]);
      return;
    }
    this.followers.get(followingId)?.delete(followerId);
    this.following.get(followerId)?.delete(followingId);
    const follower = this.users.get(followerId);
    const following = this.users.get(followingId);
    if (follower) follower.followingCount = this.following.get(followerId)?.size || 0;
    if (following) following.followersCount = this.followers.get(followingId)?.size || 0;
  }

  async getFollowers(userId: string): Promise<UserProfile[]> {
    if (this.pool) {
      const res = await this.pool.query(`
        SELECT u.* FROM users u
        INNER JOIN follows f ON f.follower_id = u.id
        WHERE f.following_id = $1
      `, [userId]);
      return res.rows.map(row => this.mapUserRow(row));
    }
    const list = this.followers.get(userId) || new Set();
    return Array.from(list).map(id => this.users.get(id)).filter((u): u is UserProfile => !!u);
  }

  async getFollowing(userId: string): Promise<UserProfile[]> {
    if (this.pool) {
      const res = await this.pool.query(`
        SELECT u.* FROM users u
        INNER JOIN follows f ON f.following_id = u.id
        WHERE f.follower_id = $1
      `, [userId]);
      return res.rows.map(row => this.mapUserRow(row));
    }
    const list = this.following.get(userId) || new Set();
    return Array.from(list).map(id => this.users.get(id)).filter((u): u is UserProfile => !!u);
  }

  // Messaging methods
  async getMessagesBetween(userA: string, userB: string): Promise<DirectMessage[]> {
    if (this.pool) {
      const res = await this.pool.query(`
        SELECT * FROM messages
        WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
        ORDER BY timestamp ASC
      `, [userA, userB]);
      return res.rows.map(row => ({
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        content: row.content,
        timestamp: new Date(row.timestamp),
        read: row.read
      }));
    }
    return this.messages.filter(
      m => (m.senderId === userA && m.receiverId === userB) || 
           (m.senderId === userB && m.receiverId === userA)
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async addMessage(senderId: string, receiverId: string, content: string): Promise<DirectMessage> {
    const msgId = `msg_${Math.random().toString(36).substring(2, 11)}`;
    const timestamp = new Date();
    if (this.pool) {
      await this.pool.query(`
        INSERT INTO messages (id, sender_id, receiver_id, content, timestamp, read)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [msgId, senderId, receiverId, content, timestamp, false]);
      const msg = { id: msgId, senderId, receiverId, content, timestamp, read: false };
      this.emit('messageCreated', msg);
      return msg;
    }

    const msg: DirectMessage = {
      id: msgId,
      senderId,
      receiverId,
      content,
      timestamp,
      read: false
    };
    this.messages.push(msg);
    this.emit('messageCreated', msg);
    return msg;
  }

  // Match History
  async addMatchHistory(userA: string, userB: string, durationSeconds: number): Promise<MatchHistory> {
    const matchId = `match_${Math.random().toString(36).substring(2, 11)}`;
    const timestamp = new Date();
    if (this.pool) {
      await this.pool.query(`
        INSERT INTO match_history (id, user_a, user_b, duration_seconds, timestamp)
        VALUES ($1, $2, $3, $4, $5)
      `, [matchId, userA, userB, durationSeconds, timestamp]);
      return { id: matchId, userA, userB, durationSeconds, timestamp };
    }

    const match: MatchHistory = {
      id: matchId,
      userA,
      userB,
      durationSeconds,
      timestamp
    };
    this.matches.push(match);
    return match;
  }

  async getMatchHistory(userId: string): Promise<MatchHistory[]> {
    if (this.pool) {
      const res = await this.pool.query(`
        SELECT * FROM match_history
        WHERE user_a = $1 OR user_b = $1
        ORDER BY timestamp DESC
      `, [userId]);
      return res.rows.map(row => ({
        id: row.id,
        userA: row.user_a,
        userB: row.user_b,
        durationSeconds: row.duration_seconds,
        timestamp: new Date(row.timestamp)
      }));
    }
    return this.matches.filter(m => m.userA === userId || m.userB === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Block/Report
  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (this.pool) {
      await this.pool.query(`
        INSERT INTO blocks (blocker_id, blocked_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [blockerId, blockedId]);
      await this.removeFriendRelation(blockerId, blockedId);
      return;
    }
    if (!this.blocked.has(blockerId)) {
      this.blocked.set(blockerId, new Set());
    }
    this.blocked.get(blockerId)!.add(blockedId);
    this.removeFriendRelation(blockerId, blockedId);
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    if (this.pool) {
      const res = await this.pool.query(`
        SELECT 1 FROM blocks
        WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
      `, [userA, userB]);
      return res.rows.length > 0;
    }
    return (this.blocked.get(userA)?.has(userB) || this.blocked.get(userB)?.has(userA)) || false;
  }

  async reportUser(reporterId: string, reportedId: string, reason: string, screenshot?: string): Promise<void> {
    const reportId = `rep_${Math.random().toString(36).substring(2, 11)}`;
    const timestamp = new Date();
    let screenshotUrl: string | undefined = undefined;

    if (screenshot) {
      try {
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const uploadDir = path.join(__dirname, '../uploads/reports');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, `${reportId}.jpg`);
        fs.writeFileSync(filePath, buffer);
        screenshotUrl = `/uploads/reports/${reportId}.jpg`;
      } catch (err) {
        console.error('Failed to save report screenshot:', err);
      }
    }

    if (this.pool) {
      await this.pool.query(`
        INSERT INTO reports (id, reporter_id, reported_id, reason, timestamp, screenshot_url)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [reportId, reporterId, reportedId, reason, timestamp, screenshotUrl]);
      await this.blockUser(reporterId, reportedId);
      return;
    }

    this.reports.push({
      id: reportId,
      reporterId,
      reportedId,
      reason,
      timestamp,
      screenshotUrl
    });
    this.blockUser(reporterId, reportedId);
  }

  async getReports(): Promise<Array<{ id: string; reporterId: string; reportedId: string; reason: string; timestamp: Date; screenshotUrl?: string }>> {
    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM reports ORDER BY timestamp DESC');
      return res.rows.map(row => ({
        id: row.id,
        reporterId: row.reporter_id,
        reportedId: row.reported_id,
        reason: row.reason,
        timestamp: new Date(row.timestamp),
        screenshotUrl: row.screenshot_url || undefined
      }));
    }
    return this.reports;
  }

  async resolveReport(reportId: string): Promise<boolean> {
    if (this.pool) {
      // Fetch report first to clean up its file snapshot if it exists
      const reportRes = await this.pool.query('SELECT screenshot_url FROM reports WHERE id = $1', [reportId]);
      const report = reportRes.rows[0];
      if (report && report.screenshot_url) {
        try {
          const filePath = path.join(__dirname, '..', report.screenshot_url);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error('Failed to delete report screenshot file:', e);
        }
      }

      const res = await this.pool.query('DELETE FROM reports WHERE id = $1', [reportId]);
      return (res.rowCount ?? 0) > 0;
    }

    const index = this.reports.findIndex(r => r.id === reportId);
    if (index !== -1) {
      const report = this.reports[index];
      if (report.screenshotUrl) {
        try {
          const filePath = path.join(__dirname, '..', report.screenshotUrl);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
      }
      this.reports.splice(index, 1);
      return true;
    }
    return false;
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
