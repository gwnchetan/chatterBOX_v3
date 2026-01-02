import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import PostCard from '../components/feed/PostCard';
import { Bookmark } from '../components/common/Icons';
import userService from '../services/user.service';
import { useToast } from '../components/Toast';
import './explore.css'; // Reusing masonry grid styles from explore

const Favorites = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        loadSavedPosts();
    }, []);

    const loadSavedPosts = async () => {
        try {
            setLoading(true);
            const data = await userService.getSavedPosts();
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Error loading saved posts:', error);
            toast.error("Failed to load favorites");
        } finally {
            setLoading(false);
        }
    };

    // If a post is unsaved from here, remove it from the list
    const handlePostDeleteOrUnsave = (postId) => {
        setPosts(prev => prev.filter(p => p._id !== postId));
    };

    return (
        <div className="explore-layout"> {/* Reusing explore layout for consistency */}
            <Navbar />
            <div className="explore-page">
                <div className="explore-header" style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            padding: '10px',
                            background: 'var(--color-primary)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Bookmark fill="white" color="white" size={24} />
                        </div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>My Favorites</h1>
                    </div>
                </div>

                <div className="explore-grid">
                    {loading ? (
                        <div className="explore-loading">Loading favorites...</div>
                    ) : posts.length > 0 ? (
                        <div className="masonry-grid">
                            {posts.map(post => (
                                <div key={post._id} className="masonry-item">
                                    {/* Pass key to force re-render if needed, but ID is stable */}
                                    <PostCard post={post} onDelete={handlePostDeleteOrUnsave} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-results">
                            <h3 style={{ marginBottom: '10px' }}>No favorites yet</h3>
                            <p style={{ maxWidth: '400px', margin: '0 auto' }}>Save posts you love to see them here.</p>
                        </div>
                    )}
                </div>
            </div>
            <MobileNavbar />
        </div>
    );
};

export default Favorites;
