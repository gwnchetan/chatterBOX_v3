import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ProtectedRoute from './components/common/ProtectedRoute';
import { FeedProvider } from './context/FeedContext';
import { useToast } from './components/Toast';
import { socketService } from './services/socket.service';
import './App.css';

const Login = lazy(() => import('./pages/login'));
const Feed = lazy(() => import('./pages/feed'));
const CreatePost = lazy(() => import('./pages/create-post'));
const Profile = lazy(() => import('./pages/profile'));
const Explore = lazy(() => import('./pages/explore'));
const Favorites = lazy(() => import('./pages/favorites'));
const WIP = lazy(() => import('./pages/wip'));
const NotificationsPage = lazy(() => import('./pages/notifications'));
const Chat = lazy(() => import('./pages/Chat'));

const mergeNotification = (currentNotifications, incomingNotification) => {
    const notifications = Array.isArray(currentNotifications) ? currentNotifications : [];
    if (!incomingNotification?._id) {
        return notifications;
    }

    const alreadyExists = notifications.some((notification) => notification._id === incomingNotification._id);
    if (alreadyExists) {
        return notifications;
    }

    return [incomingNotification, ...notifications].slice(0, 20);
};

function App() {
    const location = useLocation();
    const queryClient = useQueryClient();
    const { info } = useToast();
    const seenMessageToastsRef = useRef(new Set());

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const token = localStorage.getItem('token');

        if (user && token) {
            socketService.setAuthSession({
                token,
                userId: user._id || user.id
            });
        } else {
            socketService.clearAuthSession();
        }

        const handleNotification = (notification) => {
            queryClient.setQueryData(['notifications'], (currentNotifications) =>
                mergeNotification(currentNotifications, notification)
            );
        };

        const handleConversationUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        };

        const handleMessage = (message) => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });

            if (location.pathname.startsWith('/chat')) {
                return;
            }

            const currentUserId = user?._id || user?.id;
            const senderId = message?.sender?._id || message?.sender;
            if (!message?._id || !currentUserId || !senderId || String(senderId) === String(currentUserId)) {
                return;
            }

            if (seenMessageToastsRef.current.has(message._id)) {
                return;
            }

            seenMessageToastsRef.current.add(message._id);
            if (seenMessageToastsRef.current.size > 100) {
                const firstSeenId = seenMessageToastsRef.current.values().next().value;
                seenMessageToastsRef.current.delete(firstSeenId);
            }

            const senderName = message?.sender?.fullname || message?.sender?.username || 'Someone';
            const preview = typeof message?.content?.text === 'string'
                ? message.content.text.trim()
                : '';
            const toastMessage = {
                title: senderName,
                avatar: message?.sender?.avatar || '',
                message: preview
                    ? (preview.length > 80 ? `${preview.slice(0, 77)}...` : preview)
                    : 'Sent you a message'
            };

            info(toastMessage, 4000);
        };

        socketService.on('notification:new', handleNotification);
        socketService.on('chat:conversation:update', handleConversationUpdate);
        socketService.on('chat:message', handleMessage);

        return () => {
            socketService.off('notification:new', handleNotification);
            socketService.off('chat:conversation:update', handleConversationUpdate);
            socketService.off('chat:message', handleMessage);
        };
    }, [info, location.pathname, queryClient]);

    return (
        <div className="app-container">
            <FeedProvider>
                <Suspense fallback={
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text-main)',
                        fontSize: '1.2rem',
                        fontWeight: '500'
                    }}>
                        Loading...
                    </div>
                }>
                    <Routes>
                        <Route path="/" element={<Login />} />
                        <Route path="/feed" element={
                            <ProtectedRoute>
                                <Feed />
                            </ProtectedRoute>
                        } />
                        <Route path="/create" element={
                            <ProtectedRoute>
                                <CreatePost />
                            </ProtectedRoute>
                        } />
                        <Route path="/profile/:userId" element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        } />
                        <Route path="/profile" element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        } />
                        <Route path="/explore" element={
                            <ProtectedRoute>
                                <Explore />
                            </ProtectedRoute>
                        } />
                        <Route path="/favorites" element={
                            <ProtectedRoute>
                                <Favorites />
                            </ProtectedRoute>
                        } />
                        <Route path="/direct" element={
                            <ProtectedRoute>
                                <WIP title="Direct Messages" />
                            </ProtectedRoute>
                        } />
                        <Route path="/stats" element={
                            <ProtectedRoute>
                                <WIP title="Statistics" />
                            </ProtectedRoute>
                        } />
                        <Route path="/notifications" element={
                            <ProtectedRoute>
                                <NotificationsPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/chat" element={
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        } />
                        <Route path="/chat/:conversationId" element={
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </Suspense>
            </FeedProvider>
        </div>
    );
}

export default App;
