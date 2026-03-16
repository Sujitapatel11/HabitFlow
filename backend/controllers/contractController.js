const Contract = require('../models/Contract');
const Post = require('../models/Post');

/** POST /api/contracts — create a new contract */
const createContract = async (req, res, next) => {
  try {
    const { userId, userName, habitId, habitName, category, durationDays, stakePoints } = req.body;
    if (!userId || !habitId || !habitName || !durationDays || !stakePoints)
      return res.status(400).json({ success: false, message: 'Missing required fields' });

    // Only one active contract per habit
    const existing = await Contract.findOne({ userId, habitId, status: 'active' });
    if (existing)
      return res.status(400).json({ success: false, message: 'Active contract already exists for this habit' });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(durationDays));

    const contract = await Contract.create({
      userId, userName, habitId, habitName, category,
      durationDays, stakePoints, startDate, endDate,
    });

    // Announce to community
    await Post.create({
      authorName: userName,
      habitName,
      category: category || 'Other',
      type: 'manual',
      message: `🤝 I just committed to a ${durationDays}-day contract for "${habitName}"! Stake: ${stakePoints} reputation points. Hold me accountable! 💪`,
    });

    res.status(201).json({ success: true, data: contract });
  } catch (err) { next(err); }
};

/** GET /api/contracts?userId=xxx */
const getContracts = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};
    const contracts = await Contract.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: contracts });
  } catch (err) { next(err); }
};

/** GET /api/contracts/feed — all active contracts for community witnessing */
const getFeed = async (req, res, next) => {
  try {
    const { userId } = req.query;
    // Show active contracts from other users
    const filter = { status: 'active' };
    if (userId) filter.userId = { $ne: userId };
    const contracts = await Contract.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: contracts });
  } catch (err) { next(err); }
};

/** POST /api/contracts/:id/checkin — daily check-in */
const checkIn = async (req, res, next) => {
  try {
    const { note } = req.body;
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (contract.status !== 'active')
      return res.status(400).json({ success: false, message: 'Contract is not active' });

    // Prevent double check-in on same day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alreadyCheckedIn = contract.checkIns.some(c => {
      const d = new Date(c.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    if (alreadyCheckedIn)
      return res.status(400).json({ success: false, message: 'Already checked in today' });

    contract.checkIns.push({ date: new Date(), note: note || '' });
    contract.completedDays = contract.checkIns.length;

    // Auto-complete if all days done
    if (contract.completedDays >= contract.durationDays) {
      contract.status = 'completed';
      await Post.create({
        authorName: contract.userName,
        habitName: contract.habitName,
        category: contract.category,
        type: 'completion',
        message: `🏆 I completed my ${contract.durationDays}-day contract for "${contract.habitName}"! Earned ${contract.stakePoints} reputation points! 🎉`,
      });
    }

    await contract.save();
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
};

/** POST /api/contracts/:id/witness — vote legit or doubt on latest check-in */
const witnessVote = async (req, res, next) => {
  try {
    const { userId, userName, vote } = req.body;
    if (!['legit', 'doubt'].includes(vote))
      return res.status(400).json({ success: false, message: 'Vote must be legit or doubt' });

    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });
    if (contract.userId === userId)
      return res.status(400).json({ success: false, message: 'Cannot witness your own contract' });

    // One vote per user
    const alreadyVoted = contract.witnesses.find(w => w.userId === userId);
    if (alreadyVoted)
      return res.status(400).json({ success: false, message: 'Already voted' });

    contract.witnesses.push({ userId, userName, vote });

    // Update latest check-in counts
    const latest = contract.checkIns[contract.checkIns.length - 1];
    if (latest) {
      if (vote === 'legit') latest.legitCount = (latest.legitCount || 0) + 1;
      if (vote === 'doubt') {
        latest.doubtCount = (latest.doubtCount || 0) + 1;
        // If 3+ doubts → break contract
        if (latest.doubtCount >= 3) {
          contract.status = 'broken';
          await Post.create({
            authorName: contract.userName,
            habitName: contract.habitName,
            category: contract.category,
            type: 'manual',
            message: `⚠️ ${contract.userName}'s ${contract.durationDays}-day contract for "${contract.habitName}" was broken on day ${contract.completedDays}. Stake lost: ${contract.stakePoints} reputation points.`,
          });
        }
      }
    }

    await contract.save();
    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
};

/** POST /api/contracts/:id/break — self-break (give up) */
const breakContract = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    contract.status = 'broken';
    await contract.save();

    await Post.create({
      authorName: contract.userName,
      habitName: contract.habitName,
      category: contract.category,
      type: 'manual',
      message: `⚠️ ${contract.userName} broke the ${contract.durationDays}-day contract for "${contract.habitName}" on day ${contract.completedDays}. Stake lost: ${contract.stakePoints} reputation points.`,
    });

    res.json({ success: true, data: contract });
  } catch (err) { next(err); }
};

module.exports = { createContract, getContracts, getFeed, checkIn, witnessVote, breakContract };
