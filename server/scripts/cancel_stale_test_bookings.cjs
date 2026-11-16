const http = require('http');
const path = require('path');
const jwt = require('../node_modules/jsonwebtoken');
const mongoose = require('../node_modules/mongoose');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function cancelStaleTestBookings() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;

  const expertUser = await User.findOne({ email: 'joel.26csa@licet.ac.in' });
  const expertToken = jwt.sign(
    { userId: expertUser._id.toString(), id: expertUser._id.toString(), userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const testSessionIds = [
    'session-1794564396074-dt620opk2', // Nov 14 01:30 AM IST
    'session-1794566869398-6b2yveqqi', // Nov 18 10:54 PM IST
    'session-1794585395084-nolppccne'  // Nov 20 08:27 PM IST
  ];

  console.log('=== CANCELLING STALE TEST SESSIONS VIA LEGITIMATE REJECT ENDPOINT ===\n');

  for (const sid of testSessionIds) {
    const s = await Session.findOne({ sessionId: sid });
    if (!s) {
      console.log(`Session ${sid} not found.`);
      continue;
    }
    if (s.status === 'cancelled') {
      console.log(`Session ${sid} is already cancelled.`);
      continue;
    }

    console.log(`Cancelling session ${sid} (Start: ${s.startTime.toISOString()}, Current status: ${s.status})...`);
    const payload = JSON.stringify({ reason: 'Cancelling disposable test booking to restore calendar availability' });

    const resData = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/sessions/${sid}/reject`,
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

    console.log(`  -> API Status: ${resData.statusCode}, Response: ${resData.body.substring(0, 150)}`);
  }

  console.log('\n=== VERIFYING POST-CANCELLATION DB STATUS ===');
  for (const sid of testSessionIds) {
    const updated = await Session.findOne({ sessionId: sid }).lean();
    const refund = await WalletTransaction.findOne({ sessionId: sid, type: 'CREDIT', reason: 'SESSION_CANCELLED_REFUND' }).lean();
    console.log(`Session ${sid}: Status = ${updated?.status}, Refund credited = ${refund ? 'YES (₹' + refund.amount + ')' : 'NO / N/A'}`);
  }

  const candWallet = await Wallet.findOne({ userId: '6af326acf549d9aa26049ba4' }).lean();
  console.log(`Candidate Wallet Balance after refunds: ₹${candWallet?.availableBalance}`);

  await mongoose.disconnect();
}

cancelStaleTestBookings().catch(console.error);
