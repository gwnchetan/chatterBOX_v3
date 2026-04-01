import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeed } from '../../context/FeedContext';
import { socketService } from '../../services/socket.service';
import { postsService } from '../../services/posts.service';
import Avatar from '../common/Avatar';
import ConfirmModal from '../common/ConfirmModal';
import VideoPlayer from './VideoPlayer';
import { Heart, MessageSquare, Share2, Repeat, ChevronLeft, ChevronRight, Trash, Bookmark } from '../common/Icons';
import { useToast } from '../Toast';
import './PostCard.css';

const formatCommentText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => (
        part.match(/^@\w+$/)
            ? <span key={index} className="comment-mention">{part}</span>
            : part
    ));
};

const updateCommentTree = (comments, commentId, updater) => comments.map((comment) => {
    if (comment._id === commentId) {
        return updater(comment);
    }

    return {
        ...comment,
        replies: (comment.replies || []).map((reply) => (
            reply._id === commentId ? updater(reply) : reply
        ))
    };
});

const removeCommentFromTree = (comments, commentId) => comments
    .filter((comment) => comment._id !== commentId)
    .map((comment) => ({
        ...comment,
        replies: (comment.replies || []).filter((reply) => reply._id !== commentId)
    }));

const getDeletedCommentCount = (comments, commentId) => {
    const topLevel = comments.find((comment) => comment._id === commentId);
    if (topLevel) {
        return 1 + (topLevel.replies?.length || 0);
    }

    return 1;
};

