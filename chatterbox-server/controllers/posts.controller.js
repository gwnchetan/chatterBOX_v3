const Post = require('../models/posts');
const User = require('../models/users');
const Like = require('../models/likes');
const Comment = require('../models/comments');
const { deleteMedia, generateSignature } = require('../utils/cloudinary');

// Simple in-memory rate limiter per instance (Temporary)
// TODO: Replace with Redis-based rate limiter in production environment
// to handle multiple instances and server restarts.
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_POSTS_PER_WINDOW = 5;
const postRateLimits = new Map();
const blockCache = new Map(); // Key: userId, Value: { blockedBy: [], timestamp: number }
const BLOCK_CACHE_TTL = 60 * 1000; // 60 seconds

const checkRateLimit = (userId) => {
    const now = Date.now();
    const userLimits = postRateLimits.get(userId) || [];

    // Filter out old timestamps
    const validTimestamps = userLimits.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= MAX_POSTS_PER_WINDOW) {
        return false;
    }

    validTimestamps.push(now);
    postRateLimits.set(userId, validTimestamps);
    return true;
};

exports.createPost = async (req, res) => {
    try {
        const { content, media, visibility } = req.body;
        const userId = req.user._id; // Assuming auth middleware populates req.user

        // 1. Rate Limiting
        if (!checkRateLimit(userId.toString())) {
            return res.status(429).json({ message: 'Post rate limit exceeded. Please try again later.' });
        }

        // 2. Strict Validation
        if (!content && (!media || media.length === 0)) {
            return res.status(400).json({ message: 'Post must contain content or media.' });
        }

        if (media && media.length > 4) {
            return res.status(400).json({ message: 'Maximum 4 media items allowed.' });
        }

        if (media && media.length > 0) {
            for (const item of media) {
                if (!item.url || !item.publicId || !item.type) {
                    return res.status(400).json({ message: 'Invalid media format. Missing url, publicId, or type.' });
                }

                // Validate URL domain (Strict check)
                // Must be https, cloudinary.com, and belong to our cloud name
                const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
                if (!item.url.startsWith('https://') ||
                    !item.url.includes('cloudinary.com') ||
                    (cloudName && !item.url.includes(cloudName))) {
                    return res.status(400).json({ message: 'Invalid media source. Must be a secure Cloudinary URL from the authorized cloud.' });
                }
            }
        }

        const validVisibilities = ['public', 'followers', 'private'];
        const postVisibility = validVisibilities.includes(visibility) ? visibility : 'public';

        // 3. Create Document
        const newPost = new Post({
            author: userId,
            content,
            media: media || [],
            mediaCount: media ? media.length : 0,
            visibility: postVisibility,
            createdAt: new Date(),
            likeCount: 0,
            commentCount: 0,
            engagementScore: 0
        });

        await newPost.save();

        res.status(201).json(newPost);

    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Internal server error while creating post.' });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const post = await Post.findOne({ _id: id, author: userId });

        if (!post) {
            return res.status(404).json({ message: 'Post not found or unauthorized.' });
        }

        // Soft Delete
        post.isDeleted = true;
        await post.save();

        // Async Cleanup (Fire-and-forget)
        if (post.media && post.media.length > 0) {
            post.media.forEach(item => {
                if (item.publicId) {
                    // Map our schema types to Cloudinary resource types
                    // 'video' -> 'video'
                    // 'image', 'gif' -> 'image'
                    const resourceType = item.type === 'video' ? 'video' : 'image';
                    deleteMedia(item.publicId, resourceType);
                }
            });
        }

        res.json({ message: 'Post deleted successfully.' });

    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Internal server error during post deletion.' });
    }
};

