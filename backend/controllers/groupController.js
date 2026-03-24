const Group   = require('../models/Group');
const Post    = require('../models/Post');
const AppUser = require('../models/AppUser');

const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: groups });
  } catch (err) { next(err); }
};

const createGroup = async (req, res, next) => {
  try {
    const { name, description, category } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Group name required' });

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      category: category || 'Other',
      memberCount: 1,
      creatorId: req.user.sub,
    });
    res.status(201).json({ success: true, data: group });
  } catch (err) { next(err); }
};

const joinGroup = async (req, res, next) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $inc: { memberCount: 1 } },
      { new: true }
    );
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
};

const leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $inc: { memberCount: -1 } },
      { new: true }
    );
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, data: group });
  } catch (err) { next(err); }
};

/** GET /api/groups/:id/activity — recent completions from group members */
const getGroupActivity = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    // Show recent completion posts — simple proxy for group activity
    const posts = await Post.find({ type: 'completion' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: posts });
  } catch (err) { next(err); }
};

module.exports = { getGroups, createGroup, joinGroup, leaveGroup, getGroupActivity };
