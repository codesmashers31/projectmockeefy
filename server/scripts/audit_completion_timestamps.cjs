const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkDocs() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const countWithCompletedAt = await db.collection('sessions').countDocuments({ completedAt: { $exists: true, $ne: null } });
  const countTotalSessions = await db.collection('sessions').countDocuments({});
  const countWithActualEndTime = await db.collection('sessions').countDocuments({ actualEndTime: { $exists: true, $ne: null } });
  const countCompletedStatus = await db.collection('sessions').countDocuments({ status: 'completed' });
  
  console.log('Total sessions in DB:', countTotalSessions);
  console.log('Sessions with status = "completed":', countCompletedStatus);
  console.log('Sessions with completedAt in DB:', countWithCompletedAt);
  console.log('Sessions with actualEndTime in DB:', countWithActualEndTime);
  
  await mongoose.disconnect();
}
checkDocs().catch(console.error);
