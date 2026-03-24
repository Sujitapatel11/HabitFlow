/**
 * contractController.js — PledgeUp core
 */
const Contract   = require('../models/Contract');
const AppUser    = require('../models/AppUser');
const Connection = require('../models/Connection');
const Post       = require('../models/Post');
const logger     = require('../services/logger');

const utcDay = (d = new Date()) => {
  const t = new Date(d);
  t.setUTCHours(0, 0, 0, 0);
  return t;
};

/** POST /api/contracts */
const createContract = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { habitId, habitName, category, durationDays, stakePoints } = req.body;
    if (!habitId || !habitName || !durationDays)
      return res.status(400).json({ success: false, message: 'habitId, habitName, durationDays required' });

    const existing = await Contract.findOne({ userId, habitId, status: 'active' });
    if (existing)
      return res.status(400).json({ success: false, message: 'Active contract already exists for this habit' });

    const user = await AppUser.findById(userId).lean();
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(durationDays));

    const contract = await Contract.create({
      userId, userName: user.name, habitId, habitName, category,
      durationDays, stakePoints, startDate, endDate,
    });

    await Post.create({
      authorId: userId, authorName: user.name, habitName, category: category || 'Other',
      type: 'manual',
      message: `🤝 I committed to a ${durationDays}-day contract for "${habitName}"! Stake: ${stakePoints} pts. Hold me accountable! 💪`,
    });

    res.status(201).json({ success: true, data: contract });
  } catch (err) { next(err); }
};

/** GET /api/contracts */
const getContracts = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const contracts = await Contract.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: contracts });
  } catch (err) { next(err); }
};

/** GET /api/contracts/feed */
const getFeed = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const contracts = await Contract.find({ status: 'active', userId: { $ne: userId } })
      .sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: contracts });
  } catch (err) { next(err); }
};

/** POST /api/contracts/:id/checkin */
const checkIn = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const { note } = req.body;

    const contract = await Contract.findOne({ _id: req.params.id, userId });
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (contract.status !== 'active')
      return res.status(400).json({ success: false, message: 'Contract is not active' });

    const todayUTC = utcDay();
    const alreadyCheckedIn = contract.checkIns.some(c => utcDay(c.date).getTime() === todayUTC.getTime());
    if (alreadyCheckedIn)
      return res.status(400).json({ success: false, message: 'Already checked in today' });

    contract.checkIns.push({ date: new Date(), note: note || '' });
    contract.completedDays = contract.checkIns.length;

    if (contract.completedDays >= contract.durationDays) {
      contract.status = 'completed';
      const user = await AppUser.findById(userId).lean();
      await Post.create({
        authorId: userId, authorName: user.name, habitName: contract.habitName,
        category: contract.category, type: 'completion',
        message: `🏆 Completed ${contract.durationDays}-day contract for "${contract.habitName}"! Earned ${contract.stakePoints} pts! 🎉`,
      });
    }

    await contract.save();
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
};

/** POST /api/contracts/:id/witness */
const witnessVote = async (req, res, next) => {
  try {
    const voterId = req.user.sub;
    const { vote } = req.body;

    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (contract.status !== 'active')
      return res.status(400).json({ success: false, message: 'Contract is not active' });
    if (contract.userId.toString() === voterId)
      return res.status(400).json({ success: false, message: 'Cannot witness your own contract' });

    const isConnected = await Connection.findOne({
      $or: [
        { senderId: voterId, receiverId: contract.userId, status: 'accepted' },
        { senderId: contract.userId, receiverId: voterId, status: 'accepted' },
      ],
    });
    if (!isConnected)
      return res.status(403).json({ success: false, message: 'Only connections can witness contracts' });

    const alreadyVoted = contract.witnesses.find(w => w.userId === voterId);
    if (alreadyVoted)
      return res.status(400).json({ success: false, message: 'Already voted on this contract' });

    const voter = await AppUser.findById(voterId).lean();
    const weight = Math.min(3, 1 + Math.floor((voter.streak || 0) / 10));

    contract.witnesses.push({ userId: voterId, userName: voter.name, vote, weight, votedAt: new Date() });

    const latest = contract.checkIns[contract.checkIns.length - 1];
    if (latest) {
      if (vote === 'legit') latest.legitCount = (latest.legitCount || 0) + weight;
      if (vote === 'doubt') {
        latest.doubtCount = (latest.doubtCount || 0) + weight;
        if (latest.doubtCount >= 3) {
          contract.status = 'broken';
          const owner = await AppUser.findById(contract.userId).lean();
          await Post.create({
            authorId: contract.userId, authorName: owner?.name || contract.userName,
            habitName: contract.habitName, category: contract.category, type: 'manual',
            message: `⚠️ ${contract.userName}'s contract for "${contract.habitName}" was broken by community doubt on day ${contract.completedDays}.`,
          });
          logger.warn(`[Contract] Broken by doubt: ${contract._id}`);
        }
      }
    }

    await contract.save();
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
};

/** POST /api/contracts/:id/break */
const breakContract = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const contract = await Contract.findOne({ _id: req.params.id, userId });
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (contract.status !== 'active')
      return res.status(400).json({ success: false, message: 'Contract already ended' });

    contract.status = 'broken';
    await contract.save();

    const user = await AppUser.findById(userId).lean();
    await Post.create({
      authorId: userId, authorName: user.name, habitName: contract.habitName,
      category: contract.category, type: 'manual',
      message: `⚠️ ${user.name} broke the ${contract.durationDays}-day contract for "${contract.habitName}" on day ${contract.completedDays}.`,
    });

    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
};

module.exports = { createContract, getContracts, getFeed, checkIn, witnessVote, breakContract };
