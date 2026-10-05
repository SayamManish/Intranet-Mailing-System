const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken, requireAdmin);

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getAdminUsers);
router.put('/users/:id/status', adminController.toggleUserStatus);

module.exports = router;
