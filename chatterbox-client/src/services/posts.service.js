import api from './api';
import { getAuthSession } from '../utils/authStorage';

const verifyAuth = () => {
    const { isAuthenticated } = getAuthSession();
    if (!isAuthenticated) {
        throw new Error('User not authenticated');
    }
};

export const postsService = {
    createPost: async (postData) => {
        verifyAuth();
        const response = await api.post('/posts', postData);
        return response.data;
    },

    getFeed: async ({ cursor = null, limit = 10, section = 'friends' } = {}) => {
        verifyAuth();
        let url = `/posts?limit=${limit}&section=${section}`;
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

    addReply: async (postId, commentId, content) => {
        verifyAuth();
        const response = await api.post(`/posts/${postId}/comments/${commentId}/reply`, { content });
        return response.data;
    },

    getComments: async (postId) => {
        verifyAuth();
        const response = await api.get(`/posts/${postId}/comments`);
        return response.data;
    },

    toggleCommentLike: async (postId, commentId) => {
        verifyAuth();
        const response = await api.post(`/posts/${postId}/comments/${commentId}/like`);
        return response.data;
    },

    deleteComment: async (postId, commentId) => {
        verifyAuth();
        const response = await api.delete(`/posts/${postId}/comments/${commentId}`);
        return response.data;
    }
};
