const mongoose = require('mongoose');

const relationshipSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'blocked', 'muted'],
        default: 'pending'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Compound Indexes for high-performance lookups
// 1. Unique constraint: A user can only have one relationship state with another user
relationshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// 2. Fast fetch for "My Followers" (recipient perspective)
relationshipSchema.index({ recipient: 1, status: 1 });

// 3. Fast fetch for "Who I am Following" (requester perspective)
relationshipSchema.index({ requester: 1, status: 1 });

module.exports = mongoose.model('Relationship', relationshipSchema);
