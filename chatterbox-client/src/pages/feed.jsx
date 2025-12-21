import React, { useState } from 'react';
import './feed.css';
import Navbar from '../components/layout/Navbar';
import RightSidebar from '../components/layout/RightSidebar';
import PostCard from '../components/feed/PostCard';
import Avatar from '../components/common/Avatar';
import { Search, Mic, Plus, MoreHorizontal } from '../components/common/Icons';

const dummyPosts = [
    {
        id: 1,
        author: "Robert Fox",
        handle: "@alessandroveronezi",
        time: "15 min ago",
        text: "While Corfu give us the ability to shoot by the sea with amazing blue background full of light of the sky...",
        image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1000",
        likes: 1600,
        comments: 2300,
        liked: false,
        avatar: ""
    },
    {
        id: 2,
        author: "Dianne Russell",
        handle: "@amandadasilva",
        time: "2 hours ago",
        text: "Nature is amazing!",
        image: "https://images.unsplash.com/photo-1501854140884-074cf2b2c3af?auto=format&fit=crop&q=80&w=1000",
        likes: 120,
        comments: 45,
        liked: true,
        avatar: ""
    }
];

const Feed = () => {
    return (
        <div className="feed-layout">
            <Navbar />

            <main className="feed-center">
                {/* Header: Search & Create */}
                <header className="feed-header">
                    <div className="search-bar">
                        <span className="search-icon-left"><Search /></span>
                        <input type="text" className="search-input" placeholder="Search..." />
                        <span className="search-icon-right"><Mic /></span>
                    </div>
                    <button className="create-post-btn-header">
                        <Plus /> Create new post
                    </button>
                </header>

                {/* Stories */}
                <section className="stories-section">
                    <div className="stories-header">
                        <div className="stories-title">Stories</div>
                        <div className="watch-all">Watch all</div>
                    </div>
                    <div className="stories-scroll">
                        <div className="story-card">
                            <div className="story-avatar-wrapper add-story">
                                <Plus className="add-icon" />
                            </div>
                            <span className="story-name">Add story</span>
                        </div>

                        {['Gladys', 'Kristin', 'Priscilla', 'Connie', 'Brandie', 'Lily', 'Arthur'].map((name, i) => (
                            <div className="story-card" key={i}>
                                <div className={`story-avatar-wrapper ${i < 3 ? 'active-story' : ''}`}>
                                    <Avatar size="lg" alt={name} className="story-avatar-img" />
                                </div>
                                <span className="story-name">{name}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Feeds Header */}
                <div className="feeds-toggle-header">
                    <div className="stories-title">Feeds</div>
                    <div className="feeds-toggle">
                        <button className="toggle-btn active">Popular</button>
                        <button className="toggle-btn">Latest</button>
                    </div>
                </div>

                {/* Posts */}
                <div className="feed-list">
                    {dummyPosts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            </main>

            <RightSidebar />
        </div>
    );
};

export default Feed;
