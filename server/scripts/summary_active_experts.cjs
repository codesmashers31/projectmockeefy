const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkExperts() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const experts = await mongoose.connection.collection('expertdetails').find({
    status: { $in: ["Active", "approved"] },
    "settings.publicProfile": { $ne: false }
  }).toArray();

  console.log(`Eligible active/approved experts with public profile: ${experts.length}`);
  
  const catSummary = {};
  for (const e of experts) {
    const user = await mongoose.connection.collection('users').findOne({ _id: e.userId });
    if (!user) {
      console.log(`Skipping expert ${e._id} - user account missing`);
      continue;
    }
    const primaryCat = e.personalInformation?.category || "Unassigned";
    const domains = e.skillsAndExpertise?.domains || [];
    catSummary[primaryCat] = (catSummary[primaryCat] || 0) + 1;
    console.log(`Expert: ${user.name.padEnd(25)} | Category: ${primaryCat.padEnd(30)} | Domains: ${JSON.stringify(domains)}`);
  }

  console.log("\nSummary of active experts by primary category:");
  console.log(catSummary);

  await mongoose.disconnect();
}

checkExperts().catch(console.error);
