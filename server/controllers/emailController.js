const db = require('../database/db');
const { createNotification } = require('../utils/notify');
const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');

const sanitizeOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    span: ['style', 'class'],
    div: ['style', 'class'],
    p: ['style', 'class'],
    table: ['class', 'border', 'cellpadding', 'cellspacing']
  },
  allowedSchemes: ['http', 'https', 'mailto']
};

const sanitizeInput = (dirty) => (dirty ? sanitizeHtml(dirty, sanitizeOptions) : '');

// Helper to check user access to an email (IDOR protection)
function getEmailAccess(emailId, userId) {
  const isSender = db.prepare(`SELECT id FROM emails WHERE id = ? AND sender_id = ?`).get(emailId, userId);
  const isRecipient = db.prepare(`SELECT id, type, is_read, is_starred, is_important, is_deleted, is_archived, folder_id FROM email_recipients WHERE email_id = ? AND recipient_id = ?`).get(emailId, userId);
  const senderMeta = db.prepare(`SELECT * FROM email_sender_metadata WHERE email_id = ? AND user_id = ?`).get(emailId, userId);

  return {
    isAuthorized: !!(isSender || isRecipient),
    isSender: !!isSender,
    recipientRecord: isRecipient,
    senderMeta: senderMeta
  };
}

// 1. Get Inbox Emails
exports.getInbox = (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const offset = (page - 1) * limit;

    const emails = db.prepare(`
      SELECT 
        e.id, e.subject, e.body, e.created_at, e.parent_email_id,
        u.id AS sender_id, u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar, u.department AS sender_department,
        er.id AS recipient_record_id, er.type AS recipient_type, er.is_read, er.read_at, er.is_starred, er.is_important, er.folder_id,
        f.name AS folder_name, f.color AS folder_color,
        (SELECT COUNT(*) FROM attachments a WHERE a.email_id = e.id) AS attachment_count
      FROM emails e
      JOIN email_recipients er ON e.id = er.email_id
      JOIN users u ON e.sender_id = u.id
      LEFT JOIN folders f ON er.folder_id = f.id
      WHERE er.recipient_id = ? AND er.is_deleted = 0 AND er.is_archived = 0 AND e.is_draft = 0
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const totalCount = db.prepare(`
      SELECT COUNT(*) AS total
      FROM email_recipients er
      JOIN emails e ON er.email_id = e.id
      WHERE er.recipient_id = ? AND er.is_deleted = 0 AND er.is_archived = 0 AND e.is_draft = 0
    `).get(userId).total;

    const unreadCount = db.prepare(`
      SELECT COUNT(*) AS unread
      FROM email_recipients er
      JOIN emails e ON er.email_id = e.id
      WHERE er.recipient_id = ? AND er.is_read = 0 AND er.is_deleted = 0 AND er.is_archived = 0 AND e.is_draft = 0
    `).get(userId).unread;

    return res.status(200).json({
      success: true,
      data: emails,
      meta: {
        page,
        limit,
        total: totalCount,
        unread: unreadCount,
        totalPages: Math.ceil(totalCount / limit) || 1
      }
    });
  } catch (error) {
    console.error('getInbox error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve inbox messages.' });
  }
};

// 2. Get Sent Emails
exports.getSent = (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const offset = (page - 1) * limit;

    const emails = db.prepare(`
      SELECT 
        e.id, e.subject, e.body, e.created_at, e.parent_email_id,
        u.id AS sender_id, u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar,
        esm.is_starred, esm.is_important, esm.folder_id,
        f.name AS folder_name, f.color AS folder_color,
        (SELECT COUNT(*) FROM attachments a WHERE a.email_id = e.id) AS attachment_count,
        (
          SELECT GROUP_CONCAT(ru.name || ' <' || ru.email || '>', ', ')
          FROM email_recipients r
          JOIN users ru ON r.recipient_id = ru.id
          WHERE r.email_id = e.id AND r.type = 'to'
        ) AS recipients_summary
      FROM emails e
      JOIN users u ON e.sender_id = u.id
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      LEFT JOIN folders f ON esm.folder_id = f.id
      WHERE e.sender_id = ? AND e.is_draft = 0 AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL) AND (esm.is_archived = 0 OR esm.is_archived IS NULL)
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, userId, limit, offset);

    const totalCount = db.prepare(`
      SELECT COUNT(*) AS total
      FROM emails e
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      WHERE e.sender_id = ? AND e.is_draft = 0 AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL) AND (esm.is_archived = 0 OR esm.is_archived IS NULL)
    `).get(userId, userId).total;

    return res.status(200).json({
      success: true,
      data: emails,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1
      }
    });
  } catch (error) {
    console.error('getSent error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve sent emails.' });
  }
};

