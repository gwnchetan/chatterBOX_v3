const jwt = require('jsonwebtoken');
const User = require('../models/users');

/**
 * Optional Auth Middleware
 * Checks if a token is present and valid.
 * If valid, populates req.user.
 * If invalid or missing, continues without error (req.user remains undefined).
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // No token, proceed as anonymous
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chatterbox_secret_key_2024');
        const user = await User.findById(decoded.userId || decoded.id);

        if (user) {
            req.user = user;
        }

        next();
    } catch (error) {
        // Token invalid or expired - just proceed as anonymous
        // We don't want to block public access just because of a stale token
        console.log('Optional auth token check failed (proceeding as anon):', error.message);
        next();
    }
};

module.exports = optionalAuthMiddleware;
