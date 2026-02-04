const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// Get or Create Conversation
router.post('/conversation', chatController.initiateConversation);

// Get My Conversations
router.get('/conversations', chatController.getConversations);

// Send Message
router.post('/messages', chatController.sendMessage);

// Get Messages
router.get('/conversations/:conversationId/messages', chatController.getMessages);

// Mark as Read
router.put('/conversations/:conversationId/read', chatController.markAsRead);

module.exports = router;
