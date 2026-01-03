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

        // Leave specific post room
        socket.on('leave_post', (postId) => {
            if (postId) {
                const roomName = `post:${postId}`;
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
