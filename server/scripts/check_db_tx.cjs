const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');
    try {
        const s = await mongoose.startSession();
        s.startTransaction();
        console.log('TRANSACTIONS SUPPORTED: YES');
        await s.abortTransaction();
        await s.endSession();
    } catch(e) {
        console.log('TRANSACTIONS SUPPORTED: NO -', e.message);
    }
    await mongoose.disconnect();
}
check();
