const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testEligibility() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const { getEligibleCompletedSessions, getDomainCertificatePreview } = await import('../controllers/certificationController.js');

  const user = await User.findOne({ email: 'darwininfantmichael@gmail.com' });
  console.log('Testing eligibility for:', user.name, user._id);

  const eligible = await getEligibleCompletedSessions(user._id);
  console.log('\n--- getEligibleCompletedSessions returned ' + eligible.length + ' sessions ---');
  eligible.forEach((s, idx) => {
    console.log(`[${idx + 1}] ${s.sessionId} | CatId: ${s.categoryId} | CatName: ${s.categoryNameSnapshot} | Status: ${s.status} | AllocCert: ${s.allocatedCertificateId}`);
  });

  // Call the actual preview API function
  const req = { user: { id: user._id.toString() } };
  let previewData = null;
  const res = {
    status: (code) => ({
      json: (data) => {
        previewData = data;
      }
    })
  };

  await getDomainCertificatePreview(req, res);
  console.log('\n--- getDomainCertificatePreview Result: ---');
  console.log(JSON.stringify(previewData, null, 2));

  process.exit(0);
}

testEligibility().catch(e => {
  console.error(e);
  process.exit(1);
});
