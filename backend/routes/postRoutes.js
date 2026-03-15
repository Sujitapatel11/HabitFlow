const express = require('express');
const router = express.Router();
const { getPosts, createPost, reactToPost } = require('../controllers/postController');

router.get('/', getPosts);
router.post('/', createPost);
router.post('/:id/react', reactToPost);

module.exports = router;
