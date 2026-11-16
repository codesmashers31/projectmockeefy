const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

async function testApi() {
    const token = jwt.sign(
        { userId: '6ad1fd8b146a0a4e7ca163aa', email: 'darwininfantmichael@gmail.com', userType: 'candidate' },
        process.env.JWT_SECRET || 'code@1234',
        { expiresIn: '1h' }
    );

    const res = await fetch('http://localhost:5000/api/certifications/preview', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const json = await res.json();
    console.log('Status:', res.status);
    console.log('Stage:', json.data?.stage);
    console.log('CompletedCount:', json.data?.completedCount);
    console.log('UnallocatedCount:', json.data?.unallocatedCount);
    console.log('IsEligible:', json.data?.isEligible);
    console.log('Active Category Progress:');
    const itProg = json.data?.categoryProgress?.find(c => c.categoryName === 'IT');
    console.log('IT progress in API:', itProg);

    process.exit(0);
}
testApi().catch(err => {
    console.error('API call failed:', err);
    process.exit(1);
});
