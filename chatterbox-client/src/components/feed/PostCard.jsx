import React, { useState } from 'react';
import Avatar from '../common/Avatar';
import { MoreHorizontal, Heart, MessageSquare, Bookmark } from '../common/Icons';

const PostCard = ({ post }) => {
    const [liked, setLiked] = useState(post.liked);

    return (
        <article className="post-card-new">
            <div className="post-header-new">
                <div className="post-author-info">
                    <Avatar src={post.avatar} alt={post.author} status="online" size="md" />
                    <div className="author-text">
                        <h4>{post.author}</h4>
                        <span>{post.handle || '@alessandroveronezi'}</span>
                    </div>
                </div>
                <MoreHorizontal style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }} />
            </div>

            <div className="post-images-grid">
                <div className="grid-item-main">
                    <img src={post.image} alt="" className="grid-item-img" />
                </div>
                <div className="grid-item-sub">
                    <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=300" alt="" className="grid-item-img" style={{ borderBottomRightRadius: 0, borderBottomLeftRadius: 0 }} />
                </div>
                <div className="grid-item-sub" style={{ position: 'relative' }}>
                    <img src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=300" alt="" className="grid-item-img" />
                    <div style={{
                        position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1.2rem'
                    }}>
                        +45
                    </div>
                </div>
            </div>

            <div className="post-desc">
                While Corfu give us the ability to shoot by the sea with amazing blue background full of light of the sky, Florina give us its gentle side. The humble atmosphere and Light of Florina which comes... <span className="read-more">read more</span>
            </div>

            <div className="post-tags">
                #landscape #flora #nature
            </div>

            <div className="post-footer-new">
                <div className="footer-left">
                    <div className="footer-stat" style={{ cursor: 'pointer' }} onClick={() => setLiked(!liked)}>
                        <Heart style={{ fill: liked ? 'var(--color-error)' : 'none', color: liked ? 'var(--color-error)' : 'currentColor' }} /> 1.6k
                    </div>
                    <div className="footer-stat">
                        <MessageSquare /> 2.3k
                    </div>
                </div>
                <div className="footer-stat">
                    <Bookmark style={{ color: 'var(--color-primary)' }} />
                </div>
            </div>
        </article>
    );
};

export default PostCard;
