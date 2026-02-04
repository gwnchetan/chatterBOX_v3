const Conversation = require('../models/conversations');
const Message = require('../models/messages');
const { canChat } = require('../utils/chatPermissions');
const { getIo } = require('../socket');

// Rate Limiting (Simple In-Memory)
const MSG_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_MSGS_PER_WINDOW = 15;
const msgRateLimits = new Map();

const checkMsgRateLimit = (userId) => {
    const now = Date.now();
    const userLimits = msgRateLimits.get(userId) || [];
    const validTimestamps = userLimits.filter(ts => now - ts < MSG_RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= MAX_MSGS_PER_WINDOW) return false;

    validTimestamps.push(now);
    msgRateLimits.set(userId, validTimestamps);
    return true;
};

/**
 * Get or Create a Conversation (Strict Invariants)
 * POST /api/chat/conversation
 */
exports.initiateConversation = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.user._id;

        if (!targetUserId) return res.status(400).json({ message: "Target user required" });

        // 1. Check Permissions
        await canChat(currentUserId, targetUserId);

        // 2. Find Existing Conversation
        // Invariant: One conversation per pair.
        // We use $all to find conversation with exactly these 2 participants.
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, targetUserId], $size: 2 }
        }).populate('participants', 'username fullname avatar');

        // 3. Create if not exists
        if (!conversation) {
            conversation = new Conversation({
                participants: [currentUserId, targetUserId],
                lastMessage: null
            });
            await conversation.save();
            await conversation.populate('participants', 'username fullname avatar');
        }

        res.json(conversation);

    } catch (error) {
        console.error("Init Conversation Error:", error);
        res.status(400).json({ message: error.message });
    }
};

/**
 * Send a Message
 * POST /api/chat/messages
 */
exports.sendMessage = async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const senderId = req.user._id.toString();

        // 1. Rate Limiting
        if (!checkMsgRateLimit(senderId)) {
            return res.status(429).json({ message: "Message rate limit exceeded" });
        }

        // 2. Strict Validation
        if (!content || !content.text || typeof content.text !== 'string') {
            return res.status(400).json({ message: "Message content required" });
        }

        const trimmedText = content.text.trim();
        if (trimmedText.length === 0) {
            return res.status(400).json({ message: "Message cannot be empty" });
        }
        if (trimmedText.length > 2000) {
            return res.status(400).json({ message: "Message too long (max 2000 chars)" });
        }
        // Enforce trimmed text
        content.text = trimmedText;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });

        // 3. Verify Participant
        if (!conversation.participants.includes(senderId)) {
            return res.status(403).json({ message: "Not a participant" });
        }

        // 4. Permission Check (Double check in case of block)
        const otherUserId = conversation.participants.find(id => id.toString() !== senderId);
        await canChat(senderId, otherUserId);

        // 5. Create Message
        const newMessage = new Message({
            conversationId,
            sender: senderId,
            content
        });
        await newMessage.save();

        // 6. Update Conversation
        conversation.lastMessage = {
            text: content.text,
            sender: senderId,
            createdAt: newMessage.createdAt
        };
        await conversation.save();

        // 7. Populate and Return
        await newMessage.populate('sender', 'username fullname avatar');

        // [SOCKET] Emit Real-time Message
        try {
            getIo().to(`chat:${conversationId}`).emit('chat:message', newMessage);
        } catch (e) {
            console.error("Socket Emit Error:", e);
        }

        res.status(201).json(newMessage);

    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

/**
 * Get Messages
 * GET /api/chat/conversations/:conversationId/messages
 */
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, before } = req.query;
        const userId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: "Conversation not found" });

        if (!conversation.participants.includes(userId)) {
            return res.status(403).json({ message: "Not a participant" });
        }

        const query = { conversationId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: 1 }) // Chronological for UI (or -1 and reverse)
            // Usually valid strictly: sort -1 limit N, then reverse in UI.
            // But let's do sort 1 for simplicity if we fetch all.
            // Better: sort -1 (newest first), limit, then user reverses.
            .limit(parseInt(limit))
            .populate('sender', 'username fullname avatar');

        res.json(messages);

    } catch (error) {
        console.error("Get Messages Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

/**
 * Get My Conversations
 * GET /api/chat/conversations
 */
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({
            participants: userId
        })
            .populate('participants', 'username fullname avatar')
            .sort({ updatedAt: -1 });

        res.json(conversations);
    } catch (error) {
        console.error("Get Conversations Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

/**
 * Mark as Read
 * PUT /api/chat/conversations/:conversationId/read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        // Add user to readBy array in all unread messages
        await Message.updateMany(
            { conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        // [SOCKET] Emit Read Receipt
        try {
            getIo().to(`chat:${conversationId}`).emit('chat:read', {
                conversationId,
                userId,
                readAt: new Date()
            });
        } catch (e) { console.error("Socket Emit Error:", e); }

        res.json({ message: "Marked as read" });
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};
