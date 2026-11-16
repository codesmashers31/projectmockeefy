const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const expertOid = new mongoose.Types.ObjectId('6ae2e7cf2ad1edd333f2aded');
  const userOid = new mongoose.Types.ObjectId('6ae2e7c92ad1edd333f2ade2');

  const sessions = await db.collection('sessions').find({
    startTime: {
      $gte: new Date('2026-11-12T18:30:00.000Z'),
      $lt: new Date('2026-11-13T18:30:00.000Z')
    },
    $or: [
      { expertId: { $in: [expertOid, userOid, '6ae2e7cf2ad1edd333f2aded', '6ae2e7c92ad1edd333f2ade2'] } },
      { 'expert.id': { $in: [expertOid, userOid, '6ae2e7cf2ad1edd333f2aded', '6ae2e7c92ad1edd333f2ade2'] } }
    ]
  }).toArray();

  console.log('Sessions for Expert Joel on 2026-11-13 IST:', sessions.length);
  sessions.forEach(s => {
    console.log(s.sessionId, '| status:', s.status, '| start:', s.startTime, '| end:', s.endTime);
  });

  await mongoose.disconnect();
  process.exit(0);
}
check();
