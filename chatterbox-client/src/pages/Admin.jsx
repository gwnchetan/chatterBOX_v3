import React, { useState, useEffect } from 'react';
import { postsService } from '../services/posts.service';
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import { Trash } from '../components/common/Icons';
import { useToast } from '../components/Toast';

const Admin = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    // Re-use Explore/Search architecture to get "All" posts essentially
    // For admin, we ideally want *everything*, but getExploreFeed is a good proxy for "public mess"
    // If you need truly EVERYTHING, we'd need a new backend endpoint. 
    // For now, let's use Explore + heavy limit.
    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await postsService.getExplorePosts(100);
            setPosts(data.posts || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load posts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, []);

    const handleDelete = async (postId) => {
        if (!window.confirm("Admin Delete: Are you sure?")) return;

        try {
            await postsService.deletePost(postId);
            setPosts(prev => prev.filter(p => p._id !== postId));
            toast.success("Post deleted by Admin");
        } catch (error) {
            console.error(error);
            toast.error("Delete failed. Are you sure you are 'csakare726@rku.ac.in'?");
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <Navbar />
            <main style={{ padding: '20px', marginLeft: '0px' }}>
                <h1 style={{ color: 'white', marginBottom: '20px' }}>Admin Cleanup Panel</h1>
                <p style={{ color: '#aaa', marginBottom: '20px' }}>Logged in as: {JSON.parse(localStorage.getItem('user'))?.email}</p>

                {loading ? <div style={{ color: 'white' }}>Loading...</div> : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {posts.map(post => (
                            <div key={post._id} style={{
                                display: 'flex',
                                gap: '15px',
                                padding: '15px',
                                background: 'var(--color-surface)',
                                borderRadius: '12px',
                                border: '1px solid var(--color-border)',
                                alignItems: 'center'
                            }}>
                                <img
                                    src={post.media?.[0]?.url || 'https://via.placeholder.com/100'}
                                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ color: 'white', margin: 0 }}>{post.author?.fullname} <span style={{ color: '#666', fontSize: '0.8em' }}>@{post.author?.username}</span></h4>
                                    <p style={{ color: '#ccc', fontSize: '0.9em', margin: '5px 0' }}>
                                        {post.content ? post.content.substring(0, 100) : "No text content"}
                                    </p>
                                    <div style={{ fontSize: '0.75em', color: '#666', fontFamily: 'monospace' }}>
                                        ID: {post._id} | Media: {post.media?.length || 0}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(post._id)}
                                    style={{
                                        background: 'rgba(255, 0, 0, 0.2)',
                                        color: 'red',
                                        border: '1px solid red',
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash size={20} /> DELETE
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <MobileNavbar />
        </div>
    );
};

export default Admin;
