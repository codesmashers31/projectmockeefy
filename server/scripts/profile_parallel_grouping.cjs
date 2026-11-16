const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

async function profile() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const ExpertDetails = (await import('../models/expertModel.js')).default;
  const ReviewDetails = (await import('../models/reviewModel.js')).default;

  const t0 = process.hrtime.bigint();

  // Run Expert lookup + Review aggregation in parallel
  const [experts, reviewStats] = await Promise.all([
    ExpertDetails.aggregate([
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
      }
    ]),
    ReviewDetails.aggregate([
      { $match: { isVisible: true } },
      {
        $group: {
          _id: "$expertId",
          avgRating: { $avg: "$overallRating" },
          reviewCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const reviewMap = new Map();
  reviewStats.forEach(r => {
    if (r._id) reviewMap.set(String(r._id), r);
  });

  experts.forEach(e => {
    const stats = reviewMap.get(String(e.userId)) || reviewMap.get(String(e._id));
    e.avgRating = stats ? Math.round(stats.avgRating * 10) / 10 : 0;
    e.reviewCount = stats ? stats.reviewCount : 0;
  });

  const dur = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`Parallel Grouping Time: ${dur.toFixed(2)} ms (Experts: ${experts.length}, Review Groups: ${reviewStats.length})`);

  await mongoose.disconnect();
}
profile().catch(console.error);
