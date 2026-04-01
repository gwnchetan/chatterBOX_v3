const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'comment', 'follow', 'message', 'request', 'reply', 'comment_like'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // Optional, for like/comment
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, // Optional, for comment
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    text: { type: String }, // Optional message/content
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Indexing for faster retrieval
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
