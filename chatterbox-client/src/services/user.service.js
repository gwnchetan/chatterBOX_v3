import api from './api';

const userService = {
    /**
     * Fetch user profile and stats
     */
    getProfile: async (userId) => {
        const response = await api.get(`/users/${userId}`);
        return response.data;
    },

    getFollowing: async () => {
        const response = await api.get('/users/following');
        return response.data;
    },

    getBlockedUsers: async () => {
        const response = await api.get('/users/blocked');
        return response.data;
    },

    /**
     * Fetch all posts by a specific user
     */
    getUserPosts: async (userId, cursor = null) => {
        let url = `/users/${userId}/posts?limit=12`;
        if (cursor) {
            url += `&cursor=${cursor}`;
        }
        const response = await api.get(url);
        return response.data;
    },

    /**
     * Update user profile (Future proofing)
     */
    updateProfile: async (profileData) => {
        const response = await api.patch('/users/profile', profileData);
        return response.data;
    },

    searchUsers: async (query) => {
        const response = await api.get(`/users/search?q=${query}`);
        return response.data;
    },

    followUser: async (userId) => {
        const response = await api.post(`/users/${userId}/follow`);
        return response.data;
    },

    unfollowUser: async (userId) => {
        const response = await api.post(`/users/${userId}/unfollow`);
        return response.data;
    },

    acceptFollowRequest: async (userId) => {
        const response = await api.post(`/users/${userId}/accept`);
        return response.data;
    },

    rejectFollowRequest: async (userId) => {
        const response = await api.post(`/users/${userId}/reject`);
        return response.data;
    },

    blockUser: async (userId) => {
        const response = await api.post(`/users/${userId}/block`);
        return response.data;
    },

    unblockUser: async (userId) => {
        const response = await api.post(`/users/${userId}/unblock`);
        return response.data;
    },

    savePost: async (postId) => {
        const response = await api.post(`/users/save/${postId}`);
        return response.data;
    },

    unsavePost: async (postId) => {
        const response = await api.post(`/users/unsave/${postId}`);
        return response.data;
    },

    getSavedPosts: async () => {
        const response = await api.get('/users/saved');
        return response.data;
    },

    getStoryFeed: async () => {
        const response = await api.get('/users/story/feed');
        return response.data;
    },

    getUserStories: async (userId) => {
        const response = await api.get(`/users/story/${userId}`);
        return response.data;
    },

    uploadStory: async (mediaUrl, mediaType, caption) => {
        const response = await api.post('/users/story', { mediaUrl, mediaType, caption });
        return response.data;
    },

    deleteStory: async (storyId) => {
        const response = await api.delete(`/users/story/${storyId}`);
        return response.data;
    },

    viewStory: async (userId, storyId) => {
        const response = await api.post(`/users/story/${userId}/${storyId}/view`);
        return response.data;
    }
};

export default userService;
