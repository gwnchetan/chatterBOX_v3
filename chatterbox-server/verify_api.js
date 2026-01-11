const axios = require('axios');

const verifyPrivacy = async () => {
    try {
        // 1. Login as Alice
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'alice1@example.com',
            password: 'password123'
        });

        const token = loginRes.data.token;
        console.log('Logged in as Alice. Token obtained.');

        // 2. Fetch Feed
        const feedRes = await axios.get('http://localhost:5000/api/posts', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const posts = feedRes.data.posts;
        console.log(`Fetched ${posts.length} posts.`);
        // console.log('Debug Info:', JSON.stringify(feedRes.data.debug, null, 2));
        const debug = feedRes.data.debug || {};
        console.log(`DEBUG VERSION: ${debug.version}`);
        console.log(`DEBUG HiddenCount: ${debug.privateUsersHiddenCount}`);

        // 3. Check for Chetan (username: 'chetan' or 'csakre634')
        const privatePosts = posts.filter(p => p.author.username === 'chetan' || p.author.username === 'csakre634');

        if (privatePosts.length > 0) {
            console.log(`FAIL: Found ${privatePosts.length} private posts.`);
            privatePosts.forEach(p => {
                console.log('--- LEAKED POST ---');
                console.log(`Author: ${p.author.username} (id: ${p.author._id})`);
                console.log(`isPrivate: ${p.author.isPrivate}`);
                console.log(`RepostOf: ${p.repostOf ? 'YES' : 'NO'}`);
                if (p.repostOf) {
                    console.log(`Original Author: ${p.repostOf.author ? p.repostOf.author.username : 'Unknown'}`);
                    console.log(`Original isPrivate: ${p.repostOf.author ? p.repostOf.author.isPrivate : 'Unknown'}`);
                }
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
};

verifyPrivacy();
