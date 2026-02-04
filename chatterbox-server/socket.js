const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Auth Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (token) {
            // Remove 'Bearer ' if present
            const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

            jwt.verify(tokenString, process.env.JWT_SECRET, (err, decoded) => {
                if (err) return next(new Error('Authentication error'));
                socket.user = decoded;
                next();
            });
        } else {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        // console.log(`User connected: ${socket.user?.id}`);

        // Join specific post room (post:{postId})
        socket.on('join_post', (postId) => {
            if (postId) {
                const roomName = `post:${postId}`;
                socket.join(roomName);
            }
        });

        // Join specific user room (user:{userId}) - For notifications
        socket.on('join_user', (userId) => {
            // Allow joining only own room for privacy, or allow if logic permits
            // socket.user is populated from token.
            // We trust the token user ID.
            if (userId && (socket.user.id === userId || socket.user._id === userId)) {
                socket.join(`user:${userId}`);
            }
        });

        // Leave specific post room
        socket.on('leave_post', (postId) => {
            if (postId) {
                const roomName = `post:${postId}`;
                socket.leave(roomName);
            }
        });

        // Join specific chat room (chat:{conversationId})
        socket.on('join_chat', (conversationId) => {
            if (conversationId) {
                const roomName = `chat:${conversationId}`;
                socket.join(roomName);
                // console.log(`User ${socket.user.id} joined chat ${roomName}`);
            }
        });

        // Leave specific chat room
        socket.on('leave_chat', (conversationId) => {
            if (conversationId) {
                const roomName = `chat:${conversationId}`;
                socket.leave(roomName);
            }
        });

        socket.on('disconnect', () => {
            // console.log('User disconnected');
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initSocket, getIo };
