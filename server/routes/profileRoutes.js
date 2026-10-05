const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

router.use(authenticateToken);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.post('/avatar', uploadAvatar.single('avatar'), profileController.uploadAvatar);

module.exports = router;
