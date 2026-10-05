const db = require('../database/db');

exports.getFolders = (req, res) => {
  try {
    const userId = req.user.id;
    const folders = db.prepare(`
      SELECT 
        f.id, f.name, f.color, f.created_at,
        (
          SELECT COUNT(*)
          FROM (
            SELECT er.email_id FROM email_recipients er WHERE er.folder_id = f.id AND er.recipient_id = ? AND er.is_deleted = 0
            UNION
            SELECT esm.email_id FROM email_sender_metadata esm WHERE esm.folder_id = f.id AND esm.user_id = ? AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL)
          )
        ) AS email_count
      FROM folders f
      WHERE f.user_id = ?
      ORDER BY f.name ASC
    `).all(userId, userId, userId);

    return res.status(200).json({ success: true, data: folders });
  } catch (error) {
    console.error('getFolders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve custom folders.' });
  }
};

exports.createFolder = (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color = '#4f46e5' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name is required.' });
    }

    const cleanName = name.trim();

    // Check duplicate
    const existing = db.prepare(`SELECT id FROM folders WHERE user_id = ? AND LOWER(name) = ?`).get(userId, cleanName.toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: 'A folder with this name already exists.' });
    }

    const result = db.prepare(`
      INSERT INTO folders (user_id, name, color)
      VALUES (?, ?, ?)
    `).run(userId, cleanName, color);

    const folder = db.prepare(`SELECT id, name, color, created_at, 0 as email_count FROM folders WHERE id = ?`).get(result.lastInsertRowid);

    return res.status(201).json({ success: true, message: 'Folder created successfully.', data: folder });
  } catch (error) {
    console.error('createFolder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create folder.' });
  }
};

exports.renameFolder = (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Folder name cannot be empty.' });
    }

    const folder = db.prepare(`SELECT id FROM folders WHERE id = ? AND user_id = ?`).get(folderId, userId);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    db.prepare(`
      UPDATE folders
      SET name = ?, color = COALESCE(?, color)
      WHERE id = ? AND user_id = ?
    `).run(name.trim(), color, folderId, userId);

    const updated = db.prepare(`SELECT * FROM folders WHERE id = ?`).get(folderId);

    return res.status(200).json({ success: true, message: 'Folder updated.', data: updated });
  } catch (error) {
    console.error('renameFolder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update folder.' });
  }
};

exports.deleteFolder = (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const folder = db.prepare(`SELECT id, name FROM folders WHERE id = ? AND user_id = ?`).get(folderId, userId);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    // Unassign folder from recipient records and sender metadata
    db.prepare(`UPDATE email_recipients SET folder_id = NULL WHERE folder_id = ? AND recipient_id = ?`).run(folderId, userId);
    db.prepare(`UPDATE email_sender_metadata SET folder_id = NULL WHERE folder_id = ? AND user_id = ?`).run(folderId, userId);

    // Delete folder
    db.prepare(`DELETE FROM folders WHERE id = ? AND user_id = ?`).run(folderId, userId);

    return res.status(200).json({ success: true, message: `Folder '${folder.name}' deleted successfully.` });
  } catch (error) {
    console.error('deleteFolder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete folder.' });
  }
};

exports.getFolderEmails = (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const folder = db.prepare(`SELECT id, name, color FROM folders WHERE id = ? AND user_id = ?`).get(folderId, userId);
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    const emails = db.prepare(`
      SELECT DISTINCT
        e.id, e.subject, e.body, e.created_at,
        u.id AS sender_id, u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar,
        COALESCE(er.is_read, 1) AS is_read,
        COALESCE(er.is_starred, esm.is_starred, 0) AS is_starred,
        COALESCE(er.is_important, esm.is_important, 0) AS is_important,
        (SELECT COUNT(*) FROM attachments a WHERE a.email_id = e.id) AS attachment_count
      FROM emails e
      JOIN users u ON e.sender_id = u.id
      LEFT JOIN email_recipients er ON e.id = er.email_id AND er.recipient_id = ?
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      WHERE (er.folder_id = ? AND er.is_deleted = 0) OR (esm.folder_id = ? AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL))
      ORDER BY e.created_at DESC
    `).all(userId, userId, folderId, folderId);

    return res.status(200).json({
      success: true,
      folder,
      data: emails
    });
  } catch (error) {
    console.error('getFolderEmails error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve folder emails.' });
  }
};
