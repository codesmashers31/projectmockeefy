const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectExpert() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const ExpertDetails = (await import('../models/expertModel.js')).default;

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const expertUser = await User.findById(expertId);
  const expertDoc = await ExpertDetails.findOne({
    $or: [{ _id: expertId }, { userId: expertId }]
  });

  console.log('--- Expert User ---');
  console.log(expertUser ? {
    id: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    userType: expertUser.userType
  } : 'Not found');

  console.log('--- Expert Details ---');
  console.log(expertDoc ? {
    id: expertDoc._id,
    pricing: expertDoc.pricing,
    professionalDetails: expertDoc.professionalDetails
  } : 'Not found');

  process.exit(0);
}
inspectExpert();
