const mongoose = require('../node_modules/mongoose');
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Expert = (await import('../models/expertModel.js')).default;
  const expert = await Expert.findById('6ae2e7cf2ad1edd333f2aded').lean();
  console.log('=== EXPERT PROFILE 6ae2e7cf2ad1edd333f2aded ===');
  console.log('Full weekly schedule:', JSON.stringify(expert.availability?.weekly, null, 2));
  console.log('sessionDuration:', expert.availability?.sessionDuration);
  console.log('allowedDurations:', expert.availability?.allowedDurations);
  console.log('breakDates:', expert.availability?.breakDates);
  console.log('updatedAt:', expert.updatedAt);

  console.log('\n=== SEARCH ALL EXPERTS FOR 21:30 or 09:30 PM ===');
  const allExperts = await Expert.find({}).lean();
  for (const e of allExperts) {
    const weeklyStr = JSON.stringify(e.availability?.weekly || {});
    if (weeklyStr.includes('21:30') || weeklyStr.includes('09:30 PM') || weeklyStr.includes('9:30')) {
      console.log('Match found in Expert ID:', e._id, 'User:', e.userId, 'Friday:', e.availability?.weekly?.fri || e.availability?.weekly?.friday);
    }
  }

  await mongoose.disconnect();
}
check().catch(console.error);
