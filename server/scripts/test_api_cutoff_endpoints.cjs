const http = require('http');
const jwt = require('../node_modules/jsonwebtoken');
const mongoose = require('../node_modules/mongoose');
const path = require('path');
require('../node_modules/dotenv').config({ path: path.join(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';

function postRequest(urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`
      }
    }, res => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testApiEndpoints() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const candidateUser = await User.findById('6af326acf549d9aa26049ba4').lean();
  const expertId = '6ae2e7cf2ad1edd333f2aded';

  const candidateToken = jwt.sign(
    { userId: candidateUser._id.toString(), id: candidateUser._id.toString(), userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('=== TESTING API ENDPOINTS: /api/payment/create-order ===\n');

  // Test create-order at scheduled times
  // 1. A slot scheduled in future (e.g. 11:00 PM - 11:30 PM Nov 13)
  const resOrder1 = await postRequest('/api/payment/create-order', {
    amount: 1,
    bookingDetails: {
      expertId,
      startTime: '2026-11-13T17:30:00.000Z', // 11:00 PM IST
      endTime: '2026-11-13T18:00:00.000Z',   // 11:30 PM IST
      duration: 30
    }
  }, candidateToken);

  console.log('Create order response for 11:00 PM slot (status ' + resOrder1.status + '):');
  console.log(JSON.stringify(resOrder1.body, null, 2));

  // 2. An expired slot (e.g. 10:00 PM - 10:30 PM Nov 13 whose cutoff was 10:20 PM)
  const resOrderExpired = await postRequest('/api/payment/create-order', {
    amount: 1,
    bookingDetails: {
      expertId,
      startTime: '2026-11-13T16:30:00.000Z', // 10:00 PM IST
      endTime: '2026-11-13T17:00:00.000Z',   // 10:30 PM IST (Cutoff 10:20 PM)
      duration: 30
    }
  }, candidateToken);

  console.log('\nCreate order response for expired 10:00 PM slot (status ' + resOrderExpired.status + '):');
  console.log(JSON.stringify(resOrderExpired.body, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

testApiEndpoints().catch(e => {
  console.error(e);
  process.exit(1);
});
