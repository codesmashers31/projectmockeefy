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
    "IT": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3999, "Beginner": 499, "Intermediate": 999, "Advanced": 1499 },
    "HR": { "Rising Mentor": 399, "Professional Mentor": 799, "Senior Mentor": 1299, "Elite Mentor": 1999, "FAANG Mentor": 2999, "Beginner": 399, "Intermediate": 799, "Advanced": 1299 },
    "Business": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3499, "Beginner": 499, "Intermediate": 999, "Advanced": 1499 },
    "Design": { "Rising Mentor": 499, "Professional Mentor": 899, "Senior Mentor": 1399, "Elite Mentor": 2299, "FAANG Mentor": 3299, "Beginner": 499, "Intermediate": 899, "Advanced": 1399 },
    "AI": { "Rising Mentor": 999, "Professional Mentor": 1499, "Senior Mentor": 2499, "Elite Mentor": 3499, "FAANG Mentor": 4999, "Beginner": 999, "Intermediate": 1499, "Advanced": 2499 },
    "Software Development": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3999, "Beginner": 499, "Intermediate": 999, "Advanced": 1499 },
    "Web Development": { "Rising Mentor": 499, "Professional Mentor": 899, "Senior Mentor": 1399, "Elite Mentor": 2299, "FAANG Mentor": 3499, "Beginner": 499, "Intermediate": 899, "Advanced": 1399 },
    "Mobile Development": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3999, "Beginner": 499, "Intermediate": 999, "Advanced": 1499 },
    "DevOps & Cloud": { "Rising Mentor": 599, "Professional Mentor": 1099, "Senior Mentor": 1699, "Elite Mentor": 2699, "FAANG Mentor": 4299, "Beginner": 599, "Intermediate": 1099, "Advanced": 1699 },
    "Data Science & ML": { "Rising Mentor": 699, "Professional Mentor": 1199, "Senior Mentor": 1799, "Elite Mentor": 2899, "FAANG Mentor": 4499, "Beginner": 699, "Intermediate": 1199, "Advanced": 1799 },
    "Cybersecurity": { "Rising Mentor": 599, "Professional Mentor": 1099, "Senior Mentor": 1699, "Elite Mentor": 2699, "FAANG Mentor": 4299, "Beginner": 599, "Intermediate": 1099, "Advanced": 1699 },
    "Database": { "Rising Mentor": 499, "Professional Mentor": 899, "Senior Mentor": 1399, "Elite Mentor": 2299, "FAANG Mentor": 3499, "Beginner": 499, "Intermediate": 899, "Advanced": 1399 },
    "QA & Testing": { "Rising Mentor": 399, "Professional Mentor": 799, "Senior Mentor": 1299, "Elite Mentor": 1999, "FAANG Mentor": 2999, "Beginner": 399, "Intermediate": 799, "Advanced": 1299 },
    "Agile & Project Management": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3499, "Beginner": 499, "Intermediate": 999, "Advanced": 1499 },
    "System Design": { "Rising Mentor": 799, "Professional Mentor": 1299, "Senior Mentor": 1999, "Elite Mentor": 2999, "FAANG Mentor": 4999, "Beginner": 799, "Intermediate": 1299, "Advanced": 1999 },
    "Full Stack Development (MERN)": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3999, "Beginner": 499, "Intermediate": 999, "Advanced": 1499 }
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

        // Also fetch all categories from DB and make sure every category has rules
        const allCategories = await Category.find({});
        for (const cat of allCategories) {
            const levelPrices = defaultMatrix[cat.name] || defaultMatrix["IT"];
            for (const [level, price] of Object.entries(levelPrices)) {
                await PricingRule.findOneAndUpdate(
                    { categoryId: cat._id, level, duration: 30, skillId: null },
                    { price, currency: 'INR' },
                    { upsert: true }
                );
                await PricingRule.findOneAndUpdate(
                    { categoryId: cat._id, level, duration: 60, skillId: null },
                    { price: Math.round(price * 1.8), currency: 'INR' },
                    { upsert: true }
                );
            }
            console.log(`Seeded pricing for category: ${cat.name}`);
        }

        console.log("Seeding pricing matrix completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
}

run();
