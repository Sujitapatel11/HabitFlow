const express = require('express');
const router = express.Router();
const { getReflection } = require('../controllers/reflectionController');

router.get('/', getReflection);

module.exports = router;
