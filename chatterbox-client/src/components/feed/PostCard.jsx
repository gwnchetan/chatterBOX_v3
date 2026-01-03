import React, { useState, useRef, useEffect } from 'react'; // Added useEffect
import Avatar from '../common/Avatar';
import { MoreHorizontal, Heart, MessageSquare, Share2, Repeat, ChevronLeft, ChevronRight, Trash, Bookmark } from '../common/Icons'; // Added Bookmark
import userService from '../../services/user.service'; // Default import (fixed from postsService relative path if needed, but postsService is there too)
import { postsService } from '../../services/posts.service';
import { useToast } from '../Toast';
import ConfirmModal from '../common/ConfirmModal';
import VideoPlayer from './VideoPlayer';



const PostCard = ({ post, onDelete }) => {
    // Repost Logic
    const isRepost = !!(post.repostOf && typeof post.repostOf === 'object');
    const displayPost = isRepost ? post.repostOf : post;

    const [liked, setLiked] = useState(displayPost.isLiked || false);
    const [likeCount, setLikeCount] = useState(displayPost.likeCount || 0);
    const [repostCount, setRepostCount] = useState(displayPost.repostCount || 0);
    const [saved, setSaved] = useState(false);

    // Comments State
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentCount, setCommentCount] = useState(displayPost.commentCount || 0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const user = JSON.parse(localStorage.getItem('user')) || {}; // Safe parse

    // Auth check for wrapper post (deletion)
    const isAuthor = user && (post.author?._id === user._id || post.author?._id === user.id || post.author === user.id);
    const toast = useToast();

    // Check if saved on mount (Check against displayPost)
    useEffect(() => {
        if (user.savedPosts && Array.isArray(user.savedPosts)) {
            const isSaved = user.savedPosts.some(p => (p._id || p) === displayPost._id);
            setSaved(isSaved);
        }
        // Sync props if they change
        if (displayPost.isLiked !== undefined) setLiked(displayPost.isLiked);
        if (displayPost.likeCount !== undefined) setLikeCount(displayPost.likeCount);
        if (displayPost.repostCount !== undefined) setRepostCount(displayPost.repostCount);
        if (displayPost.commentCount !== undefined) setCommentCount(displayPost.commentCount);
    }, [displayPost._id, user.savedPosts, displayPost.isLiked, displayPost.likeCount, displayPost.repostCount, displayPost.commentCount]);

    const handleSave = async (e) => {
        e.stopPropagation();
        const originalSaved = saved;
        setSaved(!saved); // Optimistic

        try {
            if (originalSaved) {
                await userService.unsavePost(displayPost._id);
            } else {
                await userService.savePost(displayPost._id);
            }

            // Update local storage to keep UI consistent across refreshes/pages
            const currentUser = JSON.parse(localStorage.getItem('user')) || {};
            let currentSaved = currentUser.savedPosts || [];

            if (originalSaved) {
                // Removed
                currentSaved = currentSaved.filter(p => (p._id || p) !== displayPost._id);
            } else {
                // Added (just ID is enough for check)
                currentSaved.push(displayPost._id);
            }

            currentUser.savedPosts = currentSaved;
            localStorage.setItem('user', JSON.stringify(currentUser));

        } catch (error) {
            console.error("Save failed", error);
            setSaved(originalSaved); // Revert
            toast.error("Failed to save post");
        }
    };

    const handleLike = async (e) => {
        e.stopPropagation();
        if (!user._id) return toast.error("Please login to like");

        const originalLiked = liked;
        const originalCount = likeCount;

        setLiked(!liked);
        setLikeCount(liked ? likeCount - 1 : likeCount + 1);

        try {
            await postsService.toggleLike(displayPost._id);
        } catch (error) {
            setLiked(originalLiked);
            setLikeCount(originalCount);
            toast.error("Failed to like post");
        }
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
        if (!commentText.trim()) return;

        try {
            const newComment = await postsService.addComment(displayPost._id, commentText);
            setComments(prev => [...prev, newComment]);
            setCommentCount(prev => prev + 1);
            setCommentText('');
        } catch (error) {
            console.error(error);
            toast.error("Failed to post comment");
        }
    };

    const handleRepost = async (e) => {
        e.stopPropagation();
        const originalCount = repostCount;
        setRepostCount(prev => prev + 1); // Optimistic

        try {
            await postsService.repost(displayPost._id);
            toast.success("Reposted!");
        } catch (error) {
            setRepostCount(originalCount);
            toast.error("Failed to repost");
        }
    };

    // Slider-based image logic
    const [currentSlide, setCurrentSlide] = useState(0);
    const sliderRef = useRef(null);

    const handleScroll = (e) => {
        const scrollLeft = e.target.scrollLeft;
        const width = e.target.offsetWidth;
        const index = Math.round(scrollLeft / width);
        setCurrentSlide(index);
    };

    const scrollNext = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: sliderRef.current.offsetWidth, behavior: 'smooth' });
        }
    };

    const scrollPrev = () => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: -sliderRef.current.offsetWidth, behavior: 'smooth' });
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await postsService.deletePost(post._id);
            if (onDelete) onDelete(post._id);
            else window.location.reload();
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert('Failed to delete post.');
        } finally {
            setShowDeleteModal(false);
        }
    };

    const renderMedia = () => {
        // Updated Logic: Check for Video first (Exclusive)
        const video = displayPost.media?.find(m => m.type === 'video');
        if (video) {
            return <VideoPlayer media={video} />;
        }

        const media = displayPost.media?.filter(m => m.type !== 'video') || [];
        if (media.length === 0) return null;

        const firstItem = media[0];
        // Priority: Top-level aspectRatio (New Schema) -> Metadata aspect (Legacy) -> Default 0.8
        const containerAspect = firstItem.aspectRatio || firstItem.metadata?.aspect || 0.8;

        return (
            <div className="post-slider-wrapper" style={{ aspectRatio: `${containerAspect}` }}>
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

    return (
        <article className="post-card">
            {isRepost && (
                <div className="repost-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    <Repeat size={14} />
                    <span>{post.author?.fullname} Reposted</span>
                </div>
            )}
            <div className="post-header">
                <div className="post-meta">
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
                    <div className="icon-container">
                        <Repeat />
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
                <div className="comments-section" style={{ borderTop: '1px solid var(--border)', marginTop: '10px', paddingTop: '10px' }}>
                    {commentsLoading && <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading comments...</div>}

                    {!commentsLoading && comments.length === 0 && (
                        <div style={{ padding: '15px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            No comments yet. Be the first!
                        </div>
                    )}

                    <div className="comments-list" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '10px' }}>
                        {comments.map(comment => (
                            <div key={comment._id} className="comment-item" style={{ display: 'flex', gap: '10px', marginBottom: '12px', padding: '0 4px' }}>
                                <Avatar src={comment.user.avatar} size="sm" />
                                <div className="comment-content">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{comment.user.fullname}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>@{comment.user.username}</span>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>· {new Date(comment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.95rem', lineHeight: '1.4' }}>{comment.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Avatar src={user.avatar} size="sm" />
                        <input
                            type="text"
                            placeholder="Post your reply"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid var(--border)',
                                padding: '8px 0',
                                color: 'var(--text-main)',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!commentText.trim()}
                            style={{
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                padding: '6px 16px',
                                borderRadius: '20px',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                cursor: commentText.trim() ? 'pointer' : 'default',
                                opacity: commentText.trim() ? 1 : 0.5
                            }}
                        >
                            Reply
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

export default PostCard;
