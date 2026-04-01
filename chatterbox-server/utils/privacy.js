const User = require('../models/users');

const normalizeId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value._id) return value._id.toString();
    return value.toString();
};

const getAuthorShape = (author) => {
    if (!author) return null;
    if (typeof author === 'object' && author._id) {
        return {
            id: author._id.toString(),
            isPrivate: !!author.isPrivate
        };
    }

    return {
        id: author.toString(),
        isPrivate: false
    };
};

const getViewerContext = async (viewerId) => {
    if (!viewerId) {
        return {
            viewerId: null,
            followingIds: new Set(),
            hiddenUserIds: new Set(),
            savedPostIds: new Set(),
            isHiddenUser: () => false,
            canSeeAuthor: (authorId, isPrivate = false) => !isPrivate,
            canSeePost: () => false
        };
    }

    const viewer = await User.findById(viewerId)
        .select('following blockedUsers savedPosts')
        .lean();

    if (!viewer) {
        throw new Error('Viewer not found');
    }

    const blockedByUsers = await User.find({ blockedUsers: viewerId })
        .select('_id')
        .lean();

    const viewerIdStr = viewerId.toString();
    const followingIds = new Set((viewer.following || []).map(normalizeId));
    const blockedUsers = new Set((viewer.blockedUsers || []).map(normalizeId));
    const blockedByIds = new Set(blockedByUsers.map((user) => normalizeId(user._id)));
    const hiddenUserIds = new Set([...blockedUsers, ...blockedByIds]);
    const savedPostIds = new Set((viewer.savedPosts || []).map(normalizeId));

    const isHiddenUser = (userId) => hiddenUserIds.has(normalizeId(userId));
    const canSeeAuthor = (authorId, isPrivate = false) => {
        const normalizedId = normalizeId(authorId);
        if (!normalizedId) return false;
        if (isHiddenUser(normalizedId)) return false;
        if (normalizedId === viewerIdStr) return true;
        if (!isPrivate) return true;
        return followingIds.has(normalizedId);
    };

    const canSeePost = (post) => {
        if (!post || post.isDeleted) return false;

        const author = getAuthorShape(post.author);
        if (!author || !canSeeAuthor(author.id, author.isPrivate)) {
            return false;
        }

        if (post.repostOf && post.repostOf.author) {
            const originAuthor = getAuthorShape(post.repostOf.author);
            if (!originAuthor || !canSeeAuthor(originAuthor.id, originAuthor.isPrivate)) {
                return false;
            }
        }

        if (post.visibility === 'private') {
            return author.id === viewerIdStr;
        }

        if (post.visibility === 'followers') {
            return author.id === viewerIdStr || followingIds.has(author.id);
        }

        return true;
    };

    return {
        viewerId: viewerIdStr,
        followingIds,
        hiddenUserIds,
        savedPostIds,
        isHiddenUser,
        canSeeAuthor,
        canSeePost
    };
};

const getBlockState = async (currentUserId, targetUserId) => {
    const users = await User.find({
        _id: { $in: [currentUserId, targetUserId] }
    })
        .select('blockedUsers')
        .lean();

    const currentUser = users.find((user) => normalizeId(user._id) === normalizeId(currentUserId));
    const targetUser = users.find((user) => normalizeId(user._id) === normalizeId(targetUserId));

    const currentHasBlocked = !!currentUser?.blockedUsers?.some((userId) => normalizeId(userId) === normalizeId(targetUserId));
    const targetHasBlocked = !!targetUser?.blockedUsers?.some((userId) => normalizeId(userId) === normalizeId(currentUserId));

    return {
        currentHasBlocked,
        targetHasBlocked,
        blocked: currentHasBlocked || targetHasBlocked
    };
};

module.exports = {
    normalizeId,
    getViewerContext,
    getBlockState
};
