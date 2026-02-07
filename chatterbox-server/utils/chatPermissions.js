const Relationship = require('../models/relationships');

/**
 * Check if two users can chat.
 * Rules:
 * 1. Must not be blocked by either party.
 * 2. Must have at least one 'accepted' relationship (A follows B OR B follows A).
 */
const canChat = async (userA, userB) => {
    if (!userA || !userB) return false;
    if (userA.toString() === userB.toString()) return true; // Self-chat? Maybe.

    // 1. Check Block Status
    const block = await Relationship.findOne({
        $or: [
            { requester: userA, recipient: userB, status: 'blocked' },
            { requester: userB, recipient: userA, status: 'blocked' }
        ]
    });

    if (block) {
        const blocker = block.requester.toString() === userA.toString() ? 'You' : 'They';
        throw new Error(`Chat not allowed: ${blocker} blocked the conversation.`);
    }

    // 2. Check Connection (Relaxed for Message Requests)
    // We allow chat initiation. Privacy is handled by Conversation Status.
    /*
    const connection = await Relationship.findOne({
        $or: [
            { requester: userA, recipient: userB, status: 'accepted' },
            { requester: userB, recipient: userA, status: 'accepted' }
        ]
    });

    if (!connection) {
        throw new Error("You must follow each other or be connected to chat.");
    }
    */

    return true;
};

module.exports = { canChat };
