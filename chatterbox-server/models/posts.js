const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: false
    },
    media: [{
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['image', 'video', 'gif'],
            required: true
        },
        // Layout & Playback Metadata (Explicit)
        width: Number,          // Final Rendered Width
        height: Number,         // Final Rendered Height
        aspectRatio: Number,    // Layout Ratio (height/width)
        originalRatio: Number,  // Native Video Ratio
        rotation: {
            type: Number,
            default: 0
        },
        duration: Number,       // In seconds
        thumbnailUrl: String,

        metadata: {
            type: mongoose.Schema.Types.Mixed
        }
    }],
    mediaCount: {
        type: Number,
        default: 0
    },
    visibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public'
    },
    likeCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    engagementScore: {
        type: Number,
        default: 0
    },
    lastInteractionAt: {
        type: Date
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    }
}, {
    timestamps: true // adds createdAt and updatedAt
});

// Indexes for performance and feed logic
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1, createdAt: -1 });

// Partial index for engagement score (ignore private or deleted posts)
postSchema.index(
    { engagementScore: -1 },
    { partialFilterExpression: { isDeleted: false, visibility: { $ne: 'private' } } }
);

module.exports = mongoose.model('Post', postSchema);
