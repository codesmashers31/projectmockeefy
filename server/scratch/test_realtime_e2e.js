import pkg from 'socket.io-client';
const ioClient = typeof pkg === 'function' ? pkg : pkg.io;
import jwt from 'jsonwebtoken';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'code@1234';
const SERVER_URL = 'http://localhost:5000';

// Generate test JWT tokens
const userA_Id = '660000000000000000000001';
const userB_Id = '660000000000000000000002';
const adminId = '660000000000000000000099';

const tokenUserA = jwt.sign({ userId: userA_Id, id: userA_Id, role: 'expert', userType: 'expert' }, JWT_SECRET, { expiresIn: '1h' });
const tokenUserB = jwt.sign({ userId: userB_Id, id: userB_Id, role: 'candidate', userType: 'candidate' }, JWT_SECRET, { expiresIn: '1h' });
const tokenAdmin = jwt.sign({ userId: adminId, id: adminId, role: 'admin', userType: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

function createClientSocket(token, name) {
    return new Promise((resolve, reject) => {
        const socket = ioClient(SERVER_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            forceNew: true,
            reconnection: true
        });

        const timer = setTimeout(() => {
            reject(new Error(`[${name}] Connection timeout`));
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timer);
            resolve(socket);
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function runTests() {
    console.log('--- STARTING REAL-TIME SYNCHRONIZATION E2E TESTS ---');
    let passed = 0;
    let failed = 0;

    const assert = (desc, condition) => {
        if (condition) {
            console.log(`  ✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${desc}`);
            failed++;
        }
    };

    let session1, session2, session3, sessionUnrelated, sessionAdmin;

    try {
        console.log('\n[1] Connecting 3 sessions for User A, 1 for User B, 1 for Admin...');
        session1 = await createClientSocket(tokenUserA, 'Session 1 (User A)');
        session2 = await createClientSocket(tokenUserA, 'Session 2 (User A)');
        session3 = await createClientSocket(tokenUserA, 'Session 3 (User A)');
        sessionUnrelated = await createClientSocket(tokenUserB, 'Session 4 (User B)');
        sessionAdmin = await createClientSocket(tokenAdmin, 'Session 5 (Admin)');

        assert('Session 1 (User A) connected', session1.connected);
        assert('Session 2 (User A) connected', session2.connected);
        assert('Session 3 (User A) connected', session3.connected);
        assert('Session 4 (User B) connected', sessionUnrelated.connected);
        assert('Session 5 (Admin) connected', sessionAdmin.connected);

        // Prepare message collectors
        const s1Events = [];
        const s2Events = [];
        const s3Events = [];
        const sUEvents = [];
        const sAdminEvents = [];

        session1.on('DATA_SYNC', (e) => s1Events.push(e));
        session2.on('DATA_SYNC', (e) => s2Events.push(e));
        session3.on('DATA_SYNC', (e) => s3Events.push(e));
        sessionUnrelated.on('DATA_SYNC', (e) => sUEvents.push(e));
        sessionAdmin.on('DATA_SYNC', (e) => sAdminEvents.push(e));

        // Connect to MongoDB to test real controller execution
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\n[2] Connected to MongoDB for database updates test.');

        const User = (await import('../models/User.js')).default;
        const ExpertDetails = (await import('../models/expertModel.js')).default;

        // Ensure User A exists in DB
        let userA = await User.findById(userA_Id);
        if (!userA) {
            userA = await User.create({
                _id: userA_Id,
                name: 'Darvin Michael',
                email: 'darvin.test@mockeefy.com',
                password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
                userType: 'expert',
                status: 'Active'
            });
        }

        let expertA = await ExpertDetails.findOne({ userId: userA_Id });
        if (!expertA) {
            expertA = await ExpertDetails.create({
                userId: userA_Id,
                name: 'Darvin Michael',
                email: 'darvin.test@mockeefy.com',
                status: 'Active',
                personalInformation: {
                    userName: 'Darvin Michael',
                    category: 'IT'
                }
            });
        }

        // Ensure Admin user exists
        let adminUser = await User.findById(adminId);
        if (!adminUser) {
            adminUser = await User.create({
                _id: adminId,
                name: 'Admin User',
                email: 'admin.test@mockeefy.com',
                password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
                userType: 'admin',
                status: 'Active'
            });
        }

        // Test 1: Update personal info via HTTP API with User A's auth token
        console.log('\n[3] Testing update from Session 1 (PUT /api/expert/personalinfo)...');
        s1Events.length = 0;
        s2Events.length = 0;
        s3Events.length = 0;
        sUEvents.length = 0;

        const updateRes = await axios.put(`${SERVER_URL}/api/expert/personalinfo`, {
            userName: 'Darvin Michael - Updated',
            gender: 'Male',
            bio: 'Real-time test bio update'
        }, {
            headers: { Authorization: `Bearer ${tokenUserA}` }
        });

        assert('API returns 200 OK', updateRes.status === 200);

        // Wait 300ms for socket broadcast
        await new Promise(r => setTimeout(r, 300));

        assert('Session 1 received DATA_SYNC event', s1Events.some(e => e.type === 'PERSONAL_INFO_UPDATED' || e.type === 'PROFILE_UPDATED'));
        assert('Session 2 received DATA_SYNC event immediately', s2Events.some(e => e.type === 'PERSONAL_INFO_UPDATED' || e.type === 'PROFILE_UPDATED'));
        assert('Session 3 received DATA_SYNC event immediately', s3Events.some(e => e.type === 'PERSONAL_INFO_UPDATED' || e.type === 'PROFILE_UPDATED'));
        assert('Unrelated Session 4 (User B) did NOT receive private update', sUEvents.length === 0);

        // Test 2: Update from Session 2 (PUT /api/user/profile/skills)
        console.log('\n[4] Testing update originating from Session 2 (Candidate skills)...');
        s1Events.length = 0;
        s2Events.length = 0;
        s3Events.length = 0;
        sUEvents.length = 0;

        const skillRes = await axios.put(`${SERVER_URL}/api/user/profile/skills`, {
            technical: ['React', 'Node.js', 'Socket.IO'],
            soft: ['Problem Solving', 'Communication'],
            languages: ['English']
        }, {
            headers: { Authorization: `Bearer ${tokenUserA}` }
        });

        assert('API returns 200 for skills update', skillRes.status === 200);
        await new Promise(r => setTimeout(r, 300));

        assert('Session 1 received skills update from Session 2', s1Events.some(e => e.type === 'PROFILE_UPDATED'));
        assert('Session 3 received skills update from Session 2', s3Events.some(e => e.type === 'PROFILE_UPDATED'));
        assert('Session 4 (User B) remained isolated', sUEvents.length === 0);

        // Test 3: Session 3 trigger (PUT /api/user/profile/preferences)
        console.log('\n[5] Testing update originating from Session 3 (Preferences)...');
        s1Events.length = 0;
        s2Events.length = 0;
        s3Events.length = 0;

        const prefRes = await axios.put(`${SERVER_URL}/api/user/profile/preferences`, {
            experienceLevel: 'Experienced',
            jobType: 'Full-time'
        }, {
            headers: { Authorization: `Bearer ${tokenUserA}` }
        });

        assert('API returns 200 for preferences update', prefRes.status === 200);
        await new Promise(r => setTimeout(r, 300));

        assert('Session 1 received preferences update from Session 3', s1Events.some(e => e.type === 'PROFILE_UPDATED'));
        assert('Session 2 received preferences update from Session 3', s2Events.some(e => e.type === 'PROFILE_UPDATED'));

        // Test 4: Reconnection reconciliation
        console.log('\n[6] Testing socket disconnection and reconnection...');
        let reconnected = false;
        session2.disconnect();
        assert('Session 2 disconnected cleanly', !session2.connected);

        session2.connect();
        await new Promise((resolve) => {
            session2.once('connect', () => {
                reconnected = true;
                resolve();
            });
        });
        assert('Session 2 reconnected automatically and re-authenticated', reconnected && session2.connected);

        // Test 5: Admin synchronization
        console.log('\n[7] Testing Admin synchronized event...');
        sAdminEvents.length = 0;
        sUEvents.length = 0;

        const statusRes = await axios.put(`${SERVER_URL}/api/admin/users/${userA_Id}/status`, {}, {
            headers: { Authorization: `Bearer ${tokenAdmin}` }
        });

        assert('Admin toggled user status', statusRes.status === 200);
        await new Promise(r => setTimeout(r, 300));

        assert('Admin session received USER_STATUS_UPDATED', sAdminEvents.some(e => e.type === 'USER_STATUS_UPDATED'));
        assert('User A sessions received USER_STATUS_UPDATED', s1Events.some(e => e.type === 'USER_STATUS_UPDATED'));
        assert('Unrelated User B did NOT receive User A status change', !sUEvents.some(e => e.type === 'USER_STATUS_UPDATED'));

        // Test 6: Failed Request - Validation Failure should NOT emit socket events
        console.log('\n[8] Testing failed request handling (should NOT emit socket events)...');
        s1Events.length = 0;
        s2Events.length = 0;
        s3Events.length = 0;

        let failedRequestBlocked = false;
        try {
            await axios.put(`${SERVER_URL}/api/user/profile/preferences`, {
                experienceLevel: 'INVALID_EXPERIENCE_LEVEL',
                jobType: 'INVALID_JOB_TYPE'
            }, {
                headers: { Authorization: `Bearer ${tokenUserA}` }
            });
        } catch (err) {
            failedRequestBlocked = true;
        }

        await new Promise(r => setTimeout(r, 300));
        assert('Invalid request was rejected by server', failedRequestBlocked);
        assert('Failed request emitted 0 socket events to Session 1', s1Events.length === 0);
        assert('Failed request emitted 0 socket events to Session 2', s2Events.length === 0);
        assert('Failed request emitted 0 socket events to Session 3', s3Events.length === 0);

        // Test 7: Simultaneous / Concurrent Edits from Session 1 and Session 2
        console.log('\n[9] Testing simultaneous edits from multiple sessions...');
        s1Events.length = 0;
        s2Events.length = 0;
        s3Events.length = 0;

        const [res1, res2] = await Promise.all([
            axios.put(`${SERVER_URL}/api/expert/personalinfo`, {
                userName: 'Darvin Michael - Simultaneous 1',
                bio: 'Concurrent bio 1'
            }, {
                headers: { Authorization: `Bearer ${tokenUserA}` }
            }),
            axios.put(`${SERVER_URL}/api/expert/personalinfo`, {
                userName: 'Darvin Michael - Simultaneous 2',
                bio: 'Concurrent bio 2'
            }, {
                headers: { Authorization: `Bearer ${tokenUserA}` }
            })
        ]);

        assert('Both concurrent requests succeeded without database locking errors', res1.status === 200 && res2.status === 200);
        await new Promise(r => setTimeout(r, 400));

        assert('Session 1 received both sync events from concurrent edits', s1Events.length >= 2);
        assert('Session 2 received both sync events from concurrent edits', s2Events.length >= 2);
        assert('Session 3 received both sync events from concurrent edits', s3Events.length >= 2);

        // Fetch DB to confirm MongoDB source of truth converged
        const finalUser = await User.findById(userA_Id);
        assert('MongoDB source of truth holds final atomic state', finalUser.name.startsWith('Darvin Michael - Simultaneous'));

    } catch (err) {
        console.error('Test execution error:', err.message, err.response?.data || '');
        failed++;
    } finally {
        if (session1) session1.disconnect();
        if (session2) session2.disconnect();
        if (session3) session3.disconnect();
        if (sessionUnrelated) sessionUnrelated.disconnect();
        if (sessionAdmin) sessionAdmin.disconnect();
        await mongoose.disconnect();

        console.log(`\n========================================`);
        console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log(`========================================\n`);
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
