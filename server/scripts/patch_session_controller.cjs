const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../controllers/sessionController.js');
let c = fs.readFileSync(filePath, 'utf8');
c = c.replace(/\r\n/g, '\n');

// 1. Fix leaveSession query
const oldLeaveQuery = `        const session = await SessionModel.findOne({
            $or: [{ sessionId }, { _id: sessionId }]
        });`;
const newLeaveQuery = `        const mongoose = (await import('mongoose')).default;
        const query = mongoose.Types.ObjectId.isValid(sessionId)
            ? { $or: [{ sessionId }, { _id: sessionId }] }
            : { sessionId };
        const session = await SessionModel.findOne(query);`;

if (c.includes(oldLeaveQuery)) {
  c = c.replace(oldLeaveQuery, newLeaveQuery);
  console.log('Fixed leaveSession query');
}

// 2. Fix joinSession candidateJoinedAt & connection status
const oldJoin = `            if (assignedRole === 'candidate') {
                await SessionModel.findOneAndUpdate(
                    { sessionId: session.sessionId, attendanceStatus: { $ne: 'attended' } },
                    { $set: { attendanceStatus: 'attended', candidateJoinedAt: new Date() } }
                );
            }`;

const newJoin = `            if (assignedRole === 'candidate') {
                await SessionModel.findOneAndUpdate(
                    { sessionId: session.sessionId, candidateJoinedAt: null },
                    { $set: { attendanceStatus: 'attended', candidateJoinedAt: new Date(), candidateConnectionStatus: 'connected' } }
                );
                await SessionModel.updateOne(
                    { sessionId: session.sessionId, candidateJoinedAt: { $ne: null } },
                    { $set: { candidateConnectionStatus: 'connected' } }
                );
            }`;

if (c.includes(oldJoin)) {
  c = c.replace(oldJoin, newJoin);
  console.log('Fixed joinSession candidate status');
} else {
  console.log('oldJoin not matched');
}

fs.writeFileSync(filePath, c, 'utf8');
console.log('Successfully saved sessionController.js');
