const mongoose = require('../node_modules/mongoose');
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const s = await Session.find({
    startTime: {
      $gte: new Date("2026-11-20T00:00:00.000Z"),
      $lte: new Date("2026-11-21T00:00:00.000Z")
    }
  }).lean();
  console.log("Sessions on Nov 20:", s.length);
  s.forEach(x => console.log(x.sessionId, x.status, x.startTime, x.endTime));
  await mongoose.disconnect();
}
check();
