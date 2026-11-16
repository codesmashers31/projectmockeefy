// Dedicated script to reproduce and deeply verify Race 2 and Reversed Race 2 with exact logs and DB assertions
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function testRaces() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('Connecting to MongoDB at:', mongoUri ? 'URI found' : 'URI missing');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Category = (await import('../models/Category.js')).default;
  const Notification = (await import('../models/Notification.js')).default;
  const EmailOutbox = (await import('../models/EmailOutbox.js')).default;

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });
  let itCategory = await Category.findOne({ status: 'Active' });
  if (!itCategory) {
    itCategory = await Category.findOne({});
  }

  const expertToken = jwt.sign(
    { userId: expertUser._id, userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const candidateToken = jwt.sign(
    { userId: candidateUser._id, userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`\n======================================================`);
  console.log(`RUNNING RACE 2: Req A (COMPLETED) vs Req B (INCOMPLETE)`);
  console.log(`======================================================`);

  const sConflict2 = await Session.create({
    sessionId: 'RACE2-FWD-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: itCategory._id,
    category: itCategory.name,
    categoryNameSnapshot: itCategory.name,
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    endTime: new Date(Date.now() + 35 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 24 * 60 * 1000),
    candidateConnectionStatus: 'connected',
    price: 1500
  });

  const sendTimeA = Date.now();
  console.log(`[${new Date(sendTimeA).toISOString()}] Dispatching Request A (ReqID: REQ-A-FWD, outcome: ATTENDED_COMPLETED)`);
  const reqA = axios.post(
    `${BASE_URL}/api/sessions/${sConflict2.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Full interview verified by expert' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  ).then(res => {
    return {
      reqId: 'REQ-A-FWD',
      outcomeRequested: 'ATTENDED_COMPLETED',
      dispatchTime: new Date(sendTimeA).toISOString(),
      responseTime: new Date().toISOString(),
      status: res.status,
      body: res.data
    };
  }).catch(err => {
    return {
      reqId: 'REQ-A-FWD',
      outcomeRequested: 'ATTENDED_COMPLETED',
      dispatchTime: new Date(sendTimeA).toISOString(),
      responseTime: new Date().toISOString(),
      status: err.response?.status || 500,
      body: err.response?.data || { error: err.message }
    };
  });

  const sendTimeB = Date.now();
  console.log(`[${new Date(sendTimeB).toISOString()}] Dispatching Request B (ReqID: REQ-B-FWD, outcome: ATTENDED_INCOMPLETE)`);
  const reqB = axios.post(
    `${BASE_URL}/api/sessions/${sConflict2.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_INCOMPLETE',
      completionEvidence: { summary: 'Candidate left before completion' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  ).then(res => {
    return {
      reqId: 'REQ-B-FWD',
      outcomeRequested: 'ATTENDED_INCOMPLETE',
      dispatchTime: new Date(sendTimeB).toISOString(),
      responseTime: new Date().toISOString(),
      status: res.status,
      body: res.data
    };
  }).catch(err => {
    return {
      reqId: 'REQ-B-FWD',
      outcomeRequested: 'ATTENDED_INCOMPLETE',
      dispatchTime: new Date(sendTimeB).toISOString(),
      responseTime: new Date().toISOString(),
      status: err.response?.status || 500,
      body: err.response?.data || { error: err.message }
    };
  });

  const [resA, resB] = await Promise.all([reqA, reqB]);

  console.log('\n--- RESPONSES RECEIVED (RACE 2 FORWARD) ---');
  console.log('Request A:', JSON.stringify(resA, null, 2));
  console.log('Request B:', JSON.stringify(resB, null, 2));

  // Read exact MongoDB record
  const dbRecord1 = await Session.findById(sConflict2._id).lean();
  console.log('\n--- MONGODB RECORD (RACE 2 FORWARD) ---');
  console.log(JSON.stringify({
    sessionId: dbRecord1.sessionId,
    status: dbRecord1.status,
    attendanceOutcome: dbRecord1.attendanceOutcome,
    completionEvidence: dbRecord1.completionEvidence,
    completedAt: dbRecord1.completedAt,
    updatedAt: dbRecord1.updatedAt,
    payoutStatus: dbRecord1.payoutStatus,
    certificateIssued: dbRecord1.certificateIssued
  }, null, 2));

  // Verify Side Effects
  const notifs1 = await Notification.find({ 'metadata.sessionId': sConflict2.sessionId });
  const emails1 = await EmailOutbox.find({ sessionId: sConflict2.sessionId });

  console.log(`Notifications count: ${notifs1.length}`);
  console.log(`Email Outbox events: ${emails1.length}`);

  console.log(`\n======================================================`);
  console.log(`RUNNING RACE 2 REVERSED: Req B dispatched before Req A`);
  console.log(`======================================================`);

  const sConflictRev = await Session.create({
    sessionId: 'RACE2-REV-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: itCategory._id,
    category: itCategory.name,
    categoryNameSnapshot: itCategory.name,
    startTime: new Date(Date.now() - 25 * 60 * 1000),
    endTime: new Date(Date.now() + 35 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 24 * 60 * 1000),
    candidateConnectionStatus: 'connected',
    price: 1500
  });

  const sendTimeRevB = Date.now();
  console.log(`[${new Date(sendTimeRevB).toISOString()}] Dispatching Request B (ReqID: REQ-B-REV, outcome: ATTENDED_INCOMPLETE)`);
  const reqRevB = axios.post(
    `${BASE_URL}/api/sessions/${sConflictRev.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_INCOMPLETE',
      completionEvidence: { summary: 'Candidate disconnected early in reversed test' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  ).then(res => {
    return {
      reqId: 'REQ-B-REV',
      outcomeRequested: 'ATTENDED_INCOMPLETE',
      dispatchTime: new Date(sendTimeRevB).toISOString(),
      responseTime: new Date().toISOString(),
      status: res.status,
      body: res.data
    };
  }).catch(err => {
    return {
      reqId: 'REQ-B-REV',
      outcomeRequested: 'ATTENDED_INCOMPLETE',
      dispatchTime: new Date(sendTimeRevB).toISOString(),
      responseTime: new Date().toISOString(),
      status: err.response?.status || 500,
      body: err.response?.data || { error: err.message }
    };
  });

  const sendTimeRevA = Date.now();
  console.log(`[${new Date(sendTimeRevA).toISOString()}] Dispatching Request A (ReqID: REQ-A-REV, outcome: ATTENDED_COMPLETED)`);
  const reqRevA = axios.post(
    `${BASE_URL}/api/sessions/${sConflictRev.sessionId}/complete`,
    {
      attendanceOutcome: 'ATTENDED_COMPLETED',
      completionEvidence: { interviewConducted: true, summary: 'Full interview claimed in reversed test' }
    },
    { headers: { Authorization: `Bearer ${expertToken}` } }
  ).then(res => {
    return {
      reqId: 'REQ-A-REV',
      outcomeRequested: 'ATTENDED_COMPLETED',
      dispatchTime: new Date(sendTimeRevA).toISOString(),
      responseTime: new Date().toISOString(),
      status: res.status,
      body: res.data
    };
  }).catch(err => {
    return {
      reqId: 'REQ-A-REV',
      outcomeRequested: 'ATTENDED_COMPLETED',
      dispatchTime: new Date(sendTimeRevA).toISOString(),
      responseTime: new Date().toISOString(),
      status: err.response?.status || 500,
      body: err.response?.data || { error: err.message }
    };
  });

  const [resRevB, resRevA] = await Promise.all([reqRevB, reqRevA]);

  console.log('\n--- RESPONSES RECEIVED (RACE 2 REVERSED) ---');
  console.log('Request B (dispatched first):', JSON.stringify(resRevB, null, 2));
  console.log('Request A (dispatched second):', JSON.stringify(resRevA, null, 2));

  // Read exact MongoDB record for reversed test
  const dbRecordRev = await Session.findById(sConflictRev._id).lean();
  console.log('\n--- MONGODB RECORD (RACE 2 REVERSED) ---');
  console.log(JSON.stringify({
    sessionId: dbRecordRev.sessionId,
    status: dbRecordRev.status,
    attendanceOutcome: dbRecordRev.attendanceOutcome,
    completionEvidence: dbRecordRev.completionEvidence,
    completedAt: dbRecordRev.completedAt,
    updatedAt: dbRecordRev.updatedAt,
    payoutStatus: dbRecordRev.payoutStatus,
    certificateIssued: dbRecordRev.certificateIssued
  }, null, 2));

  // Verify Side Effects for reversed
  const notifsRev = await Notification.find({ 'metadata.sessionId': sConflictRev.sessionId });
  const emailsRev = await EmailOutbox.find({ sessionId: sConflictRev.sessionId });

  console.log(`Reversed Notifications count: ${notifsRev.length}`);
  console.log(`Reversed Email Outbox events: ${emailsRev.length}`);

  // Test Cert preview for this candidate after reversed test
  const certPreviewRev = await axios.get(`${BASE_URL}/api/certifications/preview`, {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });
  const auditsRev = certPreviewRev.data?.data?.ineligibleAudits || [];
  const revAudit = auditsRev.find(a => a.sessionId === sConflictRev.sessionId);
  console.log(`Reversed Ineligible Audit for ${sConflictRev.sessionId}:`, revAudit);

  await mongoose.disconnect();
  console.log('\nFINISHED TEST RUN.');
}

testRaces().catch(e => {
  console.error(e);
  process.exit(1);
});
