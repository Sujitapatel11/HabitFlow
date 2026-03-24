const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getReflection } = require('../controllers/reflectionController');

// Reflection requires auth — userId comes from JWT, not query param
router.get('/', protect, getReflection);

module.exports = router;
