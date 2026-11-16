const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runAudit() {
    console.log('--- STARTING FINANCIAL SECURITY AUDIT ---');
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
    const Session = (await import('../models/Session.js')).default;
    const User = (await import('../models/User.js')).default;
    const PaymentRecord = (await import('../models/PaymentRecord.js')).default;
    const Wallet = (await import('../models/Wallet.js')).default;

    // ==========================================
    // 1. EXACT 80/20 PAYOUT CALCULATION AUDIT
    // ==========================================
    console.log('\n==========================================');
    console.log('AUDIT 1: EXACT 80/20 PAYOUT CALCULATION');
    console.log('==========================================');

    const testPrices = [1, 2, 10, 100, 500, 1000];
    const calcResults = [];

    for (const price of testPrices) {
        const totalPaise = Math.round(price * 100);
        const expertPaise = Math.min(totalPaise, Math.round(totalPaise * 0.80));
        const platformPaise = totalPaise - expertPaise;

        const expertAmount = expertPaise / 100;
        const platformAmount = platformPaise / 100;
        const sumPaise = expertPaise + platformPaise;
        const sumAmount = Math.round((expertAmount + platformAmount) * 100) / 100;

        const expertPct = ((expertPaise / totalPaise) * 100).toFixed(2);
        const platformPct = ((platformPaise / totalPaise) * 100).toFixed(2);
        const matchesOriginal = (sumPaise === totalPaise) && (sumAmount === price);

        calcResults.push({
            priceINR: price,
            totalPaise,
            expertPaise,
            expertAmount,
            expertPct: `${expertPct}%`,
            platformPaise,
            platformAmount,
            platformPct: `${platformPct}%`,
            sumMatches: matchesOriginal
        });
    }

    console.table(calcResults);

    // Verify minimum ₹1 edge case:
    const oneRupee = calcResults.find(r => r.priceINR === 1);
    console.log(`₹1 Session Test: Expert gets ₹${oneRupee.expertAmount} (${oneRupee.expertPct}), Platform gets ₹${oneRupee.platformAmount} (${oneRupee.platformPct}). Turn to 100% prevented? ${oneRupee.expertAmount === 0.8}`);

    // ==========================================
    // 2. LEDGER UNIQUENESS AND REFUNDS AUDIT
    // ==========================================
    console.log('\n==========================================');
    console.log('AUDIT 2: LEDGER UNIQUENESS & REFUNDS');
    console.log('==========================================');

    // 2.1 Inspect all WalletTransaction indexes
    const rawIndexes = await WalletTransaction.collection.indexes();
    console.log('Existing WalletTransaction MongoDB Indexes:');
    rawIndexes.forEach(idx => {
        console.log(` - Name: ${idx.name}, Keys: ${JSON.stringify(idx.key)}, Unique: ${Boolean(idx.unique)}, PartialFilter: ${JSON.stringify(idx.partialFilterExpression || null)}`);
    });

    // 2.2 Verify isolation between Payout, Cancellation Refund, and Reversal
    const auditSessionId = `audit-sess-${Date.now()}`;
    const users = await User.find().limit(2);
    const testExpertId = users[0]?._id || new mongoose.Types.ObjectId();
    const testCandidateId = users[1]?._id || new mongoose.Types.ObjectId();

    console.log(`Using test session ID: ${auditSessionId}`);
    console.log(`Expert: ${testExpertId}, Candidate: ${testCandidateId}`);

    const fakeSessionDoc = new mongoose.Types.ObjectId();

    // Step A: Expert Payout CREDIT (Session referenceModel)
    const payoutTxn = new WalletTransaction({
        walletId: new mongoose.Types.ObjectId(),
        userId: testExpertId,
        amount: 80,
        balanceAfter: 80,
        description: 'Test session payout',
        type: 'CREDIT',
        reason: 'SESSION_PAYOUT',
        referenceId: fakeSessionDoc,
        referenceModel: 'Session',
        sessionId: auditSessionId,
        idempotencyKey: `SESSION_COMPLETED_PAYOUT:${auditSessionId}`,
        status: 'COMPLETED'
    });
    await payoutTxn.save();
    console.log(`[PASS] Payout CREDIT saved with idempotencyKey: ${payoutTxn.idempotencyKey}`);

    // Step B: Verify duplicate payout CREDIT is REJECTED by index
    let dupPayoutBlocked = false;
    try {
        const dupPayoutTxn = new WalletTransaction({
            walletId: new mongoose.Types.ObjectId(),
            userId: testExpertId,
            amount: 80,
            balanceAfter: 160,
            description: 'Duplicate test session payout',
            type: 'CREDIT',
            reason: 'SESSION_PAYOUT',
            referenceId: fakeSessionDoc,
            referenceModel: 'Session',
            sessionId: auditSessionId,
            idempotencyKey: `SESSION_COMPLETED_PAYOUT:${auditSessionId}`,
            status: 'COMPLETED'
        });
        await dupPayoutTxn.save();
    } catch (err) {
        dupPayoutBlocked = true;
        console.log(`[PASS] Duplicate Payout CREDIT successfully blocked by MongoDB index: ${err.message}`);
    }

    // Step C: Candidate Cancellation Refund (PaymentRecord / WalletTransaction referenceModel)
    let refundAllowed = false;
    try {
        const candidateRefundTxn = new WalletTransaction({
            walletId: new mongoose.Types.ObjectId(),
            userId: testCandidateId,
            amount: 100,
            balanceAfter: 100,
            description: 'Test candidate refund',
            type: 'CREDIT',
            reason: 'SESSION_CANCELLED_REFUND',
            referenceId: new mongoose.Types.ObjectId(), // PaymentRecord or Original Txn ID
            referenceModel: 'PaymentRecord',
            sessionId: auditSessionId,
            idempotencyKey: `SESSION_CANCELLED_REFUND:${auditSessionId}`,
            status: 'COMPLETED'
        });
        await candidateRefundTxn.save();
        refundAllowed = true;
        console.log(`[PASS] Candidate Refund CREDIT co-exists without conflict: ${candidateRefundTxn._id}`);
        await WalletTransaction.deleteOne({ _id: candidateRefundTxn._id });
    } catch (err) {
        console.error(`[FAIL] Candidate Refund failed:`, err);
    }

    // Step D: Payout Reversal / Clawback (DEBIT type)
    let reversalAllowed = false;
    try {
        const reversalTxn = new WalletTransaction({
            walletId: new mongoose.Types.ObjectId(),
            userId: testExpertId,
            amount: 80,
            balanceAfter: 0,
            description: 'Test payout reversal',
            type: 'DEBIT',
            reason: 'PAYOUT_REVERSAL',
            referenceId: fakeSessionDoc,
            referenceModel: 'Session',
            sessionId: auditSessionId,
            idempotencyKey: `SESSION_PAYOUT_REVERSAL:${auditSessionId}`,
            status: 'COMPLETED'
        });
        await reversalTxn.save();
        reversalAllowed = true;
        console.log(`[PASS] Payout Reversal DEBIT co-exists with Session referenceModel without conflict: ${reversalTxn._id}`);
        await WalletTransaction.deleteOne({ _id: reversalTxn._id });
    } catch (err) {
        console.error(`[FAIL] Payout Reversal failed:`, err);
    }

    // Clean up test payout
    await WalletTransaction.deleteOne({ _id: payoutTxn._id });

    // ==========================================
    // 3. AUTHORITATIVE 80% COMPENSATION POLICY AUDIT
    // ==========================================
    console.log('\n==========================================');
    console.log('AUDIT 3: AUTHORITATIVE 80% COMPENSATION POLICY');
    console.log('==========================================');

    // Inspect database collections to see if any dynamic platform fee / payout settings exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Available collections:', collectionNames.filter(c => c.toLowerCase().includes('setting') || c.toLowerCase().includes('price') || c.toLowerCase().includes('fee') || c.toLowerCase().includes('commission') || c.toLowerCase().includes('payout')));

    const payoutSettingsDocs = await mongoose.connection.db.collection('payoutsettings').find({}).toArray();
    console.log('payoutsettings content:', JSON.stringify(payoutSettingsDocs, null, 2));

    console.log('\n--- AUDIT COMPLETE ---');
    await mongoose.disconnect();
}

runAudit().catch(err => {
    console.error('Audit script error:', err);
    process.exit(1);
});
