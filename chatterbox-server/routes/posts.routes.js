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

// Interactions
router.post('/:id/like', postsController.toggleLike);
router.post('/:id/repost', postsController.repost);
router.post('/:id/comment', postsController.addComment);
router.post('/:postId/comments/:commentId/reply', postsController.addReply);
router.post('/:postId/comments/:commentId/like', postsController.toggleCommentLike);
router.get('/:id/comments', postsController.getComments);
router.delete('/:postId/comments/:commentId', postsController.deleteComment);

module.exports = router;