exports.getFeed = async (req, res) => {
    try {
        const userId = req.user._id;
        const { cursor, limit = 20 } = req.query;
        const limitNum = parseInt(limit);

        // 1. Block Logic
        // Fetch users blocked by current user
        const currentUser = await User.findById(userId).populate('blockedUsers');
        const blockedByMe = currentUser.blockedUsers.map(u => u._id.toString());

        // Fetch users who blocked current user
        // Optimization: In-memory cache with fallback
        let blockedMe = [];
        const cachedBlock = blockCache.get(userId.toString());
        const now = Date.now();

        if (cachedBlock && (now - cachedBlock.timestamp < BLOCK_CACHE_TTL)) {
            blockedMe = cachedBlock.blockedBy;
        } else {
            try {
                const blockedMeUsers = await User.find({ blockedUsers: userId }).select('_id');
                blockedMe = blockedMeUsers.map(u => u._id.toString());
                blockCache.set(userId.toString(), { blockedBy: blockedMe, timestamp: now });
            } catch (err) {
                console.error('Error fetching blocked-me users, passing empty list to avoid feed break:', err);
                // Fallback: If DB fails, we proceed with empty list to not break the feed
                blockedMe = [];
            }
        }

        const blockedSet = new Set([...blockedByMe, ...blockedMe]);

        // 2. Query Setup
        const query = {
            isDeleted: false,
            author: { $nin: Array.from(blockedSet) }
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

        // 3. Application-Level Filter Loop
        // Deterministic buffer rule: limit + 50%
        // This ensures we have enough posts after filtering (private/blocks) without over-fetching
        const fetchLimit = limitNum + Math.ceil(limitNum * 0.5);

        const posts = await Post.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(fetchLimit)
            .populate('author', 'username fullname avatar') // Populate author details
            .populate({
                path: 'repostOf',
                populate: { path: 'author', select: 'username fullname avatar' }
            });

        const validPosts = [];
        const followingStr = currentUser.following.map(id => id.toString());

        for (const post of posts) {
            // Visibility Logic
            if (post.visibility === 'public') {
                validPosts.push(post);
            } else if (post.visibility === 'followers') {
                if (followingStr.includes(post.author._id.toString()) || post.author._id.toString() === userId.toString()) {
                    validPosts.push(post);
                }
            } else if (post.visibility === 'private') {
                if (post.author._id.toString() === userId.toString()) {
                    validPosts.push(post);
                }
            }

            if (validPosts.length >= limitNum) break;
        }

        // 4. Cursor Generation
        let nextCursor = null;
        if (validPosts.length > 0) {
            const lastPost = validPosts[validPosts.length - 1];
            nextCursor = `${lastPost.createdAt.toISOString()}_${lastPost._id}`;
        }

        // If we exhausted fetched posts but still have more in DB, cursor logic holds true 
        // because we sort by createdAt. 

        // 5. Hydrate with "isLiked" status
        // Efficiently find which of these posts the user has liked
        const postIds = validPosts.map(p => p._id);
        const userLikes = await Like.find({ post: { $in: postIds }, user: userId }).select('post');
        const likedPostIds = new Set(userLikes.map(l => l.post.toString()));

        const hydratedPosts = validPosts.map(post => ({
            ...post.toObject(),
            isLiked: likedPostIds.has(post._id.toString())
        }));

        res.json({
            posts: hydratedPosts,
            nextCursor: posts.length > validPosts.length ? nextCursor : (posts.length < fetchLimit ? null : nextCursor)
        });

    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).json({ message: 'Internal server error while fetching feed.' });
    }
};
exports.getUploadSignature = (req, res) => {
    try {
        const timestamp = Math.round((new Date()).getTime() / 1000);
        const paramsToSign = {
            timestamp: timestamp,
            // folder: 'chatterbox_posts' // Optional: Organize in folders
        };

        const signature = generateSignature(paramsToSign);

        // Debug Log
        console.log("Generating Signature. Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "Found" : "Missing");
        console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Found" : "Missing");

        res.json({
            signature,
            timestamp,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME
        });
    } catch (error) {
        console.error('Error generating signature:', error);
        res.status(500).json({ message: 'Error generating upload signature.' });
    }
};

/**
 * Get Explore Feed (Random/Popular posts)
 * GET /api/posts/explore
 */
exports.getExploreFeed = async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 20 } = req.query;

        // Fetch public posts NOT from current user
        // Using sample for randomness
        const posts = await Post.aggregate([
            { $match: { visibility: 'public', isDeleted: false, author: { $ne: userId } } },
            { $sample: { size: parseInt(limit) } },
            { $sort: { createdAt: -1 } },
            { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author' } },
            { $unwind: '$author' },
            { $project: { 'author.password': 0, 'author.email': 0, 'author.blockedUsers': 0 } }
        ]);

        res.json({ posts });
    } catch (error) {
        console.error("Error fetching explore feed:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Search posts by content (keywords, hashtags)
 * GET /api/posts/search?q=query
 */
exports.searchPosts = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q) return res.json({ posts: [] });

        // Simple regex search (case-insensitive)
        const posts = await Post.find({
            content: { $regex: q, $options: 'i' },
            visibility: 'public',
            isDeleted: false
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('author', 'username fullname avatar');

        res.json({ posts });
    } catch (error) {
        console.error("Error searching posts:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Toggle Like
 * POST /api/posts/:id/like
 */
exports.toggleLike = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const existingLike = await Like.findOne({ post: postId, user: userId });

        if (existingLike) {
            // Unlike
            await Like.deleteOne({ _id: existingLike._id });
            await Post.findByIdAndUpdate(postId, { $inc: { likeCount: -1 } });
            return res.json({ message: 'Post unliked', liked: false, likeCount: post.likeCount - 1 });
        } else {
            // Like
            const newLike = new Like({ post: postId, user: userId });
            await newLike.save();
            await Post.findByIdAndUpdate(postId, { $inc: { likeCount: 1 } });
            return res.json({ message: 'Post liked', liked: true, likeCount: post.likeCount + 1 });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Add Comment
 * POST /api/posts/:id/comment
 */
exports.addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment cannot be empty' });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const newComment = new Comment({
            post: postId,
            user: userId,
            content
        });
        await newComment.save();

        await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

        // Build response with author info for immediate UI update
        const fullComment = await Comment.findById(newComment._id).populate('user', 'username fullname avatar');

        res.status(201).json(fullComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get Comments
 * GET /api/posts/:id/comments
 */
exports.getComments = async (req, res) => {
    try {
        const postId = req.params.id;
        const comments = await Comment.find({ post: postId })
            .sort({ createdAt: 1 }) // Oldest first (Thread style)
            .populate('user', 'username fullname avatar');

        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Repost
 * POST /api/posts/:id/repost
 */
exports.repost = async (req, res) => {
    try {
        const originalPostId = req.params.id;
        const userId = req.user._id;

        const originalPost = await Post.findById(originalPostId);
        if (!originalPost) return res.status(404).json({ message: 'Post not found' });

        // Check if already reposted? (Optional, skipping for "basic")
        // Create Repost
        const newPost = new Post({
            author: userId,
            repostOf: originalPostId,
            visibility: 'public', // Default to public for now
            createdAt: new Date()
        });

        await newPost.save();

        // Update original post count
        await Post.findByIdAndUpdate(originalPostId, { $inc: { repostCount: 1 } });

        res.status(201).json({ message: 'Reposted successfully', post: newPost });

    } catch (error) {
        console.error('Error reposting:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
