const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/download/:id', attachmentController.downloadAttachment);

module.exports = router;
