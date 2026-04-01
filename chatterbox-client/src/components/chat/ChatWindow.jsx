import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import chatService from '../../services/chat.service';
import { socketService } from '../../services/socket.service';
import MessageBubble from './MessageBubble';
import Avatar from '../common/Avatar';
import LogoLoader from '../common/LogoLoader';
import { Send, MoreHorizontal, Phone, Video } from '../common/Icons';

const ChatWindow = ({ conversationId, conversation, currentUser }) => {
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState('');
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
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
        onError: (_error, _content, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['messages', conversationId], context.previousMessages);
            }
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

    const handleAccept = async () => {
        try {
            await chatService.acceptRequest(conversationId);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (error) {
            console.error(error);
        }
    };

    const handleReject = async () => {
        try {
            await chatService.rejectRequest(conversationId);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (error) {
            console.error(error);
        }
    };

    if (!conversationId) {
        return <div className="chat-window-empty" />;
    }

    const isPending = conversation?.status === 'pending';
    const requesterId = conversation?.requestedBy?._id || conversation?.requestedBy;
    const isRequester = requesterId === currentUser?._id;
    const isReceiver = isPending && !isRequester;
    const otherUser = conversation?.participants?.find((participant) => participant?._id !== currentUser?._id) || { fullname: 'Chat' };

    return (
        <div className="chat-window-container">
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

            {isReceiver && (
                <div className="request-banner">
                    <div className="request-banner-content">
                        <p><strong>{otherUser.fullname}</strong> wants to send you a message.</p>
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
                    <p>Request sent. You can send one message while this request is pending.</p>
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
                        />
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {(!isReceiver && !(isRequester && isPending && messages.length > 0)) && (
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

            {(isRequester && isPending && messages.length > 0) && (
                <div className="p-4 text-center text-gray-500 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm">Request sent. You can send more messages once accepted.</p>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
