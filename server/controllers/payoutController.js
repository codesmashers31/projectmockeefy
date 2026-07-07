import PayoutMethod from '../models/PayoutMethod.js';
import PayoutRequest from '../models/PayoutRequest.js';
import User from '../models/User.js';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();


import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Otp from '../models/Otp.js';
import mongoose from 'mongoose';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Add a Payout Method
export const addPayoutMethod = async (req, res) => {
    try {
        const { userId, type, details, isDefault, email, otp } = req.body;
        
        if (!userId || !type || !details || !email || !otp) {
            return res.status(400).json({ success: false, message: "Missing required fields, including email and OTP" });
        }

        // Verify OTP securely
        const cleanEmail = email.trim().toLowerCase();
        const record = await Otp.findOne({ email: cleanEmail }).sort({ createdAt: -1 });

        if (!record || record.otp !== parseInt(otp) || record.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        // OTP verified successfully, clean it up
        await Otp.deleteMany({ email: cleanEmail });

        if (isDefault) {
            await PayoutMethod.updateMany({ userId }, { isDefault: false });
        }

        const newMethod = new PayoutMethod({
            userId,
            type,
            details,
            isDefault: isDefault || false
        });

        await newMethod.save();
        res.status(201).json({ success: true, data: newMethod });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Payout Methods
export const getPayoutMethods = async (req, res) => {
    try {
        const { userId } = req.params;
        const methods = await PayoutMethod.find({ userId, status: 'active' });
        res.status(200).json({ success: true, data: methods });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Set Default Payout Method
export const setDefaultPayoutMethod = async (req, res) => {
    try {
        const { methodId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        // Unset previous defaults
        await PayoutMethod.updateMany({ userId }, { isDefault: false });
        
        // Set new default
        const updated = await PayoutMethod.findByIdAndUpdate(methodId, { isDefault: true }, { new: true });
        
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Initiate Payout Request (Expert)
export const initiatePayout = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { 
            expertId, 
            amount, 
            methodId, 
            payoutMethodType, 
            accountHolderName, 
            accountNumber, 
            ifscCode, 
            upiId,
            notes 
        } = req.body;

        if (!expertId || !amount) {
            return res.status(400).json({ success: false, message: "Missing required fields: expertId and amount" });
        }

        if (amount < 5) {
            return res.status(400).json({ success: false, message: "Minimum withdrawal amount is ₹5" });
        }

        // Check if there is already a pending withdrawal request
        const existingPending = await PayoutRequest.findOne({
            expertId,
            status: { $in: ['PENDING', 'PROCESSING', 'HOLD'] }
        }).session(session);

        if (existingPending) {
            return res.status(400).json({ 
                success: false, 
                message: "You already have a pending payout request. Please wait until Wednesday for resolution." 
            });
        }

        const user = await User.findById(expertId).session(session);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let finalType = payoutMethodType;
        let finalHolder = accountHolderName;
        let finalNumber = accountNumber;
        let finalIfsc = ifscCode;
        let finalUpi = upiId;

        // If methodId is provided, pre-populate details from saved PayoutMethod
        if (methodId) {
            const savedMethod = await PayoutMethod.findById(methodId).session(session);
            if (savedMethod) {
                finalType = savedMethod.type;
                finalHolder = savedMethod.details?.accountName;
                finalNumber = savedMethod.details?.accountNumber;
                finalIfsc = savedMethod.details?.ifscCode;
                finalUpi = savedMethod.details?.upiId;
            }
        }

        if (!finalType) {
            return res.status(400).json({ success: false, message: "Payout method details are incomplete." });
        }

        let wallet = await Wallet.findOne({ userId: expertId }).session(session);
        if (!wallet) {
             wallet = await Wallet.create([{ userId: expertId }], { session });
             wallet = wallet[0];
        }

        if (wallet.availableBalance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }

        // Freeze balance
        wallet.availableBalance -= amount;
        wallet.frozenBalance += amount;
        await wallet.save({ session });

        // Create Payout Request
        const request = new PayoutRequest({
            expertId,
            amount,
            methodId: methodId || undefined,
            payoutMethodType: finalType,
            accountHolderName: finalHolder,
            accountNumber: finalNumber,
            ifscCode: finalIfsc,
            upiId: finalUpi,
            status: 'PENDING',
            notes: notes || "Manual Payout Requested (Wednesday batch)"
        });
        await request.save({ session });

        // Create Wallet Ledger Transaction
        await WalletTransaction.create([{
            walletId: wallet._id,
            userId: expertId,
            type: 'FREEZE',
            amount: amount,
            referenceId: request._id,
            referenceModel: 'PayoutRequest',
            status: 'COMPLETED',
            description: `Frozen for manual payout request (Wednesday batch)`,
            balanceAfter: wallet.availableBalance
        }], { session });

        await session.commitTransaction();
        res.status(201).json({ success: true, data: request, currentBalance: wallet.availableBalance });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// Get All Payout Requests (Admin with Analytics & Filtering)
export const getAdminPayoutRequests = async (req, res) => {
    try {
        const { status, expertId, methodType } = req.query;
        const query = {};

        if (status) {
            query.status = status.toUpperCase();
        }
        if (expertId) {
            query.expertId = expertId;
        }
        if (methodType) {
            query.payoutMethodType = methodType;
        }

        const requests = await PayoutRequest.find(query)
            .populate('expertId', 'name email personalInfo')
            .sort({ createdAt: -1 });

        // Compile real-time analytics
        const allRequests = await PayoutRequest.find({});
        
        let pendingTotal = 0;
        let paidTotal = 0;
        let rejectedTotal = 0;
        const uniqueExperts = new Set();

        allRequests.forEach(req => {
            if (['PENDING', 'PROCESSING', 'HOLD'].includes(req.status)) {
                pendingTotal += req.amount;
            } else if (req.status === 'PAID') {
                paidTotal += req.amount;
            } else if (req.status === 'REJECTED') {
                rejectedTotal += req.amount;
            }
            if (req.expertId) {
                uniqueExperts.add(req.expertId.toString());
            }
        });

        // Compute Expert Earnings Summary
        const WalletModel = (await import('../models/Wallet.js')).default;
        const wallets = await WalletModel.find({}).populate('userId', 'name email');
        const expertSummary = wallets.map(w => ({
            expertId: w.userId?._id,
            name: w.userId?.name || 'Unknown Expert',
            email: w.userId?.email || '',
            availableBalance: w.availableBalance,
            frozenBalance: w.frozenBalance,
            totalWithdrawn: w.totalWithdrawn || 0
        }));

        res.status(200).json({
            success: true,
            data: requests,
            analytics: {
                pendingTotal,
                paidTotal,
                rejectedTotal,
                activeExpertCount: uniqueExperts.size,
                expertSummary
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Resolve Payout Request (Admin Approval Workflow)
export const resolvePayoutRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { 
            status, 
            adminRemarks, 
            transactionReference, 
            screenshotProof, 
            paymentDate,
            notes 
        } = req.body;

        if (!status || !['PAID', 'REJECTED', 'PROCESSING', 'HOLD'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid or missing payout status." });
        }

        const request = await PayoutRequest.findById(id).session(session);
        if (!request) {
            return res.status(404).json({ success: false, message: "Payout request not found" });
        }

        // Only allow resolving from PENDING/PROCESSING/HOLD to PAID or REJECTED
        if (request.status === 'PAID' || request.status === 'REJECTED') {
            return res.status(400).json({ success: false, message: `Request has already been resolved as ${request.status}` });
        }

        let wallet = await Wallet.findOne({ userId: request.expertId }).session(session);
        if (!wallet) {
            wallet = await Wallet.create([{ userId: request.expertId }], { session });
            wallet = wallet[0];
        }

        const amount = request.amount;

        // If marked as PAID: manual payment completed outside the app
        if (status === 'PAID') {
            if (wallet.frozenBalance < amount) {
                return res.status(400).json({ success: false, message: "Ledger inconsistency: frozen balance is insufficient." });
            }

            wallet.frozenBalance -= amount;
            wallet.totalWithdrawn = (wallet.totalWithdrawn || 0) + amount;
            await wallet.save({ session });

            request.status = 'PAID';
            request.utrNumber = transactionReference || request.utrNumber;
            request.bankReference = transactionReference || request.bankReference;
            request.adminRemarks = adminRemarks || "Manual transfer completed successfully";
            request.screenshotProof = screenshotProof;
            request.paymentDate = paymentDate || new Date();
            request.notes = notes || request.notes;
            await request.save({ session });

            // Ledger Debit Transaction
            await WalletTransaction.create([{
                walletId: wallet._id,
                userId: request.expertId,
                type: 'DEBIT',
                amount: amount,
                referenceId: request._id,
                referenceModel: 'PayoutRequest',
                status: 'COMPLETED',
                description: `Manual Payout completed (Ref: ${transactionReference || 'N/A'})`,
                balanceAfter: wallet.availableBalance
            }], { session });

        } 
        // If marked as REJECTED: return funds back to the expert's wallet
        else if (status === 'REJECTED') {
            if (wallet.frozenBalance < amount) {
                return res.status(400).json({ success: false, message: "Ledger inconsistency: frozen balance is insufficient." });
            }

            wallet.frozenBalance -= amount;
            wallet.availableBalance += amount;
            await wallet.save({ session });

            request.status = 'REJECTED';
            request.adminRemarks = adminRemarks || "Withdrawal request was rejected by admin";
            request.notes = notes || request.notes;
            await request.save({ session });

            // Ledger Refund Transaction
            await WalletTransaction.create([{
                walletId: wallet._id,
                userId: request.expertId,
                type: 'UNFREEZE',
                amount: amount,
                referenceId: request._id,
                referenceModel: 'PayoutRequest',
                status: 'COMPLETED',
                description: `Payout rejected: ${adminRemarks || 'Rejected by Admin'}`,
                balanceAfter: wallet.availableBalance
            }], { session });
        } 
        // If set to HOLD or PROCESSING
        else {
            request.status = status;
            request.adminRemarks = adminRemarks || request.adminRemarks;
            request.notes = notes || request.notes;
            await request.save({ session });
        }

        await session.commitTransaction();
        res.status(200).json({ success: true, data: request, message: `Payout request marked as ${status} successfully.` });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// Get User Earnings Summary
export const getUserEarningsSummary = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        let wallet = await Wallet.findOne({ userId });
        
        if (!wallet && user) {
            // Migrate legacy balance to new Wallet model
            wallet = await Wallet.create({ 
                userId, 
                availableBalance: user.walletBalance || 0 
            });
        }

        const currentBalance = wallet ? wallet.availableBalance : 0;
        const frozenBalance = wallet ? wallet.frozenBalance : 0;

        const payouts = await PayoutRequest.find({ expertId: userId });
        
        let pendingPayouts = 0;
        let completedPayouts = 0;

        payouts.forEach(p => {
            if (['PENDING', 'QUEUED', 'PROCESSING', 'HOLD'].includes(p.status)) {
                pendingPayouts += p.amount;
            } else if (p.status === 'COMPLETED' || p.status === 'PAID') {
                completedPayouts += p.amount;
            }
        });

        // Calculate total earnings from completed sessions
        const Session = (await import('../models/Session.js')).default;
        
        // Find expert details to get the expert _id, since legacy sessions used expert._id instead of user._id
        const ExpertDetails = (await import('../models/expertModel.js')).default;
        const expert = await ExpertDetails.findOne({ userId });
        const expertIdCandidates = [userId];
        if (expert && expert._id) {
            expertIdCandidates.push(expert._id.toString());
        }

        // Include all completed sessions (legacy used price, new use payoutCredited + payoutAmount)
        const sessions = await Session.find({ expertId: { $in: expertIdCandidates }, status: 'completed' });
        let totalEarnings = sessions.reduce((acc, session) => acc + (session.payoutAmount || session.price || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                currentBalance,
                frozenBalance,
                totalEarnings,
                pendingPayouts,
                completedPayouts
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Payout History
export const getPayoutHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const payouts = await PayoutRequest.find({ expertId: userId })
            .populate('methodId')
            .sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, data: payouts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
