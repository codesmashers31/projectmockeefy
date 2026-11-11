const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function findAdmin() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const admins = await db.collection('users').find({
        $or: [
            { userType: 'admin' },
            { role: 'admin' },
            { role: 'Admin' }
        ]
    }).toArray();
    console.log('Admins count:', admins.length);
    for (const a of admins) {
        console.log({ _id: a._id, name: a.name, email: a.email, userType: a.userType, role: a.role });
    }
    process.exit(0);
}
findAdmin();
