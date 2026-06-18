import React, { useEffect, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import Navbar from '../components/layout/Navbar';
import RightSidebar from '../components/layout/RightSidebar';
import PostCard from '../components/feed/PostCard';
import MobileNavbar from '../components/layout/MobileNavbar';
import StoryRail from '../components/feed/StoryRail';
import PostSkeleton from '../components/feed/PostSkeleton';
import LogoLoader from '../components/common/LogoLoader';
import Avatar from '../components/common/Avatar';
import BrandLogo from '../components/common/BrandLogo';
import { Bell } from '../components/common/Icons';
import { postsService } from '../services/posts.service';
import { useFeed } from '../hooks/useFeed';
import { getAuthSession } from '../utils/authStorage';
import './feed.css';

const FEED_SECTIONS = [
    { id: 'friends', label: 'Friends' },
    { id: 'recents', label: 'Recents' },
    { id: 'popular', label: 'Popular' }
];
const EMPTY_PAGES = [];

const extractPostsForContext = (pages = []) => pages
    .flatMap((page) => page.posts || [])
    .flatMap((post) => {
        const extracted = [post];
        if (post.repostOf && typeof post.repostOf === 'object') {
            extracted.push(post.repostOf);
        }
        return extracted;
    });

const Feed = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('friends');
    const queryClient = useQueryClient();
    const { posts: allPosts, mergePosts } = useFeed();
    const { user: currentUser, userId: currentUserId = '' } = getAuthSession();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error: queryError
    } = useInfiniteQuery({
        queryKey: ['feed', activeSection],
        queryFn: ({ pageParam }) => postsService.getFeed({
            section: activeSection,
            cursor: pageParam,
            limit: 10
        }),
        getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
        staleTime: 1000 * 60 * 5,
        initialPageParam: null
    });

    const pages = data?.pages ?? EMPTY_PAGES;

    useEffect(() => {
        if (!pages.length) return;
        mergePosts(extractPostsForContext(pages));
    }, [mergePosts, pages]);

    const visiblePosts = pages.flatMap((page) =>
        page.posts.map((post) => allPosts[post._id] || post)
    );

    useEffect(() => {
        const handleNewPost = (event) => {
            const newPost = event.detail;
            const user = getAuthSession().user;
            if (!user) return;

            const postWithAuthor = {
                ...newPost,
                author: {
                    _id: user._id || user.id,
                    fullname: user.fullname,
                    username: user.username,
                    avatar: user.avatar,
                    isPrivate: false
                },
                liked: false,
                reposted: false,
                saved: false,
                isRepost: !!newPost.repostOf,
                originalPost: newPost.repostOf || null
            };

            mergePosts([postWithAuthor]);

            ['friends', 'recents'].forEach((section) => {
                queryClient.setQueryData(['feed', section], (oldData) => {
                    if (!oldData?.pages?.length) {
                        return {
                            pages: [{ posts: [postWithAuthor], nextCursor: null }],
                            pageParams: [null]
                        };
                    }

                    const newPages = [...oldData.pages];
                    newPages[0] = {
                        ...newPages[0],
                        posts: [postWithAuthor, ...newPages[0].posts.filter((post) => post._id !== postWithAuthor._id)]
                    };

                    return { ...oldData, pages: newPages };
                });
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        window.addEventListener('post-created', handleNewPost);
        return () => window.removeEventListener('post-created', handleNewPost);
    }, [mergePosts, queryClient]);

    const handleDeletePost = (deletedPostId) => {
        FEED_SECTIONS.forEach(({ id }) => {
            queryClient.setQueryData(['feed', id], (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        posts: page.posts.filter((post) => post._id !== deletedPostId)
                    }))
                };
            });
        });
    };

    return (
        <div className="feed-layout">
            <Navbar />

            <main className="feed-center">
                <div className="feed-center-content">
                    <div className="feed-adaptive-topbar">
                        <button
                            type="button"
                            className="feed-adaptive-brand"
                            onClick={() => navigate('/feed')}
                            aria-label="Go to feed"
                        >
                            <BrandLogo size="1.85rem" animated={false} />
                        </button>
                        <div className="feed-adaptive-actions">
                            <button
                                type="button"
                                className="feed-adaptive-icon"
                                onClick={() => navigate('/notifications')}
                                aria-label="Open notifications"
                            >
                                <Bell size={20} />
                            </button>
                            <button
                                type="button"
                                className="feed-adaptive-profile"
                                onClick={() => navigate(currentUserId ? `/profile/${currentUserId}` : '/profile')}
                                aria-label="Open profile"
                            >
                                <Avatar src={currentUser?.avatar} size="md" alt={currentUser?.fullname || 'Profile'} />
                            </button>
                        </div>
                    </div>

                    <StoryRail />

                    <div className="feed-header-unified">
                        <h1>Feeds</h1>
                        <div className="header-filters">
                            {FEED_SECTIONS.map((section) => (
                                <button
                                    key={section.id}
                                    className={`text-filter ${activeSection === section.id ? 'active' : ''}`}
                                    onClick={() => setActiveSection(section.id)}
                                >
                                    {section.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="feed-list">
                        {queryError && (
                            <div className="feed-error-state">
                                <p>Unable to load posts</p>
                                <button
                                    onClick={() => queryClient.invalidateQueries({ queryKey: ['feed', activeSection] })}
                                    className="retry-btn"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {isLoading && visiblePosts.length === 0 && (
                            <>
                                {[...Array(5)].map((_, index) => (
                                    <PostSkeleton key={index} />
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
                                        isFetchingNextPage ? (
                                            <div className="feed-loader">
                                                <LogoLoader size="1.2rem" text="Loading more posts..." />
                                            </div>
                                        ) : null
                                    )
                                }}
                            />
                        )}
                    </div>
                </div>
            </main>

            <RightSidebar />
            <MobileNavbar />
        </div>
    );
};

export default Feed;
