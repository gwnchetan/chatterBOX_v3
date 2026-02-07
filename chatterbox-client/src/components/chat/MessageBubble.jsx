import React from 'react';
import Avatar from '../common/Avatar';
import { format } from 'date-fns';

const MessageBubble = ({ message, isOwn, showAvatar, sender }) => {
    return (
        <div className={`message-row ${isOwn ? 'message-row--own' : 'message-row--received'}`}>
            {!isOwn && (
                <div className="message-avatar" style={{ opacity: showAvatar ? 1 : 0 }}>
                    <Avatar src={sender?.avatar} size="sm" alt={sender?.fullname} />
                </div>
            )}

            <div className={`message-bubble ${isOwn ? 'message-bubble--own' : 'message-bubble--received'} ${message.status === 'sending' ? 'message-sending' : ''}`}>
                {message.content?.text && (
                    <p className="message-text">{message.content.text}</p>
                )}

                <div className="message-meta">
                    <span className="message-time">
                        {message.createdAt ? format(new Date(message.createdAt), 'h:mm a') : '...'}
                    </span>
                    {isOwn && (
                        <span className="message-status">
                            {message.status === 'sending' && '🕒'}
                            {message.status === 'sent' && '✓'}
                            {message.status === 'read' && '✓✓'}
                            {message.status === 'error' && '⚠️'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
