const express = require('express');
const router = express.Router();
const { getGroups, createGroup, joinGroup, leaveGroup } = require('../controllers/groupController');

router.get('/', getGroups);
router.post('/', createGroup);
router.post('/:id/join', joinGroup);
router.post('/:id/leave', leaveGroup);

module.exports = router;
