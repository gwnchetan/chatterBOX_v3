const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    fullname: { type: String, required: true },
    password: { type: String }, // Optional if using Google Auth
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },

    // Profile Fields
    avatar: { type: String, default: '' },
    bannerImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
    website: { type: String, default: '' },

    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track followers too
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Saved posts
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Pending follow requests
    isPrivate: { type: Boolean, default: false },
    stories: [
        {
            _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
            mediaUrl: { type: String, required: true },
            mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
            caption: { type: String, default: '' },
            views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            createdAt: { type: Date, default: Date.now }
        }
    ]
});

// Indexes
userSchema.index({ username: 'text', fullname: 'text' }); // Text search
userSchema.index({ blockedUsers: 1 });

module.exports = mongoose.model("User", userSchema);
