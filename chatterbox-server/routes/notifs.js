const express = require('express');
const router = express.Router();
const controller = require('../controllers/notifications.controller');
const verifyToken = require('../middleware/auth.middleware');

router.get('/', verifyToken, controller.getNotifications);
router.put('/read', verifyToken, controller.markRead);

module.exports = router;
