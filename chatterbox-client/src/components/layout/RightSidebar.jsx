import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notification.service';
import userService from '../../services/user.service';
import NotificationItem from '../notifications/NotificationItem';
import '../notifications/notifications.css';
import './Layout.css';
import { Bell, Plus } from '../common/Icons';

const DESKTOP_SIDEBAR_BREAKPOINT = 1300;

const RightSidebar = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const currentUserId = currentUser?._id || currentUser?.id || null;
    const [isDesktopSidebar, setIsDesktopSidebar] = useState(() => (
        typeof window === 'undefined' ? true : window.innerWidth > DESKTOP_SIDEBAR_BREAKPOINT
    ));

    useEffect(() => {
        const handleResize = () => {
            setIsDesktopSidebar(window.innerWidth > DESKTOP_SIDEBAR_BREAKPOINT);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: notificationService.getNotifications,
        enabled: isDesktopSidebar,
        staleTime: 1000 * 30
    });

    const { data: storyFeed = [] } = useQuery({
        queryKey: ['storyFeed'],
        queryFn: userService.getStoryFeed,
        enabled: isDesktopSidebar,
        staleTime: 1000 * 60 * 5
    });

    const { data: userStories = null } = useQuery({
        queryKey: ['userStories', currentUserId],
        queryFn: () => userService.getUserStories(currentUserId),
        enabled: isDesktopSidebar && !!currentUserId,
        staleTime: 1000 * 60 * 5
    });

    if (!isDesktopSidebar) {
        return null;
    }

    const unreadCount = notifications.filter((notification) => !notification.read).length;

    const hasViewedStory = (story) => (
        Array.isArray(story?.views)
            ? story.views.some((viewerId) => String(viewerId) === String(currentUserId))
            : false
    );

    const hasUnseenStories = (storyOwner) => (
        Array.isArray(storyOwner?.stories)
            ? storyOwner.stories.some((story) => !hasViewedStory(story))
            : false
    );

    const getLatestStory = (storyOwner) => (
        Array.isArray(storyOwner?.stories) && storyOwner.stories.length > 0
            ? storyOwner.stories[storyOwner.stories.length - 1]
            : null
    );

    const buildStoryUsers = () => {
        const users = [];

        if (userStories?.stories?.length) {
            users.push({
                ...userStories,
                userId: userStories.userId || currentUserId,
                username: userStories.username || currentUser?.username || 'You',
                fullname: userStories.fullname || currentUser?.fullname || 'You',
                avatar: userStories.avatar || currentUser?.avatar || ''
            });
        }

        return [...users, ...storyFeed];
    };

    const openStoryViewer = (targetUserId, options = {}) => {
        navigate(`/stories/${String(targetUserId)}`, {
            state: {
                from: location.pathname,
                storyUsers: buildStoryUsers(),
                ...options
            }
        });
    };

    const handleOwnStoryClick = () => {
        if (!currentUserId) return;

        if (userStories?.stories?.length) {
            openStoryViewer(currentUserId, { startFromLatest: true });
            return;
        }

        navigate('/create');
    };

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

    const ownLatestStory = getLatestStory(userStories);

    return (
        <aside className="sidebar-right">
            <div className="rs-partition">
                <div className="stories-scroll-container custom-scrollbar">
                    <button
                        type="button"
                        className="story-card story-card-button add-story-card"
                        onClick={handleOwnStoryClick}
                    >
                        {ownLatestStory ? (
                            <>
                                <img
                                    src={ownLatestStory.mediaUrl}
                                    alt="your story"
                                    className="story-bg"
                                />
                                {currentUser?.avatar && (
                                    <div className="story-avatar-top">
                                        <img
                                            src={currentUser.avatar}
                                            alt={currentUser.username || 'You'}
                                            className="avatar"
                                        />
                                    </div>
                                )}
                                <div className="story-username-overlay">You</div>
                            </>
                        ) : (
                            <>
                                <div className="story-bg-placeholder">
                                    <div className="add-story-btn">
                                        <Plus size={16} color="white" />
                                    </div>
                                </div>
                                <div className="story-username-overlay">You</div>
                            </>
                        )}
                    </button>

                    {storyFeed.map((storyUser) => {
                        const latestStory = getLatestStory(storyUser);
                        if (!latestStory) {
                            return null;
                        }

                        return (
                            <button
                                key={String(storyUser.userId)}
                                type="button"
                                className={`story-card story-card-button ${hasUnseenStories(storyUser) ? 'story-card--unseen' : 'story-card--seen'}`}
                                onClick={() => openStoryViewer(storyUser.userId)}
                            >
                                <img
                                    src={latestStory.mediaUrl}
                                    alt={`${storyUser.username}'s story`}
                                    className="story-bg"
                                />
                                <div className="story-avatar-top">
                                    <img
                                        src={storyUser.avatar || 'https://via.placeholder.com/40'}
                                        alt={storyUser.username}
                                        className="avatar"
                                    />
                                </div>
                                <div className="story-username-overlay">
                                    {storyUser.username}
                                </div>
                            </button>
                        );
                    })}
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
