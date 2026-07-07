import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExpertDetails from './models/ExpertDetails.js';
import User from './models/User.js';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mockeefy');
        
        const pipeline = [
          { $match: { status: "Active" } },
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
        ];

        const experts = await ExpertDetails.aggregate(pipeline);
        console.log(`🔍 Found ${experts.length} active experts.`);
        
        experts.slice(0, 5).forEach((expert, i) => {
            console.log(`\nExpert #${i + 1}: ${expert.userDetails?.name}`);
            console.log(`   User Bio: "${expert.userDetails?.personalInfo?.bio || 'NO BIO'}"`);
        });

    } catch (e) {
        console.error("❌ Error running test:", e);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
}
run();
