import React, { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import chatService from '../../services/chat.service';
import MessageBubble from './MessageBubble';
import Avatar from '../common/Avatar';
import { Send, MoreHorizontal, Phone, Video } from '../common/Icons';
import { useInView } from 'react-intersection-observer';
import LogoLoader from '../common/LogoLoader';

const ChatWindow = ({ conversationId, conversation, currentUser }) => {
    const [newMessage, setNewMessage] = useState('');
    const queryClient = useQueryClient();
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    // Fetch Messages
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useInfiniteQuery({
        queryKey: ['messages', conversationId],
        queryFn: ({ pageParam = null }) => chatService.getMessages(conversationId, pageParam),
        getNextPageParam: (lastPage) => lastPage.length > 0 ? lastPage[0].createdAt : undefined, // Assuming API returns newest last? No, usually API returns chunk. 
        // Backend: .sort({ createdAt: 1 }) -> Oldest first? 
        // Wait, standard chat is Newest at bottom.
        // If backend returns Oldest -> Newest (1..50), user sees 50 at bottom.
        // Previous page should be (before: timestamp of 1).
        // Let's assume standard behavior: API returns simple list. define getNextPageParam to use oldest message date.
        select: (data) => ({
            pages: [...data.pages].reverse(), // Reverse pages so page 0 (latest) is at bottom
            pageParams: [...data.pageParams].reverse(),
        }),
        // Actually simplest is: API returns N messages before T.
        // We want to render them in chronological order.
        enabled: !!conversationId,
        staleTime: Infinity,
    });

    // We need to invert the data for display: 
    // Data.pages[0] is the LATEST chunk (closest to now).
    // Data.pages[N] is the OLDEST chunk.
    // We want to render Oldest -> Newest.

    // FlatMap and Sort
    const messages = data?.pages.flatMap(page => page).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) || [];

    // Scroll to bottom on initial load or new message (if near bottom)
    useEffect(() => {
        if (!isLoading) {
            bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        }
    }, [conversationId, isLoading]);

    // Send Mutation
    const sendMessageMutation = useMutation({
        mutationFn: (content) => chatService.sendMessage(conversationId, content),
        onMutate: async (content) => {
            await queryClient.cancelQueries(['messages', conversationId]);
            const previousMessages = queryClient.getQueryData(['messages', conversationId]);

            // Optimistic Update
            const tempId = Math.random().toString();
            const optimisticMessage = {
                _id: tempId,
                conversationId,
                sender: currentUser,
                content,
                createdAt: new Date().toISOString(),
                status: 'sending'
            };

            queryClient.setQueryData(['messages', conversationId], (old) => {
                if (!old) return { pages: [[optimisticMessage]], pageParams: [null] };
                const newPages = [...old.pages];
                newPages[0] = [...newPages[0], optimisticMessage]; // Add to latest page
                return { ...old, pages: newPages };
            });

            setNewMessage('');
            // Scroll to bottom
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);

            return { previousMessages };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['messages', conversationId], context.previousMessages);
        },
        onSettled: () => {
            queryClient.invalidateQueries(['messages', conversationId]);
            queryClient.invalidateQueries(['conversations']); // Update last message in list
        },
    });

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessageMutation.mutate({ text: newMessage });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSend(e);
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [newMessage]);


    // Intersection Observer for Infinite Scroll (Top of list)
    const { ref: topRef, inView } = useInView();
    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    // Request Handling
    const handleAccept = async () => {
        try {
            await chatService.acceptRequest(conversationId);
            queryClient.invalidateQueries(['conversations']);
        } catch (e) { console.error(e); }
    };

    const handleReject = async () => {
        try {
            await chatService.rejectRequest(conversationId);
            queryClient.invalidateQueries(['conversations']);
            // Navigate away? Or show "Rejected" state using state?
            // Usually navigate back to empty state.
        } catch (e) { console.error(e); }
    };


    if (!conversationId) {
        return (
            <div className="chat-window-empty">
                <div className="empty-state-content">
                    {/* Floating Icons Background (Optional CSS enhancement) */}
                    <div className="empty-icon-wrapper">
                        {/* We can use MessageSquare or BrandLogo */}
                        <div className="brand-logo-large">
                            <span>C</span>
                        </div>
                    </div>
                    <h2 className="empty-title">Your Messages</h2>
                    <p className="empty-subtitle">Send private photos and messages to a friend or group.</p>
                    <button className="btn-start-new" onClick={() => {
                        // Logic to focus search or open 'new chat' modal
                        // For now just focus search input if possible, or do nothing specific visually other than ripple
                        document.querySelector('.conversation-search input')?.focus();
                    }}>
                        Send Message
                    </button>
                </div>
            </div>
        );
    }

    // Determine Status
    const isPending = conversation?.status === 'pending';
    const isRequester = conversation?.requestedBy === currentUser?._id || conversation?.requestedBy?._id === currentUser?._id;
    const isReceiver = isPending && !isRequester;

    // Identify Other User (Header)
    const otherUser = conversation?.participants?.find(p => p?._id !== currentUser?._id) || { fullname: 'Chat' };

    return (
        <div className="chat-window-container">
            {/* Header */}
            <header className="chat-header">
                <div className="chat-header-user">
                    <Avatar src={otherUser.avatar} size="sm" />
                    <div className="user-details">
                        <span className="user-name">{otherUser.fullname}</span>
                        {otherUser.username && <span className="user-handle">@{otherUser.username}</span>}
                    </div>
                </div>
                <div className="chat-actions">
                    <button><Phone size={20} /></button>
                    <button><Video size={20} /></button>
                    <button><MoreHorizontal size={20} /></button>
                </div>
            </header>

            {/* Request Banner */}
            {isReceiver && (
                <div className="request-banner">
                    <div className="request-banner-content">
                        <p><strong>{otherUser.fullname}</strong> wants to send you a message.</p>
                        <p className="subtext">They won't know you've seen this request until you accept.</p>
                        <div className="request-actions">
                            <button className="btn-reject" onClick={handleReject}>Reject</button>
                            <button className="btn-accept" onClick={handleAccept}>Accept</button>
                        </div>
                    </div>
                </div>
            )}

            {isRequester && isPending && (
                <div className="request-banner">
                    <p>Request sent. You can send messages, but {otherUser.fullname} must accept before they see them.</p>
                </div>
            )}

            {/* Messages Area */}
            <div className="chat-messages">
                <div ref={topRef} className="scroll-trigger" />
                {isFetchingNextPage && <LogoLoader size="1.5rem" />}

                {messages.map((msg, index) => {
                    // Safe access to sender and current user
                    const senderId = msg.sender?._id || msg.sender;
                    const currentUserId = currentUser?.id || currentUser?._id;

                    const isOwn = senderId === currentUserId;
                    const showAvatar = !isOwn && (index === 0 || (messages[index - 1].sender?._id || messages[index - 1].sender) !== senderId);

                    return (
                        <MessageBubble
                            key={msg._id}
                            message={msg}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                            sender={msg.sender}
                        />
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input Area (Blocked if Pending for Receiver) */}
            {!isReceiver && (
                <form className="chat-input-area" onSubmit={handleSend}>
                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="send-btn">
                        <Send size={20} />
                    </button>
                </form>
            )}
        </div>
    );
};

export default ChatWindow;
