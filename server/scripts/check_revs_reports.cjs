const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function checkReviewsAndReports() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const sid1 = "ses_cert_1_1794542297530_o5f9";
  const sid2 = "ses_cert_2_1794542297530_o5f9";
  
  const session1 = await mongoose.connection.collection("sessions").findOne({ sessionId: sid1 });
  const session2 = await mongoose.connection.collection("sessions").findOne({ sessionId: sid2 });
  
  console.log("Session 1 _id:", session1?._id);
  console.log("Session 2 _id:", session2?._id);
  
  const allIds1 = [sid1, session1?._id?.toString(), session1?._id].filter(Boolean);
  const allIds2 = [sid2, session2?._id?.toString(), session2?._id].filter(Boolean);
  
  const revs1 = await mongoose.connection.collection("reviewdetails").find({ sessionId: { $in: allIds1 } }).toArray();
  const reports1 = await mongoose.connection.collection("reports").find({ sessionId: { $in: allIds1 } }).toArray();
  console.log("Session 1 revs:", revs1);
  console.log("Session 1 reports:", reports1);
  
  const revs2 = await mongoose.connection.collection("reviewdetails").find({ sessionId: { $in: allIds2 } }).toArray();
  const reports2 = await mongoose.connection.collection("reports").find({ sessionId: { $in: allIds2 } }).toArray();
  console.log("Session 2 revs:", revs2);
  console.log("Session 2 reports:", reports2);
  
  await mongoose.disconnect();
}
checkReviewsAndReports().catch(console.error);
