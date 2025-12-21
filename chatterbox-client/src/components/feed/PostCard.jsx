import React, { useState } from 'react';
import Avatar from '../common/Avatar';
import { MoreHorizontal, Heart, MessageSquare, Share2, Repeat } from '../common/Icons';

const PostCard = ({ post }) => {
    const [liked, setLiked] = useState(post.liked);

    // Hover-based image grid logic
    const renderImages = () => {
        if (!post.images || post.images.length === 0) return null;

        const count = post.images.length;
        // Determine layout class primarily for container sizing or specific grid types
        let layoutClass = 'hover-grid-one';
        if (count === 2) layoutClass = 'hover-grid-two';
        if (count >= 3) layoutClass = 'hover-grid-multi';

        const visibleImages = post.images.slice(0, 4); // Show max 4

        return (
            <div className={`post-hover-grid ${layoutClass}`}>
                {visibleImages.map((img, idx) => (
                    <div key={idx} className="hover-image-item">
                        <img src={img} alt="" loading="lazy" />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <article className="post-card-dark">
            <div className="post-header">
                <div className="post-meta">
                    <Avatar src={post.avatar} alt={post.author} status="online" size="md" />
                    <div className="meta-text">
                        <div className="meta-top">
                            <h4>{post.author}</h4>
                            <span className="meta-dot">·</span>
                            <span className="meta-time">{post.time}</span>
                        </div>
                        <span className="meta-handle">{post.handle || '@user'}</span>
                    </div>
                </div>
                <button className="post-options">
                    <MoreHorizontal />
                </button>
            </div>

            <div className="post-content-text">
                {post.text}
            </div>

            {renderImages()}

            <div className="post-actions-bar">
                <button className="action-item" onClick={() => setLiked(!liked)}>
                    <div className={`icon-container ${liked ? 'liked' : ''}`}>
                        <Heart className={liked ? 'heart-filled' : ''} />
                    </div>
                    <span>{post.likes || 0}</span>
                </button>

                <button className="action-item">
                    <div className="icon-container">
                        <MessageSquare />
                    </div>
                    <span>{post.comments || 0}</span>
                </button>

                <button className="action-item">
                    <div className="icon-container">
                        <Repeat />
                    </div>
                    <span>{post.reposts || 0}</span>
                </button>

                <button className="action-item">
                    <div className="icon-container">
                        <Share2 />
                    </div>
                </button>
            </div>
        </article>
    );
};

export default PostCard;
