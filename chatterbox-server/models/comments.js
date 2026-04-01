const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    likeCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for fetching comments of a post, sorted by time
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
