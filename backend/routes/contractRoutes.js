const express = require('express');
const router = express.Router();
const { createContract, getContracts, getFeed, checkIn, witnessVote, breakContract } = require('../controllers/contractController');
const { protect } = require('../middleware/auth');
const { voteLimiter, postLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../middleware/validate');

router.use(protect);

router.post('/',                validate(schemas.createContract),  createContract);
router.get('/',                                                    getContracts);
router.get('/feed',                                                getFeed);
router.post('/:id/checkin',     postLimiter, validate(schemas.checkIn), checkIn);
router.post('/:id/witness',     voteLimiter, validate(schemas.witnessVote), witnessVote);
router.post('/:id/break',                                          breakContract);

module.exports = router;
