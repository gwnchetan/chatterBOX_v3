const express = require('express');
const router = express.Router();
const postsController = require('../controllers/posts.controller');
const authMiddleware = require('../middleware/auth.middleware'); // Assuming this exists

// Apply auth middleware to all routes
router.use(authMiddleware);

// Note: Specific paths first!
router.get('/signature', postsController.getUploadSignature);
router.get('/explore', postsController.getExploreFeed);
router.get('/search', postsController.searchPosts);
router.post('/', postsController.createPost);
router.get('/', postsController.getFeed);
router.delete('/:id', postsController.deletePost);

module.exports = router;
