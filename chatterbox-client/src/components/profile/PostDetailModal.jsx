import React from 'react';
import { X } from '../common/Icons';
import PostCard from '../feed/PostCard';
import './PostDetailModal.css';

const PostDetailModal = ({ post, isOpen, onClose }) => {
    if (!isOpen || !post) return null;

    return (
        <div className="post-modal-overlay" onClick={onClose}>
            <button className="post-modal-close" onClick={onClose}>
                <X size={24} />
            </button>
            <div className="post-modal-content" onClick={e => e.stopPropagation()}>
                <div className="post-modal-body">
                    <PostCard post={post} />
                </div>
            </div>
        </div>
    );
};

export default PostDetailModal;
