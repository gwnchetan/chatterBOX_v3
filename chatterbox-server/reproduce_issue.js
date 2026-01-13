const mongoose = require('mongoose');
const User = require('./models/users');
const Post = require('./models/posts');

// Mock Request/Response
const req = {
    params: { userId: 'USER_ID_PLACEHOLDER' }, // Will replace
    user: { _id: 'USER_ID_PLACEHOLDER' }, // Simulating self-view
    query: { limit: 12 }
};

const res = {
    json: (data) => {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
    },
    status: (code) => {
        console.log('Response Status:', code);
        return res; // Chainable
    }
};

require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Find a user with posts
        const userWithPosts = await User.findOne({ username: 'chetan' }); // Assuming 'chetan' from screenshot
        if (!userWithPosts) {
            console.log('User "chetan" not found, trying to find any user with posts...');
            const post = await Post.findOne();
            if (!post) {
                console.log('No posts in DB at all.');
                process.exit();
            }
            req.params.userId = post.author.toString();
            req.user._id = post.author; // Simulate owner
        } else {
            console.log('Found user:', userWithPosts.username, userWithPosts._id.toString());
            req.params.userId = userWithPosts._id.toString();
            req.user._id = userWithPosts._id;
        }

        console.log(`Testing getUserPosts for user: ${req.params.userId}`);

        // Import Controller
        const userController = require('./controllers/user.controller');

        // Execute
        await userController.getUserPosts(req, res);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
