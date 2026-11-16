const fs = require('fs');

// 1. Update client/src/pages/expert/Sessions.tsx
let clientFile = fs.readFileSync('client/src/pages/expert/Sessions.tsx', 'utf8');
const oldSnippet = clientFile.substring(clientFile.indexOf('const getSessionPayoutAmount'), clientFile.indexOf('const upcomingSessionsCount'));
const newSnippet = `const getSessionPayoutAmount = (session: Session | null | undefined): number => {
        if (!session) return 0;
        const directPayout = Number(session.payoutAmount || 0);
        if (directPayout > 0) return Math.round(directPayout * 100) / 100;
        const price = Number(session.price || 0);
        if (price > 0) {
            const totalPaise = Math.round(price * 100);
            return Math.min(totalPaise, Math.round(totalPaise * 0.80)) / 100;
        }
        return 0;
    };

    // --- REAL METRICS COUNTS ---
    `;
clientFile = clientFile.replace(oldSnippet, newSnippet);
fs.writeFileSync('client/src/pages/expert/Sessions.tsx', clientFile, 'utf8');
console.log('client/src/pages/expert/Sessions.tsx updated successfully');

// 2. Update server/controllers/sessionController.js
let serverFile = fs.readFileSync('server/controllers/sessionController.js', 'utf8');
// Replace line 720: pendingPayoutAmount = Math.max(1, Math.round(sessionPrice * 0.8 * 100) / 100);
const targetStr = "pendingPayoutAmount = Math.max(1, Math.round(sessionPrice * 0.8 * 100) / 100);";
const replacementStr = `const totalPaise = Math.round(sessionPrice * 100);\n                pendingPayoutAmount = Math.min(totalPaise, Math.round(totalPaise * 0.80)) / 100;`;
if (serverFile.includes(targetStr)) {
    serverFile = serverFile.replace(targetStr, replacementStr);
    fs.writeFileSync('server/controllers/sessionController.js', serverFile, 'utf8');
    console.log('server/controllers/sessionController.js updated successfully');
} else {
    console.log('targetStr not found in sessionController.js');
}
