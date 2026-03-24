/**
 * socketHandler.js
 * Socket.io with @socket.io/redis-adapter for horizontal scaling.
 * Multiple backend instances share state via Redis pub/sub.
 * Messages are persisted to MongoDB BEFORE emitting (no data loss).
 */
const { Server }       = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Message          = require('../models/Message');
const { pub, sub }     = require('./redisClient');
const { verifyAccess } = require('./tokenService');
const { activeConnections } = require('../middleware/metrics');
const logger           = require('./logger');

const dmRoom = (a, b) => `dm:${[a, b].sort().join(':')}`;

// Per-socket sliding-window rate limiter (in-memory per instance is fine —
// each socket lives on exactly one instance)
const msgRates  = new Map();
const MSG_LIMIT = 30;
const MSG_WIN   = 60_000;

function checkRate(socketId) {
  const now = Date.now();
  const log = (msgRates.get(socketId) || []).filter(t => now - t < MSG_WIN);
  log.push(now);
  msgRates.set(socketId, log);
  return log.length <= MSG_LIMIT;
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors:        { origin: process.env.FRONTEND_URL || '*', credentials: true, methods: ['GET','POST'] },
    pingTimeout: 60_000,
    pingInterval: 25_000,
    // Allow reconnection with exponential backoff on client
    transports: ['websocket', 'polling'],
  });

  // ── Redis adapter — enables cross-instance room broadcasts ───────────────
  // Only attach if real Redis clients are available (not the dev shim)
  if (process.env.REDIS_URL) {
    io.adapter(createAdapter(pub, sub));
    logger.info('[Socket.io] Redis adapter attached');
  } else {
    logger.warn('[Socket.io] No Redis — adapter not attached (single-instance dev mode)');
  }

  // ── JWT auth middleware ───────────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .find(c => c.trim().startsWith('hf_access='))
          ?.split('=')[1];

      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccess(token);
      socket.userId = decoded.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.userId;
    activeConnections.inc();
    logger.info(`[WS] ${userId} connected (${socket.id})`);

    // Auto-join personal notification room
    socket.join(`user:${userId}`);

    // ── join — enter a DM conversation room ────────────────────────────────
    socket.on('join', ({ withUserId }) => {
      if (!withUserId || typeof withUserId !== 'string') return;
      socket.join(dmRoom(userId, withUserId));
    });

    // ── send — persist first, then broadcast ───────────────────────────────
    socket.on('send', async ({ toUserId, text }, ack) => {
      if (!text?.trim() || !toUserId) return;
      if (text.length > 2000) {
        if (typeof ack === 'function') ack({ error: 'Message too long' });
        return;
      }
      if (!checkRate(socket.id)) {
        if (typeof ack === 'function') ack({ error: 'Rate limit exceeded' });
        return socket.emit('error', { message: 'Sending too fast. Slow down.' });
      }

      try {
        // ── Persist BEFORE emit — guarantees no data loss ──────────────────
        const saved = await Message.create({
          senderId:   userId,
          receiverId: toUserId,
          text:       text.trim().replace(/<[^>]*>/g, ''), // strip HTML
        });

        const payload = {
          _id:        saved._id,
          senderId:   userId,
          receiverId: toUserId,
          text:       saved.text,
          read:       false,
          createdAt:  saved.createdAt,
        };

        // Broadcast to the DM room (Redis adapter fans out to all instances)
        io.to(dmRoom(userId, toUserId)).emit('message', payload);

        // Notify receiver's personal room (for thread list update)
        io.to(`user:${toUserId}`).emit('new_message_notify', payload);

        // ACK back to sender with server-assigned _id and timestamp
        if (typeof ack === 'function') ack({ ok: true, _id: saved._id, createdAt: saved.createdAt });
      } catch (err) {
        logger.error(`[WS] send error: ${err.message}`);
        if (typeof ack === 'function') ack({ error: 'Failed to send message' });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── typing indicator ────────────────────────────────────────────────────
    socket.on('typing', ({ toUserId, isTyping }) => {
      if (!toUserId) return;
      socket.to(dmRoom(userId, toUserId)).emit('typing', { fromUserId: userId, isTyping });
    });

    // ── disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      msgRates.delete(socket.id);
      activeConnections.dec();
      logger.info(`[WS] ${userId} disconnected (${reason})`);
    });
  });

  return io;
}

module.exports = { initSocket };
