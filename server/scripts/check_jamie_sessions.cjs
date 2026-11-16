const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  require('../models/Session');
  const Session = mongoose.model('Session');
  const jamieId = new mongoose.Types.ObjectId('6af326acf549d9aa26049ba4');
  const jamieSessions = await Session.find({ candidateId: jamieId });
  console.log('Jamie sessions:', jamieSessions.map(s => ({
    id: s._id,
    status: s.status,
    attendanceStatus: s.attendanceStatus,
    expertReview: s.expertReview ? 'Yes' : 'No'
  })));
  process.exit(0);
}
run();
