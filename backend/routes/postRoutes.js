const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getPosts, createPost, reactToPost } = require('../controllers/postController');
const { postLimiter, voteLimiter } = require('../middleware/rateLimiter');

router.get('/', getPosts);
router.post('/', protect, postLimiter, createPost);
router.post('/:id/react', protect, voteLimiter, reactToPost);

module.exports = router;
