require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/habits', require('./routes/habitRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/app-users', require('./routes/appUserRoutes'));
app.use('/api/connections', require('./routes/connectionRoutes'));
app.use('/api/reflection', require('./routes/reflectionRoutes'));
app.use('/api/contracts', require('./routes/contractRoutes'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use(errorHandler);

// Serve Angular frontend (production)
const frontendDist = path.join(__dirname, '../frontend/dist/frontend/browser');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is in use. Run: npx kill-port ${PORT}`);
      } else {
        console.error(err.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => { console.error(err.message); process.exit(1); });
