const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");
  
  const users = await mongoose.connection.collection("users").find({}).project({ name: 1, email: 1, role: 1 }).toArray();
  console.log("Found", users.length, "users total.");
  for (const u of users) {
    console.log(`User: ${u.name} | Email: ${u.email} | Role: ${u.role} | ID: ${u._id}`);
  }

  const sessions = await mongoose.connection.collection("sessions").find({}).toArray();
  console.log("\nFound", sessions.length, "sessions total.");
  for (const s of sessions) {
    console.log(`Session: ${s.sessionId || s._id} | candidateId: ${s.candidateId} | expertId: ${s.expertId} | status: ${s.status} | attendanceStatus: ${s.attendanceStatus} | candidateJoinedAt: ${s.candidateJoinedAt} | category: ${s.category}`);
  }
  
  await mongoose.disconnect();
}
inspect().catch(console.error);
