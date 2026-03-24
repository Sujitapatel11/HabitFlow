const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getGroups, createGroup, joinGroup, leaveGroup, getGroupActivity } = require('../controllers/groupController');

router.get('/', getGroups);
router.post('/',          protect, createGroup);
router.post('/:id/join',  protect, joinGroup);
router.post('/:id/leave', protect, leaveGroup);
router.get('/:id/activity', protect, getGroupActivity);

module.exports = router;
