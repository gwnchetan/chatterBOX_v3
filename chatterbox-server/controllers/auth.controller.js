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
        const { email, password } = req.body;

        // 1. Basic Validation
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // 2. Find User by email
        const user = await User.findOne({ email });

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
            process.env.JWT_SECRET || "chatterbox_secret_key_2024",
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
                email: user.email,
                avatar: user.avatar
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

        console.log("Google UserInfo Response:", googleResponse.data);

        const { name, email, sub: googleId, picture } = googleResponse.data;

        if (!email) {
            return res.status(400).json({ message: "Google account does not have a verified email." });
        }

        // 2. Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            if (!user.googleId) {
                user.googleId = googleId;
            }
            // Always sync avatar from Google to ensure it's up to date
            if (picture) {
                user.avatar = picture;
            }
            await user.save();
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
                avatar: picture, // Save Google Picture
                password: randomPassword,
                googleId
            });
            await user.save();
        }

        // 4. Generate Token
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || "chatterbox_secret_key_2024",
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Google login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                fullname: user.fullname,
                email: user.email,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error("Google login error:", error.response?.data || error.message);
        res.status(500).json({ message: "Google authentication failed" });
    }
};

const facebookLogin = async (req, res) => {
    try {
        const { accessToken, userID } = req.body;

        // 1. Strict Input Validation
        if (!accessToken || !userID) {
            return res.status(400).json({ message: "Invalid Facebook credentials" });
        }

        // 2. Verify Token with Facebook Graph API
        // CRITICAL: We fetch the ID from Facebook to ensure the token actually belongs to the claimed userID
        const facebookResponse = await axios.get(`https://graph.facebook.com/me`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,email,picture'
            }
        });

        const { id: graphId, name, email, picture } = facebookResponse.data;

        // 3. Security Check: Token Owner Mismatch
        if (graphId !== userID) {
            return res.status(401).json({ message: "Identity verification failed" });
        }

        // 4. Find or Create User (Safe Account Linking)

        // Step A: Search by facebookId
        let user = await User.findOne({ facebookId: graphId });

        if (user) {
            // User found via Facebook ID - Login proceed
        } else {
            // Step B: Search by Email (if exists)
            if (email) {
                user = await User.findOne({ email });

                if (user) {
                    // User exists by email. Check if they already have a DIFFERENT facebookId linked?
                    // Since facebookId is unique and sparse, if user.facebookId was set, we would have found them in Step A.
                    // BUT, we should check if they have a facebookId just in case of race/logic weirdness, 
                    // though theoretically user.facebookId should be undefined here if Step A failed.

                    if (user.facebookId) {
                        // This technically shouldn't happen if Step A failed, but good for sanity.
                        // It implies the email matches but the ID doesn't? That would mean two FB accounts with same email?
                        // Or database inconsistency. We'll play safe.
                        return res.status(409).json({ message: "Account conflict detected" });
                    }

                    // Strict Linking: Only link if we are sure.
                    user.facebookId = graphId;
                    await user.save();
                }
            }

            // Step C: Create New User if still not found
            if (!user) {
                // Generate random password for safety
                const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8) + Date.now(), 10);

                // Handle username collisions
                let username = email ? email.split('@')[0] : `user_${graphId}`;
                let checkUsername = await User.findOne({ username });
                if (checkUsername) {
                    username += Math.floor(1000 + Math.random() * 9000);
                }

                user = new User({
                    username,
                    fullname: name,
                    email: email || "", // Email might be missing from FB if permission denied or by phone
                    password: randomPassword,
                    facebookId: graphId
                });
                await user.save();
            }
        }

        // 5. Generate Internal JWT
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || "chatterbox_secret_key_2024",
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Facebook login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                fullname: user.fullname,
                email: user.email,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error("Facebook login error:", error.response?.data || error.message);
        res.status(500).json({ message: "Facebook authentication failed" });
    }
};

module.exports = { registerUser, loginUser, googleLogin, facebookLogin };
