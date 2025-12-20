const User = require("../models/users");
const bcrypt = require("bcrypt");

const registerUser = async (req, res) => {
    try {
        const { username, fullname, email, password } = req.body;

        // 1. Basic validation
        if (!username || !fullname || !email || !password) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        // 2. Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists",
            });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create user
        const newUser = new User({
            username,
            fullname,
            email,
            password: hashedPassword,
        });

        await newUser.save();

        // 5. Send response
        return res.status(201).json({
            message: "User registered successfully",
        });

    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};

const jwt = require('jsonwebtoken');

const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Basic Validation
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // 2. Find User (allow login by email or username)
        const user = await User.findOne({
            $or: [{ email: username }, { username: username }]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3. Check Password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 4. Generate Token
        // Use a default secret if not provided in .env (for dev safety, though .env is better)
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || "default_secret_key",
            { expiresIn: "1d" }
        );

        // 5. Response
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                fullname: user.fullname,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const axios = require('axios');

const googleLogin = async (req, res) => {
    try {
        const { token: accessToken } = req.body;

        // 1. Verify Google Token by fetching user info
        const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const { name, email, sub: googleId } = googleResponse.data;

        // 2. Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // User exists, but might not have googleId linked
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // 3. Create new user if not exists
            const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

            let username = email.split('@')[0];
            const checkUsername = await User.findOne({ username });
            if (checkUsername) {
                username += Math.floor(1000 + Math.random() * 9000);
            }

            user = new User({
                username,
                fullname: name,
                email,
                password: randomPassword,
                googleId
            });
            await user.save();
        }

        // 4. Generate Token
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || "default_secret_key",
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Google login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                fullname: user.fullname,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Google login error:", error.response?.data || error.message);
        res.status(500).json({ message: "Google authentication failed" });
    }
};

module.exports = { registerUser, loginUser, googleLogin };
