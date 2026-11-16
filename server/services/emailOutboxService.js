import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import EmailOutbox from '../models/EmailOutbox.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cleanVal = (val) => (val ? String(val).trim().replace(/^["']|["']$/g, '') : '');

let customTransporter = null;

export function setTransporter(transporter) {
  customTransporter = transporter;
}

export function getTransporter() {
  if (customTransporter) return customTransporter;

  const host = cleanVal(process.env.SMTP_HOST) || 'smtpout.secureserver.net';
  const port = Number(cleanVal(process.env.SMTP_PORT)) || 465;
  const secure = process.env.SMTP_SECURE !== undefined
    ? cleanVal(process.env.SMTP_SECURE) === 'true'
    : port === 465;
  const user = cleanVal(process.env.SMTP_USER || process.env.EMAIL_USER);
  const pass = cleanVal(process.env.SMTP_PASS || process.env.EMAIL_PASS);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
}

/**
 * Enqueue an email into the durable EmailOutbox.
 * Enforces database idempotency via unique idempotencyKey.
 */
export async function enqueueEmail({
  sessionId,
  recipientType,
  to,
  subject,
  html,
  metadata = {},
  template = 'booking_confirmed'
}) {
  if (!sessionId || !recipientType || !to || !subject || !html) {
    throw new Error('Missing required fields for outbox email');
  }

  const idempotencyKey = `${sessionId}_${recipientType}_${template}`;

  const existing = await EmailOutbox.findOne({ idempotencyKey });
  if (existing) {
    return {
      enqueued: false,
      alreadyExists: true,
      idempotencyKey,
      status: existing.status,
      entry: existing
    };
  }

  try {
    const canonicalOrigin = (process.env.APP_BASE_URL || 'https://mockeefy.com').replace(/\/$/, '');
    const sanitizedHtml = html ? html.replace(/https?:\/\/localhost(:\d+)?/gi, canonicalOrigin) : html;

    const entry = await EmailOutbox.create({
      idempotencyKey,
      sessionId,
      recipientType,
      to: to.trim().toLowerCase(),
      subject: subject.trim(),
      html: sanitizedHtml,
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: new Date(),
      metadata,
      createdAt: new Date(),
    });

    return {
      enqueued: true,
      idempotencyKey,
      status: entry.status,
      entry
    };
  } catch (err) {
    // If concurrent insert occurred, fetch existing
    if (err.code === 11000) {
      const existing = await EmailOutbox.findOne({ idempotencyKey });
      return {
        enqueued: false,
        alreadyExists: true,
        idempotencyKey,
        status: existing?.status,
        entry: existing
      };
    }
    throw err;
  }
}

/**
 * Process pending emails in the outbox with exponential backoff.
 */
export async function processOutbox(batchSize = 20) {
  const now = new Date();
  
  // Find pending or retryable failed emails
  const pendingEmails = await EmailOutbox.find({
    status: { $in: ['pending', 'failed'] },
    retryCount: { $lt: 5 },
    nextRetryAt: { $lte: now }
  }).limit(batchSize);

  if (pendingEmails.length === 0) return { processed: 0, successes: 0, failures: 0 };

  const transporter = getTransporter();
  let successes = 0;
  let failures = 0;

  for (const item of pendingEmails) {
    // Lock item to processing
    await EmailOutbox.updateOne(
      { _id: item._id, status: { $in: ['pending', 'failed'] } },
      { $set: { status: 'processing' } }
    );

    try {
      const fromAddr = cleanVal(process.env.SMTP_USER) || 'info@mockeefy.com';
      await transporter.sendMail({
        from: `"Mockeefy" <${fromAddr}>`,
        to: item.to,
        subject: item.subject,
        html: item.html,
      });

      // Mark sent successfully
      await EmailOutbox.updateOne(
        { _id: item._id },
        {
          $set: {
            status: 'sent',
            sentAt: new Date(),
            lastError: null
          }
        }
      );
      successes++;
    } catch (sendErr) {
      const nextCount = item.retryCount + 1;
      const isExhausted = nextCount >= item.maxRetries;
      // Exponential backoff: 30s * 2^retries, max 5 minutes
      const backoffMs = Math.min(300000, 30000 * Math.pow(2, item.retryCount));
      const nextRetryAt = new Date(Date.now() + backoffMs);

      await EmailOutbox.updateOne(
        { _id: item._id },
        {
          $set: {
            status: isExhausted ? 'failed' : 'failed',
            retryCount: nextCount,
            lastError: sendErr.message,
            nextRetryAt: isExhausted ? new Date(Date.now() + 86400000) : nextRetryAt
          }
        }
      );
      failures++;
    }
  }

  return {
    processed: pendingEmails.length,
    successes,
    failures
  };
}

let workerInterval = null;
export function startOutboxWorker(intervalMs = 30000) {
  if (workerInterval) return;
  workerInterval = setInterval(async () => {
    try {
      await processOutbox();
    } catch (err) {
      console.error('[EmailOutboxWorker] Error processing outbox:', err.message);
    }
  }, intervalMs);
}

export function stopOutboxWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

export default {
  enqueueEmail,
  processOutbox,
  startOutboxWorker,
  stopOutboxWorker,
  setTransporter,
  getTransporter
};