// 3. Get Drafts
exports.getDrafts = (req, res) => {
  try {
    const userId = req.user.id;
    const emails = db.prepare(`
      SELECT 
        e.id, e.subject, e.body, e.created_at, e.updated_at,
        (SELECT COUNT(*) FROM attachments a WHERE a.email_id = e.id) AS attachment_count,
        (
          SELECT GROUP_CONCAT(ru.email, ', ')
          FROM email_recipients r
          JOIN users ru ON r.recipient_id = ru.id
          WHERE r.email_id = e.id
        ) AS draft_recipients
      FROM emails e
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      WHERE e.sender_id = ? AND e.is_draft = 1 AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL)
      ORDER BY e.updated_at DESC
    `).all(userId, userId);

    return res.status(200).json({
      success: true,
      data: emails
    });
  } catch (error) {
    console.error('getDrafts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve draft emails.' });
  }
};

// 4. Get Starred Emails
exports.getStarred = (req, res) => {
  try {
    const userId = req.user.id;

    const emails = db.prepare(`
      SELECT DISTINCT
        e.id, e.subject, e.body, e.created_at,
        u.id AS sender_id, u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar,
        COALESCE(er.is_read, 1) AS is_read,
        1 AS is_starred,
        COALESCE(er.is_important, esm.is_important, 0) AS is_important,
        (SELECT COUNT(*) FROM attachments a WHERE a.email_id = e.id) AS attachment_count
      FROM emails e
      JOIN users u ON e.sender_id = u.id
      LEFT JOIN email_recipients er ON e.id = er.email_id AND er.recipient_id = ?
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      WHERE (er.is_starred = 1 AND er.is_deleted = 0) OR (e.sender_id = ? AND esm.is_starred = 1 AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL))
      ORDER BY e.created_at DESC
    `).all(userId, userId, userId);

    return res.status(200).json({ success: true, data: emails });
  } catch (error) {
    console.error('getStarred error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve starred emails.' });
  }
};

// 5. Get Important Emails
exports.getImportant = (req, res) => {
  try {
    const userId = req.user.id;

    const emails = db.prepare(`
      SELECT DISTINCT
        e.id, e.subject, e.body, e.created_at,
        u.id AS sender_id, u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar,
        COALESCE(er.is_read, 1) AS is_read,
        COALESCE(er.is_starred, esm.is_starred, 0) AS is_starred,
        1 AS is_important,
        (SELECT COUNT(*) FROM attachments a WHERE a.email_id = e.id) AS attachment_count
      FROM emails e
      JOIN users u ON e.sender_id = u.id
      LEFT JOIN email_recipients er ON e.id = er.email_id AND er.recipient_id = ?
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      WHERE (er.is_important = 1 AND er.is_deleted = 0) OR (e.sender_id = ? AND esm.is_important = 1 AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL))
      ORDER BY e.created_at DESC
    `).all(userId, userId, userId);

    return res.status(200).json({ success: true, data: emails });
  } catch (error) {
    console.error('getImportant error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve important emails.' });
  }
};

