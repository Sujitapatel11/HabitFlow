const Connection = require('../models/Connection');
const AppUser    = require('../models/AppUser');

/** POST /api/connections/request */
const sendRequest = async (req, res, next) => {
  try {
    const senderId   = req.user.sub;           // always from JWT — never trust client
    const { receiverId } = req.body;

    if (!receiverId)
      return res.status(400).json({ success: false, message: 'receiverId required' });

    if (senderId === receiverId)
      return res.status(400).json({ success: false, message: 'Cannot connect with yourself' });

    // Verify receiver exists
    const receiver = await AppUser.findById(receiverId).lean();
    if (!receiver)
      return res.status(404).json({ success: false, message: 'User not found' });

    const existing = await Connection.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existing) {
      if (existing.status === 'rejected') {
        existing.status     = 'pending';
        existing.senderId   = senderId;
        existing.receiverId = receiverId;
        await existing.save();
        return res.status(201).json({ success: true, data: existing });
      }
      return res.status(400).json({ success: false, message: 'Connection already exists', status: existing.status });
    }

    const connection = await Connection.create({ senderId, receiverId });
    res.status(201).json({ success: true, data: connection });
  } catch (err) { next(err); }
};

/** GET /api/connections/pending */
const getPending = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const pending = await Connection.find({ receiverId: userId, status: 'pending' })
      .populate('senderId', 'name goalCategory streak avatar');
    res.json({ success: true, data: pending });
  } catch (err) { next(err); }
};

/** POST /api/connections/accept */
const acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { connectionId } = req.body;

    const connection = await Connection.findOne({ _id: connectionId, receiverId: userId });
    if (!connection)
      return res.status(404).json({ success: false, message: 'Connection not found' });

    connection.status = 'accepted';
    await connection.save();

    await connection.populate('senderId', 'name goalCategory streak avatar');
    res.json({ success: true, data: connection });
  } catch (err) { next(err); }
};

/** POST /api/connections/reject */
const rejectRequest = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { connectionId } = req.body;

    const connection = await Connection.findOne({ _id: connectionId, receiverId: userId });
    if (!connection)
      return res.status(404).json({ success: false, message: 'Connection not found' });

    connection.status = 'rejected';
    await connection.save();
    res.json({ success: true, message: 'Request rejected' });
  } catch (err) { next(err); }
};

/** GET /api/connections/my-connections */
const getMyConnections = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const connections = await Connection.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: 'accepted',
    })
      .populate('senderId',   'name goalCategory streak avatar _id')
      .populate('receiverId', 'name goalCategory streak avatar _id');

    const people = connections.map(c => {
      const isSender = c.senderId._id.toString() === userId;
      const other    = isSender ? c.receiverId : c.senderId;
      return { connectionId: c._id, user: other };
    });

    res.json({ success: true, data: people });
  } catch (err) { next(err); }
};

/** GET /api/connections/status?receiverId=y */
const getStatus = async (req, res, next) => {
  try {
    const senderId   = req.user.sub;
    const { receiverId } = req.query;

    if (!receiverId)
      return res.status(400).json({ success: false, message: 'receiverId required' });

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
