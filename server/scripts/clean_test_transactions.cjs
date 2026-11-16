const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanTestTransactionsFromJoel() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;

  const joel = await User.findOne({ email: 'jamietheresa.26csa@licet.ac.in' });
  if (!joel) {
    console.error('Joel not found');
    process.exit(1);
  }

  // Delete test transactions matching pay_t... or test orders
  const delRes = await WalletTransaction.deleteMany({
    userId: joel._id,
    $or: [
      { paymentId: { $regex: /^pay_t/ } },
      { orderId: { $regex: /^order_t/ } },
      { reason: 'TEST_SEED' },
      { description: { $regex: /Full wallet payment for session|Restored wallet funds/i } }
    ]
  });
  console.log('Deleted test transactions from Joel:', delRes.deletedCount);

  // Remaining genuine transactions
  const genuineTxns = await WalletTransaction.find({ userId: joel._id }).sort({ createdAt: 1 });
  console.log('Remaining genuine transactions for Joel (' + genuineTxns.length + '):');
  
  let balance = 0;
  for (const t of genuineTxns) {
    if (t.type === 'CREDIT') balance += t.amount;
    else if (t.type === 'DEBIT') balance -= t.amount;
    t.balanceAfter = balance;
    await t.save();
    console.log(`- ${t.type} ₹${t.amount} (${t.paymentId}) -> BalanceAfter: ₹${balance}`);
  }

  // Update Joel's wallet availableBalance to exact genuine balance
  const wallet = await Wallet.findOneAndUpdate(
    { userId: joel._id },
    { $set: { availableBalance: balance, frozenBalance: 0 } },
    { new: true }
  );

  console.log('\nFinal Clean Candidate Wallet:');
  console.log({
    userId: joel._id,
    email: joel.email,
    availableBalance: wallet.availableBalance,
    currency: wallet.currency,
    genuineTransactions: genuineTxns.length
  });

  process.exit(0);
}

cleanTestTransactionsFromJoel();
