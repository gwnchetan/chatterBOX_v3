const Notification = require('../models/notifications');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('sender', 'username fullname avatar')
            .populate('post', 'content media'); // To show snippet of post

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.markRead = async (req, res) => {
    try {
        const userId = req.user._id;
        await Notification.updateMany({ recipient: userId, read: false }, { read: true });
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
