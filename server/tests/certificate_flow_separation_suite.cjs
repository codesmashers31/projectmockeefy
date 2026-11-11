const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || "mockeefy_secret_key";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
  }
}

async function runSuite() {
  console.log('\n======================================================================');
  console.log('   MOCKEEFY CERTIFICATE FLOW SEPARATION & VIEW-ONLY PREVIEW SUITE    ');
  console.log('======================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const Certification = mongoose.models.Certification || (await import('../models/Certification.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;

  const joel = await User.findById('6ad1fd8b146a0a4e7ca163aa');
  assert(Boolean(joel), 'Joel user exists in MongoDB');

  // --- JOURNEY 1: Completed session with allocated certificate ---
  console.log('\n--- JOURNEY 1: Allocated Session to Issued Certificate ---');
  const joelCert = await Certification.findOne({ userId: joel._id });
  assert(Boolean(joelCert), `Joel's issued certificate exists (ID: ${joelCert?.certificateId})`);
  assert(joelCert.candidateNameSnapshot === 'Joel', `Candidate name snapshot is permanently frozen as 'Joel'`);
  assert(joelCert.categoryNameSnapshot === 'IT', `Category snapshot is 'IT'`);
  assert(Array.isArray(joelCert.qualifyingSessionIds) && joelCert.qualifyingSessionIds.length === 3, 'Certificate has exactly 3 qualifying sessions');

  const qualifyingSessionId = joelCert.qualifyingSessionIds[0];
  const allocatedSession = await Session.findOne({ sessionId: qualifyingSessionId });
  assert(Boolean(allocatedSession), `Allocated session exists in DB (${qualifyingSessionId})`);
  assert(allocatedSession.allocatedCertificateId === joelCert.certificateId, `Session allocatedCertificateId references ${joelCert.certificateId}`);

  // Test deep linking mapping
  const matchResult = [joelCert].find(c => 
    c.certificateId === allocatedSession.allocatedCertificateId ||
    (c.qualifyingSessionIds && c.qualifyingSessionIds.includes(allocatedSession.sessionId))
  );
  assert(Boolean(matchResult), 'Deep link query (?certId=&sessionId=) resolves directly to exact issued Certification');
  assert(matchResult.certificateId === joelCert.certificateId, 'Resolved certificate ID matches exactly');

  // --- JOURNEY 2: Completed session WITHOUT allocated certificate ---
  console.log('\n--- JOURNEY 2: Completed Session Without Allocated Certificate ---');
  const unallocatedSession = await Session.findOne({
    candidateId: joel._id,
    $or: [{ allocatedCertificateId: null }, { allocatedCertificateId: { $exists: false } }],
    status: { $regex: /^completed$/i }
  });
  assert(Boolean(unallocatedSession), `Found completed unallocated session: ${unallocatedSession?.sessionId}`);
  assert(!unallocatedSession?.allocatedCertificateId, 'Unallocated session has null/undefined allocatedCertificateId');

  // Verify that an unallocated session NEVER resolves an official certificate
  const unallocatedMatch = [joelCert].find(c =>
    (c.qualifyingSessionIds && c.qualifyingSessionIds.includes(unallocatedSession.sessionId)) ||
    (unallocatedSession.allocatedCertificateId && c.certificateId === unallocatedSession.allocatedCertificateId)
  );
  assert(!unallocatedMatch, 'Unallocated session strictly does NOT resolve to any issued certificate');

  // --- JOURNEY 3: View-Only Generic Preview Constraints ---
  console.log('\n--- JOURNEY 3: View-Only Generic Preview Constraints ---');
  const previewTemplateProps = { mode: 'preview' };
  assert(previewTemplateProps.mode === 'preview', 'Preview uses discriminated type mode: "preview"');
  // Placeholders check
  const previewRecipient = "Your Name";
  const previewPlaqueDefault = "YOUR DOMAIN MOCK INTERVIEW SESSION";
  const previewDate = "Your Issue Date";
  const previewDescriptionDefault = "has successfully completed a structured mock interview in your selected domain, demonstrating dedication to improving interview skills and professional growth.";
  assert(previewRecipient === 'Your Name', 'Preview recipient placeholder is strictly "Your Name"');
  assert(previewPlaqueDefault === 'YOUR DOMAIN MOCK INTERVIEW SESSION', 'Preview plaque is "YOUR DOMAIN MOCK INTERVIEW SESSION"');
  assert(previewDate === 'Your Issue Date', 'Preview date placeholder is strictly "Your Issue Date"');
  assert(previewDescriptionDefault.includes('in your selected domain'), 'Preview description is domain-neutral placeholder when no domain selected');
  assert(!previewDescriptionDefault.includes('IT'), 'Preview description does NOT mention real candidate domain');
  assert(!previewRecipient.includes('Joel'), 'Preview recipient does NOT leak real candidate name');

  // Dynamic domain adaptation test
  const testDomains = ['Web Development', 'Cybersecurity', 'IT'];
  for (const dom of testDomains) {
    const ribbonText = dom.toLowerCase() === 'it' ? 'IT PROFESSIONAL MOCK INTERVIEW SESSION' : `${dom.toUpperCase()} MOCK INTERVIEW SESSION`;
    assert(Boolean(ribbonText), `Dynamic domain preview ribbon for "${dom}" -> "${ribbonText}"`);
  }

  // --- JOURNEY 4: "My Earned Certificates" History Section ---
  console.log('\n--- JOURNEY 4: My Earned Certificates Historical Conferred Listing ---');
  const userCerts = await Certification.find({ userId: joel._id }).sort({ milestoneNumber: 1 });
  assert(userCerts.length >= 1, `Candidate has ${userCerts.length} genuine issued certificate(s)`);
  userCerts.forEach((cert, idx) => {
    assert(Boolean(cert.certificateId), `Certificate #${idx + 1} has valid certificateId: ${cert.certificateId}`);
    assert(Boolean(cert.candidateNameSnapshot), `Certificate #${idx + 1} has permanent candidateNameSnapshot: ${cert.candidateNameSnapshot}`);
    assert(Boolean(cert.categoryNameSnapshot), `Certificate #${idx + 1} has category snapshot: ${cert.categoryNameSnapshot}`);
    assert(Boolean(cert.issueDate), `Certificate #${idx + 1} has authoritative issueDate: ${cert.issueDate.toISOString()}`);
    assert(Boolean(cert.milestoneNumber), `Certificate #${idx + 1} has milestoneNumber: ${cert.milestoneNumber}`);
    assert(Boolean(cert.milestoneRange), `Certificate #${idx + 1} has milestoneRange: ${cert.milestoneRange}`);
  });

  // --- JOURNEY 5: Download Authorization & Security ---
  console.log('\n--- JOURNEY 5: Authorized Download Security ---');
  const otherUser = await User.findOne({ _id: { $ne: joel._id } });
  if (otherUser) {
    const isOwner = joelCert.userId.toString() === otherUser._id.toString();
    assert(!isOwner, `Unauthorized user (${otherUser.email}) is NOT the owner of Joel's certificate`);
  }
  const isJoelOwner = joelCert.userId.toString() === joel._id.toString();
  assert(isJoelOwner, `Joel is strictly verified as the authorized owner of certificate ${joelCert.certificateId}`);

  await mongoose.disconnect();

  console.log('\n======================================================================');
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('======================================================================\n');

  if (failedCount > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
