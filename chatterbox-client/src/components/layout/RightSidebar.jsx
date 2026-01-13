import React, { useRef, useEffect, useState } from 'react';
import { socketService } from '../../services/socket.service';
import { notificationService } from '../../services/notification.service';
import NotificationItem from '../notifications/NotificationItem';
import '../notifications/notifications.css';
import './Layout.css';
import { Bell, Plus } from '../common/Icons';

const RightSidebar = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const stories = [
        { id: 1, user: 'anita', img: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=600', avatar: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=150' },
        { id: 2, user: 'jake_w', img: 'https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=600', avatar: 'https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=150' },
        { id: 3, user: 'travel', img: 'https://images.pexels.com/photos/227294/pexels-photo-227294.jpeg?auto=compress&cs=tinysrgb&w=600', avatar: 'https://images.pexels.com/photos/227294/pexels-photo-227294.jpeg?auto=compress&cs=tinysrgb&w=150' },
    ];

    // Fetch Notifications
    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const data = await notificationService.getNotifications();
                setNotifications(data);
                const count = data.filter(n => !n.read).length;
                setUnreadCount(count);
            } catch (error) {
                console.error("Failed to load notifications", error);
            }
        };

        loadNotifications();

        // Join User Room
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && (user._id || user.id)) {
            socketService.joinUser(user._id || user.id);
        }

        // Socket Listener
        const handleNewNotification = (notif) => {
            console.log("New Notification Received:", notif);

            // Play Sound
            try {
                // Simple pop sound
                const sound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                sound.volume = 0.5;
                sound.play().catch(e => console.log("Audio play failed (autoplay policy):", e));
            } catch (e) {
                console.error("Audio error:", e);
            }

            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
        };

        socketService.on('notification:new', handleNewNotification);

        return () => {
            socketService.off('notification:new', handleNewNotification);
        };
    }, []);

    const markAllRead = async () => {
        if (unreadCount === 0) return;
        try {
            await notificationService.markAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) { console.error(error); }
    };

    return (
        <aside className="sidebar-right">
            {/* Partition 1: Stories */}
            <div className="rs-partition">
                <div className="stories-scroll-container custom-scrollbar">
                    {/* Add Story Card */}
                    <div className="story-card add-story-card">
                        <div className="story-bg-placeholder">
                            <div className="add-story-btn">
                                <Plus size={16} color="white" />
                            </div>
                        </div>
                        <div className="story-username-overlay">
                            You
                        </div>
                    </div>

                    {/* Story Items */}
                    {stories.map(story => (
                        <div key={story.id} className="story-card">
                            <img src={story.img} alt="story" className="story-bg" />
                            <div className="story-avatar-top">
                                <img src={story.avatar} alt="avatar" className="avatar" />
                            </div>
                            <div className="story-username-overlay">
                                {story.user}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Repurposed Requests Section -> Notifications */}
            <div className="rs-partition partition-notifications">
                <div className="partition-header">
                    <h3 className="right-title">NOTIFICATIONS</h3>
                    <button className="mark-read-btn" onClick={markAllRead} title="Mark all read">
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="notif-dot"></span>}
                    </button>
                </div>

                <div className="notifications-list custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="empty-state">
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <NotificationItem key={notif._id} notification={notif} />
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
