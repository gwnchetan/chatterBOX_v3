import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.MODE === 'production' ? '/' : 'http://localhost:5000';

class SocketService {
    socket = null;

    connect() {
        if (this.socket) return; // Already connected

        const token = localStorage.getItem('token');
        if (!token) return;

        this.socket = io(SOCKET_URL, {
            auth: { token },
            query: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinPost(postId) {
        if (this.socket && postId) {
            this.socket.emit('join_post', postId);
        }
    }

    leavePost(postId) {
        if (this.socket && postId) {
            this.socket.emit('leave_post', postId);
        }
    }

    joinUser(userId) {
        if (this.socket && userId) {
            this.socket.emit('join_user', userId);
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }
}

export const socketService = new SocketService();
