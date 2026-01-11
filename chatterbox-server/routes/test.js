const router = require('express').Router();
const { getIo } = require('../socket');
const User = require('../models/User');

// POST /api/test/notify
// Body: { userId: '...', type: 'like', text: 'Test notification' }
router.post('/notify', async (req, res) => {
    try {
        const { userId, type = 'like', text = 'This is a test notification' } = req.body;

        if (!userId) return res.status(400).json({ error: 'userId is required' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Create a dummy notification object structure (not saving to DB for this quick test if we don't want to, but consistency is better)
        // Let's actually create it properly so it renders with avatar etc.
        // We'll use the first available user as "sender" or the user themselves for simplicity
        const sender = await User.findOne({ _id: { $ne: userId } });

        const notif = {
            _id: new Date().getTime().toString(), // fake ID
            recipient: userId,
            sender: sender || user, // fallback to self if no other user
            type: type,
            text: text,
            read: false,
            createdAt: new Date(),
            // post: ... optional
        };

        // Emit real-time event
        getIo().to(`user:${userId}`).emit('notification:new', notif);
        console.log(`Emitted test notification to user:${userId}`);

        res.json({ message: 'Notification emitted', notification: notif });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
