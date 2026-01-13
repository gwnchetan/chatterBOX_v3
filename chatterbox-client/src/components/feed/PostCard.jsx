import React, { useState, useRef, useEffect } from 'react';
import { useFeed } from '../../context/FeedContext';
import { socketService } from '../../services/socket.service';
import Avatar from '../common/Avatar';
import { MoreHorizontal, Heart, MessageSquare, Share2, Repeat, ChevronLeft, ChevronRight, Trash, Bookmark } from '../common/Icons';
import { postsService } from '../../services/posts.service';
import { useToast } from '../Toast';
import ConfirmModal from '../common/ConfirmModal';
import VideoPlayer from './VideoPlayer';
import './PostCard.css';
import { useNavigate } from 'react-router-dom';

// Helper to format text with mentions
const formatCommentText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
        if (part.match(/^@\w+$/)) {
            return <span key={index} className="comment-mention">{part}</span>;
        }
        return part;
    });
};

const PostCard = ({ post, onDelete }) => {
    const navigate = useNavigate();
    const { toggleLike, toggleRepost, toggleSave, getPost } = useFeed();
    const isRepost = !!(post.repostOf && typeof post.repostOf === 'object');
    // We try to get the realtime state of the display post from the store if it exists (for shared state)
    // If not in store (e.g. nested in repost but not top-level), we fall back to prop but that might be stale/unhydrated if not carefully managed.
    // Ideally, when we load feed, we should merge the *nested* posts into the store too?
    // Yes! `Feed.jsx` should extract nested original posts and merge them into the store.
    // That way `getPost(displayPost._id)` works and returns a hydrated object (if we hydrate it).

    // For now, let's assume displayPost comes from props.
    const displayPost = isRepost ? post.repostOf : post;
    // But we prefer the version from context if available to catch updates
    const storedPost = getPost(displayPost._id);
    const finalPost = storedPost || displayPost;

    const liked = finalPost.liked || false;
    const likeCount = finalPost.likeCount || 0;
    const reposted = finalPost.reposted || false;
    const repostCount = finalPost.repostCount || 0;
    const saved = finalPost.saved || false;
    const commentCount = finalPost.commentCount || 0;

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isAuthor = user && (finalPost.author?._id === user._id || finalPost.author?._id === user.id || finalPost.author === user.id);
    const toast = useToast();

    // Removed local useEffect for sync, moved to Context-driven


    const handleSave = async (e) => {
        e.stopPropagation();
        if (!user._id && !user.id) return toast.error("Please login to save");
        toggleSave(finalPost._id);
    };

    const handleLike = async (e) => {
        e.stopPropagation();
        if (!user._id && !user.id) return toast.error("Please login to like");
        toggleLike(finalPost._id);
    };

    const toggleComments = async (e) => {
        e.stopPropagation();
        if (showComments) {
            setShowComments(false);
            return;
        }

        setShowComments(true);
        if (comments.length === 0) {
            setCommentsLoading(true);
            setCommentsLoading(true);
            try {
                const data = await postsService.getComments(displayPost._id);
                setComments(data);
            } catch (error) {
                toast.error("Failed to load comments");
            } finally {
                setCommentsLoading(false);
            }
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || isPostingComment) return; // Prevent multiple clicks

        setIsPostingComment(true);
        try {
            const newComment = await postsService.addComment(displayPost._id, commentText);
            setComments(prev => [...prev, newComment]);
            setCommentCount(prev => prev + 1);
            setCommentText('');
        } catch (error) {
            console.error(error);
            toast.error("Failed to post comment");
        } finally {
            setIsPostingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await postsService.deleteComment(displayPost._id, commentId);
            setComments(prev => prev.filter(c => c._id !== commentId));
            setCommentCount(prev => prev - 1);
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete comment");
        }
    };

    const handleRepost = async (e) => {
        e.stopPropagation();
        if (!user._id && !user.id) return toast.error("Please login to repost");
        toggleRepost(finalPost._id);
    };

    const [showLikeAnimation, setShowLikeAnimation] = useState(false);

    const cardRef = useRef(null);
    const sliderRef = useRef(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await postsService.deletePost(displayPost._id);
            if (onDelete) onDelete(displayPost._id);
            toast.success("Post deleted");
        } catch (error) {
            toast.error("Failed to delete post");
        } finally {
            setShowDeleteModal(false);
        }
    };

    const handleScroll = () => {
        if (!sliderRef.current) return;
        const scrollLeft = sliderRef.current.scrollLeft;
        const width = sliderRef.current.clientWidth;
        const index = Math.round(scrollLeft / width);
        setCurrentSlide(index);
    };

    const scrollPrev = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: -sliderRef.current.clientWidth, behavior: 'smooth' });
        }
    };

    const scrollNext = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: sliderRef.current.clientWidth, behavior: 'smooth' });
        }
    };

    // Auto-close comments on scroll functionality
    // Room Management & Auto-close
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                const postId = displayPost._id;
                if (entry.isIntersecting) {
                    socketService.joinPost(postId);
                } else {
                    socketService.leavePost(postId);
                    if (showComments) setShowComments(false);
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            if (cardRef.current) {
                observer.unobserve(cardRef.current);
            }
        };
    }, [showComments, displayPost._id]);

    // Real-time Comments Listener
    useEffect(() => {
        if (!showComments) return;

        const handleNewComment = ({ postId, comment }) => {
            if (postId === displayPost._id && comment) {
                setComments(prev => {
                    // Dedup: prevent double insert if socket fires faster than local API update or loopback
                    if (prev.some(c => c._id === comment._id)) return prev;
                    return [...prev, comment];
                });
            }
        };

        socketService.on('post:comment:update', handleNewComment);
        return () => socketService.off('post:comment:update', handleNewComment);
    }, [showComments, displayPost._id]);

    // ... (existing helper functions)

    const handleDoubleLike = async (e) => {
        e.stopPropagation();

        // Mobile/Tablet Check: Only allow on touch devices
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) return;

        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 800);

        // Always "Like" on double tap (never unlike)
        if (!liked) {
            toggleLike(finalPost._id);
        }
    };

    const renderMedia = () => {
        // Updated Logic: Check for Video first (Exclusive)
        const video = displayPost.media?.find(m => m.type === 'video');
        if (video) {
            return (
                <div className="media-wrapper-relative" style={{ position: 'relative' }}>
                    <VideoPlayer media={video} onDoubleClick={handleDoubleLike} />
                    {showLikeAnimation && (
                        <div className="heart-overlay">
                            <Heart />
                        </div>
                    )}
                </div>
            );
        }

        const media = displayPost.media?.filter(m => m.type !== 'video') || [];
        if (media.length === 0) return null;

        const firstItem = media[0];
        // Priority: Top-level aspectRatio (New Schema) -> Metadata aspect (Legacy) -> Default 0.8
        const containerAspect = firstItem.aspectRatio || firstItem.metadata?.aspect || 0.8;

        return (
            <div
                className="post-slider-wrapper"
                style={{ aspectRatio: `${containerAspect}`, cursor: 'pointer' }}
                onDoubleClick={handleDoubleLike}
            >
                <div
                    className="post-slider-track"
                    onScroll={handleScroll}
                    ref={sliderRef}
                >
                    {media.map((item, idx) => {
                        return (
                            <div key={idx} className="slider-item">
                                <img src={item.url} alt="" loading="lazy" />
                            </div>
                        );
                    })}
                </div>

                {showLikeAnimation && (
                    <div className="heart-overlay">
                        <Heart />
                    </div>
                )}

                {media.length > 1 && (
                    <>
                        {currentSlide > 0 && (
                            <button className="slider-arrow slider-arrow-left" onClick={(e) => { e.stopPropagation(); scrollPrev(); }}>
                                <ChevronLeft />
                            </button>
                        )}
                        {currentSlide < media.length - 1 && (
                            <button className="slider-arrow slider-arrow-right" onClick={(e) => { e.stopPropagation(); scrollNext(); }}>
                                <ChevronRight />
                            </button>
                        )}
                    </>
                )}

                {media.length > 1 && (
                    <div className="slider-dots">
                        {media.map((_, idx) => (
                            <span
                                key={idx}
                                className={`slider-dot ${currentSlide === idx ? 'active' : ''}`}
                            ></span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const authorName = displayPost.author?.fullname || 'Unknown';
    const authorHandle = displayPost.author?.username ? `@${displayPost.author.username}` : '';
    const authorAvatar = displayPost.author?.avatar || '';

    const handleProfileClick = (e) => {
        e.stopPropagation();
        const authorId = displayPost.author?._id || displayPost.author;
        if (authorId) {
            navigate(`/profile/${authorId}`);
        }
    };

    const handleRepostProfileClick = (e) => {
        e.stopPropagation();
        const reposterId = post.author?._id || post.author;
        if (reposterId) {
            navigate(`/profile/${reposterId}`);
        }
    };

    return (
        <article className="post-card" ref={cardRef}>
            {isRepost && (
                <div className="repost-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    <Repeat size={14} />
                    <span onClick={handleRepostProfileClick} style={{ cursor: 'pointer' }}>{post.author?.fullname} Reposted</span>
                </div>
            )}
            <div className="post-header">
                <div className="post-meta" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
                    <Avatar src={authorAvatar} alt={authorName} status="online" size="md" />
                    <div className="meta-text">
                        <div className="meta-top">
                            <h4>{authorName}</h4>
                            <span className="meta-dot">·</span>
                            <span className="meta-time">{new Date(displayPost.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="meta-handle">{authorHandle}</span>
                    </div>
                </div>
                {isAuthor && (
                    <button className="post-options" onClick={handleDeleteClick} title="Delete Post">
                        <Trash size={16} color="red" />
                    </button>
                )}
            </div>

            <div className="post-content-text">
                {displayPost.content && displayPost.content.split(/(\s+)/).map((part, index) => {
                    if (part.startsWith('#') && part.length > 1) {
                        return <span key={index} className="hashtag">{part}</span>;
                    }
                    return part;
                })}
            </div>

            {renderMedia()}

            <div className="post-actions-bar">
                <button className="action-item" onClick={handleLike}>
                    <div className={`icon-container ${liked ? 'liked' : ''}`}>
                        <Heart className={liked ? 'heart-filled' : ''} />
                    </div>
                    <span>{likeCount}</span>
                </button>

                <button className="action-item" onClick={toggleComments}>
                    <div className="icon-container">
                        <MessageSquare />
                    </div>
                    <span>{commentCount}</span>
                </button>

                <button className="action-item" onClick={handleRepost}>
                    <div className={`icon-container ${reposted ? 'reposted' : ''}`}>
                        <Repeat stroke={reposted ? "var(--color-success)" : "currentColor"} />
                    </div>
                    <span>{repostCount}</span>
                </button>

                <button className="action-item">
                    <div className="icon-container">
                        <Share2 />
                    </div>
                </button>

                <button className="action-item" onClick={handleSave}>
                    <div className={`icon-container ${saved ? 'saved' : ''}`}>
                        <Bookmark fill={saved ? "var(--color-text-main)" : "none"} />
                    </div>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="comments-section">
                    {commentsLoading && <div className="comments-loading">Loading comments...</div>}

                    {!commentsLoading && comments.length === 0 && (
                        <div className="no-comments">
                            No comments yet. Be the first!
                        </div>
                    )}

                    <div className="comments-list">
                        {comments.map(comment => {
                            const canDelete = user && (user._id === comment.user._id || user.id === comment.user._id || user._id === displayPost.author._id);
                            return (
                                <div key={comment._id} className="comment-item">
                                    <div className="comment-avatar">
                                        <Avatar src={comment.user.avatar} size="sm" />
                                    </div>
                                    <div className="comment-content">
                                        <div className="comment-header">
                                            <div className="comment-info">
                                                <span className="comment-author">{comment.user.fullname}</span>
                                                <span className="comment-username">@{comment.user.username}</span>
                                                <span className="comment-time">· {new Date(comment.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment._id)}
                                                    className="comment-delete-btn"
                                                    title="Delete"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="comment-text">{formatCommentText(comment.content)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <form onSubmit={handlePostComment} className="reply-form">
                        <div className="comment-avatar">
                            <Avatar src={user.avatar} size="sm" />
                        </div>
                        <input
                            type="text"
                            placeholder="Post your reply..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="reply-input"
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim() || isPostingComment}
                            className="reply-btn"
                        >
                            {isPostingComment ? 'Posting...' : 'Reply'}
                        </button>
                    </form>
                </div>
            )}

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Post?"
                message="Are you sure you want to delete this post? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                isDangerous={true}
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />
        </article >
    );
};

PostCard.whyDidYouRender = true;

export default PostCard;
