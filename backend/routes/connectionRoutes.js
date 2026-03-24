const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendRequest, getPending, acceptRequest,
  rejectRequest, getMyConnections, getStatus,
} = require('../controllers/connectionController');

// All connection routes require authentication
router.use(protect);

router.post('/request',        sendRequest);
router.get('/pending',         getPending);
router.post('/accept',         acceptRequest);
router.post('/reject',         rejectRequest);
router.get('/my-connections',  getMyConnections);
router.get('/status',          getStatus);

module.exports = router;
