const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkExperts() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Expert = (await import('../models/expertModel.js')).default;
  const experts = await Expert.find({}).lean();
  console.log('Experts found:', experts.length);
  for (const e of experts) {
    console.log('\n--- EXPERT ---');
    console.log('Expert _id:', e._id, 'userId:', e.userId);
    console.log('Name:', e.personalInformation?.userName);
    console.log('Timezone:', e.timezone || e.personalInformation?.timezone);
    console.log('Schedule structure:', JSON.stringify(e.schedule, null, 2));
    console.log('Availability field:', JSON.stringify(e.availability, null, 2));
  }
  await mongoose.disconnect();
}
checkExperts().catch(console.error);
