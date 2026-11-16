const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const testIds = [
    'session-1794564396074-dt620opk2',
    'session-1794566869398-6b2yveqqi',
    'session-1794585395084-nolppccne',
    'session-1794586264656-i35z7gw37'
  ];

  const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6af326acf549d9aa26049ba4') });
  console.log('Candidate user walletBalance:', user ? user.walletBalance : null);

  const wallet = await db.collection('wallets').findOne({
    $or: [
      { userId: new mongoose.Types.ObjectId('6af326acf549d9aa26049ba4') },
      { user: new mongoose.Types.ObjectId('6af326acf549d9aa26049ba4') }
    ]
  });
  console.log('Wallet doc:', wallet);

  // Check all transactions for Candidate
  const allTxs = await db.collection('wallettransactions').find({
    userId: new mongoose.Types.ObjectId('6af326acf549d9aa26049ba4')
  }).sort({ createdAt: -1 }).limit(15).toArray();

  console.log('Recent transactions:');
  allTxs.forEach(t => console.log(t.createdAt, t.type, t.amount, t.description, t.sessionId, t.referenceId));

  await mongoose.disconnect();
  process.exit(0);
}
check();
