const User = require('../models/users');

/**
 * Check if two users can chat.
 * Rules:
 * 1. Must not be blocked by either party.
 */
const canChat = async (userA, userB) => {
    if (!userA || !userB) return false;
    if (userA.toString() === userB.toString()) return true; // Self-chat? Maybe.

    const [currentUser, targetUser] = await Promise.all([
        User.findById(userA).select('blockedUsers').lean(),
        User.findById(userB).select('blockedUsers').lean()
    ]);

    if (!currentUser || !targetUser) {
        throw new Error('User not found.');
    }

    const blockedByCurrent = currentUser.blockedUsers?.some((id) => id.toString() === userB.toString());
    const blockedByTarget = targetUser.blockedUsers?.some((id) => id.toString() === userA.toString());

    if (blockedByCurrent || blockedByTarget) {
        const blocker = blockedByCurrent ? 'You' : 'They';
        throw new Error(`Chat not allowed: ${blocker} blocked the conversation.`);
    }

    return true;
};

module.exports = { canChat };
