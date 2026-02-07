import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { postsService } from '../services/posts.service';
import userService from '../services/user.service'; // For search
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import PostCard from '../components/feed/PostCard'; // We can reuse standard cards or grid
import Avatar from '../components/common/Avatar';
import { Search } from '../components/common/Icons';
import { useNavigate } from 'react-router-dom';
import RightSidebar from '../components/layout/RightSidebar';
import { useFeed } from '../context/FeedContext';

import './explore.css';

const Explore = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const navigate = useNavigate();
    const { mergePosts, posts: allPosts } = useFeed();
    const queryClient = useQueryClient();

    // Debounce Search Input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // 1. Explore Feed Query
    const {
        data: exploreData,
        isLoading: exploreLoading
    } = useQuery({
        queryKey: ['explore'],
        queryFn: postsService.getExplorePosts,
        enabled: !debouncedQuery,
        staleTime: 1000 * 60 * 5,
    });

    // 2. Search Query
    const {
        data: searchData,
        isLoading: searchLoading
    } = useQuery({
        queryKey: ['search', debouncedQuery],
        queryFn: async () => {
            const [userData, postData] = await Promise.all([
                userService.searchUsers(debouncedQuery),
                postsService.searchPosts(debouncedQuery)
            ]);
            return { users: userData.users || [], posts: postData.posts || [] };
        },
        enabled: !!debouncedQuery,
    });

    // Sync posts/data to UI
    const isSearching = !!debouncedQuery;
    const loading = isSearching ? searchLoading : exploreLoading;
    const searchResultsUsers = isSearching ? (searchData?.users || []) : [];

    // Merge posts to context + Resolve visible posts
    const visiblePosts = useMemo(() => {
        const rawPosts = isSearching ? (searchData?.posts || []) : (exploreData?.posts || []);
        // Sync to context
        if (rawPosts.length > 0) mergePosts(rawPosts);

        // Return context version if available (for likes/reposts)
        return rawPosts.map(p => allPosts[p._id] || p);
    }, [isSearching, searchData, exploreData, allPosts, mergePosts]);


    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleUserClick = (userId) => {
        navigate(`/profile/${userId}`);
    };

    return (
        <div className="explore-layout">
            <Navbar />

            <main className="explore-center">
                <div className="explore-content-container">
                    {/* Search Header */}
                    <div className="explore-header">
                        <div className="search-bar-wrapper">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search users, posts, or tags..."
                                value={searchQuery}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>

                    {/* User Search Results Section */}
                    {searchQuery && searchResultsUsers.length > 0 && (
                        <div className="search-section users-section">
                            <h3 className="section-title">People</h3>
                            <div className="search-results-container">
                                {searchResultsUsers.map(user => (
                                    <div key={user._id} className="search-result-item" onClick={() => handleUserClick(user._id)}>
                                        <Avatar src={user.avatar} size="sm" alt={user.fullname} />
                                        <div className="result-info">
                                            <span className="result-fullname">{user.fullname}</span>
                                            <span className="result-username">@{user.username}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main Content Grid (Explore Feed OR Post Search Results) */}
                    <div className="explore-grid">
                        {searchQuery && <h3 className="section-title">Posts</h3>}

                        {loading ? (
                            <div className="explore-loading">Loading...</div>
                        ) : visiblePosts.length > 0 ? (
                            <div className="masonry-grid">
                                {visiblePosts.map(post => (
                                    <div key={post._id} className="masonry-item">
                                        <PostCard post={post} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-results">
                                {debouncedQuery ? "No posts found matching your search." : "No explore posts available."}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <RightSidebar />
            <MobileNavbar />
        </div>
    );
};

export default Explore;
