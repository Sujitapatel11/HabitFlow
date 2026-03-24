/**
 * uploadRoutes.js
 * Avatar upload — Cloudinary in production, base64 fallback in dev.
 * Cloudinary stores the image and returns a CDN URL (no base64 in DB).
 */
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const AppUser  = require('../models/AppUser');
const { protect } = require('../middleware/auth');
const logger   = require('../services/logger');

const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// Lazy-init Cloudinary only when CLOUDINARY_URL is set
function getCloudinary() {
  if (!process.env.CLOUDINARY_URL) return null;
  const cloudinary = require('cloudinary').v2;
  // cloudinary.config() auto-reads CLOUDINARY_URL env var
  return cloudinary;
}

/** POST /api/upload/avatar — requires auth */
router.post('/avatar', protect, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const userId = req.user.sub; // from JWT — never trust client-provided userId
    let avatarUrl;

    const cloudinary = getCloudinary();
    if (cloudinary) {
      // ── Cloudinary upload (production) ─────────────────────────────────
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:         'habitflow/avatars',
            public_id:      `user_${userId}`,
            overwrite:      true,
            transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
          },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      avatarUrl = result.secure_url;
      logger.info(`[Upload] Cloudinary avatar uploaded for ${userId}: ${avatarUrl}`);
    } else {
      // ── Base64 fallback (dev only) ──────────────────────────────────────
      avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      logger.warn('[Upload] No CLOUDINARY_URL — using base64 fallback (dev only)');
    }

    const user = await AppUser.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, avatar: avatarUrl });
  } catch (err) { next(err); }
});

module.exports = router;
