import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { postsService } from '../services/posts.service';
import { socketService } from '../services/socket.service';
import userService from '../services/user.service';
import { useToast } from '../components/Toast';

const FeedContext = createContext();

export const useFeed = () => {
    const context = useContext(FeedContext);
    if (!context) {
        throw new Error("useFeed must be used within a FeedProvider");
    }
    return context;
};

export const FeedProvider = ({ children }) => {
    // We use a Map to store posts by ID to ensure consistency across different views (Feed, Explore, Profile)
    // However, React state needs to be an object/array to trigger re-renders.
    // We'll use a standard object: { [id]: postData }
    const [posts, setPosts] = useState({});
    const toast = useToast();

    // Init Socket
    useEffect(() => {
        socketService.connect();

        const handleLikeUpdate = ({ postId, likesCount }) => {
            setPosts(prev => {
                const post = prev[postId];
                if (!post) return prev;
                if (post.likeCount === likesCount) return prev;
                return { ...prev, [postId]: { ...post, likeCount: likesCount } };
            });
        };

        const handleCommentUpdate = ({ postId, commentCount }) => {
            setPosts(prev => {
                const post = prev[postId];
                if (!post) return prev;
                if (post.commentCount === commentCount) return prev;
                return { ...prev, [postId]: { ...post, commentCount: commentCount } };
            });
        };

        socketService.on('post:like:update', handleLikeUpdate);
        socketService.on('post:comment:update', handleCommentUpdate);

        return () => {
            socketService.off('post:like:update', handleLikeUpdate);
            socketService.off('post:comment:update', handleCommentUpdate);
        };
    }, []);

    // Helper to merge new posts into the store
    const mergePosts = useCallback((newPosts) => {
        setPosts(prev => {
            const next = { ...prev };
            newPosts.forEach(p => {
                next[p._id] = p;
            });
            return next;
        });
    }, []);

    // Action: Toggle Like
    const toggleLike = useCallback(async (postId) => {
        // Optimistic Update
        setPosts(prev => {
            const post = prev[postId];
            if (!post) return prev;

            const wasLiked = post.liked;
            return {
                ...prev,
                [postId]: {
                    ...post,
                    liked: !wasLiked,
                    likeCount: wasLiked ? post.likeCount - 1 : post.likeCount + 1
                }
            };
        });

        try {
            await postsService.toggleLike(postId);
        } catch (error) {
            console.error("Like failed", error);
            // Revert
            setPosts(prev => {
                const post = prev[postId];
                if (!post) return prev;
                const isLikedNow = post.liked; // This is the wrong state (the optimistic one)
                // We want to revert to !isLikedNow
                return {
                    ...prev,
                    [postId]: {
                        ...post,
                        liked: !isLikedNow,
                        likeCount: isLikedNow ? post.likeCount - 1 : post.likeCount + 1
                    }
                };
            });
            toast.error("Action failed");
        }
    }, [toast]);

    // Action: Repost
    const toggleRepost = useCallback(async (postId) => {
        setPosts(prev => {
            const post = prev[postId];
            if (!post) return prev;

            const wasReposted = post.reposted;
            return {
                ...prev,
                [postId]: {
                    ...post,
                    reposted: !wasReposted,
                    repostCount: wasReposted ? post.repostCount - 1 : post.repostCount + 1
                }
            };
        });

        try {
            await postsService.repost(postId);
            toast.success("Repost updated");
        } catch (error) {
            console.error("Repost failed", error);
            setPosts(prev => {
                const post = prev[postId];
                if (!post) return prev;
                const isRepostedNow = post.reposted;
                return {
                    ...prev,
                    [postId]: {
                        ...post,
                        reposted: !isRepostedNow,
                        repostCount: isRepostedNow ? post.repostCount - 1 : post.repostCount + 1
                    }
                };
            });
            toast.error("Action failed");
        }
    }, [toast]);

    // Action: Save
    const toggleSave = useCallback(async (postId) => {
        setPosts(prev => {
            const post = prev[postId];
            if (!post) return prev;
            return {
                ...prev,
                [postId]: { ...post, saved: !post.saved }
            };
        });

        try {
            const post = posts[postId]; // Note: accessing state in closure might be stale, but here we just need ID
            // Ideally we need current state logic, but toggling is simple.
            // Wait, we need to know if we are saving or unsaving.
            // We can determine this by checking the PREVIOUS state which we just flipped.
            // But we can't access the state we just set immediately.
            // Better: use the 'post' object we have in scope if we pass it, OR check the state inside setPosts but we can't await there.
            // CORRECT APPROACH: Determine intent BEFORE setting state.
        } catch (error) {
            // handled below in corrected version
        }
    }, [posts]); // relying on posts dependency might cause frequent re-creations, but basic logic needs fix.

    // Corrected Toggle Save
    const handleSave = useCallback(async (postId) => {
        let intention = 'save';
        setPosts(prev => {
            const post = prev[postId];
            if (!post) return prev;
            intention = post.saved ? 'unsave' : 'save';

            return {
                ...prev,
                [postId]: { ...post, saved: !post.saved }
            };
        });

        try {
            if (intention === 'save') {
                await userService.savePost(postId);
            } else {
                await userService.unsavePost(postId);
            }
            // Update User in localStorage to persist 'savedPosts' arrays if needed for profile
            // But here we just track the boolean flag on the post.
        } catch (error) {
            console.error("Save failed", error);
            setPosts(prev => {
                const post = prev[postId];
                if (!post) return prev;
                return { ...prev, [postId]: { ...post, saved: !post.saved } }; // Revert
            });
            toast.error("Failed to save");
        }
    }, []);

    const getPost = (postId) => posts[postId];

    return (
        <FeedContext.Provider value={{
            posts,
            mergePosts,
            toggleLike,
            toggleRepost,
            toggleSave: handleSave,
            getPost
        }}>
            {children}
        </FeedContext.Provider>
    );
};
