import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import Certification from '../models/Certification.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { getEligibleCompletedSessions } from '../controllers/certificationController.js';

const isDryRun = !process.argv.includes('--commit');

async function migrate() {
  console.log('================================================================');
  console.log(`MOCKEEFY — RECURRING MILESTONE CERTIFICATION MIGRATION [${isDryRun ? 'DRY-RUN' : 'LIVE COMMIT'}]`);
  console.log('================================================================\n');

  await connectDB();

  // Create backups directory
  const backupDir = path.resolve(__dirname, '../data/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Audit existing certifications
  const existingCerts = await Certification.find({}).sort({ userId: 1, issueDate: 1, createdAt: 1 }).lean();
  console.log(`Auditing ${existingCerts.length} existing certification records...\n`);

  const timestamp = Date.now();
  const certBackupFile = path.join(backupDir, `certifications_backup_${timestamp}.json`);
  fs.writeFileSync(certBackupFile, JSON.stringify(existingCerts, null, 2), 'utf8');
  console.log(`[Backup] Original certifications saved to: ${certBackupFile}`);

  // Group certs by userId
  const userCertMap = new Map();
  for (const cert of existingCerts) {
    const uid = cert.userId.toString();
    if (!userCertMap.has(uid)) userCertMap.set(uid, []);
    userCertMap.get(uid).push(cert);
  }

  const migrationSummary = [];
  const sessionsToUpdate = [];
  const certsToUpdate = [];
  const adminReviewFlagged = [];

  for (const [userId, certList] of userCertMap.entries()) {
    const user = await User.findById(userId).lean();
    const userName = user?.name || 'Unknown Candidate';
    console.log(`----------------------------------------------------------------`);
    console.log(`User: ${userId} (${userName}) - ${certList.length} certificate(s)`);

    // Fetch all eligible sessions for user
    const eligibleSessions = await getEligibleCompletedSessions(userId);
    console.log(`  Total eligible completed sessions in DB: ${eligibleSessions.length}`);

    // Sort existing certs chronologically
    certList.sort((a, b) => new Date(a.issueDate || a.createdAt || 0) - new Date(b.issueDate || b.createdAt || 0));

    const allocatedSessionIds = new Set();
    let milestoneSeq = 1;

    for (const cert of certList) {
      const assignedMilestone = cert.milestoneNumber || milestoneSeq;
      const startIdx = (assignedMilestone - 1) * 3 + 1;
      const endIdx = assignedMilestone * 3;
      const milestoneRange = `Interviews ${startIdx}–${endIdx}`;

      let qualifying = Array.isArray(cert.qualifyingSessionIds) ? [...cert.qualifyingSessionIds] : [];

      // If cert has explicit qualifying sessions recorded, preserve them
      if (qualifying.length > 0) {
        qualifying.forEach(sid => allocatedSessionIds.add(sid));
      } else {
        // Attempt to associate with candidate's eligible sessions up to issuance date
        const unallocatedEligible = eligibleSessions
          .filter(s => !allocatedSessionIds.has(s.sessionId))
          .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));

        if (unallocatedEligible.length >= 3) {
          const matched = unallocatedEligible.slice(0, 3).map(s => s.sessionId);
          qualifying = matched;
          matched.forEach(sid => allocatedSessionIds.add(sid));
          console.log(`  [Assigned Sessions] Linked ${matched.length} sessions to cert ${cert.certificateId}`);
        } else {
          adminReviewFlagged.push({
            certificateId: cert.certificateId,
            userId,
            userName,
            reason: `Historical certificate has ${qualifying.length} sessions and only ${unallocatedEligible.length} unallocated eligible sessions found.`
          });
        }
      }

      certsToUpdate.push({
        _id: cert._id,
        certificateId: cert.certificateId,
        milestoneNumber: assignedMilestone,
        milestoneRange,
        qualifyingSessionIds: qualifying,
        candidateNameSnapshot: cert.candidateNameSnapshot || userName
      });

      // Track sessions that belong to this certificate
      for (const sid of qualifying) {
        sessionsToUpdate.push({
          sessionId: sid,
          allocatedCertificateId: cert.certificateId,
          allocatedMilestone: assignedMilestone
        });
      }

      console.log(`  Cert ID: ${cert.certificateId}`);
      console.log(`    Milestone: ${assignedMilestone} (${milestoneRange})`);
      console.log(`    Candidate Snapshot: "${cert.candidateNameSnapshot || userName}"`);
      console.log(`    Qualifying Sessions: [${qualifying.join(', ')}]`);

      milestoneSeq = Math.max(milestoneSeq + 1, assignedMilestone + 1);
    }

    // Calculate remaining unallocated progress for this user
    const unallocatedCount = eligibleSessions.filter(s => !allocatedSessionIds.has(s.sessionId)).length;
    const nextMilestoneNumber = milestoneSeq;
    const nextStart = (nextMilestoneNumber - 1) * 3 + 1;
    const nextEnd = nextMilestoneNumber * 3;
    const nextRange = `Interviews ${nextStart}–${nextEnd}`;
    const nextProgress = unallocatedCount % 3;
    const isEligibleForNext = unallocatedCount >= 3;

    migrationSummary.push({
      userId,
      userName,
      issuedCertificates: certList.length,
      totalEligibleSessions: eligibleSessions.length,
      allocatedSessions: allocatedSessionIds.size,
      unallocatedSessions: unallocatedCount,
      nextMilestoneNumber,
      nextMilestoneRange: nextRange,
      nextProgress: `${Math.min(3, unallocatedCount)} / 3`,
      isEligibleForNext
    });

    console.log(`  -> Unallocated sessions: ${unallocatedCount}`);
    console.log(`  -> Next Milestone: #${nextMilestoneNumber} (${nextRange}), Progress: ${Math.min(3, unallocatedCount)} / 3, Eligible: ${isEligibleForNext}`);
  }

  // Backup sessions to be updated
  if (sessionsToUpdate.length > 0) {
    const sessionIds = sessionsToUpdate.map(s => s.sessionId);
    const existingSessions = await Session.find({ sessionId: { $in: sessionIds } }).lean();
    const sessionBackupFile = path.join(backupDir, `sessions_backup_${timestamp}.json`);
    fs.writeFileSync(sessionBackupFile, JSON.stringify(existingSessions, null, 2), 'utf8');
    console.log(`\n[Backup] Original session records saved to: ${sessionBackupFile}`);
  }

  console.log('\n================================================================');
  console.log('MIGRATION SUMMARY & AUDIT TABLE:');
  console.log('================================================================');
  console.table(migrationSummary);

  if (adminReviewFlagged.length > 0) {
    console.log('\n⚠️ RECORDS FLAGGED FOR ADMINISTRATIVE REVIEW:');
    console.table(adminReviewFlagged);
  } else {
    console.log('\n✅ Zero ambiguous records flagged for administrative review.');
  }

  if (!isDryRun) {
    console.log('\nApplying updates to MongoDB...');

    // 1. Update certifications
    for (const cu of certsToUpdate) {
      await Certification.updateOne(
        { _id: cu._id },
        {
          $set: {
            milestoneNumber: cu.milestoneNumber,
            milestoneRange: cu.milestoneRange,
            qualifyingSessionIds: cu.qualifyingSessionIds,
            candidateNameSnapshot: cu.candidateNameSnapshot,
            'metadata.milestoneNumber': cu.milestoneNumber,
            'metadata.milestoneRange': cu.milestoneRange
          }
        }
      );
    }
    console.log(`  ✅ Updated ${certsToUpdate.length} Certification documents.`);

    // 2. Update sessions with allocation metadata
    for (const su of sessionsToUpdate) {
      await Session.updateOne(
        { sessionId: su.sessionId },
        {
          $set: {
            allocatedCertificateId: su.allocatedCertificateId,
            allocatedMilestone: su.allocatedMilestone,
            certificateIssued: true
          }
        }
      );
    }
    console.log(`  ✅ Updated ${sessionsToUpdate.length} Session documents.`);

    console.log('\n✅ LIVE MIGRATION COMMITTED SUCCESSFULLY!');
  } else {
    console.log('\n[DRY RUN COMPLETE] Zero database writes performed. Pass --commit to apply changes.');
  }

  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
