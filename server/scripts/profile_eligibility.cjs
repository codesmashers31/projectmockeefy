const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function profile() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = (await import('../models/User.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const { getEligibleCompletedSessions } = await import('../controllers/certificationController.js');

  const candidateUser = await User.findOne({ $or: [{ role: 'candidate' }, { userType: 'candidate' }] });
  console.log('Testing Candidate:', candidateUser._id, candidateUser.name);

  const t0 = process.hrtime.bigint();
  const sessions = await Session.find({
    candidateId: candidateUser._id,
    status: { $in: ['completed', 'evaluated'] }
  }).sort({ startTime: 1 }).explain("executionStats");
  const tSessions = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log('Session find explain executionTimeMillis:', sessions.executionStats.executionTimeMillis, `(Total Node: ${tSessions.toFixed(2)} ms)`);
  console.log('Index used for Session.find:', sessions.queryPlanner.winningPlan.inputStage?.indexName || sessions.queryPlanner.winningPlan.stage);

  // Profile getEligibleCompletedSessions full
  const startFull = process.hrtime.bigint();
  const res = await getEligibleCompletedSessions(candidateUser._id);
  const durFull = Number(process.hrtime.bigint() - startFull) / 1e6;
  console.log(`Full getEligibleCompletedSessions: ${durFull.toFixed(2)} ms (Returned: ${res.length} sessions)`);

  await mongoose.disconnect();
}
profile().catch(console.error);
