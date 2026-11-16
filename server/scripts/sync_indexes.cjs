const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function sync() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const collection = mongoose.connection.collection('sessions');
  try {
    await collection.dropIndex('slotLockKey_1');
    console.log('Dropped old slotLockKey_1 index');
  } catch (e) {
    console.log('Note on dropIndex:', e.message);
  }
  const Session = (await import('../models/Session.js')).default;
  await Session.syncIndexes();
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  await PaymentRecord.syncIndexes();
  console.log('Synced Session & PaymentRecord indexes successfully');
  await mongoose.disconnect();
}
sync().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
