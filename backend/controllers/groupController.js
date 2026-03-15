const Group = require('../models/Group');

const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 });
    res.json({ success: true, data: groups });
  } catch (err) { next(err); }
};

const createGroup = async (req, res, next) => {
  try {
    const { name, description, category } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Group name required' });
    const group = await Group.create({ name, description, category, memberCount: 1 });
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

module.exports = { getGroups, createGroup, joinGroup, leaveGroup };
