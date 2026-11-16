const mongoose = require('mongoose');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runIntegrityVerification() {
  console.log('========================================================================');
  console.log('🚀 MOCKEEFY FINAL ACCEPTANCE: PAYMENT LIFECYCLE & WALLET INTEGRITY TEST');
  console.log('========================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB replica set:', mongoose.connection.name);

  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Session = (await import('../models/Session.js')).default;
  const Wallet = (await import('../models/Wallet.js')).default;
  const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
  const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
  const SlotReservation = (await import('../models/SlotReservation.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const PricingRule = (await import('../models/PricingRule.js')).default;

  const { setRazorpayClient } = await import('../services/refundService.js');

  // Injected Mock Razorpay Client with controllable timestamps
  let mockPaymentsDb = {};
  const mockRazorpay = {
    payments: {
      fetch: async (id) => {
        if (mockPaymentsDb[id]) return mockPaymentsDb[id];
        throw new Error(`Mock Payment ${id} not found`);
      },
      refund: async (id, opts) => {
        return { id: `rfnd_${Date.now()}`, entity: 'refund', amount: opts.amount, status: 'processed' };
      }
    },
    orders: {
      create: async (opts) => ({ id: `order_${Date.now()}`, amount: opts.amount, currency: opts.currency, notes: opts.notes })
    }
  };
  setRazorpayClient(mockRazorpay);
  const { creditWallet, debitWallet, restoreWalletDebit, getOrCreateWallet } = await import('../services/walletService.js');
  const { verifyPayment, bookWithWallet, createOrder, getAuthoritativeCaptureTimestamp } = await import('../controllers/paymentController.js');
  const { submitReview } = await import('../controllers/sessionController.js');
  const { reconcileSinglePayment } = await import('../services/paymentReconciliationService.js');

  function createMockRes() {
    const res = {
      statusCode: 200,
      data: null,
      status(code) {
        res.statusCode = code;
        return res;
      },
      json(payload) {
        res.data = payload;
        return res;
      }
    };
    return res;
  }

  const testSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  // Setup Category & PricingRule
  const catName = `IntegrityCat_${testSuffix}`;
  const testCat = await Category.create({ name: catName, description: 'Integrity Category', amount: 500 });
  await PricingRule.create({
    categoryId: testCat._id,
    skillId: null,
    level: 'Professional Mentor',
    duration: 30,
    price: 500
  });

  // Setup Expert
  const expertUser = await User.create({
    name: 'Dr. Integrity Expert',
    email: `exp_integ_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'expert',
    userType: 'expert',
    walletBalance: 0
  });

  const expertDoc = await Expert.create({
    userId: expertUser._id,
    name: expertUser.name,
    email: expertUser.email,
    personalInformation: { userName: expertUser.name, category: catName },
    professionalDetails: { level: 'Professional Mentor', title: 'Staff Engineer' },
    skillsAndExpertise: { domains: [catName] },
    pricing: { sessionPrice: 500 },
    availability: {
      sessionDuration: 30,
      maxPerDay: 20,
      weekly: {
        sunday: [{ from: '00:00', to: '23:59' }],
        monday: [{ from: '00:00', to: '23:59' }],
        tuesday: [{ from: '00:00', to: '23:59' }],
        wednesday: [{ from: '00:00', to: '23:59' }],
        thursday: [{ from: '00:00', to: '23:59' }],
        friday: [{ from: '00:00', to: '23:59' }],
        saturday: [{ from: '00:00', to: '23:59' }]
      }
    },
    status: 'Active',
    isActive: true,
    isApproved: true
  });

  // Setup Candidate
  const candidateUser = await User.create({
    name: 'Candidate Integrity',
    email: `cand_integ_${testSuffix}@mockeefy.test`,
    password: 'Password123!',
    role: 'candidate',
    userType: 'candidate',
    walletBalance: 1000
  });

  let candWallet = await Wallet.create({
    userId: candidateUser._id,
    availableBalance: 1000,
    frozenBalance: 0
  });

  console.log('\n--- CHECK 3: ORIGINAL PAYMENT LIFECYCLE (CASES A, B, C, D) ---');

  // CASE A: Payment captured before cutoff -> recovers booking if reservation and session valid
  console.log('\nTesting Case A: Payment captured strictly BEFORE cutoff...');
  const slotStartA = new Date(Date.now() + 7200000); // 2 hours in future
  const slotEndA = new Date(slotStartA.getTime() + 1800000);
  const cutoffA = new Date(slotStartA.getTime() + 20 * 60 * 1000); // 09:20 cutoff for 09:00 start
  const captureA = new Date(slotStartA.getTime() - 3600000); // 1 hour before start

  const { buildSlotKey } = await import('../services/slotReservationService.js');

  const reservationA = await SlotReservation.create({
    expertId: expertDoc._id,
    candidateId: candidateUser._id,
    slotKey: buildSlotKey(expertDoc._id.toString(), slotStartA, slotEndA),
    orderId: `order_a_${testSuffix}`,
    startTime: slotStartA,
    endTime: slotEndA,
    reservedUntil: new Date(Date.now() + 600000),
    status: 'reserved'
  });

  mockPaymentsDb[`pay_a_${testSuffix}`] = {
    id: `pay_a_${testSuffix}`,
    order_id: `order_a_${testSuffix}`,
    status: 'captured',
    captured: true,
    amount: 50000,
    captured_at: Math.floor(captureA.getTime() / 1000),
    created_at: Math.floor(captureA.getTime() / 1000) - 30
  };

  const payReqA = {
    user: { id: candidateUser._id, userId: candidateUser._id, email: candidateUser.email, role: 'candidate' },
    body: {
      razorpay_order_id: `order_a_${testSuffix}`,
      razorpay_payment_id: `pay_a_${testSuffix}`,
      razorpay_signature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'code@1234').update(`order_a_${testSuffix}|pay_a_${testSuffix}`).digest('hex'),
      paymentMethod: 'razorpay',
      walletAmountUsed: 0,
      webhookPayload: {
        payment: {
          entity: {
            id: `pay_a_${testSuffix}`,
            order_id: `order_a_${testSuffix}`,
            status: 'captured',
            amount: 50000,
            captured_at: Math.floor(captureA.getTime() / 1000)
          }
        }
      },
      bookingDetails: {
        expertId: expertDoc._id.toString(),
        candidateId: candidateUser._id.toString(),
        startTime: slotStartA.toISOString(),
        endTime: slotEndA.toISOString(),
        duration: 30,
        price: 500
      }
    }
  };

  const resA = createMockRes();
  await verifyPayment(payReqA, resA);
  console.log('Case A Response:', resA.statusCode, resA.data);
  assert.strictEqual(resA.statusCode, 200, 'Case A must return HTTP 200');
  assert.strictEqual(resA.data.success, true, 'Case A must succeed');
  assert.ok(resA.data.data || resA.data.sessionId, 'Case A must return created session');
  const sessionDocA = await Session.findOne({ expertId: expertDoc._id, startTime: slotStartA });
  assert.ok(sessionDocA, 'Case A session must exist in MongoDB');
  console.log('✅ Case A PASSED: Booking confirmed before cutoff.');

  // CASE B: Payment captured at or after cutoff -> credit wallet exactly once
  console.log('\nTesting Case B: Payment captured AT OR AFTER cutoff...');
  const slotStartB = new Date(Date.now() + 600000); // 10 minutes in future
  const slotEndB = new Date(slotStartB.getTime() + 1800000);
  const cutoffB = new Date(slotStartB.getTime() + 20 * 60 * 1000);
  const captureB = new Date(cutoffB.getTime() + 10000); // 10s after cutoff

  const initCandWalletB = await Wallet.findOne({ userId: candidateUser._id });
  const initBalB = initCandWalletB.availableBalance;

  mockPaymentsDb[`pay_b_${testSuffix}`] = {
    id: `pay_b_${testSuffix}`,
    order_id: `order_b_${testSuffix}`,
    status: 'captured',
    captured: true,
    amount: 50000,
    captured_at: Math.floor(captureB.getTime() / 1000),
    created_at: Math.floor(captureB.getTime() / 1000) - 30
  };

  const payReqB = {
    user: { id: candidateUser._id, userId: candidateUser._id, email: candidateUser.email, role: 'candidate' },
    body: {
      razorpay_order_id: `order_b_${testSuffix}`,
      razorpay_payment_id: `pay_b_${testSuffix}`,
      razorpay_signature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'code@1234').update(`order_b_${testSuffix}|pay_b_${testSuffix}`).digest('hex'),
      paymentMethod: 'razorpay',
      walletAmountUsed: 0,
      webhookPayload: {
        payment: {
          entity: {
            id: `pay_b_${testSuffix}`,
            order_id: `order_b_${testSuffix}`,
            status: 'captured',
            amount: 50000,
            captured_at: Math.floor(captureB.getTime() / 1000)
          }
        }
      },
      bookingDetails: {
        expertId: expertDoc._id.toString(),
        candidateId: candidateUser._id.toString(),
        startTime: slotStartB.toISOString(),
        endTime: slotEndB.toISOString(),
        duration: 30,
        price: 500
      }
    }
  };

  const resB = createMockRes();
  await verifyPayment(payReqB, resB);
  assert.strictEqual(resB.statusCode, 200, 'Case B returns HTTP 200 with wallet credit info');
  assert.strictEqual(resB.data.cutoffExpired, true, 'Case B must flag cutoffExpired');
  assert.strictEqual(resB.data.walletCredited, true, 'Case B must credit wallet');

  const postCandWalletB = await Wallet.findOne({ userId: candidateUser._id });
  assert.strictEqual(postCandWalletB.availableBalance, initBalB + 500, 'Case B must credit exact captured amount');
  const sessionDocB = await Session.findOne({ expertId: expertDoc._id, startTime: slotStartB });
  assert.strictEqual(sessionDocB, null, 'Case B must NOT create session');
  console.log('✅ Case B PASSED: Late payment credited to wallet without creating session.');

  // Duplicate replay test for Case B
  console.log('Testing Case B duplicate webhook replay...');
  const resBReplay = createMockRes();
  await verifyPayment(payReqB, resBReplay);
  const replayCandWalletB = await Wallet.findOne({ userId: candidateUser._id });
  assert.strictEqual(replayCandWalletB.availableBalance, postCandWalletB.availableBalance, 'Case B replay must NOT double-credit');
  console.log('✅ Case B Idempotency PASSED: Replay rejected without duplicate wallet credit.');

  // CASE C: Delayed reconciliation after session ended -> credit wallet exactly once
  console.log('\nTesting Case C: Delayed reconciliation after session ended...');
  const payIdC = `pay_c_${testSuffix}`;
  const ordIdC = `order_c_${testSuffix}`;
  mockPaymentsDb[payIdC] = {
    id: payIdC,
    order_id: ordIdC,
    status: 'captured',
    captured: true,
    amount: 50000,
    captured_at: Math.floor((Date.now() - 7200000) / 1000)
  };

  const payRecordC = await PaymentRecord.create({
    orderId: ordIdC,
    paymentId: payIdC,
    userId: candidateUser._id,
    paymentType: 'booking',
    amount: 500,
    currency: 'INR',
    status: 'awaiting_reconciliation',
    reconciliationStatus: 'awaiting_capture_timestamp',
    metadata: {
      bookingDetails: {
        expertId: expertDoc._id.toString(),
        candidateId: candidateUser._id.toString(),
        startTime: new Date(Date.now() - 7200000),
        endTime: new Date(Date.now() - 5400000),
        duration: 30,
        price: 500
      }
    }
  });

  const preCandBalC = (await Wallet.findOne({ userId: candidateUser._id })).availableBalance;
  const reconResultC = await reconcileSinglePayment(payRecordC);
  assert.strictEqual(reconResultC.success, true, 'Case C reconciliation must succeed');
  assert.strictEqual(reconResultC.outcome, 'WALLET_CREDITED', 'Case C outcome must be WALLET_CREDITED');
  const postCandBalC = (await Wallet.findOne({ userId: candidateUser._id })).availableBalance;
  assert.strictEqual(postCandBalC, preCandBalC + 500, 'Case C must credit exact ₹500 to wallet');
  console.log('✅ Case C PASSED: Concluded session reconciled to wallet credit exactly once.');

  // CASE D: Unknown capture timestamp -> retain pending status until safely resolved
  console.log('\nTesting Case D: Unknown capture timestamp...');
  const payReqD = {
    user: { id: candidateUser._id, userId: candidateUser._id, email: candidateUser.email, role: 'candidate' },
    body: {
      razorpay_order_id: `order_d_${testSuffix}`,
      razorpay_payment_id: `pay_d_${testSuffix}`,
      razorpay_signature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'code@1234').update(`order_d_${testSuffix}|pay_d_${testSuffix}`).digest('hex'),
      paymentMethod: 'razorpay',
      walletAmountUsed: 0,
      webhookPayload: {
        payment: {
          entity: {
            id: `pay_d_${testSuffix}`,
            order_id: `order_d_${testSuffix}`,
            status: 'captured',
            amount: 50000
            // No captured_at!
          }
        }
      },
      bookingDetails: {
        expertId: expertDoc._id.toString(),
        candidateId: candidateUser._id.toString(),
        startTime: new Date(Date.now() - 1500000).toISOString(), // After cutoff
        endTime: new Date(Date.now() + 300000).toISOString(),
        duration: 30,
        price: 500
      }
    }
  };

  const resD = createMockRes();
  await verifyPayment(payReqD, resD);
  assert.strictEqual(resD.statusCode, 202, 'Case D must return HTTP 202 awaiting reconciliation');
  assert.strictEqual(resD.data.awaitingReconciliation, true, 'Case D must set awaitingReconciliation: true');
  const recD = await PaymentRecord.findOne({ paymentId: `pay_d_${testSuffix}` });
  assert.strictEqual(recD.status, 'awaiting_reconciliation', 'Case D must retain awaiting_reconciliation status');
  console.log('✅ Case D PASSED: Ambiguous timing preserved as awaiting_reconciliation without guessing.');

  console.log('\n--- PARTIAL WALLET DEDUCTION, FULL WALLET & ROLLBACK ---');
  // Partial Wallet Checkout & Restoration
  const candPreBalPartial = (await Wallet.findOne({ userId: candidateUser._id })).availableBalance;
  console.log(`Candidate current wallet balance: ₹${candPreBalPartial}`);
  
  // Debit 200 for partial wallet checkout
  const debitRes = await debitWallet({
    userId: candidateUser._id,
    amount: 200,
    description: 'Partial wallet checkout reservation',
    referenceModel: 'PaymentRecord'
  });
  assert.strictEqual(debitRes.success, true);
  assert.strictEqual(debitRes.balanceAfter, candPreBalPartial - 200, 'Wallet must decrement by 200');
  console.log(`Debited ₹200. New balance: ₹${debitRes.balanceAfter}`);

  // Rollback on cancelled Razorpay checkout
  await restoreWalletDebit({
    userId: candidateUser._id,
    amount: 200,
    description: 'Cancelled partial wallet reservation restore'
  });
  const candPostRestore = (await Wallet.findOne({ userId: candidateUser._id })).availableBalance;
  assert.strictEqual(candPostRestore, candPreBalPartial, 'Wallet must be exactly restored after cancelled checkout');
  console.log('✅ Partial wallet debit and exactly-once restoration PASSED.');

  // Full Wallet Payment
  const fullWalletRes = await debitWallet({
    userId: candidateUser._id,
    amount: 500,
    description: 'Full wallet interview booking',
    referenceModel: 'Session'
  });
  assert.strictEqual(fullWalletRes.success, true);
  assert.strictEqual(fullWalletRes.balanceAfter, candPreBalPartial - 500, 'Full wallet booking must debit 500');
  console.log('✅ Full wallet booking deduction PASSED.');

  console.log('\n--- CHECK 4: PAYOUT AND WALLET INTEGRITY ---');
  // Create completed session with verified payment for expert payout test
  const payoutSession = await Session.create({
    sessionId: `sess_payout_${testSuffix}`,
    expertId: expertDoc._id,
    candidateId: candidateUser._id,
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() - 1800000), // Concluded 30m ago
    status: 'completed',
    price: 500,
    duration: 30,
    payoutCredited: false,
    payoutStatus: 'pending'
  });

  await PaymentRecord.create({
    sessionId: payoutSession.sessionId,
    orderId: `ord_payout_${testSuffix}`,
    paymentId: `pay_payout_${testSuffix}`,
    userId: candidateUser._id,
    paymentType: 'booking',
    candidateId: candidateUser._id,
    expertId: expertDoc._id,
    amount: 500,
    currency: 'INR',
    status: 'verified'
  });

  const expertUserPre = await User.findById(expertUser._id);
  const expertWalletPre = await Wallet.findOne({ userId: expertUser._id }) || { availableBalance: 0 };
  assert.strictEqual(expertUserPre.walletBalance || 0, 0, 'Expert initial wallet balance must be 0');

  // Submit expert review to trigger payout
  const reviewReq = {
    params: { sessionId: payoutSession.sessionId },
    user: { id: expertUser._id, userId: expertUser._id, role: 'expert', userType: 'expert' },
    body: {
      overallRating: 5,
      technicalRating: 5,
      communicationRating: 4,
      problemSolvingRating: 5,
      feedback: 'Excellent grasp of distributed systems concepts and data modeling.',
      suggestions: 'Keep practicing edge cases.',
      reviewerRole: 'expert'
    }
  };

  const reviewRes = createMockRes();
  await submitReview(reviewReq, reviewRes);
  assert.ok([200, 201].includes(reviewRes.statusCode), 'Review submission must return 200 or 201');
  assert.strictEqual(reviewRes.data.walletCredit?.credited, true, 'Payout wallet credit must be true');
  assert.strictEqual(reviewRes.data.walletCredit?.amount, 400, 'Payout amount must be 80% of ₹500 = ₹400');

  // Check consistency across Wallet, User, and WalletTransaction
  const expertWalletPost = await Wallet.findOne({ userId: expertUser._id });
  const expertUserPost = await User.findById(expertUser._id);
  const ledgerTxn = await WalletTransaction.findOne({ referenceId: payoutSession._id, type: 'CREDIT' });

  assert.strictEqual(expertWalletPost.availableBalance, 400, 'Wallet.availableBalance must be 400');
  assert.strictEqual(expertUserPost.walletBalance, 400, 'User.walletBalance must be 400');
  assert.ok(ledgerTxn, 'WalletTransaction ledger record must exist');
  assert.strictEqual(ledgerTxn.amount, 400, 'WalletTransaction amount must be 400');
  assert.strictEqual(ledgerTxn.balanceAfter, 400, 'WalletTransaction balanceAfter must be 400');
  console.log('✅ Payout multi-document transaction and balance consistency PASSED.');

  // Idempotency: Submit duplicate review
  console.log('Testing duplicate review submission idempotency...');
  const dupReviewRes = createMockRes();
  await submitReview(reviewReq, dupReviewRes);
  assert.strictEqual(dupReviewRes.statusCode, 200, 'Duplicate review must return 200');
  assert.strictEqual(dupReviewRes.data.walletCredit?.credited, false, 'Duplicate review must NOT credit payout again');
  assert.strictEqual(dupReviewRes.data.walletCredit?.alreadyCredited, true, 'Duplicate review must flag alreadyCredited: true');

  const expertWalletPostDup = await Wallet.findOne({ userId: expertUser._id });
  assert.strictEqual(expertWalletPostDup.availableBalance, 400, 'Wallet must remain 400 with ZERO double-crediting');
  console.log('✅ Payout idempotency PASSED.');

  // Spend the credited payout for interview booking exactly once
  console.log('\nTesting spendability: Booking an interview with the credited payout...');
  const spendDebit = await debitWallet({
    userId: expertUser._id,
    amount: 400,
    description: 'Booking candidate mock interview with credited payout',
    referenceModel: 'Session'
  });
  assert.strictEqual(spendDebit.success, true);
  assert.strictEqual(spendDebit.balanceAfter, 0, 'Wallet must be exactly ₹0 after spending payout');
  const expertUserPostSpend = await User.findById(expertUser._id);
  assert.strictEqual(expertUserPostSpend.walletBalance, 0, 'User.walletBalance must be 0 after spending payout');

  // Verify overspending is strictly prevented
  const overspendRes = await debitWallet({
    userId: expertUser._id,
    amount: 1,
    description: 'Attempting overspend'
  });
  assert.strictEqual(overspendRes.success, false, 'Must reject overspending');
  assert.strictEqual(overspendRes.reason, 'INSUFFICIENT_BALANCE', 'Reason must be INSUFFICIENT_BALANCE');
  console.log('✅ Credited payout is spendable for interview booking exactly once without overspending.');

  console.log('\n========================================================================');
  console.log('🎉 ALL PAYMENT LIFECYCLE (CASES A-D) & WALLET INTEGRITY CHECKS PASSED 100%');
  console.log('========================================================================\n');
  process.exit(0);
}

runIntegrityVerification().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
