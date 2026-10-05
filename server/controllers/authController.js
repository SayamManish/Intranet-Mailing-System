const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const { name, employee_id, email, department, designation, password, confirmPassword } = req.body;

    if (!name || !employee_id || !email || !department || !designation || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are mandatory for intranet registration.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanEmpId = employee_id.trim().toUpperCase();

    // Check if email or employee_id already exists
    const existing = db.prepare(`
      SELECT id, email, employee_id FROM users WHERE LOWER(email) = ? OR UPPER(employee_id) = ?
    `).get(cleanEmail, cleanEmpId);

    if (existing) {
      if (existing.email.toLowerCase() === cleanEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this organization email already exists.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'An account with this Employee/Student ID already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Default avatar
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=150`;

    const stmt = db.prepare(`
      INSERT INTO users (employee_id, name, email, password_hash, department, designation, profile_image, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 1)
    `);
    const result = stmt.run(cleanEmpId, name.trim(), cleanEmail, password_hash, department.trim(), designation.trim(), defaultAvatar);

    // Create default starter folders for the user
    const insertFolder = db.prepare(`INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)`);
    insertFolder.run(result.lastInsertRowid, 'Projects', '#3b82f6');
    insertFolder.run(result.lastInsertRowid, 'Important', '#ef4444');

    const token = jwt.sign(
      { id: result.lastInsertRowid, email: cleanEmail, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const newUser = db.prepare(`
      SELECT id, employee_id, name, email, department, designation, profile_image, role, is_active, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Intranet account created successfully.',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred during registration.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your organization Email/Employee ID and Password.'
      });
    }

    const cleanIdentifier = loginIdentifier.trim().toLowerCase();

    // Query user by email or employee_id
    const user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(email) = ? OR LOWER(employee_id) = ?
    `).get(cleanIdentifier, cleanIdentifier);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found in organization directory.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your intranet access has been deactivated by the system administrator.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your password.'
      });
    }

    // Update last_seen
    db.prepare(`UPDATE users SET last_seen = datetime('now') WHERE id = ?`).run(user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return safe user object (excluding password_hash)
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to connect to the intranet server. Please try again.'
    });
  }
};

exports.getMe = (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match.'
      });
    }

    const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(newHash, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating password.'
    });
  }
};

exports.forgotPasswordInfo = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'For security reasons on the isolated Intranet, password resets must be requested through your local IT Helpdesk or System Administrator (admin@organization.local).'
  });
};
