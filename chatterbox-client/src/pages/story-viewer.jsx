import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LogoLoader from '../components/common/LogoLoader';
import { ChevronLeft, ChevronRight, Trash, Volume2, VolumeX, X } from '../components/common/Icons';
import { useToast } from '../components/Toast';
import userService from '../services/user.service';
import './story-viewer.css';

const IMAGE_STORY_DURATION_MS = 5000;
const EMPTY_STORIES = [];

const normalizeStoryUser = (storyUser, fallbackUserId = null) => {
    if (!storyUser) {
        return null;
    }

    return {
        ...storyUser,
        userId: storyUser.userId || storyUser._id || fallbackUserId
    };
};

const hasViewedStory = (story, viewerId) => (
    Array.isArray(story?.views)
        ? story.views.some((viewId) => String(viewId) === String(viewerId))
        : false
);

const StoryViewer = () => {
    const { userId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const toast = useToast();
    const videoRef = useRef(null);
    const initializedStoryKeyRef = useRef('');

    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const currentUserId = currentUser?._id || currentUser?.id || null;
    const fromPath = location.state?.from || '/feed';

    const [activeStoryIndex, setActiveStoryIndex] = useState(0);
    const [imageProgress, setImageProgress] = useState(0);
    const [videoProgress, setVideoProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: storyFeed = [] } = useQuery({
        queryKey: ['storyFeed'],
        queryFn: userService.getStoryFeed,
        staleTime: 1000 * 60 * 5
    });

    const { data: ownStories = null } = useQuery({
        queryKey: ['userStories', currentUserId],
        queryFn: () => userService.getUserStories(currentUserId),
        enabled: !!currentUserId && String(currentUserId) !== String(userId),
        staleTime: 1000 * 60 * 5
    });

    const {
        data: selectedStoryUser = null,
        isLoading,
        error
    } = useQuery({
        queryKey: ['userStories', userId],
        queryFn: () => userService.getUserStories(userId),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5
    });

    const normalizedSelectedStoryUser = normalizeStoryUser(selectedStoryUser, userId);

    const storyUsers = useMemo(() => {
        const users = [];
        const normalizedOwnStories = normalizeStoryUser(ownStories, currentUserId);

        if (normalizedOwnStories?.stories?.length) {
            users.push(normalizedOwnStories);
        }

        storyFeed.forEach((storyUser) => {
            const normalizedStoryUser = normalizeStoryUser(storyUser, storyUser.userId);
            if (!users.some((item) => String(item.userId) === String(normalizedStoryUser.userId))) {
                users.push(normalizedStoryUser);
            }
        });

        if (normalizedSelectedStoryUser && !users.some((item) => String(item.userId) === String(normalizedSelectedStoryUser.userId))) {
            users.push(normalizedSelectedStoryUser);
        }

        return users;
    }, [currentUserId, ownStories, storyFeed, normalizedSelectedStoryUser]);

    const selectedUserIndex = storyUsers.findIndex((item) => String(item.userId) === String(userId));
    const activeStoryUser = selectedUserIndex >= 0 ? storyUsers[selectedUserIndex] : normalizedSelectedStoryUser;
    const stories = activeStoryUser?.stories ?? EMPTY_STORIES;
    const currentStory = stories[activeStoryIndex] || null;
    const isOwnStory = String(activeStoryUser?.userId) === String(currentUserId);
    const currentStoryId = currentStory?._id || null;
    const currentStoryType = currentStory?.mediaType || null;
    const initialStoryKey = useMemo(() => (
        `${userId}:${stories.map((story) => story._id).join('|')}:${currentUserId || ''}:${location.state?.initialStoryIndex ?? ''}:${location.state?.startFromLatest ? 'latest' : 'default'}`
    ), [currentUserId, location.state?.initialStoryIndex, location.state?.startFromLatest, stories, userId]);

    const goBackToSource = useCallback(() => {
        navigate(fromPath, { replace: true });
    }, [fromPath, navigate]);

    const goToStoryUser = useCallback((targetUserId, options = {}) => {
        navigate(`/stories/${targetUserId}`, {
            replace: true,
            state: {
                from: fromPath,
                ...options
            }
        });
    }, [fromPath, navigate]);

    const goToNextStory = useCallback(() => {
        if (!stories.length) {
            goBackToSource();
            return;
        }

        if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex((currentIndex) => currentIndex + 1);
            setImageProgress(0);
            setVideoProgress(0);
            return;
        }

        if (selectedUserIndex >= 0 && selectedUserIndex < storyUsers.length - 1) {
            goToStoryUser(storyUsers[selectedUserIndex + 1].userId, { initialStoryIndex: 0 });
            return;
        }

        goBackToSource();
    }, [activeStoryIndex, goBackToSource, goToStoryUser, selectedUserIndex, stories.length, storyUsers]);

    const goToPreviousStory = useCallback(() => {
        if (!stories.length) {
            goBackToSource();
            return;
        }

        if (activeStoryIndex > 0) {
            setActiveStoryIndex((currentIndex) => currentIndex - 1);
            setImageProgress(0);
            setVideoProgress(0);
            return;
        }

        if (selectedUserIndex > 0) {
            goToStoryUser(storyUsers[selectedUserIndex - 1].userId, { startFromLatest: true });
            return;
        }

        goBackToSource();
    }, [activeStoryIndex, goBackToSource, goToStoryUser, selectedUserIndex, stories.length, storyUsers]);

    const handleMediaCardTap = useCallback((event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const tappedLeftSide = event.clientX - bounds.left < bounds.width / 2;

        if (tappedLeftSide) {
            goToPreviousStory();
            return;
        }

        goToNextStory();
    }, [goToNextStory, goToPreviousStory]);

    useEffect(() => {
        if (!stories.length) {
            initializedStoryKeyRef.current = '';
            return;
        }

        if (initializedStoryKeyRef.current === initialStoryKey) {
            return;
        }

        initializedStoryKeyRef.current = initialStoryKey;

        const requestedStoryIndex = Number.isInteger(location.state?.initialStoryIndex)
            ? location.state.initialStoryIndex
            : null;
        const unseenStoryIndex = stories.findIndex((story) => !hasViewedStory(story, currentUserId));

        let nextStoryIndex = 0;
        if (requestedStoryIndex !== null) {
            nextStoryIndex = Math.min(Math.max(requestedStoryIndex, 0), stories.length - 1);
        } else if (location.state?.startFromLatest) {
            nextStoryIndex = stories.length - 1;
        } else if (unseenStoryIndex >= 0) {
            nextStoryIndex = unseenStoryIndex;
        }

        setActiveStoryIndex(nextStoryIndex);
        setImageProgress(0);
        setVideoProgress(0);
        setIsMuted(true);
    }, [currentUserId, initialStoryKey, location.state?.initialStoryIndex, location.state?.startFromLatest, stories]);

    useEffect(() => {
        if (!currentStory || currentStoryType === 'video') {
            return undefined;
        }

        setImageProgress(0);
        let frameId = 0;
        let animationStart = 0;

        const animate = (timestamp) => {
            if (!animationStart) {
                animationStart = timestamp;
            }

            const progress = Math.min(((timestamp - animationStart) / IMAGE_STORY_DURATION_MS) * 100, 100);
            setImageProgress(progress);

            if (progress >= 100) {
                goToNextStory();
                return;
            }

            frameId = window.requestAnimationFrame(animate);
        };

        frameId = window.requestAnimationFrame(animate);

        return () => window.cancelAnimationFrame(frameId);
    }, [currentStory, currentStoryType, goToNextStory]);

    useEffect(() => {
        setVideoProgress(0);
    }, [currentStoryId]);

    useEffect(() => {
        if (!currentStory || currentStoryType !== 'video' || !videoRef.current) {
            return;
        }

        const video = videoRef.current;
        video.currentTime = 0;
        video.play().catch(() => {
            // Autoplay can fail transiently until browser/media is ready.
        });
    }, [currentStory, currentStoryType]);

    useEffect(() => {
        if (!currentStory || isOwnStory || hasViewedStory(currentStory, currentUserId)) {
            return;
        }

        const markViewed = async () => {
            try {
                await userService.viewStory(activeStoryUser.userId, currentStory._id);

                const appendViewer = (storyUser) => {
                    if (!storyUser) return storyUser;

                    return {
                        ...storyUser,
                        stories: (storyUser.stories || []).map((story) => (
                            story._id === currentStory._id
                                ? {
                                    ...story,
                                    views: hasViewedStory(story, currentUserId)
                                        ? (story.views || [])
                                        : [...(story.views || []), currentUserId]
                                }
                                : story
                        ))
                    };
                };

                queryClient.setQueryData(['storyFeed'], (currentFeed = []) =>
                    currentFeed.map((storyUser) => (
                        String(storyUser.userId) === String(activeStoryUser.userId)
                            ? appendViewer(storyUser)
                            : storyUser
                    ))
                );

                queryClient.setQueryData(['userStories', activeStoryUser.userId], (currentStoryUser) =>
                    appendViewer(currentStoryUser)
                );
            } catch (viewError) {
                console.error('Failed to record story view', viewError);
            }
        };

        markViewed();
    }, [activeStoryUser?.userId, currentStory, currentUserId, isOwnStory, queryClient]);

    const handleDeleteStory = async () => {
        if (!currentStory || !isOwnStory || isDeleting) {
            return;
        }

        const confirmed = window.confirm('Delete this story?');
        if (!confirmed) {
            return;
        }

        setIsDeleting(true);
        try {
            await userService.deleteStory(currentStory._id);

            const removeStory = (storyUser) => {
                if (!storyUser) return storyUser;
                return {
                    ...storyUser,
                    stories: (storyUser.stories || []).filter((story) => story._id !== currentStory._id)
                };
            };

            queryClient.setQueryData(['storyFeed'], (currentFeed = []) =>
                currentFeed
                    .map((storyUser) => (
                        String(storyUser.userId) === String(activeStoryUser.userId)
                            ? removeStory(storyUser)
                            : storyUser
                    ))
                    .filter((storyUser) => storyUser.stories?.length > 0)
            );

            queryClient.setQueryData(['userStories', activeStoryUser.userId], (currentStoryUser) =>
                removeStory(currentStoryUser)
            );

            queryClient.invalidateQueries({ queryKey: ['storyFeed'] });
            queryClient.invalidateQueries({ queryKey: ['userStories'] });

            toast.success('Story deleted');

            if (stories.length > 1) {
                setActiveStoryIndex((currentIndex) => Math.max(0, Math.min(currentIndex, stories.length - 2)));
                return;
            }

            if (selectedUserIndex >= 0 && selectedUserIndex < storyUsers.length - 1) {
                goToStoryUser(storyUsers[selectedUserIndex + 1].userId, { initialStoryIndex: 0 });
                return;
            }

            if (selectedUserIndex > 0) {
                goToStoryUser(storyUsers[selectedUserIndex - 1].userId, { startFromLatest: true });
                return;
            }

            goBackToSource();
        } catch (deleteError) {
            console.error(deleteError);
            toast.error('Failed to delete story');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="story-viewer-shell">
                <div className="story-viewer-loading">
                    <LogoLoader size="2.8rem" text="Loading story..." />
                </div>
            </div>
        );
    }

    if (error) {
        const errorMessage = error?.response?.data?.message || 'Unable to load this story.';
        return (
            <div className="story-viewer-shell">
                <div className="story-viewer-empty">
                    <h2>{error?.response?.status === 403 ? 'Private story' : 'Story unavailable'}</h2>
                    <p>{errorMessage}</p>
                    <button type="button" className="story-viewer-action" onClick={() => navigate(fromPath)}>
                        Back
                    </button>
                </div>
            </div>
        );
    }

    if (!activeStoryUser || stories.length === 0 || !currentStory) {
        return (
            <div className="story-viewer-shell">
                <div className="story-viewer-empty">
                    <h2>No active stories</h2>
                    <p>This story has expired or been removed.</p>
                    <button type="button" className="story-viewer-action" onClick={() => navigate(fromPath)}>
                        Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="story-viewer-shell">
            <div className="story-viewer-backdrop" style={{ backgroundImage: `url(${currentStory.mediaUrl})` }} />

            <div className="story-viewer-frame">
                <div className="story-progress-bars">
                    {stories.map((story, index) => {
                        let progress = 0;
                        if (index < activeStoryIndex) {
                            progress = 100;
                        } else if (index === activeStoryIndex) {
                            progress = currentStory.mediaType === 'video' ? videoProgress : imageProgress;
                        }

                        return (
                            <div key={story._id} className="story-progress-track">
                                <div
                                    className="story-progress-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="story-viewer-header">
                    <div className="story-viewer-meta">
                        <img
                            src={activeStoryUser.avatar || 'https://via.placeholder.com/64'}
                            alt={activeStoryUser.username}
                            className="story-viewer-avatar"
                        />
                        <div>
                            <p className="story-viewer-name">
                                {isOwnStory ? 'You' : activeStoryUser.fullname || activeStoryUser.username}
                            </p>
                            <p className="story-viewer-subtitle">
                                @{activeStoryUser.username} · {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
                            </p>
                        </div>
                    </div>

                    <div className="story-viewer-actions">
                        {currentStory.mediaType === 'video' && (
                            <button
                                type="button"
                                className="story-viewer-icon-btn"
                                onClick={() => setIsMuted((currentValue) => !currentValue)}
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        )}
                        {isOwnStory && (
                            <button
                                type="button"
                                className="story-viewer-icon-btn"
                                onClick={handleDeleteStory}
                                disabled={isDeleting}
                            >
                                <Trash size={18} />
                            </button>
                        )}
                        <button
                            type="button"
                            className="story-viewer-icon-btn"
                            onClick={goBackToSource}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="story-viewer-stage">
                    <button
                        type="button"
                        className="story-nav story-nav-left"
                        onClick={() => goToPreviousStory()}
                        aria-label="Previous story"
                    >
                        <ChevronLeft size={28} />
                    </button>

                    <div className="story-media-card" onClick={handleMediaCardTap}>
                        {currentStory.mediaType === 'video' ? (
                            <video
                                key={currentStory._id}
                                ref={videoRef}
                                src={currentStory.mediaUrl}
                                className="story-media"
                                autoPlay
                                playsInline
                                controls={false}
                                muted={isMuted}
                                onEnded={() => goToNextStory()}
                                onTimeUpdate={(event) => {
                                    const { currentTime, duration } = event.currentTarget;
                                    if (!duration) return;
                                    setVideoProgress(Math.min((currentTime / duration) * 100, 100));
                                }}
                            />
                        ) : (
                            <img
                                src={currentStory.mediaUrl}
                                alt={`${activeStoryUser.username}'s story`}
                                className="story-media"
                            />
                        )}

                        <div className="story-media-gradient" />

                        {currentStory.caption && (
                            <div className="story-caption">
                                <p>{currentStory.caption}</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="story-nav story-nav-right"
                        onClick={() => goToNextStory()}
                        aria-label="Next story"
                    >
                        <ChevronRight size={28} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StoryViewer;
