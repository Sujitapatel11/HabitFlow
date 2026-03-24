require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose   = require('mongoose');
const http       = require('http');
const path       = require('path');
const fs         = require('fs');

const errorHandler  = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { trackRequest, metricsHandler } = require('./middleware/metrics');
const { initSocket } = require('./services/socketHandler');
const logger        = require('./services/logger');

// Initialize queues (starts BullMQ workers if Redis available)
require('./services/queues');

// Ensure logs directory exists
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

const app        = express();
const httpServer = http.createServer(app);
const PORT       = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Trust proxy so express-rate-limit gets correct IP (fixes IPv6 warning)
app.set('trust proxy', 1);

// ── CORS — explicit origin only ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true, // required for cookies
  methods: ['GET','POST','PUT','DELETE','PATCH'],
}));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: msg => logger.http(msg.trim()) },
  skip: (req) => req.path === '/api/health',
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── NoSQL injection sanitization ─────────────────────────────────────────────
app.use(mongoSanitize());

// ── Metrics tracking (Prometheus) ────────────────────────────────────────────
app.use(trackRequest);

// ── General rate limit on all API routes ─────────────────────────────────────
app.use('/api', generalLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/habits',      require('./routes/habitRoutes'));
app.use('/api/posts',       require('./routes/postRoutes'));
app.use('/api/groups',      require('./routes/groupRoutes'));
app.use('/api/users',       require('./routes/userRoutes'));
app.use('/api/app-users',   require('./routes/appUserRoutes'));
app.use('/api/connections', require('./routes/connectionRoutes'));
app.use('/api/reflection',  require('./routes/reflectionRoutes'));
app.use('/api/contracts',   require('./routes/contractRoutes'));
app.use('/api/upload',      require('./routes/uploadRoutes'));
app.use('/api/messages',    require('./routes/messageRoutes'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/metrics', metricsHandler); // Prometheus scrape endpoint (protect with auth in production)

// ── Error handler (must be last middleware) ───────────────────────────────────
app.use(errorHandler);

// ── Serve Angular frontend (production) ──────────────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist/frontend/browser');
app.use(express.static(frontendDist));
app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));

// ── Database + Server startup ─────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    logger.info('MongoDB connected');
    initSocket(httpServer);
    httpServer.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} in use. Run: npx kill-port ${PORT}`);
      } else {
        logger.error(err.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => { logger.error(err.message); process.exit(1); });

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  httpServer.close(() => { logger.info('Server closed'); process.exit(0); });
});