// 6. Get Archived Emails
exports.getArchived = (req, res) => {
  try {
    const userId = req.user.id;

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
      WHERE (er.is_archived = 1 AND er.is_deleted = 0) OR (e.sender_id = ? AND esm.is_archived = 1 AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL))
      ORDER BY e.created_at DESC
    `).all(userId, userId, userId);

    return res.status(200).json({ success: true, data: emails });
  } catch (error) {
    console.error('getArchived error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve archived emails.' });
  }
};

// 7. Get Trash (Deleted) Emails
exports.getTrash = (req, res) => {
  try {
    const userId = req.user.id;

    const emails = db.prepare(`
      SELECT DISTINCT
        e.id, e.subject, e.body, e.created_at,
        u.id AS sender_id, u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar,
        COALESCE(er.is_read, 1) AS is_read,
        (SELECT COUNT(*) FROM attachments a WHERE a.email_id = e.id) AS attachment_count
      FROM emails e
      JOIN users u ON e.sender_id = u.id
      LEFT JOIN email_recipients er ON e.id = er.email_id AND er.recipient_id = ?
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      WHERE er.is_deleted = 1 OR (e.sender_id = ? AND esm.is_deleted = 1)
      ORDER BY e.created_at DESC
    `).all(userId, userId, userId);

    return res.status(200).json({ success: true, data: emails });
  } catch (error) {
    console.error('getTrash error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve trash emails.' });
  }
};

// 8. Get Email By ID (with Thread & IDOR Protection)
exports.getEmailById = (req, res) => {
  try {
    const emailId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const access = getEmailAccess(emailId, userId);
    if (!access.isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to perform this action. Access to this internal message is restricted."
      });
    }

    // If user is recipient, mark as read
    if (access.recipientRecord && !access.recipientRecord.is_read) {
      db.prepare(`
        UPDATE email_recipients
        SET is_read = 1, read_at = datetime('now')
        WHERE email_id = ? AND recipient_id = ?
      `).run(emailId, userId);
    }

    // Fetch the target email
    const email = db.prepare(`
      SELECT 
        e.id, e.subject, e.body, e.parent_email_id, e.is_draft, e.created_at, e.updated_at,
        u.id AS sender_id, u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar, u.department AS sender_department, u.designation AS sender_designation
      FROM emails e
      JOIN users u ON e.sender_id = u.id
      WHERE e.id = ?
    `).get(emailId);

    // Fetch all recipients for this email
    const recipients = db.prepare(`
      SELECT 
        er.id, er.type, er.is_read, er.read_at, er.is_starred, er.is_important, er.folder_id,
        u.id AS user_id, u.name, u.email, u.department, u.designation, u.profile_image
      FROM email_recipients er
      JOIN users u ON er.recipient_id = u.id
      WHERE er.email_id = ?
    `).all(emailId);

    // Fetch attachments
    const attachments = db.prepare(`
      SELECT id, original_name, stored_name, mime_type, file_size, created_at
      FROM attachments
      WHERE email_id = ?
    `).all(emailId);

    // Current user's state on this email
    let userState = {
      isSender: access.isSender,
      isStarred: access.recipientRecord ? access.recipientRecord.is_starred : (access.senderMeta ? access.senderMeta.is_starred : 0),
      isImportant: access.recipientRecord ? access.recipientRecord.is_important : (access.senderMeta ? access.senderMeta.is_important : 0),
      isArchived: access.recipientRecord ? access.recipientRecord.is_archived : (access.senderMeta ? access.senderMeta.is_archived : 0),
      isDeleted: access.recipientRecord ? access.recipientRecord.is_deleted : (access.senderMeta ? access.senderMeta.is_deleted : 0),
      folderId: access.recipientRecord ? access.recipientRecord.folder_id : (access.senderMeta ? access.senderMeta.folder_id : null)
    };

    // Thread/conversation history if parent_email_id exists
    let thread = [];
    let rootEmailId = email.parent_email_id || email.id;

    // Look for all connected emails in the thread
    const threadEmails = db.prepare(`
      SELECT 
        e.id, e.subject, e.body, e.created_at, e.parent_email_id,
        u.id AS sender_id, u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar
      FROM emails e
      JOIN users u ON e.sender_id = u.id
      WHERE (e.id = ? OR e.parent_email_id = ? OR e.id = ?) AND e.is_draft = 0
      ORDER BY e.created_at ASC
    `).all(rootEmailId, rootEmailId, email.parent_email_id || 0);

    return res.status(200).json({
      success: true,
      data: {
        ...email,
        recipients,
        attachments,
        userState,
        thread: threadEmails
      }
    });
  } catch (error) {
    console.error('getEmailById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve email details.' });
  }
};

// 9. Compose Email (Internal Only + Autocomplete Validation)
exports.composeEmail = async (req, res) => {
  try {
    const senderId = req.user.id;
    let { to, cc, bcc, subject, body, parent_email_id, draft_id } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message body are required.'
      });
    }

    // Helper to parse comma or array recipient lists
    const parseList = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(s => s.trim().toLowerCase()).filter(Boolean);
      return val.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    };

    const toList = parseList(to);
    const ccList = parseList(cc);
    const bccList = parseList(bcc);

    if (toList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one internal recipient (To) is required.'
      });
    }

    const cleanSubject = sanitizeHtml(subject.trim(), { allowedTags: [], allowedAttributes: {} });
    const cleanBody = sanitizeInput(body);

    // Verify all recipients are registered internal users
    const allEmails = Array.from(new Set([...toList, ...ccList, ...bccList]));
    const registeredUsers = db.prepare(`
      SELECT id, email, name FROM users WHERE LOWER(email) IN (${allEmails.map(() => '?').join(',')}) AND is_active = 1
    `).all(...allEmails);

    const registeredMap = {};
    registeredUsers.forEach(u => {
      registeredMap[u.email.toLowerCase()] = u.id;
    });

    // Check for any external or unregistered addresses
    const unallowedEmails = allEmails.filter(e => !registeredMap[e]);
    if (unallowedEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: `External email addresses are not permitted. This is an internal organization network. Unknown recipients: ${unallowedEmails.join(', ')}`
      });
    }

    // Start transaction for atomic insertion
    const insertTransaction = db.transaction(() => {
      let emailId;
      if (draft_id) {
        // Update existing draft to published email
        db.prepare(`
          UPDATE emails 
          SET subject = ?, body = ?, parent_email_id = ?, is_draft = 0, updated_at = datetime('now')
          WHERE id = ? AND sender_id = ?
        `).run(cleanSubject, cleanBody, parent_email_id || null, draft_id, senderId);
        emailId = draft_id;
        
        // Clean up previous recipients if any
        db.prepare(`DELETE FROM email_recipients WHERE email_id = ?`).run(emailId);
      } else {
        const emailStmt = db.prepare(`
          INSERT INTO emails (sender_id, subject, body, parent_email_id, is_draft)
          VALUES (?, ?, ?, ?, 0)
        `);
        const res = emailStmt.run(senderId, cleanSubject, cleanBody, parent_email_id || null);
        emailId = res.lastInsertRowid;
      }

      // Sender metadata
      db.prepare(`
        INSERT OR REPLACE INTO email_sender_metadata (email_id, user_id, is_starred, is_important, is_deleted, is_archived)
        VALUES (?, ?, 0, 0, 0, 0)
      `).run(emailId, senderId);

      // Insert recipients
      const insertRecip = db.prepare(`
        INSERT INTO email_recipients (email_id, recipient_id, type, is_read, is_starred, is_important, is_deleted, is_archived)
        VALUES (?, ?, ?, 0, 0, 0, 0, 0)
      `);

      toList.forEach(email => {
        insertRecip.run(emailId, registeredMap[email], 'to');
      });
      ccList.forEach(email => {
        insertRecip.run(emailId, registeredMap[email], 'cc');
      });
      bccList.forEach(email => {
        insertRecip.run(emailId, registeredMap[email], 'bcc');
      });

      // Handle file attachments if any
      if (req.files && req.files.length > 0) {
        const insertAtt = db.prepare(`
          INSERT INTO attachments (email_id, original_name, stored_name, file_path, mime_type, file_size)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const file of req.files) {
          insertAtt.run(
            emailId,
            file.originalname,
            file.filename,
            file.path,
            file.mimetype,
            file.size
          );
        }
      }

      return emailId;
    });

    const newEmailId = insertTransaction();

    // Send notifications to all recipients
    allEmails.forEach(email => {
      const recipientId = registeredMap[email];
      if (recipientId && recipientId !== senderId) {
        createNotification({
          userId: recipientId,
          type: 'email',
          title: `New internal mail from ${req.user.name}`,
          message: subject.length > 60 ? subject.substring(0, 57) + '...' : subject,
          relatedId: newEmailId
        });
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Email dispatched successfully within the intranet network.',
      emailId: newEmailId
    });
  } catch (error) {
    console.error('composeEmail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send intranet email.' });
  }
};

