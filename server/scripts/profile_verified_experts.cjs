const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function profile() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const ExpertDetails = (await import('../models/expertModel.js')).default;
  const ReviewDetails = (await import('../models/reviewModel.js')).default;

  // Measure current aggregate pipeline
  const pipeline = [
    { $match: { status: "Active", "settings.publicProfile": { $ne: false } } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails"
      }
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $lookup: {
        from: "reviews",
        let: { expertObjId: "$userId", expertStrId: { $toString: "$userId" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$expertId", "$$expertObjId"] },
                  { $eq: ["$expertId", "$$expertStrId"] }
                ]
              },
              isVisible: true
            }
          }
        ],
        as: "reviewsList"
      }
    },
    {
      $addFields: {
        avgRating: {
          $cond: {
            if: { $gt: [{ $size: "$reviewsList" }, 0] },
            then: { $round: [{ $avg: "$reviewsList.overallRating" }, 1] },
            else: 0
          }
        },
        reviewCount: { $size: "$reviewsList" }
      }
    }
  ];

  const t0 = process.hrtime.bigint();
  const experts = await ExpertDetails.aggregate(pipeline);
  const dur = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`Current Expert Aggregate Time: ${dur.toFixed(2)} ms (Count: ${experts.length})`);

  await mongoose.disconnect();
}
profile().catch(console.error);
