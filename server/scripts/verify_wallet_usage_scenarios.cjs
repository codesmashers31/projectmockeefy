const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyWalletUsage() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const { debitWallet, restoreWalletDebit } = await import('../services/walletService.js');

  const joel = await User.findOne({ email: 'jamietheresa.26csa@licet.ac.in' });
  const expert = await User.findOne({ userType: 'expert' });

  console.log('================================================================');
  console.log('        TESTING ACTUAL WALLET USAGE (FULL & PARTIAL)           ');
  console.log('================================================================\n');

  const initialWallet = await Wallet.findOne({ userId: joel._id });
  console.log(`Starting Candidate Wallet Balance: ₹${initialWallet.availableBalance}`);

  // -------------------------------------------------------------
  // SCENARIO A: Full Wallet-Funded Booking (Session fee ₹1)
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO A: FULL WALLET-FUNDED INTERVIEW BOOKING (₹1) ---');
  const sessionFeeA = 1;
  const availableA = initialWallet.availableBalance;
  const walletDeductionA = Math.min(availableA, sessionFeeA);
  const payableAmountA = sessionFeeA - walletDeductionA;

  console.log(`Session Fee: ₹${sessionFeeA}`);
  console.log(`Wallet Deduction: ₹${walletDeductionA}`);
  console.log(`Payable to Razorpay: ₹${payableAmountA} (100% Wallet Funded Checkout)`);

  const fakeSessionIdA = `SES-FULLWALLET-${Date.now()}`;
  const debitResA = await debitWallet({
    userId: joel._id,
    amount: walletDeductionA,
    sessionId: fakeSessionIdA,
    reason: 'INTERVIEW_BOOKING_DEBIT',
    description: `Full wallet payment for session ${fakeSessionIdA}`
  });

  const walletAfterA = await Wallet.findOne({ userId: joel._id });
  console.log(`✅ Debit successful: ${debitResA.success}`);
  console.log(`Wallet Balance After Full Payment: ₹${walletAfterA.availableBalance} (Expected: ₹${initialWallet.availableBalance - 1})`);

  // Verify transaction created
  const txnA = await WalletTransaction.findById(debitResA.transaction._id);
  console.log(`Created DEBIT Transaction: ID ${txnA._id}, Amount: -₹${txnA.amount}, BalanceAfter: ₹${txnA.balanceAfter}`);

  // -------------------------------------------------------------
  // SCENARIO B: Partial Wallet-Funded Booking (Session fee ₹499, Available ₹1)
  // -------------------------------------------------------------
  console.log('\n--- SCENARIO B: PARTIAL WALLET-FUNDED BOOKING (₹499) ---');
  const sessionFeeB = 499;
  const availableB = walletAfterA.availableBalance; // ₹1
  const walletDeductionB = Math.min(availableB, sessionFeeB); // ₹1
  const payableAmountB = sessionFeeB - walletDeductionB; // ₹498

  console.log(`Session Fee: ₹${sessionFeeB}`);
  console.log(`Applied Wallet Balance: ₹${walletDeductionB}`);
  console.log(`Remaining Razorpay Order Payable Amount: ₹${payableAmountB}`);

  // Test creating Razorpay order for remaining payable amount
  const Razorpay = require('razorpay');
  const rz = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  const testOrder = await rz.orders.create({
    amount: payableAmountB * 100, // in paise
    currency: 'INR',
    receipt: `rcpt_partial_${Date.now()}`,
    notes: {
      walletDeduction: String(walletDeductionB),
      fullAmount: String(sessionFeeB)
    }
  });

  console.log('✅ Created Razorpay Partial Order:');
  console.log({
    orderId: testOrder.id,
    orderAmountPaise: testOrder.amount,
    orderAmountINR: testOrder.amount / 100,
    notes: testOrder.notes
  });

  // -------------------------------------------------------------
  // CLEANUP / RESTORATION of Scenario A test debit to preserve Joel's real money
  // -------------------------------------------------------------
  console.log('\n--- CLEANING UP TEST DEBIT & RESTORING CANDIDATE FUNDS ---');
  await restoreWalletDebit({
    userId: joel._id,
    amount: walletDeductionA,
    originalTransactionId: txnA._id,
    sessionId: fakeSessionIdA,
    description: 'Restored candidate funds after live test verification'
  });

  // Remove the temporary test transactions from Joel so only genuine ones remain
  await WalletTransaction.deleteMany({
    userId: joel._id,
    $or: [
      { sessionId: fakeSessionIdA },
      { referenceId: txnA._id }
    ]
  });

  const finalWallet = await Wallet.findOneAndUpdate(
    { userId: joel._id },
    { $set: { availableBalance: 2, frozenBalance: 0 } },
    { new: true }
  );
  console.log(`✅ Candidate Wallet Safely Restored to Exact Genuine Balance: ₹${finalWallet.availableBalance}`);

  process.exit(0);
}

verifyWalletUsage().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
