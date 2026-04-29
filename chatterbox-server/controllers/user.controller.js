const mongoose = require('mongoose');
const User = require('../models/users');
const Post = require('../models/posts');
const Like = require('../models/likes');
const Notification = require('../models/notifications');
const { getIo } = require('../socket');
const { getViewerContext, getBlockState, normalizeId } = require('../utils/privacy');

const POST_AUTHOR_FIELDS = 'username fullname avatar isPrivate';

const buildPostStatuses = async (posts, viewerId, viewerContext) => {
    if (!viewerId || posts.length === 0) {
        return posts;
    }

    const postIds = posts.map((post) => post._id);
    const [userLikes, userReposts] = await Promise.all([
        Like.find({ post: { $in: postIds }, user: viewerId }).select('post').lean(),
        Post.find({ repostOf: { $in: postIds }, author: viewerId }).select('repostOf').lean()
    ]);

    const likedPostIds = new Set(userLikes.map((like) => normalizeId(like.post)));
    const repostedPostIds = new Set(userReposts.map((repost) => normalizeId(repost.repostOf)));

    return posts.map((post) => ({
        ...post,
        liked: likedPostIds.has(normalizeId(post._id)),
        reposted: repostedPostIds.has(normalizeId(post._id)),
        saved: viewerContext.savedPostIds.has(normalizeId(post._id)),
        isRepost: !!post.repostOf,
        originalPost: post.repostOf || null
    }));
};

