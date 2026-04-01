const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use((socket, next) => {
        const rawToken = socket.handshake.auth.token || socket.handshake.query.token;
        if (!rawToken) {
            return next(new Error('Authentication error'));
        }

        const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
        jwt.verify(token, process.env.JWT_SECRET || 'chatterbox_secret_key_2024', (error, decoded) => {
            if (error) {
                return next(new Error('Authentication error'));
            }

            socket.user = decoded;
            return next();
        });
    });

    io.on('connection', (socket) => {
        const currentUserId = socket.user.id || socket.user._id;
        if (currentUserId) {
            socket.join(`user:${currentUserId}`);
            socket.emit('user:joined', { userId: currentUserId, room: `user:${currentUserId}` });
        }

        socket.on('join_post', (postId) => {
            if (postId) {
                socket.join(`post:${postId}`);
            }
        });

        socket.on('leave_post', (postId) => {
            if (postId) {
                socket.leave(`post:${postId}`);
            }
        });

        socket.on('join_user', (userId) => {
            if (!userId || !currentUserId) return;
            if (currentUserId.toString() !== userId.toString()) return;
            socket.join(`user:${userId}`);
            socket.emit('user:joined', { userId, room: `user:${userId}` });
        });

        socket.on('join_chat', (conversationId) => {
            if (conversationId) {
                socket.join(`chat:${conversationId}`);
            }
        });

        socket.on('leave_chat', (conversationId) => {
            if (conversationId) {
                socket.leave(`chat:${conversationId}`);
            }
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }

    return io;
};

module.exports = { initSocket, getIo };
