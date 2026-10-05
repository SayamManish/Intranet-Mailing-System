const db = require('../database/db');

exports.getContacts = (req, res) => {
  try {
    const userId = req.user.id;

    const contacts = db.prepare(`
      SELECT 
        c.id AS contact_id, c.nickname, c.notes, c.created_at AS added_at,
        u.id AS user_id, u.employee_id, u.name, u.email, u.department, u.designation, u.profile_image, u.last_seen, u.is_active
      FROM contacts c
      JOIN users u ON c.contact_user_id = u.id
      WHERE c.user_id = ?
      ORDER BY COALESCE(c.nickname, u.name) ASC
    `).all(userId);

    return res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    console.error('getContacts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve contacts.' });
  }
};

exports.searchDirectory = (req, res) => {
  try {
    const userId = req.user.id;
    const { q = '', department = '' } = req.query;
    const searchTerm = `%${q.trim()}%`;

    let query = `
      SELECT 
        u.id, u.employee_id, u.name, u.email, u.department, u.designation, u.profile_image, u.last_seen, u.is_active,
        (SELECT COUNT(*) FROM contacts c WHERE c.user_id = ? AND c.contact_user_id = u.id) AS is_in_contacts
      FROM users u
      WHERE u.id != ? AND u.is_active = 1
        AND (u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ? OR u.department LIKE ? OR u.designation LIKE ?)
    `;

    const params = [userId, userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

    if (department) {
      query += ` AND u.department = ? `;
      params.push(department);
    }

    query += ` ORDER BY u.name ASC LIMIT 50 `;

    const users = db.prepare(query).all(...params);

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('searchDirectory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search organization directory.' });
  }
};

exports.addContact = (req, res) => {
  try {
    const userId = req.user.id;
    const { contact_user_id, nickname, notes } = req.body;

    if (!contact_user_id) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    if (parseInt(contact_user_id, 10) === userId) {
      return res.status(400).json({ success: false, message: 'You cannot add yourself as a contact.' });
    }

    // Verify contact user exists
    const targetUser = db.prepare(`SELECT id, name FROM users WHERE id = ? AND is_active = 1`).get(contact_user_id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found in organization.' });
    }

    // Check duplicate
    const existing = db.prepare(`SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?`).get(userId, contact_user_id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'This user is already in your contacts list.' });
    }

    const result = db.prepare(`
      INSERT INTO contacts (user_id, contact_user_id, nickname, notes)
      VALUES (?, ?, ?, ?)
    `).run(userId, contact_user_id, nickname ? nickname.trim() : null, notes ? notes.trim() : null);

    return res.status(201).json({
      success: true,
      message: `${targetUser.name} added to contacts.`,
      contactId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('addContact error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add contact.' });
  }
};

exports.updateContact = (req, res) => {
  try {
    const contactId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { nickname, notes } = req.body;

    const contact = db.prepare(`SELECT id FROM contacts WHERE id = ? AND user_id = ?`).get(contactId, userId);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    db.prepare(`
      UPDATE contacts
      SET nickname = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `).run(nickname ? nickname.trim() : null, notes ? notes.trim() : null, contactId, userId);

    return res.status(200).json({ success: true, message: 'Contact updated successfully.' });
  } catch (error) {
    console.error('updateContact error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update contact.' });
  }
};

exports.deleteContact = (req, res) => {
  try {
    const contactId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const contact = db.prepare(`SELECT id FROM contacts WHERE id = ? AND user_id = ?`).get(contactId, userId);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    db.prepare(`DELETE FROM contacts WHERE id = ? AND user_id = ?`).run(contactId, userId);

    return res.status(200).json({ success: true, message: 'Contact removed successfully.' });
  } catch (error) {
    console.error('deleteContact error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove contact.' });
  }
};
