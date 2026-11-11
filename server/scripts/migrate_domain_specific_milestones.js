import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("Missing MONGO_URI in server/.env");
    process.exit(1);
}

async function runMigration() {
    console.log("=== STARTING DOMAIN-SPECIFIC RECURRING CERTIFICATE MIGRATION ===");
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    // 1. Create Backups
    const backupDir = path.join(__dirname, '../data/backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = Date.now();
    const certsBackup = await db.collection('certifications').find({}).toArray();
    const sessionsBackup = await db.collection('sessions').find({}).toArray();

    fs.writeFileSync(
        path.join(backupDir, `domain_migration_certs_${timestamp}.json`),
        JSON.stringify(certsBackup, null, 2)
    );
    fs.writeFileSync(
        path.join(backupDir, `domain_migration_sessions_${timestamp}.json`),
        JSON.stringify(sessionsBackup, null, 2)
    );
    console.log(`[Backup] Backed up ${certsBackup.length} certifications and ${sessionsBackup.length} sessions to ${backupDir}`);

    // 2. Fetch Active Categories
    const categories = await db.collection('categories').find({}).toArray();
    console.log(`[Categories] Found ${categories.length} categories in database.`);
    const itCat = categories.find(c => (c.name || '').trim().toLowerCase() === 'it') ||
                  categories.find(c => c._id.toString() === '69b24ba89200beae7b2abcf0');

    if (!itCat) {
        throw new Error("Could not locate IT category in categories collection!");
    }
    console.log(`[Categories] IT Category identified: ID=${itCat._id}, Name=${itCat.name}`);

    // Map category names case-insensitively to docs
    const categoryMap = new Map();
    categories.forEach(c => {
        categoryMap.set((c.name || '').trim().toLowerCase(), c);
    });

    // 3. Drop legacy global index on certifications if present
    const certIndexes = await db.collection('certifications').indexes();
    const hasGlobalIndex = certIndexes.some(idx => idx.name === 'userId_1_milestoneNumber_1');
    if (hasGlobalIndex) {
        console.log("[Indexes] Dropping legacy global index 'userId_1_milestoneNumber_1'...");
        await db.collection('certifications').dropIndex('userId_1_milestoneNumber_1');
        console.log("[Indexes] Dropped 'userId_1_milestoneNumber_1' successfully.");
    }

    // Ensure new compound index exists: userId + categoryId + milestoneNumber
    console.log("[Indexes] Ensuring new compound unique index { userId: 1, categoryId: 1, milestoneNumber: 1 }...");
    await db.collection('certifications').createIndex(
        { userId: 1, categoryId: 1, milestoneNumber: 1 },
        { unique: true, sparse: true, name: 'userId_1_categoryId_1_milestoneNumber_1' }
    );
    await db.collection('certifications').createIndex(
        { categoryId: 1 },
        { name: 'categoryId_1' }
    );
    console.log("[Indexes] Certification indexes updated.");

    // 4. Update Expert Details & Sessions categoryId / categoryNameSnapshot
    const experts = await db.collection('expertdetails').find({}).toArray();
    const expertCategoryMap = new Map();
    experts.forEach(exp => {
        const catName = exp.personalInformation?.category || exp.category || 'IT';
        if (exp._id) expertCategoryMap.set(exp._id.toString(), catName);
        if (exp.userId) expertCategoryMap.set(exp.userId.toString(), catName);
    });

    console.log(`[Experts] Loaded ${experts.length} expert records for category resolution.`);

    // 5. Update Sessions
    let sessionsUpdated = 0;
    const allSessions = await db.collection('sessions').find({}).toArray();
    for (const session of allSessions) {
        let catName = session.categoryNameSnapshot;
        if (!catName && session.expertId) {
            catName = expertCategoryMap.get(session.expertId.toString()) || 'IT';
        }
        if (!catName) catName = 'IT';

        const catDoc = categoryMap.get(catName.trim().toLowerCase()) || itCat;
        const updateFields = {};
        if (!session.categoryId || session.categoryId.toString() !== catDoc._id.toString()) {
            updateFields.categoryId = catDoc._id;
        }
        if (session.categoryNameSnapshot !== catDoc.name) {
            updateFields.categoryNameSnapshot = catDoc.name;
        }

        if (Object.keys(updateFields).length > 0) {
            await db.collection('sessions').updateOne(
                { _id: session._id },
                { $set: updateFields }
            );
            sessionsUpdated++;
        }
    }
    console.log(`[Sessions] Updated ${sessionsUpdated} of ${allSessions.length} sessions with categoryId and categoryNameSnapshot.`);

    // 6. Update Certifications with categoryId and categoryNameSnapshot
    let certsUpdated = 0;
    for (const cert of certsBackup) {
        let targetCategory = itCat;

        // If qualifyingSessionIds exist, check their category
        if (Array.isArray(cert.qualifyingSessionIds) && cert.qualifyingSessionIds.length > 0) {
            const firstSid = cert.qualifyingSessionIds[0];
            const matchingSession = await db.collection('sessions').findOne({ sessionId: firstSid });
            if (matchingSession?.categoryId) {
                const foundCat = categories.find(c => c._id.toString() === matchingSession.categoryId.toString());
                if (foundCat) targetCategory = foundCat;
            }
        }

        const updateFields = {
            categoryId: targetCategory._id,
            categoryNameSnapshot: targetCategory.name,
            milestoneNumber: cert.milestoneNumber || 1,
            milestoneRange: cert.milestoneRange || 'Interviews 1–3',
            candidateNameSnapshot: (cert.candidateNameSnapshot || 'Joel').trim()
        };

        if (cert.certificateId === 'MCFY-MST-A163AA-2026') {
            updateFields.name = 'Mockeefy Master Interview Excellence Credential — IT Milestone 1';
        }

        await db.collection('certifications').updateOne(
            { _id: cert._id },
            { $set: updateFields }
        );
        certsUpdated++;
    }
    console.log(`[Certifications] Updated ${certsUpdated} certifications with categoryId and categoryNameSnapshot.`);

    // 7. Verify Joel's Certificate
    const joelCert = await db.collection('certifications').findOne({ certificateId: 'MCFY-MST-A163AA-2026' });
    console.log("[Verification] Joel's Migrated Certificate:", JSON.stringify({
        certificateId: joelCert.certificateId,
        name: joelCert.name,
        candidateNameSnapshot: joelCert.candidateNameSnapshot,
        categoryId: joelCert.categoryId,
        categoryNameSnapshot: joelCert.categoryNameSnapshot,
        milestoneNumber: joelCert.milestoneNumber,
        milestoneRange: joelCert.milestoneRange,
        qualifyingSessionIds: joelCert.qualifyingSessionIds
    }, null, 2));

    console.log("=== DOMAIN-SPECIFIC MIGRATION COMPLETED SUCCESSFULLY ===");
    await mongoose.disconnect();
}

runMigration().catch(err => {
    console.error("Migration error:", err);
    process.exit(1);
});
