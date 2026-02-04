require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/users');
const Post = require('./models/posts');

async function debugPosts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for debugging.");

        // 1. List all users to find the correct ID and see if we match
        const users = await User.find({}).limit(5);
        console.log("\n--- First 5 Users ---");
        users.forEach(u => console.log(`${u.username} (${u._id}) - Posts: ${u.stats?.posts || '?'}`));

        // 2. Count total posts in DB
        const totalPosts = await Post.countDocuments({});
        console.log(`\nTotal Posts in DB: ${totalPosts}`);

        // 3. Look for posts that might be "hidden" (deleted)
        const deletedPosts = await Post.countDocuments({ isDeleted: true });
        console.log(`Deleted Posts in DB: ${deletedPosts}`);
        // List ALL posts
        console.log("\n--- Listing ALL Posts in DB ---");
        const allPosts = await Post.find({});
        if (allPosts.length === 0) {
            console.log("No posts found in the entire database.");
        } else {
            console.log(`Found ${allPosts.length} total posts.`);
            allPosts.forEach(p => {
                console.log(`- Post ${p._id} by Author: ${p.author} (Deleted: ${p.isDeleted})`);
            });
        }

        if (true) {
            const searchId = '6968f3f9dffd579e03136c25';
            console.log(`\n--- Checking Posts for Target User: ${searchId} ---`);

            const posts = await Post.find({ author: searchId });
            console.log(`Found ${posts.length} raw posts for this user.`);

            posts.forEach(p => {
                console.log(`Post ${p._id}: isDeleted=${p.isDeleted}, visibility=${p.visibility}`);
            });
        }

    } catch (error) {
        console.error("Debug Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

debugPosts();
