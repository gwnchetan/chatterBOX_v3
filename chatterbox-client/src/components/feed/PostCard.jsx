import React, { useState } from 'react';
import Avatar from '../common/Avatar';
import { MoreHorizontal, Heart, MessageSquare, Share2, Repeat, Send } from '../common/Icons';

const PostCard = ({ post }) => {
    const [liked, setLiked] = useState(post.liked);
    const [likeCount, setLikeCount] = useState(post.likes);
    const [showComments, setShowComments] = useState(false);
    const [showRepostMenu, setShowRepostMenu] = useState(false);

    const toggleLike = () => {
        if (liked) {
            setLikeCount(prev => prev - 1);
        } else {
            setLikeCount(prev => prev + 1);
        }
        setLiked(!liked);
    };

    return (
        <article className="post-card">
            <div className="post-header">
                <Avatar src={post.avatar} alt={post.author} status="online" size="md" />
                <div className="post-info">
                    <h4>{post.author}</h4>
                    <span>{post.time}</span>
                </div>
                <button className="post-options-btn">
                    <MoreHorizontal />
                </button>
            </div>

            <div className="post-content">
                {post.text}
            </div>

            {post.image && (
                <div className="post-media">
                    <img src={post.image} alt="Post content" loading="lazy" />
                </div>
            )}

            <div className="post-actions">
                <button
                    className={`post-action ${liked ? 'post-action--active' : ''}`}
                    aria-label="Like"
                    onClick={toggleLike}
                >
                    <Heart style={{ fill: liked ? 'currentColor' : 'none' }} />
                    <span>{likeCount > 0 ? likeCount : 'Like'}</span>
                </button>

                <button
                    className={`post-action ${showComments ? 'post-action--active' : ''}`}
                    aria-label="Comment"
                    onClick={() => setShowComments(!showComments)}
                >
                    <MessageSquare />
                    <span>{post.comments && post.comments !== "Comment" ? post.comments : 'Comment'}</span>
                </button>

                <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
                    <button
                        className="post-action"
                        aria-label="Repost"
                        onClick={() => setShowRepostMenu(!showRepostMenu)}
                        style={{ width: '100%' }}
                    >
                        <Repeat /> <span>Repost</span>
                    </button>

                    {showRepostMenu && (
                        <div className="repost-dropdown" onMouseLeave={() => setShowRepostMenu(false)}>
                            <div className="repost-option" onClick={() => setShowRepostMenu(false)}>
                                <Repeat width="16" /> Instant Repost
                            </div>
                            <div className="repost-option" onClick={() => setShowRepostMenu(false)}>
                                <MessageSquare width="16" /> Quote Post
                            </div>
                        </div>
                    )}
                </div>

                <button className="post-action post-action--share" aria-label="Share">
                    <Share2 />
                </button>
            </div>

            {showComments && (
                <div className="comments-section">
                    <div className="comment-list">
                        {/* Dummy Comments */}
                        <div className="comment-item">
                            <Avatar size="sm" alt="Sarah" />
                            <div className="comment-bubble">
                                <span className="comment-author">Sarah Jenkins</span>
                                This looks absolutely amazing! 📸
                            </div>
                        </div>
                        <div className="comment-item">
                            <Avatar size="sm" alt="Mike" />
                            <div className="comment-bubble">
                                <span className="comment-author">Mike Ross</span>
                                Where exactly is this location?
                            </div>
                        </div>
                    </div>

                    <div className="comment-input-area">
                        <Avatar size="sm" />
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                type="text"
                                className="comment-input"
                                placeholder="Write a comment..."
                            />
                            <button
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                <Send width="16" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
};

export default PostCard;
