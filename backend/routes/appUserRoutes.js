const express = require('express');
const router = express.Router();
const { getAllUsers, getSimilarUsers, syncStreak, updateUser } = require('../controllers/appUserController');
const { protect, requireOwner } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(protect);

router.get('/',                                                    getAllUsers);
router.get('/similar',                                             getSimilarUsers);
router.patch('/:userId/streak',  requireOwner('userId'),           syncStreak);
router.put('/:userId',           requireOwner('userId'), validate(schemas.updateProfile), updateUser);

module.exports = router;
