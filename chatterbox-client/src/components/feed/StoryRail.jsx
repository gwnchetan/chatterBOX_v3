import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { Plus } from '../common/Icons';
import userService from '../../services/user.service';

const INLINE_STORY_BREAKPOINT = 1300;

const getLatestStory = (storyOwner) => (
    Array.isArray(storyOwner?.stories) && storyOwner.stories.length > 0
        ? storyOwner.stories[storyOwner.stories.length - 1]
        : null
);

const hasViewedStory = (story, viewerId) => (
    Array.isArray(story?.views)
        ? story.views.some((viewId) => String(viewId) === String(viewerId))
        : false
);

const hasUnseenStories = (storyOwner, viewerId) => (
    Array.isArray(storyOwner?.stories)
        ? storyOwner.stories.some((story) => !hasViewedStory(story, viewerId))
        : false
);

const StoryRail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const currentUserId = currentUser?._id || currentUser?.id || null;
    const [showInlineRail, setShowInlineRail] = useState(() => (
        typeof window === 'undefined' ? false : window.innerWidth <= INLINE_STORY_BREAKPOINT
    ));

    useEffect(() => {
        const handleResize = () => {
            setShowInlineRail(window.innerWidth <= INLINE_STORY_BREAKPOINT);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { data: storyFeed = [] } = useQuery({
        queryKey: ['storyFeed'],
        queryFn: userService.getStoryFeed,
        enabled: showInlineRail,
        staleTime: 1000 * 60 * 5
    });

    const { data: ownStories = null } = useQuery({
        queryKey: ['userStories', currentUserId],
        queryFn: () => userService.getUserStories(currentUserId),
        enabled: showInlineRail && !!currentUserId,
        staleTime: 1000 * 60 * 5
    });

    if (!showInlineRail) {
        return null;
    }

    const openStoryViewer = (targetUserId, options = {}) => {
        navigate(`/stories/${String(targetUserId)}`, {
            state: {
                from: location.pathname,
                ...options
            }
        });
    };

    const handleOwnStoryClick = () => {
        if (!currentUserId) {
            return;
        }

        if (ownStories?.stories?.length) {
            openStoryViewer(currentUserId, { startFromLatest: true });
            return;
        }

        navigate('/create');
    };

    return (
        <section className="stories-wrapper-minimal" aria-label="Stories">
            <div className="stories-track">
                <button type="button" className="story-item-minimal" onClick={handleOwnStoryClick}>
                    {ownStories?.stories?.length ? (
                        <div className={`story-ring ${hasUnseenStories(ownStories, currentUserId) ? 'unseen' : 'seen'}`}>
                            <Avatar src={currentUser?.avatar} size="md" alt="You" />
                        </div>
                    ) : (
                        <div className="story-ring-add">
                            <Plus size={18} />
                        </div>
                    )}
                    <span className="story-username-minimal">
                        {ownStories?.stories?.length ? 'Your story' : 'Add story'}
                    </span>
                </button>

                {storyFeed.map((storyUser) => {
                    const latestStory = getLatestStory(storyUser);
                    if (!latestStory) {
                        return null;
                    }

                    return (
                        <button
                            key={String(storyUser.userId)}
                            type="button"
                            className="story-item-minimal"
                            onClick={() => openStoryViewer(storyUser.userId)}
                        >
                            <div className={`story-ring ${hasUnseenStories(storyUser, currentUserId) ? 'unseen' : 'seen'}`}>
                                <Avatar src={storyUser.avatar} size="md" alt={storyUser.fullname || storyUser.username} />
                            </div>
                            <span className="story-username-minimal">{storyUser.username}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default StoryRail;
