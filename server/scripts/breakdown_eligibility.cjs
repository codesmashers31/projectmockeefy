const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function profile() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const ReviewDetails = (await import('../models/reviewModel.js')).default;
  const Report = (await import('../models/Report.js')).default;
  const Meeting = (await import('../models/Meeting.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const candId = new mongoose.Types.ObjectId('69e84f2c95297b77e3372178');

  // Step 1
  let t = process.hrtime.bigint();
  const sessions = await Session.find({ candidateId: candId, status: { $in: ['completed', 'evaluated'] } }).sort({ startTime: 1 });
  console.log(`1. Session.find: ${(Number(process.hrtime.bigint() - t) / 1e6).toFixed(2)} ms (found ${sessions.length})`);

  const sessionIds = sessions.map(s => s.sessionId).filter(Boolean);
  const mongoIds = sessions.map(s => s._id).filter(Boolean);
  const allQueryIds = [...new Set([...sessionIds, ...mongoIds.map(String)])];
  const validObjectIds = allQueryIds.filter(id => mongoose.Types.ObjectId.isValid(id));

  // Step 2
  t = process.hrtime.bigint();
  const [er, cr, rep, meet] = await Promise.all([
    ReviewDetails.find({ sessionId: { $in: allQueryIds }, reviewerRole: 'expert' }).select('sessionId').lean(),
    ReviewDetails.find({ sessionId: { $in: allQueryIds }, reviewerRole: 'candidate' }).select('sessionId').lean(),
    Report.find({ sessionId: { $in: validObjectIds }, status: 'Submitted' }).select('sessionId').lean(),
    Meeting.find({ sessionId: { $in: allQueryIds } }).select('sessionId candidateId expertId status activeUsers').lean()
  ]);
  console.log(`2. Promise.all (Review + Report + Meeting): ${(Number(process.hrtime.bigint() - t) / 1e6).toFixed(2)} ms`);

  // Step 3
  t = process.hrtime.bigint();
  const cats = await Category.find({}).lean();
  console.log(`3. Category.find: ${(Number(process.hrtime.bigint() - t) / 1e6).toFixed(2)} ms`);

  await mongoose.disconnect();
}
profile().catch(console.error);
