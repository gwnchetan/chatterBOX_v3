const Post = require('../models/posts');
const User = require('../models/users');
const Like = require('../models/likes');
const Comment = require('../models/comments');
const CommentLike = require('../models/commentLikes');
const Notification = require('../models/notifications');
const { deleteMedia, generateSignature } = require('../utils/cloudinary');
const { getIo } = require('../socket');
const { getViewerContext, normalizeId } = require('../utils/privacy');

const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const MAX_POSTS_PER_WINDOW = 5;
const postRateLimits = new Map();

const POST_AUTHOR_FIELDS = 'username fullname avatar isPrivate';
const COMMENT_USER_FIELDS = 'username fullname avatar';
const POPULAR_WEIGHTS = {
    like: 1,
    comment: 2,
    repost: 3
};

const checkRateLimit = (userId) => {
    const now = Date.now();
    const userLimits = postRateLimits.get(userId) || [];
    const validTimestamps = userLimits.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= MAX_POSTS_PER_WINDOW) {
        return false;
    }

    validTimestamps.push(now);
    postRateLimits.set(userId, validTimestamps);
    return true;
};

const encodeCursor = (section, post) => {
    if (!post) return null;

    if (section === 'popular') {
        return `${post.engagementScore || 0}_${post.createdAt.toISOString()}_${post._id}`;
    }

    return `${post.createdAt.toISOString()}_${post._id}`;
};

const applyCursor = (query, section, cursor) => {
    if (!cursor) return query;

    if (section === 'popular') {
        const [score, date, id] = cursor.split('_');
        query.$or = [
            { engagementScore: { $lt: Number(score) } },
            {
                engagementScore: Number(score),
                createdAt: { $lt: new Date(date) }
            },
            {
                engagementScore: Number(score),
                createdAt: new Date(date),
                _id: { $lt: id }
            }
        ];

        return query;
    }

    const [date, id] = cursor.split('_');
    query.$or = [
        { createdAt: { $lt: new Date(date) } },
        {
            createdAt: new Date(date),
            _id: { $lt: id }
        }
    ];

    return query;
};

const getFeedConfig = (section, viewerContext) => {
    const hiddenUserIds = Array.from(viewerContext.hiddenUserIds);

    if (section === 'friends') {
        const friendIds = [viewerContext.viewerId, ...Array.from(viewerContext.followingIds)]
            .filter((userId) => !viewerContext.hiddenUserIds.has(userId));

        return {
            section,
            query: {
                isDeleted: false,
                author: { $in: friendIds }
            },
            sort: { createdAt: -1, _id: -1 }
        };
    }

    if (section === 'popular') {
        return {
            section,
            query: {
                isDeleted: false,
                visibility: 'public',
                author: { $nin: hiddenUserIds }
            },
            sort: { engagementScore: -1, createdAt: -1, _id: -1 }
        };
    }

    return {
        section: 'recents',
        query: {
            isDeleted: false,
            author: { $nin: hiddenUserIds }
        },
        sort: { createdAt: -1, _id: -1 }
    };
};

const populatePostsQuery = (query, sort, limit) => Post.find(query)
    .sort(sort)
    .limit(limit)
    .populate('author', POST_AUTHOR_FIELDS)
    .populate({
        path: 'repostOf',
        populate: { path: 'author', select: POST_AUTHOR_FIELDS }
    })
    .lean();

