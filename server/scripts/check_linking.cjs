const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Certification = mongoose.models.Certification || (await import('../models/Certification.js')).default;
  const Session = mongoose.models.Session || (await import('../models/Session.js')).default;

  const cert = await Certification.findOne({ certificateId: 'MCFY-MST-A163AA-2026' });
  console.log('Cert:', cert.certificateId, 'qualifyingSessionIds:', cert.qualifyingSessionIds);
  const unalloc = await Session.find({ candidateId: cert.userId, allocatedCertificateId: null });
  console.log('Unallocated sessions for Joel:', unalloc.length);
  if (unalloc.length > 0) {
    console.log('Example unallocated session:', unalloc[0].sessionId, 'status:', unalloc[0].status, 'allocatedCertificateId:', unalloc[0].allocatedCertificateId);
  }
  await mongoose.disconnect();
}
check();
