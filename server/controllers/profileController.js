const db = require('../database/db');
const path = require('path');

exports.getProfile = (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, employee_id, name, email, department, designation, profile_image, role, is_active, created_at, last_seen
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

exports.updateProfile = (req, res) => {
  try {
    const userId = req.user.id;
    const { name, department, designation, profile_image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    db.prepare(`
      UPDATE users
      SET name = ?, department = COALESCE(?, department), designation = COALESCE(?, designation), profile_image = COALESCE(?, profile_image), updated_at = datetime('now')
      WHERE id = ?
    `).run(name.trim(), department ? department.trim() : null, designation ? designation.trim() : null, profile_image || null, userId);

    const updatedUser = db.prepare(`
      SELECT id, employee_id, name, email, department, designation, profile_image, role, is_active, created_at, last_seen
      FROM users
      WHERE id = ?
    `).get(userId);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

exports.uploadAvatar = (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    db.prepare(`
      UPDATE users
      SET profile_image = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(avatarUrl, userId);

    return res.status(200).json({
      success: true,
      message: 'Profile image updated successfully.',
      profile_image: avatarUrl
    });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload profile image.' });
  }
};
