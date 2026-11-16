const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function checkSessions() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const testIds = [
    'session-1794564396074-dt620opk2',
    'session-1794566869398-6b2yveqqi',
    'session-1794585395084-nolppccne',
    'session-1794586264656-i35z7gw37'
  ];

  const sessions = await db.collection('sessions').find({
    sessionId: { $in: testIds }
  }).toArray();
  console.log('--- TEST SESSIONS STATUS ---');
  sessions.forEach(s => {
    console.log(s.sessionId, '| status:', s.status, '| paymentStatus:', s.paymentStatus, '| refundId:', s.refundId);
  });

  const wallet = await db.collection('wallets').findOne({ userId: new mongoose.Types.ObjectId('6af326acf549d9aa26049ba4') });
  console.log('--- CANDIDATE WALLET ---');
  console.log('Balance:', wallet?.balance);

  const txs = await db.collection('wallettransactions').find({
    userId: new mongoose.Types.ObjectId('6af326acf549d9aa26049ba4'),
    sessionId: { $in: testIds }
  }).toArray();
  console.log('--- CANDIDATE REFUND TXS COUNT ---', txs.length);
  txs.forEach(t => {
    console.log(t.sessionId, '| type:', t.type, '| amount:', t.amount, '| desc:', t.description, '| createdAt:', t.createdAt);
  });

  const confirmed = await db.collection('sessions').find({
    $or: [
      { expertId: new mongoose.Types.ObjectId('6ae2e7cf2ad1edd333f2aded') },
      { 'expert.id': '6ae2e7cf2ad1edd333f2aded' },
      { 'expert.id': new mongoose.Types.ObjectId('6ae2e7cf2ad1edd333f2aded') }
    ],
    status: { $in: ['confirmed', 'Confirmed', 'CONFIRMED'] }
  }).toArray();
  console.log('--- GENUINE CONFIRMED SESSIONS FOR JOEL ---', confirmed.length);
  confirmed.forEach(c => {
    console.log(c.sessionId, c.status, c.startTime, c.endTime);
  });

  await mongoose.disconnect();
  process.exit(0);
}
checkSessions();
