import { Server, Socket } from 'socket.io';
import { db, UserProfile } from './db';
import { matchmaker, MatchFilters } from './matchmaker';

// Track connection socket ID -> userId
export const socketUserMap = new Map<string, string>();
// Track user ID -> socket ID (to check if a user is online)
export const userSocketMap = new Map<string, string>();

// Track private rooms for direct call invites
const privateRooms = new Map<string, string[]>(); // roomId -> userId[]
const socketPrivateRoomMap = new Map<string, string>(); // socketId -> roomId

export function setupSocketHandlers(io: Server) {
  // Listen for database online count fluctuation and broadcast it in real-time
  db.on('online_count_change', (count) => {
    io.emit('online_count', {
      onlineCount: count,
      activeMatches: matchmaker.getActiveMatchCount(),
      queueCount: matchmaker.getQueueSize()
    });
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register User Profile or authenticate
    socket.on('register_user', async (data: { userId: string; profile: Partial<UserProfile> }) => {
      const { userId, profile } = data;
      socketUserMap.set(socket.id, userId);
      userSocketMap.set(userId, socket.id);

      // Create/Update profile in database
      const userProfile = await db.createOrUpdateUser({
        ...profile,
        id: userId
      });

      socket.emit('registration_success', userProfile);
      io.emit('online_count', {
        onlineCount: db.getOnlineCount(),
        activeMatches: matchmaker.getActiveMatchCount(),
        queueCount: matchmaker.getQueueSize()
      });

      console.log(`User ${userId} (${userProfile.username}) registered on socket ${socket.id}`);
    });

    // Start matching
    socket.on('start_matching', (data: { filters: MatchFilters }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'User not registered.' });
        return;
      }

      console.log(`User ${userId} requested matching with filters:`, data.filters);
      matchmaker.addToQueue(socket, userId, data.filters);
      
      // Update global online counts
      io.emit('online_count', {
        onlineCount: db.getOnlineCount(),
        activeMatches: matchmaker.getActiveMatchCount(),
        queueCount: matchmaker.getQueueSize()
      });
    });

    // Join Private Room (for direct call invites)
    socket.on('join_private_room', async (data: { roomId: string }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      console.log(`User ${userId} requested to join private room ${data.roomId}`);
      
      // End active public match or queue if active
      matchmaker.removeFromQueue(userId);
      matchmaker.endActiveMatch(socket.id);

      socket.join(data.roomId);
      socketPrivateRoomMap.set(socket.id, data.roomId);

      let roomUsers = privateRooms.get(data.roomId) || [];
      // Clean up offline/invalid users in this room list first
      roomUsers = roomUsers.filter(uid => {
        const sid = userSocketMap.get(uid);
        return sid && socketPrivateRoomMap.get(sid) === data.roomId;
      });

      if (!roomUsers.includes(userId)) {
        roomUsers.push(userId);
      }
      privateRooms.set(data.roomId, roomUsers);

      console.log(`Private Room ${data.roomId} state: [${roomUsers.join(', ')}]`);

      // If we have two users in the room, pair them immediately!
      if (roomUsers.length === 2) {
        const userA = roomUsers[0];
        const userB = roomUsers[1];
        const socketIdA = userSocketMap.get(userA);
        const socketIdB = userSocketMap.get(userB);

        if (socketIdA && socketIdB) {
          const socketA = io.sockets.sockets.get(socketIdA);
          const socketB = io.sockets.sockets.get(socketIdB);

          if (socketA && socketB) {
            await matchmaker.establishDirectMatch(socketA, userA, socketB, userB);
            // Clear room once matched
            privateRooms.delete(data.roomId);
          }
        }
      }
    });

    // Stop matching
    socket.on('stop_matching', async () => {
      const userId = socketUserMap.get(socket.id);
      if (userId) {
        matchmaker.removeFromQueue(userId);

        // Also end any active match the user is in and notify partner!
        const endResult = matchmaker.endActiveMatch(socket.id);
        if (endResult) {
          const { partnerSocketId, durationSeconds } = endResult;
          const partnerUserId = socketUserMap.get(partnerSocketId);
          if (partnerUserId) {
            await db.addMatchHistory(userId, partnerUserId, durationSeconds);
          }
          io.to(partnerSocketId).emit('partner_skipped');
        }

        // Clean up from private room maps if they were in one
        const roomId = socketPrivateRoomMap.get(socket.id);
        if (roomId) {
          socketPrivateRoomMap.delete(socket.id);
          let roomUsers = privateRooms.get(roomId) || [];
          roomUsers = roomUsers.filter(uid => uid !== userId);
          if (roomUsers.length > 0) {
            privateRooms.set(roomId, roomUsers);
          } else {
            privateRooms.delete(roomId);
          }
        }
      }
      io.emit('online_count', {
        onlineCount: db.getOnlineCount(),
        activeMatches: matchmaker.getActiveMatchCount(),
        queueCount: matchmaker.getQueueSize()
      });
    });

    // Next match (skip current partner and rejoin queue)
    socket.on('next_match', async (data: { filters: MatchFilters }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      console.log(`User ${userId} requested NEXT match.`);
      
      // End current match
      const endResult = matchmaker.endActiveMatch(socket.id);
      if (endResult) {
        const { partnerSocketId, durationSeconds } = endResult;
        const partnerUserId = socketUserMap.get(partnerSocketId);

        // Record history
        if (partnerUserId) {
          await db.addMatchHistory(userId, partnerUserId, durationSeconds);
        }

        // Notify partner that they were skipped
        io.to(partnerSocketId).emit('partner_skipped');
      }

      // Add back to matchmaking queue
      matchmaker.addToQueue(socket, userId, data.filters);

      io.emit('online_count', {
        onlineCount: db.getOnlineCount(),
        activeMatches: matchmaker.getActiveMatchCount(),
        queueCount: matchmaker.getQueueSize()
      });
    });

    // WebRTC Signaling: Offer
    socket.on('webrtc_offer', (data: { sdp: any }) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('webrtc_offer', { sdp: data.sdp });
      }
    });

    // WebRTC Signaling: Answer
    socket.on('webrtc_answer', (data: { sdp: any }) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('webrtc_answer', { sdp: data.sdp });
      }
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('webrtc_candidate', (data: { candidate: any }) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('webrtc_candidate', { candidate: data.candidate });
      }
    });

    // Send chat message in match
    socket.on('send_match_message', async (data: { content: string }) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const userId = socketUserMap.get(socket.id);
      if (partnerSocketId && userId) {
        const senderProfile = await db.getUser(userId);
        io.to(partnerSocketId).emit('match_message', {
          id: `match_msg_${Math.random().toString(36).substring(2, 9)}`,
          senderId: userId,
          senderName: senderProfile?.username || 'Stranger',
          content: data.content,
          timestamp: new Date()
        });
      }
    });

    // Typing state
    socket.on('typing_state', (data: { isTyping: boolean }) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('typing_state', { isTyping: data.isTyping });
      }
    });

    // Like Partner
    socket.on('like_partner', () => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const userId = socketUserMap.get(socket.id);
      if (partnerSocketId && userId) {
        io.to(partnerSocketId).emit('partner_liked');
      }
    });

    // Send Gift
    socket.on('send_gift', (data: { giftType: string }) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const userId = socketUserMap.get(socket.id);
      if (partnerSocketId && userId) {
        io.to(partnerSocketId).emit('gift_received', { giftType: data.giftType });
      }
    });

    // Change Face Mask Filter
    socket.on('change_filter', (data: { filterType: string }) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('partner_filter_changed', { filterType: data.filterType });
      }
    });

    // Relay Face Filter Coordinates
    socket.on('filter_coordinates', (data: { coords: { x: number; y: number; w: number; h: number } | null }) => {
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('partner_filter_coordinates', { coords: data.coords });
      }
    });

    // Friend request actions inside chat or profiles
    socket.on('send_friend_request', async (data: { targetUserId: string }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      const targetSocketId = userSocketMap.get(data.targetUserId);
      
      // Automatically add them as friends for the random video experience (convenient UX)
      await db.addFriendRelation(userId, data.targetUserId);

      // Notify sender
      const targetProfile = await db.getUser(data.targetUserId);
      socket.emit('friend_request_status', {
        targetUserId: data.targetUserId,
        status: 'accepted',
        profile: targetProfile
      });

      // Notify receiver if online
      if (targetSocketId) {
        const senderProfile = await db.getUser(userId);
        io.to(targetSocketId).emit('friend_request_status', {
          targetUserId: userId,
          status: 'accepted',
          profile: senderProfile
        });
        io.to(targetSocketId).emit('notification', {
          title: 'New Friend Added!',
          message: `${senderProfile?.username || 'Someone'} added you as a friend.`
        });
      }
    });

    // Social follow actions
    socket.on('follow_user', async (data: { targetUserId: string }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      await db.followUser(userId, data.targetUserId);
      socket.emit('profile_updated', await db.getUser(userId));

      const targetSocketId = userSocketMap.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('profile_updated', await db.getUser(data.targetUserId));
        const senderProfile = await db.getUser(userId);
        io.to(targetSocketId).emit('notification', {
          title: 'New Follower!',
          message: `${senderProfile?.username || 'A stranger'} started following you.`
        });
      }
    });

    // Block User
    socket.on('block_user', async (data: { targetUserId: string }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      await db.blockUser(userId, data.targetUserId);
      socket.emit('user_blocked', { blockedUserId: data.targetUserId });

      // If matching, skip them immediately
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const partnerUserId = partnerSocketId ? socketUserMap.get(partnerSocketId) : null;
      if (partnerUserId === data.targetUserId) {
        const endResult = matchmaker.endActiveMatch(socket.id);
        if (endResult) {
          io.to(endResult.partnerSocketId).emit('partner_skipped');
        }
      }
    });

    // Report User
    socket.on('report_user', async (data: { targetUserId: string; reason: string; screenshot?: string }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      await db.reportUser(userId, data.targetUserId, data.reason, data.screenshot);
      socket.emit('user_reported', { reportedUserId: data.targetUserId });

      // If matching, skip them immediately
      const partnerSocketId = matchmaker.getPartnerSocketId(socket.id);
      const partnerUserId = partnerSocketId ? socketUserMap.get(partnerSocketId) : null;
      if (partnerUserId === data.targetUserId) {
        const endResult = matchmaker.endActiveMatch(socket.id);
        if (endResult) {
          io.to(endResult.partnerSocketId).emit('partner_skipped');
        }
      }
    });

    // Direct message communication (Offline/Friends chat)
    socket.on('send_direct_message', async (data: { receiverId: string; content: string }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      const message = await db.addMessage(userId, data.receiverId, data.content);
      
      // Send message back to sender
      socket.emit('direct_message', message);

      // Send to receiver if online
      const receiverSocketId = userSocketMap.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('direct_message', message);
      }
    });

    // Fetch message history for direct messages
    socket.on('get_direct_messages', async (data: { partnerId: string }) => {
      const userId = socketUserMap.get(socket.id);
      if (!userId) return;

      const messages = await db.getMessagesBetween(userId, data.partnerId);
      socket.emit('direct_messages_history', {
        partnerId: data.partnerId,
        messages
      });
    });

    // Fetch Friends List
    socket.on('get_friends', async () => {
      const userId = socketUserMap.get(socket.id);
      if (userId) {
        const friends = await db.getFriends(userId);
        socket.emit('friends_list', friends.map(friend => {
          const isOnline = userSocketMap.has(friend.id);
          return {
            ...friend,
            isOnline
          };
        }));
      }
    });

    // Fetch Profile
    socket.on('get_profile', async (data: { targetUserId: string }) => {
      const profile = await db.getUser(data.targetUserId);
      if (profile) {
        socket.emit('profile_details', {
          profile,
          isFriend: socketUserMap.get(socket.id) ? await db.isFriend(socketUserMap.get(socket.id)!, data.targetUserId) : false,
          isFollowing: socketUserMap.get(socket.id) ? (await db.getFollowing(socketUserMap.get(socket.id)!)).some(u => u.id === data.targetUserId) : false
        });
      }
    });

    // Handle Socket Disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      const userId = socketUserMap.get(socket.id);
      if (userId) {
        // Remove from matchmaking queue
        matchmaker.removeFromQueue(userId);

        // Clean up private room maps if they were in one
        const roomId = socketPrivateRoomMap.get(socket.id);
        if (roomId) {
          socketPrivateRoomMap.delete(socket.id);
          let roomUsers = privateRooms.get(roomId) || [];
          roomUsers = roomUsers.filter(uid => uid !== userId);
          if (roomUsers.length > 0) {
            privateRooms.set(roomId, roomUsers);
          } else {
            privateRooms.delete(roomId);
          }
        }

        // End active match if in one
        const endResult = matchmaker.endActiveMatch(socket.id);
        if (endResult) {
          const { partnerSocketId, durationSeconds } = endResult;
          const partnerUserId = socketUserMap.get(partnerSocketId);
          if (partnerUserId) {
            await db.addMatchHistory(userId, partnerUserId, durationSeconds);
          }
          // Notify partner
          io.to(partnerSocketId).emit('partner_disconnected');
        }

        // Clean maps
        socketUserMap.delete(socket.id);
        userSocketMap.delete(userId);
      }

      io.emit('online_count', {
        onlineCount: db.getOnlineCount(),
        activeMatches: matchmaker.getActiveMatchCount(),
        queueCount: matchmaker.getQueueSize()
      });
    });
  });
}
