const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function sanitize() {
  await mongoose.connect(process.env.MONGO_URI);
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
  const outbox = await EmailOutbox.find({ html: { $regex: /localhost|127\.0\.0\.1/i } });
  console.log('Found records to sanitize:', outbox.length);
  for (const doc of outbox) {
    doc.html = doc.html.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi, 'https://mockeefy.com');
    await doc.save();
  }
  const remaining = await EmailOutbox.countDocuments({ html: { $regex: /localhost|127\.0\.0\.1/i } });
  console.log('Sanitization complete. Remaining records with localhost:', remaining);
  await mongoose.disconnect();
}

sanitize().catch(console.error);
