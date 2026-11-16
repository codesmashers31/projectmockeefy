const mongoose = require('mongoose');
const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('========================================================================');
  console.log('🚀 TESTING EXPERT PAYOUT 80% CALCULATION & VERIFIED PAYMENT INTEGRITY');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB replica set:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const { markCandidateNoShow } = await import('../controllers/sessionController.js');

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const expertUser = await User.create({
    name: 'Payout Expert ' + testSuffix,
    email: `expert_payout_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'expert',
    userType: 'expert',
    walletBalance: 0
  });

  const expertDoc = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    approvalStatus: 'approved',
    verificationStatus: 'verified',
    category: 'MERN Stack'
  });

  const candidateUser = await User.create({
    name: 'Payout Candidate ' + testSuffix,
    email: `cand_payout_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'candidate',
    userType: 'candidate'
  });

  await Wallet.create({
    userId: expertUser._id,
    availableBalance: 0,
    frozenBalance: 0,
    currency: 'INR'
  });

  const scenarios = [
    {
      name: '1. Razorpay-only payment (Verified)',
      price: 1000,
      paymentRecordStatus: 'verified',
      paymentSource: 'RAZORPAY',
      expectedPayout: 800,
      shouldCredit: true
    },
    {
      name: '2. Full wallet payment (Verified)',
      price: 500,
      paymentRecordStatus: 'verified',
      paymentSource: 'WALLET',
      expectedPayout: 400,
      shouldCredit: true
    },
    {
      name: '3. Partial wallet + Razorpay (Verified)',
      price: 750,
      paymentRecordStatus: 'verified',
      paymentSource: 'PARTIAL_WALLET_RAZORPAY',
      expectedPayout: 600,
      shouldCredit: true
    },
    {
      name: '4. Discounted booking (Verified, price=400)',
      price: 400,
      paymentRecordStatus: 'verified',
      paymentSource: 'RAZORPAY',
      expectedPayout: 320,
      shouldCredit: true
    },
    {
      name: '5. Free promotional booking (price=0)',
      price: 0,
      paymentRecordStatus: null,
      paymentSource: 'FREE',
      expectedPayout: 0,
      shouldCredit: false
    },
    {
      name: '6. Unverified/Failed payment (status=failed)',
      price: 600,
      paymentRecordStatus: 'failed',
      paymentSource: 'RAZORPAY',
      expectedPayout: 0,
      shouldCredit: false
    }
  ];

  let cumulativeBalance = 0;

  for (const sc of scenarios) {
    const sId = `ses_pay_${testSuffix}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    // 16 minutes after start so grace period has passed
    const startTime = new Date(now.getTime() - 16 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const sess = await Session.create({
      sessionId: sId,
      expertId: expertDoc._id,
      candidateId: candidateUser._id,
      status: 'confirmed',
      attendanceStatus: 'scheduled',
      startTime,
      endTime,
      duration: 30,
      price: sc.price
    });

    if (sc.paymentRecordStatus) {
      await PaymentRecord.create({
        sessionId: sId,
        paymentId: `pay_${sId}`,
        orderId: `order_${sId}`,
        amount: sc.price,
        status: sc.paymentRecordStatus,
        source: sc.paymentSource,
        userId: candidateUser._id,
        paymentType: 'booking'
      });
    }

    // Call markCandidateNoShow as expert
    let statusCode = 200;
    let resBody = null;
    const req = {
      params: { sessionId: sId },
      body: { reason: `Testing payout for ${sc.name}` },
      user: { userId: expertUser._id.toString(), userType: 'expert' }
    };
    const res = {
      status(c) { statusCode = c; return this; },
      json(d) { resBody = d; return this; }
    };

    await markCandidateNoShow(req, res);

    assert.strictEqual(statusCode, 200, `Scenario ${sc.name} markCandidateNoShow should return 200`);

    // Inspect updated session document
    const updatedSess = await Session.findById(sess._id);
    const expertWallet = await Wallet.findOne({ userId: expertUser._id });

    if (sc.shouldCredit) {
      cumulativeBalance += sc.expectedPayout;
      assert.strictEqual(updatedSess.payoutStatus, 'credited', `Scenario ${sc.name} payoutStatus must be credited`);
      assert.strictEqual(updatedSess.payoutAmount, sc.expectedPayout, `Scenario ${sc.name} payoutAmount must be 80% (${sc.expectedPayout})`);
      assert.strictEqual(expertWallet.availableBalance, cumulativeBalance, `Expert wallet balance must reflect +${sc.expectedPayout}`);

      // Verify transaction record
      const txn = await WalletTransaction.findOne({ referenceId: sess._id, type: 'CREDIT' });
      assert.ok(txn, `WalletTransaction must exist for ${sc.name}`);
      assert.strictEqual(txn.amount, sc.expectedPayout);
      console.log(`  ✅ [PASS] ${sc.name}: 80% payout of ₹${sc.expectedPayout} successfully credited to expert wallet.`);

      // Test duplicate prevention: call again on the same session
      let dupStatus = 200;
      let dupBody = null;
      const resDup = {
        status(c) { dupStatus = c; return this; },
        json(d) { dupBody = d; return this; }
      };
      await markCandidateNoShow(req, resDup);
      assert.strictEqual(dupStatus, 400, 'Duplicate absent call must be rejected with 400');
      const walletAfterDup = await Wallet.findOne({ userId: expertUser._id });
      assert.strictEqual(walletAfterDup.availableBalance, cumulativeBalance, 'Wallet balance must NOT increment on duplicate attempt');
      console.log(`  ✅ [PASS] Duplicate absent call correctly rejected with 400, no duplicate payout.`);
    } else {
      assert.strictEqual(updatedSess.payoutStatus, 'not_applicable', `Scenario ${sc.name} payoutStatus must be not_applicable`);
      assert.strictEqual(updatedSess.payoutAmount, 0, `Scenario ${sc.name} payoutAmount must be 0`);
      assert.strictEqual(expertWallet.availableBalance, cumulativeBalance, `Wallet balance must remain ₹${cumulativeBalance}`);
      console.log(`  ✅ [PASS] ${sc.name}: ₹0 payout assigned; payoutStatus set to 'not_applicable'.`);
    }

    // Cleanup session and payment records
    await Session.deleteOne({ _id: sess._id });
    await PaymentRecord.deleteOne({ sessionId: sId });
  }

  // Cleanup test accounts
  await WalletTransaction.deleteMany({ userId: expertUser._id });
  await Wallet.deleteOne({ userId: expertUser._id });
  await Expert.deleteOne({ _id: expertDoc._id });
  await User.deleteMany({ _id: { $in: [expertUser._id, candidateUser._id] } });
  await mongoose.disconnect();

  console.log('\n========================================================================');
  console.log('🎉 ALL 6 EXPERT PAYOUT SCENARIOS & DUPLICATE PREVENTION 100% VERIFIED!');
  console.log('========================================================================');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
