const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function profile() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const ExpertDetails = (await import('../models/expertModel.js')).default;

  // Optimized pipeline using direct indexable localField/foreignField lookup
  const optimizedPipeline = [
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
        localField: "userId",
        foreignField: "expertId",
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
  const experts = await ExpertDetails.aggregate(optimizedPipeline);
  const dur = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`Optimized Expert Aggregate Time: ${dur.toFixed(2)} ms (Count: ${experts.length})`);

  await mongoose.disconnect();
}
profile().catch(console.error);
