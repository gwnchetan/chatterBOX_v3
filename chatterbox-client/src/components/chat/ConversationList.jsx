import React, { useState } from 'react';
import Avatar from '../common/Avatar';
import { Search } from '../common/Icons';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const ConversationList = ({ conversations, followingList, activeId, onlineUsers, currentUserId }) => {
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'requests'
    const navigate = useNavigate();

    // 1. Separate Conversations
    const inboxConversations = conversations?.filter(c =>
        c.status === 'active' ||
        (c.status === 'pending' && c.requestedBy === currentUserId) // Show my sent requests in inbox? Or separate? detailed design says Requests tab is for received.
        // Let's keep sent requests in inbox for now, or hide them. 
        // Better: Inbox = Active + Sent Requests. Requests Tab = Received Requests.
    ) || [];

    const requestConversations = conversations?.filter(c =>
        c.status === 'pending' && c.requestedBy !== currentUserId
    ) || [];

    // 2. Filter Logic
    const getFiltered = (list) => list.filter(c => {
        const other = c.participants?.find(p => p?._id !== currentUserId) || c.participants?.[0];
        return other?.fullname?.toLowerCase().includes(filter.toLowerCase()) ||
            other?.username?.toLowerCase().includes(filter.toLowerCase());
    });

    const displayedConversations = activeTab === 'inbox' ? getFiltered(inboxConversations) : getFiltered(requestConversations);

    // 3. Handle Select
    const handleSelect = (id) => {
        navigate(`/chat/${id}`);
    };

    // 4. Handle Starting Chat from Following
    const handleStartChat = async (targetUserId) => {
        try {
            // Initiate (get existing or create)
            // We need chatService here. 
            // Better: Navigate to profile? Or just initiate.
            // Let's import chatService.
            // Wait, we can't easily import standard service if used in component without props? 
            // We can imports service directly.
            navigate(`/profile/${targetUserId}`); // Simplest: Go to profile to message. 
            // User asked to "show list ... add them into chat".
            // If I click, it should open chat.
            // Implies: navigate to /chat/new?userId=... or API call.
            // Let's try to find if conversation exists in our list first.
            const existing = conversations?.find(c => c.participants.some(p => p._id === targetUserId));
            if (existing) {
                navigate(`/chat/${existing._id}`);
            } else {
                // We need to trigger initiate. 
                // We can use a direct service call here? Yes.
                // But better to navigate to profile for now to rely on existing 'handleMessage'.
                // OR dispatch an event?
                // Let's just use navigate to profile for safety/reuse.
                navigate(`/profile/${targetUserId}`);
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
                        {requestConversations.length > 0 && <span className="badge">{requestConversations.length}</span>}
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
                                        {conv.status === 'pending' && conv.requestedBy !== currentUserId ? (
                                            <span className="request-text">Message Request</span>
                                        ) : (
                                            <>
                                                {conv.lastMessage?.sender === currentUserId && 'You: '}
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
