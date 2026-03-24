const Message  = require('../models/Message');
const { paginate } = require('../utils/paginate');
const mongoose = require('mongoose');

/** GET /api/messages/conversation?with=otherId&cursor=timestamp&limit=50
 *  Cursor-based pagination for real-time chat (newest first, then reverse on client)
 */
const getConversation = async (req, res, next) => {
  try {
    const me    = req.user.sub;
    const other = req.query.with;
    if (!other) return res.status(400).json({ success: false, message: '?with= required' });

    const cursor = req.query.cursor ? new Date(req.query.cursor) : new Date();
    const limit  = Math.min(parseInt(req.query.limit) || 50, 100);

    const msgs = await Message.find({
      $or: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me },
      ],
      createdAt: { $lt: cursor },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    await Message.updateMany(
      { senderId: other, receiverId: me, read: false },
      { read: true }
    );

    const nextCursor = msgs.length === limit ? msgs[msgs.length - 1].createdAt : null;
    res.json({ success: true, data: msgs.reverse(), nextCursor });
  } catch (err) { next(err); }
};

/** GET /api/messages/threads?page=1&limit=20 — list all conversations with last message */
const getThreads = async (req, res, next) => {
  try {
    const me    = req.user.sub;
    const meOid = new mongoose.Types.ObjectId(me);
    const { page = 1, limit = 20 } = req.query;

    const threads = await Message.aggregate([
      { $match: { $or: [{ senderId: meOid }, { receiverId: meOid }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', meOid] },
              '$receiverId',
              '$senderId',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      ...paginate(parseInt(page), parseInt(limit)),
    ]);

    await Message.populate(threads, [
      { path: 'lastMessage.senderId',   select: 'name avatar' },
      { path: 'lastMessage.receiverId', select: 'name avatar' },
    ]);

    const unreadCounts = await Message.aggregate([
      { $match: { receiverId: meOid, read: false } },
      { $group: { _id: '$senderId', count: { $sum: 1 } } },
    ]);
    const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));

    const result = threads.map(t => {
      const otherUser = t.lastMessage.senderId._id.toString() === me
        ? t.lastMessage.receiverId
        : t.lastMessage.senderId;
      return {
        user:        otherUser,
        lastMessage: t.lastMessage,
        unread:      unreadMap[otherUser._id.toString()] || 0,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

module.exports = { getConversation, getThreads };