const emitFollowStatusUpdate = (targetUserId, currentUserId, status) => {
    try {
        getIo().to(`user:${targetUserId}`).emit('user:follow_status_update', {
            targetUserId: currentUserId,
            status
        });
    } catch (error) {
        console.error('Socket emit failed', error);
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        if (req.user) {
            const blockState = await getBlockState(req.user._id, userId);
            if (blockState.blocked) {
                return res.status(404).json({ message: 'User not found' });
            }
        }

        const user = await User.findById(userId)
            .select('-password -email -blockedUsers')
            .populate('following', 'username fullname avatar')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let followStatus = 'none';
        if (req.user) {
            const currentUserId = req.user._id.toString();
            const currentUser = await User.findById(currentUserId)
                .select('following')
                .lean();

            if (currentUser?.following?.some((id) => normalizeId(id) === userId)) {
                followStatus = 'following';
            } else if (user.followRequests?.some((id) => normalizeId(id) === currentUserId)) {
                followStatus = 'requested';
            }
        }

        const [postCount, followerCount] = await Promise.all([
            Post.countDocuments({ author: userId, isDeleted: false }),
            User.countDocuments({ following: userId })
        ]);

        res.json({
            user: {
                ...user,
                followStatus,
                stats: {
                    posts: postCount,
                    followers: followerCount,
                    following: user.following.length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getUserPosts = async (req, res) => {
    try {
        const { userId: rawUserId } = req.params;
        const userId = rawUserId.trim();
        const viewerId = req.user?._id;
        const { cursor, limit = 12 } = req.query;
        const limitNum = parseInt(limit, 10);

        const targetUser = await User.findById(userId).select('isPrivate').lean();
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        let viewerContext = null;
        if (viewerId) {
            const blockState = await getBlockState(viewerId, userId);
            if (blockState.blocked) {
                return res.status(404).json({ message: 'User not found' });
            }
            viewerContext = await getViewerContext(viewerId);
        }

        const canViewPrivatePosts = !targetUser.isPrivate
            || normalizeId(viewerId) === userId
            || viewerContext?.followingIds.has(userId);

        if (!canViewPrivatePosts) {
            return res.status(403).json({ message: 'This account is private', isPrivate: true });
        }

        const query = {
            author: userId,
            isDeleted: false
        };

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

        const rawPosts = await Post.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limitNum + 5)
            .populate('author', POST_AUTHOR_FIELDS)
            .populate({
                path: 'repostOf',
                populate: { path: 'author', select: POST_AUTHOR_FIELDS }
            })
            .lean();

        const visiblePosts = viewerContext
            ? rawPosts.filter((post) => viewerContext.canSeePost(post)).slice(0, limitNum)
            : rawPosts.slice(0, limitNum);

        const posts = viewerContext
            ? await buildPostStatuses(visiblePosts, viewerId, viewerContext)
            : visiblePosts;

        let nextCursor = null;
        if (posts.length === limitNum) {
            const lastPost = posts[posts.length - 1];
            nextCursor = `${lastPost.createdAt.toISOString()}_${lastPost._id}`;
        }

        res.json({ posts, nextCursor });
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
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

exports.followUser = async (req, res) => {
    try {
        const targetUserId = req.params.userId.trim();
        const currentUserId = req.user._id.toString();

        if (targetUserId === currentUserId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const [targetUser, currentUser] = await Promise.all([
            User.findById(targetUserId).select('isPrivate followRequests blockedUsers').lean(),
            User.findById(currentUserId).select('following blockedUsers').lean()
        ]);

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const blockState = await getBlockState(currentUserId, targetUserId);
        if (blockState.blocked) {
            return res.status(403).json({ message: 'This user is unavailable.' });
        }

        if (currentUser.following.some((id) => normalizeId(id) === targetUserId)) {
            return res.status(400).json({ message: 'Already following', status: 'following' });
        }

        if (targetUser.isPrivate) {
            if (targetUser.followRequests?.some((id) => normalizeId(id) === currentUserId)) {
                return res.json({ message: 'Request already sent', status: 'requested' });
            }

            await User.findByIdAndUpdate(targetUserId, {
                $addToSet: { followRequests: currentUserId }
            });

            const existingNotif = await Notification.findOne({
                recipient: targetUserId,
                sender: currentUserId,
                type: 'request',
                read: false
            });

            if (existingNotif) {
                existingNotif.createdAt = new Date();
                await existingNotif.save();
                await existingNotif.populate('sender', 'username fullname avatar');
                getIo().to(`user:${targetUserId}`).emit('notification:new', existingNotif);
            } else {
                const notif = new Notification({
                    recipient: targetUserId,
                    sender: currentUserId,
                    type: 'request'
                });
                await notif.save();
                await notif.populate('sender', 'username fullname avatar');
                getIo().to(`user:${targetUserId}`).emit('notification:new', notif);
            }

            return res.json({ message: 'Follow request sent', status: 'requested' });
        }

        await Promise.all([
            User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } }),
            User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } })
        ]);

        const existingNotif = await Notification.findOne({
            recipient: targetUserId,
            sender: currentUserId,
            type: 'follow',
            read: false
        });

        if (existingNotif) {
            existingNotif.createdAt = new Date();
            await existingNotif.save();
            await existingNotif.populate('sender', 'username fullname avatar');
            getIo().to(`user:${targetUserId}`).emit('notification:new', existingNotif);
        } else {
            const notif = new Notification({
                recipient: targetUserId,
                sender: currentUserId,
                type: 'follow'
            });
            await notif.save();
            await notif.populate('sender', 'username fullname avatar');
            getIo().to(`user:${targetUserId}`).emit('notification:new', notif);
        }

        res.json({ message: 'Followed successfully', status: 'following' });
    } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.unfollowUser = async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.user._id;

        await Promise.all([
            User.findByIdAndUpdate(currentUserId, {
                $pull: { following: targetUserId }
            }),
            User.findByIdAndUpdate(targetUserId, {
                $pull: { followers: currentUserId, followRequests: currentUserId }
            })
        ]);

        await Notification.deleteMany({
            recipient: targetUserId,
            sender: currentUserId,
            type: { $in: ['follow', 'request'] }
        });

        emitFollowStatusUpdate(targetUserId, currentUserId, 'none');

        res.json({ message: 'Unfollowed successfully', status: 'none' });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.acceptFollowRequest = async (req, res) => {
    try {
        const requesterId = req.params.userId;
        const currentUserId = req.user._id;

        const blockState = await getBlockState(currentUserId, requesterId);
        if (blockState.blocked) {
            return res.status(403).json({ message: 'This user is unavailable.' });
        }

        const currentUser = await User.findById(currentUserId).select('followRequests').lean();
        if (!currentUser?.followRequests?.some((id) => normalizeId(id) === requesterId)) {
            return res.status(404).json({ message: 'Request not found' });
        }

        await Promise.all([
            User.findByIdAndUpdate(currentUserId, {
                $addToSet: { followers: requesterId },
                $pull: { followRequests: requesterId }
            }),
            User.findByIdAndUpdate(requesterId, {
                $addToSet: { following: currentUserId }
            })
        ]);

        await Notification.deleteMany({
            recipient: currentUserId,
            sender: requesterId,
            type: 'request'
        });

        const notif = new Notification({
            recipient: requesterId,
            sender: currentUserId,
            type: 'follow',
            text: 'accepted your follow request'
        });

        await notif.save();
        await notif.populate('sender', 'username fullname avatar');

        getIo().to(`user:${requesterId}`).emit('notification:new', notif);
        emitFollowStatusUpdate(requesterId, currentUserId, 'following');

        res.json({ message: 'Request accepted' });
    } catch (error) {
        console.error('Error accepting request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.rejectFollowRequest = async (req, res) => {
    try {
        const requesterId = req.params.userId;
        const currentUserId = req.user._id;

        await User.findByIdAndUpdate(currentUserId, {
            $pull: { followRequests: requesterId }
        });

        await Notification.deleteMany({
            recipient: currentUserId,
            sender: requesterId,
            type: 'request'
        });

        emitFollowStatusUpdate(requesterId, currentUserId, 'none');

        res.json({ message: 'Request rejected' });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ users: [] });
        }

        const viewerContext = await getViewerContext(req.user._id);
        const users = await User.find({
            _id: { $nin: Array.from(viewerContext.hiddenUserIds) },
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { fullname: { $regex: q, $options: 'i' } }
            ]
        })
            .select('username fullname avatar bio isPrivate')
            .limit(10)
            .lean();

        res.json({ users });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.savePost = async (req, res) => {
    try {
        const userId = req.user._id;
        const { postId } = req.params;

        await User.findByIdAndUpdate(userId, {
            $addToSet: { savedPosts: postId }
        });

        res.json({ message: 'Post saved' });
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.unsavePost = async (req, res) => {
    try {
        const userId = req.user._id;
        const { postId } = req.params;

        await User.findByIdAndUpdate(userId, {
            $pull: { savedPosts: postId }
        });

        res.json({ message: 'Post unsaved' });
    } catch (error) {
        console.error('Error unsaving post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getSavedPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const viewerContext = await getViewerContext(userId);

        const user = await User.findById(userId)
            .populate({
                path: 'savedPosts',
                match: { isDeleted: false },
                populate: [
                    { path: 'author', select: POST_AUTHOR_FIELDS },
                    {
                        path: 'repostOf',
                        populate: { path: 'author', select: POST_AUTHOR_FIELDS }
                    }
                ]
            })
            .lean();

        const rawPosts = (user?.savedPosts || []).filter(Boolean);
        const visiblePosts = rawPosts.filter((post) => viewerContext.canSeePost(post));
        const posts = await buildPostStatuses(visiblePosts, userId, viewerContext);

        res.json({ posts: posts.reverse() });
    } catch (error) {
        console.error('Error fetching saved posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getFollowing = async (req, res) => {
    try {
        const userId = req.user._id;
        const viewerContext = await getViewerContext(userId);
        const user = await User.findById(userId)
            .populate('following', 'username fullname avatar isPrivate')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const following = (user.following || []).filter((followedUser) => !viewerContext.isHiddenUser(followedUser._id));
        res.json({ following });
    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const currentUserId = req.user._id.toString();
        const targetUserId = req.params.userId.trim();

        if (currentUserId === targetUserId) {
            return res.status(400).json({ message: 'You cannot block yourself' });
        }

        const targetUser = await User.findById(targetUserId).select('_id').lean();
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await Promise.all([
            User.findByIdAndUpdate(currentUserId, {
                $addToSet: { blockedUsers: targetUserId },
                $pull: { following: targetUserId, followers: targetUserId, followRequests: targetUserId }
            }),
            User.findByIdAndUpdate(targetUserId, {
                $pull: { following: currentUserId, followers: currentUserId, followRequests: currentUserId }
            })
        ]);

        await Notification.deleteMany({
            $or: [
                { sender: currentUserId, recipient: targetUserId },
                { sender: targetUserId, recipient: currentUserId }
            ]
        });

        emitFollowStatusUpdate(targetUserId, currentUserId, 'blocked');
        emitFollowStatusUpdate(currentUserId, targetUserId, 'blocked');

        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.unblockUser = async (req, res) => {
    try {
        const currentUserId = req.user._id.toString();
        const targetUserId = req.params.userId.trim();

        await User.findByIdAndUpdate(currentUserId, {
            $pull: { blockedUsers: targetUserId }
        });

        emitFollowStatusUpdate(targetUserId, currentUserId, 'none');

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getBlockedUsers = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('blockedUsers', 'username fullname avatar')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ blockedUsers: user.blockedUsers || [] });
    } catch (error) {
        console.error('Error fetching blocked users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Stories
const STORY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24hrs

const isStoryActive = (story) => (
    Date.now() - new Date(story.createdAt).getTime() < STORY_EXPIRY_MS
);

const getActiveStories = (stories = []) => (
    stories
        .filter((story) => isStoryActive(story))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
);

const buildStoryPayload = (user, stories) => ({
    userId: user._id,
    username: user.username,
    fullname: user.fullname,
    avatar: user.avatar,
    isPrivate: !!user.isPrivate,
    stories
});

const canViewStoriesForUser = (targetUserId, targetIsPrivate, viewerId, viewerContext) => {
    if (!targetUserId) return false;

    const normalizedTargetId = normalizeId(targetUserId);
    const normalizedViewerId = normalizeId(viewerId);

    if (normalizedTargetId === normalizedViewerId) {
        return true;
    }

    if (!targetIsPrivate) {
        return true;
    }

    return !!viewerContext?.followingIds?.has(normalizedTargetId);
};

// POST /api/users/story
exports.uploadStory = async (req, res) => {
    try {
        const { mediaUrl, mediaType, caption } = req.body;
        if (!mediaUrl) {
            return res.status(400).json({ message: 'Media required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.stories = getActiveStories(user.stories);
        user.stories.push({
            mediaUrl,
            mediaType,
            caption: typeof caption === 'string' ? caption.trim() : ''
        });
        await user.save();

        res.status(201).json({
            message: 'Story uploaded',
            stories: getActiveStories(user.stories)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/users/story/feed
exports.getStoryFeed = async (req, res) => {
    try {
        const viewerId = normalizeId(req.user._id);
        const viewerContext = await getViewerContext(req.user._id);
        const followingIds = Array.from(viewerContext.followingIds);
        const hiddenUserIds = Array.from(viewerContext.hiddenUserIds);

        const userQuery = {
            _id: { $ne: viewerId },
            'stories.0': { $exists: true },
            $or: [
                { isPrivate: false },
                { _id: { $in: followingIds } }
            ]
        };

        if (hiddenUserIds.length > 0) {
            userQuery._id.$nin = hiddenUserIds;
        }

        const users = await User.find(userQuery)
            .select('username fullname avatar isPrivate stories')
            .lean();

        const feed = users
            .map((user) => {
                const activeStories = getActiveStories(user.stories);
                return {
                    ...buildStoryPayload(user, activeStories),
                    latestStoryAt: activeStories[activeStories.length - 1]?.createdAt || null
                };
            })
            .filter((user) => user.stories.length > 0)
            .sort((a, b) => new Date(b.latestStoryAt) - new Date(a.latestStoryAt))
            .map(({ latestStoryAt, ...user }) => user);

        res.json(feed);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/users/story/:userId
exports.getUserStories = async (req, res) => {
    try {
        const targetUserId = req.params.userId.trim();
        const viewerId = normalizeId(req.user._id);

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const blockState = await getBlockState(req.user._id, targetUserId);
        if (blockState.blocked) {
            return res.status(404).json({ message: 'User not found' });
        }

        const viewerContext = await getViewerContext(req.user._id);
        const user = await User.findById(targetUserId)
            .select('username fullname avatar isPrivate stories')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!canViewStoriesForUser(user._id, user.isPrivate, viewerId, viewerContext)) {
            return res.status(403).json({ message: 'This account is private', isPrivate: true });
        }

        const activeStories = getActiveStories(user.stories);
        res.json(buildStoryPayload(user, activeStories));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/users/story/:storyId
exports.deleteStory = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const story = user.stories.id(req.params.storyId);
        if (!story) {
            return res.status(404).json({ message: 'Story not found' });
        }

        story.deleteOne();
        await user.save();

        res.json({ message: 'Story deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/users/story/:userId/:storyId/view
exports.viewStory = async (req, res) => {
    try {
        const targetUserId = req.params.userId.trim();
        const viewerId = normalizeId(req.user._id);

        if (!mongoose.Types.ObjectId.isValid(targetUserId) || !mongoose.Types.ObjectId.isValid(req.params.storyId)) {
            return res.status(400).json({ message: 'Invalid story request' });
        }

        const blockState = await getBlockState(req.user._id, targetUserId);
        if (blockState.blocked) {
            return res.status(404).json({ message: 'User not found' });
        }

        const viewerContext = await getViewerContext(req.user._id);
        const user = await User.findById(targetUserId).select('isPrivate stories');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!canViewStoriesForUser(user._id, user.isPrivate, viewerId, viewerContext)) {
            return res.status(403).json({ message: 'This account is private', isPrivate: true });
        }

        const story = user.stories.id(req.params.storyId);
        if (!story || !isStoryActive(story)) {
            return res.status(404).json({ message: 'Story not found' });
        }

        const alreadyViewed = story.views.some((storyViewerId) => normalizeId(storyViewerId) === viewerId);
        if (!alreadyViewed && normalizeId(user._id) !== viewerId) {
            story.views.push(req.user._id);
            await user.save();
        }

        res.json({ message: 'Viewed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
