import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

dotenv.config();

async function testDarwin() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const joel = await User.findById("6ad1fd8b146a0a4e7ca163aa");
  const token = jwt.sign(
    { email: joel.email, userType: joel.userType, name: joel.name, userId: joel._id },
    process.env.JWT_SECRET || "mockeefy_secret_key",
    { expiresIn: "1h" }
  );

  const res = await axios.get("http://localhost:5000/api/certifications/preview", {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("Darwin Preview API Status:", res.status);
  console.log("Stage:", res.data.data.stage);
  console.log("Completed Count:", res.data.data.completedCount);
  console.log("Unallocated Count:", res.data.data.unallocatedCount);
  console.log("Active Domains Count:", res.data.data.activeDomains.length);
  console.log("Active Domains:", JSON.stringify(res.data.data.activeDomains, null, 2));

  process.exit(0);
}

testDarwin().catch(console.error);
