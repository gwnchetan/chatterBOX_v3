import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import userService from '../services/user.service';
import PostCard from '../components/feed/PostCard';
import ProfilePostCard from '../components/feed/ProfilePostCard';
import { MapPin, Link as LinkIcon, Calendar, Edit3, Grid, List as ListIcon, Heart, MessageSquare, Lock, Settings } from '../components/common/Icons';
import { useToast } from '../components/Toast';
import EditProfileModal from '../components/profile/EditProfileModal';
import PostDetailModal from '../components/profile/PostDetailModal';
import SettingsModal from '../components/common/SettingsModal';
import Navbar from '../components/layout/Navbar';
import MobileNavbar from '../components/layout/MobileNavbar';
import './profile.css';
import LogoLoader from '../components/common/LogoLoader';
import RightSidebar from '../components/layout/RightSidebar';
import { useFeed } from '../context/FeedContext';

const Profile = () => {
    const { userId: paramId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { mergePosts } = useFeed();

    const [userId, setUserId] = useState(paramId);
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // Default to list
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isRequested, setIsRequested] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user'));
    const currentUserId = currentUser ? (currentUser.id || currentUser._id) : null;
    const isOwner = currentUserId && userId && (String(userId) === String(currentUserId));

    const handleFollowToggle = async () => {
        if (followLoading) return;
        setFollowLoading(true);
        try {
            if (isFollowing || isRequested) {
                // Unfollow or Withdraw Request
                await userService.unfollowUser(userId);

                const wasFollowing = isFollowing;
                setIsFollowing(false);
                setIsRequested(false);

                // Only update count if actually following
                if (wasFollowing) {
                    setProfile(prev => ({
                        ...prev,
                        stats: { ...prev.stats, followers: Math.max(0, prev.stats.followers - 1) }
                    }));
                }
                toast.success(isRequested ? "Request withdrawn" : "Unfollowed user");
            } else {
                // Follow
                const response = await userService.followUser(userId);

                if (response.status === 'requested') {
                    setIsRequested(true);
                    toast.success("Request sent");
                } else {
                    setIsFollowing(true);
                    setProfile(prev => ({
                        ...prev,
                        stats: { ...prev.stats, followers: prev.stats.followers + 1 }
                    }));
                    toast.success("Followed user");
                }
            }
        } catch (error) {
            console.error("Follow action failed", error);
            toast.error("Action failed");
        } finally {
            setFollowLoading(false);
        }
    };

    // 1. Resolve effective userId
    useEffect(() => {
        if (!paramId) {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            if (storedUser && (storedUser.id || storedUser._id)) {
                setUserId(storedUser.id || storedUser._id);
            } else {
                toast.error("Please login to view your profile");
                navigate('/');
            }
        } else {
            setUserId(paramId);
        }
    }, [paramId, navigate, toast]);

    // Fetch Profile Data
    const fetchProfile = useCallback(async (uid) => {
        if (!uid) return;
        try {
            const data = await userService.getProfile(uid);
            const userProfile = data.user;
            setProfile(userProfile);

            // Sync Follow Status
            const status = userProfile.followStatus;
            const _isFollowing = status === 'following';
            setIsFollowing(_isFollowing);
            setIsRequested(status === 'requested');

            // Determine if we should fetch posts
            const storedUser = JSON.parse(localStorage.getItem('user'));
            const _isOwner = storedUser && (uid === (storedUser.id || storedUser._id));

            if (!_isOwner && userProfile.isPrivate && !_isFollowing) {
                setLoading(false);
            } else {
                try {
                    const postData = await userService.getUserPosts(uid);
                    mergePosts(postData.posts);
                    setPosts(postData.posts);
                } catch (e) { console.error(e); }
                setLoading(false);
            }
        } catch (err) {
            console.error("Profile fetch error:", err);
            toast.error("Failed to load profile");
            setLoading(false);
        }
    }, [toast, mergePosts]);

    // Fetch User Posts
    const fetchPosts = useCallback(async (uid) => {
        if (!uid) return;
        try {
            const data = await userService.getUserPosts(uid);
            mergePosts(data.posts);
            setPosts(data.posts);
        } catch (err) {
            console.error("Posts fetch error:", err);
        }
    }, [mergePosts]);

    useEffect(() => {
        if (userId) {
            setLoading(true);
            fetchProfile(userId);
        }
    }, [userId, fetchProfile]);



    // ...

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <LogoLoader size="3rem" text="Gathering profile..." />
            </div>
        );
    }

    if (!profile) {
        return <div className="profile-error">User not found</div>;
    }

    return (
        <div className="profile-layout">
            <Navbar />

            <main className="profile-center">
                <div className="profile-page">
                    {/* Header / Banner Section */}
                    <div className="profile-header">
                        <div className="profile-banner">
                            {profile.bannerImage ? (
                                <img src={profile.bannerImage} alt="banner" />
                            ) : (
                                <div className="banner-placeholder"></div>
                            )}
                            <div className="view-toggle">
                                <button
                                    className={`toggle-icon ${viewMode === 'grid' ? 'active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid size={20} />
                                </button>
                                <button
                                    className={`toggle-icon ${viewMode === 'list' ? 'active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    <ListIcon size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="profile-info-container">
                            <div className="profile-avatar-row">
                                <div className="profile-avatar-wrapper">
                                    <img
                                        src={profile.avatar || '/default-avatar.png'}
                                        alt={profile.username}
                                        className="profile-avatar"
                                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                                    />
                                </div>
                                <div className="profile-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {isOwner ? (
                                        <>
                                            <button
                                                className="btn-edit-profile"
                                                style={{ color: 'var(--color-text-main)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                                                onClick={() => setIsEditModalOpen(true)}
                                            >
                                                <Edit3 size={18} />
                                                <span>Edit Profile</span>
                                            </button>
                                            <button
                                                className="btn-edit-profile"
                                                style={{ padding: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)' }}
                                                onClick={() => setIsSettingsOpen(true)}
                                            >
                                                <Settings size={20} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn-edit-profile"
                                            style={{
                                                background: (isFollowing || isRequested) ? 'transparent' : 'var(--color-primary)',
                                                border: (isFollowing || isRequested) ? '1px solid var(--color-border)' : 'none',
                                                color: (isFollowing || isRequested) ? 'var(--color-text-main)' : '#fff'
                                            }}
                                            onClick={handleFollowToggle}
                                            disabled={followLoading}
                                        >
                                            <span>{isFollowing ? 'Unfollow' : (isRequested ? 'Requested' : 'Follow')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="profile-info-text">
                                <h1 className="profile-fullname">{profile.fullname}</h1>
                                <p className="profile-username">@{profile.username}</p>

                                {profile.bio && <p className="profile-bio">{profile.bio}</p>}

                                <div className="profile-meta">
                                    {profile.location && (
                                        <span className="meta-item">
                                            <MapPin size={16} />
                                            {profile.location}
                                        </span>
                                    )}
                                    {profile.website && (
                                        <span className="meta-item">
                                            <LinkIcon size={16} />
                                            <a href={profile.website} target="_blank" rel="noopener noreferrer">
                                                {profile.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </span>
                                    )}
                                    <span className="meta-item">
                                        <Calendar size={16} />
                                        Joined Dec 2025
                                    </span>
                                </div>

                                <div className="profile-stats">
                                    <div className="stat-item">
                                        <span className="stat-value">{profile.stats?.posts || 0}</span>
                                        <span className="stat-label">Posts</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value">{profile.stats?.followers || 0}</span>
                                        <span className="stat-label">Followers</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value">{profile.stats?.following || 0}</span>
                                        <span className="stat-label">Following</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Tabs / Feed Section */}
                    {/* Content Tabs / Feed Section */}
                    {(profile.isPrivate && !isOwner && !isFollowing) ? (
                        <div className="private-profile-view">
                            <div className="private-icon-circle">
                                <Lock size={32} />
                            </div>
                            <h2>This Account is Private</h2>
                            <p>Follow to see their photos and videos.</p>
                        </div>
                    ) : (
                        <div className="profile-content">
                            <div className="content-tabs">
                                <button
                                    className={`tab-btn active`}
                                > Posts </button>
                                <button className="tab-btn"> Media </button>
                                <button className="tab-btn"> Likes </button>

                                <div className="view-toggle">
                                    <button
                                        className={`toggle-icon ${viewMode === 'grid' ? 'active' : ''}`}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <Grid size={20} />
                                    </button>
                                    <button
                                        className={`toggle-icon ${viewMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setViewMode('list')}
                                    >
                                        <ListIcon size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className={`profile-feed ${viewMode}`}>
                                {Array.isArray(posts) && posts.length > 0 ? (
                                    viewMode === 'list' ? (
                                        posts.map(post => {
                                            // Check if post has media
                                            const hasMedia = post.media && post.media.length > 0;

                                            return (
                                                <div key={post._id} className="feed-item-wrapper">
                                                    {hasMedia ? (
                                                        <PostCard post={post} onDelete={(deletedId) => setPosts(prev => prev.filter(p => p._id !== deletedId))} />
                                                    ) : (
                                                        <ProfilePostCard post={post} isOwner={isOwner} onDelete={(deletedId) => setPosts(prev => prev.filter(p => p._id !== deletedId))} />
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        posts.map(post => (
                                            <GridItem
                                                key={post._id}
                                                post={post}
                                                onClick={() => setSelectedPost(post)}
                                            />
                                        ))
                                    )
                                ) : (
                                    <div className="empty-feed">
                                        <p>No posts yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <EditProfileModal
                        isOpen={isEditModalOpen}
                        profile={profile}
                        onClose={() => setIsEditModalOpen(false)}
                        onUpdate={(updatedData) => setProfile(prev => ({ ...prev, ...updatedData }))}
                    />
                    <PostDetailModal
                        isOpen={!!selectedPost}
                        post={selectedPost}
                        onClose={() => setSelectedPost(null)}
                    />
                    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                </div>
            </main>

            <RightSidebar />
            <MobileNavbar />
        </div>
    );
};

// Helper component for the Grid View
const GridItem = ({ post, onClick }) => {
    const mainMedia = post.media?.[0];
    const isVideo = mainMedia?.type === 'video';

    return (
        <div className="grid-item" onClick={onClick}>
            <div className="grid-media-wrapper">
                {isVideo ? (
                    <div className="grid-video-preview">
                        <img
                            src={mainMedia.url ? mainMedia.url.replace(/\.[^.]+$/, '.jpg') : '/default-placeholder.png'}
                            alt=""
                            onError={(e) => { e.target.src = '/default-placeholder.png'; }} // Use local placeholder
                        />
                        <div className="video-icon-badge">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                ) : (
                    <img src={mainMedia?.url || '/default-placeholder.png'} alt="" onError={(e) => { e.target.src = '/default-placeholder.png'; }} />
                )}

                <div className="grid-overlay">
                    <div className="overlay-stats">
                        <div className="stat">
                            <Heart size={18} fill="white" />
                            <span>{post.likeCount || 0}</span>
                        </div>
                        <div className="stat">
                            <MessageSquare size={18} fill="white" />
                            <span>{post.commentCount || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
