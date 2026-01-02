const express = require('express');
const cors = require('cors');
const ConnectDB = require('./db');
require('dotenv').config();

ConnectDB();

const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./routes/posts.routes');
const userRoutes = require('./routes/user.routes');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/users', userRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../chatterbox-client/dist')));

  // Express 5 requires regex or named parameter for wildcards
  app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../chatterbox-client', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Hello from Chatterbox Server! server is running');
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
