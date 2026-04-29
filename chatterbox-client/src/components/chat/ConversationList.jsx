import React, { useState } from 'react';
import Avatar from '../common/Avatar';
import { Search } from '../common/Icons';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import chatService from '../../services/chat.service';

const ConversationList = ({ conversations, knownConversations, followingList, activeId, onlineUsers, currentUserId, activeTab, setActiveTab, requestCount, sentCount }) => {
    const [filter, setFilter] = useState('');
    const navigate = useNavigate();

    // Filter Logic (Search)
    const getFiltered = (list) => list?.filter(c => {
        const other = c.participants?.find(p => p?._id !== currentUserId) || c.participants?.[0];
        return other?.fullname?.toLowerCase().includes(filter.toLowerCase()) ||
            other?.username?.toLowerCase().includes(filter.toLowerCase());
    }) || [];

    const displayedConversations = getFiltered(conversations);

    // 3. Handle Select
    const handleSelect = (id) => {
        navigate(`/chat/${id}`);
    };

    // 4. Handle Starting Chat from Following
    const handleStartChat = async (targetUserId) => {
        try {
            const existing = knownConversations?.find(c => c.participants.some(p => p._id === targetUserId));
            if (existing) {
                navigate(`/chat/${existing._id}`);
            } else {
                const conversation = await chatService.initiateConversation(targetUserId);
                navigate(`/chat/${conversation._id}`);
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="conversation-list-container">
            <div className="conversation-header">
                <h2>Chats</h2>

                {/* Tabs */}
                <div className="chat-tabs">
                    <button
                        className={`chat-tab ${activeTab === 'inbox' ? 'active' : ''}`}
                        onClick={() => setActiveTab('inbox')}
                    >
                        Inbox
                    </button>
                    <button
                        className={`chat-tab ${activeTab === 'requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        Requests
                        {requestCount > 0 && <span className="badge">{requestCount}</span>}
                    </button>
                    <button
                        className={`chat-tab ${activeTab === 'sent' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sent')}
                    >
                        Sent
                        {sentCount > 0 && <span className="badge">{sentCount}</span>}
                    </button>
                </div>

                <div className="conversation-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="conversation-items">
                {activeTab === 'inbox' && displayedConversations.length === 0 && filter === '' && (
                    <div className="empty-state-start-chat">
                        <p className="hint-text">Start a conversation with people you follow:</p>
                        <div className="suggested-list">
                            {followingList?.map(user => (
                                <div key={user._id} className="suggested-user-item" onClick={() => handleStartChat(user._id)}>
                                    <Avatar src={user.avatar} size="md" />
                                    <div className="user-info-mini">
                                        <span className="name">{user.fullname}</span>
                                        <span className="username">@{user.username}</span>
                                    </div>
                                </div>
                            ))}
                            {followingList?.length === 0 && (
                                <p className="no-following">You are not following anyone yet.</p>
                            )}
                        </div>
                    </div>
                )}

                {displayedConversations.map(conv => {
                    const otherUser = conv.participants?.find(p => p?._id !== currentUserId) || conv.participants?.[0];
                    const isOnline = onlineUsers?.has(otherUser?._id);
                    const isActive = conv._id === activeId;
                    const requestedBy = conv.requestedBy?._id || conv.requestedBy;

                    return (
                        <div
                            key={conv._id}
                            className={`conversation-item ${isActive ? 'active' : ''}`}
                            onClick={() => handleSelect(conv._id)}
                        >
                            <div className="conversation-avatar-wrapper">
                                <Avatar src={otherUser?.avatar} size="md" alt={otherUser?.fullname} />
                                {isOnline && <span className="online-indicator"></span>}
                            </div>
                            <div className="conversation-info">
                                <div className="conversation-top">
                                    <span className="conversation-name">{otherUser?.fullname}</span>
                                    {conv.lastMessage && (
                                        <span className="conversation-time">
                                            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                                        </span>
                                    )}
                                </div>
                                <div className="conversation-bottom">
                                    <p className="conversation-preview">
                                        {conv.status === 'pending' && requestedBy !== currentUserId ? (
                                            <span className="request-text">Message Request</span>
                                        ) : (
                                            <>
                                                {(conv.lastMessage?.sender?._id || conv.lastMessage?.sender) === currentUserId && 'You: '}
                                                {conv.lastMessage?.text || (conv.status === 'pending' ? 'Request Sent' : 'No messages')}
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ConversationList;
