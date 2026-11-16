import mongoose from "mongoose";
import dotenv from "dotenv";
import ExpertDetails from "../models/expertModel.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const e10 = await ExpertDetails.findOne({ "professionalDetails.title": { $regex: /software/i } }).lean();
  const raw = await ExpertDetails.collection.findOne({ _id: e10?._id || new mongoose.Types.ObjectId("672ccb000000000000000000") });
  
  // Find the exact doc 10 from previous list
  const all = await ExpertDetails.find({ status: "Active", "settings.publicProfile": { $ne: false } }).lean();
  const doc10 = all[10];
  console.log("doc10 id:", doc10._id);
  const raw10 = await ExpertDetails.collection.findOne({ _id: doc10._id });
  console.log("raw10 availability:", JSON.stringify(raw10.availability));

  await mongoose.disconnect();
}

run().catch(console.error);
