import api from './api';

const chatService = {
    // 1. Get List of Conversations
    // GET /api/chat/conversations
    getConversations: async () => {
        const response = await api.get('/chat/conversations');
        return response.data;
    },

    // 2. Get Messages for a specific Conversation
    // GET /api/chat/conversations/:id/messages
    getMessages: async (conversationId, limit = 50, before = null) => {
        const params = { limit };
        if (before) params.before = before;
        const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
        return response.data;
    },

    // 3. Initiate or Get Conversation (by Target User ID)
    // POST /api/chat/conversation
    initiateConversation: async (targetUserId) => {
        const response = await api.post('/chat/conversation', { targetUserId });
        return response.data;
    },

    // 4. Send Message
    // POST /api/chat/messages
    sendMessage: async (conversationId, text) => {
        const response = await api.post('/chat/messages', {
            conversationId,
            content: { text } // Only text supported for now
        });
        return response.data;
    },

    // 5. Mark as Read
    // PUT /api/chat/conversations/:id/read
    markAsRead: async (conversationId) => {
        const response = await api.put(`/chat/conversations/${conversationId}/read`);
        return response.data;
    }
};

export default chatService;
