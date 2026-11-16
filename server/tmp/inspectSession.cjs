// inspect session .cjs script
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Session = require('../models/Session.js').default;
    const s = await Session.findOne({ sessionId: 'SES-1794481162380-GWRRG' }).lean();
    console.log('Session:', JSON.stringify(s, null, 2));
  } catch (e) {
    console.error('Error', e);
  } finally {
    await mongoose.disconnect();
  }
})();
