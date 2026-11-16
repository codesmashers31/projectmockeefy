const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function inspectTwoSessions() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const s1 = await mongoose.connection.collection("sessions").findOne({ sessionId: "session-1794417747621-czbzxynpj" });
  const s2 = await mongoose.connection.collection("sessions").findOne({ sessionId: "SES-1794481162380-GWRRG" });
  
  console.log("=== SESSION 1 (Eligible) ===");
  console.log(JSON.stringify(s1, null, 2));
  
  console.log("\n=== SESSION 2 (Excluded as MISSING_CATEGORY_DOMAIN) ===");
  console.log(JSON.stringify(s2, null, 2));

  // Check the expert for Session 2
  if (s2?.expertId) {
    const expertUser = await mongoose.connection.collection("users").findOne({ _id: s2.expertId });
    const expertDoc = await mongoose.connection.collection("expertdetails").findOne({ $or: [{ _id: s2.expertId }, { userId: s2.expertId }] });
    console.log("\n=== Session 2 Expert User ===", expertUser?.name, expertUser?.email);
    console.log("=== Session 2 ExpertDoc ===", expertDoc?.personalInformation, expertDoc?.professionalDetails, expertDoc?.skillsAndExpertise);
  }

  // Check all Categories in MongoDB
  const categories = await mongoose.connection.collection("categories").find({}).toArray();
  console.log("\n=== All Categories in MongoDB ===");
  categories.forEach(c => console.log(`  _id: ${c._id}, name: "${c.name}", status: "${c.status}"`));

  await mongoose.disconnect();
}
inspectTwoSessions().catch(console.error);
