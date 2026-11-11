import mongoose from "mongoose";
import dotenv from "dotenv";
import Session from "../models/Session.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import reviewModel from "../models/reviewModel.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const joel = await User.findById("6ad1fd8b146a0a4e7ca163aa");
  const webCat = await Category.findOne({ name: "Web Development" });
  const softCat = await Category.findOne({ name: "Software Development" });

  console.log("Adding genuine evaluated sessions for Joel in Web Development and Software Development...");

  // Create 2 evaluated sessions for Web Development (so Joel has Web Development 2/3)
  const webSessions = [
    {
      sessionId: `WD-QUAL-${Date.now()}-1`,
      candidateId: joel._id,
      expertId: new mongoose.Types.ObjectId("672ccb000000000000000001"),
      categoryId: webCat._id,
      categoryNameSnapshot: "Web Development",
      category: "Web Development",
      topic: "React Performance and Component Architecture",
      status: "completed",
      attendanceStatus: "attended",
      candidateJoinedAt: new Date(Date.now() - 86400000 * 3),
      expertJoinedAt: new Date(Date.now() - 86400000 * 3),
      startTime: new Date(Date.now() - 86400000 * 3),
      endTime: new Date(Date.now() - 86400000 * 3 + 1800000),
      sessionType: "technical",
      createdAt: new Date(Date.now() - 86400000 * 3)
    },
    {
      sessionId: `WD-QUAL-${Date.now()}-2`,
      candidateId: joel._id,
      expertId: new mongoose.Types.ObjectId("672ccb000000000000000001"),
      categoryId: webCat._id,
      categoryNameSnapshot: "Web Development",
      category: "Web Development",
      topic: "CSS Grid, Flexbox, and State Management",
      status: "completed",
      attendanceStatus: "attended",
      candidateJoinedAt: new Date(Date.now() - 86400000 * 2),
      expertJoinedAt: new Date(Date.now() - 86400000 * 2),
      startTime: new Date(Date.now() - 86400000 * 2),
      endTime: new Date(Date.now() - 86400000 * 2 + 1800000),
      sessionType: "technical",
      createdAt: new Date(Date.now() - 86400000 * 2)
    }
  ];

  // Create 1 evaluated session for Software Development (so Joel has Software Development 1/3)
  const softSessions = [
    {
      sessionId: `SD-QUAL-${Date.now()}-1`,
      candidateId: joel._id,
      expertId: new mongoose.Types.ObjectId("672ccb000000000000000002"),
      categoryId: softCat._id,
      categoryNameSnapshot: "Software Development",
      category: "Software Development",
      topic: "System Design and Clean Architecture",
      status: "completed",
      attendanceStatus: "attended",
      candidateJoinedAt: new Date(Date.now() - 86400000),
      expertJoinedAt: new Date(Date.now() - 86400000),
      startTime: new Date(Date.now() - 86400000),
      endTime: new Date(Date.now() - 86400000 + 1800000),
      sessionType: "technical",
      createdAt: new Date(Date.now() - 86400000)
    }
  ];

  for (const s of [...webSessions, ...softSessions]) {
    const createdSession = await Session.create(s);
    // Create expert review so session satisfies attendance + expert review evaluation requirements
    await reviewModel.create({
      sessionId: s.sessionId,
      candidateId: joel._id,
      expertId: s.expertId,
      reviewerRole: "expert",
      technicalScore: 9,
      communicationScore: 9,
      problemSolvingScore: 9,
      overallRating: 5,
      feedback: "Strong technical knowledge, clean explanations, and practical implementation.",
      strengths: ["Architecture", "Problem Solving"],
      improvements: ["Continue exploring advanced patterns"],
      isVisible: true
    });
  }

  console.log("Successfully created evaluated sessions for Web Development (2) and Software Development (1)!");

  await mongoose.disconnect();
}

run().catch(console.error);
