const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function inspectSession() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const s = await Session.findOne({ sessionId: 'session-1794564396074-dt620opk2' }).lean();
  console.log('Session details:');
  console.log(JSON.stringify(s, null, 2));

  console.log('\nConverted to IST:');
  console.log('startTime UTC:', s.startTime.toISOString());
  console.log('endTime UTC:', s.endTime.toISOString());
  console.log('startTime IST:', new Date(s.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  console.log('endTime IST:', new Date(s.endTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  await mongoose.disconnect();
}
inspectSession().catch(console.error);
