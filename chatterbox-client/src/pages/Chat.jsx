import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import chatService from '../services/chat.service';
import userService from '../services/user.service';
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import ChatLanding from '../components/chat/ChatLanding';
import { socketService } from '../services/socket.service';
import { useToast } from '../components/Toast';
import { getStoredUser } from '../utils/authStorage';
import './chat.css';

const Chat = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { info } = useToast();
    const [selectedTab, setSelectedTab] = useState('inbox');
    const notificationAudioRef = useRef(null);

    const currentUser = useMemo(() => {
        const user = getStoredUser();
        if (!user) return null;
        return {
            ...user,
            _id: user._id || user.id
        };
    }, []);

    const { data: inboxConversations = [] } = useQuery({
        queryKey: ['conversations', 'inbox'],
        queryFn: () => chatService.getConversations('inbox'),
        staleTime: 1000 * 60,
        placeholderData: (previousData) => previousData
    });

    const { data: followingData } = useQuery({
        queryKey: ['following'],
        queryFn: userService.getFollowing,
        staleTime: 1000 * 60 * 5
    });

    const { data: requestConversations = [] } = useQuery({
        queryKey: ['conversations', 'requests'],
        queryFn: () => chatService.getConversations('requests'),
        staleTime: 1000 * 60
    });

    const { data: sentConversations = [] } = useQuery({
        queryKey: ['conversations', 'sent'],
        queryFn: () => chatService.getConversations('sent'),
        staleTime: 1000 * 60
    });

    const activeTab = useMemo(() => {
        if (conversationId && requestConversations.some((conversation) => conversation._id === conversationId)) {
            return 'requests';
        }

        if (conversationId && sentConversations.some((conversation) => conversation._id === conversationId)) {
            return 'sent';
        }

        if (conversationId && inboxConversations.some((conversation) => conversation._id === conversationId)) {
            return 'inbox';
        }

        return selectedTab;
    }, [conversationId, inboxConversations, requestConversations, selectedTab, sentConversations]);

    const conversations = useMemo(() => {
        if (activeTab === 'requests') return requestConversations;
        if (activeTab === 'sent') return sentConversations;
        return inboxConversations;
    }, [activeTab, inboxConversations, requestConversations, sentConversations]);

    useEffect(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        audio.preload = 'auto';
        notificationAudioRef.current = audio;

        return () => {
            notificationAudioRef.current = null;
        };
    }, []);

    const playNotificationSound = () => {
        const audio = notificationAudioRef.current;
        if (!audio) {
            return;
        }

        audio.currentTime = 0;
        audio.play().catch(() => {});
    };

    useEffect(() => {
        const handleNewMessage = (message) => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });

            if (message?.conversationId?.toString() === conversationId?.toString()) {
                queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            }

            const senderId = message?.sender?._id || message?.sender;
            const isOwn = senderId === currentUser?._id;

            if (!isOwn && message?.conversationId?.toString() !== conversationId?.toString()) {
                playNotificationSound();
                info(`New message from ${message?.sender?.fullname || 'Someone'}`, 4000);
            }
        };

        const handleConversationUpdate = ({ reason, conversation }) => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });

            if (!conversationId) return;

            const updatedConversationId = conversation?._id?.toString();
            if (conversation?.deleted && updatedConversationId === conversationId.toString()) {
                navigate('/chat');
                return;
            }

            if ((reason === 'request_rejected' || reason === 'request_cancelled') && updatedConversationId === conversationId.toString()) {
                navigate('/chat');
                return;
            }

            if (updatedConversationId === conversationId.toString()) {
                queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            }

            if (reason === 'request_created' || reason === 'request_rejected' || reason === 'request_cancelled' || reason === 'request_accepted') {
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }
        };

        socketService.on('chat:message', handleNewMessage);
        socketService.on('chat:conversation:update', handleConversationUpdate);

        return () => {
            socketService.off('chat:message', handleNewMessage);
            socketService.off('chat:conversation:update', handleConversationUpdate);
        };
    }, [conversationId, currentUser?._id, info, navigate, queryClient]);

    const activeConversation = inboxConversations.find((conversation) => conversation._id === conversationId)
        || requestConversations.find((conversation) => conversation._id === conversationId)
        || sentConversations.find((conversation) => conversation._id === conversationId);

    const allConversations = useMemo(() => {
        const merged = [...inboxConversations, ...requestConversations, ...sentConversations];
        return merged.filter((conversation, index) => (
            merged.findIndex((item) => item._id === conversation._id) === index
        ));
    }, [inboxConversations, requestConversations, sentConversations]);

    return (
        <div className={`chat-layout ${conversationId ? 'mobile-active-chat' : 'mobile-active-list'}`}>
            <Navbar />

            <aside className="chat-sidebar">
                <ConversationList
                    conversations={conversations}
                    knownConversations={allConversations}
                    followingList={followingData?.following || []}
                    activeId={conversationId}
                    onlineUsers={new Set()}
                    currentUserId={currentUser?._id}
                    activeTab={activeTab}
                    setActiveTab={setSelectedTab}
                    requestCount={requestConversations.length}
                    sentCount={sentConversations.length}
                />
            </aside>

            <main className="chat-main">
                {conversationId ? (
                    <ChatWindow
                        key={conversationId}
                        conversationId={conversationId}
                        conversation={activeConversation}
                        currentUser={currentUser}
                    />
                ) : (
                    <ChatLanding />
                )}
            </main>

            <div className="chat-mobile-nav">
                <MobileNavbar />
            </div>
        </div>
    );
};

export default Chat;
