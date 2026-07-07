import PricingRule from "../models/PricingRule.js";
import Category from "../models/Category.js";
import Skill from "../models/Skill.js";
import PricingHistory from "../models/PricingHistory.js";

/* -------------------- Bulk Upsert Pricing Rules -------------------- */
export const bulkUpsertPricingRules = async (req, res) => {
    try {
        const { rules } = req.body;

        if (!rules || !Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ success: false, message: "No rules provided" });
        }

        const operations = rules.map(rule => {
            const { categoryId, skillId, level, duration, price, currency } = rule;

            // Define filter: unique combo of category, skill, level, duration
            // Note: skillId can be null, we explicitly query for it.
            const filter = {
                categoryId,
                skillId: skillId || null,
                level,
                duration
            };

            const update = { price, currency: currency || 'INR' };

            return {
                updateOne: {
                    filter,
                    update,
                    upsert: true
                }
            };
        });

        await PricingRule.bulkWrite(operations);

        res.json({ success: true, message: "Pricing rules updated successfully" });
    } catch (error) {
        console.error("Bulk Upsert Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- Get Rules by Category -------------------- */
export const getRulesByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { skillId, base } = req.query;

        let query = { categoryId };

        if (base === 'true') {
            query.skillId = null;
        } else if (skillId) {
            query.skillId = skillId;
        }

        const rules = await PricingRule.find(query);
        res.json(rules);
    } catch (error) {
        console.error("Get Rules Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- Calculate Price (Public/Booking) - legacy POST -------------------- */
export const calculatePrice = async (req, res) => {
    try {
        let { categoryId, skillId, level, duration } = req.body;

        if (!categoryId || !level || !duration) {
            return res.status(400).json({ success: false, message: "Missing filtering criteria" });
        }

        // Resolve Category ID if name is passed
        if (categoryId && !categoryId.match(/^[0-9a-fA-F]{24}$/)) {
            const categoryDoc = await Category.findOne({ name: categoryId });
            if (categoryDoc) {
                categoryId = categoryDoc._id;
            } else {
                return res.status(404).json({ success: false, message: "Category not found" });
            }
        }

        // 1. Try to find specific skill price
        let priceRule = null;
        if (skillId) {
            priceRule = await PricingRule.findOne({ categoryId, skillId, level, duration: Number(duration) });
        }

        // 2. If no skill price, find category base price
        if (!priceRule) {
            priceRule = await PricingRule.findOne({ categoryId, skillId: null, level, duration: Number(duration) });
        }

        if (!priceRule) {
            return res.status(404).json({ success: false, message: "Pricing not configured for this selection" });
        }

        res.json({ success: true, price: priceRule.price, currency: priceRule.currency });
    } catch (error) {
        console.error("Calculate Price Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- GET /calculate-price (category-based only: expert + duration + level) -------------------- */
export const getCalculatePrice = async (req, res) => {
    try {
        const { expertId, duration, level: levelOverride } = req.query;
        if (!expertId || !duration) {
            return res.status(400).json({
                success: false,
                message: "Missing required query params: expertId, duration",
            });
        }
        const durationNum = Number(duration);
        if (![30, 60].includes(durationNum)) {
            return res.status(400).json({ success: false, message: "Duration must be 30 or 60" });
        }

        const ExpertDetails = (await import("../models/expertModel.js")).default;
        const expert = await ExpertDetails.findOne({
            $or: [{ _id: expertId }, { userId: expertId }],
        }).lean();
        if (!expert) {
            return res.status(404).json({ success: false, message: "Expert not found" });
        }

        const categoryName = expert.personalInformation?.category || expert.category || "IT";
        const level = (levelOverride && String(levelOverride).trim()) ||
            expert.professionalDetails?.level ||
            expert.adminMappings?.level ||
            "Intermediate";

        const catDoc = await Category.findOne({ name: categoryName });
        if (!catDoc) {
            return res.status(404).json({ success: false, message: `Category '${categoryName}' not found` });
        }

        let finalPrice = null;
        const priceRule = await PricingRule.findOne({
            categoryId: catDoc._id,
            skillId: null,
            level: String(level).trim(),
            duration: durationNum,
        });
        if (priceRule) {
            finalPrice = priceRule.price;
        } else if (catDoc.amount != null && catDoc.amount >= 0) {
            // Fallback to category base price (set in Admin → Categories)
            finalPrice = durationNum === 30 ? catDoc.amount : Math.round(catDoc.amount * 1.8);
        }
        if (finalPrice == null) {
            return res.status(404).json({
                success: false,
                message: `Pricing not configured for category ${categoryName}, level ${level}, ${durationNum} min. Set base in Admin → Categories or rules in Admin → Pricing.`,
            });
        }

        res.json({
            success: true,
            finalPrice,
            currency: priceRule?.currency || "INR",
            category: categoryName,
            level: String(level),
            duration: durationNum,
        });
    } catch (error) {
        console.error("Get Calculate Price Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- Admin: List skills with base prices -------------------- */
export const listSkillsWithPricing = async (req, res) => {
    try {
        const skills = await Skill.find({ isActive: true })
            .select("name categoryId basePrice30")
            .populate("categoryId", "name")
            .lean();
        res.json({ success: true, data: skills });
    } catch (error) {
        console.error("List Skills Pricing Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- Admin: Update skill base price (basePrice30) -------------------- */
export const updateSkillBasePrice = async (req, res) => {
    try {
        const { skillId } = req.params;
        const { basePrice30 } = req.body;
        if (basePrice30 == null || Number(basePrice30) < 0) {
            return res.status(400).json({ success: false, message: "basePrice30 is required and must be >= 0" });
        }
        const skill = await Skill.findByIdAndUpdate(
            skillId,
            { basePrice30: Number(basePrice30) },
            { new: true }
        );
        if (!skill) {
            return res.status(404).json({ success: false, message: "Skill not found" });
        }
        res.json({
            success: true,
            message: "Skill base price updated",
            data: { skillId: skill._id, skillName: skill.name, basePrice30: skill.basePrice30 },
        });
    } catch (error) {
        console.error("Update Skill Base Price Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- Admin: Get Full Pricing Matrix -------------------- */
export const getPricingMatrix = async (req, res) => {
    try {
        const categories = await Category.find({ status: "Active" }).lean();
        const rules = await PricingRule.find({ skillId: null }).lean();
        res.json({ success: true, categories, rules });
    } catch (error) {
        console.error("Get Pricing Matrix Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- Admin: Bulk Update Pricing Matrix -------------------- */
export const bulkUpdateMatrix = async (req, res) => {
    try {
        const { updates } = req.body;
        const userId = req.headers.userid || req.user?.id || null;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, message: "No updates provided" });
        }

        for (const item of updates) {
            const { categoryId, level, price, originalPrice } = item;
            const newPrice = Number(price);
            const newOriginalPrice = (originalPrice !== undefined && originalPrice !== null && originalPrice !== "") ? Number(originalPrice) : null;

            const cat = await Category.findById(categoryId);
            if (!cat) continue;

            const existingRule = await PricingRule.findOne({
                categoryId,
                level,
                duration: 30,
                skillId: null
            });

            const oldPrice = existingRule ? existingRule.price : (cat.amount || 0);
            const oldOriginalPrice = existingRule ? existingRule.originalPrice : null;

            if (oldPrice !== newPrice || oldOriginalPrice !== newOriginalPrice) {
                await PricingHistory.create({
                    categoryId,
                    categoryName: cat.name,
                    level,
                    oldPrice,
                    newPrice,
                    updatedBy: userId
                });

                await PricingRule.findOneAndUpdate(
                    { categoryId, level, duration: 30, skillId: null },
                    { price: newPrice, originalPrice: newOriginalPrice, currency: 'INR' },
                    { upsert: true }
                );

                await PricingRule.findOneAndUpdate(
                    { categoryId, level, duration: 60, skillId: null },
                    { 
                        price: Math.round(newPrice * 1.8), 
                        originalPrice: newOriginalPrice ? Math.round(newOriginalPrice * 1.8) : null,
                        currency: 'INR' 
                    },
                    { upsert: true }
                );
            }
        }

        res.json({ success: true, message: "Pricing rules updated successfully" });
    } catch (error) {
        console.error("Bulk Update Matrix Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- Admin: Reset to Defaults -------------------- */
export const resetPricingDefaults = async (req, res) => {
    try {
        const userId = req.headers.userid || req.user?.id || null;

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

        for (const [catName, levelPrices] of Object.entries(defaultMatrix)) {
            let cat = await Category.findOne({ name: catName });
            if (!cat) {
                cat = await Category.create({
                    name: catName,
                    description: `${catName} Category`,
                    type: catName === "HR" ? "behavioral" : "technical",
                    icon: icons[catName] || "Layers",
                    status: "Active"
                });
            }

            for (const [level, price] of Object.entries(levelPrices)) {
                const newPrice = Number(price);

                const existingRule = await PricingRule.findOne({
                    categoryId: cat._id,
                    level,
                    duration: 30,
                    skillId: null
                });

                const oldPrice = existingRule ? existingRule.price : (cat.amount || 0);

                if (oldPrice !== newPrice) {
                    await PricingHistory.create({
                        categoryId: cat._id,
                        categoryName: cat.name,
                        level,
                        oldPrice,
                        newPrice,
                        updatedBy: userId
                    });

                    await PricingRule.findOneAndUpdate(
                        { categoryId: cat._id, level, duration: 30, skillId: null },
                        { price: newPrice, currency: 'INR' },
                        { upsert: true }
                    );

                    await PricingRule.findOneAndUpdate(
                        { categoryId: cat._id, level, duration: 60, skillId: null },
                        { price: Math.round(newPrice * 1.8), currency: 'INR' },
                        { upsert: true }
                    );
                }
            }
        }

        res.json({ success: true, message: "Pricing rules reset to system defaults successfully" });
    } catch (error) {
        console.error("Reset Pricing Defaults Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/* -------------------- Admin: Get Price Change History -------------------- */
export const getPricingHistory = async (req, res) => {
    try {
        const history = await PricingHistory.find({})
            .populate("updatedBy", "name email")
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();
        res.json({ success: true, data: history });
    } catch (error) {
        console.error("Get Pricing History Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

