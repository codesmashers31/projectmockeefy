const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const expert = await db.collection('expertdetails').findOne({ _id: new mongoose.Types.ObjectId('6ae2e7cf2ad1edd333f2aded') });
  console.log('Expert ID:', expert._id, 'UserId:', expert.userId);

  const sessions = await db.collection('sessions').find({
    startTime: {
      $gte: new Date('2026-11-12T18:30:00.000Z'),
      $lt: new Date('2026-11-13T18:30:00.000Z')
    }
  }).toArray();

  console.log('Total sessions on 2026-11-13 in DB:', sessions.length);
  sessions.forEach(s => {
    console.log(s.sessionId, '| expertId:', s.expertId, '| candidateId:', s.candidateId, '| status:', s.status, '| start:', s.startTime);
  });

  await mongoose.disconnect();
  process.exit(0);
}
check();
