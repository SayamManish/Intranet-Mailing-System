const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const db = require('../database/db');
const { createNotification } = require('../utils/notify');

// Map of userId -> Set(socketId)
const onlineUsers = new Map();

function initSockets(io) {
  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1] || socket.handshake.query?.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare(`SELECT id, name, email, department, designation, profile_image, is_active FROM users WHERE id = ?`).get(decoded.id);
      
      if (!user || !user.is_active) {
        return next(new Error('Authentication error: User inactive or not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 User connected: ${socket.user.name} (ID: ${userId}) on socket ${socket.id}`);

    // Track online user sockets
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal user room for direct notifications
    socket.join(`user_${userId}`);

    // Broadcast current online user IDs to all clients
    const getOnlineUserIds = () => Array.from(onlineUsers.keys());
    io.emit('users_online_status', getOnlineUserIds());

    // Join conversation room
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) {
        // Verify participation
        const participant = db.prepare(`SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ?`).get(conversationId, userId);
        if (participant) {
          socket.join(`conv_${conversationId}`);
        }
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

const sanitizeHtml = require('sanitize-html');

    // Send direct chat message realtime
    socket.on('send_chat_message', ({ conversationId, message }) => {
      if (!conversationId || !message || !message.trim()) return;

      try {
        const convId = parseInt(conversationId, 10);
        const participant = db.prepare(`SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ?`).get(convId, userId);
        if (!participant) return;

        const cleanMessage = sanitizeHtml(message.trim(), { allowedTags: [], allowedAttributes: {} });

        const transaction = db.transaction(() => {
          const res = db.prepare(`
            INSERT INTO chat_messages (conversation_id, sender_id, message, is_read)
            VALUES (?, ?, ?, 0)
          `).run(convId, userId, cleanMessage);

          db.prepare(`UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?`).run(convId);
          return res.lastInsertRowid;
        });

        const msgId = transaction();

        const fullMsg = db.prepare(`
          SELECT 
            m.id, m.conversation_id, m.sender_id, m.message, m.is_read, m.created_at,
            u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar
          FROM chat_messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `).get(msgId);

        // Broadcast to everyone in the conversation room
        io.to(`conv_${convId}`).emit('new_chat_message', fullMsg);

        // Also notify the other participant directly
        const otherParticipant = db.prepare(`
          SELECT user_id FROM chat_participants WHERE conversation_id = ? AND user_id != ?
        `).get(convId, userId);

        if (otherParticipant) {
          io.to(`user_${otherParticipant.user_id}`).emit('chat_message_received', {
            conversationId: convId,
            message: fullMsg
          });

          createNotification({
            userId: otherParticipant.user_id,
            type: 'chat',
            title: `Message from ${socket.user.name}`,
            message: cleanMessage.length > 50 ? cleanMessage.substring(0, 47) + '...' : cleanMessage,
            relatedId: convId
          });
        }
      } catch (err) {
        console.error('Socket send_chat_message error:', err);
      }
    });

    // Typing indicators with participant validation
    socket.on('typing_start', ({ conversationId }) => {
      if (!conversationId) return;
      const convId = parseInt(conversationId, 10);
      const participant = db.prepare(`SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ?`).get(convId, userId);
      if (participant) {
        socket.to(`conv_${convId}`).emit('user_typing', {
          conversationId: convId,
          userId: socket.user.id,
          userName: socket.user.name
        });
      }
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (!conversationId) return;
      const convId = parseInt(conversationId, 10);
      socket.to(`conv_${convId}`).emit('user_stop_typing', {
        conversationId: convId,
        userId: socket.user.id
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.name} (Socket ${socket.id})`);
      if (onlineUsers.has(userId)) {
        const set = onlineUsers.get(userId);
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(userId);
          // Update last_seen in DB
          db.prepare(`UPDATE users SET last_seen = datetime('now') WHERE id = ?`).run(userId);
        }
      }
      io.emit('users_online_status', Array.from(onlineUsers.keys()));
    });
  });
}

module.exports = {
  initSockets,
  onlineUsers
};
