const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../server/node_modules/mongoose'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const destBase = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\artifacts\\mockeefy-final-independent-audit';

async function populateEvidence() {
  console.log('Running test scripts and capturing raw evidence logs...');

  // 1. Cutoff test
  try {
    const cutoffOut = execSync('node server/scripts/test_cutoff_boundary_backend.cjs', { encoding: 'utf8' });
    fs.writeFileSync(path.join(destBase, 'test-results', 'cutoff_boundary.log'), cutoffOut);
    console.log('Saved cutoff_boundary.log');
  } catch(e) { console.error('Cutoff error:', e.message); }

  // 2. Mark absent test
  try {
    const absentOut = execSync('node server/scripts/acceptance_test_1_mark_absent.cjs', { encoding: 'utf8' });
    fs.writeFileSync(path.join(destBase, 'test-results', 'mark_absent.log'), absentOut);
    console.log('Saved mark_absent.log');
  } catch(e) { console.error('Absent error:', e.message); }

  // 3. Financial audit
  try {
    const finOut = execSync('node server/scripts/audit_financial_concerns.cjs', { encoding: 'utf8' });
    fs.writeFileSync(path.join(destBase, 'api-evidence', 'financial_concerns.log'), finOut);
    console.log('Saved financial_concerns.log');
  } catch(e) { console.error('Fin error:', e.message); }

  // 4. E2E Business Flows
  try {
    const e2eOut = execSync('node server/scripts/verify_e2e_business_flow.cjs', { encoding: 'utf8' });
    fs.writeFileSync(path.join(destBase, 'test-results', 'e2e_business_flows.log'), e2eOut);
    console.log('Saved e2e_business_flows.log');
  } catch(e) { console.error('E2E error:', e.message); }

  // 5. Query MongoDB for 17 traces field-level evidence
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const tracesData = {};
  tracesData['TRACE_01_candidate_profile'] = await db.collection('users').findOne({ userType: 'candidate' }, { projection: { password: 0 } });
  tracesData['TRACE_02_verified_mentors_count'] = await db.collection('expertdetails').countDocuments({ status: 'Active' });
  tracesData['TRACE_03_expert_experience'] = await db.collection('expertdetails').findOne({ status: 'Active' });
  tracesData['TRACE_04_expert_reviews'] = await db.collection('reviews').find({}).limit(3).toArray();
  tracesData['TRACE_05_pricing_rules_beginner'] = await db.collection('pricingrules').findOne({ level: 'Beginner' });
  tracesData['TRACE_06_active_categories'] = await db.collection('categories').find({ status: 'Active' }).toArray();
  tracesData['TRACE_07_pricing_matrix_count'] = await db.collection('pricingrules').countDocuments({ skillId: null });
  tracesData['TRACE_08_expert_availability'] = await db.collection('expertdetails').findOne({ status: 'Active' }, { projection: { sessionDuration: 1, weeklyAvailability: 1 } });
  tracesData['TRACE_09_active_slot_locks'] = await db.collection('slotreservations').find({ reservedUntil: { $gt: new Date() } }).toArray();
  tracesData['TRACE_10_sessions_count'] = await db.collection('sessions').countDocuments({});
  tracesData['TRACE_11_expert_sessions'] = await db.collection('sessions').find({}).limit(5).toArray();
  tracesData['TRACE_12_attendance_joined_sample'] = await db.collection('sessions').findOne({ hasCandidateJoined: true });
  tracesData['TRACE_13_reviews_scorecard_sample'] = await db.collection('reviews').findOne({});
  tracesData['TRACE_14_certifications_sample'] = await db.collection('certifications').findOne({});
  tracesData['TRACE_15_candidate_wallet_sample'] = await db.collection('wallets').findOne({});
  tracesData['TRACE_16_wallet_transactions_sample'] = await db.collection('wallettransactions').find({}).limit(5).toArray();
  tracesData['TRACE_17_payout_requests_all'] = await db.collection('payoutrequests').find({}).toArray();

  fs.writeFileSync(path.join(destBase, 'database-evidence', '17_truth_traces.json'), JSON.stringify(tracesData, null, 2));
  console.log('Saved 17_truth_traces.json');

  // Redact real email addresses and sensitive data from database evidence
  const rawDbContent = fs.readFileSync(path.join(destBase, 'database-evidence', '17_truth_traces.json'), 'utf8');
  const redactedContent = rawDbContent
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, (email) => {
      if (email.includes('@mockeefy.test') || email.includes('@example.com')) return email;
      const parts = email.split('@');
      return parts[0].slice(0, 3) + '***@' + parts[1];
    });
  fs.writeFileSync(path.join(destBase, 'database-evidence', '17_truth_traces_redacted.json'), redactedContent);
  console.log('Saved 17_truth_traces_redacted.json');

  await mongoose.disconnect();
  console.log('Populate evidence completed successfully.');
}

populateEvidence().catch(console.error);
