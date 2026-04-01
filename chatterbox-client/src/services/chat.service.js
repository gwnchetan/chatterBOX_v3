import api from './api';

const chatService = {
    /**
     * Get all conversations for the current user
     * @param {string} type - 'inbox' | 'requests' | 'sent'
     */
    getConversations: async (type = 'inbox') => {
        const response = await api.get(`/chat/conversations?type=${type}`);
        return response.data;
    },

    /**
     * Get or create a conversation with a specific user
     * @param {string} targetUserId 
     */
    initiateConversation: async (targetUserId) => {
        const response = await api.post('/chat/conversation', { targetUserId });
        return response.data;
    },

    /**
     * Send a message to a conversation
     * @param {string} conversationId 
     * @param {object} content - { text: string, media?: string[] }
     */
    sendMessage: async (conversationId, content) => {
        const response = await api.post('/chat/messages', { conversationId, content });
        return response.data;
    },

    /**
     * Get messages for a conversation with pagination
     * @param {string} conversationId 
     * @param {string} beforeTimestamp - For pagination
     */
    getMessages: async (conversationId, beforeTimestamp = null) => {
        let url = `/chat/conversations/${conversationId}/messages`;
        if (beforeTimestamp) {
            url += `?before=${beforeTimestamp}`;
        }
        const response = await api.get(url);
        return response.data;
    },

    /**
     * Mark conversation as read
     * @param {string} conversationId 
     */
    markAsRead: async (conversationId) => {
        const response = await api.put(`/chat/conversations/${conversationId}/read`);
        return response.data;
    },

    acceptRequest: async (conversationId) => {
        const response = await api.post(`/chat/request/${conversationId}/accept`);
        return response.data;
    },

    rejectRequest: async (conversationId) => {
        const response = await api.post(`/chat/request/${conversationId}/reject`);
        return response.data;
    }
};

export default chatService;
