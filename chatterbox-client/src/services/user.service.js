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
    }
};

export default userService;
