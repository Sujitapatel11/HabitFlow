/**
 * metrics.js
 * Exposes /metrics endpoint for Prometheus scraping.
 * Tracks: HTTP request duration, active connections, error rates.
 */
const client      = require('prom-client');
const responseTime = require('response-time');

// Default Node.js metrics (CPU, memory, event loop lag, GC)
client.collectDefaultMetrics({ prefix: 'habitflow_' });

// ── Custom metrics ────────────────────────────────────────────────────────────
const httpDuration = new client.Histogram({
  name: 'habitflow_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const httpRequests = new client.Counter({
  name: 'habitflow_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const activeConnections = new client.Gauge({
  name: 'habitflow_active_ws_connections',
  help: 'Active WebSocket connections',
});

const dbQueryDuration = new client.Histogram({
  name: 'habitflow_db_query_duration_seconds',
  help: 'MongoDB query duration',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// ── Middleware ────────────────────────────────────────────────────────────────
const trackRequest = responseTime((req, res, time) => {
  const route  = req.route?.path || req.path || 'unknown';
  const method = req.method;
  const status = String(res.statusCode);
  const seconds = time / 1000;

  httpDuration.observe({ method, route, status }, seconds);
  httpRequests.inc({ method, route, status });
});

// GET /metrics — Prometheus scrape endpoint (protect in production)
const metricsHandler = async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
};

module.exports = { trackRequest, metricsHandler, activeConnections, dbQueryDuration };
