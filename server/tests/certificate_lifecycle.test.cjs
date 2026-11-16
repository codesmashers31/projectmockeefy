const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function generateToken(userId, userType = 'candidate') {
  return jwt.sign({ userId, userType, id: userId }, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  console.log('--- STARTING CERTIFICATE LIFECYCLE TESTS ---');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const Certification = mongoose.models.Certification || (await import('../models/Certification.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;

  // 1. Test Existing Issued Certificate (Joel)
  const joelUser = await User.findOne({ email: 'darwininfantmichael@gmail.com' });
  console.log('Found Joel User:', joelUser ? joelUser._id.toString() : 'Not found');

  const joelCert = await Certification.findOne({ userId: joelUser._id, certificateStatus: 'ISSUED' });
  console.log('Joel Stored Certificate:', {
    certificateId: joelCert?.certificateId,
    candidateNameSnapshot: joelCert?.candidateNameSnapshot,
    status: joelCert?.certificateStatus
  });

  if (joelCert?.candidateNameSnapshot !== 'Joel') {
    throw new Error('Joel certificate snapshot altered! Must be "Joel"');
  }

  // 2. Test User with 0 completed interviews (Jamie)
  const jamieUser = await User.findOne({ email: 'jamietheresa.26csa@licet.ac.in' });
  console.log('\nFound Jamie User:', jamieUser ? jamieUser._id.toString() : 'Not found');

  // Verify Jamie has 0 completed sessions
  const { getEligibleCompletedSessions } = await import('../controllers/certificationController.js');
  const jamieEligible = await getEligibleCompletedSessions(jamieUser._id);
  console.log(`Jamie completed & evaluated interviews: ${jamieEligible.length}`);

  if (jamieEligible.length !== 0) {
    throw new Error(`Expected 0 completed sessions for Jamie, got ${jamieEligible.length}`);
  }

  // Verify Jamie does not have an issued certificate in DB
  const jamieCert = await Certification.findOne({ userId: jamieUser._id });
  console.log('Jamie DB Certificate exists?', Boolean(jamieCert));
  if (jamieCert) {
    throw new Error('Jamie should NOT have a certificate in DB!');
  }

  // 3. Test Preview endpoint logic for Jamie
  const reqMock = {
    user: { userId: jamieUser._id.toString(), userType: 'candidate' }
  };
  let previewResData = null;
  const resMock = {
    json: (d) => { previewResData = d; return resMock; },
    status: (code) => { console.log('Response status:', code); return resMock; }
  };

  const { getCertificatePreview, confirmIdentity, issueCertificate, verifyDownloadEligibility } = await import('../controllers/certificationController.js');

  await getCertificatePreview(reqMock, resMock);
  console.log('Jamie Preview Response:', previewResData);

  if (previewResData.data.stage !== 'PREVIEW') {
    throw new Error(`Expected stage PREVIEW, got ${previewResData.data.stage}`);
  }
  if (previewResData.data.isEligible !== false) {
    throw new Error('Expected isEligible to be false');
  }
  if (previewResData.data.isIssued !== false) {
    throw new Error('Expected isIssued to be false');
  }
  if (previewResData.data.certificate !== null) {
    throw new Error('Expected certificate to be null');
  }

  // 4. Test Rejecting Identity Confirmation for < 3 interviews
  let confirmErr = {};
  const resConfirmMock = {
    json: (d) => { confirmErr.body = d; return resConfirmMock; },
    status: (code) => { confirmErr.status = code; return resConfirmMock; }
  };
  await confirmIdentity({ user: { userId: jamieUser._id.toString() }, body: { acknowledged: true } }, resConfirmMock);
  console.log('Confirmation attempt on < 3 interviews rejected with status:', confirmErr.status);
  if (confirmErr.status !== 400) {
    throw new Error('Expected 400 rejection for confirm-identity with < 3 interviews');
  }

  // 5. Test Rejecting Issuance for < 3 interviews
  let issueErr = {};
  const resIssueMock = {
    json: (d) => { issueErr.body = d; return resIssueMock; },
    status: (code) => { issueErr.status = code; return resIssueMock; }
  };
  await issueCertificate({ user: { userId: jamieUser._id.toString(), userType: 'candidate' }, body: {} }, resIssueMock);
  console.log('Issuance attempt on < 3 interviews rejected with status:', issueErr.status);
  if (issueErr.status !== 400) {
    throw new Error('Expected 400 rejection for issue with < 3 interviews');
  }

  // 6. Test Rejecting Download of Preview ID or unissued certificate
  let dlErr = {};
  const resDlMock = {
    json: (d) => { dlErr.body = d; return resDlMock; },
    status: (code) => { dlErr.status = code; return resDlMock; }
  };
  await verifyDownloadEligibility({ user: { userId: jamieUser._id.toString(), userType: 'candidate' }, params: { certificateId: 'PREVIEW-MST-1234' } }, resDlMock);
  console.log('Download attempt on preview ID rejected with status:', dlErr.status);
  if (dlErr.status !== 400) {
    throw new Error('Expected 400 rejection for download of preview ID');
  }

  // 7. Test Download of Joel's Valid Issued Certificate
  let joelDl = {};
  const resJoelDlMock = {
    json: (d) => { joelDl = d; return resJoelDlMock; },
    status: (code) => { joelDl.status = code; return resJoelDlMock; }
  };
  await verifyDownloadEligibility({ user: { userId: joelUser._id.toString(), userType: 'candidate' }, params: { certificateId: joelCert.certificateId } }, resJoelDlMock);
  console.log('Download check for Joel issued cert:', joelDl);
  if (!joelDl.authorized || joelDl.data.candidateNameSnapshot !== 'Joel') {
    throw new Error('Expected authorized download with snapshot "Joel"');
  }

  // 8. Test That Another Candidate Cannot Download Joel's Certificate
  let unauthorizedDl = {};
  const resUnauthMock = {
    json: (d) => { unauthorizedDl.body = d; return resUnauthMock; },
    status: (code) => { unauthorizedDl.status = code; return resUnauthMock; }
  };
  await verifyDownloadEligibility({ user: { userId: jamieUser._id.toString(), userType: 'candidate' }, params: { certificateId: joelCert.certificateId } }, resUnauthMock);
  console.log('Unauthorized download attempt by Jamie on Joel cert status:', unauthorizedDl.status);
  if (unauthorizedDl.status !== 403) {
    throw new Error('Expected 403 Forbidden when another user attempts to download Joel cert');
  }

  console.log('\n--- ALL BACKEND CERTIFICATE LIFECYCLE TESTS PASSED! ---');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
