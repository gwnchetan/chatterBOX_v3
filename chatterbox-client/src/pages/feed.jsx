import React, { useState, useEffect, useRef, useCallback } from 'react';
import './feed.css';
import Navbar from '../components/layout/Navbar';
import RightSidebar from '../components/layout/RightSidebar';
import PostCard from '../components/feed/PostCard';
import MobileNavbar from '../components/layout/MobileNavbar';
import { postsService } from '../services/posts.service';
import { useToast } from '../components/Toast';
import LogoLoader from '../components/common/LogoLoader';
import PostSkeleton from '../components/feed/PostSkeleton';
import { Virtuoso } from 'react-virtuoso';
import { useFeed } from '../context/FeedContext';

const Feed = () => {
    const [postIds, setPostIds] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const observer = useRef();
    const toast = useToast();
    const { posts: allPosts, mergePosts } = useFeed();

    const fetchFeed = useCallback(async (currentCursor = null, isRefresh = false) => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await postsService.getFeed(currentCursor);

            // Merge full objects into global store
            mergePosts(data.posts);

            // Keep track of order locally with IDs
            if (isRefresh) {
                setPostIds(data.posts.map(p => p._id));
            } else {
                setPostIds(prev => [...prev, ...data.posts.map(p => p._id)]);
            }

            setCursor(data.nextCursor);
            setHasMore(!!data.nextCursor);

        } catch (error) {
            console.error('Failed to fetch feed:', error);
            setError(error.response?.data?.message || 'Failed to load feed.');
            if (isRefresh) toast.error('Failed to load feed.');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, toast, mergePosts]);

    // Initial Load
    useEffect(() => {
        fetchFeed(null, true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps



    // Listener for Background Uploads
    useEffect(() => {
        const handleNewPost = (event) => {
            const newPost = event.detail;
            handlePostCreated(newPost);

            // Scroll to top smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        window.addEventListener('post-created', handleNewPost);
        return () => window.removeEventListener('post-created', handleNewPost);
    }, [mergePosts]); // Added mergePosts dep

    const handlePostCreated = (newPost) => {
        const user = JSON.parse(localStorage.getItem('user'));
        const postWithAuthor = {
            ...newPost,
            author: {
                _id: user._id || user.id,
                fullname: user.fullname,
                username: user.username,
                avatar: user.avatar
            },
            // Default interactive state
            likeCount: 0,
            commentCount: 0,
            repostCount: 0,
            liked: false,
            reposted: false,
            saved: false
        };

        // Merge & Prepend ID
        mergePosts([postWithAuthor]);
        setPostIds(prev => [postWithAuthor._id || postWithAuthor.id, ...prev]);
    };

    const handleDeletePost = (deletedPostId) => {
        setPostIds(prev => prev.filter(id => id !== deletedPostId));
        toast.success("Post deleted");
    };

    // Resolve IDs to full objects
    const visiblePosts = postIds.map(id => allPosts[id]).filter(Boolean);

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
                        {error && (
                            <div className="feed-error-state">
                                <p>Unable to load posts</p>
                                <button onClick={() => { setError(null); fetchFeed(null, true); }} className="retry-btn">
                                    Retry
                                </button>
                            </div>
                        )}

                        {isLoading && visiblePosts.length === 0 && (
                            <>
                                {[...Array(5)].map((_, i) => (
                                    <PostSkeleton key={i} />
                                ))}
                            </>
                        )}

                        {visiblePosts.length > 0 && (
                            <Virtuoso
                                useWindowScroll
                                data={visiblePosts}
                                endReached={() => {
                                    if (hasMore && !isLoading) {
                                        fetchFeed(cursor);
                                    }
                                }}
                                itemContent={(index, post) => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        onDelete={handleDeletePost}
                                    />
                                )}
                                components={{
                                    Footer: () => (
                                        isLoading && (
                                            <div className="feed-loader">
                                                <LogoLoader size="1.2rem" text="Loading more posts..." />
                                            </div>
                                        )
                                    )
                                }}
                            />
                        )}
                    </div>
                </div>
            </main >

            <RightSidebar />
            <MobileNavbar />
        </div >
    );
};
Feed.whyDidYouRender = true;
export default Feed;
