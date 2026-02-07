const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        text: String,
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        updatedAt: Date
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String
    },
    groupAvatar: {
        type: String
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'rejected'],
        default: 'active'
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index to find all conversations for a user efficiently
conversationSchema.index({ participants: 1 });

// Index for sorting by last activity
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
