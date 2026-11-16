const axios = require('axios');
const BASE_URL = 'http://localhost:5000';

async function testPublicProfile() {
  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const res = await axios.get(`${BASE_URL}/api/expert/public/profile/${expertId}`);
  console.log('Public profile status:', res.status);
  console.log('Availability in public profile:');
  console.log(JSON.stringify(res.data.profile.availability, null, 2));

  // Check booked sessions
  const sessionsRes = await axios.get(`${BASE_URL}/api/sessions/expert/${expertId}`);
  console.log(`\nExpert booked sessions count:`, sessionsRes.data.length);
  const nov13Sessions = sessionsRes.data.filter(s => s.startTime && s.startTime.startsWith('2026-11-13'));
  console.log(`Nov 13 sessions count:`, nov13Sessions.length);
  nov13Sessions.forEach(s => {
    console.log('Session ID:', s.sessionId, 'Status:', s.status, 'Start:', s.startTime, 'End:', s.endTime);
  });
}
testPublicProfile().catch(console.error);
