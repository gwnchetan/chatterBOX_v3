import React, { useState, useEffect, useRef, useCallback } from 'react';
import './feed.css';
import Navbar from '../components/layout/Navbar';
import RightSidebar from '../components/layout/RightSidebar';
import PostCard from '../components/feed/PostCard';
import MobileNavbar from '../components/layout/MobileNavbar';
import { postsService } from '../services/posts.service';
import { useToast } from '../components/Toast';

const Feed = () => {
    const [posts, setPosts] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef();
    const toast = useToast();

    const fetchFeed = useCallback(async (currentCursor = null, isRefresh = false) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const data = await postsService.getFeed(currentCursor);

            if (isRefresh) {
                setPosts(data.posts);
            } else {
                setPosts(prev => [...prev, ...data.posts]);
            }

            setCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);

        } catch (error) {
            console.error('Failed to fetch feed:', error);
            if (isRefresh) toast.error('Failed to load feed.');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    // Initial Load
    useEffect(() => {
        fetchFeed(null, true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Infinite Scroll Logic
    const lastPostElementRef = useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                if (cursor) {
                    fetchFeed(cursor);
                }
            }
        });

        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, cursor, fetchFeed]);

    const handlePostCreated = (newPost) => {
        const user = JSON.parse(localStorage.getItem('user'));
        const postWithAuthor = {
            ...newPost,
            author: {
                _id: user._id || user.id,
                fullname: user.fullname,
                username: user.username,
                avatar: user.avatar
            }
        };
        setPosts(prev => [postWithAuthor, ...prev]);
    };

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
                        {posts.map((post, index) => {
                            if (posts.length === index + 1) {
                                return (
                                    <div ref={lastPostElementRef} key={post._id || post.id}>
                                        <PostCard post={post} />
                                    </div>
                                );
                            } else {
                                return <PostCard key={post._id || post.id} post={post} />;
                            }
                        })}

                        {isLoading && posts.length > 0 && (
                            <div className="feed-loader">Loading more...</div>
                        )}
                    </div>
                </div>
            </main >

            <RightSidebar />
            <MobileNavbar />
        </div >
    );
};

export default Feed;
