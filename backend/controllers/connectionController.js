const Connection = require('../models/Connection');
const AppUser = require('../models/AppUser');

/** POST /api/connections/request */
const sendRequest = async (req, res, next) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId)
      return res.status(400).json({ success: false, message: 'senderId and receiverId required' });

    if (senderId === receiverId)
      return res.status(400).json({ success: false, message: 'Cannot connect with yourself' });

    // Check if connection already exists
    const existing = await Connection.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existing)
      return res.status(400).json({ success: false, message: 'Connection already exists', status: existing.status });

    const connection = await Connection.create({ senderId, receiverId });
    res.status(201).json({ success: true, data: connection });
  } catch (err) { next(err); }
};

/** GET /api/connections/pending?userId=xxx */
const getPending = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const pending = await Connection.find({ receiverId: userId, status: 'pending' })
      .populate('senderId', 'name goalCategory streak');
    res.json({ success: true, data: pending });
  } catch (err) { next(err); }
};

/** POST /api/connections/accept */
const acceptRequest = async (req, res, next) => {
  try {
    const { connectionId } = req.body;
    const connection = await Connection.findByIdAndUpdate(
      connectionId,
      { status: 'accepted' },
      { new: true }
    ).populate('senderId', 'name goalCategory streak');

    if (!connection)
      return res.status(404).json({ success: false, message: 'Connection not found' });

    res.json({ success: true, data: connection });
  } catch (err) { next(err); }
};

/** POST /api/connections/reject */
const rejectRequest = async (req, res, next) => {
  try {
    const { connectionId } = req.body;
    await Connection.findByIdAndUpdate(connectionId, { status: 'rejected' });
    res.json({ success: true, message: 'Request rejected' });
  } catch (err) { next(err); }
};

/** GET /api/connections/my-connections?userId=xxx */
const getMyConnections = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const connections = await Connection.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: 'accepted',
    })
      .populate('senderId', 'name goalCategory streak')
      .populate('receiverId', 'name goalCategory streak');

    // Return the "other" person in each connection
    const people = connections.map(c => {
      const other = c.senderId._id.toString() === userId ? c.receiverId : c.senderId;
      return { connectionId: c._id, user: other };
    });

    res.json({ success: true, data: people });
  } catch (err) { next(err); }
};

/** GET /api/connections/status?senderId=x&receiverId=y */
const getStatus = async (req, res, next) => {
  try {
    const { senderId, receiverId } = req.query;
    const connection = await Connection.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });
    res.json({ success: true, status: connection?.status || 'none', connectionId: connection?._id });
  } catch (err) { next(err); }
};

module.exports = { sendRequest, getPending, acceptRequest, rejectRequest, getMyConnections, getStatus };
