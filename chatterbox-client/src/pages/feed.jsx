import React, { useState } from 'react';
import './feed.css';
import Navbar from '../components/layout/Navbar';
import RightSidebar from '../components/layout/RightSidebar';
import PostCard from '../components/feed/PostCard';
import Avatar from '../components/common/Avatar';
import ImageModal from '../components/common/ImageModal';
import { Search, Mic, Plus, MoreHorizontal, Image, MapPin, Smile, Folder, Globe } from '../components/common/Icons';

const dummyPosts = [
    {
        id: 1,
        author: "George Lobko",
        handle: "@george_l",
        time: "2h ago",
        text: "Hi everyone, today I was on the most beautiful mountain in the world 😍. I also want to say hi to everyone!",
        images: [
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000",
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1486870591958-9b9d0ae1f703?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1501854140884-074cf2b2c3af?auto=format&fit=crop&q=80&w=600"
        ],
        likes: 1200,
        comments: 45,
        reposts: 12,
        liked: true,
        avatar: ""
    },
    {
        id: 2,
        author: "Vitaliy Boyko",
        handle: "@boyko_v",
        time: "4h ago",
        text: "I chose a wonderful coffee today. It's really incredibly tasty!!! 😋",
        images: [],
        likes: 340,
        comments: 12,
        reposts: 2,
        liked: false,
        avatar: ""
    },
    {
        id: 3,
        author: "Dianne Russell",
        handle: "@dianne_r",
        time: "6h ago",
        text: "Just look at this view! 🏔️",
        images: [
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1200"
        ],
        likes: 890,
        comments: 56,
        reposts: 8,
        liked: true,
        avatar: ""
    }
];

const Feed = () => {
    // Get user from local storage for avatar
    const user = JSON.parse(localStorage.getItem('user')) || { fullname: 'User', username: 'user' };

    return (
        <div className="feed-layout">
            <Navbar />

            <main className="feed-center">
                <div className="feed-center-content">
                    {/* 1. Feed Header Unified */}
                    <div className="feed-header-unified">
                        <h1>Feeds</h1>
                        <div className="header-filters">
                            <button className="text-filter">Recents</button>
                            <button className="text-filter active">Friends</button>
                            <button className="text-filter">Popular</button>
                        </div>
                    </div>

                    {/* 3. Post List */}
                    <div className="feed-list">
                        {dummyPosts.map(post => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>

                    {/* 4. Create Post Section (Bottom) */}
                    <div className="create-post-dock">
                        <div className="dock-top">
                            <Avatar size="sm" alt={user.fullname} />
                            <input type="text" className="dock-input" placeholder="Share something..." />
                        </div>
                        <div className="dock-bottom">
                            <div className="dock-actions">
                                <button className="dock-action-item"><Folder size={18} /> File</button>
                                <button className="dock-action-item"><Image size={18} /> Image</button>
                                <button className="dock-action-item"><Smile size={18} /> Emoji</button>
                            </div>
                            <button className="dock-send-btn">Send</button>
                        </div>
                    </div>
                </div>
            </main>

            <RightSidebar />
        </div>
    );
};

export default Feed;
