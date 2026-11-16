/**
 * ACCEPTANCE TEST GAP 3: PAYMENT CASE C — EXPIRED ORIGINAL SESSION
 * 
 * Verifies the exact Case C edge case:
 * - Interview Slot: 09:00 – 09:30
 * - Booking Cutoff: 09:20
 * - Razorpay capture time: 09:19 (captured strictly before cutoff)
 * - Reconciliation/processing time: After 09:30 (slot has concluded)
 * - Original slot is expired / no longer eligible for confirmation.
 * 
 * Assertions:
 * 1. No expired Session is created in the database.
 * 2. Exact captured amount is credited to the candidate's wallet.
 * 3. Exactly one WalletTransaction record is created.
 * 4. PaymentRecord is finalized to status: 'verified', walletCredited: true.
 * 5. Duplicate reconciliation replay cannot credit twice (idempotency).
 */

const mongoose = require('mongoose');
const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('========================================================================');
  console.log('🚀 ACCEPTANCE TEST GAP 3: PAYMENT CASE C (EXPIRED SLOT RECONCILIATION)');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB: ' + mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const { setRazorpayClient } = await import('../services/refundService.js');
  const { reconcileSinglePayment } = await import('../services/paymentReconciliationService.js');

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // 1. Create isolated candidate & expert
  const candidate = await User.create({
    name: 'Case C Candidate ' + testSuffix,
    email: `case_c_cand_${testSuffix}@mockeefy.test`,
    password: 'password123',
    role: 'candidate',
    userType: 'candidate',
    walletBalance: 0
  });

  const expertUser = await User.create({
    name: 'Case C Expert ' + testSuffix,
    email: `case_c_exp_${testSuffix}@mockeefy.test`,
    password: 'password123',
    role: 'expert',
    userType: 'expert',
    walletBalance: 0
  });

  const expertDoc = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    approvalStatus: 'approved',
    isApproved: true,
    verificationStatus: 'verified',
    pricing: { sessionPrice: 500 }
  });

  // Ensure wallet exists for candidate with 0 balance
  await Wallet.findOneAndUpdate(
    { userId: candidate._id },
    { $set: { balance: 0, currency: 'INR' } },
    { upsert: true }
  );

  // 2. Define Timestamps for Case C:
  // Slot in the past: 09:00 - 09:30
  // Today's date with fixed hour for clarity:
  const baseDate = new Date();
  baseDate.setHours(9, 0, 0, 0); // 09:00:00
  const slotStartTime = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000); // Yesterday 09:00:00
  const slotEndTime = new Date(slotStartTime.getTime() + 30 * 60 * 1000);   // Yesterday 09:30:00
  const slotCutoffTime = new Date(slotEndTime.getTime() - 10 * 60 * 1000);  // Yesterday 09:20:00
  const captureTime = new Date(slotStartTime.getTime() + 19 * 60 * 1000);   // Yesterday 09:19:00 (< 09:20:00)

  const paymentId = `pay_case_c_${testSuffix}`;
  const orderId = `order_case_c_${testSuffix}`;
  const paymentAmountINR = 500;

  console.log('--- Case C Scenario Parameters ---');
  console.log(`Slot Start:           ${slotStartTime.toISOString()} (09:00 AM)`);
  console.log(`Slot Cutoff (10m):    ${slotCutoffTime.toISOString()} (09:20 AM)`);
  console.log(`Authoritative Capture:${captureTime.toISOString()} (09:19 AM - BEFORE CUTOFF)`);
  console.log(`Slot End Time:        ${slotEndTime.toISOString()} (09:30 AM)`);
  console.log(`Reconciliation Time:  ${new Date().toISOString()} (AFTER 09:30 AM - SLOT CONCLUDED)\n`);

  // 3. Create initial PaymentRecord in 'awaiting_reconciliation'
  const paymentRecord = await PaymentRecord.create({
    paymentId,
    orderId,
    userId: candidate._id,
    paymentType: 'booking',
    amount: paymentAmountINR,
    status: 'awaiting_reconciliation',
    reconciliationStatus: 'awaiting_capture_timestamp',
    metadata: {
      bookingDetails: {
        expertId: expertDoc._id.toString(),
        candidateId: candidate._id.toString(),
        startTime: slotStartTime,
        endTime: slotEndTime,
        duration: 30,
        price: paymentAmountINR
      }
    }
  });

  // 4. Mock Razorpay Client to return authoritative capture at 09:19:00
  const mockRazorpay = {
    payments: {
      fetch: async (id) => {
        if (id === paymentId) {
          return {
            id: paymentId,
            status: 'captured',
            amount: paymentAmountINR * 100, // paise
            currency: 'INR',
            captured_at: Math.floor(captureTime.getTime() / 1000), // 09:19 in epoch seconds
            created_at: Math.floor(slotStartTime.getTime() / 1000)
          };
        }
        throw new Error('Payment not found in mock');
      }
    }
  };

  setRazorpayClient(mockRazorpay);

  // 5. Execute first reconciliation run
  console.log('Executing reconcileSinglePayment (Attempt 1)...');
  const result1 = await reconcileSinglePayment(paymentRecord._id);
  console.log('Reconciliation Result 1:', result1);

  // Assertions for Run 1:
  assert.strictEqual(result1.success, true, 'Reconciliation must succeed');
  assert.strictEqual(result1.outcome, 'WALLET_CREDITED', 'Outcome must be WALLET_CREDITED because slot concluded');
  assert.strictEqual(result1.amount, paymentAmountINR, `Credited amount must be exactly ₹${paymentAmountINR}`);

  // Check Database States:
  // A. No expired Session created
  const sessionCheck = await Session.findOne({ paymentId });
  assert.strictEqual(sessionCheck, null, 'No expired Session must be created in the database');
  console.log('✅ Criteria 1 Verified: Zero expired sessions created.');

  // B. Exact amount credited to candidate wallet
  const updatedWallet = await Wallet.findOne({ userId: candidate._id });
  assert.strictEqual(updatedWallet.availableBalance, paymentAmountINR, `Wallet balance must be exactly ₹${paymentAmountINR}`);
  console.log(`✅ Criteria 2 Verified: Exact captured amount (₹${paymentAmountINR}) credited to candidate wallet.`);

  // C. Exactly one WalletTransaction created
  const txns = await WalletTransaction.find({ paymentId });
  assert.strictEqual(txns.length, 1, 'Exactly one WalletTransaction must be created');
  assert.strictEqual(txns[0].amount, paymentAmountINR);
  assert.strictEqual(txns[0].type, 'CREDIT');
  assert.strictEqual(txns[0].reason, 'CUTOFF_EXPIRED_CREDIT');
  console.log('✅ Criteria 3 Verified: Exactly one WalletTransaction created (Type: CREDIT, Reason: CUTOFF_EXPIRED_CREDIT).');

  // D. PaymentRecord finalized
  const updatedRecord = await PaymentRecord.findById(paymentRecord._id);
  assert.strictEqual(updatedRecord.status, 'verified', 'PaymentRecord status must be verified');
  assert.strictEqual(updatedRecord.reconciliationStatus, 'reconciled');
  assert.strictEqual(updatedRecord.walletCredited, true, 'walletCredited flag must be true');
  assert.strictEqual(updatedRecord.cutoffExpired, true);
  console.log('✅ Criteria 4 Verified: PaymentRecord finalized to status: verified, walletCredited: true.');

  // 6. Execute duplicate reconciliation replay (Attempt 2)
  console.log('\nExecuting duplicate reconcileSinglePayment (Attempt 2 - Replay)...');
  const result2 = await reconcileSinglePayment(paymentRecord._id);
  console.log('Reconciliation Result 2:', result2);

  assert.strictEqual(result2.alreadyResolved, true, 'Replay must detect alreadyResolved: true');

  // Verify wallet balance has NOT changed (no double crediting)
  const walletAfterReplay = await Wallet.findOne({ userId: candidate._id });
  assert.strictEqual(walletAfterReplay.availableBalance, paymentAmountINR, 'Wallet balance must remain unchanged after replay');

  const txnsAfterReplay = await WalletTransaction.find({ paymentId });
  assert.strictEqual(txnsAfterReplay.length, 1, 'Still exactly one WalletTransaction exists (no duplicate credit)');
  console.log('✅ Criteria 5 Verified: Duplicate reconciliation replay rejected, zero double-crediting.');

  // Clean up test records
  await PaymentRecord.deleteOne({ _id: paymentRecord._id });
  await WalletTransaction.deleteMany({ paymentId });
  await Wallet.deleteOne({ userId: candidate._id });
  await Expert.deleteOne({ _id: expertDoc._id });
  await User.deleteMany({ _id: { $in: [candidate._id, expertUser._id] } });

  console.log('\n🎉 ALL ACCEPTANCE TEST GAP 3 CRITERIA PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test Gap 3 Error:', err);
  process.exit(1);
});
