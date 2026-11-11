const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkCategoryFields() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const sample = await mongoose.connection.collection('expertdetails').findOne({ "personalInformation.category": { $exists: true } });
  console.log("Keys in expertdetails:", Object.keys(sample));
  console.log("personalInformation:", sample.personalInformation);
  console.log("professionalDetails:", sample.professionalDetails);
  console.log("skillsAndExpertise:", sample.skillsAndExpertise);

  // Check if any expert has categoryId
  const withCatId = await mongoose.connection.collection('expertdetails').find({
    $or: [
      { categoryId: { $exists: true } },
      { "personalInformation.categoryId": { $exists: true } },
      { categories: { $exists: true } }
    ]
  }).toArray();
  console.log("Experts with explicit categoryId field:", withCatId.length);

  await mongoose.disconnect();
}

checkCategoryFields().catch(console.error);