const annotatePosts = async (posts, viewerContext) => {
    if (posts.length === 0) {
        return posts;
    }

    const postIds = posts.map((post) => post._id);
    const [userLikes, userReposts] = await Promise.all([
        Like.find({ post: { $in: postIds }, user: viewerContext.viewerId }).select('post').lean(),
        Post.find({ repostOf: { $in: postIds }, author: viewerContext.viewerId }).select('repostOf').lean()
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

const getVisibleFeedPosts = async ({ section, cursor, limitNum, viewerContext }) => {
    const { query, sort } = getFeedConfig(section, viewerContext);
    const fetchLimit = Math.max(limitNum * 5, limitNum + 10);
    const posts = await populatePostsQuery(applyCursor({ ...query }, section, cursor), sort, fetchLimit);
    const visiblePosts = posts.filter((post) => viewerContext.canSeePost(post)).slice(0, limitNum);
    const hydratedPosts = await annotatePosts(visiblePosts, viewerContext);

    const nextCursor = hydratedPosts.length === limitNum
        ? encodeCursor(section, hydratedPosts[hydratedPosts.length - 1])
        : null;

    return { posts: hydratedPosts, nextCursor };
};

const buildPostMetricsUpdate = ({ likeDelta = 0, commentDelta = 0, repostDelta = 0 }) => {
    const engagementDelta =
        (likeDelta * POPULAR_WEIGHTS.like)
        + (commentDelta * POPULAR_WEIGHTS.comment)
        + (repostDelta * POPULAR_WEIGHTS.repost);

    return {
        $inc: {
            ...(likeDelta ? { likeCount: likeDelta } : {}),
            ...(commentDelta ? { commentCount: commentDelta } : {}),
            ...(repostDelta ? { repostCount: repostDelta } : {}),
            ...(engagementDelta ? { engagementScore: engagementDelta } : {})
        },
        $set: {
            lastInteractionAt: new Date()
        }
    };
};

const emitPostCommentUpdate = (postId, commentCount) => {
    try {
        getIo().to(`post:${postId}`).emit('post:comment:update', {
            postId,
            commentCount
        });
    } catch (error) {
        console.error('Socket emit failed', error);
    }
};

const emitPostLikeUpdate = (postId, likeCount) => {
    try {
        getIo().to(`post:${postId}`).emit('post:like:update', {
            postId,
            likesCount: likeCount
        });
    } catch (error) {
        console.error('Socket emit failed', error);
    }
};

const createAndEmitNotification = async ({ recipient, sender, type, post, comment, conversation, text }) => {
    if (normalizeId(recipient) === normalizeId(sender)) {
        return null;
    }

    const notification = new Notification({
        recipient,
        sender,
        type,
        post,
        comment,
        conversation,
        text
    });

    await notification.save();
    await notification.populate('sender', COMMENT_USER_FIELDS);
    await notification.populate('post', 'content media');

    if (conversation) {
        await notification.populate('conversation', 'participants status lastMessage');
    }

    getIo().to(`user:${normalizeId(recipient)}`).emit('notification:new', notification);
    return notification;
};

const getPostForViewer = async (postId, viewerContext) => {
    const post = await Post.findById(postId)
        .populate('author', POST_AUTHOR_FIELDS)
        .populate({
            path: 'repostOf',
            populate: { path: 'author', select: POST_AUTHOR_FIELDS }
        })
        .lean();

    if (!post || !viewerContext.canSeePost(post)) {
        return null;
    }

    return post;
};

const buildCommentsPayload = async (postId, viewerId) => {
    const topLevelComments = await Comment.find({
        post: postId,
        parentComment: null
    })
        .sort({ createdAt: 1 })
        .populate('user', COMMENT_USER_FIELDS)
        .lean();

    const topLevelIds = topLevelComments.map((comment) => comment._id);
    const replies = topLevelIds.length > 0
        ? await Comment.find({
            post: postId,
            parentComment: { $in: topLevelIds }
        })
            .sort({ createdAt: 1 })
            .populate('user', COMMENT_USER_FIELDS)
            .lean()
        : [];

    const allCommentIds = [
        ...topLevelComments.map((comment) => comment._id),
        ...replies.map((comment) => comment._id)
    ];

    const userLikes = allCommentIds.length > 0
        ? await CommentLike.find({
            comment: { $in: allCommentIds },
            user: viewerId
        }).select('comment').lean()
        : [];

    const likedCommentIds = new Set(userLikes.map((like) => normalizeId(like.comment)));

    const repliesByParent = replies.reduce((accumulator, reply) => {
        const parentId = normalizeId(reply.parentComment);
        if (!accumulator[parentId]) {
            accumulator[parentId] = [];
        }

        accumulator[parentId].push({
            ...reply,
            liked: likedCommentIds.has(normalizeId(reply._id))
        });

        return accumulator;
    }, {});

    return topLevelComments.map((comment) => ({
        ...comment,
        liked: likedCommentIds.has(normalizeId(comment._id)),
        replies: repliesByParent[normalizeId(comment._id)] || []
    }));
};

exports.createPost = async (req, res) => {
    try {
        const { content, media, visibility } = req.body;
        const userId = req.user._id;

        if (!checkRateLimit(userId.toString())) {
            return res.status(429).json({ message: 'Post rate limit exceeded. Please try again later.' });
        }

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

                const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
                if (
                    !item.url.startsWith('https://')
                    || !item.url.includes('cloudinary.com')
                    || (cloudName && !item.url.includes(cloudName))
                ) {
                    return res.status(400).json({ message: 'Invalid media source. Must be a secure Cloudinary URL from the authorized cloud.' });
                }
            }
        }

        const validVisibilities = ['public', 'followers', 'private'];
        const postVisibility = validVisibilities.includes(visibility) ? visibility : 'public';

        const newPost = new Post({
            author: userId,
            content,
            media: media || [],
            mediaCount: media ? media.length : 0,
            visibility: postVisibility,
            createdAt: new Date(),
            likeCount: 0,
            commentCount: 0,
            repostCount: 0,
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

        post.isDeleted = true;
        await post.save();

        if (post.media && post.media.length > 0) {
            post.media.forEach((item) => {
                if (!item.publicId) return;
                const resourceType = item.type === 'video' ? 'video' : 'image';
                deleteMedia(item.publicId, resourceType);
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
        const viewerContext = await getViewerContext(req.user._id);
        const { cursor, limit = 20, section = 'friends' } = req.query;
        const limitNum = parseInt(limit, 10);
        const selectedSection = ['friends', 'recents', 'popular'].includes(section) ? section : 'friends';

        const data = await getVisibleFeedPosts({
            section: selectedSection,
            cursor,
            limitNum,
            viewerContext
        });

        res.json(data);
    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).json({ message: 'Internal server error while fetching feed.' });
    }
};

exports.getUploadSignature = (req, res) => {
    try {
        const timestamp = Math.round((new Date()).getTime() / 1000);
        const signature = generateSignature({ timestamp });

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

exports.getExploreFeed = async (req, res) => {
    try {
        const viewerContext = await getViewerContext(req.user._id);
        const { limit = 20 } = req.query;
        const rawPosts = await populatePostsQuery({
            isDeleted: false,
            visibility: 'public',
            author: { $nin: Array.from(viewerContext.hiddenUserIds) }
        }, {
            engagementScore: -1,
            createdAt: -1,
            _id: -1
        }, parseInt(limit, 10) + 10);

        const visiblePosts = rawPosts
            .filter((post) => viewerContext.canSeePost(post))
            .slice(0, parseInt(limit, 10));

        const posts = await annotatePosts(visiblePosts, viewerContext);
        res.json({ posts });
    } catch (error) {
        console.error('Error fetching explore feed:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.searchPosts = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q) {
            return res.json({ posts: [] });
        }

        const viewerContext = await getViewerContext(req.user._id);
        const rawPosts = await Post.find({
            content: { $regex: q, $options: 'i' },
            isDeleted: false,
            author: { $nin: Array.from(viewerContext.hiddenUserIds) }
        })
            .sort({ createdAt: -1, _id: -1 })
            .limit(parseInt(limit, 10) + 10)
            .populate('author', POST_AUTHOR_FIELDS)
            .populate({
                path: 'repostOf',
                populate: { path: 'author', select: POST_AUTHOR_FIELDS }
            })
            .lean();

        const visiblePosts = rawPosts
            .filter((post) => viewerContext.canSeePost(post))
            .slice(0, parseInt(limit, 10));

        const posts = await annotatePosts(visiblePosts, viewerContext);
        res.json({ posts });
    } catch (error) {
        console.error('Error searching posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;
        const viewerContext = await getViewerContext(userId);
        const post = await getPostForViewer(postId, viewerContext);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const existingLike = await Like.findOne({ post: postId, user: userId });

        if (existingLike) {
            await Like.deleteOne({ _id: existingLike._id });
            const updatedPost = await Post.findByIdAndUpdate(
                postId,
                buildPostMetricsUpdate({ likeDelta: -1 }),
                { new: true }
            ).select('likeCount');

            emitPostLikeUpdate(postId, updatedPost.likeCount);
            return res.json({ message: 'Post unliked', liked: false, likeCount: updatedPost.likeCount });
        }

        const newLike = new Like({ post: postId, user: userId });
        await newLike.save();

        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            buildPostMetricsUpdate({ likeDelta: 1 }),
            { new: true }
        ).select('likeCount author');

        emitPostLikeUpdate(postId, updatedPost.likeCount);
        await createAndEmitNotification({
            recipient: updatedPost.author,
            sender: userId,
            type: 'like',
            post: postId
        });

        res.json({ message: 'Post liked', liked: true, likeCount: updatedPost.likeCount });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;
        const { content } = req.body;
        const viewerContext = await getViewerContext(userId);

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment cannot be empty' });
        }

        const post = await getPostForViewer(postId, viewerContext);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const newComment = new Comment({
            post: postId,
            user: userId,
            content: content.trim()
        });
        await newComment.save();

        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            buildPostMetricsUpdate({ commentDelta: 1 }),
            { new: true }
        ).select('commentCount author');

        const fullComment = await Comment.findById(newComment._id)
            .populate('user', COMMENT_USER_FIELDS)
            .lean();

        emitPostCommentUpdate(postId, updatedPost.commentCount);

        await createAndEmitNotification({
            recipient: updatedPost.author,
            sender: userId,
            type: 'comment',
            post: postId,
            comment: newComment._id,
            text: content.trim()
        });

        res.status(201).json({
            ...fullComment,
            liked: false,
            replies: []
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.addReply = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user._id;
        const { content } = req.body;
        const viewerContext = await getViewerContext(userId);

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Reply cannot be empty' });
        }

        const post = await getPostForViewer(postId, viewerContext);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const parentComment = await Comment.findById(commentId).select('post user parentComment').lean();
        if (!parentComment || normalizeId(parentComment.post) !== postId) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (parentComment.parentComment) {
            return res.status(400).json({ message: 'Replies can only be added to top-level comments' });
        }

        const reply = new Comment({
            post: postId,
            user: userId,
            content: content.trim(),
            parentComment: commentId
        });
        await reply.save();

        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            buildPostMetricsUpdate({ commentDelta: 1 }),
            { new: true }
        ).select('commentCount');

        const fullReply = await Comment.findById(reply._id)
            .populate('user', COMMENT_USER_FIELDS)
            .lean();

        emitPostCommentUpdate(postId, updatedPost.commentCount);

        await createAndEmitNotification({
            recipient: parentComment.user,
            sender: userId,
            type: 'reply',
            post: postId,
            comment: reply._id,
            text: content.trim()
        });

        res.status(201).json({
            ...fullReply,
            liked: false
        });
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getComments = async (req, res) => {
    try {
        const postId = req.params.id;
        const viewerContext = await getViewerContext(req.user._id);
        const post = await getPostForViewer(postId, viewerContext);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comments = await buildCommentsPayload(postId, req.user._id);
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.toggleCommentLike = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user._id;
        const viewerContext = await getViewerContext(userId);
        const post = await getPostForViewer(postId, viewerContext);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comment = await Comment.findById(commentId).select('post user likeCount').lean();
        if (!comment || normalizeId(comment.post) !== postId) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const existingLike = await CommentLike.findOne({
            comment: commentId,
            user: userId
        });

        if (existingLike) {
            await CommentLike.deleteOne({ _id: existingLike._id });
            const updatedComment = await Comment.findByIdAndUpdate(
                commentId,
                { $inc: { likeCount: -1 } },
                { new: true }
            ).select('likeCount');

            return res.json({
                message: 'Comment unliked',
                liked: false,
                likeCount: updatedComment.likeCount
            });
        }

        await CommentLike.create({
            comment: commentId,
            user: userId
        });

        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            { $inc: { likeCount: 1 } },
            { new: true }
        ).select('likeCount user');

        await createAndEmitNotification({
            recipient: updatedComment.user,
            sender: userId,
            type: 'comment_like',
            post: postId,
            comment: commentId
        });

        res.json({
            message: 'Comment liked',
            liked: true,
            likeCount: updatedComment.likeCount
        });
    } catch (error) {
        console.error('Error toggling comment like:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.repost = async (req, res) => {
    try {
        const targetId = req.params.id;
        const userId = req.user._id;
        const viewerContext = await getViewerContext(userId);
        const targetPost = await getPostForViewer(targetId, viewerContext);

        if (!targetPost) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const originalPostId = targetPost.repostOf ? normalizeId(targetPost.repostOf._id || targetPost.repostOf) : targetId;
        const existingRepost = await Post.findOne({
            author: userId,
            repostOf: originalPostId
        });

        if (existingRepost) {
            await Post.findByIdAndDelete(existingRepost._id);
            await Post.findByIdAndUpdate(
                originalPostId,
                buildPostMetricsUpdate({ repostDelta: -1 })
            );

            return res.json({ message: 'Repost removed', reposted: false });
        }

        const newPost = new Post({
            author: userId,
            repostOf: originalPostId,
            visibility: 'public',
            createdAt: new Date()
        });

        await newPost.save();
        await Post.findByIdAndUpdate(
            originalPostId,
            buildPostMetricsUpdate({ repostDelta: 1 })
        );

        res.status(201).json({ message: 'Reposted successfully', reposted: true, post: newPost });
    } catch (error) {
        console.error('Error reposting:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.user._id;
        const viewerContext = await getViewerContext(userId);
        const post = await getPostForViewer(postId, viewerContext);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comment = await Comment.findById(commentId).select('post user parentComment').lean();
        if (!comment || normalizeId(comment.post) !== postId) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (normalizeId(comment.user) !== normalizeId(userId) && normalizeId(post.author._id) !== normalizeId(userId)) {
            return res.status(403).json({ message: 'Unauthorized to delete this comment' });
        }

        let deletedCommentIds = [commentId];
        if (!comment.parentComment) {
            const replies = await Comment.find({
                post: postId,
                parentComment: commentId
            }).select('_id').lean();
            deletedCommentIds = [commentId, ...replies.map((reply) => normalizeId(reply._id))];
        }

        await Promise.all([
            Comment.deleteMany({ _id: { $in: deletedCommentIds } }),
            CommentLike.deleteMany({ comment: { $in: deletedCommentIds } })
        ]);

        const updatedPost = await Post.findByIdAndUpdate(
            postId,
            buildPostMetricsUpdate({ commentDelta: -deletedCommentIds.length }),
            { new: true }
        ).select('commentCount');

        emitPostCommentUpdate(postId, updatedPost.commentCount);
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