// 10. Save / Update Draft
exports.saveDraft = async (req, res) => {
  try {
    const senderId = req.user.id;
    let { id, to, cc, bcc, subject = '', body = '', parent_email_id } = req.body;

    let draftId = id ? parseInt(id, 10) : null;

    const cleanSubject = sanitizeHtml((subject || '').trim(), { allowedTags: [], allowedAttributes: {} });
    const cleanBody = sanitizeInput(body || '');

    if (draftId) {
      // Check ownership
      const existing = db.prepare(`SELECT id FROM emails WHERE id = ? AND sender_id = ? AND is_draft = 1`).get(draftId, senderId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Draft not found.' });
      }

      db.prepare(`
        UPDATE emails
        SET subject = ?, body = ?, parent_email_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(cleanSubject, cleanBody, parent_email_id || null, draftId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO emails (sender_id, subject, body, parent_email_id, is_draft)
        VALUES (?, ?, ?, ?, 1)
      `);
      const result = stmt.run(senderId, cleanSubject, cleanBody, parent_email_id || null);
      draftId = result.lastInsertRowid;

      db.prepare(`
        INSERT OR REPLACE INTO email_sender_metadata (email_id, user_id, is_starred, is_important, is_deleted, is_archived)
        VALUES (?, ?, 0, 0, 0, 0)
      `).run(draftId, senderId);
    }

    // Attachments if uploaded
    if (req.files && req.files.length > 0) {
      const insertAtt = db.prepare(`
        INSERT INTO attachments (email_id, original_name, stored_name, file_path, mime_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const file of req.files) {
        insertAtt.run(
          draftId,
          file.originalname,
          file.filename,
          file.path,
          file.mimetype,
          file.size
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Draft saved successfully.',
      draftId
    });
  } catch (error) {
    console.error('saveDraft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save draft.' });
  }
};

// 11. Star / Unstar
exports.toggleStar = (req, res) => {
  try {
    const emailId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const access = getEmailAccess(emailId, userId);

    if (!access.isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (access.recipientRecord) {
      const newState = access.recipientRecord.is_starred ? 0 : 1;
      db.prepare(`UPDATE email_recipients SET is_starred = ? WHERE email_id = ? AND recipient_id = ?`).run(newState, emailId, userId);
      return res.status(200).json({ success: true, is_starred: newState });
    } else {
      const current = access.senderMeta ? access.senderMeta.is_starred : 0;
      const newState = current ? 0 : 1;
      db.prepare(`
        INSERT INTO email_sender_metadata (email_id, user_id, is_starred)
        VALUES (?, ?, ?)
        ON CONFLICT(email_id, user_id) DO UPDATE SET is_starred = excluded.is_starred
      `).run(emailId, userId, newState);
      return res.status(200).json({ success: true, is_starred: newState });
    }
  } catch (error) {
    console.error('toggleStar error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update star state.' });
  }
};

// 12. Important / Unimportant
exports.toggleImportant = (req, res) => {
  try {
    const emailId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const access = getEmailAccess(emailId, userId);

    if (!access.isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (access.recipientRecord) {
      const newState = access.recipientRecord.is_important ? 0 : 1;
      db.prepare(`UPDATE email_recipients SET is_important = ? WHERE email_id = ? AND recipient_id = ?`).run(newState, emailId, userId);
      return res.status(200).json({ success: true, is_important: newState });
    } else {
      const current = access.senderMeta ? access.senderMeta.is_important : 0;
      const newState = current ? 0 : 1;
      db.prepare(`
        INSERT INTO email_sender_metadata (email_id, user_id, is_important)
        VALUES (?, ?, ?)
        ON CONFLICT(email_id, user_id) DO UPDATE SET is_important = excluded.is_important
      `).run(emailId, userId, newState);
      return res.status(200).json({ success: true, is_important: newState });
    }
  } catch (error) {
    console.error('toggleImportant error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update importance state.' });
  }
};

// 13. Mark as Read / Unread
exports.markReadUnread = (req, res) => {
  try {
    const emailId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { is_read } = req.body;

    const access = getEmailAccess(emailId, userId);
    if (!access.recipientRecord) {
      return res.status(400).json({ success: false, message: 'Only received emails have read statuses.' });
    }

    const readState = is_read ? 1 : 0;
    const readAt = readState ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE email_recipients
      SET is_read = ?, read_at = ?
      WHERE email_id = ? AND recipient_id = ?
    `).run(readState, readAt, emailId, userId);

    return res.status(200).json({ success: true, is_read: readState });
  } catch (error) {
    console.error('markReadUnread error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update read status.' });
  }
};

