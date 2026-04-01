const Conversation = require('../models/conversations');
const Message = require('../models/messages');
const Notification = require('../models/notifications');
const User = require('../models/users');
const { canChat } = require('../utils/chatPermissions');
const { getIo } = require('../socket');
const { getViewerContext, normalizeId } = require('../utils/privacy');

const MSG_RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_MSGS_PER_WINDOW = 15;
const msgRateLimits = new Map();

const checkMsgRateLimit = (userId) => {
    const now = Date.now();
    const userLimits = msgRateLimits.get(userId) || [];
    const validTimestamps = userLimits.filter((timestamp) => now - timestamp < MSG_RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= MAX_MSGS_PER_WINDOW) {
        return false;
    }

    validTimestamps.push(now);
    msgRateLimits.set(userId, validTimestamps);
    return true;
};

const populateConversation = async (conversationId) => Conversation.findById(conversationId)
    .populate('participants', 'username fullname avatar isPrivate')
    .lean();

const emitConversationUpdate = async (conversationId, reason) => {
    const conversation = await populateConversation(conversationId);
    if (!conversation) return null;

    conversation.participants.forEach((participant) => {
        getIo().to(`user:${normalizeId(participant._id)}`).emit('chat:conversation:update', {
            reason,
            conversation
        });
    });

    return conversation;
};

const createMessageRequestNotification = async ({ conversationId, recipient, sender, text }) => {
    const existing = await Notification.findOne({
        conversation: conversationId,
        recipient,
        sender,
        type: 'message'
    });

    if (existing) {
        existing.text = text || existing.text;
        existing.read = false;
        existing.createdAt = new Date();
        await existing.save();
        await existing.populate('sender', 'username fullname avatar');
        await existing.populate('conversation', 'participants status lastMessage');
        getIo().to(`user:${normalizeId(recipient)}`).emit('notification:new', existing);
        return existing;
    }

    const notification = new Notification({
        recipient,
        sender,
        type: 'message',
        conversation: conversationId,
        text
    });

    await notification.save();
    await notification.populate('sender', 'username fullname avatar');
    await notification.populate('conversation', 'participants status lastMessage');
    getIo().to(`user:${normalizeId(recipient)}`).emit('notification:new', notification);

    return notification;
};

