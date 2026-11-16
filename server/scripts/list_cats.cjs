const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const cats = await mongoose.connection.collection('categories').find().toArray();
  console.log(cats.map(c => ({ name: c.name, status: c.status })));
  await mongoose.disconnect();
}
run();
