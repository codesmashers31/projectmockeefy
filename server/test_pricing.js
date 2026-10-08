import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import PricingRule from './models/PricingRule.js';

dotenv.config({ path: './.env' });

const testPricing = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        const expertId = "6a3c0d59089e5dab6ec34346";
        const durationNum = 30;
        const level = "Intermediate";

        const Expert = (await import('./models/expertModel.js')).default;
        const expert = await Expert.findOne({ $or: [{ _id: expertId }, { userId: expertId }] }).lean();
        console.log("Found Expert:", expert ? { id: expert._id, cat: expert.personalInformation?.category || expert.category } : null);

        const categoryName = expert?.personalInformation?.category || expert?.category || "IT";
        const catDoc = await Category.findOne({ name: categoryName });
        console.log("Found Category:", catDoc?.name, catDoc?._id);

        const rule = await PricingRule.findOne({ categoryId: catDoc._id, level, duration: durationNum });
        console.log("Found PricingRule for Intermediate 30m:", rule);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testPricing();
