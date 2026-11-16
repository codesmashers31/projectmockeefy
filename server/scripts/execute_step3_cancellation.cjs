const http = require('http');
const path = require('path');
const jwt = require('../node_modules/jsonwebtoken');
const mongoose = require('../node_modules/mongoose');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function executeCancellation() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const { validateBookingSlot } = await import('../utils/availabilityValidator.js');

  const expertUser = await User.findOne({ email: 'joel.26csa@licet.ac.in' });
  const expertToken = jwt.sign(
    { userId: expertUser._id.toString(), id: expertUser._id.toString(), userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const targetSessionId = 'session-1794586264656-i35z7gw37';
  console.log('Cancelling session via legitimate API endpoint PATCH /api/sessions/' + targetSessionId + '/reject ...');

  const payload = JSON.stringify({ reason: 'Cancelling test session to release slot for candidate booking' });

  const resData = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/sessions/${targetSessionId}/reject`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${expertToken}`
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  console.log('Cancellation API Status:', resData.statusCode);
  console.log('Cancellation API Response:', resData.body);

  // Verify MongoDB State
  const updatedSession = await Session.findOne({ sessionId: targetSessionId }).lean();
  console.log('\n--- VERIFYING POST-CANCELLATION DB STATE ---');
  console.log('Session Status:', updatedSession.status);

  const refundTxn = await WalletTransaction.findOne({
    sessionId: targetSessionId,
    type: 'CREDIT',
    reason: 'SESSION_CANCELLED_REFUND'
  }).lean();
  console.log('Refund Transaction:', refundTxn ? {
    type: refundTxn.type,
    amount: refundTxn.amount,
    reason: refundTxn.reason,
    balanceAfter: refundTxn.balanceAfter
  } : 'NOT FOUND');

  const candidateWallet = await Wallet.findOne({ userId: updatedSession.candidateId }).lean();
  console.log('Candidate Current Wallet Balance:', candidateWallet.availableBalance);

  // Verify Slot Bookability
  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const start = new Date('2026-11-20T21:30:00+05:30');
  const end = new Date('2026-11-20T22:00:00+05:30');
  const slotCheck = await validateBookingSlot({
    expertId,
    startTime: start,
    endTime: end,
    currentTime: new Date()
  });
  console.log('Slot Validation after cancellation:', slotCheck);

  await mongoose.disconnect();
}

executeCancellation().catch(console.error);
