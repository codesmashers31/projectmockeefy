const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✓ PASS: ${testName}`);
        passedTests++;
    } else {
        console.error(`  ✗ FAIL: ${testName}`);
        failedTests++;
    }
}

async function runTests() {
    console.log("======================================================================");
    console.log("   DOMAIN-SPECIFIC RECURRING CERTIFICATES COMPREHENSIVE TEST SUITE   ");
    console.log("======================================================================\n");

    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // Load dynamic models
    const Category = (await import('../models/Category.js')).default;
    const Session = (await import('../models/Session.js')).default;
    const Certification = (await import('../models/Certification.js')).default;
    const User = (await import('../models/User.js')).default;
    const ReviewDetails = (await import('../models/reviewModel.js')).default;
    const {
        getEligibleCompletedSessions,
        getDomainMilestoneProgress,
        getMilestoneProgress
    } = await import('../controllers/certificationController.js');

    // ----------------------------------------------------------------------
    // TEST SECTION 1: Dynamic Category Resolution (Zero Hardcoded Category Arrays)
    // ----------------------------------------------------------------------
    console.log("--- TEST SECTION 1: Dynamic Category Resolution from MongoDB ---");
    const activeCategories = await Category.find({ status: 'Active' }).sort({ name: 1 }).lean();
    assert(activeCategories.length >= 10, `Active categories retrieved dynamically from MongoDB (found ${activeCategories.length})`);
    
    const itCat = activeCategories.find(c => c.name.toLowerCase() === 'it');
    const webDevCat = activeCategories.find(c => c.name.toLowerCase() === 'web development');
    const cyberCat = activeCategories.find(c => c.name.toLowerCase() === 'cybersecurity');
    
    assert(Boolean(itCat), "IT category dynamically retrieved from MongoDB");
    assert(Boolean(webDevCat), "Web Development category dynamically retrieved from MongoDB");
    assert(Boolean(cyberCat), "Cybersecurity category dynamically retrieved from MongoDB");

    // ----------------------------------------------------------------------
    // TEST SECTION 2: Joel's Historical Certificate & Session Preservation
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 2: Joel's Historical Certificate & Session Preservation ---");
    const joelCert = await Certification.findOne({ certificateId: 'MCFY-MST-A163AA-2026' }).lean();
    assert(Boolean(joelCert), "Joel's master certificate MCFY-MST-A163AA-2026 exists in DB");
    assert(joelCert.candidateNameSnapshot === 'Joel', `Joel's candidateNameSnapshot is permanently frozen as 'Joel' (got: ${joelCert.candidateNameSnapshot})`);
    assert(joelCert.categoryNameSnapshot === 'IT', `Joel's categoryNameSnapshot is preserved as 'IT' (got: ${joelCert.categoryNameSnapshot})`);
    assert(joelCert.categoryId.toString() === itCat._id.toString(), `Joel's certificate categoryId points to IT category`);
    assert(joelCert.milestoneNumber === 1, `Joel's milestoneNumber is 1 (got: ${joelCert.milestoneNumber})`);
    assert(joelCert.milestoneRange === 'Interviews 1–3', `Joel's milestoneRange is 'Interviews 1–3'`);
    assert(Array.isArray(joelCert.qualifyingSessionIds) && joelCert.qualifyingSessionIds.length === 3, `Joel's certificate has exactly 3 qualifying session IDs`);

    // Verify Joel's domain progress
    const joelProgress = await getDomainMilestoneProgress(joelCert.userId);
    const joelItProgress = joelProgress.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
    assert(Boolean(joelItProgress), "Joel's IT domain progress calculated correctly");
    const joelIssuedCerts = await Certification.find({ userId: joelCert.userId, categoryId: itCat._id }).lean();
    assert(joelItProgress.totalIssuedCount === joelIssuedCerts.length, `Joel has ${joelIssuedCerts.length} IT certificate(s) issued in DB (got: ${joelItProgress.totalIssuedCount})`);
    const expectedNextMilestone = joelIssuedCerts.length + 1;
    const expectedStart = joelIssuedCerts.length * 3 + 1;
    const expectedEnd = expectedStart + 2;
    const expectedRange = `Interviews ${expectedStart}–${expectedEnd}`;
    assert(joelItProgress.nextMilestoneNumber === expectedNextMilestone, `Joel's next IT milestone is Milestone ${expectedNextMilestone} (got: ${joelItProgress.nextMilestoneNumber})`);
    assert(joelItProgress.nextMilestoneRange === expectedRange, `Joel's next IT range is '${expectedRange}' (got: ${joelItProgress.nextMilestoneRange})`);
    assert(joelItProgress.totalEligibleCount === 16, `Joel has 16 total eligible IT sessions in MongoDB (got: ${joelItProgress.totalEligibleCount})`);
    const expectedUnallocated = 16 - (joelIssuedCerts.length * 3);
    assert(joelItProgress.unallocatedCount === expectedUnallocated, `Joel has ${expectedUnallocated} unallocated IT sessions awaiting certificate issuance (got: ${joelItProgress.unallocatedCount})`);
    assert(joelItProgress.isEligibleForNext === true, `Joel has >= 3 unallocated IT sessions and is eligible for Certificate ${expectedNextMilestone}`);

    // ----------------------------------------------------------------------
    // TEST SECTION 3: Mixed Domains Strict Disqualification
    // 1 IT + 1 Web Dev + 1 Cybersecurity = 0 Certs, 0 Domains Eligible
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 3: Mixed Domains Strict Disqualification ---");
    const testCandidateId = new mongoose.Types.ObjectId();
    const testExpertId = new mongoose.Types.ObjectId();

    // Create 3 sessions across 3 different categories
    const sidMixed1 = `mixed-it-${Date.now()}`;
    const sidMixed2 = `mixed-web-${Date.now()}`;
    const sidMixed3 = `mixed-cyb-${Date.now()}`;

    const sessionMixed1 = new Session({
        sessionId: sidMixed1,
        expertId: testExpertId,
        candidateId: testCandidateId,
        categoryId: itCat._id,
        categoryNameSnapshot: itCat.name,
        startTime: new Date(Date.now() - 3600000 * 3),
        endTime: new Date(Date.now() - 3600000 * 2.5),
        status: 'completed',
        attendanceStatus: 'attended',
        candidateJoinedAt: new Date(Date.now() - 3600000 * 3)
    });
    const sessionMixed2 = new Session({
        sessionId: sidMixed2,
        expertId: testExpertId,
        candidateId: testCandidateId,
        categoryId: webDevCat._id,
        categoryNameSnapshot: webDevCat.name,
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 1.5),
        status: 'completed',
        attendanceStatus: 'attended',
        candidateJoinedAt: new Date(Date.now() - 3600000 * 2)
    });
    const sessionMixed3 = new Session({
        sessionId: sidMixed3,
        expertId: testExpertId,
        candidateId: testCandidateId,
        categoryId: cyberCat._id,
        categoryNameSnapshot: cyberCat.name,
        startTime: new Date(Date.now() - 3600000 * 1),
        endTime: new Date(Date.now() - 3600000 * 0.5),
        status: 'completed',
        attendanceStatus: 'attended',
        candidateJoinedAt: new Date(Date.now() - 3600000 * 1)
    });

    await Session.insertMany([sessionMixed1, sessionMixed2, sessionMixed3]);

    // Create evaluations for each session with candidateId and expertId
    await ReviewDetails.insertMany([
        { sessionId: sidMixed1, reviewerRole: 'expert', candidateId: testCandidateId, expertId: testExpertId, overallRating: 4.5 },
        { sessionId: sidMixed2, reviewerRole: 'expert', candidateId: testCandidateId, expertId: testExpertId, overallRating: 4.0 },
        { sessionId: sidMixed3, reviewerRole: 'expert', candidateId: testCandidateId, expertId: testExpertId, overallRating: 4.2 }
    ]);

    const mixedProgress = await getDomainMilestoneProgress(testCandidateId);
    assert(mixedProgress.totalEligibleCount === 3, `Candidate has 3 total completed interviews across platform`);
    assert(mixedProgress.anyEligible === false, `Mixed domains DO NOT combine: anyEligible is strictly FALSE`);
    assert(mixedProgress.eligibleCategories.length === 0, `0 eligible categories for mixed domain candidate`);

    const itProg = mixedProgress.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
    const webProg = mixedProgress.categoryProgress.find(cp => cp.categoryId === webDevCat._id.toString());
    const cybProg = mixedProgress.categoryProgress.find(cp => cp.categoryId === cyberCat._id.toString());

    assert(itProg.unallocatedCount === 1, `IT domain has exactly 1 unallocated session (1/3)`);
    assert(itProg.isEligibleForNext === false, `IT domain is NOT eligible for certificate (needs 2 more)`);
    assert(webProg.unallocatedCount === 1, `Web Development domain has exactly 1 unallocated session (1/3)`);
    assert(webProg.isEligibleForNext === false, `Web Development domain is NOT eligible for certificate`);
    assert(cybProg.unallocatedCount === 1, `Cybersecurity domain has exactly 1 unallocated session (1/3)`);
    assert(cybProg.isEligibleForNext === false, `Cybersecurity domain is NOT eligible for certificate`);

    // ----------------------------------------------------------------------
    // TEST SECTION 4: Same-Domain Milestone 1 Issuance
    // Adding 2 more IT sessions -> IT reaches 3/3 -> IT Milestone 1 Unlocked
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 4: Same-Domain Milestone 1 Issuance ---");
    const sidIt2 = `it-extra-2-${Date.now()}`;
    const sidIt3 = `it-extra-3-${Date.now()}`;

    await Session.insertMany([
        new Session({
            sessionId: sidIt2,
            expertId: testExpertId,
            candidateId: testCandidateId,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            startTime: new Date(Date.now() - 1800000),
            endTime: new Date(Date.now() - 1500000),
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(Date.now() - 1800000)
        }),
        new Session({
            sessionId: sidIt3,
            expertId: testExpertId,
            candidateId: testCandidateId,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            startTime: new Date(Date.now() - 1200000),
            endTime: new Date(Date.now() - 900000),
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(Date.now() - 1200000)
        })
    ]);

    await ReviewDetails.insertMany([
        { sessionId: sidIt2, reviewerRole: 'expert', candidateId: testCandidateId, expertId: testExpertId, overallRating: 4.8 },
        { sessionId: sidIt3, reviewerRole: 'expert', candidateId: testCandidateId, expertId: testExpertId, overallRating: 4.6 }
    ]);

    const itEligibleProgress = await getDomainMilestoneProgress(testCandidateId);
    const itProgAfter = itEligibleProgress.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
    const webProgAfter = itEligibleProgress.categoryProgress.find(cp => cp.categoryId === webDevCat._id.toString());

    assert(itProgAfter.unallocatedCount === 3, `IT domain now has exactly 3 unallocated sessions`);
    assert(itProgAfter.isEligibleForNext === true, `IT domain is ELIGIBLE for Certificate 1`);
    assert(webProgAfter.unallocatedCount === 1, `Web Development remains unaffected at 1 unallocated`);
    assert(webProgAfter.isEligibleForNext === false, `Web Development remains NOT eligible`);
    assert(itEligibleProgress.anyEligible === true, `Overall candidate status has eligibility in IT`);
    assert(itEligibleProgress.eligibleCategories.length === 1, `Exactly 1 category is eligible (IT)`);

    // Simulate official issuance of IT Certificate 1
    const testUser = new User({
        _id: testCandidateId,
        email: `domain-test-${Date.now()}@mockeefy.com`,
        password: 'TestPassword123!',
        name: 'Alex Mercer',
        userType: 'candidate',
        certificateIdentityConfirmation: {
            confirmedName: 'Alex Mercer',
            confirmedAt: new Date(),
            confirmedForMilestone: 1,
            confirmedForCategoryId: itCat._id,
            confirmationReference: `REF-CONF-${Date.now()}`
        }
    });
    await testUser.save();

    const certIt1 = new Certification({
        userId: testCandidateId,
        name: `Mockeefy Master Interview Excellence Credential — IT Milestone 1`,
        certificateId: `MCFY-IT-${testCandidateId.toString().slice(-6).toUpperCase()}-2026-M1`,
        categoryId: itCat._id,
        categoryNameSnapshot: itCat.name,
        milestoneNumber: 1,
        milestoneRange: 'Interviews 1–3',
        candidateNameSnapshot: 'Alex Mercer',
        identityConfirmedAt: new Date(),
        certificateStatus: 'ISSUED',
        qualifyingSessionIds: [sidMixed1, sidIt2, sidIt3],
        issueDate: new Date()
    });
    await certIt1.save();

    await Session.updateMany(
        { sessionId: { $in: [sidMixed1, sidIt2, sidIt3] } },
        { $set: { allocatedCertificateId: certIt1.certificateId, allocatedMilestone: 1, certificateIssued: true } }
    );

    // ----------------------------------------------------------------------
    // TEST SECTION 5: Post-Issuance State & Session Consumption
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 5: Post-Issuance State & Session Consumption ---");
    const postIssueProgress = await getDomainMilestoneProgress(testCandidateId);
    const itProgPost = postIssueProgress.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
    const webProgPost = postIssueProgress.categoryProgress.find(cp => cp.categoryId === webDevCat._id.toString());

    assert(itProgPost.totalIssuedCount === 1, `IT domain now reports 1 issued certificate`);
    assert(itProgPost.unallocatedCount === 0, `IT domain unallocated count reset to 0 after allocating 3 sessions`);
    assert(itProgPost.isEligibleForNext === false, `IT domain is no longer eligible until 3 new IT sessions are completed`);
    assert(itProgPost.nextMilestoneNumber === 2, `IT domain advances to Milestone 2 (Interviews 4–6)`);
    assert(itProgPost.nextMilestoneRange === 'Interviews 4–6', `IT domain next milestone range is 'Interviews 4–6'`);

    // Web Development session remains completely untouched and unallocated
    assert(webProgPost.unallocatedCount === 1, `Web Development unallocated session is intact (not consumed by IT cert)`);

    // ----------------------------------------------------------------------
    // TEST SECTION 6: Cross-Category Independent Milestone 1 in Web Development
    // Adding 2 more Web Development sessions -> Web Dev reaches 3/3 -> Web Dev M1 Unlocked
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 6: Cross-Category Independent Milestone 1 in Web Development ---");
    const sidWeb2 = `web-extra-2-${Date.now()}`;
    const sidWeb3 = `web-extra-3-${Date.now()}`;

    await Session.insertMany([
        new Session({
            sessionId: sidWeb2,
            expertId: testExpertId,
            candidateId: testCandidateId,
            categoryId: webDevCat._id,
            categoryNameSnapshot: webDevCat.name,
            startTime: new Date(Date.now() - 600000),
            endTime: new Date(Date.now() - 300000),
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(Date.now() - 600000)
        }),
        new Session({
            sessionId: sidWeb3,
            expertId: testExpertId,
            candidateId: testCandidateId,
            categoryId: webDevCat._id,
            categoryNameSnapshot: webDevCat.name,
            startTime: new Date(Date.now() - 200000),
            endTime: new Date(Date.now() - 50000),
            status: 'completed',
            attendanceStatus: 'attended',
            candidateJoinedAt: new Date(Date.now() - 200000)
        })
    ]);

    await ReviewDetails.insertMany([
        { sessionId: sidWeb2, reviewerRole: 'expert', candidateId: testCandidateId, expertId: testExpertId, overallRating: 4.7 },
        { sessionId: sidWeb3, reviewerRole: 'expert', candidateId: testCandidateId, expertId: testExpertId, overallRating: 4.9 }
    ]);

    const webEligibleProgress = await getDomainMilestoneProgress(testCandidateId);
    const itProgWebTest = webEligibleProgress.categoryProgress.find(cp => cp.categoryId === itCat._id.toString());
    const webProgWebTest = webEligibleProgress.categoryProgress.find(cp => cp.categoryId === webDevCat._id.toString());

    assert(webProgWebTest.unallocatedCount === 3, `Web Development domain now has exactly 3 unallocated sessions`);
    assert(webProgWebTest.isEligibleForNext === true, `Web Development domain is ELIGIBLE for Milestone 1`);
    assert(webProgWebTest.nextMilestoneNumber === 1, `Web Development next milestone is Milestone 1`);
    assert(itProgWebTest.unallocatedCount === 0, `IT domain remains at 0 unallocated (independent from Web Dev)`);

    // Issue Web Development Certificate 1
    const certWeb1 = new Certification({
        userId: testCandidateId,
        name: `Mockeefy Master Interview Excellence Credential — Web Development Milestone 1`,
        certificateId: `MCFY-WEBD-${testCandidateId.toString().slice(-6).toUpperCase()}-2026-M1`,
        categoryId: webDevCat._id,
        categoryNameSnapshot: webDevCat.name,
        milestoneNumber: 1,
        milestoneRange: 'Interviews 1–3',
        candidateNameSnapshot: 'Alex Mercer',
        identityConfirmedAt: new Date(),
        certificateStatus: 'ISSUED',
        qualifyingSessionIds: [sidMixed2, sidWeb2, sidWeb3],
        issueDate: new Date()
    });
    await certWeb1.save();

    await Session.updateMany(
        { sessionId: { $in: [sidMixed2, sidWeb2, sidWeb3] } },
        { $set: { allocatedCertificateId: certWeb1.certificateId, allocatedMilestone: 1, certificateIssued: true } }
    );

    // Verify dual certificate status
    const dualProgress = await getDomainMilestoneProgress(testCandidateId);
    assert(dualProgress.totalIssuedCount === 2, `Candidate now owns 2 official domain certificates (1 IT + 1 Web Dev)`);
    assert(dualProgress.allIssuedCertificates.some(c => c.categoryNameSnapshot === 'IT' && c.milestoneNumber === 1), "Candidate has IT Milestone 1 certificate in history");
    assert(dualProgress.allIssuedCertificates.some(c => c.categoryNameSnapshot === 'Web Development' && c.milestoneNumber === 1), "Candidate has Web Development Milestone 1 certificate in history");

    // ----------------------------------------------------------------------
    // TEST SECTION 7: Compound Unique Index Safety & Concurrency
    // Candidate can hold Milestone 1 in IT AND Milestone 1 in Web Dev simultaneously
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 7: Compound Unique Index Safety ---");
    const certsCount = await Certification.countDocuments({
        userId: testCandidateId,
        milestoneNumber: 1
    });
    assert(certsCount === 2, `Compound index allows simultaneous Milestone 1 across different categories (found: ${certsCount})`);

    // Verify duplicate attempt in SAME category is rejected
    let duplicateRejected = false;
    try {
        const dupCert = new Certification({
            userId: testCandidateId,
            name: `Duplicate IT Cert`,
            certificateId: `DUP-${Date.now()}`,
            categoryId: itCat._id,
            categoryNameSnapshot: itCat.name,
            milestoneNumber: 1,
            candidateNameSnapshot: 'Alex Mercer',
            qualifyingSessionIds: ['s1', 's2', 's3']
        });
        await dupCert.save();
    } catch (err) {
        if (err.code === 11000) duplicateRejected = true;
    }
    assert(duplicateRejected === true, `Duplicate Certificate for same user + same category + same milestone is rejected by compound unique index`);

    // ----------------------------------------------------------------------
    // TEST SECTION 8: Ribbon Plaque Title & Description Formatting
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 8: Ribbon Plaque Title & Description Formatting ---");
    const formatRibbonText = (domain) => {
        const raw = (domain || 'IT').trim();
        if (raw.toLowerCase() === 'it') return "IT PROFESSIONAL MOCK INTERVIEW SESSION";
        return `${raw.toUpperCase()} MOCK INTERVIEW SESSION`;
    };

    assert(formatRibbonText('IT') === 'IT PROFESSIONAL MOCK INTERVIEW SESSION', "IT domain ribbon formats as 'IT PROFESSIONAL MOCK INTERVIEW SESSION'");
    assert(formatRibbonText('it') === 'IT PROFESSIONAL MOCK INTERVIEW SESSION', "Case-insensitive 'it' ribbon formats as 'IT PROFESSIONAL MOCK INTERVIEW SESSION'");
    assert(formatRibbonText('Web Development') === 'WEB DEVELOPMENT MOCK INTERVIEW SESSION', "Web Development ribbon formats as 'WEB DEVELOPMENT MOCK INTERVIEW SESSION'");
    assert(formatRibbonText('Cybersecurity') === 'CYBERSECURITY MOCK INTERVIEW SESSION', "Cybersecurity ribbon formats as 'CYBERSECURITY MOCK INTERVIEW SESSION'");
    assert(formatRibbonText('Full Stack Development (MERN)') === 'FULL STACK DEVELOPMENT (MERN) MOCK INTERVIEW SESSION', "Long category ribbon formats cleanly");

    const formatDescription = (domain) => {
        return `has successfully completed a structured mock interview in the ${domain || "IT"} domain, demonstrating dedication to improving interview skills and professional growth.`;
    };

    assert(formatDescription('Web Development').includes('in the Web Development domain'), "Achievement description contains 'in the Web Development domain'");
    assert(formatDescription('IT').includes('in the IT domain'), "Achievement description contains 'in the IT domain'");

    // ----------------------------------------------------------------------
    // TEST SECTION 9: Candidate Attendance Security
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 9: Strict Attendance Security ---");
    const noShowSid = `noshow-sec-${Date.now()}`;
    await Session.create({
        sessionId: noShowSid,
        expertId: testExpertId,
        candidateId: testCandidateId,
        categoryId: itCat._id,
        categoryNameSnapshot: itCat.name,
        startTime: new Date(Date.now() - 100000),
        endTime: new Date(Date.now() - 50000),
        status: 'CANDIDATE_NO_SHOW',
        attendanceStatus: 'no-show'
    });
    await ReviewDetails.create({ sessionId: noShowSid, reviewerRole: 'expert', candidateId: testCandidateId, expertId: testExpertId, overallRating: 1 });

    const attendanceSessions = await getEligibleCompletedSessions(testCandidateId);
    const noShowIncluded = attendanceSessions.some(s => s.sessionId === noShowSid);
    assert(noShowIncluded === false, `Session with 'CANDIDATE_NO_SHOW' status is strictly disqualified from eligible sessions`);

    // Clean up test records
    await Session.deleteMany({ candidateId: testCandidateId });
    await Certification.deleteMany({ userId: testCandidateId });
    await User.deleteOne({ _id: testCandidateId });
    await ReviewDetails.deleteMany({ sessionId: { $in: [sidMixed1, sidMixed2, sidMixed3, sidIt2, sidIt3, sidWeb2, sidWeb3, noShowSid] } });

    console.log("\n======================================================================");
    console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
    console.log("======================================================================");

    await mongoose.disconnect();
    if (failedTests > 0) process.exit(1);
}

runTests().catch(err => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
});
