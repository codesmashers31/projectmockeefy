const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function profile() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const { getEligibleCompletedSessions } = await import('../controllers/certificationController.js');

  const completedSession = await Session.findOne({ status: 'completed' });
  if (!completedSession) {
    console.log('No completed sessions found');
    process.exit(0);
  }

  const candId = completedSession.candidateId;
  console.log('Testing Candidate with completed session:', candId);

  const startFull = process.hrtime.bigint();
  const res = await getEligibleCompletedSessions(candId);
  const durFull = Number(process.hrtime.bigint() - startFull) / 1e6;
  console.log(`Full getEligibleCompletedSessions: ${durFull.toFixed(2)} ms (Returned: ${res.length} sessions)`);

  await mongoose.disconnect();
}
profile().catch(console.error);
