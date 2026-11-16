const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectRules() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const PricingRule = (await import('../models/PricingRule.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const cat = await Category.findOne({ name: 'Full Stack Development (MERN)' });
  console.log('Category:', cat ? { id: cat._id, name: cat.name, amount: cat.amount } : 'Not found');

  if (cat) {
    const rules = await PricingRule.find({ categoryId: cat._id });
    console.log('Rules for Full Stack Development (MERN):', rules.map(r => ({
      level: r.level,
      duration: r.duration,
      price: r.price
    })));
  }

  process.exit(0);
}
inspectRules();
