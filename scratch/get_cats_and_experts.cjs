const mongoose = require('../server/node_modules/mongoose');
require('../server/node_modules/dotenv').config({ path: 'server/.env' });

async function getStats() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const totalCats = await db.collection('categories').countDocuments();
  console.log('Total categories in db:', totalCats);
  const sampleCats = await db.collection('categories').find({}).limit(5).toArray();
  console.log('Sample categories:', sampleCats);

  const totalProfiles = await db.collection('userprofiles').countDocuments();
  console.log('Total userprofiles in db:', totalProfiles);
  const sampleProfiles = await db.collection('userprofiles').find({}).limit(5).toArray();
  console.log('Sample userprofiles:', sampleProfiles);

  const totalUsers = await db.collection('users').countDocuments();
  console.log('Total users in db:', totalUsers);

  await mongoose.disconnect();
}
getStats();
