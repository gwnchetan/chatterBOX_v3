import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/notification.service';
import NotificationItem from '../notifications/NotificationItem';
import '../notifications/notifications.css';
import './Layout.css';
import { Bell, Plus } from '../common/Icons';

const stories = [
    { id: 1, user: 'anita', img: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=600', avatar: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=150' },
    { id: 2, user: 'jake_w', img: 'https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=600', avatar: 'https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=150' },
    { id: 3, user: 'travel', img: 'https://images.pexels.com/photos/227294/pexels-photo-227294.jpeg?auto=compress&cs=tinysrgb&w=600', avatar: 'https://images.pexels.com/photos/227294/pexels-photo-227294.jpeg?auto=compress&cs=tinysrgb&w=150' }
];

const RightSidebar = () => {
    const queryClient = useQueryClient();
    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: notificationService.getNotifications,
        staleTime: 1000 * 30
    });

    const unreadCount = notifications.filter((notification) => !notification.read).length;

    const markAllRead = async () => {
        if (unreadCount === 0) return;

        try {
            await notificationService.markAsRead();
            queryClient.setQueryData(['notifications'], (currentNotifications = []) =>
                currentNotifications.map((notification) => ({ ...notification, read: true }))
            );
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <aside className="sidebar-right">
            <div className="rs-partition">
                <div className="stories-scroll-container custom-scrollbar">
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

                    {stories.map((story) => (
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
                        notifications.map((notification) => (
                            <NotificationItem key={notification._id} notification={notification} />
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
