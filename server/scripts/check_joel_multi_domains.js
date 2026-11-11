import mongoose from "mongoose";
import dotenv from "dotenv";
import Session from "../models/Session.js";
import Category from "../models/Category.js";
import User from "../models/User.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const joel = await User.findById("6ad1fd8b146a0a4e7ca163aa");
  console.log("Found user:", joel.name);

  // Check categories
  const webCat = await Category.findOne({ name: "Web Development" });
  const softCat = await Category.findOne({ name: "Software Development" });
  console.log("Web Dev cat ID:", webCat?._id);
  console.log("Soft Dev cat ID:", softCat?._id);

  // Check Joel's sessions
  const sessions = await Session.find({ candidateId: joel._id }).lean();
  console.log(`Total sessions for Joel: ${sessions.length}`);
  const catDistribution = {};
  sessions.forEach(s => {
    const k = s.categoryNameSnapshot || s.category || "Unknown";
    catDistribution[k] = (catDistribution[k] || 0) + 1;
  });
  console.log("Category distribution of all sessions:", catDistribution);

  await mongoose.disconnect();
}

run().catch(console.error);
