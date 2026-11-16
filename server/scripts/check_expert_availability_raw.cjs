const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;

    const profile = await db.collection('expertdetails').findOne({
      _id: new mongoose.Types.ObjectId('6ae2e7cf2ad1edd333f2aded')
    });

    console.log('--- RAW AVAILABILITY OBJECT ---');
    console.log(JSON.stringify(profile ? profile.availability : null, null, 2));

    console.log('--- WEEKLY.FRI VALUE ---');
    console.log(JSON.stringify(profile && profile.availability && profile.availability.weekly ? profile.availability.weekly.fri : null, null, 2));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
