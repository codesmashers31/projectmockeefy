const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5000';

async function traceExpert() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Expert = (await import('../models/expertModel.js')).default;
  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;

  const expert = await Expert.findById('6ae2e7cf2ad1edd333f2aded').lean();
  const user = await User.findById(expert.userId).lean();

  console.log('=== EXPERT DETAILS ===');
  console.log('Expert ID:', expert._id);
  console.log('User ID:', expert.userId);
  console.log('User Email:', user?.email);
  console.log('User Name:', user?.name);
  console.log('Personal Info:', expert.personalInformation);
  console.log('Timezone in Expert:', expert.timezone);
  console.log('Availability in DB:');
  console.log(JSON.stringify(expert.availability, null, 2));

  // Now call public availability API for this expert
  console.log('\n=== CALLING PUBLIC AVAILABILITY API ===');
  try {
    const res1 = await axios.get(`${BASE_URL}/api/experts/${expert._id}/availability`);
    console.log(`GET /api/experts/${expert._id}/availability =>`, res1.status);
    console.log(JSON.stringify(res1.data, null, 2));
  } catch (err) {
    console.log(`GET /api/experts/${expert._id}/availability FAILED:`, err.response?.status, err.response?.data || err.message);
  }

  // Check what availability endpoints exist
  try {
    const res2 = await axios.get(`${BASE_URL}/api/experts/${expert._id}/slots?date=2026-11-13`);
    console.log(`GET /api/experts/${expert._id}/slots?date=2026-11-13 =>`, res2.status);
    console.log(JSON.stringify(res2.data, null, 2));
  } catch (err) {
    console.log(`GET slots failed:`, err.response?.status, err.response?.data || err.message);
  }

  // Check bookings/sessions for this expert on Nov 13
  const nov13Start = new Date('2026-11-13T00:00:00.000Z');
  const nov13End = new Date('2026-11-13T23:59:59.999Z');
  const existingSessions = await Session.find({
    $or: [{ expertId: expert._id }, { expertId: expert.userId }],
    startTime: { $gte: nov13Start, $lte: nov13End }
  }).lean();
  console.log(`\nExisting sessions for this expert on Nov 13:`, existingSessions.length);
  for (const s of existingSessions) {
    console.log('Session:', s.sessionId, s.status, s.startTime, s.endTime);
  }

  await mongoose.disconnect();
}
traceExpert().catch(console.error);
