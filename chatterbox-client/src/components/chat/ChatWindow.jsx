import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import chatService from '../../services/chat.service';
import userService from '../../services/user.service';
import { socketService } from '../../services/socket.service';
import MessageBubble from './MessageBubble';
import Avatar from '../common/Avatar';
import LogoLoader from '../common/LogoLoader';
import { ChevronLeft, Send, MoreHorizontal, Phone, Video } from '../common/Icons';
import { useToast } from '../Toast';

const ChatWindow = ({ conversationId, conversation, currentUser }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToast();
    const [newMessage, setNewMessage] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);
    const menuRef = useRef(null);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error: messagesError
    } = useInfiniteQuery({
        queryKey: ['messages', conversationId],
        queryFn: ({ pageParam = null }) => chatService.getMessages(conversationId, pageParam),
        getNextPageParam: (lastPage) => lastPage.length === 50 ? lastPage[0].createdAt : undefined,
        enabled: !!conversationId,
        staleTime: 1000 * 30,
        initialPageParam: null
    });

    const messagePages = data?.pages || [];
    const messages = messagePages.length
        ? [...messagePages].reverse().flatMap((page) => page)
        : [];

    const { data: blockedUsersData } = useQuery({
        queryKey: ['blocked-users'],
        queryFn: userService.getBlockedUsers,
        enabled: !!currentUser?._id && !!conversation,
        staleTime: 1000 * 60
    });

    useEffect(() => {
        if (!conversationId) return;
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationId, messages.length]);

    useEffect(() => {
        if (!conversationId || conversation?.status !== 'active') return;
        socketService.joinChat(conversationId);

        return () => {
            socketService.leaveChat(conversationId);
        };
    }, [conversation?.status, conversationId]);

    useEffect(() => {
        if (!conversationId || conversation?.status !== 'active') return;
        chatService.markAsRead(conversationId).catch(() => {});
    }, [conversation?.status, conversationId, messages.length]);

    const sendMessageMutation = useMutation({
        mutationFn: (content) => chatService.sendMessage(conversationId, content),
        onMutate: async (content) => {
            await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
            const previousMessages = queryClient.getQueryData(['messages', conversationId]);

            const optimisticMessage = {
                _id: `temp-${Date.now()}`,
                conversationId,
                sender: currentUser,
                content,
                createdAt: new Date().toISOString(),
                status: 'sending'
            };

            queryClient.setQueryData(['messages', conversationId], (oldData) => {
                if (!oldData?.pages?.length) {
                    return {
                        pages: [[optimisticMessage]],
                        pageParams: [null]
                    };
                }

                const newPages = [...oldData.pages];
                newPages[0] = [...newPages[0], optimisticMessage];
                return { ...oldData, pages: newPages };
            });

            setNewMessage('');
            return { previousMessages };
        },
        onError: (error, _content, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['messages', conversationId], context.previousMessages);
            }
            toast.error(error.response?.data?.message || 'Failed to send message');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
    });

    const handleSend = (event) => {
        event.preventDefault();
        if (!newMessage.trim()) return;
        sendMessageMutation.mutate({ text: newMessage.trim() });
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            handleSend(event);
        }
    };

    useEffect(() => {
        if (!textareaRef.current) return;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }, [newMessage]);

    const { ref: topRef, inView } = useInView();
    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, inView]);

    useEffect(() => {
        if (!menuOpen) {
            return undefined;
        }

        const handleOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [menuOpen]);

    const otherUser = conversation?.participants?.find((participant) => participant?._id !== currentUser?._id) || null;
    const isBlockedByCurrentUser = blockedUsersData?.blockedUsers?.some((user) => String(user._id) === String(otherUser?._id));

    const handleAccept = async () => {
        try {
            await chatService.acceptRequest(conversationId);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Request accepted');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to accept request');
        }
    };

    const handleReject = async () => {
        try {
            await chatService.rejectRequest(conversationId);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            navigate('/chat');
            toast.success('Request rejected');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to reject request');
        }
    };

    const handleDeleteConversation = async () => {
        const confirmed = window.confirm('Delete this conversation from your chat list?');
        if (!confirmed) {
            return;
        }

        try {
            await chatService.deleteConversation(conversationId);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            setMenuOpen(false);
            navigate('/chat');
            toast.success('Conversation deleted');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete conversation');
        }
    };

    const handleDeleteMessage = async (messageId) => {
        const confirmed = window.confirm('Delete this message for everyone?');
        if (!confirmed) {
            return;
        }

        try {
            await chatService.deleteMessage(conversationId, messageId);
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            toast.success('Message deleted');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to delete message');
        }
    };

    const handleBlockToggle = async () => {
        if (!otherUser?._id) {
            return;
        }

        const actionLabel = isBlockedByCurrentUser ? 'unblock' : 'block';
        const confirmed = window.confirm(`Do you want to ${actionLabel} this user?`);
        if (!confirmed) {
            return;
        }

        try {
            if (isBlockedByCurrentUser) {
                await userService.unblockUser(otherUser._id);
                toast.success('User unblocked');
            } else {
                await userService.blockUser(otherUser._id);
                toast.success('User blocked');
                navigate('/chat');
            }

            queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['following'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            setMenuOpen(false);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || `Failed to ${actionLabel} user`);
        }
    };

    if (!conversationId) {
        return <div className="chat-window-empty" />;
    }

    const isPending = conversation?.status === 'pending';
    const requesterId = conversation?.requestedBy?._id || conversation?.requestedBy;
    const isRequester = requesterId === currentUser?._id;
    const isReceiver = isPending && !isRequester;
    const pendingMessageSent = isRequester && isPending && messages.length > 0;
    const canSendMessage = !isReceiver && !isBlockedByCurrentUser && !pendingMessageSent;
    const displayUser = otherUser || { fullname: 'Chat', username: '' };

    if (!conversation && isLoading) {
        return (
            <div className="chat-window-empty">
                <LogoLoader size="2rem" text="Loading conversation..." />
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="chat-window-empty">
                <div className="empty-state-content">
                    <h2 className="empty-title">Conversation unavailable</h2>
                    <p className="empty-subtitle">This chat is not available in your inbox right now.</p>
                </div>
            </div>
        );
    }

    if (messagesError) {
        return (
            <div className="chat-window-empty">
                <div className="empty-state-content">
                    <h2 className="empty-title">Unable to load messages</h2>
                    <p className="empty-subtitle">{messagesError.response?.data?.message || 'This conversation is not available.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-window-container">
            <header className="chat-header">
                <div className="chat-header-user">
                    <button
                        type="button"
                        className="chat-mobile-back"
                        onClick={() => navigate('/chat')}
                        aria-label="Back to chat list"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <Avatar src={displayUser.avatar} size="sm" />
                    <div className="user-details">
                        <span className="user-name">{displayUser.fullname}</span>
                        {displayUser.username && <span className="user-handle">@{displayUser.username}</span>}
                    </div>
                </div>
                <div className="chat-actions" ref={menuRef}>
                    <button><Phone size={20} /></button>
                    <button><Video size={20} /></button>
                    <button type="button" onClick={() => setMenuOpen((currentValue) => !currentValue)}>
                        <MoreHorizontal size={20} />
                    </button>
                    {menuOpen && (
                        <div className="chat-actions-menu">
                            {isPending && isRequester && (
                                <button type="button" onClick={handleReject}>
                                    Cancel request
                                </button>
                            )}
                            <button type="button" onClick={handleDeleteConversation}>
                                Delete chat
                            </button>
                            {otherUser?._id && (
                                <button type="button" onClick={handleBlockToggle}>
                                    {isBlockedByCurrentUser ? 'Unblock user' : 'Block user'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {isReceiver && (
                <div className="request-banner">
                    <div className="request-banner-content">
                        <p><strong>{displayUser.fullname}</strong> wants to send you a message.</p>
                        <p className="subtext">They will only be able to keep chatting after you accept.</p>
                        <div className="request-actions">
                            <button className="btn-reject" onClick={handleReject}>Reject</button>
                            <button className="btn-accept" onClick={handleAccept}>Accept</button>
                        </div>
                    </div>
                </div>
            )}

            {isRequester && isPending && (
                <div className="request-banner">
                    <div className="request-banner-content">
                        <p>{pendingMessageSent ? 'Request sent. Wait for acceptance to send more messages.' : 'Request sent. You can send one message while this request is pending.'}</p>
                        <div className="request-actions">
                            <button className="btn-reject" onClick={handleReject}>Cancel Request</button>
                        </div>
                    </div>
                </div>
            )}

            {isBlockedByCurrentUser && (
                <div className="request-banner">
                    <div className="request-banner-content">
                        <p>You blocked this user.</p>
                        <div className="request-actions">
                            <button className="btn-accept" onClick={handleBlockToggle}>Unblock</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="chat-messages">
                <div ref={topRef} className="scroll-trigger" />
                {isFetchingNextPage && <LogoLoader size="1.5rem" />}

                {isLoading && <LogoLoader size="2rem" text="Loading messages..." />}

                {messages.map((message, index) => {
                    const senderId = message.sender?._id || message.sender;
                    const isOwn = senderId === currentUser?._id;
                    const previousSenderId = messages[index - 1]?.sender?._id || messages[index - 1]?.sender;
                    const showAvatar = !isOwn && previousSenderId !== senderId;

                    return (
                        <MessageBubble
                            key={message._id}
                            message={message}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                            sender={message.sender}
                            canDelete={isOwn && !message.isDeleted}
                            onDelete={handleDeleteMessage}
                        />
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {canSendMessage && (
                <form className="chat-input-area" onSubmit={handleSend}>
                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isPending ? 'Send a message request...' : 'Type a message...'}
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
