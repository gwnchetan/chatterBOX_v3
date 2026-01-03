import React from 'react';
import './PostSkeleton.css';

const PostSkeleton = () => {
    return (
        <div className="post-card skeleton-card">
            <div className="skeleton-header">
                <div className="skeleton-avatar"></div>
                <div className="skeleton-meta">
                    <div className="skeleton-line short"></div>
                    <div className="skeleton-line medium"></div>
                </div>
            </div>
            <div className="skeleton-content">
                <div className="skeleton-line long"></div>
                <div className="skeleton-line long"></div>
                <div className="skeleton-line medium"></div>
            </div>
            <div className="skeleton-media"></div>
            <div className="skeleton-actions">
                <div className="skeleton-circle"></div>
                <div className="skeleton-circle"></div>
                <div className="skeleton-circle"></div>
                <div className="skeleton-circle"></div>
            </div>
        </div>
    );
};

export default PostSkeleton;
