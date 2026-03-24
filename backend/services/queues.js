/**
 * queues.js
 * BullMQ job queues — offloads slow/blocking work from the request thread.
 * Queues: email, notification, reflection
 *
 * In dev (no Redis): jobs execute inline synchronously as a fallback.
 */
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || null;

let emailQueue, notifQueue, reflectionQueue;
let emailWorker, notifWorker, reflectionWorker;

if (REDIS_URL) {
  const { Queue, Worker, QueueEvents } = require('bullmq');
  const connection = { url: REDIS_URL };

  // ── Queues ──────────────────────────────────────────────────────────────────
  emailQueue      = new Queue('email',      { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
  notifQueue      = new Queue('notification',{ connection, defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 1000 } } });
  reflectionQueue = new Queue('reflection', { connection, defaultJobOptions: { attempts: 1 } });

  // ── Workers ─────────────────────────────────────────────────────────────────
  emailWorker = new Worker('email', async (job) => {
    const { sendOtpEmail } = require('./emailService');
    const { to, otp, name } = job.data;
    await sendOtpEmail(to, otp, name);
    logger.info(`[Queue:email] OTP sent to ${to}`);
  }, { connection, concurrency: 5 });

  notifWorker = new Worker('notification', async (job) => {
    // Placeholder: integrate Firebase / push service here
    logger.info(`[Queue:notif] ${job.name} → ${JSON.stringify(job.data)}`);
  }, { connection, concurrency: 10 });

  reflectionWorker = new Worker('reflection', async (job) => {
    const { generateReflection } = require('./reflectionEngine');
    await generateReflection(job.data.userId);
    logger.info(`[Queue:reflection] Generated for ${job.data.userId}`);
  }, { connection, concurrency: 2 });

  // Error handlers
  for (const w of [emailWorker, notifWorker, reflectionWorker]) {
    w.on('failed', (job, err) => logger.error(`[Queue] Job ${job?.id} failed: ${err.message}`));
    w.on('error',  (err)      => logger.error(`[Queue] Worker error: ${err.message}`));
  }

  logger.info('[Queue] BullMQ workers started');
} else {
  // Dev fallback — execute inline (no Redis needed)
  const inline = (name) => ({
    add: async (jobName, data) => {
      logger.debug(`[Queue:${name}] inline job "${jobName}"`);
      if (name === 'email') {
        try {
          const { sendOtpEmail } = require('./emailService');
          if (data.otp) await sendOtpEmail(data.to, data.otp, data.name);
        } catch (e) { logger.warn(`[Queue:email] inline failed: ${e.message}`); }
      }
    },
  });
  emailQueue      = inline('email');
  notifQueue      = inline('notification');
  reflectionQueue = inline('reflection');
  logger.warn('[Queue] No Redis — using inline job execution (dev only)');
}

module.exports = { emailQueue, notifQueue, reflectionQueue };
