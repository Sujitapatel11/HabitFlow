const Post = require('../models/Post');

const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ success: true, data: posts });
  } catch (err) { next(err); }
};

const createPost = async (req, res, next) => {
  try {
    const { habitName, message, category, authorName } = req.body;
    if (!habitName || !message)
      return res.status(400).json({ success: false, message: 'habitName and message required' });
    const post = await Post.create({ habitName, message, category, authorName: authorName || 'Anonymous' });
    res.status(201).json({ success: true, data: post });
  } catch (err) { next(err); }
};

const reactToPost = async (req, res, next) => {
  try {
    const { type, userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const uid = userId || 'anonymous';
    const existing = post.reactions.findIndex(r => r.userId === uid && r.type === type);
    if (existing > -1) {
      post.reactions.splice(existing, 1);
    } else {
      post.reactions = post.reactions.filter(r => r.userId !== uid);
      post.reactions.push({ userId: uid, type: type || 'like' });
    }
    await post.save();
    res.json({ success: true, reactions: post.reactions });
  } catch (err) { next(err); }
};

module.exports = { getPosts, createPost, reactToPost };
