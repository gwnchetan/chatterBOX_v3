const express = require('express');
const cors = require('cors');
const compression = require('compression');
const ConnectDB = require('./db');
require('dotenv').config();

ConnectDB();

const http = require('http');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);
app.set('io', io);

const PORT = process.env.PORT || 5000;

const path = require('path');

app.use(compression()); // Compress all routes
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./routes/posts.routes');
const userRoutes = require('./routes/user.routes');
// const testRoute = require('./routes/test');
const notificationRoutes = require('./routes/notifs');
const chatRoutes = require('./routes/chat.routes');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
// app.use('/api/test', testRoute); // Mount the test route

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder with caching
  app.use(express.static(path.join(__dirname, '../chatterbox-client/dist'), {
    maxAge: '1d', // Cache static assets for 1 day
    etag: false
  }));

  // Express 5 requires regex or named parameter for wildcards
  app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../chatterbox-client', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Hello from Chatterbox Server! server is running');
  });
}

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
