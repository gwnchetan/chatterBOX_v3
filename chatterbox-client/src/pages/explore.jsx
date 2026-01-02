import React, { useState, useEffect } from 'react';
import { postsService } from '../services/posts.service';
import userService from '../services/user.service'; // For search
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import PostCard from '../components/feed/PostCard'; // We can reuse standard cards or grid
import Avatar from '../components/common/Avatar';
import { Search } from '../components/common/Icons';
import { useNavigate } from 'react-router-dom';
import './explore.css';

const Explore = () => {
    const [posts, setPosts] = useState([]); // Explore feed OR Search results
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResultsUsers, setSearchResultsUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadExploreFeed();
    }, []);

    const loadExploreFeed = async () => {
        try {
            setLoading(true);
            const data = await postsService.getExplorePosts();
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Error loading explore feed:', error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search could be added here, currently simple async
    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.trim().length > 0) {
            setSearching(true);
            try {
                // Parallel search: Users + Posts
                const [userData, postData] = await Promise.all([
                    userService.searchUsers(query),
                    postsService.searchPosts(query)
                ]);

                setSearchResultsUsers(userData.users || []);
                setPosts(postData.posts || []); // Update main grid with search results
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setSearching(false);
            }
        } else {
            // Reset to explore feed
            setSearchResultsUsers([]);
            loadExploreFeed();
        }
    };

    const handleUserClick = (userId) => {
        navigate(`/profile/${userId}`);
    };

    return (
        <div className="explore-layout">
            <Navbar />
            <div className="explore-page">
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

                    {loading || searching ? (
                        <div className="explore-loading">Loading...</div>
                    ) : posts.length > 0 ? (
                        <div className="masonry-grid">
                            {posts.map(post => (
                                <div key={post._id} className="masonry-item">
                                    <PostCard post={post} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-results">
                            {searchQuery ? "No posts found matching your search." : "No explore posts available."}
                        </div>
                    )}
                </div>
            </div>
            <MobileNavbar />
        </div>
    );
};

export default Explore;
