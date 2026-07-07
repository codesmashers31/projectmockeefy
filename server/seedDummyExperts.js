import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import ExpertDetails from './models/expertModel.js';
import Category from './models/Category.js';
import Skill from './models/Skill.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

const seedDatabase = async () => {
    try {
        await connectDB();

        console.log('🧹 Clearing existing expert data...');
        // Find existing experts to delete their details
        const expertUsers = await User.find({ userType: 'expert' });
        const expertUserIds = expertUsers.map(u => u._id);

        await ExpertDetails.deleteMany({ userId: { $in: expertUserIds } });
        await User.deleteMany({ userType: 'expert' });

        console.log('🌱 Fetching categories and skills...');
        const allCategories = await Category.find({});
        const allSkills = await Skill.find({});

        if (allCategories.length === 0) {
            console.log('⚠️ No categories found. Please run seedCategoriesAndSkills.js first!');
            process.exit(1);
        }

        const categories = ["IT", "Software Development", "Web Development", "Mobile Development", "DevOps & Cloud", "Data Science & ML", "Cybersecurity", "Database", "QA & Testing", "Agile & Project Management", "System Design", "AI", "HR", "Business", "Design"];
        
        const firstNames = ["James", "Sarah", "Michael", "Emma", "Robert", "Olivia", "David", "Sophia", "John", "Emily", "William", "Ava", "Richard", "Isabella", "Joseph", "Mia", "Thomas", "Charlotte", "Charles", "Amelia", "Daniel", "Sofia", "Matthew", "Chloe", "Anthony", "Evelyn", "Mark", "Abigail", "Donald", "Harper", "Steven", "Emily", "Andrew", "Elizabeth", "Paul", "Sofia", "Kevin", "Avery", "George", "Ella", "Edward", "Madison", "Ronald", "Scarlett", "Timothy", "Victoria"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell"];

        const companies = ["Google", "Microsoft", "Amazon", "Netflix", "Meta", "Apple", "Tesla", "IBM", "Oracle", "Salesforce"];
        const degrees = ["B.Tech", "MBA", "B.Des", "BBA", "M.Tech", "BS", "MS", "B.Com"];
        const institutions = ["MIT", "Stanford", "Harvard", "IIT Bombay", "IIT Delhi", "Oxford", "Cambridge", "Yale"];

        const expertDocs = [];
        const userDocs = [];

        console.log('🌱 Generating 45 experts (3 per category)...');

        for (let i = 0; i < 45; i++) {
            const category = categories[i % categories.length]; // Distribute evenly
            const firstName = firstNames[i % firstNames.length];
            const lastName = lastNames[i % lastNames.length];
            // Ensure unique names/emails
            const suffix = Math.floor(i / categories.length) + 1;
            const fullName = `${firstName} ${lastName} ${suffix > 1 ? suffix : ''}`.trim();
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@example.com`;

            // Hash the email as the password!
            const hashedPassword = await bcrypt.hash(email, 10);

            // Find category ID from database
            const catDoc = allCategories.find(c => c.name.toLowerCase() === category.toLowerCase()) || allCategories[0];
            const actualCategoryName = catDoc.name;

            // Find skills for this category
            const catSkills = allSkills.filter(s => s.categoryId.toString() === catDoc._id.toString());
            // Select up to 4 random skills
            const selectedSkills = catSkills.sort(() => 0.5 - Math.random()).slice(0, 4);

            const expertSkills = selectedSkills.map(s => ({
                skillId: s._id,
                level: "Advanced",
                isEnabled: true
            }));

            const skillNames = selectedSkills.map(s => s.name);

            // Create User Document
            const user = new User({
                email: email,
                password: hashedPassword,
                userType: 'expert',
                name: fullName,
                profileImage: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
                personalInfo: {
                    phone: `+1555000${1000 + i}`,
                    dateOfBirth: new Date(1985 + (i % 15), i % 12, (i % 28) + 1),
                    gender: i % 2 === 0 ? "Male" : "Female",
                    country: "USA",
                    state: "California",
                    city: "San Francisco",
                    bio: `Experienced ${actualCategoryName} professional with a passion for mentoring candidates.`
                },
                profileCompletion: 100
            });

            userDocs.push(user);

            // Create Expert Details Document
            const eduStart = 2005 + (i % 8);
            const eduEnd = eduStart + 4;
            const expStart = eduEnd;

            const expert = new ExpertDetails({
                userId: user._id, // Link to User
                profileImage: user.profileImage, // Sync image
                personalInformation: {
                    userName: fullName,
                    mobile: user.personalInfo.phone,
                    gender: user.personalInfo.gender,
                    dob: user.personalInfo.dateOfBirth,
                    country: user.personalInfo.country,
                    state: user.personalInfo.state,
                    city: user.personalInfo.city,
                    category: actualCategoryName
                },
                education: [{
                    degree: degrees[i % degrees.length],
                    institution: institutions[i % institutions.length],
                    field: actualCategoryName,
                    start: eduStart,
                    end: eduEnd
                }],
                professionalDetails: {
                    title: `Lead ${actualCategoryName} Expert`,
                    company: companies[i % companies.length],
                    totalExperience: 2026 - expStart,
                    industry: actualCategoryName,
                    previous: [{
                        company: companies[(i + 1) % companies.length],
                        title: `Senior ${actualCategoryName} Lead`,
                        start: expStart,
                        end: expStart + 5
                    }]
                },
                skillsAndExpertise: {
                    mode: "Online",
                    domains: [actualCategoryName, "Consulting", "Architecture"],
                    tools: skillNames.length > 0 ? skillNames : ["Jira", "Slack", "Zoom"],
                    languages: ["English", "Spanish"]
                },
                expertSkills: expertSkills,
                availability: {
                    sessionDuration: i % 2 === 0 ? 30 : 45, // Vary duration matching dynamic calculation
                    maxPerDay: 4,
                    weekly: {
                        "Monday": [{ from: "09:00", to: "17:00" }],
                        "Wednesday": [{ from: "09:00", to: "17:00" }],
                        "Friday": [{ from: "09:00", to: "17:00" }]
                    },
                    breakDates: []
                },
                verification: {
                    linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`
                },
                pricing: {
                    hourlyRate: 500 + (i * 10),
                    currency: "INR",
                    customPricing: false
                },
                metrics: {
                    totalSessions: Math.floor(Math.random() * 50) + 50,
                    completedSessions: Math.floor(Math.random() * 40) + 40,
                    cancelledSessions: Math.floor(Math.random() * 5),
                    avgRating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
                    totalReviews: Math.floor(Math.random() * 20) + 15,
                    avgResponseTime: Math.floor(Math.random() * 4) + 1
                },
                status: "Active"
            });

            expertDocs.push(expert);
        }

        // Save all documents
        await User.insertMany(userDocs);
        await ExpertDetails.insertMany(expertDocs);

        console.log(`✅ Successfully seeded ${userDocs.length} experts with category-specific skills!`);
        console.log('Sample User credentials:');
        console.log(`Email: ${userDocs[0].email}`);
        console.log(`Password: ${userDocs[0].email} (Email ID itself)`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
