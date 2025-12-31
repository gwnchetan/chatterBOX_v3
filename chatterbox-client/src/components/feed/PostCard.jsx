import React, { useState, useRef } from 'react';
import Avatar from '../common/Avatar';
import { MoreHorizontal, Heart, MessageSquare, Share2, Repeat, ChevronLeft, ChevronRight, Trash } from '../common/Icons';
import { postsService } from '../../services/posts.service';
import { useToast } from '../Toast';
import ConfirmModal from '../common/ConfirmModal';
import VideoPlayer from './VideoPlayer';



const PostCard = ({ post, onDelete }) => {
    const [liked, setLiked] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const user = JSON.parse(localStorage.getItem('user'));
    const isAuthor = user && (post.author?._id === user._id || post.author?._id === user.id || post.author === user.id);

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
        const video = post.media?.find(m => m.type === 'video');
        if (video) {
            return <VideoPlayer media={video} />;
        }

        const media = post.media?.filter(m => m.type !== 'video') || [];
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

    const authorName = post.author?.fullname || 'Unknown';
    const authorHandle = post.author?.username ? `@${post.author.username}` : '';
    const authorAvatar = post.author?.avatar || '';

    return (
        <article className="post-card">
            <div className="post-header">
                <div className="post-meta">
                    <Avatar src={authorAvatar} alt={authorName} status="online" size="md" />
                    <div className="meta-text">
                        <div className="meta-top">
                            <h4>{authorName}</h4>
                            <span className="meta-dot">·</span>
                            <span className="meta-time">{new Date(post.createdAt).toLocaleDateString()}</span>
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
                {post.content && post.content.split(/(\s+)/).map((part, index) => {
                    if (part.startsWith('#') && part.length > 1) {
                        return <span key={index} className="hashtag">{part}</span>;
                    }
                    return part;
                })}
            </div>

            {renderMedia()}

            <div className="post-actions-bar">
                <button className="action-item" onClick={() => setLiked(!liked)}>
                    <div className={`icon-container ${liked ? 'liked' : ''}`}>
                        <Heart className={liked ? 'heart-filled' : ''} />
                    </div>
                    <span>{post.likeCount || 0}</span>
                </button>

                <button className="action-item">
                    <div className="icon-container">
                        <MessageSquare />
                    </div>
                    <span>{post.commentCount || 0}</span>
                </button>

                <button className="action-item">
                    <div className="icon-container">
                        <Repeat />
                    </div>
                    <span>0</span>
                </button>

                <button className="action-item">
                    <div className="icon-container">
                        <Share2 />
                    </div>
                </button>
            </div>

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
