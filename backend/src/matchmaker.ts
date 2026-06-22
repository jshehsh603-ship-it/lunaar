import { Socket } from 'socket.io';
import { db, UserProfile } from './db';

export interface MatchFilters {
  gender: 'male' | 'female' | 'everyone';
  country: string;
  interests: string[];
  isPremium: boolean;
}

export interface QueueUser {
  socket: Socket;
  userId: string;
  filters: MatchFilters;
  joinedAt: Date;
}

class Matchmaker {
  // Map of userId -> QueueUser
  private queue = new Map<string, QueueUser>();
  // Map of socketId -> partnerSocketId
  private activeMatches = new Map<string, string>();
  // Map of socketId -> matchStartTime
  private matchStartTimes = new Map<string, Date>();

  addToQueue(socket: Socket, userId: string, filters: MatchFilters) {
    // Prevent duplicate entries
    this.removeFromQueue(userId);

    // If they were already in a match, disconnect them first
    this.endActiveMatch(socket.id);

    const userEntry: QueueUser = {
      socket,
      userId,
      filters,
      joinedAt: new Date()
    };

    this.queue.set(userId, userEntry);
    console.log(`User ${userId} joined matchmaking queue. Active queue size: ${this.queue.size}`);

    // Trigger match loop immediately for this user
    this.tryMatch(userEntry);
  }

