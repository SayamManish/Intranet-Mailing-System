const db = require('../database/db');
const path = require('path');
const fs = require('fs');

exports.downloadAttachment = (req, res) => {
  try {
    const attachmentId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    // Fetch attachment metadata and email_id
    const attachment = db.prepare(`
      SELECT a.*, e.sender_id
      FROM attachments a
      JOIN emails e ON a.email_id = e.id
      WHERE a.id = ?
    `).get(attachmentId);

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    // IDOR check: Is user the sender or a recipient?
    const isSender = attachment.sender_id === userId;
    const isRecipient = db.prepare(`
      SELECT id FROM email_recipients WHERE email_id = ? AND recipient_id = ?
    `).get(attachment.email_id, userId);

    if (!isSender && !isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You do not have permission to access this attachment.'
      });
    }

    const uploadDir = path.resolve(__dirname, '..', 'uploads');
    const safeFilePath = path.join(uploadDir, path.basename(attachment.stored_name));

    if (!fs.existsSync(safeFilePath)) {
      return res.status(404).json({ success: false, message: 'File is no longer available on local storage.' });
    }

    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.original_name)}"`);

    const fileStream = fs.createReadStream(safeFilePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('downloadAttachment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to download attachment.' });
  }
};
