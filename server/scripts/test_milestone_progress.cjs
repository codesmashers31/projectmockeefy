const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function testProgress() {
    await mongoose.connect(process.env.MONGO_URI);
    const certCtrl = await import('../controllers/certificationController.js');

    const candidateOid = new mongoose.Types.ObjectId('6ad1fd8b146a0a4e7ca163aa');
    const eligibleSessions = await certCtrl.getEligibleCompletedSessions(candidateOid);
    console.log(`Eligible Sessions returned by getEligibleCompletedSessions: ${eligibleSessions.length}`);

    const progress = await certCtrl.getDomainMilestoneProgress(candidateOid);
    console.log('\nCategory Progress:');
    for (const cp of progress.categoryProgress) {
        console.log({
            categoryName: cp.categoryName,
            totalEligibleCount: cp.totalEligibleCount,
            totalIssuedCount: cp.totalIssuedCount,
            unallocatedCount: cp.unallocatedCount,
            nextMilestoneNumber: cp.nextMilestoneNumber,
            nextMilestoneRange: cp.nextMilestoneRange,
            progressInMilestone: cp.progressInMilestone,
            remainingForMilestone: cp.remainingForMilestone,
            isEligibleForNext: cp.isEligibleForNext
        });
    }

    process.exit(0);
}
testProgress();