// 14. Move to Folder
exports.moveToFolder = (req, res) => {
  try {
    const emailId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { folder_id } = req.body;

    const access = getEmailAccess(emailId, userId);
    if (!access.isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (folder_id) {
      // Verify folder belongs to this user
      const folder = db.prepare(`SELECT id FROM folders WHERE id = ? AND user_id = ?`).get(folder_id, userId);
      if (!folder) {
        return res.status(400).json({ success: false, message: 'Target folder does not exist or does not belong to you.' });
      }
    }

    if (access.recipientRecord) {
      db.prepare(`UPDATE email_recipients SET folder_id = ? WHERE email_id = ? AND recipient_id = ?`).run(folder_id || null, emailId, userId);
    } else {
      db.prepare(`
        INSERT INTO email_sender_metadata (email_id, user_id, folder_id)
        VALUES (?, ?, ?)
        ON CONFLICT(email_id, user_id) DO UPDATE SET folder_id = excluded.folder_id
      `).run(emailId, userId, folder_id || null);
    }

    return res.status(200).json({ success: true, message: 'Email moved to folder successfully.' });
  } catch (error) {
    console.error('moveToFolder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to move email.' });
  }
};

// 15. Delete Email (Soft Delete to Trash or Permanent Delete if in Trash)
exports.deleteEmail = (req, res) => {
  try {
    const emailId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { permanent = false } = req.body;

    const access = getEmailAccess(emailId, userId);
    if (!access.isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (permanent) {
      if (access.recipientRecord) {
        db.prepare(`DELETE FROM email_recipients WHERE email_id = ? AND recipient_id = ?`).run(emailId, userId);
      }
      if (access.isSender) {
        db.prepare(`DELETE FROM email_sender_metadata WHERE email_id = ? AND user_id = ?`).run(emailId, userId);
      }
      return res.status(200).json({ success: true, message: 'Email permanently deleted.' });
    }

    // Soft delete (move to trash)
    if (access.recipientRecord) {
      db.prepare(`UPDATE email_recipients SET is_deleted = 1 WHERE email_id = ? AND recipient_id = ?`).run(emailId, userId);
    } else {
      db.prepare(`
        INSERT INTO email_sender_metadata (email_id, user_id, is_deleted)
        VALUES (?, ?, 1)
        ON CONFLICT(email_id, user_id) DO UPDATE SET is_deleted = 1
      `).run(emailId, userId);
    }

    return res.status(200).json({ success: true, message: 'Email moved to Trash.' });
  } catch (error) {
    console.error('deleteEmail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete email.' });
  }
};

