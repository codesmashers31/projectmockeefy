import CertificationRule from '../models/CertificationRule.js';

// Get certification rule by category ID
export const getRuleByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const rule = await CertificationRule.findOne({ categoryId });
        if (!rule) {
            return res.status(404).json({ success: false, message: "No certification rule found for this category" });
        }
        res.json(rule);
    } catch (error) {
        console.error("Error in getRuleByCategory:", error);
        res.status(550).json({ success: false, message: "Server error" });
    }
};

// Create or update certification rule
export const saveRule = async (req, res) => {
    try {
        const { categoryId, minInterviews, passingPercentage, validityMonths, weightage } = req.body;
        if (!categoryId) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
        }
        
        // Find existing rule or create one
        const rule = await CertificationRule.findOneAndUpdate(
            { categoryId },
            {
                minInterviews: minInterviews ?? 5,
                passingPercentage: passingPercentage ?? 70,
                validityMonths: validityMonths ?? 12,
                weightage: weightage ?? { technical: 40, communication: 30, confidence: 30 }
            },
            { upsert: true, new: true }
        );
        
        res.json(rule);
    } catch (error) {
        console.error("Error in saveRule:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
