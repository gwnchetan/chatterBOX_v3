import { io } from 'socket.io-client';
import { getAuthSession } from '../utils/authStorage';

const SOCKET_URL = import.meta.env.MODE === 'production' ? '/' : 'http://localhost:5000';

class SocketService {
    constructor() {
        this._socket = null;
        this._token = null;
        this._userId = null;
    }

    setAuthSession({ token, userId }) {
        this._token = token || null;
        this._userId = userId || null;

        if (!this._token || !this._userId) {
            this.disconnect();
            return null;
        }

        if (this._socket) {
            return this._socket;
        }

        return this.connect();
    }

    restoreSession() {
        const { token, userId } = getAuthSession();

        if (!token || !userId) {
            this.clearAuthSession();
            return null;
        }

        return this.setAuthSession({ token, userId });
    }

    clearAuthSession() {
        this._token = null;
        this._userId = null;
        this.disconnect();
    }

    connect() {
        if (!this._token || !this._userId) {
            return null;
        }

        if (this._socket) {
            return this._socket;
        }

        const socket = io(SOCKET_URL, {
            auth: { token: this._token },
            query: { token: this._token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            this.joinUser(this._userId);
        });

        this._socket = socket;
        return socket;
    }

    disconnect() {
        if (this._socket) {
            this._socket.disconnect();
            this._socket = null;
        }
    }

    get socket() {
        return this._socket;
    }

    get isConnected() {
        return !!this._socket?.connected;
    }

    joinPost(postId) {
        if (this._socket && postId) {
            this._socket.emit('join_post', postId);
        }
    }

    leavePost(postId) {
        if (this._socket && postId) {
            this._socket.emit('leave_post', postId);
        }
    }

    joinUser(userId = this._userId) {
        if (this._socket && userId) {
            this._socket.emit('join_user', userId);
        }
    }

    joinChat(conversationId) {
        if (this._socket && conversationId) {
            this._socket.emit('join_chat', conversationId);
        }
    }

    leaveChat(conversationId) {
        if (this._socket && conversationId) {
            this._socket.emit('leave_chat', conversationId);
        }
    }

    on(event, callback) {
        if (this._socket) {
            this._socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this._socket) {
            this._socket.off(event, callback);
        }
    }
}

export const socketService = new SocketService();
