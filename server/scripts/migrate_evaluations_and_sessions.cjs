const fs = require('fs');
const path = require('path');
const mongoose = require('../node_modules/mongoose');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

async function runMigration() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('====================================================');
  console.log('STARTING SAFE MONGODB DATA MIGRATION & RECONCILIATION');
  console.log('====================================================\n');

  // --- STEP 1: AUDIT & BACKUP EVALUATIONS ---
  const reviews = await db.collection('reviews').find({}).toArray();
  console.log(`Total reviews inspected: ${reviews.length}`);

  const backupData = {
    timestamp: new Date().toISOString(),
    reviewsBefore: reviews
  };

  const backupPath = path.join(__dirname, 'backup_before_migration.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`[Backup] Original state written to: ${backupPath}`);

  const updatesToApply = [];
  const incompleteReviews = [];

  for (const r of reviews) {
    const has5 = r.technicalRating != null &&
                 r.communicationRating != null &&
                 r.problemSolvingRating != null &&
                 r.designRating != null &&
                 r.behavioralRating != null;

    if (has5) {
      const sum = Number(r.technicalRating) + Number(r.communicationRating) + Number(r.problemSolvingRating) + Number(r.designRating) + Number(r.behavioralRating);
      const computedOverall = Number((sum / 5).toFixed(1));
      const currentOverall = Number(r.overallRating);

      if (Math.abs(computedOverall - currentOverall) > 0.001) {
        updatesToApply.push({
          _id: r._id,
          sessionId: r.sessionId,
          reviewerRole: r.reviewerRole,
          categoryScores: {
            technical: r.technicalRating,
            communication: r.communicationRating,
            problemSolving: r.problemSolvingRating,
            systemDesign: r.designRating,
            behavioral: r.behavioralRating
          },
          originalOverall: currentOverall,
          correctedOverall: computedOverall
        });
      }
    } else {
      incompleteReviews.push({
        _id: r._id,
        sessionId: r.sessionId,
        reviewerRole: r.reviewerRole,
        overallRating: r.overallRating,
        reason: 'Missing one or more of the 5 standard rubric categories'
      });
    }
  }

  console.log(`\n[Audit] Reviews with all 5 categories: ${reviews.length - incompleteReviews.length}`);
  console.log(`[Audit] Reviews requiring overall rating update: ${updatesToApply.length}`);
  console.log(`[Audit] Reviews flagged for manual review (partial/legacy): ${incompleteReviews.length}`);

  console.log('\nUpdates to apply:');
  console.log(JSON.stringify(updatesToApply, null, 2));

  // --- STEP 2: APPLY EVALUATION UPDATES IDEMPOTENTLY ---
  let updatedCount = 0;
  for (const update of updatesToApply) {
    const res = await db.collection('reviews').updateOne(
      { _id: update._id },
      {
        $set: {
          overallRating: update.correctedOverall,
          scoreMigratedAt: new Date(),
          scoreMigrationNote: `Updated overall score from ${update.originalOverall} to authoritative equal-weight rubric average ${update.correctedOverall}`
        }
      }
    );
    if (res.modifiedCount > 0) {
      updatedCount += res.modifiedCount;
      console.log(`[Updated] Review ${update._id} (Session: ${update.sessionId}) -> overallRating: ${update.correctedOverall}`);
    }
  }
  console.log(`\nTotal reviews successfully updated in MongoDB: ${updatedCount}`);

  // --- STEP 3: VERIFY TARGET RECORD ---
  const targetReview = await db.collection('reviews').findOne({ sessionId: 'session-1794303835597-mfmp11ltz', reviewerRole: 'expert' });
  console.log('\n[Verification] Target Session (session-1794303835597-mfmp11ltz):');
  console.log(JSON.stringify({
    _id: targetReview._id,
    sessionId: targetReview.sessionId,
    overallRating: targetReview.overallRating,
    technicalRating: targetReview.technicalRating,
    communicationRating: targetReview.communicationRating,
    problemSolvingRating: targetReview.problemSolvingRating,
    designRating: targetReview.designRating,
    behavioralRating: targetReview.behavioralRating,
    scoreMigrationNote: targetReview.scoreMigrationNote
  }, null, 2));

  // --- STEP 4: AUDIT SESSIONS & WALLET RECONCILIATION ---
  const sessions = await db.collection('sessions').find({}).toArray();
  const paymentRecords = await db.collection('paymentrecords').find({}).toArray();
  const walletTransactions = await db.collection('wallettransactions').find({}).toArray();

  console.log('\n====================================================');
  console.log('HISTORICAL SESSIONS CLASSIFICATION AUDIT');
  console.log('====================================================');

  const now = new Date();
  const classifications = {
    CategoryA: [], // Valid completed & attended
    CategoryB: [], // Paid, demonstrably absent
    CategoryC: [], // Paid, attendance unknown
    CategoryD: [], // Cancelled/refunded
    CategoryE: [], // Already no-show
    CategoryF: []  // Future/active
  };

  for (const s of sessions) {
    const revs = await db.collection('reviews').find({ sessionId: s.sessionId }).toArray();
    const expertRev = revs.find(r => r.reviewerRole === 'expert');
    const pay = paymentRecords.find(p => p.sessionId === s.sessionId);
    const isPaid = Boolean(s.isPaid || s.paidAmount > 0 || (pay && (pay.status === 'verified' || pay.status === 'captured')));
    const isRefunded = Boolean(s.refundId || s.refunded || (pay && pay.refundStatus === 'refunded'));
    const status = (s.status || '').toLowerCase();
    const isFuture = s.startTime && new Date(s.startTime) > now && status !== 'completed' && status !== 'cancelled';
    const isCancelled = status === 'cancelled';
    const isNoShow = status === 'no-show' || status === 'candidate_no_show' || status === 'no_show';

    const info = {
      _id: String(s._id),
      sessionId: s.sessionId,
      candidateId: String(s.candidateId),
      expertId: String(s.expertId),
      status: s.status,
      startTime: s.startTime,
      isPaid,
      hasEvaluation: Boolean(expertRev),
      payoutCredited: s.payoutCredited
    };

    if (isFuture) {
      classifications.CategoryF.push(info);
    } else if (isCancelled || isRefunded) {
      classifications.CategoryD.push(info);
    } else if (isNoShow) {
      classifications.CategoryE.push(info);
    } else if (status === 'completed' && expertRev) {
      classifications.CategoryA.push(info);
    } else if (isPaid && !isRefunded && !s.candidateJoinedAt && s.expertJoinedAt && !expertRev) {
      classifications.CategoryB.push(info);
    } else {
      classifications.CategoryC.push(info);
    }
  }

  console.log(`Category A (Valid completed & evaluated): ${classifications.CategoryA.length}`);
  console.log(`Category B (Confirmed candidate no-show with proof): ${classifications.CategoryB.length}`);
  console.log(`Category C (Attendance unknown / Admin review): ${classifications.CategoryC.length}`);
  console.log(`Category D (Cancelled or refunded): ${classifications.CategoryD.length}`);
  console.log(`Category E (Already marked no-show): ${classifications.CategoryE.length}`);
  console.log(`Category F (Future or active session): ${classifications.CategoryF.length}`);

  if (classifications.CategoryC.length > 0) {
    console.log('\nCategory C sessions flagged for admin review (without automated penalty):');
    console.log(JSON.stringify(classifications.CategoryC, null, 2));
  }

  // --- STEP 5: CERTIFICATE ELIGIBILITY RE-AUDIT ---
  console.log('\n====================================================');
  console.log('CERTIFICATION ELIGIBILITY RE-AUDIT ACROSS ALL CANDIDATES');
  console.log('====================================================');

  const candidatesWithSessions = [...new Set(sessions.map(s => String(s.candidateId)).filter(Boolean))];
  const eligibilitySummary = [];

  for (const cId of candidatesWithSessions) {
    const cSessions = sessions.filter(s => String(s.candidateId) === cId);
    const evaluatedCompleted = [];

    for (const cs of cSessions) {
      const st = (cs.status || '').toLowerCase();
      if (st === 'completed') {
        const hasRev = await db.collection('reviews').findOne({ sessionId: cs.sessionId, reviewerRole: 'expert' });
        if (hasRev) {
          evaluatedCompleted.push(cs.sessionId);
        }
      }
    }

    const cert = await db.collection('certifications').findOne({ userId: { $in: [cId, new mongoose.Types.ObjectId(cId).catch ? null : cId].filter(Boolean) } });

    eligibilitySummary.push({
      candidateId: cId,
      totalSessions: cSessions.length,
      genuinelyCompletedAndEvaluated: evaluatedCompleted.length,
      isEligible: evaluatedCompleted.length >= 3,
      hasCertificate: Boolean(cert),
      certificateId: cert ? cert.certificateId : null
    });
  }

  console.log('Candidate Eligibility Summary:');
  console.log(JSON.stringify(eligibilitySummary, null, 2));

  await mongoose.disconnect();
  console.log('\nMigration and Audit completed successfully.');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
