const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

async function checkApi() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const Session = (await import('../models/Session.js')).default;
  const User = (await import('../models/User.js')).default;
  const Expert = (await import('../models/expertModel.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const expertUser = await User.findOne({ userType: 'expert' });
  const expertProfile = await Expert.findOne({ userId: expertUser._id });
  const candidateUser = await User.findOne({ userType: 'candidate' });
  const cat = await Category.findOne({});

  const testSession = await Session.create({
    sessionId: 'DEBUG-SESS-' + Date.now(),
    expertId: expertProfile._id,
    candidateId: candidateUser._id,
    categoryId: cat._id,
    startTime: new Date(Date.now() - 20 * 60 * 1000),
    endTime: new Date(Date.now() + 40 * 60 * 1000),
    status: 'confirmed',
    attendanceStatus: 'attended',
    candidateJoinedAt: new Date(Date.now() - 19 * 60 * 1000),
    candidateConnectionStatus: 'connected'
  });

  const expertToken = jwt.sign(
    { userId: expertUser._id, userType: 'expert', email: expertUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const axios = (await import('axios')).default;
  const res = await axios.get(`http://localhost:5000/api/sessions/${testSession.sessionId}`, {
    headers: { Authorization: `Bearer ${expertToken}` }
  });

  console.log('API returned candidateJoinedAt:', res.data.candidateJoinedAt);
  console.log('API returned attendanceStatus:', res.data.attendanceStatus);
  console.log('API returned candidateConnectionStatus:', res.data.candidateConnectionStatus);

  await Session.deleteOne({ _id: testSession._id });
  await mongoose.disconnect();
}

checkApi().catch(console.error);
