import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { Heart, MessageSquare, UserPlus, Zap } from '../common/Icons';
import userService from '../../services/user.service';
import { useToast } from '../Toast'; // Assuming Hook exists

const NotificationItem = ({ notification }) => {
    const { sender, type, text, createdAt, post, read } = notification;
    const navigate = useNavigate();
    const toast = useToast();
    const [actionStatus, setActionStatus] = useState(null);

    // Robust ID extraction
    const senderId = sender?._id || sender?.id;

    const handleAccept = async (e) => {
        e.stopPropagation();
        if (!senderId) {
            console.error("Notification missing sender ID:", notification);
            toast.error("Error: Invalid request data");
            return;
        }

        try {
            await userService.acceptFollowRequest(senderId);
            setActionStatus('accepted');
            toast.success("Request accepted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to accept");
        }
    };

    const handleReject = async (e) => {
        e.stopPropagation();
        if (!senderId) return;

        try {
            await userService.rejectFollowRequest(senderId);
            setActionStatus('rejected');
            toast.success("Request rejected");
        } catch (err) {
            console.error(err);
            toast.error("Failed to reject");
        }
    };

    const renderIcon = () => {
        switch (type) {
            case 'like': return <Heart size={10} fill="white" stroke="white" />;
            case 'comment': return <MessageSquare size={10} fill="white" stroke="white" />;
            case 'follow': return <UserPlus size={10} stroke="white" />;
            case 'request': return <UserPlus size={10} stroke="white" />;
            default: return <Zap size={10} stroke="white" />;
        }
    };

    const getIconBgColor = () => {
        switch (type) {
            case 'like': return 'var(--color-error)';
            case 'comment': return 'var(--color-primary)';
            case 'follow': return 'var(--color-success)';
            case 'request': return 'var(--color-primary)';
            default: return 'var(--color-text-muted)';
        }
    };

    const renderMessage = () => {
        switch (type) {
            case 'like': return "Liked your post";
            case 'comment': return "Commented on your post";
            case 'follow': return "Started following you";
            case 'request': return "requested to follow you";
            default: return "Sent a notification";
        }
    };

    // Simple time ago helper
    const timeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const handleItemClick = () => {
        if (post && post._id) {
            navigate(`/post/${post._id}`);
        }
    };

    return (
        <div className={`notification-item`} onClick={handleItemClick}>
            {/* Unread Dot (Left) */}
            {!read && <div className="unread-indicator"></div>}

            {/* Avatar with Badge */}
            <div className="notif-avatar-wrapper" onClick={(e) => e.stopPropagation()}>
                <Link to={`/profile/${senderId}`}>
                    <Avatar src={sender.avatar} size="md" />
                </Link>
                <div className="notif-icon-badge" style={{ backgroundColor: getIconBgColor() }}>
                    {renderIcon()}
                </div>
            </div>

            {/* Content (Middle) */}
            <div className="notif-content">
                <div className="notif-text">
                    <span
                        className="notif-user"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${senderId}`);
                        }}
                    >
                        {sender.fullname || sender.username}
                    </span>
                    {renderMessage()}
                </div>

                {type === 'request' && !actionStatus && (
                    <div className="notif-actions" style={{ display: 'flex', gap: '8px', marginTop: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={handleAccept}
                            style={{
                                background: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 16px',
                                color: 'white',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >Confirm</button>
                        <button
                            onClick={handleReject}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 16px',
                                color: 'var(--color-text-main)',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >Delete</button>
                    </div>
                )}
                {actionStatus && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        {actionStatus === 'accepted' ? 'Request Accepted' : 'Request Removed'}
                    </div>
                )}

                <span className="notif-time">{timeAgo(createdAt)}</span>
            </div>

            {/* Post Preview (Right) */}
            {post && post.media && post.media[0] && (
                <div className="notif-post-preview">
                    {post.media[0].type === 'image' ? (
                        <img src={post.media[0].url} alt="post" />
                    ) : (
                        <video src={post.media[0].url} />
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationItem;
