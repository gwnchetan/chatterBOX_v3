const User = require('../models/users');
const Post = require('../models/posts');
const Notification = require('../models/notifications');
const { getIo } = require('../socket');
const mongoose = require('mongoose');

/**
 * Fetch a user's profile details and stats
 * GET /api/users/:userId
 */
exports.getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const user = await User.findById(userId)
            .select('-password -email -blockedUsers')
            .populate('following', 'username fullname avatar');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check relationship with current user
        let followStatus = 'none';
        if (req.user) {
            const currentUserId = req.user._id.toString();
            // Check followers list (assuming we maintain it now) OR checking current user's following list
            const currentUser = await User.findById(currentUserId).select('following');
            if (currentUser.following.includes(userId)) {
                followStatus = 'following';
            } else if (user.followRequests && user.followRequests.includes(currentUserId)) {
                followStatus = 'requested';
            }
        }

        // Aggregate stats
        const postCount = await Post.countDocuments({ author: userId, isDeleted: false });
        // Accurate follower count from DB
        const followerCount = await User.countDocuments({ following: userId });
        const followingCount = user.following.length;

        res.json({
            user: {
                ...user.toObject(),
                followStatus,
                stats: {
                    posts: postCount,
                    followers: followerCount,
                    following: followingCount
                }
            }
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Fetch posts authored by a specific user
 * GET /api/users/:userId/posts
 */
exports.getUserPosts = async (req, res) => {
    try {
        const { userId: rawUserId } = req.params;
        const userId = rawUserId.trim();
        const { cursor, limit = 12 } = req.query;
        // Check current user from request (middleware populates this)
        const currentUserId = req.user ? req.user._id.toString() : null;

        const limitNum = parseInt(limit);

        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        // Privacy Check
        // If user is private AND requester is not the user themselves
        if (targetUser.isPrivate && (!currentUserId || userId !== currentUserId)) {
            // Check if current user follows targetUser
            const currentUser = await User.findById(currentUserId);
            const isFollowing = currentUser && currentUser.following.some(id => id.toString() === userId);

            if (!isFollowing) {
                console.log(`Access Denied: User ${currentUserId} tried to access private posts of ${userId}`);
                return res.status(403).json({ message: 'This account is private', isPrivate: true });
            }
        }

        const query = {
            author: userId,
            isDeleted: false
        };

        // Handle cursor pagination
        if (cursor) {
            const [date, id] = cursor.split('_');
            query.$or = [
                { createdAt: { $lt: new Date(date) } },
                {
                    createdAt: new Date(date),
                    _id: { $lt: id }
                }
            ];
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limitNum)
            .populate('author', 'username fullname avatar');

        let nextCursor = null;
        if (posts.length === limitNum) {
            const lastPost = posts[posts.length - 1];
            nextCursor = `${lastPost.createdAt.toISOString()}_${lastPost._id}`;
        }

        res.json({
            posts,
            nextCursor
        });

    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Update user profile details
 * PATCH /api/users/profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; // From authMiddleware
        const { fullname, bio, location, website, avatar, bannerImage } = req.body;

        const updateFields = {};
        if (fullname) updateFields.fullname = fullname;
        if (bio !== undefined) updateFields.bio = bio;
        if (location !== undefined) updateFields.location = location;
        if (website !== undefined) updateFields.website = website;
        if (avatar) updateFields.avatar = avatar;
        if (bannerImage) updateFields.bannerImage = bannerImage;
        if (req.body.isPrivate !== undefined) updateFields.isPrivate = req.body.isPrivate;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-password -email -blockedUsers');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Follow a user
 * POST /api/users/:userId/follow
 */
exports.followUser = async (req, res) => {
    try {
        let { userId } = req.params; // Target user
        userId = userId.trim();
        const currentUserId = req.user._id.toString();

        if (userId === currentUserId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // Check if already following
        // Using countDocuments is faster than retrieving the array
        const currentUser = await User.findById(currentUserId);
        if (currentUser.following.includes(userId)) {
            return res.status(400).json({ message: "Already following", status: 'following' });
        }

        // 1. Private Account Logic
        if (targetUser.isPrivate) {
            if (targetUser.followRequests && targetUser.followRequests.includes(currentUserId)) {
                return res.json({ message: "Request already sent", status: 'requested' });
            }

            // Send Request
            await User.findByIdAndUpdate(userId, {
                $addToSet: { followRequests: currentUserId }
            });

            // Notification
            const notif = new Notification({
                recipient: userId,
                sender: currentUserId,
                type: 'request'
            });
            await notif.save();
            await notif.populate('sender', 'username fullname avatar');
            try {
                getIo().to(`user:${userId}`).emit('notification:new', notif);
            } catch (e) { console.error("Socket emit fail", e); }

            return res.json({ message: "Follow request sent", status: 'requested' });
        }

        // 2. Public Account Logic
        await Promise.all([
            User.findByIdAndUpdate(currentUserId, { $addToSet: { following: userId } }),
            User.findByIdAndUpdate(userId, { $addToSet: { followers: currentUserId } })
        ]);

        // Notification
        const notif = new Notification({
            recipient: userId,
            sender: currentUserId,
            type: 'follow'
        });
        await notif.save();
        await notif.populate('sender', 'username fullname avatar');
        try {
            getIo().to(`user:${userId}`).emit('notification:new', notif);
        } catch (e) { console.error("Socket emit fail", e); }

        res.json({ message: "Followed successfully", status: 'following' });
    } catch (error) {
        console.error("Error following user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Unfollow a user
 * POST /api/users/:userId/unfollow
 */
exports.unfollowUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user._id;

        await Promise.all([
            User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } }),
            User.findByIdAndUpdate(userId, {
                $pull: { followers: currentUserId, followRequests: currentUserId }
            })
        ]);

        res.json({ message: "Unfollowed successfully", status: 'none' });
    } catch (error) {
        console.error("Error unfollowing user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Accept follow request
 * POST /api/users/:userId/accept
 * Note: userId here is the REQUESTER (the person who wants to follow me)
 */
exports.acceptFollowRequest = async (req, res) => {
    try {
        const requesterId = req.params.userId;
        const currentUserId = req.user._id;

        // Verify request exists
        const currentUser = await User.findById(currentUserId);
        if (!currentUser.followRequests.includes(requesterId)) {
            return res.status(404).json({ message: "Request not found" });
        }

        await Promise.all([
            // Add to followers of current user
            User.findByIdAndUpdate(currentUserId, {
                $addToSet: { followers: requesterId },
                $pull: { followRequests: requesterId }
            }),
            // Add to following of requester
            User.findByIdAndUpdate(requesterId, {
                $addToSet: { following: currentUserId }
            })
        ]);

        // Send Notification to Requester
        const notif = new Notification({
            recipient: requesterId,
            sender: currentUserId,
            type: 'follow',
            text: 'accepted your follow request'
        });
        await notif.save();
        await notif.populate('sender', 'username fullname avatar');

        try {
            getIo().to(`user:${requesterId}`).emit('notification:new', notif);
        } catch (e) { console.error(e) }

        res.json({ message: "Request accepted" });

    } catch (error) {
        console.error("Error accepting request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Reject follow request
 * POST /api/users/:userId/reject
 */
exports.rejectFollowRequest = async (req, res) => {
    try {
        const requesterId = req.params.userId;
        const currentUserId = req.user._id;

        await User.findByIdAndUpdate(currentUserId, {
            $pull: { followRequests: requesterId }
        });

        res.json({ message: "Request rejected" });
    } catch (error) {
        console.error("Error rejecting request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Search users
 * GET /api/users/search?q=query
 */
exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ users: [] });

        const users = await User.find({
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { fullname: { $regex: q, $options: 'i' } }
            ]
        }).select('username fullname avatar bio').limit(10);

        res.json({ users });
    } catch (error) {
        console.error("Error searching users:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.savePost = async (req, res) => {
    try {
        const userId = req.user._id;
        const { postId } = req.params;

        await User.findByIdAndUpdate(userId, {
            $addToSet: { savedPosts: postId }
        });

        res.json({ message: "Post saved" });
    } catch (error) {
        console.error("Error saving post:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.unsavePost = async (req, res) => {
    try {
        const userId = req.user._id;
        const { postId } = req.params;

        await User.findByIdAndUpdate(userId, {
            $pull: { savedPosts: postId }
        });

        res.json({ message: "Post unsaved" });
    } catch (error) {
        console.error("Error unsaving post:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.getSavedPosts = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).populate({
            path: 'savedPosts',
            populate: { path: 'author', select: 'username fullname avatar' }
        });

        // Filter out null/deleted posts
        const posts = user.savedPosts.filter(p => p && !p.isDeleted).reverse();

        res.json({ posts });
    } catch (error) {
        console.error("Error fetching saved posts:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
