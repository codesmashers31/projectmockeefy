const fs = require('fs');

let fileContent = fs.readFileSync('server/controllers/reportController.js', 'utf8');

const oldSnippet = fileContent.substring(
    fileContent.indexOf('        // Payout Expert'),
    fileContent.indexOf('        res.status(201).json')
);

const newSnippet = `        // Payout Expert using single authoritative settlement function
        let walletCreditResult = null;
        try {
            const { settleExpertSessionPayout } = await import('./sessionController.js');
            walletCreditResult = await settleExpertSessionPayout({
                session,
                outcome: 'ATTENDED_COMPLETED',
                reason: 'Report submitted',
                actorUserId: expertId
            });
            session.status = 'evaluated';
            await session.save();
        } catch (walletErr) {
            console.error("Wallet credit inside createReport failed:", walletErr);
            walletCreditResult = { credited: false, amount: 0, reason: walletErr.message };
            session.status = 'evaluated';
            await session.save();
        }

`;

fileContent = fileContent.replace(oldSnippet, newSnippet);
fs.writeFileSync('server/controllers/reportController.js', fileContent, 'utf8');
console.log('reportController.js updated successfully');
