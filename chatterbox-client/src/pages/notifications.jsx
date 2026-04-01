import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import NotificationItem from '../components/notifications/NotificationItem';
import { notificationService } from '../services/notification.service';
import { Bell } from '../components/common/Icons';
import RightSidebar from '../components/layout/RightSidebar';
import './feed.css';
import './notifications.css';

const NotificationsPage = () => {
    const queryClient = useQueryClient();
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: notificationService.getNotifications,
        staleTime: 1000 * 30
    });

    const markAllRead = async () => {
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
        <div className="feed-layout">
            <Navbar />

            <main className="feed-center">
                <div className="notifications-page-wrapper">
                    <div className="notif-header">
                        <h2>Notifications</h2>
                        <button className="mark-read-btn-page" onClick={markAllRead}>
                            <Bell size={16} /> Mark all read
                        </button>
                    </div>

                    <div className="notifications-list-full">
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>No notifications</div>
                        ) : (
                            notifications.map((notification) => (
                                <NotificationItem key={notification._id} notification={notification} />
                            ))
                        )}
                    </div>
                </div>
            </main>

            <RightSidebar />
            <MobileNavbar />
        </div>
    );
};

export default NotificationsPage;
