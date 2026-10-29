
import User from "../models/User.js";
import Session from "../models/Session.js";
import ExpertDetails from "../models/expertModel.js";
import Report from "../models/Report.js";
import { isExpertProfileComplete } from "./expertController.js";

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
    try {
        // Parallel fetching for performance
        const [
            totalExperts,
            totalUsers,
            sessionsBooked,
            pendingExperts,
            activeSessions,
            revenueData,
            recentUsers,
            categoryStats
        ] = await Promise.all([
            // 1. Basic Counts
            User.countDocuments({ userType: "expert" }),
            User.countDocuments({ userType: "candidate" }),
            Session.countDocuments({}),
            (async () => {
                const pendings = await ExpertDetails.find({ status: "pending" }).populate("userId");
                return pendings.filter(exp => exp.userId && isExpertProfileComplete(exp, exp.userId) && (exp.verificationRequested === true || exp.verificationRequested === undefined)).length;
            })(),
            Session.countDocuments({ status: "live" }), // or 'confirmed' depending on definition

            // 2. Revenue Aggregation (Total & Monthly)
            Session.aggregate([
                { $match: { status: { $in: ["completed", "confirmed"] } } }, // Only count valid sessions
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$price" }
                    }
                }
            ]),

            // 3. Recent Activity (Last 5 users)
            User.find({ userType: "candidate" })
                .sort({ createdAt: -1 })
                .limit(5)
                .select("name email userType status createdAt"),

            // 4. Top Categories Distribution
            ExpertDetails.aggregate([
                { $match: { "personalInformation.category": { $exists: true, $ne: null } } },
                {
                    $group: {
                        _id: "$personalInformation.category",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ])
        ]);

        // Monthly Revenue Data (Mock vs Real Strategy)
        // Ideally we aggregate by month here. For now, we'll send a simplified structure
        // that the frontend can eventually chart.
        // REAL IMPLEMENTATION:
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = await Session.aggregate([
            {
                $match: {
                    status: { $in: ["completed", "confirmed"] },
                    startTime: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lte: new Date(`${currentYear}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$startTime" },
                    revenue: { $sum: "$price" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Transform monthly data for frontend [0...11]
        const monthlyRevenueArray = Array(12).fill(0);
        monthlyRevenue.forEach(item => {
            monthlyRevenueArray[item._id - 1] = item.revenue;
        });


        res.status(200).json({
            success: true,
            data: {
                totalExperts,
                totalUsers,
                sessionsBooked,
                pendingExperts,
                activeSessions,
                totalRevenue: revenueData[0]?.totalRevenue || 0,
                recentUsers,
                topCategories: categoryStats.map(cat => ({
                    name: cat._id,
                    count: cat.count
                })),
                chartData: monthlyRevenueArray
            }
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Get all expert agreements for admin review
// @route   GET /api/admin/agreements
// @access  Private/Admin
export const getAdminExpertAgreements = async (req, res) => {
    try {
        const { filter } = req.query;
        // By default show all experts with agreement.isSigned = true, or if filter === "all", show all
        const query = filter === "all" ? {} : { "agreement.isSigned": true };

        const experts = await ExpertDetails.find(query)
            .populate("userId", "name email profileImage status")
            .sort({ "agreement.signedAt": -1, createdAt: -1 });

        const agreements = experts.map(exp => ({
            _id: exp._id,
            userId: exp.userId?._id,
            name: exp.userId?.name || exp.personalInformation?.name || exp.name || "Expert",
            email: exp.userId?.email || exp.email || "No email",
            profileImage: exp.userId?.profileImage || "",
            company: exp.agreement?.companyName || exp.professionalDetails?.company || "Not specified",
            title: exp.agreement?.jobTitle || exp.professionalDetails?.title || "Expert",
            signedAt: exp.agreement?.signedAt || null,
            signedBy: exp.agreement?.signedBy || exp.userId?.name || "",
            isSigned: Boolean(exp.agreement?.isSigned),
            agreedTerms: exp.agreement?.agreedTerms || false,
            agreementPdf: exp.agreement?.agreementPdf || null,
            signatureFile: exp.agreement?.signatureFile || null,
            expertStatus: exp.status || "Pending"
        }));

        res.status(200).json({
            success: true,
            count: agreements.length,
            agreements
        });
    } catch (error) {
        console.error("Error fetching expert agreements for admin:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Get interview reports for the admin dashboard
// @route   GET /api/admin/reports
// @access  Private/Admin
export const getAdminReports = async (req, res) => {
    try {
        const reports = await Report.find({})
            .populate("candidateId", "name")
            .populate({
                path: "expertId",
                select: "userId",
                populate: { path: "userId", select: "name" }
            })
            .populate({
                path: "sessionId",
                select: "startTime topics categoryId",
                populate: { path: "categoryId", select: "name" }
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            reports: reports.map(report => {
                const scores = report.scores || {};
                const scoreValues = [
                    scores.technical,
                    scores.communication,
                    scores.confidence,
                    scores.systemDesign,
                    scores.problemSolving
                ].filter(Number.isFinite);
                const totalScore = scoreValues.length
                    ? Math.round(scoreValues.reduce((total, score) => total + score, 0) / scoreValues.length)
                    : 0;

                return {
                    id: report._id,
                    expertName: report.expertId?.userId?.name || "Unknown Expert",
                    candidateName: report.candidateId?.name || "Unknown Candidate",
                    date: report.sessionId?.startTime || report.createdAt,
                    status: report.status,
                    scores: { total: totalScore },
                    category: report.sessionId?.categoryId?.name
                        || report.sessionId?.topics?.join(", ")
                        || "Uncategorized",
                    certificateId: report.generatedCertificateId || undefined
                };
            })
        });
    } catch (error) {
        console.error("Error fetching reports for admin:", error);
        res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }
};
