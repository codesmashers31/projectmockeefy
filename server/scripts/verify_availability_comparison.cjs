const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function verifyAll() {
  try {
    const expertProfileId = '6ae2e7cf2ad1edd333f2aded';
    const candidateProfile = await get(`http://localhost:5000/api/experts/${expertProfileId}`);
    console.log('PUBLIC API RESPONSE EXPERT DETAILS:');
    console.log('sessionDuration:', candidateProfile.data?.sessionDuration || candidateProfile.sessionDuration);
    const availability = candidateProfile.data?.availability || candidateProfile.availability;
    console.log('API availability.weekly:', JSON.stringify(availability?.weekly, null, 2));
  } catch (e) {
    console.error('Error fetching public api:', e);
  }
}

verifyAll();
