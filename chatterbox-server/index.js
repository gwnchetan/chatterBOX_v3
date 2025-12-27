const express = require('express');
const cors = require('cors');
const ConnectDB = require('./db');
require('dotenv').config();

ConnectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./routes/posts.routes');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);

app.get('/', (req, res) => {
  res.send('Hello from Chatterbox Server! server is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
