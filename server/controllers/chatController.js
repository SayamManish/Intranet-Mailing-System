const db = require('../database/db');
const { createNotification } = require('../utils/notify');

// 1. Get all conversations for current user
exports.getConversations = (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = db.prepare(`
      SELECT 
        c.id, c.created_at, c.updated_at,
        u.id AS other_user_id, u.employee_id AS other_user_emp_id, u.name AS other_user_name,
        u.email AS other_user_email, u.department AS other_user_dept, u.designation AS other_user_desig,
        u.profile_image AS other_user_avatar, u.last_seen AS other_user_last_seen,
        (SELECT cm.message FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message,
        (SELECT cm.created_at FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message_time,
        (SELECT cm.sender_id FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message_sender_id,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation_id = c.id AND cm.sender_id != ? AND cm.is_read = 0) AS unread_count
      FROM chat_conversations c
      JOIN chat_participants cp ON c.id = cp.conversation_id
      JOIN chat_participants other_cp ON c.id = other_cp.conversation_id AND other_cp.user_id != ?
      JOIN users u ON other_cp.user_id = u.id
      WHERE cp.user_id = ?
      ORDER BY c.updated_at DESC
    `).all(userId, userId, userId);

    return res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error('getConversations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve chat conversations.' });
  }
};

// 2. Get or create conversation with another user
exports.getOrCreateConversation = (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    const otherId = parseInt(targetUserId, 10);
    if (otherId === userId) {
      return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself.' });
    }

    const targetUser = db.prepare(`SELECT id, name, email, department, designation, profile_image FROM users WHERE id = ? AND is_active = 1`).get(otherId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    // Look for existing direct conversation between these two
    const existing = db.prepare(`
      SELECT cp1.conversation_id
      FROM chat_participants cp1
      JOIN chat_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = ? AND cp2.user_id = ?
    `).get(userId, otherId);

    if (existing) {
      return res.status(200).json({
        success: true,
        conversationId: existing.conversation_id,
        targetUser
      });
    }

    // Create new conversation
    const transaction = db.transaction(() => {
      const convRes = db.prepare(`INSERT INTO chat_conversations (created_at, updated_at) VALUES (datetime('now'), datetime('now'))`).run();
      const convId = convRes.lastInsertRowid;

      db.prepare(`INSERT INTO chat_participants (conversation_id, user_id) VALUES (?, ?)`).run(convId, userId);
      db.prepare(`INSERT INTO chat_participants (conversation_id, user_id) VALUES (?, ?)`).run(convId, otherId);

      return convId;
    });

    const newConvId = transaction();

    return res.status(201).json({
      success: true,
      conversationId: newConvId,
      targetUser
    });
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create conversation.' });
  }
};

// 3. Get messages for conversation
exports.getMessages = (req, res) => {
  try {
    const convId = parseInt(req.params.conversationId, 10);
    const userId = req.user.id;

    // Check participation
    const participant = db.prepare(`SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ?`).get(convId, userId);
    if (!participant) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You are not a participant in this conversation.' });
    }

    // Mark messages as read
    db.prepare(`
      UPDATE chat_messages
      SET is_read = 1
      WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    `).run(convId, userId);

    db.prepare(`
      UPDATE chat_participants
      SET last_read_at = datetime('now')
      WHERE conversation_id = ? AND user_id = ?
    `).run(convId, userId);

    // Fetch messages
    const messages = db.prepare(`
      SELECT 
        m.id, m.conversation_id, m.sender_id, m.message, m.is_read, m.created_at,
        u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `).all(convId);

    // Fetch other participant info
    const otherUser = db.prepare(`
      SELECT u.id, u.employee_id, u.name, u.email, u.department, u.designation, u.profile_image, u.last_seen
      FROM chat_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ? AND cp.user_id != ?
    `).get(convId, userId);

    return res.status(200).json({
      success: true,
      data: messages,
      otherUser
    });
  } catch (error) {
    console.error('getMessages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
  }
};

const sanitizeHtml = require('sanitize-html');

// 4. Send Message via REST fallback (Socket handles realtime)
exports.sendMessage = (req, res) => {
  try {
    const convId = parseInt(req.params.conversationId, 10);
    const senderId = req.user.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    const cleanMessage = sanitizeHtml(message.trim(), { allowedTags: [], allowedAttributes: {} });

    // Verify participation
    const participant = db.prepare(`SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ?`).get(convId, senderId);
    if (!participant) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const transaction = db.transaction(() => {
      const msgRes = db.prepare(`
        INSERT INTO chat_messages (conversation_id, sender_id, message, is_read)
        VALUES (?, ?, ?, 0)
      `).run(convId, senderId, cleanMessage);

      db.prepare(`
        UPDATE chat_conversations
        SET updated_at = datetime('now')
        WHERE id = ?
      `).run(convId);

      return msgRes.lastInsertRowid;
    });

    const msgId = transaction();

    const fullMessage = db.prepare(`
      SELECT 
        m.id, m.conversation_id, m.sender_id, m.message, m.is_read, m.created_at,
        u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(msgId);

    // Notify other participant
    const otherParticipant = db.prepare(`
      SELECT user_id FROM chat_participants WHERE conversation_id = ? AND user_id != ?
    `).get(convId, senderId);

    if (otherParticipant) {
      createNotification({
        userId: otherParticipant.user_id,
        type: 'chat',
        title: `Message from ${req.user.name}`,
        message: cleanMessage.length > 50 ? cleanMessage.substring(0, 47) + '...' : cleanMessage,
        relatedId: convId
      });
    }

    return res.status(201).json({
      success: true,
      data: fullMessage
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};
