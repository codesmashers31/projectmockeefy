const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkSlotReservation() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const Session = (await import('../models/Session.js')).default;

  const res = await SlotReservation.findOne({ orderId: 'order_TzDt60pWvFmRqk' }).lean();
  console.log('--- SLOT RESERVATION ---');
  console.log(JSON.stringify(res, null, 2));

  if (res) {
    const session = await Session.findOne({ 
      expertId: res.expertId, 
      startTime: res.startTime 
    }).lean();
    console.log('--- MATCHING SESSION ---');
    console.log(JSON.stringify(session, null, 2));
  }

  process.exit(0);
}

checkSlotReservation().catch(console.error);
