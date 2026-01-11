const mongoose = require('mongoose');
const User = require('./models/users');
require('dotenv').config();

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const user = await User.findOne({ username: 'csakre634' });
        if (!user) { console.log('User csakre634 not found'); }
        else {
            console.log('User found:', user.username);
            console.log('isPrivate:', user.isPrivate);
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkUser();
