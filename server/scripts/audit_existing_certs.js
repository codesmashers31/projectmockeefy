import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../config/db.js';
import Certification from '../models/Certification.js';
import Session from '../models/Session.js';
import User from '../models/User.js';

async function audit() {
  await connectDB();

  const certs = await Certification.find({}).lean();
  console.log('=== AUDIT OF EXISTING CERTIFICATIONS ===');
  console.log(`Total certifications found: ${certs.length}`);
  certs.forEach((c, idx) => {
    console.log(`[Cert #${idx + 1}] ID: ${c.certificateId}, Name: ${c.name}, Snapshot: "${c.candidateNameSnapshot}", User: ${c.userId}, Status: ${c.certificateStatus}, Sessions: ${JSON.stringify(c.qualifyingSessionIds)}, Cycle: ${c.metadata?.cycle}`);
  });

  const userIds = certs.map(c => c.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('name email certificateIdentityConfirmation').lean();
  console.log('=== ASSOCIATED USERS ===');
  users.forEach(u => {
    console.log(`User ${u._id}: Name: "${u.name}", Email: ${u.email}, IdentityConfirmation:`, u.certificateIdentityConfirmation);
  });

  const allCompletedSessions = await Session.find({
    candidateId: { $in: userIds },
    status: { $in: ['completed', 'evaluated'] }
  }).lean();
  console.log(`=== COMPLETED/EVALUATED SESSIONS FOR CERT USERS (${allCompletedSessions.length}) ===`);
  allCompletedSessions.forEach(s => {
    console.log(`Session ${s.sessionId} (_id: ${s._id}) Candidate: ${s.candidateId}, Status: ${s.status}, Attendance: ${s.attendanceStatus}, CertIssued: ${s.certificateIssued}, CertId: ${s.certificateId}`);
  });

  process.exit(0);
}

audit().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
