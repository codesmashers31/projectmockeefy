const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function reconcileAttendance() {
    console.log('=== MOCKEEFY CANDIDATE ATTENDANCE AUDIT & RECONCILIATION MIGRATION ===\n');

    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Locate System Admin for the Audit Trail
    const adminUser = await db.collection('users').findOne({
        $or: [
            { email: 'mockeefy@gmail.com' },
            { userType: 'admin' },
            { role: 'admin' }
        ]
    });

    if (!adminUser) {
        throw new Error('Admin user not found for audit record.');
    }
    console.log(`Auditor Admin: ${adminUser.name} (${adminUser.email}) [ID: ${adminUser._id}]`);

    const candidateOid = new mongoose.Types.ObjectId('6ad1fd8b146a0a4e7ca163aa');
    const sessions = await db.collection('sessions').find({ candidateId: candidateOid }).sort({ startTime: 1 }).toArray();
    const sessionIds = sessions.map(s => s.sessionId);

    // 2. Query Genuine Expert Reviews
    const expertReviews = await db.collection('reviews').find({
        sessionId: { $in: sessionIds },
        reviewerRole: 'expert'
    }).toArray();
    const expertReviewedSids = new Set(expertReviews.map(r => r.sessionId));

    console.log(`Total Candidate Sessions in DB: ${sessions.length}`);
    console.log(`Sessions with Genuine Expert Reviews: ${expertReviewedSids.size}`);

    // 3. Backup Affected Sessions
    const toReconcile = sessions.filter(s => {
        if (s.status !== 'completed' && s.status !== 'evaluated') return false;
        if (s.attendanceStatus === 'absent' || s.attendanceStatus === 'no-show') return false;
        if (s.status === 'cancelled' || s.status === 'no-show') return false;
        return expertReviewedSids.has(s.sessionId);
    });

    console.log(`Sessions meeting completed + expert-evaluated criteria: ${toReconcile.length}\n`);

    const backupData = toReconcile.map(s => ({
        sessionId: s.sessionId,
        status: s.status,
        attendanceStatus: s.attendanceStatus,
        candidateJoinedAt: s.candidateJoinedAt,
        attendanceAudit: s.attendanceAudit
    }));

    await db.collection('sessions_attendance_backup_' + Date.now()).insertMany(backupData);
    console.log(`✅ Backed up ${backupData.length} records into a dedicated backup collection.\n`);

    // 4. Perform Idempotent Reconcile & Audit Logging
    let updatedCount = 0;
    const now = new Date();

    for (const session of toReconcile) {
        const needsUpdate = session.attendanceStatus !== 'attended' ||
            !session.candidateJoinedAt ||
            session.attendanceAudit?.decision !== 'approved';

        if (needsUpdate) {
            const auditRecord = {
                reviewedBy: adminUser._id,
                reviewedAt: now,
                decision: 'approved',
                notes: 'Administrative attendance audit: Confirmed candidate completion and submitted expert evaluation.'
            };

            await db.collection('sessions').updateOne(
                { _id: session._id },
                {
                    $set: {
                        attendanceStatus: 'attended',
                        candidateJoinedAt: session.candidateJoinedAt || session.startTime || session.createdAt || now,
                        attendanceAudit: auditRecord
                    }
                }
            );
            updatedCount++;
            console.log(`[RECONCILED] Session ${session.sessionId} -> attendanceStatus: 'attended', auditDecision: 'approved'`);
        } else {
            console.log(`[ALREADY_VALID] Session ${session.sessionId} -> already marked attended with valid audit.`);
        }
    }

    console.log(`\nReconciliation complete: ${updatedCount} sessions updated, ${toReconcile.length - updatedCount} already compliant.`);

    // 5. Verification: Count qualifying sessions after reconciliation
    const refreshedSessions = await db.collection('sessions').find({ candidateId: candidateOid }).toArray();
    const attendedAndEvaluated = refreshedSessions.filter(s =>
        (s.status === 'completed' || s.status === 'evaluated') &&
        s.attendanceStatus === 'attended' &&
        expertReviewedSids.has(s.sessionId)
    );
    const allocatedCerts = refreshedSessions.filter(s => Boolean(s.allocatedCertificateId));

    console.log(`\n--- POST-MIGRATION VERIFICATION ---`);
    console.log(`Genuinely Attended & Evaluated Sessions: ${attendedAndEvaluated.length}`);
    console.log(`Previously Allocated to Cert 1: ${allocatedCerts.length}`);
    console.log(`Total Qualifying Sessions: ${attendedAndEvaluated.length + allocatedCerts.length}`);

    process.exit(0);
}

reconcileAttendance().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
