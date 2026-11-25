const mongoose = require('../server/node_modules/mongoose');
const dotenv = require('../server/node_modules/dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

async function printJoelSessions() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const joelUser = await db.collection('users').findOne({ email: 'joel.26csa@licet.ac.in' });
  const joelExpert = await db.collection('expertdetails').findOne({ userId: joelUser._id });

  const sessions = await db.collection('sessions').find({
    $or: [
      { expertId: joelExpert._id },
      { expertId: joelUser._id },
      { 'expert.id': joelExpert._id.toString() },
      { 'expert.id': joelUser._id.toString() }
    ]
  }).toArray();

  console.log('Total sessions:', sessions.length);
  for (const s of sessions) {
    const startIST = new Date(s.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const endIST = new Date(s.endTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`Session ${s.sessionId}:`);
    console.log(`   Start: ${s.startTime?.toISOString()} (${startIST})`);
    console.log(`   End:   ${s.endTime?.toISOString()} (${endIST})`);
    console.log(`   Status: ${s.status}`);
    console.log(`   slotLockKey: ${s.slotLockKey}`);
    console.log(`   candidateId: ${s.candidateId}`);
  }

  await mongoose.disconnect();
}

printJoelSessions().catch(console.error);
