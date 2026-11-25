const mongoose = require('../server/node_modules/mongoose');
require('../server/node_modules/dotenv').config({ path: 'server/.env' });

async function searchAll() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  for (const col of collections) {
    const name = col.name;
    const count = await db.collection(name).countDocuments({
      $or: [
        { name: /Integrity/i },
        { title: /Integrity/i },
        { email: /Integrity/i },
        { category: /Integrity/i }
      ]
    }).catch(() => 0);
    if (count > 0) {
      console.log(`Found ${count} in ${name}`);
    }
  }
  console.log('Search complete.');
  await mongoose.disconnect();
}
searchAll();
