import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import chatService from '../services/chat.service';
import userService from '../services/user.service';
import Navbar from '../components/layout/Navbar';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import ChatLanding from '../components/chat/ChatLanding';
import { socketService } from '../services/socket.service';
import { useToast } from '../components/Toast';
import './chat.css';

const Chat = () => {
    const { userId: urlConversationId } = useParams(); // Wait, route is /chat/:conversationId ? 
    // Usually /chat or /chat/:id. 
    // If param is 'userId', we might need to resolve to conversation or create one.
    // The plan said: /chat/:conversationId

    // Actually, users might link to /profile -> Message -> that initiates a conversation and should redirect to /chat/:conversationId
    // Let's assume useParams returns conversationId.
    const params = useParams();
    const conversationId = params.conversationId;
    console.log('DEBUG: Chat params', params);
    console.log('DEBUG: conversationId', conversationId);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Get currentUser (Fallback to localStorage if no context)
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    if (currentUser?.id && !currentUser._id) currentUser._id = currentUser.id; // Normalize ID

    // Fetch Conversations
    const { data: conversations, isLoading: loadingConversations } = useQuery({
        queryKey: ['conversations'],
        queryFn: chatService.getConversations,
        staleTime: 1000 * 60, // 1 minute
    });

    // Fetch Following (for suggestions)
    const { data: followingData } = useQuery({
        queryKey: ['following'],
        queryFn: userService.getFollowing, // Make sure userService is imported
        staleTime: 1000 * 60 * 5,
    });

    // Determine requests vs active
    // We can do this in the component or here.

    // Toast Notification
    const { info } = useToast();

    // Sound Effect (Simple Pop/Ding)
    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'); // Or a local file if preferred
        // Fallback or use a reliable URL. 
        // Let's use a widely accessible one or base64. 
        // Using a short base64 beep for reliability without external fetch issues?
        // Actually, let's use a nice short URL or just a standard HTML5 beep if possible? No standard beep.
        // Using a reliable CDN for a "pop" sound.
        audio.play().catch(e => console.log('Audio play failed', e));
    };

    // Real-time Updates (Global Chat Events)
    useEffect(() => {
        // We need to listen to 'chat:message' to update conversation list (last message)
        const handleNewMessage = (newMessage) => {
            const isOwn = (newMessage.sender._id || newMessage.sender) === currentUser?._id;

            // 1. Update Conversation List (Last Message)
            queryClient.setQueryData(['conversations'], (old) => {
                if (!old) return old;
                // Move updated conversation to top and update lastMessage
                const otherConvs = old.filter(c => c._id !== newMessage.conversationId);
                const targetConv = old.find(c => c._id === newMessage.conversationId);

                // If existing conversation, update it
                if (targetConv) {
                    const updatedConv = {
                        ...targetConv,
                        lastMessage: {
                            text: newMessage.content.text,
                            sender: newMessage.sender._id || newMessage.sender,
                            createdAt: newMessage.createdAt
                        },
                        updatedAt: newMessage.createdAt,
                        // Increment unread count if it's not the active one?
                        // activeId is conversationId from params
                        // If (conversationId !== newMessage.conversationId) -> increment unread?
                        // We need unread count in schema first. Assuming backend handles it, but for UI we might need optimistic update.
                    };
                    return [updatedConv, ...otherConvs];
                }

                // If NEW conversation (not in list), we should invalidate to fetch it
                queryClient.invalidateQueries(['conversations']);
                return old;
            });

            // 2. Update Active Chat Window (Real-time message append)
            // If the message is for the currently open conversation, append it to the message list cache
            if (newMessage.conversationId === conversationId) {
                queryClient.setQueryData(['messages', conversationId], (old) => {
                    if (!old) return old; // converting invalidation might be safer but flashing.
                    // Append to the FIRST page (newest/bottom) if we structure pages as [oldest ... newest]? 
                    // Wait, ChatWindow uses: pages: [...data.pages].reverse() in select?
                    // No, invalidation is safest to respect the complex pagination logic, 
                    // BUT invalidation causes flickers.
                    // Let's try to update standard infinite query structure: { pages: [ [msg, msg], [msg] ], pageParams: [...] }
                    // Usually page 0 is the LATEST fetched chunk.

                    // Actually, let's just invalidate for now to be 100% sure it syncs, 
                    // AND typically the 'sending' user already added it optimistically.
                    // If it's incoming (isOwn === false), we MUST add it.
                    if (!isOwn) {
                        // Optimistic append for receiver
                        const newPages = [...old.pages];
                        if (newPages.length > 0) {
                            newPages[0] = [newMessage, ...newPages[0]]; // Assuming desc order validation?
                            // Wait, ChatWindow sorts: sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                            // So order in array doesn't strictly matter for render, just existence.
                            // But InfiniteQuery structure matters.
                        }
                        return { ...old, pages: newPages };
                    }
                    return old;
                });
                // Invalidate to ensure consistency eventually
                queryClient.invalidateQueries(['messages', conversationId]);
            }

            // 3. Notifications (Sound + Toast)
            if (!isOwn) {
                // Play Sound
                playNotificationSound();

                // Show Toast if NOT active conversation
                if (newMessage.conversationId !== conversationId) {
                    info(`New message from ${newMessage.sender.fullname || 'Users'}`, 4000);
                }
            }
        };

        socketService.on('chat:message', handleNewMessage);

        return () => {
            socketService.off('chat:message', handleNewMessage);
        };
    }, [queryClient, conversationId, currentUser, info]);


    return (
        <div className={`chat-layout ${conversationId ? 'mobile-active-chat' : 'mobile-active-list'}`}>
            <Navbar /> {/* Column 1 */}

            <aside className="chat-sidebar">
                <ConversationList
                    conversations={conversations}
                    followingList={followingData?.following || []}
                    activeId={conversationId}
                    onlineUsers={new Set()} // TODO: Implement online status
                    currentUserId={currentUser?._id}
                />
            </aside> {/* Column 2 */}

            <main className="chat-main">
                {conversationId ? (
                    <ChatWindow
                        key={conversationId}
                        conversationId={conversationId}
                        conversation={conversations?.find(c => c._id === conversationId)}
                        currentUser={currentUser}
                    />
                ) : (
                    <ChatLanding />
                )}
            </main> {/* Column 3 */}
        </div>
    );
};

export default Chat;
