require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('./models/posts');

async function createPost() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const userId = '6968f3f9dffd579e03136c25';

        const post = new Post({
            author: userId,
            content: "This is a restored test post to verify the profile page!",
            visibility: 'public',
            media: [],
            isDeleted: false
        });

        await post.save();
        console.log("Dummy post created for user " + userId);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

createPost();
