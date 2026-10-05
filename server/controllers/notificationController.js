const db = require('../database/db');

exports.getNotifications = (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = db.prepare(`
      SELECT id, type, title, message, related_id, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(userId).count;

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
};

exports.markAsRead = (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `).run(notifId, userId);

    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('markAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

exports.markAllAsRead = (req, res) => {
  try {
    const userId = req.user.id;

    db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND is_read = 0
    `).run(userId);

    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
  }
};

exports.deleteNotification = (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    db.prepare(`
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
    `).run(notifId, userId);

    return res.status(200).json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
};
