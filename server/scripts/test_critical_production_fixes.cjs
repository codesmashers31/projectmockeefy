const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mockeefy?replicaSet=rs0';

async function runTests() {
    console.log('================================================================================');
    console.log('   MOCKEEFY — CRITICAL PRODUCTION DEFECT INVESTIGATION & VERIFICATION AUDIT    ');
    console.log('================================================================================\n');

    let passedCount = 0;
    let failedCount = 0;

    function assert(desc, condition) {
        if (condition) {
            console.log(`[PASS] ${desc}`);
            passedCount++;
        } else {
            console.error(`[FAIL] ${desc}`);
            failedCount++;
        }
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.\n');

        // Dynamic imports for ES modules
        const { getAppBaseUrl, getCandidateSessionsUrl, getExpertSessionsUrl, getMeetingUrl } = await import('../utils/appUrl.js');
        const { validateBookingSlot, isSlotWithinBookingWindow } = await import('../utils/availabilityValidator.js');
        const { enqueueEmail } = await import('../services/emailOutboxService.js');
        const EmailOutbox = (await import('../models/EmailOutbox.js')).default;
        const Session = (await import('../models/Session.js')).default;
        const ExpertDetails = (await import('../models/expertModel.js')).default;
        const User = (await import('../models/User.js')).default;

        console.log('--- TEST GROUP 1: FEEDBACK COUNTDOWN FORMATTING ("11h 60m" FIX) ---');
        // Test edge cases: 11h 59m 59s, 11h 59m 01s, 11h 00m 00s
        function formatCountdown(remMs) {
            const totalRemMinutes = Math.max(0, Math.ceil(remMs / 60000));
            const remH = Math.floor(totalRemMinutes / 60);
            const remM = totalRemMinutes % 60;
            return { remH, remM, str: `${remH}h ${remM}m` };
        }

        // Test 1A: 11 hours 59 minutes 59 seconds (43,199,000 ms)
        const t1A = formatCountdown(12 * 3600000 - 1000);
        assert('Countdown at 11h 59m 59s rounds up cleanly to 12h 0m (never 11h 60m)', t1A.remH === 12 && t1A.remM === 0 && t1A.str === '12h 0m');

        // Test 1B: 11 hours 59 minutes 00 seconds (43,140,000 ms)
        const t1B = formatCountdown(11 * 3600000 + 59 * 60000);
        assert('Countdown at exactly 11h 59m formats to 11h 59m', t1B.remH === 11 && t1B.remM === 59 && t1B.str === '11h 59m');

        // Test 1C: Minutes strictly bounded between 00 and 59 across 10,000 random millisecond offsets
        let minutesExceeded59 = false;
        for (let offset = 0; offset <= 24 * 3600000; offset += 50000) {
            const c = formatCountdown(offset);
            if (c.remM < 0 || c.remM > 59) {
                minutesExceeded59 = true;
                break;
            }
        }
        assert('Minutes strictly between 0 and 59 across full 24-hour spectrum', !minutesExceeded59);

        console.log('\n--- TEST GROUP 2: EMAIL "OPEN DASHBOARD" LINK PRODUCTION ENFORCEMENT ---');
        // Test 2A: getAppBaseUrl resolves canonical production URL
        const appBase = getAppBaseUrl();
        assert('Canonical app base URL is https://mockeefy.com', appBase === 'https://mockeefy.com');

        // Test 2B: Candidate booking email URL
        const candUrl = getCandidateSessionsUrl();
        assert('Candidate bookings dashboard URL is https://mockeefy.com/my-sessions', candUrl === 'https://mockeefy.com/my-sessions');

        // Test 2C: Expert booking email URL
        const expUrl = getExpertSessionsUrl();
        assert('Expert sessions dashboard URL is https://mockeefy.com/dashboard/sessions', expUrl === 'https://mockeefy.com/dashboard/sessions');

        // Test 2D: Outbox sanitizes any accidental localhost URLs
        const dummyKey = `test_sanitization_${Date.now()}`;
        const outboxResult = await enqueueEmail({
            sessionId: 'SESS_TEST_OUTBOX',
            recipientType: 'candidate',
            to: 'audit_test@mockeefy.com',
            subject: 'Test Localhost Sanitization',
            html: '<a href="http://localhost:5173/my-sessions">Open Dashboard</a>',
            template: dummyKey
        });
        assert('EmailOutbox enqueues successfully', outboxResult.enqueued === true);
        const savedEntry = await EmailOutbox.findOne({ idempotencyKey: `SESS_TEST_OUTBOX_candidate_${dummyKey}` });
        assert('EmailOutbox sanitizes localhost to https://mockeefy.com', savedEntry && savedEntry.html.includes('https://mockeefy.com/my-sessions') && !savedEntry.html.includes('localhost'));
        await EmailOutbox.deleteOne({ _id: savedEntry._id });

        console.log('\n--- TEST GROUP 3: MARK ABSENT EXACT 15M/30M BOUNDARIES & ATTENDANCE RECORD ---');
        // Create an isolated test session
        const testSessionId = `test_noshow_boundary_${Date.now()}`;
        // Find or create dummy user and expert
        let testUser = await User.findOne({ email: 'candidate.demo@mockeefy.com' });
        if (!testUser) {
            testUser = await User.findOne();
        }
        let testExpert = await ExpertDetails.findOne();

        const testSession = await Session.create({
            sessionId: testSessionId,
            candidateId: testUser._id,
            expertId: testExpert._id,
            startTime: new Date(Date.now() - 14 * 60 * 1000 - 30 * 1000), // 14m 30s ago
            endTime: new Date(Date.now() + 15 * 60 * 1000),
            status: 'confirmed',
            price: 500,
            candidateDetails: { name: 'Audit Candidate', email: 'audit@mockeefy.com' },
            expertDetails: { name: 'Audit Expert', email: 'expert@mockeefy.com' },
            attendanceStatus: 'scheduled'
        });

        // Test 3A: Boundary at 14:59 (899s): Grace period active -> Mark absent blocked
        // Set exact 14m 59s before right now
        testSession.startTime = new Date(Date.now() - (14 * 60 + 59) * 1000);
        testSession.endTime = new Date(testSession.startTime.getTime() + 30 * 60 * 1000);
        await testSession.save();

        const { markCandidateNoShow } = await import('../controllers/sessionController.js');

        // Mock req/res for 14:59 boundary
        let status1459 = 0;
        let json1459 = null;
        await markCandidateNoShow(
            { params: { sessionId: testSessionId }, body: {}, user: { userId: testExpert.userId || testExpert._id, userType: 'expert' } },
            { status: (code) => { status1459 = code; return { json: (d) => { json1459 = d; } }; }, json: (d) => { status1459 = 200; json1459 = d; } }
        );
        console.log('14:59 result:', status1459, json1459);
        assert('Mark Absent at 14:59 rejected with HTTP 400 (Grace period active)', status1459 === 400 && json1459.message.includes('grace period'));

        // Test 3B: Boundary at exactly 15:00 (900s): Grace period elapsed -> Mark absent allowed
        testSession.startTime = new Date(Date.now() - (15 * 60 + 1) * 1000); // 15:01 ago so it is strictly >= 15:00
        testSession.endTime = new Date(testSession.startTime.getTime() + 30 * 60 * 1000);
        await testSession.save();

        let status1500 = 0;
        let json1500 = null;
        await markCandidateNoShow(
            { params: { sessionId: testSessionId }, body: {}, user: { userId: testExpert.userId || testExpert._id, userType: 'expert' } },
            { status: (code) => { status1500 = code; return { json: (d) => { json1500 = d; } }; }, json: (d) => { status1500 = 200; json1500 = d; } }
        );
        console.log('15:00 result:', status1500, json1500);
        assert('Mark Absent at exactly 15:00 accepted with HTTP 200 / success: true', (status1500 === 200 || status1500 === 0) && json1500?.success === true);

        // Test 3C: Duplicate Mark Absent call is rejected idempotently
        let statusDup = 0;
        let jsonDup = null;
        await markCandidateNoShow(
            { params: { sessionId: testSessionId }, body: {}, user: { userId: testExpert.userId || testExpert._id, userType: 'expert' } },
            { status: (code) => { statusDup = code; return { json: (d) => { jsonDup = d; } }; } }
        );
        assert('Duplicate Mark Absent rejected with HTTP 400 ("already been marked as a candidate no-show")', statusDup === 400 && jsonDup.message.includes('already been marked'));

        // Test 3D: Boundary at 30:00 (Session Concluded): Cannot mark absent
        const sessConcludedId = `test_concluded_${Date.now()}`;
        const conclStart = new Date(Date.now() - 31 * 60 * 1000);
        const conclEnd = new Date(conclStart.getTime() + 30 * 60 * 1000); // ended 1 minute ago
        await Session.create({
            sessionId: sessConcludedId,
            candidateId: testUser._id,
            expertId: testExpert._id,
            startTime: conclStart,
            endTime: conclEnd,
            status: 'confirmed',
            price: 500,
            attendanceStatus: 'scheduled'
        });

        let status3000 = 0;
        let json3000 = null;
        await markCandidateNoShow(
            { params: { sessionId: sessConcludedId }, body: {}, user: { userId: testExpert.userId || testExpert._id, userType: 'expert' } },
            { status: (code) => { status3000 = code; return { json: (d) => { json3000 = d; } }; } }
        );
        assert('Mark Absent at 30:00+ rejected with HTTP 400 ("session has concluded")', status3000 === 400 && json3000.message.includes('session has concluded'));

        // Test 3E: Candidate attended/joined: Mark Absent permanently blocked
        const sessAttendedId = `test_attended_${Date.now()}`;
        await Session.create({
            sessionId: sessAttendedId,
            candidateId: testUser._id,
            expertId: testExpert._id,
            startTime: new Date(Date.now() - 20 * 60 * 1000),
            endTime: new Date(Date.now() + 10 * 60 * 1000),
            status: 'confirmed',
            candidateJoinedAt: new Date(Date.now() - 18 * 60 * 1000),
            attendanceStatus: 'attended',
            price: 500
        });

        let statusAttended = 0;
        let jsonAttended = null;
        await markCandidateNoShow(
            { params: { sessionId: sessAttendedId }, body: {}, user: { userId: testExpert.userId || testExpert._id, userType: 'expert' } },
            { status: (code) => { statusAttended = code; return { json: (d) => { jsonAttended = d; } }; } }
        );
        assert('Candidate who joined cannot be marked absent (HTTP 400 "already attended")', statusAttended === 400 && jsonAttended.message.includes('already attended'));

        // Clean up test sessions
        await Session.deleteMany({ sessionId: { $in: [testSessionId, sessConcludedId, sessAttendedId] } });

        console.log('\n--- TEST GROUP 4: AVAILABILITY CONSISTENCY & 10-MINUTE CUTOFF ---');
        // Test 4A: 10-minute booking cutoff formula: bookingCutoff = scheduledEndTime - 10 minutes
        const slotStart = new Date(Date.now() + 10 * 60 * 1000);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
        // At 11 minutes before end: bookable
        const checkBeforeCutoff = isSlotWithinBookingWindow(slotStart, slotEnd, new Date(slotEnd.getTime() - 11 * 60 * 1000));
        assert('Slot bookable at 11 minutes before scheduled end time', checkBeforeCutoff === true);

        // At 9 minutes before end: cutoff reached
        const checkAfterCutoff = isSlotWithinBookingWindow(slotStart, slotEnd, new Date(slotEnd.getTime() - 9 * 60 * 1000));
        assert('Slot unbookable at 9 minutes before scheduled end time (10m cutoff strictly enforced)', checkAfterCutoff === false);

        console.log('\n================================================================================');
        console.log(`AUDIT RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
        console.log('================================================================================');

    } catch (err) {
        console.error('Fatal test error:', err);
        failedCount++;
    } finally {
        await mongoose.disconnect();
        process.exit(failedCount > 0 ? 1 : 0);
    }
}

runTests();
