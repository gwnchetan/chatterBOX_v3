// Verified: handleFollowToggle correctly sets 'requested' state and shows toast.
// Button text also updates based on isRequested state.

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import userService from '../services/user.service';
import chatService from '../services/chat.service';
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
import { socketService } from '../services/socket.service';

const Profile = () => {
    const { userId: paramId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { mergePosts } = useFeed();

    const queryClient = useQueryClient();

    // 1. Resolve effective userId
    const storedUser = JSON.parse(localStorage.getItem('user'));
    const currentUserId = storedUser ? (storedUser.id || storedUser._id) : null;

    // Determine the ID to fetch (param or current user)
    const targetUserId = paramId || currentUserId;

    useEffect(() => {
        if (!targetUserId) {
            toast.error("Please login to view your profile");
            navigate('/');
        }
    }, [targetUserId, navigate, toast]);


    const isOwner = currentUserId && targetUserId && (String(targetUserId) === String(currentUserId));

    // 2. Fetch Profile Data (Caching enabled)
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile', targetUserId],
        queryFn: () => userService.getProfile(targetUserId).then(res => res.user),
        enabled: !!targetUserId,
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    });

    const { data: blockedUsersData } = useQuery({
        queryKey: ['blocked-users'],
        queryFn: userService.getBlockedUsers,
        enabled: !!currentUserId && !isOwner,
        staleTime: 1000 * 60
    });

    // 3. Fetch Posts Data (Caching enabled)
    const { data: postsData } = useQuery({
        queryKey: ['posts', targetUserId],
        queryFn: () => userService.getUserPosts(targetUserId),
        enabled: !!targetUserId && !!profile && (!profile.isPrivate || isOwner || profile?.followStatus === 'following'),
        staleTime: 1000 * 60 * 2, // 2 minutes fresh
    });

    const posts = postsData?.posts || [];
    const loading = profileLoading;

    // Sync posts to FeedContext (optional)
    useEffect(() => {
        if (postsData?.posts?.length > 0) {
            mergePosts(postsData.posts);
        }
    }, [mergePosts, postsData?.posts]);

    const [viewMode, setViewMode] = useState('list');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [followLoading, setFollowLoading] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);

    // Derived State for UI
    const isFollowing = profile?.followStatus === 'following';
    const isRequested = profile?.followStatus === 'requested';
    const isBlocked = blockedUsersData?.blockedUsers?.some((user) => String(user._id) === String(targetUserId));

    const handleFollowToggle = async () => {
        if (!profile) return;
        if (followLoading) return; // Prevent multiple clicks
        setFollowLoading(true);

        // Optimistic Update
        const previousProfile = queryClient.getQueryData(['profile', targetUserId]);
        queryClient.setQueryData(['profile', targetUserId], old => {
            if (!old) return old;
            const newFollowStatus = old.followStatus === 'following' ? null : (old.isPrivate ? 'requested' : 'following');
            const newFollowersCount = old.followStatus === 'following' ? old.stats.followers - 1 : old.stats.followers + 1;
            return {
                ...old,
                followStatus: newFollowStatus,
                stats: {
                    ...old.stats,
                    followers: newFollowersCount
                }
            };
        });

        try {
            if (isFollowing || isRequested) {
                await userService.unfollowUser(targetUserId);
                toast.success(isRequested ? "Request withdrawn" : `Unfollowed ${profile.fullname}`);
            } else {
                const response = await userService.followUser(targetUserId);
                if (response.status === 'requested') toast.success("Request sent");
                else toast.success(`Followed ${profile.fullname}`);
            }
            queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] }); // Re-fetch to ensure consistency
        } catch (error) {
            queryClient.setQueryData(['profile', targetUserId], previousProfile); // Rollback
            console.error("Follow action failed", error);
            toast.error("Failed to update follow status");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleMessage = async () => {
        try {
            const conversation = await chatService.initiateConversation(targetUserId);
            navigate(`/chat/${conversation._id}`);
        } catch (error) {
            console.error("Failed to start chat", error);
            toast.error("Could not start chat");
        }
    };

    const handleBlockToggle = async () => {
        if (blockLoading) return;
        setBlockLoading(true);

        try {
            if (isBlocked) {
                await userService.unblockUser(targetUserId);
                queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
                toast.success('User unblocked');
            } else {
                await userService.blockUser(targetUserId);
                queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
                toast.success('User blocked');
                navigate('/feed');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to update block status');
        } finally {
            setBlockLoading(false);
        }
    };


    // Real-time follow status update
    // Real-time follow status update
    useEffect(() => {
        const handleStatusUpdate = (data) => {
            if (data.targetUserId === targetUserId) {
                queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] });
            }
        };

        socketService.on('user:follow_status_update', handleStatusUpdate);
        return () => {
            socketService.off('user:follow_status_update', handleStatusUpdate);
        };
    }, [targetUserId, queryClient]);

    // ... (Existing code)

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
                                                className="btn-edit-profile btn-settings-mobile-only"
                                                style={{ padding: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)' }}
                                                onClick={() => setIsSettingsOpen(true)}
                                            >
                                                <Settings size={20} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className="btn-edit-profile"
                                                style={{
                                                    background: (isFollowing || isRequested) ? 'transparent' : 'var(--color-primary)',
                                                    border: (isFollowing || isRequested) ? '1px solid var(--color-border)' : 'none',
                                                    color: (isFollowing || isRequested) ? 'var(--color-text-main)' : '#fff'
                                                }}
                                                onClick={handleFollowToggle}
                                                disabled={followLoading || isBlocked}
                                            >
                                                <span>{isBlocked ? 'Blocked' : (isFollowing ? 'Unfollow' : (isRequested ? 'Requested' : 'Follow'))}</span>
                                            </button>
                                            <button
                                                className="btn-edit-profile"
                                                style={{ color: 'var(--color-text-main)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginLeft: '8px' }}
                                                onClick={handleMessage}
                                                disabled={isBlocked}
                                            >
                                                <MessageSquare size={18} />
                                                <span>Message</span>
                                            </button>
                                            <button
                                                className="btn-edit-profile"
                                                style={{ color: 'var(--color-text-main)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginLeft: '8px' }}
                                                onClick={handleBlockToggle}
                                                disabled={blockLoading}
                                            >
                                                <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                                            </button>
                                        </>
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
                                                        <PostCard
                                                            post={post}
                                                            onDelete={() => queryClient.invalidateQueries({ queryKey: ['posts', targetUserId] })}
                                                        />
                                                    ) : (
                                                        <ProfilePostCard
                                                            post={post}
                                                            isOwner={isOwner}
                                                            onDelete={() => queryClient.invalidateQueries({ queryKey: ['posts', targetUserId] })}
                                                        />
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
                        onUpdate={(updatedData) => {
                            queryClient.setQueryData(['profile', targetUserId], (old) => ({
                                ...old,
                                ...updatedData
                            }));
                        }}
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
