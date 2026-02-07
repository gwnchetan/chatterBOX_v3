import React, { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
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
    const queryClient = useQueryClient();
    const { posts: allPosts, mergePosts } = useFeed();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error: queryError
    } = useInfiniteQuery({
        queryKey: ['feed'],
        queryFn: ({ pageParam }) => postsService.getFeed(pageParam),
        getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // 1. Sync fetched posts to FeedContext (for interactions)
    useEffect(() => {
        if (data?.pages) {
            const newPosts = data.pages.flatMap(page => page.posts);
            mergePosts(newPosts);
        }
    }, [data?.pages, mergePosts]);

    // 2. Derive visible posts merging Cache Order + Context Updates
    const visiblePosts = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap(page =>
            page.posts.map(p => allPosts[p._id] || p) // Prefer context version (has likes/comments updates)
        );
    }, [data?.pages, allPosts]);



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

        // Merge to Context (for immediate availability)
        mergePosts([postWithAuthor]);

        // Update Cache (prepend to first page)
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return { pages: [{ posts: [postWithAuthor] }], pageParams: [undefined] };

            const newPages = [...oldData.pages];
            // Setup a new first page or prepend to existing
            if (newPages.length > 0) {
                newPages[0] = {
                    ...newPages[0],
                    posts: [postWithAuthor, ...newPages[0].posts],
                };
            }
            return { ...oldData, pages: newPages };
        });

        // No need to setPostIds manually anymore
    };

    const handleDeletePost = (deletedPostId) => {
        // Update Cache to remove post
        queryClient.setQueryData(['feed'], (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map(page => ({
                    ...page,
                    posts: page.posts.filter(p => p._id !== deletedPostId)
                }))
            };
        });
        toast.success("Post deleted");
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
                        {queryError && (
                            <div className="feed-error-state">
                                <p>Unable to load posts</p>
                                <button onClick={() => { queryClient.invalidateQueries(['feed']); }} className="retry-btn">
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
                                    if (hasNextPage && !isFetchingNextPage) {
                                        fetchNextPage();
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
                                        isFetchingNextPage && (
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
