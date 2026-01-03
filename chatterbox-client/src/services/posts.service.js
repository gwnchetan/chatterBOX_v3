import api from './api';

const verifyAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if ((!user && !token) || (!user?.token && !token)) {
        // If neither are present (or if user is present but no token anywhere)
        // Actually, if we have a token, we are effectively authenticated for the API's sake.
        // But we usually want a user object too.
    }

    if (!token && (!user || !user.token)) {
        throw new Error('User not authenticated');
    }
};

export const postsService = {
    createPost: async (postData) => {
        verifyAuth();
        const response = await api.post('/posts', postData);
        return response.data;
    },

    getFeed: async (cursor = null, limit = 10) => {
        verifyAuth();
        let url = `/posts?limit=${limit}`;
        if (cursor) {
            url += `&cursor=${cursor}`;
        }
        const response = await api.get(url);
        return response.data;
    },

    getExplorePosts: async (limit = 20) => {
        verifyAuth();
        const response = await api.get(`/posts/explore?limit=${limit}`);
        return response.data;
    },

    searchPosts: async (query) => {
        verifyAuth();
        const response = await api.get(`/posts/search?q=${query}`);
        return response.data;
    },

    deletePost: async (postId) => {
        verifyAuth();
        const response = await api.delete(`/posts/${postId}`);
        return response.data;
    },

    getUploadSignature: async () => {
        verifyAuth();
        const response = await api.get('/posts/signature');
        return response.data;
    },

    toggleLike: async (postId) => {
        verifyAuth();
        const response = await api.post(`/posts/${postId}/like`);
        return response.data;
    },

    repost: async (postId) => {
        verifyAuth();
        const response = await api.post(`/posts/${postId}/repost`);
        return response.data;
    },

    addComment: async (postId, content) => {
        verifyAuth();
        const response = await api.post(`/posts/${postId}/comment`, { content });
        return response.data;
    },

    getComments: async (postId) => {
        verifyAuth();
        const response = await api.get(`/posts/${postId}/comments`);
        return response.data;
    },

    deleteComment: async (postId, commentId) => {
        verifyAuth();
        const response = await api.delete(`/posts/${postId}/comments/${commentId}`);
        return response.data;
    }
};
