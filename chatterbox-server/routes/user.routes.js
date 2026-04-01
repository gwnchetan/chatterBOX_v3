const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware'); // Assuming it exists

// All profile routes require authentication
// router.use(authMiddleware); 

// Search (Must be before /:userId)
router.get('/search', authMiddleware, userController.searchUsers);
router.get('/saved', authMiddleware, userController.getSavedPosts); // Get my saved posts
router.get('/following', authMiddleware, userController.getFollowing); // Get users I follow
router.get('/blocked', authMiddleware, userController.getBlockedUsers);

// Save/Unsave actions (Must be before /:userId)
router.post('/save/:postId', authMiddleware, userController.savePost);
router.post('/unsave/:postId', authMiddleware, userController.unsavePost);

// Update profile
router.patch('/profile', authMiddleware, userController.updateProfile);

const optionalAuthMiddleware = require('../middleware/optionalAuth.middleware');

// User Profile & Posts
// Use optionalAuth so we can see public info AND check private access for followers/owners
router.get('/:userId', optionalAuthMiddleware, userController.getUserProfile);
router.get('/:userId/posts', optionalAuthMiddleware, userController.getUserPosts);

// Follow/Unfollow
router.post('/:userId/follow', authMiddleware, userController.followUser);
router.post('/:userId/unfollow', authMiddleware, userController.unfollowUser);
router.post('/:userId/accept', authMiddleware, userController.acceptFollowRequest);
router.post('/:userId/reject', authMiddleware, userController.rejectFollowRequest);
router.post('/:userId/block', authMiddleware, userController.blockUser);
router.post('/:userId/unblock', authMiddleware, userController.unblockUser);

module.exports = router;
