const db = require('../database/db');

let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

function createNotification({ userId, type, title, message, relatedId = null }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const res = stmt.run(userId, type, title, message, relatedId);
    
    const notification = {
      id: res.lastInsertRowid,
      user_id: userId,
      type,
      title,
      message,
      related_id: relatedId,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    if (ioInstance) {
      ioInstance.to(`user_${userId}`).emit('notification', notification);
      if (type === 'email') {
        ioInstance.to(`user_${userId}`).emit('new_email', { emailId: relatedId, title, message });
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

module.exports = {
  setSocketIO,
  createNotification
};
