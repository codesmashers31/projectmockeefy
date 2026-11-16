const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const categories = await mongoose.connection.collection('categories').find().toArray();
  console.log(`\n--- ALL CATEGORIES IN DB (${categories.length}) ---`);
  categories.forEach(c => console.log(`ID: ${c._id} | Name: "${c.name}" | Status: ${c.status}`));

  const experts = await mongoose.connection.collection('expertdetails').find().toArray();
  console.log(`\n--- ALL EXPERT DETAILS IN DB (${experts.length}) ---`);
  for (const e of experts) {
    const user = await mongoose.connection.collection('users').findOne({ _id: e.userId });
    console.log(`Expert ID: ${e._id} | User: ${user ? user.name : 'Unknown'} (${e.userId}) | Status: ${e.status}`);
    console.log(`  personalInformation.category: "${e.personalInformation?.category}"`);
    console.log(`  professionalDetails.industry: "${e.professionalDetails?.industry}"`);
    console.log(`  skillsAndExpertise.domains: ${JSON.stringify(e.skillsAndExpertise?.domains)}`);
    console.log(`  skills: ${JSON.stringify(e.skillsAndExpertise?.tools || [])}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