const CommentItem = ({
    comment,
    isReply = false,
    currentUser,
    postAuthorId,
    onDelete,
    onReply,
    onToggleLike,
    replyingTo,
    replyText,
    setReplyText,
    submitReply
}) => {
    const currentUserId = currentUser?._id || currentUser?.id;
    const canDelete = currentUserId === comment.user?._id || currentUserId === postAuthorId;

    return (
        <div className={`comment-item ${isReply ? 'comment-item--reply' : ''}`}>
            <div className="comment-avatar">
                <Avatar src={comment.user?.avatar} size="sm" />
            </div>
            <div className="comment-content">
                <div className="comment-header">
                    <div className="comment-info">
                        <span className="comment-author">{comment.user?.fullname}</span>
                        <span className="comment-username">@{comment.user?.username}</span>
                        <span className="comment-time">· {new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    {canDelete && (
                        <button onClick={() => onDelete(comment._id)} className="comment-delete-btn" title="Delete">
                            <Trash size={14} />
                        </button>
                    )}
                </div>
                <p className="comment-text">{formatCommentText(comment.content)}</p>
                <div className="comment-inline-actions">
                    {!isReply && (
                        <button className="comment-inline-btn" onClick={() => onReply(comment._id)}>
                            Reply
                        </button>
                    )}
                    <button className="comment-inline-btn" onClick={() => onToggleLike(comment._id)}>
                        {comment.liked ? 'Unlike' : 'Like'}{comment.likeCount ? ` (${comment.likeCount})` : ''}
                    </button>
                </div>

                {!isReply && replyingTo === comment._id && (
                    <form className="reply-form-inline" onSubmit={(event) => submitReply(event, comment._id)}>
                        <input
                            type="text"
                            value={replyText}
                            onChange={(event) => setReplyText(event.target.value)}
                            placeholder="Write a reply..."
                            className="reply-input"
                        />
                        <button type="submit" disabled={!replyText.trim()} className="reply-btn">
                            Reply
                        </button>
                    </form>
                )}

                {(comment.replies || []).length > 0 && (
                    <div className="comment-replies">
                        {comment.replies.map((reply) => (
                            <CommentItem
                                key={reply._id}
                                comment={reply}
                                isReply={true}
                                currentUser={currentUser}
                                postAuthorId={postAuthorId}
                                onDelete={onDelete}
                                onReply={onReply}
                                onToggleLike={onToggleLike}
                                replyingTo={replyingTo}
                                replyText={replyText}
                                setReplyText={setReplyText}
                                submitReply={submitReply}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const PostCard = ({ post, onDelete }) => {
    const navigate = useNavigate();
    const toast = useToast();
    const { toggleLike, toggleRepost, toggleSave, getPost } = useFeed();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const cardRef = useRef(null);
    const sliderRef = useRef(null);

    const isRepost = !!(post.repostOf && typeof post.repostOf === 'object');
    const displayPost = isRepost ? post.repostOf : post;
    const storedPost = getPost(displayPost._id);
    const finalPost = storedPost || displayPost;

    const liked = finalPost.liked || false;
    const likeCount = finalPost.likeCount || 0;
    const reposted = finalPost.reposted || false;
    const repostCount = finalPost.repostCount || 0;
    const saved = finalPost.saved || false;

    const [postCommentCount, setPostCommentCount] = useState(finalPost.commentCount || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const isAuthor = user && (
        finalPost.author?._id === user._id
        || finalPost.author?._id === user.id
        || finalPost.author === user.id
    );

    useEffect(() => {
        setPostCommentCount(finalPost.commentCount || 0);
    }, [finalPost.commentCount]);

    const loadComments = useCallback(async () => {
        setCommentsLoading(true);
        try {
            const data = await postsService.getComments(displayPost._id);
            setComments(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load comments');
        } finally {
            setCommentsLoading(false);
        }
    }, [displayPost._id, toast]);

    const handleSave = (event) => {
        event.stopPropagation();
        if (!user._id && !user.id) return toast.error('Please login to save');
        toggleSave(finalPost._id);
    };

    const handleLike = (event) => {
        event.stopPropagation();
        if (!user._id && !user.id) return toast.error('Please login to like');
        toggleLike(finalPost._id);
    };

    const toggleComments = async (event) => {
        event.stopPropagation();
        if (showComments) {
            setShowComments(false);
            setReplyingTo(null);
            return;
        }

        setShowComments(true);
        await loadComments();
    };

    const handlePostComment = async (event) => {
        event.preventDefault();
        if (!commentText.trim() || isPostingComment) return;

        setIsPostingComment(true);
        try {
            const newComment = await postsService.addComment(displayPost._id, commentText.trim());
            setComments((currentComments) => [...currentComments, newComment]);
            setPostCommentCount((currentCount) => currentCount + 1);
            setCommentText('');
        } catch (error) {
            console.error(error);
            toast.error('Failed to post comment');
        } finally {
            setIsPostingComment(false);
        }
    };

    const handleReplySubmit = async (event, commentId) => {
        event.preventDefault();
        if (!replyText.trim()) return;

        try {
            const newReply = await postsService.addReply(displayPost._id, commentId, replyText.trim());
            setComments((currentComments) => currentComments.map((comment) => (
                comment._id === commentId
                    ? { ...comment, replies: [...(comment.replies || []), newReply] }
                    : comment
            )));
            setReplyText('');
            setReplyingTo(null);
            setPostCommentCount((currentCount) => currentCount + 1);
        } catch (error) {
            console.error(error);
            toast.error('Failed to post reply');
        }
    };

    const handleDeleteComment = async (commentId) => {
        const deletedCount = getDeletedCommentCount(comments, commentId);

        try {
            await postsService.deleteComment(displayPost._id, commentId);
            setComments((currentComments) => removeCommentFromTree(currentComments, commentId));
            setPostCommentCount((currentCount) => Math.max(0, currentCount - deletedCount));
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete comment');
        }
    };

    const handleToggleCommentLike = async (commentId) => {
        let previousComments = comments;
        setComments((currentComments) => {
            previousComments = currentComments;
            return updateCommentTree(currentComments, commentId, (comment) => ({
                ...comment,
                liked: !comment.liked,
                likeCount: (comment.likeCount || 0) + (comment.liked ? -1 : 1)
            }));
        });

        try {
            await postsService.toggleCommentLike(displayPost._id, commentId);
        } catch (error) {
            console.error(error);
            setComments(previousComments);
            toast.error('Failed to update comment like');
        }
    };

    const handleRepost = (event) => {
        event.stopPropagation();
        if (!user._id && !user.id) return toast.error('Please login to repost');
        toggleRepost(finalPost._id);
    };

    const handleDeleteClick = (event) => {
        event.stopPropagation();
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await postsService.deletePost(displayPost._id);
            if (onDelete) onDelete(displayPost._id);
            toast.success('Post deleted');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete post');
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

    useEffect(() => {
        const node = cardRef.current;
        if (!node) return undefined;

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

        observer.observe(node);

        return () => {
            observer.unobserve(node);
        };
    }, [displayPost._id, showComments]);

    useEffect(() => {
        if (!showComments) return undefined;

        const handleCommentUpdate = async ({ postId, commentCount }) => {
            if (postId !== displayPost._id) return;
            setPostCommentCount(commentCount);
            await loadComments();
        };

        socketService.on('post:comment:update', handleCommentUpdate);
        return () => socketService.off('post:comment:update', handleCommentUpdate);
    }, [displayPost._id, loadComments, showComments]);

    const handleDoubleLike = (event) => {
        event.stopPropagation();

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) return;

        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 800);

        if (!liked) {
            toggleLike(finalPost._id);
        }
    };

    const renderMedia = () => {
        const video = displayPost.media?.find((item) => item.type === 'video');
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

        const media = displayPost.media?.filter((item) => item.type !== 'video') || [];
        if (media.length === 0) return null;

        const firstItem = media[0];
        const containerAspect = firstItem.aspectRatio || firstItem.metadata?.aspect || 0.8;

        return (
            <div
                className="post-slider-wrapper"
                style={{ aspectRatio: `${containerAspect}`, cursor: 'pointer' }}
                onDoubleClick={handleDoubleLike}
            >
                <div className="post-slider-track" onScroll={handleScroll} ref={sliderRef}>
                    {media.map((item, index) => (
                        <div key={index} className="slider-item">
                            <img src={item.url} alt="" loading="lazy" />
                        </div>
                    ))}
                </div>

                {showLikeAnimation && (
                    <div className="heart-overlay">
                        <Heart />
                    </div>
                )}

                {media.length > 1 && (
                    <>
                        {currentSlide > 0 && (
                            <button className="slider-arrow slider-arrow-left" onClick={(event) => { event.stopPropagation(); scrollPrev(); }}>
                                <ChevronLeft />
                            </button>
                        )}
                        {currentSlide < media.length - 1 && (
                            <button className="slider-arrow slider-arrow-right" onClick={(event) => { event.stopPropagation(); scrollNext(); }}>
                                <ChevronRight />
                            </button>
                        )}
                    </>
                )}

                {media.length > 1 && (
                    <div className="slider-dots">
                        {media.map((_, index) => (
                            <span key={index} className={`slider-dot ${currentSlide === index ? 'active' : ''}`}></span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const authorName = displayPost.author?.fullname || 'Unknown';
    const authorHandle = displayPost.author?.username ? `@${displayPost.author.username}` : '';
    const authorAvatar = displayPost.author?.avatar || '';
    const postAuthorId = displayPost.author?._id || displayPost.author;

    const handleProfileClick = (event) => {
        event.stopPropagation();
        const authorId = displayPost.author?._id || displayPost.author;
        if (authorId) {
            navigate(`/profile/${authorId}`);
        }
    };

    const handleRepostProfileClick = (event) => {
        event.stopPropagation();
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
                {displayPost.content && displayPost.content.split(/(\s+)/).map((part, index) => (
                    part.startsWith('#') && part.length > 1
                        ? <span key={index} className="hashtag">{part}</span>
                        : part
                ))}
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
                    <span>{postCommentCount}</span>
                </button>

                <button className="action-item" onClick={handleRepost}>
                    <div className={`icon-container ${reposted ? 'reposted' : ''}`}>
                        <Repeat stroke={reposted ? 'var(--color-success)' : 'currentColor'} />
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
                        <Bookmark fill={saved ? 'var(--color-text-main)' : 'none'} />
                    </div>
                </button>
            </div>

            {showComments && (
                <div className="comments-section">
                    {commentsLoading && <div className="comments-loading">Loading comments...</div>}

                    {!commentsLoading && comments.length === 0 && (
                        <div className="no-comments">
                            No comments yet. Be the first!
                        </div>
                    )}

                    <div className="comments-list">
                        {comments.map((comment) => (
                            <CommentItem
                                key={comment._id}
                                comment={comment}
                                currentUser={user}
                                postAuthorId={postAuthorId}
                                onDelete={handleDeleteComment}
                                onReply={setReplyingTo}
                                onToggleLike={handleToggleCommentLike}
                                replyingTo={replyingTo}
                                replyText={replyText}
                                setReplyText={setReplyText}
                                submitReply={handleReplySubmit}
                            />
                        ))}
                    </div>

                    <form onSubmit={handlePostComment} className="reply-form">
                        <div className="comment-avatar">
                            <Avatar src={user.avatar} size="sm" />
                        </div>
                        <input
                            type="text"
                            placeholder="Post your reply..."
                            value={commentText}
                            onChange={(event) => setCommentText(event.target.value)}
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
        </article>
    );
};

export default PostCard;