// 16. Batch Actions (Batch Delete, Read, Unread, Move)
exports.batchActions = (req, res) => {
  try {
    const userId = req.user.id;
    const { emailIds, action, folder_id } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No email IDs provided.' });
    }

    const performBatch = db.transaction(() => {
      for (const id of emailIds) {
        const access = getEmailAccess(id, userId);
        if (!access.isAuthorized) continue;

        if (action === 'delete') {
          if (access.recipientRecord) {
            db.prepare(`UPDATE email_recipients SET is_deleted = 1 WHERE email_id = ? AND recipient_id = ?`).run(id, userId);
          } else {
            db.prepare(`
              INSERT INTO email_sender_metadata (email_id, user_id, is_deleted)
              VALUES (?, ?, 1)
              ON CONFLICT(email_id, user_id) DO UPDATE SET is_deleted = 1
            `).run(id, userId);
          }
        } else if (action === 'mark_read') {
          if (access.recipientRecord) {
            db.prepare(`UPDATE email_recipients SET is_read = 1, read_at = datetime('now') WHERE email_id = ? AND recipient_id = ?`).run(id, userId);
          }
        } else if (action === 'mark_unread') {
          if (access.recipientRecord) {
            db.prepare(`UPDATE email_recipients SET is_read = 0, read_at = NULL WHERE email_id = ? AND recipient_id = ?`).run(id, userId);
          }
        } else if (action === 'move_folder') {
          if (access.recipientRecord) {
            db.prepare(`UPDATE email_recipients SET folder_id = ? WHERE email_id = ? AND recipient_id = ?`).run(folder_id || null, id, userId);
          } else {
            db.prepare(`
              INSERT INTO email_sender_metadata (email_id, user_id, folder_id)
              VALUES (?, ?, ?)
              ON CONFLICT(email_id, user_id) DO UPDATE SET folder_id = excluded.folder_id
            `).run(id, userId, folder_id || null);
          }
        }
      }
    });

    performBatch();

    return res.status(200).json({ success: true, message: `Batch action '${action}' applied successfully.` });
  } catch (error) {
    console.error('batchActions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process batch action.' });
  }
};

