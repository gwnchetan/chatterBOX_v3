import React, { useState } from 'react';
import './ProfilePostCard.css';
import { Heart, MessageSquare, Trash, Share2, Repeat, Bookmark } from '../../components/common/Icons';
import { postsService } from '../../services/posts.service';
import ConfirmModal from '../common/ConfirmModal';
import Avatar from '../common/Avatar';

const ProfilePostCard = ({ post, isOwner, onDelete }) => {
    const [liked, setLiked] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await postsService.deletePost(post._id);
            if (onDelete) onDelete(post._id);
        } catch (error) {
            console.error('Failed to delete post:', error);
        } finally {
            setShowDeleteModal(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="profile-card">
            <div className="profile-card-body">
                {/* Header: User Info */}
                <div className="profile-card-header-row">
                    <div className="card-user-info">
                        <Avatar src={post.author?.avatar} size="sm" alt={post.author?.fullname} />
                        <div className="card-user-text">
                            <span className="card-fullname">{post.author?.fullname}</span>
                            <span className="card-username">@{post.author?.username}</span>
                        </div>
                    </div>
                    {isOwner && (
                        <button onClick={handleDeleteClick} className="btn-icon-danger" title="Delete Post">
                            <Trash size={14} />
                        </button>
                    )}
                </div>

                {/* Body: Text Content */}
                <div className="profile-card-content">
                    {post.content}
                </div>

                {/* Footer: Date & Actions */}
                <div className="profile-card-footer-row">
                    <span className="card-date-min">{formatDate(post.createdAt)}</span>

                    <div className="card-actions">
                        <button className="card-action-btn" title="Comment">
                            <MessageSquare size={16} />
                            {post.commentCount > 0 && <span>{post.commentCount}</span>}
                        </button>
                        <button className="card-action-btn" title="Repost">
                            <Repeat size={16} />
                        </button>
                        <button
                            className={`card-action-btn ${liked ? 'liked' : ''}`}
                            onClick={() => setLiked(!liked)}
                            title="Like"
                        >
                            <Heart size={16} fill={liked ? "currentColor" : "none"} />
                            {post.likeCount > 0 && <span>{post.likeCount}</span>}
                        </button>
                        <button className="card-action-btn" title="Share">
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Post?"
                message="Are you sure you want to delete this post?"
                confirmText="Delete"
                cancelText="Cancel"
                isDangerous={true}
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
};

export default ProfilePostCard;
