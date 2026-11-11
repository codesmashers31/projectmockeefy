const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkAvailability() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const experts = await mongoose.connection.collection('expertdetails').find({
    status: { $in: ["Active", "approved"] },
    "settings.publicProfile": { $ne: false }
  }).toArray();

  let withWeekly = 0;
  let emptyWeekly = 0;
  const daysFound = new Set();

  for (const e of experts) {
    const weekly = e.availability?.weekly;
    if (weekly && Object.keys(weekly).length > 0) {
      withWeekly++;
      Object.keys(weekly).forEach(d => daysFound.add(d));
    } else {
      emptyWeekly++;
    }
  }

  console.log(`Experts with weekly availability: ${withWeekly}`);
  console.log(`Experts without weekly availability: ${emptyWeekly}`);
  console.log(`Days in weekly schedules:`, Array.from(daysFound));

  // Let's sample 3 experts with weekly availability
  const sample = experts.filter(e => e.availability?.weekly && Object.keys(e.availability.weekly).length > 0).slice(0, 3);
  for (const s of sample) {
    console.log(`Sample Expert (${s._id}):`, JSON.stringify(s.availability, null, 2));
  }

  await mongoose.disconnect();
}

checkAvailability().catch(console.error);
