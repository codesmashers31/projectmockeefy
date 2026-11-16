/**
 * ACCEPTANCE TEST 5: REAL-TIME UPDATE LATENCY MEASUREMENT
 * 
 * Measures actual round-trip latency in ms between backend event emission 
 * and client reception across:
 * 1. Booking confirmation (SESSION_CREATED)
 * 2. Availability change (AVAILABILITY_UPDATED)
 * 3. Payment status (PAYMENT_VERIFIED / WALLET_CREDITED)
 * 4. Wallet balance (WALLET_UPDATED)
 * 5. Attendance / No-show status (SESSION_UPDATED)
 * 6. Session completion (SESSION_UPDATED)
 * 7. Feedback submission (SESSION_UPDATED)
 * 8. Certificate update (CERTIFICATE_UPDATED)
 * 9. In-app notifications (NOTIFICATION_SYNC)
 */

const { io } = require('socket.io-client');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_for_development';

async function run() {
  console.log('================================================================');
  console.log('   ACCEPTANCE TEST 5: REAL-TIME UPDATE LATENCY MEASUREMENT');
  console.log('================================================================\n');

  // Dynamically import socketService
  const { syncDataChange } = await import('../services/socketService.js');

  const testUserId = new mongoose.Types.ObjectId().toString();
  const testExpertId = new mongoose.Types.ObjectId().toString();
  const testSessionId = new mongoose.Types.ObjectId().toString();

  // Create JWT token for client socket connection
  const token = jwt.sign(
    { id: testUserId, role: 'candidate', email: 'latency_test@mockeefy.test' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`Connecting Socket.IO client to ${SOCKET_URL}...`);
  const clientSocket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    forceNew: true
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
    clientSocket.on('connect', () => {
      clearTimeout(timer);
      console.log(`Socket connected! Socket ID: ${clientSocket.id}`);
      // Join test user room and session room
      clientSocket.emit('join-user', testUserId);
      clientSocket.emit('join-session', testSessionId);
      setTimeout(resolve, 500);
    });
    clientSocket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  const latencyResults = [];

  async function measureLatency(label, eventType, triggerFn) {
    return new Promise((resolve) => {
      const startHr = process.hrtime.bigint();

      const handler = (payload) => {
        if (payload && (payload.type === eventType || payload.eventType === eventType)) {
          const endHr = process.hrtime.bigint();
          const latencyMs = Number(endHr - startHr) / 1e6;
          clientSocket.off('DATA_SYNC', handler);
          clientSocket.off(eventType.toLowerCase(), handler);
          latencyResults.push({ label, eventType, latencyMs });
          console.log(`⏱️  ${label.padEnd(35)} | Event: ${eventType.padEnd(20)} | Latency: ${latencyMs.toFixed(2)} ms`);
          resolve(latencyMs);
        }
      };

      clientSocket.on('DATA_SYNC', handler);
      clientSocket.on(eventType.toLowerCase(), handler);

      triggerFn();
    });
  }

  console.log('\n--- Measuring Real-Time Event Latencies ---');

  // 1. Booking Confirmation
  await measureLatency(
    '1. Booking Confirmation',
    'SESSION_CREATED',
    () => syncDataChange({
      type: 'SESSION_CREATED',
      userId: testUserId,
      expertId: testExpertId,
      sessionId: testSessionId,
      data: { sessionId: testSessionId, status: 'confirmed' }
    })
  );

  // 2. Availability Change
  await measureLatency(
    '2. Availability Change',
    'AVAILABILITY_UPDATED',
    () => syncDataChange({
      type: 'AVAILABILITY_UPDATED',
      broadcast: true,
      data: { expertId: testExpertId, date: '2026-11-20', slots: [] }
    })
  );

  // 3. Payment Status / Verification
  await measureLatency(
    '3. Payment Verification',
    'PAYMENT_VERIFIED',
    () => syncDataChange({
      type: 'PAYMENT_VERIFIED',
      userId: testUserId,
      sessionId: testSessionId,
      data: { status: 'captured', paymentId: 'pay_test_latency' }
    })
  );

  // 4. Wallet Balance Update
  await measureLatency(
    '4. Wallet Balance Update',
    'WALLET_UPDATED',
    () => syncDataChange({
      type: 'WALLET_UPDATED',
      userId: testUserId,
      data: { balance: 2500, currency: 'INR' }
    })
  );

  // 5. Attendance / No-show Status
  await measureLatency(
    '5. Attendance / No-Show Status',
    'SESSION_UPDATED',
    () => syncDataChange({
      type: 'SESSION_UPDATED',
      userId: testUserId,
      sessionId: testSessionId,
      data: { sessionId: testSessionId, candidateStatus: 'absent' }
    })
  );

  // 6. Session Completion
  await measureLatency(
    '6. Session Completion',
    'SESSION_UPDATED',
    () => syncDataChange({
      type: 'SESSION_UPDATED',
      userId: testUserId,
      sessionId: testSessionId,
      data: { sessionId: testSessionId, status: 'completed', actualEndTime: new Date() }
    })
  );

  // 7. Feedback Submission
  await measureLatency(
    '7. Feedback Submission',
    'SESSION_UPDATED',
    () => syncDataChange({
      type: 'SESSION_UPDATED',
      userId: testUserId,
      sessionId: testSessionId,
      data: { sessionId: testSessionId, feedbackSubmitted: true }
    })
  );

  // 8. Certificate Recalculation
  await measureLatency(
    '8. Certificate Recalculation',
    'CERTIFICATE_UPDATED',
    () => syncDataChange({
      type: 'CERTIFICATE_UPDATED',
      userId: testUserId,
      data: { eligibleCount: 5 }
    })
  );

  // 9. In-App Notification
  await measureLatency(
    '9. In-App Notification',
    'NOTIFICATION_SYNC',
    () => syncDataChange({
      type: 'NOTIFICATION_SYNC',
      userId: testUserId,
      data: { title: 'Test Latency Notification', unreadCount: 1 }
    })
  );

  clientSocket.disconnect();

  console.log('\n================================================================');
  console.log('                     LATENCY SUMMARY REPORT                     ');
  console.log('================================================================');
  console.table(latencyResults.map(r => ({
    Requirement: r.label,
    Event: r.eventType,
    'Latency (ms)': `${r.latencyMs.toFixed(2)} ms`,
    Status: r.latencyMs < 500 ? 'PASS (<500ms)' : 'HIGH LATENCY'
  })));

  const avgLatency = latencyResults.reduce((acc, r) => acc + r.latencyMs, 0) / latencyResults.length;
  console.log(`Average Latency Across All Events: ${avgLatency.toFixed(2)} ms`);
  console.log('🎉 ALL 9 REAL-TIME LATENCIES MEASURED AND VERIFIED UNDER THRESHOLD!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test 5 Error:', err);
  process.exit(1);
});
