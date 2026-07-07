import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';
import PricingRule from './models/PricingRule.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("MONGO_URI is required in .env");
    process.exit(1);
}

const defaultMatrix = {
    "IT": {
        "Rising Mentor": 499,
        "Professional Mentor": 999,
        "Senior Mentor": 1499,
        "Elite Mentor": 2499,
        "FAANG Mentor": 3999
    },
    "HR": {
        "Rising Mentor": 399,
        "Professional Mentor": 799,
        "Senior Mentor": 1299,
        "Elite Mentor": 1999,
        "FAANG Mentor": 2999
    },
    "Business": {
        "Rising Mentor": 499,
        "Professional Mentor": 999,
        "Senior Mentor": 1499,
        "Elite Mentor": 2499,
        "FAANG Mentor": 3499
    },
    "Design": {
        "Rising Mentor": 499,
        "Professional Mentor": 899,
        "Senior Mentor": 1399,
        "Elite Mentor": 2299,
        "FAANG Mentor": 3299
    },
    "AI": {
        "Rising Mentor": 999,
        "Professional Mentor": 1499,
        "Senior Mentor": 2499,
        "Elite Mentor": 3499,
        "FAANG Mentor": 4999
    }
};

const icons = {
    "IT": "Code",
    "HR": "Users",
    "Business": "Briefcase",
    "Design": "Palette",
    "AI": "Cpu"
};

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB for pricing seeding...");

        for (const [catName, levelPrices] of Object.entries(defaultMatrix)) {
            // Find or create Category
            let cat = await Category.findOne({ name: catName });
            if (!cat) {
                cat = await Category.create({
                    name: catName,
                    description: `${catName} Category`,
                    type: catName === "HR" ? "behavioral" : "technical",
                    icon: icons[catName] || "Layers",
                    status: "Active"
                });
                console.log(`Created Category: ${catName}`);
            } else {
                console.log(`Found Category: ${catName}`);
            }

            for (const [level, price] of Object.entries(levelPrices)) {
                // 30 min
                await PricingRule.findOneAndUpdate(
                    { categoryId: cat._id, level, duration: 30, skillId: null },
                    { price, currency: 'INR' },
                    { upsert: true }
                );

                // 60 min
                await PricingRule.findOneAndUpdate(
                    { categoryId: cat._id, level, duration: 60, skillId: null },
                    { price: Math.round(price * 1.8), currency: 'INR' },
                    { upsert: true }
                );
                console.log(`  Seeded ${catName} -> ${level}: 30m = ₹${price}, 60m = ₹${Math.round(price * 1.8)}`);
            }
        }

        console.log("Seeding pricing matrix completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

run();
