const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkFilters() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  
  // We can fetch via the expertController logic or directly
  const ExpertDetails = (await import('../models/expertModel.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const PricingRule = (await import('../models/PricingRule.js')).default;

  const experts = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).populate('userId').lean();
  console.log(`Total experts found: ${experts.length}`);

  const expRanges = { "0-2": 0, "3-5": 0, "6-10": 0, "10+": 0 };
  const prices = [];
  const cats = {};

  for (const e of experts) {
    const expNum = Number(e.professionalDetails?.totalExperience) || 0;
    if (expNum <= 2) expRanges["0-2"]++;
    else if (expNum <= 5) expRanges["3-5"]++;
    else if (expNum <= 10) expRanges["6-10"]++;
    else expRanges["10+"]++;

    const cName = e.personalInformation?.category || "Unassigned";
    cats[cName] = (cats[cName] || 0) + 1;
  }

  console.log("Experience breakdown:", expRanges);
  console.log("Category breakdown:", cats);

  await mongoose.disconnect();
}

checkFilters().catch(console.error);
