const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function findExpertsWithSchedule() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Expert = (await import('../models/expertModel.js')).default;
  const experts = await Expert.find({
    $or: [
      { 'availability.weekly.friday': { $exists: true, $ne: [] } },
      { 'availability.weekly.fri': { $exists: true, $ne: [] } },
      { 'schedule.friday': { $exists: true, $ne: [] } },
      { 'schedule.fri': { $exists: true, $ne: [] } }
    ]
  }).lean();

  console.log(`Found ${experts.length} experts with Friday availability.`);
  for (const e of experts) {
    const weekly = e.availability?.weekly || {};
    const fri = weekly.friday || weekly.fri;
    const schedFri = e.schedule?.friday || e.schedule?.fri;
    console.log(`Expert ID: ${e._id}, userId: ${e.userId}`);
    if (fri) console.log('  availability.weekly.fri(day):', JSON.stringify(fri));
    if (schedFri) console.log('  schedule.fri(day):', JSON.stringify(schedFri));
  }

  // Look for any 20:27 or 08:27
  const specific = await Expert.find({
    $or: [
      { 'availability.weekly.friday.from': { $regex: /20:27|08:27/ } },
      { 'availability.weekly.fri.from': { $regex: /20:27|08:27/ } },
      { 'schedule.friday.from': { $regex: /20:27|08:27/ } },
      { 'schedule.fri.from': { $regex: /20:27|08:27/ } }
    ]
  }).lean();
  console.log(`Experts matching 20:27 or 08:27:`, specific.length);
  for (const s of specific) {
    console.log('Match ID:', s._id, 'Schedule:', JSON.stringify(s.schedule), 'Availability:', JSON.stringify(s.availability));
  }

  await mongoose.disconnect();
}
findExpertsWithSchedule().catch(console.error);