  removeFromQueue(userId: string) {
    if (this.queue.has(userId)) {
      this.queue.delete(userId);
      console.log(`User ${userId} left matchmaking queue. Active queue size: ${this.queue.size}`);
    }
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  getActiveMatchCount(): number {
    return this.activeMatches.size / 2;
  }

  getPartnerSocketId(socketId: string): string | undefined {
    return this.activeMatches.get(socketId);
  }

  private tryMatch(newUser: QueueUser) {
    let matchedCandidate: QueueUser | null = null;
    let highestScore = -1;

    const newInterests = newUser.filters.interests || [];

    // 1. Try to find candidates with at least one matching interest first (case-insensitive)
    if (newInterests.length > 0) {
      for (const [candidateId, candidate] of this.queue.entries()) {
        if (candidateId === newUser.userId) continue;

        const candidateInterests = candidate.filters.interests || [];
        const hasCommonInterests = newInterests.some(tag =>
          candidateInterests.some(cTag => cTag.toLowerCase() === tag.toLowerCase())
        );

        if (hasCommonInterests) {
          const score = this.getMatchScore(newUser, candidate);
          if (score !== null && score > highestScore) {
            highestScore = score;
            matchedCandidate = candidate;
          }
        }
      }
    }

    // 2. If no candidate with overlapping interests was found (or newUser has no interests),
    //    fall back to matching with anyone else in the queue.
    if (!matchedCandidate) {
      highestScore = -1;
      for (const [candidateId, candidate] of this.queue.entries()) {
        if (candidateId === newUser.userId) continue;

        const score = this.getMatchScore(newUser, candidate);
        if (score !== null && score > highestScore) {
          highestScore = score;
          matchedCandidate = candidate;
        }
      }
    }

    if (matchedCandidate) {
      // Remove both from queue
      this.queue.delete(newUser.userId);
      this.queue.delete(matchedCandidate.userId);

      // Establish match in mapping
      this.activeMatches.set(newUser.socket.id, matchedCandidate.socket.id);
      this.activeMatches.set(matchedCandidate.socket.id, newUser.socket.id);

      const startTime = new Date();
      this.matchStartTimes.set(newUser.socket.id, startTime);
      this.matchStartTimes.set(matchedCandidate.socket.id, startTime);

      // Fetch profile info
      const profileA = db.getUser(newUser.userId) || db.createOrUpdateUser({ id: newUser.userId });
      const profileB = db.getUser(matchedCandidate.userId) || db.createOrUpdateUser({ id: matchedCandidate.userId });

      // Notify both sockets
      newUser.socket.emit('match_found', {
        partnerId: matchedCandidate.userId,
        partnerProfile: profileB,
        initiator: true
      });

      matchedCandidate.socket.emit('match_found', {
        partnerId: newUser.userId,
        partnerProfile: profileA,
        initiator: false
      });

      console.log(`Match established between ${newUser.userId} and ${matchedCandidate.userId} with score ${highestScore}`);
    }
  }

  private getMatchScore(userA: QueueUser, userB: QueueUser): number | null {
    const profileA = db.getUser(userA.userId);
    const profileB = db.getUser(userB.userId);

    if (!profileA || !profileB) return 0; // Default score if profiles are missing

    // Strict Constraint 1: Block List
    if (db.isBlocked(profileA.id, profileB.id)) {
      return null;
    }

    // Strict Constraint 2: Gender Compatibility
    if (userA.filters.gender !== 'everyone' && profileB.gender !== userA.filters.gender) {
      return null;
    }
    if (userB.filters.gender !== 'everyone' && profileA.gender !== userB.filters.gender) {
      return null;
    }

    // Calculate Match Score
    let score = 0;

    // Country Filter Matching (Soft matching)
    // User A Filter Target Check
    if (userA.filters.country && userA.filters.country !== 'World') {
      if (profileB.country.toLowerCase() === userA.filters.country.toLowerCase()) {
        score += 15; // perfect country match
      }
    } else {
      score += 5; // prefers anyone who selects all countries
    }

    // User B Filter Target Check
    if (userB.filters.country && userB.filters.country !== 'World') {
      if (profileA.country.toLowerCase() === userB.filters.country.toLowerCase()) {
        score += 15;
      }
    } else {
      score += 5;
    }

    // Interest overlaps (Soft matching, case-insensitive)
    if (userA.filters.interests.length > 0 && userB.filters.interests.length > 0) {
      const common = userA.filters.interests.filter(tag =>
        userB.filters.interests.some(bTag => bTag.toLowerCase() === tag.toLowerCase())
      );
      score += common.length * 3; // +3 points for each overlapping interest
    }

    // Premium prioritization
    if (userA.filters.isPremium) score += 1;
    if (userB.filters.isPremium) score += 1;

    return score;
  }

  establishDirectMatch(socketA: Socket, userIdA: string, socketB: Socket, userIdB: string) {
    // End any active matches first
    this.endActiveMatch(socketA.id);
    this.endActiveMatch(socketB.id);

    // Remove from queue
    this.removeFromQueue(userIdA);
    this.removeFromQueue(userIdB);

    // Map them together
    this.activeMatches.set(socketA.id, socketB.id);
    this.activeMatches.set(socketB.id, socketA.id);

    const startTime = new Date();
    this.matchStartTimes.set(socketA.id, startTime);
    this.matchStartTimes.set(socketB.id, startTime);

    const profileA = db.getUser(userIdA) || db.createOrUpdateUser({ id: userIdA });
    const profileB = db.getUser(userIdB) || db.createOrUpdateUser({ id: userIdB });

    // Notify A
    socketA.emit('match_found', {
      partnerId: userIdB,
      partnerProfile: profileB,
      initiator: true
    });

    // Notify B
    socketB.emit('match_found', {
      partnerId: userIdA,
      partnerProfile: profileA,
      initiator: false
    });

    console.log(`Direct Match established via Private Room between ${userIdA} and ${userIdB}`);
  }

  endActiveMatch(socketId: string): { partnerSocketId: string; durationSeconds: number } | null {
    const partnerSocketId = this.activeMatches.get(socketId);
    if (!partnerSocketId) return null;

    // Remove matching pairs
    this.activeMatches.delete(socketId);
    this.activeMatches.delete(partnerSocketId);

    const startTime = this.matchStartTimes.get(socketId) || new Date();
    const durationSeconds = Math.round((new Date().getTime() - startTime.getTime()) / 1000);

    this.matchStartTimes.delete(socketId);
    this.matchStartTimes.delete(partnerSocketId);

    console.log(`Match ended between socket ${socketId} and ${partnerSocketId}. Duration: ${durationSeconds}s`);
    return { partnerSocketId, durationSeconds };
  }

  getQueueDetails() {
    return Array.from(this.queue.values()).map(entry => ({
      userId: entry.userId,
      joinedAt: entry.joinedAt,
      filters: entry.filters
    }));
  }

  getActiveMatchesDetails() {
    const list: { socketId: string; partnerSocketId: string; startTime: Date }[] = [];
    const seen = new Set<string>();
    
    for (const [socketId, partnerSocketId] of this.activeMatches.entries()) {
      if (seen.has(socketId) || seen.has(partnerSocketId)) continue;
      seen.add(socketId);
      seen.add(partnerSocketId);
      
      list.push({
        socketId,
        partnerSocketId,
        startTime: this.matchStartTimes.get(socketId) || new Date()
      });
    }
    
    return list;
  }
}

export const matchmaker = new Matchmaker();
