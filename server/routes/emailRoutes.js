const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Apply authentication to all email routes
router.use(authenticateToken);

// Mailbox Folders
router.get('/inbox', emailController.getInbox);
router.get('/sent', emailController.getSent);
router.get('/drafts', emailController.getDrafts);
router.get('/starred', emailController.getStarred);
router.get('/important', emailController.getImportant);
router.get('/archived', emailController.getArchived);
router.get('/trash', emailController.getTrash);

// Dashboard & Search
router.get('/dashboard-stats', emailController.getDashboardStats);
router.get('/search', emailController.searchEmails);

// Compose & Drafts
router.post('/compose', upload.array('attachments', 10), emailController.composeEmail);
router.post('/drafts', upload.array('attachments', 10), emailController.saveDraft);

// Batch operations
router.post('/batch', emailController.batchActions);

// Single Email Operations
router.get('/:id', emailController.getEmailById);
router.put('/:id/star', emailController.toggleStar);
router.put('/:id/important', emailController.toggleImportant);
router.put('/:id/read', emailController.markReadUnread);
router.put('/:id/move', emailController.moveToFolder);
router.delete('/:id', emailController.deleteEmail);

module.exports = router;
