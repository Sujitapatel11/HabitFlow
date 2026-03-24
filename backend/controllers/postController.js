const Post = require('../models/Post');

/** GET /api/posts?page=1&limit=20 — paginated community feed */
const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Post.countDocuments();

    res.json({
      success: true,
      data: posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

/** POST /api/posts — create post (auth required, userId from JWT) */
const createPost = async (req, res, next) => {
  try {
    const { habitName, message, category } = req.body;
    if (!habitName || !message)
      return res.status(400).json({ success: false, message: 'habitName and message required' });

    const authorId = req.user.sub; // from JWT
    const authorName = req.user.name || 'Anonymous';

    const post = await Post.create({
      authorId,
      authorName,
      habitName,
      message,
      category: category || 'Other',
    });

    res.status(201).json({ success: true, data: post });
  } catch (err) { next(err); }
};

/** POST /api/posts/:id/react — toggle reaction (auth required) */
const reactToPost = async (req, res, next) => {
  try {
    const { type } = req.body;
    const userId = req.user.sub; // from JWT

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const existing = post.reactions.findIndex(r => r.userId === userId && r.type === type);
    if (existing > -1) {
      post.reactions.splice(existing, 1);
    } else {
      post.reactions = post.reactions.filter(r => r.userId !== userId);
      post.reactions.push({ userId, type: type || 'like' });
    }

    await post.save();
    res.json({ success: true, reactions: post.reactions });
  } catch (err) { next(err); }
};

module.exports = { getPosts, createPost, reactToPost };
