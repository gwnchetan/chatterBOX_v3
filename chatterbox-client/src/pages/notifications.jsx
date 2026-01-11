import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import NotificationItem from '../components/notifications/NotificationItem';
import { notificationService } from '../services/notification.service';
import { Bell } from '../components/common/Icons';
import RightSidebar from '../components/layout/RightSidebar';
import './feed.css'; // For layout structure
import './notifications.css';

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const data = await notificationService.getNotifications();
                setNotifications(data);
            } catch (error) {
                console.error("Failed to load notifications", error);
            } finally {
                setLoading(false);
            }
        };
        loadNotifications();
    }, []);

    const markAllRead = async () => {
        try {
            await notificationService.markAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) { console.error(error); }
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
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>No notifications</div>
                        ) : (
                            notifications.map(n => (
                                <NotificationItem key={n._id} notification={n} />
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Right Sidebar hidden on mobile, visible on desktop. 
                On desktop, this page might seem redundant if RightSidebar is there. 
                But for responsiveness, we render it. */}
            <RightSidebar />
            <MobileNavbar />
        </div>
    );
};

export default NotificationsPage;