// 17. Search Emails
exports.searchEmails = (req, res) => {
  try {
    const userId = req.user.id;
    const { q = '', filter = 'all' } = req.query;
    const searchTerm = `%${q.trim()}%`;

    let query = `
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
      WHERE (er.recipient_id = ? OR e.sender_id = ?)
        AND (er.is_deleted = 0 OR er.is_deleted IS NULL)
        AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL)
        AND (e.subject LIKE ? OR e.body LIKE ? OR u.name LIKE ? OR u.email LIKE ?)
    `;

    if (filter === 'unread') {
      query += ` AND er.is_read = 0 `;
    } else if (filter === 'starred') {
      query += ` AND (er.is_starred = 1 OR esm.is_starred = 1) `;
    } else if (filter === 'attachments') {
      query += ` AND (SELECT COUNT(*) FROM attachments a WHERE a.email_id = e.id) > 0 `;
    }

    query += ` ORDER BY e.created_at DESC LIMIT 50 `;

    const results = db.prepare(query).all(userId, userId, userId, userId, searchTerm, searchTerm, searchTerm, searchTerm);

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('searchEmails error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search messages.' });
  }
};

// 18. Dashboard Real Statistics
exports.getDashboardStats = (req, res) => {
  try {
    const userId = req.user.id;

    const inboxCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM email_recipients er
      JOIN emails e ON er.email_id = e.id
      WHERE er.recipient_id = ? AND er.is_deleted = 0 AND er.is_archived = 0 AND e.is_draft = 0
    `).get(userId).count;

    const unreadCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM email_recipients er
      JOIN emails e ON er.email_id = e.id
      WHERE er.recipient_id = ? AND er.is_read = 0 AND er.is_deleted = 0 AND er.is_archived = 0 AND e.is_draft = 0
    `).get(userId).count;

    const sentCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM emails e
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      WHERE e.sender_id = ? AND e.is_draft = 0 AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL)
    `).get(userId, userId).count;

    const starredCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM emails e
      LEFT JOIN email_recipients er ON e.id = er.email_id AND er.recipient_id = ?
      LEFT JOIN email_sender_metadata esm ON e.id = esm.email_id AND esm.user_id = ?
      WHERE (er.is_starred = 1 AND er.is_deleted = 0) OR (e.sender_id = ? AND esm.is_starred = 1 AND (esm.is_deleted = 0 OR esm.is_deleted IS NULL))
    `).get(userId, userId, userId).count;

    // Recent 5 emails
    const recentEmails = db.prepare(`
      SELECT 
        e.id, e.subject, e.created_at,
        u.name AS sender_name, u.email AS sender_email, u.profile_image AS sender_avatar,
        er.is_read, er.is_starred
      FROM emails e
      JOIN email_recipients er ON e.id = er.email_id
      JOIN users u ON e.sender_id = u.id
      WHERE er.recipient_id = ? AND er.is_deleted = 0 AND e.is_draft = 0
      ORDER BY e.created_at DESC
      LIMIT 5
    `).all(userId);

    // Active recent conversations
    const recentChats = db.prepare(`
      SELECT 
        c.id AS conversation_id,
        u.id AS other_user_id, u.name AS other_user_name, u.email AS other_user_email, u.profile_image AS other_user_avatar, u.department AS other_user_department,
        (SELECT cm.message FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message,
        (SELECT cm.created_at FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message_time,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation_id = c.id AND cm.sender_id != ? AND cm.is_read = 0) AS unread_count
      FROM chat_conversations c
      JOIN chat_participants cp ON c.id = cp.conversation_id
      JOIN chat_participants other_cp ON c.id = other_cp.conversation_id AND other_cp.user_id != ?
      JOIN users u ON other_cp.user_id = u.id
      WHERE cp.user_id = ?
      ORDER BY c.updated_at DESC
      LIMIT 5
    `).all(userId, userId, userId);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalInbox: inboxCount,
          unread: unreadCount,
          sent: sentCount,
          starred: starredCount
        },
        recentEmails,
        recentChats
      }
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard statistics.' });
  }
};
