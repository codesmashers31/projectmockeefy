const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function runTwentyScenariosSuite() {
    console.log('======================================================================');
    console.log('   MOCKEEFY — 20-SCENARIO REAL-DATA COMPREHENSIVE VERIFICATION SUITE   ');
    console.log('======================================================================\n');

    await mongoose.connect(process.env.MONGO_URI);

    const Session = (await import('../models/Session.js')).default;
    const Certification = (await import('../models/Certification.js')).default;
    const Category = (await import('../models/Category.js')).default;
    const ReviewDetails = (await import('../models/reviewModel.js')).default;
    const Meeting = (await import('../models/Meeting.js')).default;
    const certCtrl = await import('../controllers/certificationController.js');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  ✓ PASS [Scenario ${totalTests}]: ${message}`);
        } else {
            failedTests++;
            console.error(`  ✗ FAIL [Scenario ${totalTests}]: ${message}`);
        }
    }

    const runId = Date.now();
    const testAdminId = new mongoose.Types.ObjectId('6a3034e2368271408842d12d');

    const createTestSession = (overrides) => {
        const start = overrides.startTime || new Date();
        const end = overrides.endTime || new Date(start.getTime() + 1800000);
        return Session.create({
            startTime: start,
            endTime: end,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: start,
            ...overrides
        });
    };
    const createTestCert = (overrides) => {
        if (Array.isArray(overrides)) {
            return Promise.all(overrides.map(o => createTestCert(o)));
        }
        return Certification.create({
            candidateNameSnapshot: 'Test Candidate',
            certificateStatus: 'ISSUED',
            issueDate: new Date(),
            type: 'master',
            ...overrides
        });
    };
    const categories = await Category.find({ status: 'Active' }).lean();
    const itCat = categories.find(c => c.name.toLowerCase() === 'it');
    const webCat = categories.find(c => c.name.toLowerCase() === 'web development');
    const cybCat = categories.find(c => c.name.toLowerCase() === 'cybersecurity');

    try {
        // --- SCENARIO 1: Candidate with 0 qualifying interviews -> domain is hidden ---
        const cand1 = new mongoose.Types.ObjectId();
        const prog1 = await certCtrl.getDomainMilestoneProgress(cand1);
        const active1 = prog1.activeCategoryProgress;
        assert(active1.length === 0, 'Candidate with 0 qualifying interviews has 0 active categories (domains are hidden)');

        // --- SCENARIO 2: Candidate with 1 eligible IT interview -> IT shows 1/3 ---
        const cand2 = new mongoose.Types.ObjectId();
        const exp2 = new mongoose.Types.ObjectId();
        const sess2 = await createTestSession({
            sessionId: `scen2-${runId}`,
            candidateId: cand2,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date()
        });
        await ReviewDetails.create({
            sessionId: sess2.sessionId,
            candidateId: cand2,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 5
        });
        const prog2 = await certCtrl.getDomainMilestoneProgress(cand2);
        const itProg2 = prog2.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
        assert(itProg2.progressInMilestone === 1 && itProg2.remainingForMilestone === 2, 'Candidate with 1 eligible IT interview shows 1/3 (needs 2 more)');

        // --- SCENARIO 3: Candidate with 2 eligible IT interviews -> IT shows 2/3 ---
        const sess3 = await createTestSession({
            sessionId: `scen3-${runId}`,
            candidateId: cand2,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(),
            startTime: new Date()
        });
        await ReviewDetails.create({
            sessionId: sess3.sessionId,
            candidateId: cand2,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 4.5
        });
        const prog3 = await certCtrl.getDomainMilestoneProgress(cand2);
        const itProg3 = prog3.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
        assert(itProg3.progressInMilestone === 2 && itProg3.remainingForMilestone === 1, 'Candidate with 2 eligible IT interviews shows 2/3 (needs 1 more)');

        // --- SCENARIO 4: Candidate with 3 eligible IT interviews -> IT certificate is ready (3/3) ---
        const sess4 = await createTestSession({
            sessionId: `scen4-${runId}`,
            candidateId: cand2,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(),
            startTime: new Date()
        });
        await ReviewDetails.create({
            sessionId: sess4.sessionId,
            candidateId: cand2,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 5
        });
        const prog4 = await certCtrl.getDomainMilestoneProgress(cand2);
        const itProg4 = prog4.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
        assert(itProg4.isEligibleForNext === true && itProg4.progressInMilestone === 3, 'Candidate with 3 eligible IT interviews has IT certificate ready (3/3)');

        // --- SCENARIO 5: Candidate with 6 eligible IT interviews and 1 issued certificate -> next milestone is correctly 3/3 ---
        const cand5 = new mongoose.Types.ObjectId();
        const sids5 = [];
        for (let i = 0; i < 6; i++) {
            const sid = `scen5-${runId}-${i}`;
            sids5.push(sid);
            await createTestSession({
                sessionId: sid,
                candidateId: cand5,
                expertId: exp2,
                categoryId: itCat._id,
                categoryNameSnapshot: itCat.name,
                status: 'completed',
                attendanceStatus: 'attended',
                candidateJoinedAt: new Date(),
                startTime: new Date(Date.now() - (6 - i) * 3600000),
                allocatedCertificateId: i < 3 ? `CERT-5-${runId}-M1` : null
            });
            await ReviewDetails.create({
                sessionId: sid,
                candidateId: cand5,
                expertId: exp2,
                reviewerRole: 'expert',
                overallRating: 5
            });
        }
        await createTestCert({
            userId: cand5,
            name: 'Mockeefy Master Interview Excellence Credential — IT Milestone 1',
            certificateId: `CERT-5-${runId}-M1`,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            milestoneNumber: 1,
            milestoneRange: 'Interviews 1–3',
            candidateNameSnapshot: 'Candidate Five',
            certificateStatus: 'ISSUED',
            qualifyingSessionIds: sids5.slice(0, 3),
            issueDate: new Date(),
            type: 'master',
            metadata: { sessionCount: 3, cycle: 1, milestoneNumber: 1 }
        });
        const prog5 = await certCtrl.getDomainMilestoneProgress(cand5);
        const itProg5 = prog5.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
        assert(itProg5.totalIssuedCount === 1 && itProg5.unallocatedCount === 3 && itProg5.isEligibleForNext === true && itProg5.progressInMilestone === 3,
            'Candidate with 6 eligible IT interviews and 1 issued certificate shows next milestone as 3/3 ready');

        // --- SCENARIO 6: Candidate with 9 eligible IT interviews and 2 issued certificates -> next milestone is correctly 3/3 ---
        const cand6 = new mongoose.Types.ObjectId();
        const sids6 = [];
        for (let i = 0; i < 9; i++) {
            const sid = `scen6-${runId}-${i}`;
            sids6.push(sid);
            await createTestSession({
                sessionId: sid,
                candidateId: cand6,
                expertId: exp2,
                categoryId: itCat._id,
                categoryNameSnapshot: itCat.name,
                status: 'completed',
                attendanceStatus: 'attended',
                candidateJoinedAt: new Date(),
                startTime: new Date(Date.now() - (9 - i) * 3600000),
                allocatedCertificateId: i < 3 ? `CERT-6-${runId}-M1` : (i < 6 ? `CERT-6-${runId}-M2` : null)
            });
            await ReviewDetails.create({
                sessionId: sid,
                candidateId: cand6,
                expertId: exp2,
                reviewerRole: 'expert',
                overallRating: 5
            });
        }
        await createTestCert([
            {
                userId: cand6,
                name: 'Mockeefy Master Interview Excellence Credential — IT Milestone 1',
                certificateId: `CERT-6-${runId}-M1`,
                categoryId: itCat._id,
                categoryNameSnapshot: itCat.name,
                milestoneNumber: 1,
                qualifyingSessionIds: sids6.slice(0, 3),
                certificateStatus: 'ISSUED'
            },
            {
                userId: cand6,
                name: 'Mockeefy Master Interview Excellence Credential — IT Milestone 2',
                certificateId: `CERT-6-${runId}-M2`,
                categoryId: itCat._id,
                categoryNameSnapshot: itCat.name,
                milestoneNumber: 2,
                qualifyingSessionIds: sids6.slice(3, 6),
                certificateStatus: 'ISSUED'
            }
        ]);
        const prog6 = await certCtrl.getDomainMilestoneProgress(cand6);
        const itProg6 = prog6.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
        assert(itProg6.totalIssuedCount === 2 && itProg6.unallocatedCount === 3 && itProg6.isEligibleForNext === true && itProg6.progressInMilestone === 3,
            'Candidate with 9 eligible IT interviews and 2 issued certificates shows next milestone as 3/3 ready');

        // --- SCENARIO 7: Candidate with 12 eligible IT interviews and 3 issued certificates -> next milestone is correctly 3/3 ---
        const cand7 = new mongoose.Types.ObjectId();
        const sids7 = [];
        for (let i = 0; i < 12; i++) {
            const sid = `scen7-${runId}-${i}`;
            sids7.push(sid);
            const mNum = Math.floor(i / 3) + 1;
            await createTestSession({
                sessionId: sid,
                candidateId: cand7,
                expertId: exp2,
                categoryId: itCat._id,
                categoryNameSnapshot: itCat.name,
                status: 'completed',
                attendanceStatus: 'attended',
                candidateJoinedAt: new Date(),
                startTime: new Date(Date.now() - (12 - i) * 3600000),
                allocatedCertificateId: mNum <= 3 ? `CERT-7-${runId}-M${mNum}` : null
            });
            await ReviewDetails.create({
                sessionId: sid,
                candidateId: cand7,
                expertId: exp2,
                reviewerRole: 'expert',
                overallRating: 5
            });
        }
        await createTestCert([1, 2, 3].map(m => ({
            userId: cand7,
            name: `Mockeefy Master Credential — IT Milestone ${m}`,
            certificateId: `CERT-7-${runId}-M${m}`,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            milestoneNumber: m,
            qualifyingSessionIds: sids7.slice((m - 1) * 3, m * 3),
            certificateStatus: 'ISSUED'
        })));
        const prog7 = await certCtrl.getDomainMilestoneProgress(cand7);
        const itProg7 = prog7.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
        assert(itProg7.totalIssuedCount === 3 && itProg7.unallocatedCount === 3 && itProg7.isEligibleForNext === true && itProg7.progressInMilestone === 3,
            'Candidate with 12 eligible IT interviews and 3 issued certificates shows next milestone as 3/3 ready');

        // --- SCENARIO 8: Candidate with 14 eligible IT interviews and 4 issued certificates -> next milestone is correctly 2/3 ---
        const cand8 = new mongoose.Types.ObjectId();
        const sids8 = [];
        for (let i = 0; i < 14; i++) {
            const sid = `scen8-${runId}-${i}`;
            sids8.push(sid);
            const mNum = Math.floor(i / 3) + 1;
            await createTestSession({
                sessionId: sid,
                candidateId: cand8,
                expertId: exp2,
                categoryId: itCat._id,
                categoryNameSnapshot: itCat.name,
                status: 'completed',
                attendanceStatus: 'attended',
                candidateJoinedAt: new Date(),
                startTime: new Date(Date.now() - (14 - i) * 3600000),
                allocatedCertificateId: mNum <= 4 ? `CERT-8-${runId}-M${mNum}` : null
            });
            await ReviewDetails.create({
                sessionId: sid,
                candidateId: cand8,
                expertId: exp2,
                reviewerRole: 'expert',
                overallRating: 5
            });
        }
        await createTestCert([1, 2, 3, 4].map(m => ({
            userId: cand8,
            name: `Mockeefy Master Credential — IT Milestone ${m}`,
            certificateId: `CERT-8-${runId}-M${m}`,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            milestoneNumber: m,
            qualifyingSessionIds: sids8.slice((m - 1) * 3, m * 3),
            certificateStatus: 'ISSUED'
        })));
        const prog8 = await certCtrl.getDomainMilestoneProgress(cand8);
        const itProg8 = prog8.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
        assert(itProg8.totalIssuedCount === 4 && itProg8.unallocatedCount === 2 && itProg8.progressInMilestone === 2 && itProg8.remainingForMilestone === 1,
            'Candidate with 14 eligible IT interviews and 4 issued certificates shows next milestone as 2/3 (needs 1 more)');

        // --- SCENARIO 9: Candidate with 1 IT, 1 Web Dev, 1 Cyber interview -> 3 separate 1/3 progress indicators ---
        const cand9 = new mongoose.Types.ObjectId();
        const cats9 = [itCat, webCat, cybCat];
        for (let i = 0; i < 3; i++) {
            const sid = `scen9-${runId}-${i}`;
            await createTestSession({
                sessionId: sid,
                candidateId: cand9,
                expertId: exp2,
                categoryId: cats9[i]._id,
                categoryNameSnapshot: cats9[i].name,
                status: 'completed',
                attendanceStatus: 'attended',
                candidateJoinedAt: new Date(),
                startTime: new Date()
            });
            await ReviewDetails.create({
                sessionId: sid,
                candidateId: cand9,
                expertId: exp2,
                reviewerRole: 'expert',
                overallRating: 5
            });
        }
        const prog9 = await certCtrl.getDomainMilestoneProgress(cand9);
        const it9 = prog9.categoryProgress.find(c => c.categoryId === itCat._id.toString());
        const web9 = prog9.categoryProgress.find(c => c.categoryId === webCat._id.toString());
        const cyb9 = prog9.categoryProgress.find(c => c.categoryId === cybCat._id.toString());
        assert(
            it9.progressInMilestone === 1 && it9.remainingForMilestone === 2 &&
            web9.progressInMilestone === 1 && web9.remainingForMilestone === 2 &&
            cyb9.progressInMilestone === 1 && cyb9.remainingForMilestone === 2 &&
            prog9.anyEligible === false,
            'Candidate with 1 IT, 1 Web Dev, and 1 Cyber interview shows three separate 1/3 progress indicators and 0 eligible certificates'
        );

        // --- SCENARIO 10: Candidate with 14 total IT sessions but only 10 genuinely eligible -> count only the 10 valid ---
        const cand10 = new mongoose.Types.ObjectId();
        for (let i = 0; i < 14; i++) {
            const isEligible = i < 10;
            const sid = `scen10-${runId}-${i}`;
            await createTestSession({
                sessionId: sid,
                candidateId: cand10,
                expertId: exp2,
                categoryId: itCat._id,
                categoryNameSnapshot: itCat.name,
                status: isEligible ? 'completed' : 'cancelled',
                attendanceStatus: isEligible ? 'attended' : 'scheduled',
                candidateJoinedAt: isEligible ? new Date() : null,
                startTime: new Date()
            });
            if (isEligible) {
                await ReviewDetails.create({
                    sessionId: sid,
                    candidateId: cand10,
                    expertId: exp2,
                    reviewerRole: 'expert',
                    overallRating: 4.5
                });
            }
        }
        const prog10 = await certCtrl.getDomainMilestoneProgress(cand10);
        const itProg10 = prog10.categoryProgress.find(c => c.categoryId === itCat._id.toString());
        assert(itProg10.totalEligibleCount === 10, 'Candidate with 14 total IT sessions but only 10 valid counts exactly 10 eligible sessions');

        // --- SCENARIO 11: Expert-only meeting attendance must not qualify ---
        const cand11 = new mongoose.Types.ObjectId();
        const sid11 = `scen11-${runId}`;
        await createTestSession({
            sessionId: sid11,
            candidateId: cand11,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'scheduled',
            candidateJoinedAt: null,
            expertJoinedAt: new Date(),
            startTime: new Date()
        });
        await ReviewDetails.create({
            sessionId: sid11,
            candidateId: cand11,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 5
        });
        await Meeting.create({
            meetingId: sid11,
            sessionId: sid11,
            expertId: exp2.toString(),
            candidateId: cand11.toString(),
            status: 'finished',
            activeUsers: [exp2.toString()], // Only expert!
            startTime: new Date(),
            endTime: new Date(Date.now() + 1800000)
        });
        const elig11 = await certCtrl.getEligibleCompletedSessions(cand11);
        assert(!elig11.some(s => s.sessionId === sid11), 'Expert-only meeting attendance strictly does not qualify');

        // --- SCENARIO 12: Missing candidate attendance evidence must not qualify automatically ---
        const cand12 = new mongoose.Types.ObjectId();
        const sid12 = `scen12-${runId}`;
        await createTestSession({
            sessionId: sid12,
            candidateId: cand12,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'scheduled',
            candidateJoinedAt: null,
            startTime: new Date()
        });
        await ReviewDetails.create({
            sessionId: sid12,
            candidateId: cand12,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 5
        });
        const elig12 = await certCtrl.getEligibleCompletedSessions(cand12);
        assert(!elig12.some(s => s.sessionId === sid12), 'Missing candidate attendance evidence does not qualify automatically');

        // --- SCENARIO 13: No-show and cancelled sessions must not qualify ---
        const cand13 = new mongoose.Types.ObjectId();
        const sid13a = `scen13a-${runId}`;
        const sid13b = `scen13b-${runId}`;
        await createTestSession({
            sessionId: sid13a,
            candidateId: cand13,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'CANDIDATE_NO_SHOW',
            attendanceStatus: 'no-show',
            startTime: new Date()
        });
        await createTestSession({
            sessionId: sid13b,
            candidateId: cand13,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'cancelled',
            attendanceStatus: 'scheduled',
            startTime: new Date()
        });
        const elig13 = await certCtrl.getEligibleCompletedSessions(cand13);
        assert(elig13.length === 0, 'No-show and cancelled sessions strictly disqualified');

        // --- SCENARIO 14: Completed sessions without expert feedback must not qualify ---
        const cand14 = new mongoose.Types.ObjectId();
        const sid14 = `scen14-${runId}`;
        await createTestSession({
            sessionId: sid14,
            candidateId: cand14,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(),
            startTime: new Date()
        });
        // NO ReviewDetails created!
        const elig14 = await certCtrl.getEligibleCompletedSessions(cand14);
        assert(!elig14.some(s => s.sessionId === sid14), 'Completed sessions without expert feedback strictly do not qualify');

        // --- SCENARIO 15: Sessions with valid candidate attendance, completed status, and expert evaluation must qualify ---
        const cand15 = new mongoose.Types.ObjectId();
        const sid15 = `scen15-${runId}`;
        await createTestSession({
            sessionId: sid15,
            candidateId: cand15,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(),
            startTime: new Date()
        });
        await ReviewDetails.create({
            sessionId: sid15,
            candidateId: cand15,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 5
        });
        const elig15 = await certCtrl.getEligibleCompletedSessions(cand15);
        assert(elig15.some(s => s.sessionId === sid15), 'Session with valid attendance, completed status, and expert evaluation qualifies');

        // --- SCENARIO 16: Previously allocated sessions must not be reused ---
        const cand16 = new mongoose.Types.ObjectId();
        const sid16a = `scen16a-${runId}`;
        await createTestSession({
            sessionId: sid16a,
            candidateId: cand16,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(),
            allocatedCertificateId: `CERT-16-${runId}`,
            startTime: new Date()
        });
        await ReviewDetails.create({
            sessionId: sid16a,
            candidateId: cand16,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 5
        });
        await createTestCert({
            userId: cand16,
            name: 'Mockeefy Master Credential — IT Milestone 1',
            certificateId: `CERT-16-${runId}`,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            milestoneNumber: 1,
            qualifyingSessionIds: [sid16a],
            certificateStatus: 'ISSUED'
        });
        const prog16 = await certCtrl.getDomainMilestoneProgress(cand16);
        const itProg16 = prog16.categoryProgress.find(c => c.categoryId === itCat._id.toString());
        assert(itProg16.unallocatedCount === 0 && !itProg16.unallocatedSessions.some(s => s.sessionId === sid16a),
            'Previously allocated session is consumed and cannot be reused');

        // --- SCENARIO 17: Existing issued certificates must remain unchanged ---
        const joelCert = await Certification.findOne({ certificateId: 'MCFY-MST-A163AA-2026' }).lean();
        assert(
            joelCert.candidateNameSnapshot === 'Joel' &&
            joelCert.categoryNameSnapshot === 'IT' &&
            joelCert.milestoneNumber === 1 &&
            joelCert.qualifyingSessionIds.length === 3,
            'Joel existing issued certificate MCFY-MST-A163AA-2026 remains completely intact and unchanged'
        );

        // --- SCENARIO 18: A newly created active category must work dynamically ---
        const newCatName = `Dynamic Category ${runId}`;
        const newCat = await Category.create({
            name: newCatName,
            status: 'Active',
            description: 'Dynamically created category'
        });
        const cand18 = new mongoose.Types.ObjectId();
        const sid18 = `scen18-${runId}`;
        await createTestSession({
            sessionId: sid18,
            candidateId: cand18,
            expertId: exp2,
            categoryId: newCat._id,
            categoryNameSnapshot: newCat.name,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(),
            startTime: new Date()
        });
        await ReviewDetails.create({
            sessionId: sid18,
            candidateId: cand18,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 5
        });
        const prog18 = await certCtrl.getDomainMilestoneProgress(cand18);
        const dynamicProg = prog18.categoryProgress.find(c => c.categoryId === newCat._id.toString());
        assert(Boolean(dynamicProg) && dynamicProg.totalEligibleCount === 1 && dynamicProg.categoryName === newCatName,
            'Newly created active category works dynamically without code changes');

        // --- SCENARIO 19: Progress must update after a new qualifying interview receives expert feedback ---
        const cand19 = new mongoose.Types.ObjectId();
        const sid19 = `scen19-${runId}`;
        await createTestSession({
            sessionId: sid19,
            candidateId: cand19,
            expertId: exp2,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(),
            startTime: new Date()
        });
        let prog19 = await certCtrl.getDomainMilestoneProgress(cand19);
        let itProg19 = prog19.categoryProgress.find(c => c.categoryId === itCat._id.toString());
        const countBefore = itProg19.totalEligibleCount;

        // Now expert submits review
        await ReviewDetails.create({
            sessionId: sid19,
            candidateId: cand19,
            expertId: exp2,
            reviewerRole: 'expert',
            overallRating: 5
        });
        prog19 = await certCtrl.getDomainMilestoneProgress(cand19);
        itProg19 = prog19.categoryProgress.find(c => c.categoryId === itCat._id.toString());
        assert(countBefore === 0 && itProg19.totalEligibleCount === 1 && itProg19.progressInMilestone === 1,
            'Progress dynamically updates from 0 to 1 after new interview receives expert feedback');

        // --- SCENARIO 20: Progress must update after a certificate is successfully issued ---
        const cand20 = new mongoose.Types.ObjectId();
        const sids20 = [];
        for (let i = 0; i < 3; i++) {
            const sid = `scen20-${runId}-${i}`;
            sids20.push(sid);
            await createTestSession({
                sessionId: sid,
                candidateId: cand20,
                expertId: exp2,
                categoryId: itCat._id,
                categoryNameSnapshot: itCat.name,
                status: 'completed',
                attendanceStatus: 'attended',
                candidateJoinedAt: new Date(),
                startTime: new Date(Date.now() - (3 - i) * 3600000)
            });
            await ReviewDetails.create({
                sessionId: sid,
                candidateId: cand20,
                expertId: exp2,
                reviewerRole: 'expert',
                overallRating: 5
            });
        }
        let prog20 = await certCtrl.getDomainMilestoneProgress(cand20);
        let itProg20 = prog20.categoryProgress.find(c => c.categoryId === itCat._id.toString());
        assert(itProg20.isEligibleForNext === true && itProg20.unallocatedCount === 3, 'Before issuance: Candidate has 3 unallocated sessions and is eligible');

        // Simulate issuance of Certificate 1
        await Session.updateMany(
            { sessionId: { $in: sids20 } },
            { $set: { allocatedCertificateId: `CERT-20-${runId}-M1`, allocatedMilestone: 1 } }
        );
        await createTestCert({
            userId: cand20,
            name: 'Mockeefy Master Credential — IT Milestone 1',
            certificateId: `CERT-20-${runId}-M1`,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            milestoneNumber: 1,
            qualifyingSessionIds: sids20,
            certificateStatus: 'ISSUED'
        });

        prog20 = await certCtrl.getDomainMilestoneProgress(cand20);
        itProg20 = prog20.categoryProgress.find(c => c.categoryId === itCat._id.toString());
        assert(itProg20.totalIssuedCount === 1 && itProg20.unallocatedCount === 0 && itProg20.isEligibleForNext === false && itProg20.progressInMilestone === 0,
            'After issuance: Unallocated resets to 0, totalIssued advances to 1, next milestone becomes Milestone 2');

    } catch (err) {
        console.error('Error running test suite:', err);
    } finally {
        console.log('\n======================================================================');
        console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
        console.log('======================================================================\n');
        process.exit(failedTests > 0 ? 1 : 0);
    }
}

runTwentyScenariosSuite();
