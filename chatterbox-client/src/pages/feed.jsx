import React, { useState, useEffect } from 'react';
import './feed.css';
import Sidebar from '../components/layout/Sidebar';
import RightSidebar from '../components/layout/RightSidebar';
import CreatePostBox from '../components/feed/CreatePostBox';
import PostCard from '../components/feed/PostCard';

const dummyPosts = [
    {
        id: 1,
        author: "George Lobko",
        time: "2 hours ago",
        text: "Hi everyone, today I was on the most beautiful mountain in the world 😍, I also want to say hi to @Silena, @Olya and @Davis!",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000",
        likes: 6355,
        comments: "Comment",
        liked: true,
        avatar: ""
    },
    {
        id: 2,
        author: "Vitaliy Boyko",
        time: "3 hours ago",
        text: "I chose a wonderful coffee today, I wanted to tell you what product they have in stock - it's a latte with coconut 🥥 milk... delicious... it's really incredibly tasty!!! 😋",
        likes: 120,
        comments: "Comment",
        liked: false,
        avatar: ""
    }
];

const Feed = () => {
    // Theme logic if needed, but handled globally via CSS
    return (
        <div className="feed-layout">
            <Sidebar />

            <main className="feed-center">
                <CreatePostBox />

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
