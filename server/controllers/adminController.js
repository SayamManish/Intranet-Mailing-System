const db = require('../database/db');
const fs = require('fs');
const path = require('path');

exports.getAdminStats = (req, res) => {
  try {
    const totalUsers = db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count;
    const activeUsers = db.prepare(`SELECT COUNT(*) AS count FROM users WHERE is_active = 1`).get().count;
    const totalEmails = db.prepare(`SELECT COUNT(*) AS count FROM emails WHERE is_draft = 0`).get().count;
    const totalDrafts = db.prepare(`SELECT COUNT(*) AS count FROM emails WHERE is_draft = 1`).get().count;
    const totalChats = db.prepare(`SELECT COUNT(*) AS count FROM chat_messages`).get().count;

    // Storage calculation
    let totalStorageBytes = 0;
    const uploadDir = path.resolve(__dirname, '..', 'uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach(f => {
        try {
          const stats = fs.statSync(path.join(uploadDir, f));
          if (stats.isFile()) {
            totalStorageBytes += stats.size;
          }
        } catch (e) {}
      });
    }

    // Departments breakdown
    const departments = db.prepare(`
      SELECT department, COUNT(*) AS user_count
      FROM users
      GROUP BY department
      ORDER BY user_count DESC
    `).all();

    // Recent activity log
    const recentRegistered = db.prepare(`
      SELECT id, employee_id, name, email, department, designation, role, is_active, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalEmails,
        totalDrafts,
        totalChats,
        storageBytes: totalStorageBytes,
        storageMB: (totalStorageBytes / (1024 * 1024)).toFixed(2)
      },
      departments,
      recentUsers: recentRegistered
    });
  } catch (error) {
    console.error('getAdminStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admin system statistics.' });
  }
};

exports.getAdminUsers = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, employee_id, name, email, department, designation, profile_image, role, is_active, created_at, last_seen
      FROM users
      ORDER BY id ASC
    `).all();

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('getAdminUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user list.' });
  }
};

exports.toggleUserStatus = (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own administrative account.' });
    }

    const user = db.prepare(`SELECT id, name FROM users WHERE id = ?`).get(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = is_active ? 1 : 0;
    db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, targetUserId);

    return res.status(200).json({
      success: true,
      message: `User '${user.name}' has been ${newStatus ? 'activated' : 'deactivated'}.`
    });
  } catch (error) {
    console.error('toggleUserStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};
