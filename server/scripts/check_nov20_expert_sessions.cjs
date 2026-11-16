const mongoose = require('../node_modules/mongoose');
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const s = await Session.find({
    expertId: '6ae2e7cf2ad1edd333f2aded',
    startTime: {
      $gte: new Date('2026-11-20T00:00:00.000Z'),
      $lte: new Date('2026-11-21T00:00:00.000Z')
    }
  }).lean();
  console.log('Nov 20 sessions for expert:', s.map(x => ({
    id: x.sessionId,
    status: x.status,
    startUTC: x.startTime,
    startIST: new Date(x.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
    endIST: new Date(x.endTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  })));
  await mongoose.disconnect();
}
check();
