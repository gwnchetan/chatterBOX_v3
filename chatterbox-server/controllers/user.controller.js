const User = require('../models/users');
const Post = require('../models/posts');
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

        // Aggregate stats
        const postCount = await Post.countDocuments({ author: userId, isDeleted: false });
        const followerCount = await User.countDocuments({ following: userId });
        const followingCount = user.following.length;

        res.json({
            user: {
                ...user.toObject(),
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
        const { userId } = req.params;
        const { cursor, limit = 12 } = req.query;
        const limitNum = parseInt(limit);

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
        const { userId } = req.params; // ID of user to follow
        const currentUserId = req.user._id;

        if (userId === currentUserId.toString()) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        // Add to current user's following list
        await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { following: userId }
        });

        res.json({ message: "Followed successfully" });
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

        await User.findByIdAndUpdate(currentUserId, {
            $pull: { following: userId }
        });

        res.json({ message: "Unfollowed successfully" });
    } catch (error) {
        console.error("Error unfollowing user:", error);
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
