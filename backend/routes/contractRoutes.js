const express = require('express');
const router = express.Router();
const { createContract, getContracts, getFeed, checkIn, witnessVote, breakContract } = require('../controllers/contractController');

router.get('/', getContracts);
router.get('/feed', getFeed);
router.post('/', createContract);
router.post('/:id/checkin', checkIn);
router.post('/:id/witness', witnessVote);
router.post('/:id/break', breakContract);

module.exports = router;