exports.initiateConversation = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.user._id;

        if (!targetUserId) {
            return res.status(400).json({ message: 'Target user required' });
        }

        const viewerContext = await getViewerContext(currentUserId);
        if (viewerContext.isHiddenUser(targetUserId)) {
            return res.status(403).json({ message: 'This user is unavailable.' });
        }

        await canChat(currentUserId, targetUserId);

        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, targetUserId], $size: 2 }
        });

        if (conversation && conversation.status === 'rejected') {
            const cooldownDays = 7;
            const rejectedDate = new Date(conversation.rejectedAt || 0);
            const diffDays = Math.ceil(Math.abs(Date.now() - rejectedDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays < cooldownDays) {
                return res.status(403).json({
                    message: `Cannot request again. Cooldown active for ${cooldownDays - diffDays} more days.`
                });
            }
        }

        if (conversation && conversation.status !== 'rejected') {
            const hydratedConversation = await populateConversation(conversation._id);
            return res.json(hydratedConversation);
        }

        const [targetUser, currentUser] = await Promise.all([
            User.findById(targetUserId).select('isPrivate').lean(),
            User.findById(currentUserId).select('following').lean()
        ]);

        const isFollowingTarget = currentUser.following?.some((id) => normalizeId(id) === normalizeId(targetUserId));
        if (targetUser?.isPrivate && !isFollowingTarget) {
            return res.status(403).json({ message: 'Account is private. You must follow them to send a request.' });
        }

        if (conversation) {
            conversation.status = 'pending';
            conversation.requestedBy = currentUserId;
            conversation.rejectedAt = undefined;
            await conversation.save();
        } else {
            conversation = new Conversation({
                participants: [currentUserId, targetUserId],
                status: 'pending',
                requestedBy: currentUserId
            });
            await conversation.save();
        }

        const hydratedConversation = await emitConversationUpdate(conversation._id, 'request_created');
        await createMessageRequestNotification({
            conversationId: conversation._id,
            recipient: targetUserId,
            sender: currentUserId,
            text: 'sent you a message request'
        });

        res.json(hydratedConversation);
    } catch (error) {
        console.error('Init Conversation Error:', error);
        res.status(400).json({ message: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const senderId = req.user._id.toString();

        if (!checkMsgRateLimit(senderId)) {
            return res.status(429).json({ message: 'Message rate limit exceeded' });
        }

        if (!content || !content.text || typeof content.text !== 'string') {
            return res.status(400).json({ message: 'Message content required' });
        }

        const trimmedText = content.text.trim();
        if (!trimmedText) {
            return res.status(400).json({ message: 'Message cannot be empty' });
        }

        if (trimmedText.length > 2000) {
            return res.status(400).json({ message: 'Message too long (max 2000 chars)' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const participantIds = conversation.participants.map((id) => normalizeId(id));
        if (!participantIds.includes(senderId)) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const viewerContext = await getViewerContext(senderId);
        const otherUserId = participantIds.find((id) => id !== senderId);
        if (viewerContext.isHiddenUser(otherUserId)) {
            return res.status(403).json({ message: 'This user is unavailable.' });
        }

        await canChat(senderId, otherUserId);

        if (conversation.status === 'rejected') {
            return res.status(403).json({ message: 'Conversation was rejected.' });
        }

        if (conversation.status === 'pending') {
            const requesterId = normalizeId(conversation.requestedBy);
            if (requesterId !== senderId) {
                return res.status(403).json({ message: 'You must accept the request before replying.' });
            }

            const msgCount = await Message.countDocuments({ conversationId, sender: senderId });
            if (msgCount >= 1) {
                return res.status(403).json({ message: 'Request pending. You can only send one initial message.' });
            }
        }

        const newMessage = new Message({
            conversationId,
            sender: senderId,
            content: {
                ...content,
                text: trimmedText
            }
        });
        await newMessage.save();

        conversation.lastMessage = {
            text: trimmedText,
            sender: senderId,
            updatedAt: newMessage.createdAt
        };
        await conversation.save();

        await newMessage.populate('sender', 'username fullname avatar');

        participantIds.forEach((participantId) => {
            getIo().to(`user:${participantId}`).emit('chat:message', newMessage);
        });
        getIo().to(`chat:${conversationId}`).emit('chat:message', newMessage);

        if (conversation.status === 'pending') {
            await createMessageRequestNotification({
                conversationId,
                recipient: otherUserId,
                sender: senderId,
                text: trimmedText
            });
        }

        await emitConversationUpdate(conversationId, 'message_sent');

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, before } = req.query;
        const userId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const participantIds = conversation.participants.map((id) => normalizeId(id));
        if (!participantIds.includes(userId)) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const viewerContext = await getViewerContext(userId);
        const otherUserId = participantIds.find((id) => id !== userId);
        if (viewerContext.isHiddenUser(otherUserId)) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const query = { conversationId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit, 10))
            .populate('sender', 'username fullname avatar')
            .lean();

        res.json(messages.reverse());
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const { type = 'inbox' } = req.query;
        const viewerContext = await getViewerContext(userId);

        const query = {
            participants: userId
        };

        if (type === 'requests') {
            query.status = 'pending';
            query.requestedBy = { $ne: userId };
        } else if (type === 'sent') {
            query.status = 'pending';
            query.requestedBy = userId;
        } else {
            query.status = 'active';
        }

        const conversations = await Conversation.find(query)
            .populate('participants', 'username fullname avatar')
            .sort({ updatedAt: -1 })
            .lean();

        const visibleConversations = conversations.filter((conversation) => {
            const otherUser = conversation.participants.find((participant) => normalizeId(participant._id) !== normalizeId(userId));
            return otherUser ? !viewerContext.isHiddenUser(otherUser._id) : true;
        });

        res.json(visibleConversations);
    } catch (error) {
        console.error('Get Conversations Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        await Message.updateMany(
            { conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        getIo().to(`chat:${conversationId}`).emit('chat:read', {
            conversationId,
            userId,
            readAt: new Date()
        });

        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Mark Read Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.acceptChatRequest = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        if (conversation.status !== 'pending') {
            return res.status(400).json({ message: 'Conversation is not pending' });
        }

        if (normalizeId(conversation.requestedBy) === normalizeId(userId)) {
            return res.status(400).json({ message: 'Cannot accept your own request' });
        }

        conversation.status = 'active';
        conversation.requestedBy = undefined;
        await conversation.save();

        await emitConversationUpdate(conversationId, 'request_accepted');

        res.json({
            message: 'Request accepted',
            conversation: await populateConversation(conversationId)
        });
    } catch (error) {
        console.error('Accept Request Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.rejectChatRequest = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        if (conversation.status !== 'pending') {
            return res.status(400).json({ message: 'Conversation is not pending' });
        }

        if (normalizeId(conversation.requestedBy) === normalizeId(userId)) {
            const participantIds = conversation.participants.map((participantId) => normalizeId(participantId));
            await Notification.deleteMany({ conversation: conversationId, type: 'message' });
            await Conversation.findByIdAndDelete(conversationId);
            participantIds.forEach((participantId) => {
                getIo().to(`user:${participantId}`).emit('chat:conversation:update', {
                    reason: 'request_cancelled',
                    conversation: { _id: conversationId, deleted: true }
                });
            });
            return res.json({ message: 'Request cancelled' });
        }

        conversation.status = 'rejected';
        conversation.rejectedAt = new Date();
        await conversation.save();
        await Notification.deleteMany({ conversation: conversationId, type: 'message' });
        await emitConversationUpdate(conversationId, 'request_rejected');

        res.json({ message: 'Request rejected' });
    } catch (error) {
        console.error('Reject Request Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
