const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', folderController.getFolders);
router.post('/', folderController.createFolder);
router.put('/:id', folderController.renameFolder);
router.delete('/:id', folderController.deleteFolder);
router.get('/:id/emails', folderController.getFolderEmails);

module.exports = router;
