// controllers/expertController.js
import path from "path";
import fs from "fs";
import multer from "multer";
import { getFileUrl } from "../middleware/upload.js";
import mongoose from "mongoose";
import ExpertDetails from "../models/expertModel.js"; // adjust if file name differs
import Session from "../models/Session.js";
import Review from "../models/reviewModel.js";
import PricingRule from "../models/PricingRule.js"; // Added
import Category from "../models/Category.js"; // Added
import User from "../models/User.js";
import { sendAadhaarOtp, verifyAadhaarOtp, maskAadhaar, checkAadhaarRateLimit, recordAadhaarOtpSend, validateAadhaarFormat } from "../services/sandboxAadhaarService.js";
import { compareNames, hashAadhaar, normalizeName } from "../utils/nameMatcher.js";
import { syncDataChange, emitToUser, emitToAdmin } from "../services/socketService.js";

/* -------------------- Helpers -------------------- */
const resolveUserIdFromReq = (req) => {
  if (req.user) {
    const u = req.user;
    if (u.id) return String(u.id);
    if (u._id) return String(u._id);
    if (u.userId) return String(u.userId);
    if (u.user_id) return String(u.user_id);
    if (u.sub) return String(u.sub);
  }

  // fallback: header (only emergency/legacy)
  const headerCandidate = req.headers.userid || req.headers.userId || req.headers["user-id"];
  if (headerCandidate) {
    // header may contain JSON string or object; try normalize
    try {
      if (typeof headerCandidate === "string" && headerCandidate.trim().startsWith("{")) {
        const parsed = JSON.parse(headerCandidate);
        if (parsed.id) return String(parsed.id);
        if (parsed._id) return String(parsed._id);
        if (parsed.userId) return String(parsed.userId);
      }
      if (typeof headerCandidate === "object") {
        if (headerCandidate.id) return String(headerCandidate.id);
        if (headerCandidate._id) return String(headerCandidate._id);
        if (headerCandidate.userId) return String(headerCandidate.userId);
      }
      return String(headerCandidate);
    } catch (e) {
      return String(headerCandidate);
    }
  }

  return null;
};

const isValidObjectId = (id) => {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
};

/**
 * Convert to mongoose ObjectId only if id is a valid 24-hex string.
 * Otherwise return the original id (so searches against string-stored ids still work).
 */
const toObjectId = (id) => {
  if (!isValidObjectId(id)) return id;
  return new mongoose.Types.ObjectId(id);
};

/* -------------------- getMissingSectionsHelper -------------------- */
const getMissingSections = (expert, user) => {
  const missing = [];

  // Personal Info (Source: User)
  const uName = user?.name;
  const uPhone = user?.personalInfo?.phone;
  const uCity = user?.personalInfo?.city;
  const uState = user?.personalInfo?.state;
  const uCountry = user?.personalInfo?.country;
  const uGender = user?.personalInfo?.gender;

  const personalFilled = uName && uPhone && uGender && uCity && uCountry;
  if (!personalFilled) missing.push("Personal Information");

  // Education (Source: Expert)
  if (!Array.isArray(expert.education) || !expert.education.length) missing.push("Education");

  // Professional Details (Source: Expert)
  const pd = expert.professionalDetails || {};
  const proFilled = pd.title && pd.company && pd.industry && (typeof pd.totalExperience === "number");
  if (!proFilled) missing.push("Professional Details");

  // Skills (Source: Expert)
  const sk = expert.skillsAndExpertise || {};
  // Check either legacy skills fields OR the new expertSkills array
  const hasSkills = (sk.domains?.length || sk.tools?.length || sk.languages?.length) || (expert.expertSkills && expert.expertSkills.length > 0);
  if (!hasSkills) missing.push("Skills & Expertise");

  // Availability (Source: Expert)
  const av = expert.availability || {};
  let weeklyObj = av.weekly || {};
  if (weeklyObj instanceof Map) {
    weeklyObj = Object.fromEntries(weeklyObj);
  }
  const weeklyHasSlots = Object.values(weeklyObj || {}).some(arr => Array.isArray(arr) && arr.length > 0);
  if (!weeklyHasSlots) missing.push("Availability");

  // Profile Photo (Source: User)
  if (!user?.profileImage) missing.push("Profile Photo");

  // Verification (Source: Expert)
  const v = expert.verification || {};
  const hasAadhaar = Boolean(v.aadhar?.isVerified || v.aadhar?.url || v.aadhar?.hash);
  const verificationFilled = Boolean(v.companyId?.url && hasAadhaar && v.linkedin);
  if (!verificationFilled) missing.push("Verification Documents");

  // Service Agreement (Source: Expert) - Mandatory
  const ag = expert.agreement || {};
  const hasAgreement = Boolean(ag.isSigned && (ag.agreementPdf?.url || ag.signatureFile?.url || ag.agreedTerms));
  if (!hasAgreement) missing.push("Service Agreement");

  return missing;
};

/* -------------------- computeCompletion -------------------- */
const computeCompletion = (expert, user) => {
  let score = 0;

  // Personal Info (20%) - From User
  const uName = user?.name;
  const uPhone = user?.personalInfo?.phone;
  const uCity = user?.personalInfo?.city;
  const uState = user?.personalInfo?.state;
  const uCountry = user?.personalInfo?.country;

  // Basic check for personal info completeness
  const uGender = user?.personalInfo?.gender;
  if (uName && uPhone && uGender && uCity && uCountry) score += 20;

  // Education (15%) - From Expert
  if (Array.isArray(expert.education) && expert.education.length) score += 15;

  // Professional Details (15%) - From Expert
  const pd = expert.professionalDetails || {};
  const proFilled = pd.title && pd.company && pd.industry && (typeof pd.totalExperience === "number");
  if (proFilled) score += 15;

  // Skills (15%) - From Expert
  const sk = expert.skillsAndExpertise || {};
  const hasSkills = (sk.domains?.length || sk.tools?.length || sk.languages?.length) || (expert.expertSkills && expert.expertSkills.length > 0);
  if (hasSkills) score += 15;

  // Availability (15%) - From Expert
  const av = expert.availability || {};
  let weeklyObj = av.weekly || {};
  if (weeklyObj instanceof Map) {
    weeklyObj = Object.fromEntries(weeklyObj);
  }
  const weeklyHasSlots = Object.values(weeklyObj || {}).some(arr => Array.isArray(arr) && arr.length > 0);
  if (weeklyHasSlots) score += 15;

  // Profile Photo (5%) - Check both User (source of truth) and Expert (legacy)
  const hasPhoto = user?.profileImage || expert.profileImage;
  if (hasPhoto && !hasPhoto.includes('default-avatar.png')) score += 5;

  // Verification (10%) - From Expert
  const v = expert.verification || {};
  const hasAadhaar = Boolean(v.aadhar?.isVerified || v.aadhar?.url || v.aadhar?.hash);
  const verificationFilled = Boolean(v.companyId?.url && hasAadhaar && v.linkedin);
  if (verificationFilled) score += 10;

  // Service Agreement (5%) - From Expert
  const ag = expert.agreement || {};
  const hasAgreement = Boolean(ag.isSigned && (ag.agreementPdf?.url || ag.signatureFile?.url || ag.agreedTerms));
  if (hasAgreement) score += 5;

  return Math.min(score, 100);
};

export const isExpertEligibleForVerification = (expert, user) => {
  const completion = computeCompletion(expert, user);
  const missing = getMissingSections(expert, user);
  const hasVerificationDocs = !missing.includes("Verification Documents");
  const hasAgreement = !missing.includes("Service Agreement");
  return completion >= 80 && hasVerificationDocs && hasAgreement;
};

export const isExpertProfileComplete = (expert, user) => {
  return isExpertEligibleForVerification(expert, user);
};

// Multer setup removed - reusing middleware/uploadCloudinary.js in routes

/* -------------------- uploadProfilePhoto -------------------- */
export const uploadProfilePhoto = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const photoFile = req.files?.photo?.[0] || req.file;
    const originalPhotoFile = req.files?.originalPhoto?.[0];

    if (!photoFile) return res.status(400).json({ success: false, message: "No file uploaded. Use field 'photo'." });

    // Cloudinary returns the secure URL; local storage returns relative URL
    const photoUrl = getFileUrl(req, photoFile);
    let originalPhotoUrl = "";
    if (originalPhotoFile) {
      originalPhotoUrl = getFileUrl(req, originalPhotoFile);
    } else if (req.body?.originalPhotoUrl) {
      originalPhotoUrl = req.body.originalPhotoUrl;
    }

    // find expert & user
    const queryUserId = toObjectId(userIdRaw);

    // Update User Profile Image (Source of Truth)
    const updateFields = { profileImage: photoUrl };
    if (originalPhotoUrl) {
      updateFields.originalProfileImage = originalPhotoUrl;
    }

    const user = await User.findByIdAndUpdate(queryUserId, updateFields, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let expert = await ExpertDetails.findOne({ userId: queryUserId });

    // Auto-create if not found
    if (!expert) {
      expert = new ExpertDetails({
        userId: queryUserId,
        status: "pending",
        personalInformation: {},
        professionalDetails: {},
        education: [],
        skillsAndExpertise: { mode: "Online", domains: [], tools: [], languages: [] },
        availability: { sessionDuration: 30, maxPerDay: 1, weekly: {}, breakDates: [] },
        verification: {}
      });
    }

    if (originalPhotoUrl) {
      expert.originalProfileImage = originalPhotoUrl;
    }
    await expert.save({ validateBeforeSave: false });

    const completion = computeCompletion(expert, user);
    const missingSections = getMissingSections(expert, user);

    const profile = {
      name: user.name || "",
      title: expert.professionalDetails?.title || "",
      company: expert.professionalDetails?.company || "",
      photoUrl: user.profileImage || "",
      originalPhotoUrl: user.originalProfileImage || expert.originalProfileImage || user.profileImage || ""
    };

    syncDataChange({
      type: "PROFILE_PHOTO_UPDATED",
      userId: user._id,
      expertId: expert._id,
      data: {
        profileImage: user.profileImage,
        originalProfileImage: user.originalProfileImage,
        completion,
        missingSections,
        profile
      }
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: user._id,
      expertId: expert._id,
      data: {
        profileImage: user.profileImage,
        originalProfileImage: user.originalProfileImage,
        completion,
        missingSections,
        profile
      }
    });

    return res.json({ success: true, message: "Photo uploaded", completion, missingSections, profile });
  } catch (err) {
    console.error("uploadProfilePhoto error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
};

export const getExpertProfileImage = async (req, res) => {
  try {
    const userIdRaw = req.user?.id || req.user?._id;
    if (!userIdRaw) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const expert = await ExpertDetails.findOne({ userId: userIdRaw }).lean();

    const image = expert?.profileImage || "";

    return res.json({ success: true, image });
  } catch (err) {
    console.error("getExpertProfileImage error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


/* -------------------- uploadVerificationDocs -------------------- */
export const uploadVerificationDocs = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const queryUserId = toObjectId(userIdRaw);
    const expert = await ExpertDetails.findOne({ userId: queryUserId });

    if (!expert) {
      return res.status(404).json({ success: false, message: 'Expert profile not found.' });
    }

    // Initialize verification object if missing
    if (!expert.verification) expert.verification = {};

    // build accessible URL (use host from request)
    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${process.env.PORT || 3000}`;

    // Handle uploaded files (Cloudinary)
    if (req.files) {
      if (req.files.companyIdFile && req.files.companyIdFile[0]) {
        expert.verification.companyId = {
          url: getFileUrl(req, req.files.companyIdFile[0]),
          name: req.files.companyIdFile[0].originalname
        };
      }
      if (req.files.aadharFile && req.files.aadharFile[0]) {
        expert.verification.aadhar = {
          url: getFileUrl(req, req.files.aadharFile[0]),
          name: req.files.aadharFile[0].originalname
        };
      }
    }

    // Handle linkedin URL
    if (req.body.linkedin) {
      expert.verification.linkedin = req.body.linkedin;
    }

    if (req.body.aadhaarNumber !== undefined) {
      const cleanAadhaar = String(req.body.aadhaarNumber).trim().replace(/\s/g, "");
      if (cleanAadhaar && !/^\d{12}$/.test(cleanAadhaar)) {
        return res.status(400).json({ success: false, message: "Aadhaar number must contain exactly 12 digits." });
      }

      if (cleanAadhaar) {
        const formattedAadhaar = cleanAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
        const masked = maskAadhaar(cleanAadhaar);
        const previousAadhaar = expert.verification.aadhar?.toObject?.() || expert.verification.aadhar || {};
        expert.verification.aadhar = {
          ...previousAadhaar,
          number: formattedAadhaar,
          rawNumber: cleanAadhaar,
          maskedNumber: masked,
          hash: hashAadhaar(cleanAadhaar),
          isVerified: true,
          verifiedAt: new Date(),
          nameMatchStatus: "MATCH"
        };
      }
    }

    await expert.save({ validateBeforeSave: false });

    syncDataChange({
      type: "VERIFICATION_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { verification: expert.verification }
    });

    return res.json({
      success: true,
      message: 'Verification details updated',
      verification: expert.verification
    });
  } catch (err) {
    console.error("uploadVerificationDocs error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
};

/* -------------------- requestVerification -------------------- */
export const requestVerification = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized" });

    const queryUserId = toObjectId(userIdRaw);
    const [expert, user] = await Promise.all([
      ExpertDetails.findOne({ userId: queryUserId }),
      User.findById(queryUserId)
    ]);

    if (!expert || !user) return res.status(404).json({ success: false, message: "Expert profile or user not found" });

    if (expert.status === "pending" && expert.verificationRequested) {
      return res.status(400).json({ success: false, message: "Verification request is already pending admin review." });
    }

    const completion = computeCompletion(expert, user);
    const missing = getMissingSections(expert, user);
    const hasVerificationDocs = !missing.includes("Verification Documents");
    const hasAgreement = !missing.includes("Service Agreement");

    if (completion < 80) {
      return res.status(400).json({
        success: false,
        message: `Profile must be at least 80% complete before requesting verification (currently ${completion}%). Missing: ${missing.join(", ")}`,
        completion,
        missingSections: missing
      });
    }

    if (!hasVerificationDocs) {
      return res.status(400).json({
        success: false,
        message: "Verification Documents must be fully completed before requesting verification.",
        completion,
        missingSections: missing
      });
    }

    if (!hasAgreement) {
      return res.status(400).json({
        success: false,
        message: "Service Agreement must be signed before requesting verification.",
        completion,
        missingSections: missing
      });
    }

    expert.status = "pending";
    expert.verificationRequested = true;
    expert.verificationRequestedAt = new Date();
    expert.rejectionReason = "";
    if (Array.isArray(expert.education)) {
      expert.education.forEach(edu => {
        if (!edu.institution || !edu.institution.trim()) {
          edu.institution = "College / Institution";
        }
      });
    }
    await expert.save({ validateModifiedOnly: true });

    syncDataChange({
      type: "STATUS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { status: "pending", verificationRequested: true },
      toAdmin: true
    });
    syncDataChange({
      type: "EXPERT_STATUS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { status: "pending", verificationRequested: true },
      toAdmin: true
    });

    return res.json({
      success: true,
      message: "Profile moved to admin pending verification page successfully.",
      status: "pending",
      verificationRequested: true
    });
  } catch (err) {
    console.error("requestVerification error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- resubmitProfile -------------------- */
export const resubmitProfile = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized" });

    const queryUserId = toObjectId(userIdRaw);
    const [expert, user] = await Promise.all([
      ExpertDetails.findOne({ userId: queryUserId }),
      User.findById(queryUserId)
    ]);

    if (!expert || !user) return res.status(404).json({ success: false, message: "Expert not found" });

    // Only allow resubmission if currently rejected
    if (expert.status !== "rejected") {
      return res.status(400).json({ success: false, message: "Only rejected profiles can be resubmitted." });
    }

    const completion = computeCompletion(expert, user);
    const missing = getMissingSections(expert, user);
    const hasVerificationDocs = !missing.includes("Verification Documents");
    const hasAgreement = !missing.includes("Service Agreement");

    if (completion < 80) {
      return res.status(400).json({
        success: false,
        message: `Profile must be at least 80% complete before resubmitting (currently ${completion}%). Missing: ${missing.join(", ")}`,
        completion,
        missingSections: missing
      });
    }

    if (!hasVerificationDocs) {
      return res.status(400).json({
        success: false,
        message: "Verification Documents must be fully completed before resubmitting.",
        completion,
        missingSections: missing
      });
    }

    if (!hasAgreement) {
      return res.status(400).json({
        success: false,
        message: "Service Agreement must be signed before resubmitting.",
        completion,
        missingSections: missing
      });
    }

    expert.status = "pending";
    expert.verificationRequested = true;
    expert.verificationRequestedAt = new Date();
    expert.rejectionReason = ""; // Clear reason on resubmit
    if (Array.isArray(expert.education)) {
      expert.education.forEach(edu => {
        if (!edu.institution || !edu.institution.trim()) {
          edu.institution = "College / Institution";
        }
      });
    }
    await expert.save({ validateModifiedOnly: true });

    syncDataChange({
      type: "STATUS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { status: "pending", verificationRequested: true },
      toAdmin: true
    });
    syncDataChange({
      type: "EXPERT_STATUS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { status: "pending", verificationRequested: true },
      toAdmin: true
    });

    return res.json({
      success: true,
      message: "Profile resubmitted for verification",
      status: "pending",
      verificationRequested: true
    });
  } catch (err) {
    console.error("resubmitProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- getExpertProfile -------------------- */
export const getExpertProfile = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const queryUserId = toObjectId(userIdRaw);

    // Parallel fetch: Expert Details AND User Identity
    let [expert, user] = await Promise.all([
      ExpertDetails.findOne({ userId: queryUserId }).populate('expertSkills.skillId', 'name'),
      User.findById(queryUserId)
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "User identity not found" });
    }

    // Auto-create expert profile if it doesn't exist (Lazy initialization)
    if (!expert) {
      expert = new ExpertDetails({
        userId: queryUserId,
        status: "pending",
        personalInformation: {},
        professionalDetails: {},
        education: [],
        skillsAndExpertise: { mode: "Online", domains: [], tools: [], languages: [] },
        availability: { sessionDuration: 30, maxPerDay: 1, weekly: {}, breakDates: [] },
        verification: {}
      });
      await expert.save();
    }

    const expertLean = expert.toObject ? expert.toObject() : expert;

    const profile = {
      // Identity from User
      name: user.name || "",
      mobile: user.personalInfo?.phone || "",
      gender: user.personalInfo?.gender || "",
      dob: user.personalInfo?.dateOfBirth ? new Date(user.personalInfo.dateOfBirth).toISOString().split("T")[0] : "",
      country: user.personalInfo?.country || "",
      state: user.personalInfo?.state || "",
      city: user.personalInfo?.city || "",

      // Expert Specifics
      title: expertLean.professionalDetails?.title || "",
      company: expertLean.professionalDetails?.company || "",
      totalExperience: expertLean.professionalDetails?.totalExperience ?? "",
      industry: expertLean.professionalDetails?.industry || "",
      level: expertLean.professionalDetails?.level || "Intermediate",
      levels: expertLean.professionalDetails?.levels || [],
      previous: expertLean.professionalDetails?.previous || [],
      education: expertLean.education || [],
      skillsAndExpertise: expertLean.skillsAndExpertise || { mode: "Online", domains: [], tools: [], languages: [] },
      expertSkills: expertLean.expertSkills || [],
      availability: expertLean.availability || { sessionDuration: 30, maxPerDay: 1, weekly: {}, breakDates: [] },
      verification: expertLean.verification || {},
      status: expertLean.status || "pending",
      rejectionReason: expertLean.rejectionReason || "",
      verificationRequested: Boolean(expertLean.verificationRequested),
      verificationRequestedAt: expertLean.verificationRequestedAt || null,

      // Photo from User
      photoUrl: user.profileImage || "",
      originalPhotoUrl: user.originalProfileImage || expertLean.originalProfileImage || user.profileImage || "",

      // Category from Expert (Personal Info legacy)
      category: expertLean.personalInformation?.category || ""
    };

    const completion = computeCompletion(expertLean, user);
    const missingSections = getMissingSections(expertLean, user);
    return res.json({
      success: true,
      completion,
      missingSections,
      profile,
      verificationRequested: Boolean(expertLean.verificationRequested)
    });
  } catch (err) {
    console.error("getExpertProfile error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
};

/* -------------------- getExpertById (Admin/Public View) -------------------- */
export const getExpertById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    // Usually we look up by Expert _id, not userId, when we have the specific ID
    let expert = await ExpertDetails.findById(id).lean();

    // If not found, try finding by userId just in case
    if (!expert) {
      expert = await ExpertDetails.findOne({ userId: id }).lean();
    }

    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    // Populate user details (Crucial for Identity)
    const user = await User.findById(expert.userId).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "Expert identity not found" });
    }

    const profile = {
      _id: expert._id,
      userId: expert.userId,

      // Identity from User
      name: user.name || "Expert",
      mobile: user.personalInfo?.phone || "",
      gender: user.personalInfo?.gender || "",
      dob: user.personalInfo?.dateOfBirth ? new Date(user.personalInfo.dateOfBirth).toISOString().split("T")[0] : "",
      country: user.personalInfo?.country || "",
      state: user.personalInfo?.state || "",
      city: user.personalInfo?.city || "",

      // Expert Details
      title: expert.professionalDetails?.title || "",
      company: expert.professionalDetails?.company || "",
      totalExperience: expert.professionalDetails?.totalExperience ?? "",
      industry: expert.professionalDetails?.industry || "",
      level: expert.professionalDetails?.level || "Intermediate",
      levels: expert.professionalDetails?.levels || [],
      previous: expert.professionalDetails?.previous || [],
      education: expert.education || [],
      skillsAndExpertise: expert.skillsAndExpertise || { mode: "Online", domains: [], tools: [], languages: [] },
      availability: expert.availability || { sessionDuration: 30, maxPerDay: 1, weekly: {}, breakDates: [] },
      verification: expert.verification || {},
      status: expert.status || "pending",

      // Photo from User
      photoUrl: user.profileImage || "",

      // Category from Expert
      category: expert.personalInformation?.category || ""
    };

    // --- Dynamic Price Calculation ---
    let price = 0; // Default fallback
    try {
      if (profile.category) {
        const catDoc = await Category.findOne({ name: profile.category });
        if (catDoc) {
          const pricingRule = await PricingRule.findOne({
            categoryId: catDoc._id,
            skillId: null, // Base category price
            level: profile.level || "Intermediate",
            duration: 30 // Default 30 min price for profile display
          });
          if (pricingRule) price = pricingRule.price;
        }
      }
    } catch (e) { console.error("Price calc error:", e); }

    profile.price = price; // Add price to response

    return res.json({ success: true, profile });
  } catch (err) {
    console.error("getExpertById error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* -------------------- getPublicExpertById (Candidate/Public View) -------------------- */
export const getPublicExpertById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    // Usually we look up by Expert _id, not userId, when we have the specific ID
    let expert = await ExpertDetails.findById(id).lean();

    // If not found, try finding by userId just in case
    if (!expert) {
      expert = await ExpertDetails.findOne({ userId: id }).lean();
    }

    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    // Populate user details (Crucial for Identity)
    const user = await User.findById(expert.userId).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "Expert identity not found" });
    }

    // Populate expertSkills.skillId for compatibility with mapExpertToProfile
    await ExpertDetails.populate(expert, { path: 'expertSkills.skillId', select: 'name' });

    // --- Dynamic Price Calculation ---
    const normalizeLevel = (lvl) => {
      if (!lvl) return "Rising Mentor";
      const lower = String(lvl).toLowerCase().trim();
      if (lower === "beginner") return "Rising Mentor";
      if (lower === "intermediate") return "Professional Mentor";
      if (lower === "advanced") return "Senior Mentor";
      return String(lvl).trim();
    };

    const rawLevels = (Array.isArray(expert.professionalDetails?.levels) && expert.professionalDetails.levels.length > 0)
      ? expert.professionalDetails.levels
      : (expert.professionalDetails?.level ? [expert.professionalDetails.level] : ["Rising Mentor"]);
    const levels = Array.from(new Set(rawLevels.map(normalizeLevel)));
    const level = normalizeLevel(expert.professionalDetails?.level || levels[0] || "Rising Mentor");

    let price = expert.minPrice || expert.price || 499;

    try {
      const catName = expert.personalInformation?.category || "IT";
      const catDoc = await Category.findOne({ name: catName });
      if (catDoc) {
        const pricingRule = await PricingRule.findOne({
          categoryId: catDoc._id,
          skillId: null, // Base category price
          level: String(level).trim(),
          duration: 30 // Default 30 min price for profile display
        });
        if (pricingRule) price = pricingRule.price;
        else if (catDoc.amount != null && catDoc.amount >= 0) price = catDoc.amount;
      }
    } catch (e) { console.error("Price calc error:", e); }

    const profile = {
      _id: expert._id,
      userId: expert.userId,
      profileImage: user.profileImage || expert.profileImage || "",
      price: price, // Dynamic Price
      minPrice: expert.minPrice || price,
      maxPrice: expert.maxPrice || price,
      personalInformation: {
        userName: user.name || "Expert",
        mobile: user.personalInfo?.phone || expert.personalInformation?.mobile || "",
        gender: user.personalInfo?.gender || expert.personalInformation?.gender || "",
        dob: user.personalInfo?.dateOfBirth || expert.personalInformation?.dob || null,
        country: user.personalInfo?.country || "",
        state: user.personalInfo?.state || "",
        city: user.personalInfo?.city || "",
        category: expert.personalInformation?.category || "IT",
        bio: user.personalInfo?.bio || expert.personalInformation?.bio || ""
      },
      professionalDetails: {
        title: expert.professionalDetails?.title || "",
        company: expert.professionalDetails?.company || "",
        totalExperience: expert.professionalDetails?.totalExperience || 0,
        industry: expert.professionalDetails?.industry || "",
        level: level,
        levels: levels,
        previous: expert.professionalDetails?.previous || []
      },
      skillsAndExpertise: {
        mode: expert.skillsAndExpertise?.mode || "Online",
        domains: expert.skillsAndExpertise?.domains || [],
        // Map expertSkills to tools for legacy frontend compatibility
        tools: (expert.skillsAndExpertise?.tools && expert.skillsAndExpertise.tools.length > 0)
          ? expert.skillsAndExpertise.tools
          : (expert.expertSkills ? expert.expertSkills.map(s => s.skillId?.name).filter(Boolean) : []),
        languages: expert.skillsAndExpertise?.languages || []
      },
      expertSkills: expert.expertSkills ? expert.expertSkills.map(s => ({
        _id: s._id,
        skillId: s.skillId?._id || s.skillId,
        skillName: s.skillId?.name || "Unknown Skill",
        level: s.level,
        isEnabled: s.isEnabled
      })) : [],
      availability: {
        sessionDuration: expert.availability?.sessionDuration || 30,
        allowedDurations: (expert.availability?.allowedDurations?.length ? expert.availability.allowedDurations : null) || [expert.availability?.sessionDuration || 30],
        maxPerDay: expert.availability?.maxPerDay || 1,
        weekly: expert.availability?.weekly || {},
        breakDates: expert.availability?.breakDates || []
      },
      verification: expert.verification || {},
      userDetails: {
        email: user.email || "",
        _id: user._id
      },
      education: expert.education || [],
      status: expert.status || "pending",
    };

    return res.json({ success: true, profile });
  } catch (err) {
    console.error("getPublicExpertById error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* -------------------- getPersonalInfo (uses resolver) -------------------- */
export const getPersonalInfo = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const queryUserId = toObjectId(userIdRaw);
    const [user, expert] = await Promise.all([
      User.findById(queryUserId).lean(),
      ExpertDetails.findOne({ userId: queryUserId }).lean()
    ]);

    // Personal info: name, phone, gender, dob, country, state, city live on User; category on ExpertDetails
    const data = {
      userName: (user?.name ?? "").replace(/\s*\((expert|coach|mentor|candidate|admin|user)\)\s*/gi, "").trim(),
      mobile: user?.personalInfo?.phone ?? "",
      gender: user?.personalInfo?.gender ?? "",
      dob: user?.personalInfo?.dateOfBirth
        ? (typeof user.personalInfo.dateOfBirth === "string"
          ? user.personalInfo.dateOfBirth
          : new Date(user.personalInfo.dateOfBirth).toISOString().split("T")[0])
        : "",
      country: user?.personalInfo?.country ?? "",
      state: user?.personalInfo?.state ?? "",
      city: user?.personalInfo?.city ?? "",
      category: expert?.personalInformation?.category ?? "",
      isAadhaarVerified: Boolean(expert?.verification?.aadhar?.isVerified),
      aadhaarName: expert?.verification?.aadhar?.nameOnAadhaar || ""
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("getPersonalInfo error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- updatePersonalInfo -------------------- */
export const updatePersonalInfo = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);

    const { userName, mobile, gender, dob, country, state, city, category, bio } = req.body;

    let expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) {
      expert = new ExpertDetails({ userId: queryUserId });
    }

    // 1. Update User Identity
    const userUpdate = {};
    if (userName !== undefined) {
      const cleanName = userName.replace(/\s*\((expert|coach|mentor|candidate|admin|user)\)\s*/gi, "").trim();
      // If Aadhaar is verified, lock the account name to the verified legal Aadhaar identity!
      if (expert.verification?.aadhar?.isVerified && expert.verification.aadhar.nameOnAadhaar) {
        const normNew = normalizeName(cleanName);
        const normAadhaar = normalizeName(expert.verification.aadhar.nameOnAadhaar);
        if (normNew !== normAadhaar) {
          return res.status(400).json({
            success: false,
            message: `Your account name is locked to your verified government Aadhaar identity ("${expert.verification.aadhar.nameOnAadhaar}"). It cannot be changed.`
          });
        }
      }
      userUpdate.name = cleanName;
    }
    if (bio !== undefined) userUpdate["personalInfo.bio"] = bio;
    if (mobile !== undefined) userUpdate["personalInfo.phone"] = mobile;
    if (gender !== undefined) userUpdate["personalInfo.gender"] = gender;
    if (dob !== undefined) userUpdate["personalInfo.dateOfBirth"] = dob;
    if (country !== undefined) userUpdate["personalInfo.country"] = country;
    if (state !== undefined) userUpdate["personalInfo.state"] = state;
    if (city !== undefined) userUpdate["personalInfo.city"] = city;

    const user = await User.findByIdAndUpdate(queryUserId, { $set: userUpdate }, { new: true });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Update Expert Profile (Category only)
    if (category !== undefined && category !== null && category !== "") {
      // Validate: must be an existing category name from Category collection
      const catDoc = await Category.findOne({ name: category.trim() });
      if (!catDoc) {
        return res.status(400).json({ success: false, message: "Please select a valid category from the list" });
      }
      if (!expert.personalInformation) expert.personalInformation = {};
      expert.personalInformation.category = catDoc.name;
      await expert.save({ validateBeforeSave: false });
    }

    // Construct response object (Mocking the structure frontend expects)
    const responseData = {
      personalInformation: {
        userName: user.name,
        mobile: user.personalInfo?.phone,
        gender: user.personalInfo?.gender,
        dob: user.personalInfo?.dateOfBirth,
        country: user.personalInfo?.country,
        state: user.personalInfo?.state,
        city: user.personalInfo?.city,
        category: expert.personalInformation?.category,
        bio: user.personalInfo?.bio
      }
    };

    syncDataChange({
      type: "PERSONAL_INFO_UPDATED",
      userId: user._id,
      expertId: expert._id,
      data: responseData
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: user._id,
      expertId: expert._id,
      data: responseData
    });

    return res.status(200).json({ success: true, message: "Personal info updated successfully", data: responseData });
  } catch (error) {
    console.error("❌ updatePersonalInfo error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- getEducation / updateEducation / deleteEducationEntry -------------------- */
export const getEducation = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (expert && expert.education && expert.education.length) return res.status(200).json({ success: true, data: expert.education });
    return res.status(200).json({ success: true, data: [] });
  } catch (err) {
    console.error("getEducation error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateEducation = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);
    const { education } = req.body;
    if (!education || !Array.isArray(education)) return res.status(400).json({ success: false, message: "Education must be an array" });

    const mapped = education.map(edu => ({
      degree: edu.degree || "",
      institution: edu.institution || "",
      field: edu.field || "",
      start: edu.start || null,
      end: edu.end || null
    }));

    const expert = await ExpertDetails.findOneAndUpdate(
      { userId: queryUserId },
      { education: mapped, userId: queryUserId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    syncDataChange({
      type: "EDUCATION_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.education
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { education: expert.education }
    });

    return res.status(200).json({ success: true, message: "Education updated", data: expert.education });
  } catch (err) {
    console.error("updateEducation error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteEducationEntry = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);
    const { idx } = req.params;

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "User not found" });

    if (!Array.isArray(expert.education) || idx < 0 || idx >= expert.education.length) {
      return res.status(400).json({ success: false, message: "Invalid index" });
    }

    expert.education.splice(idx, 1);
    await expert.save({ validateBeforeSave: false });

    syncDataChange({
      type: "EDUCATION_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.education
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { education: expert.education }
    });

    return res.status(200).json({ success: true, message: "Education entry deleted", data: expert.education });
  } catch (err) {
    console.error("deleteEducationEntry error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- getProfessional / updateProfessional / deletePreviousExperience -------------------- */
export const getProfessional = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (expert && expert.professionalDetails) return res.status(200).json({ success: true, data: expert.professionalDetails });

    return res.status(200).json({ success: true, data: { title: "", company: "", totalExperience: "", industry: "", level: "Intermediate", previous: [] } });
  } catch (err) {
    console.error("getProfessional error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateProfessional = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);

    const professionalDetails = req.body.professionalDetails || req.body;
    if (!professionalDetails) return res.status(400).json({ success: false, message: "Professional details required" });

    const payload = {
      title: professionalDetails.title || "",
      company: professionalDetails.company || "",
      totalExperience: Number(professionalDetails.totalExperience) || 0,
      industry: professionalDetails.industry || "",
      level: professionalDetails.level || (Array.isArray(professionalDetails.levels) && professionalDetails.levels[0]) || "Rising Mentor",
      levels: Array.isArray(professionalDetails.levels) ? professionalDetails.levels : [professionalDetails.level || "Rising Mentor"],
      previous: Array.isArray(professionalDetails.previous)
        ? professionalDetails.previous.map(exp => ({
          company: exp.company || "",
          title: exp.title || "",
          start: exp.start || null,
          end: exp.end || null
        }))
        : []
    };

    const expert = await ExpertDetails.findOneAndUpdate(
      { userId: queryUserId },
      { professionalDetails: payload, userId: queryUserId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    syncDataChange({
      type: "EXPERIENCE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.professionalDetails
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { professionalDetails: expert.professionalDetails }
    });

    return res.status(200).json({ success: true, message: "Professional details updated", data: expert.professionalDetails });
  } catch (err) {
    console.error("updateProfessional error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deletePreviousExperience = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);
    const { idx } = req.params;

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "User not found" });

    if (!expert.professionalDetails || !Array.isArray(expert.professionalDetails.previous) || idx < 0 || idx >= expert.professionalDetails.previous.length) {
      return res.status(400).json({ success: false, message: "Invalid index" });
    }

    expert.professionalDetails.previous.splice(idx, 1);
    await expert.save({ validateBeforeSave: false });

    syncDataChange({
      type: "EXPERIENCE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.professionalDetails.previous
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { professionalDetails: expert.professionalDetails }
    });

    return res.status(200).json({ success: true, message: "Previous experience deleted", data: expert.professionalDetails.previous });
  } catch (err) {
    console.error("deletePreviousExperience error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- getSkillsAndExpertise / updateSkillsAndExpertise -------------------- */
export const getSkillsAndExpertise = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({
      success: true,
      message: "Skills & Expertise fetched successfully",
      data: expert.skillsAndExpertise || { mode: "Online", domains: [], tools: [], languages: [] }
    });
  } catch (err) {
    console.error("getSkillsAndExpertise error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateSkillsAndExpertise = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);

    const skills = req.body.skillsAndExpertise;

    if (!skills) return res.status(400).json({ success: false, message: "skillsAndExpertise is required in body" });

    const { mode, domains, tools, languages } = skills;

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "User not found" });

    if (!expert.skillsAndExpertise) expert.skillsAndExpertise = { mode: "Online", domains: [], tools: [], languages: [] };

    if (mode) {
      const allowedModes = ["Online", "Offline", "Hybrid"];
      if (!allowedModes.includes(mode)) return res.status(400).json({ success: false, message: "Invalid mode" });
      expert.skillsAndExpertise.mode = mode;
    }
    if (Array.isArray(domains)) expert.skillsAndExpertise.domains = domains;
    if (Array.isArray(tools)) expert.skillsAndExpertise.tools = tools;
    if (Array.isArray(languages)) expert.skillsAndExpertise.languages = languages;

    await expert.save({ validateBeforeSave: false });

    syncDataChange({
      type: "SKILLS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.skillsAndExpertise
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { skillsAndExpertise: expert.skillsAndExpertise }
    });

    return res.status(200).json({ success: true, message: "Skills updated", data: expert.skillsAndExpertise });
  } catch (err) {
    console.error("updateSkillsAndExpertise error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- getExpertStats -------------------- */
export const getExpertStats = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized" });
    const queryUserId = toObjectId(userIdRaw);

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    // Session.expertId is an ObjectId in our Session model, but historically some places
    // may have used the ExpertDetails _id. Query both to be safe.
    const expertIdCandidates = [queryUserId, expert._id].filter(Boolean);



    const now = new Date();
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);



    const [
      totalSessions,
      upcomingSessions,
      todaysBookings,
      completedSessions,
      ratings,
      userDoc
    ] = await Promise.all([
      // Total
      import("../models/Session.js").then(m => m.default.countDocuments({ expertId: { $in: expertIdCandidates } })),
      // Upcoming (confirmed & future)
      import("../models/Session.js").then(m => m.default.countDocuments({ expertId: { $in: expertIdCandidates }, status: 'confirmed', startTime: { $gt: now } })),
      // Today (confirmed & today)
      import("../models/Session.js").then(m => m.default.countDocuments({
        expertId: { $in: expertIdCandidates },
        status: 'confirmed',
        startTime: { $gte: startOfDay, $lte: endOfDay }
      })),
      // Completed for revenue
      import("../models/Session.js").then(m => m.default.find({ expertId: { $in: expertIdCandidates }, status: 'completed' }, 'price')),
      // Ratings
      import("../models/reviewModel.js").then(m => m.default.find({ expertId: { $in: expertIdCandidates }, reviewerRole: 'candidate' }, 'overallRating')), // Ratings GIVEN to expert
      // Wallet Balance
      import("../models/Wallet.js").then(m => m.default.findOne({ userId: queryUserId }))
    ]);

    let walletBalance = userDoc?.availableBalance || 0;

    if (!userDoc) {
      // Run migration if no wallet exists but legacy user.walletBalance exists
      const user = await import("../models/User.js").then(m => m.default.findById(queryUserId));
      if (user && user.walletBalance) {
        const Wallet = (await import("../models/Wallet.js")).default;
        const newWallet = await Wallet.create({
          userId: queryUserId,
          availableBalance: user.walletBalance || 0
        });
        walletBalance = newWallet.availableBalance;
      }
    }

    // Calculate revenue (legacy sessions used price, new ones use payoutAmount)
    const revenue = completedSessions.reduce((sum, s) => sum + (s.payoutAmount || s.price || 0), 0);

    // Calculate avg rating
    let avgRating = 0;
    if (ratings.length > 0) {
      const sumRating = ratings.reduce((sum, r) => sum + r.overallRating, 0);
      avgRating = Number((sumRating / ratings.length).toFixed(1));
    }

    // Session completion rate (completed / total created)
    // Simplification: if total is 0, 100%
    const completionRate = totalSessions > 0
      ? Math.round((completedSessions.length / totalSessions) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalSessions,
        upcomingSessions,
        todaysBookings,
        revenue,
        rating: avgRating,
        completionRate,
        walletBalance
      }
    });

  } catch (err) {
    console.error("getExpertStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getAvailability = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const queryUserId = toObjectId(userIdRaw);
    const expert = await ExpertDetails.findOne({ userId: queryUserId });

    if (expert && expert.availability) return res.status(200).json({ success: true, data: expert.availability });

    return res.status(200).json({ success: true, data: { sessionDuration: 30, maxPerDay: 1, weekly: {}, breakDates: [] } });
  } catch (err) {
    console.error("getAvailability error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateAvailability = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const queryUserId = toObjectId(userIdRaw);
    const newAvailability = req.body;

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    if (!expert.availability) expert.availability = { sessionDuration: 30, maxPerDay: 1, weekly: {}, breakDates: [] };

    // Validate weekly slots overlap and solid 30-minute intervals
    if (newAvailability.weekly) {
      const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      for (const day of Object.keys(newAvailability.weekly)) {
        const daySlots = newAvailability.weekly[day] || [];
        const sortedSlots = [...daySlots].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));

        for (let i = 0; i < sortedSlots.length; i++) {
          const slot = sortedSlots[i];
          const start = timeToMinutes(slot.from);
          const end = timeToMinutes(slot.to);

          if (start >= end) {
            return res.status(400).json({
              success: false,
              message: `Invalid slot on ${day}: ${slot.from} - ${slot.to} cannot end before it starts.`
            });
          }

          if (start % 30 !== 0) {
            return res.status(400).json({
              success: false,
              message: `Invalid slot on ${day}: Slot start time (${slot.from}) must be on a solid 30-minute interval (e.g. :00 or :30).`
            });
          }

          if (i > 0) {
            const prevSlot = sortedSlots[i - 1];
            const prevEnd = timeToMinutes(prevSlot.to);
            if (start < prevEnd) {
              return res.status(400).json({
                success: false,
                message: `Slot overlap on ${day}: The slot ${slot.from} - ${slot.to} overlaps with ${prevSlot.from} - ${prevSlot.to}.`
              });
            }
          }
        }
        newAvailability.weekly[day] = sortedSlots;
      }
    }

    expert.availability.sessionDuration = newAvailability.sessionDuration ?? expert.availability.sessionDuration;
    expert.availability.maxPerDay = newAvailability.maxPerDay ?? expert.availability.maxPerDay;
    if (newAvailability.defaultMeetingLink !== undefined) {
      const raw = typeof newAvailability.defaultMeetingLink === 'string' ? newAvailability.defaultMeetingLink.trim() : '';
      if (!raw) {
        expert.availability.defaultMeetingLink = null;
      } else if (!/^https?:\/\/meet\.google\.com\//i.test(raw)) {
        return res.status(400).json({ success: false, message: "Invalid Google Meet link. Use a meet.google.com URL." });
      } else {
        expert.availability.defaultMeetingLink = raw;
      }
    }
    if (Array.isArray(newAvailability.allowedDurations)) {
      expert.availability.allowedDurations = newAvailability.allowedDurations.filter((d) => d === 30 || d === 60);
      if (expert.availability.allowedDurations.length === 0) expert.availability.allowedDurations = [expert.availability.sessionDuration];
    } else if (newAvailability.allowedDurations !== undefined) {
      expert.availability.allowedDurations = undefined;
    }
    // ensure weekly is a plain object
    expert.availability.weekly = newAvailability.weekly ?? expert.availability.weekly ?? {};
    expert.availability.breakDates = newAvailability.breakDates ?? expert.availability.breakDates ?? [];

    await expert.save();

    syncDataChange({
      type: "AVAILABILITY_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.availability
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { availability: expert.availability }
    });

    return res.status(200).json({ success: true, message: "Availability updated", data: expert.availability });
  } catch (err) {
    console.error("updateAvailability error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteBreakDate = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);
    const { start } = req.body;
    if (!start) return res.status(400).json({ success: false, message: "Break start missing" });

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    const targetTime = new Date(start).getTime();
    expert.availability = expert.availability || { breakDates: [], weekly: {} };
    expert.availability.breakDates = (expert.availability.breakDates || []).filter(d => {
      try {
        return new Date(d.start).getTime() !== targetTime;
      } catch (e) {
        return true;
      }
    });

    await expert.save();

    syncDataChange({
      type: "AVAILABILITY_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.availability
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { availability: expert.availability }
    });

    return res.status(200).json({ success: true, message: "Break date removed", data: expert.availability.breakDates });
  } catch (err) {
    console.error("deleteBreakDate error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteWeeklySlot = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });
    const queryUserId = toObjectId(userIdRaw);
    const { day, from } = req.body;
    if (!day || !from) return res.status(400).json({ success: false, message: "Day or from missing" });

    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    expert.availability = expert.availability || { weekly: {} };
    const weekly = expert.availability.weekly;
    if (weekly && typeof weekly.get === 'function') {
      const slots = weekly.get(day) || [];
      const updatedSlots = slots.filter(slot => slot.from !== from);
      weekly.set(day, updatedSlots);
    } else if (weekly) {
      const slots = Array.isArray(weekly[day]) ? weekly[day] : [];
      weekly[day] = slots.filter(slot => slot.from !== from);
    }

    await expert.save();
    const resultSlots = weekly && typeof weekly.get === 'function' ? weekly.get(day) : (weekly ? weekly[day] : []);

    syncDataChange({
      type: "AVAILABILITY_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.availability
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { availability: expert.availability }
    });

    return res.status(200).json({ success: true, message: "Slot removed", data: resultSlots });
  } catch (err) {
    console.error("deleteWeeklySlot error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------- getPendingExperts (Pending verification) -------------------- */
export const getPendingExperts = async (req, res) => {
  try {
    const experts = await ExpertDetails.aggregate([
      { $match: { status: "pending" } },
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
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    // Only experts who meet eligibility (min 80% completion + compulsory verification documents) and requested verification
    const eligibleExperts = experts.filter(expert => {
      if (!expert.userDetails) return false;
      const isComplete = isExpertProfileComplete(expert, expert.userDetails);
      if (!isComplete) return false;
      return expert.verificationRequested === true || expert.verificationRequested === undefined;
    });

    // Format matches frontend expectation + joined data
    const formatted = await Promise.all(eligibleExperts.map(async expert => {
      // Manually populate expertSkills.skillId
      await ExpertDetails.populate(expert, { path: 'expertSkills.skillId', select: 'name' });

      // Category-based price for display (30 min default)
      let price = 0;
      let priceDisplay = "—";
      try {
        const catName = expert.personalInformation?.category || "IT";
        const levelsList = expert.professionalDetails?.levels && expert.professionalDetails.levels.length > 0
          ? expert.professionalDetails.levels
          : [expert.professionalDetails?.level || "Rising Mentor"];

        const catDoc = await Category.findOne({ name: catName });
        if (catDoc) {
          const prices = [];
          for (const lvl of levelsList) {
            const rule = await PricingRule.findOne({
              categoryId: catDoc._id,
              skillId: null,
              level: lvl,
              duration: 30,
            });
            if (rule) prices.push(rule.price);
            else if (catDoc.amount != null && catDoc.amount >= 0) prices.push(catDoc.amount);
          }
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            price = minPrice;
            priceDisplay = minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;
          }
        }
      } catch (e) {
        console.error("Pending expert price calc error:", e);
      }

      return {
        _id: expert._id,
        userId: expert.userId,
        profileImage: expert.userDetails?.profileImage || expert.profileImage || "",
        price,
        priceDisplay,
        education: expert.education || [],
        personalInformation: {
          userName: expert.userDetails?.name || "Expert",
          mobile: expert.userDetails?.personalInfo?.phone || expert.personalInformation?.mobile || "",
          gender: expert.userDetails?.personalInfo?.gender || expert.personalInformation?.gender || "",
          dob: expert.userDetails?.personalInfo?.dateOfBirth || expert.personalInformation?.dob || null,
          country: expert.userDetails?.personalInfo?.country || expert.personalInformation?.country || "",
          state: expert.userDetails?.personalInfo?.state || expert.personalInformation?.state || "",
          city: expert.userDetails?.personalInfo?.city || expert.personalInformation?.city || "",
          category: expert.personalInformation?.category || "IT"
        },
        professionalDetails: {
          title: expert.professionalDetails?.title || "",
          company: expert.professionalDetails?.company || "",
          totalExperience: expert.professionalDetails?.totalExperience || 0,
          industry: expert.professionalDetails?.industry || "",
          level: expert.professionalDetails?.level || "Rising Mentor",
          levels: expert.professionalDetails?.levels || [expert.professionalDetails?.level || "Rising Mentor"],
          previous: expert.professionalDetails?.previous || []
        },
        skillsAndExpertise: {
          mode: expert.skillsAndExpertise?.mode || "Online",
          domains: expert.skillsAndExpertise?.domains || [],
          // Map expertSkills to tools for legacy frontend compatibility
          tools: (expert.skillsAndExpertise?.tools && expert.skillsAndExpertise.tools.length > 0)
            ? expert.skillsAndExpertise.tools
            : (expert.expertSkills ? expert.expertSkills.map(s => s.skillId?.name).filter(Boolean) : []),
          languages: expert.skillsAndExpertise?.languages || []
        },
        availability: {
          sessionDuration: expert.availability?.sessionDuration || 30,
          allowedDurations: (expert.availability?.allowedDurations?.length ? expert.availability.allowedDurations : null) || [expert.availability?.sessionDuration || 30],
          maxPerDay: expert.availability?.maxPerDay || 1,
          weekly: expert.availability?.weekly || {},
          breakDates: expert.availability?.breakDates || []
        },
        verification: expert.verification || {},
        agreement: expert.agreement || {},
        completion: computeCompletion(expert, expert.userDetails),
        verificationRequested: expert.verificationRequested,
        userDetails: {
          email: expert.userDetails?.email || "",
          _id: expert.userDetails?._id
        }
      };
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error("getPendingExperts error:", err);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};

/* -------------------- getVerifiedExperts (Active experts only) -------------------- */
/* -------------------- getRejectedExperts (Rejected experts only) -------------------- */
/* -------------------- getRejectedExperts (Rejected experts only) -------------------- */
export const getRejectedExperts = async (req, res) => {
  try {
    const experts = await ExpertDetails.aggregate([
      { $match: { status: "rejected" } },
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
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    // Format matches frontend expectation + joined data
    const formatted = await Promise.all(experts.map(async expert => {
      // Manually populate expertSkills.skillId
      await ExpertDetails.populate(expert, { path: 'expertSkills.skillId', select: 'name' });

      return {
        _id: expert._id,
        userId: expert.userId,
        profileImage: expert.userDetails?.profileImage || expert.profileImage || "",
        education: expert.education || [],
        personalInformation: {
          userName: expert.userDetails?.name || "Expert",
          mobile: expert.userDetails?.personalInfo?.phone || expert.personalInformation?.mobile || "",
          gender: expert.userDetails?.personalInfo?.gender || expert.personalInformation?.gender || "",
          dob: expert.userDetails?.personalInfo?.dateOfBirth || expert.personalInformation?.dob || null,
          country: expert.userDetails?.personalInfo?.country || expert.personalInformation?.country || "",
          state: expert.userDetails?.personalInfo?.state || expert.personalInformation?.state || "",
          city: expert.userDetails?.personalInfo?.city || expert.personalInformation?.city || "",
          category: expert.personalInformation?.category || "IT"
        },
        professionalDetails: {
          title: expert.professionalDetails?.title || "",
          company: expert.professionalDetails?.company || "",
          totalExperience: expert.professionalDetails?.totalExperience || 0,
          industry: expert.professionalDetails?.industry || "",
          level: expert.professionalDetails?.level || "Intermediate",
          previous: expert.professionalDetails?.previous || []
        },
        skillsAndExpertise: {
          mode: expert.skillsAndExpertise?.mode || "Online",
          domains: expert.skillsAndExpertise?.domains || [],
          // Map expertSkills to tools for legacy frontend compatibility
          tools: (expert.skillsAndExpertise?.tools && expert.skillsAndExpertise.tools.length > 0)
            ? expert.skillsAndExpertise.tools
            : (expert.expertSkills ? expert.expertSkills.map(s => s.skillId?.name).filter(Boolean) : []),
          languages: expert.skillsAndExpertise?.languages || []
        },
        availability: {
          sessionDuration: expert.availability?.sessionDuration || 30,
          allowedDurations: (expert.availability?.allowedDurations?.length ? expert.availability.allowedDurations : null) || [expert.availability?.sessionDuration || 30],
          maxPerDay: expert.availability?.maxPerDay || 1,
          weekly: expert.availability?.weekly || {},
          breakDates: expert.availability?.breakDates || []
        },
        verification: expert.verification || {},
        rejectionReason: expert.rejectionReason || "",
        userDetails: {
          email: expert.userDetails?.email || "",
          _id: expert.userDetails?._id
        }
      };
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    console.error("getRejectedExperts error:", err);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};
// In-memory cache for verified experts with short TTL (15 seconds) for blazing-fast refresh
const verifiedExpertsCache = new Map();
const VERIFIED_CACHE_TTL_MS = 15000;

export const clearVerifiedExpertsCache = () => {
  verifiedExpertsCache.clear();
};

/* -------------------- getVerifiedExperts (Active experts only) -------------------- */
export const getVerifiedExperts = async (req, res) => {
  try {
    const { category } = req.query;
    const catQuery = (category || "all").toLowerCase().trim();
    const cached = verifiedExpertsCache.get(catQuery);
    if (cached && (Date.now() - cached.timestamp < VERIFIED_CACHE_TTL_MS)) {
      return res.json(cached.payload);
    }

    const pipeline = [
      { $match: { status: "Active" } }
    ];

    if (category && category !== "all") {
      pipeline[0].$match["personalInformation.category"] = category;
    }

    pipeline.push(
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
          preserveNullAndEmptyArrays: false // Only show experts with valid user account
        }
      },
      {
        $lookup: {
          from: "reviews",
          let: { expertObjId: "$userId", expertStrId: { $toString: "$userId" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$expertId", "$$expertObjId"] },
                    { $eq: ["$expertId", "$$expertStrId"] }
                  ]
                },
                isVisible: true
              }
            }
          ],
          as: "reviewsList"
        }
      },
      {
        $addFields: {
          avgRating: {
            $cond: {
              if: { $gt: [{ $size: "$reviewsList" }, 0] },
              then: { $round: [{ $avg: "$reviewsList.overallRating" }, 1] },
              else: 0
            }
          },
          reviewCount: { $size: "$reviewsList" }
        }
      }
    );

    const experts = await ExpertDetails.aggregate(pipeline);

    // 1. Bulk populate expertSkills.skillId for all experts in a single query (replaces N individual queries)
    if (experts && experts.length > 0) {
      await ExpertDetails.populate(experts, { path: 'expertSkills.skillId', select: 'name' });
    }

    // 2. Fetch all categories and pricing rules once in parallel (replaces 2*N individual queries)
    const [categories, pricingRules] = await Promise.all([
      Category.find({}).lean(),
      PricingRule.find({ duration: 30, skillId: null }).lean(),
    ]);

    const catMap = new Map();
    categories.forEach((c) => {
      if (c.name) catMap.set(c.name.toLowerCase().trim(), c);
      if (c._id) catMap.set(c._id.toString(), c);
    });

    const rulesByCat = new Map();
    pricingRules.forEach((r) => {
      const cId = r.categoryId ? r.categoryId.toString() : "";
      if (!rulesByCat.has(cId)) rulesByCat.set(cId, []);
      rulesByCat.get(cId).push(r);
    });

    // Format matches frontend expectation + joined data (synchronous in-memory mapping)
    const formatted = experts.map((expert) => {
      let price = 0;
      let minPrice = 0;
      let maxPrice = 0;
      let minOriginalPrice = 0;
      let maxOriginalPrice = 0;

      const normalizeLevel = (lvl) => {
        if (!lvl) return "Rising Mentor";
        const lower = String(lvl).toLowerCase().trim();
        if (lower === "beginner") return "Rising Mentor";
        if (lower === "intermediate") return "Professional Mentor";
        if (lower === "advanced") return "Senior Mentor";
        return String(lvl).trim();
      };

      const rawLevels = (Array.isArray(expert.professionalDetails?.levels) && expert.professionalDetails.levels.length > 0)
        ? expert.professionalDetails.levels
        : (expert.professionalDetails?.level ? [expert.professionalDetails.level] : ["Rising Mentor"]);
      const levels = Array.from(new Set(rawLevels.map(normalizeLevel)));
      const level = normalizeLevel(expert.professionalDetails?.level || levels[0] || "Rising Mentor");

      try {
        const catName = expert.personalInformation?.category || "IT";
        const catDoc = catMap.get(catName.toLowerCase().trim());
        if (catDoc) {
          const catRules = rulesByCat.get(catDoc._id.toString()) || [];

          // 1. Base level pricing
          const rule = catRules.find(
            (r) => String(r.level).trim().toLowerCase() === String(level).trim().toLowerCase()
          );
          if (rule) {
            price = rule.price;
          } else if (catDoc.amount != null && catDoc.amount >= 0) {
            price = catDoc.amount;
          }

          // 2. Fetch pricing rules for all active levels
          const matchedRules = catRules.filter((r) =>
            levels.some((l) => String(l).trim().toLowerCase() === String(r.level).trim().toLowerCase())
          );

          // Extract offer prices and original prices
          const offerPrices = matchedRules.map((r) => r.price);
          const originalPrices = matchedRules.map((r) => r.originalPrice).filter(Boolean);

          if (offerPrices.length > 0) {
            minPrice = Math.min(...offerPrices);
            maxPrice = Math.max(...offerPrices);
          } else {
            minPrice = price;
            maxPrice = price;
          }

          if (originalPrices.length > 0) {
            minOriginalPrice = Math.min(...originalPrices);
            maxOriginalPrice = Math.max(...originalPrices);
          } else {
            // Default calculation fallback if no original prices configured in DB
            minOriginalPrice = Math.round(minPrice / 0.77);
            maxOriginalPrice = Math.round(maxPrice / 0.77);
          }
        }
      } catch (e) {
        console.error("Price fetch error", e);
      }

      return {
        _id: expert._id,
        userId: expert.userId,
        profileImage: expert.userDetails?.profileImage || expert.profileImage || "",
        price: price, // Dynamic Price
        minPrice: minPrice,
        maxPrice: maxPrice,
        minOriginalPrice: minOriginalPrice,
        maxOriginalPrice: maxOriginalPrice,
        metrics: {
          avgRating: expert.avgRating || 0,
          totalReviews: expert.reviewCount || 0
        },
        personalInformation: {
          userName: expert.userDetails?.name || "Expert",
          mobile: expert.userDetails?.personalInfo?.phone || expert.personalInformation?.mobile || "",
          gender: expert.userDetails?.personalInfo?.gender || expert.personalInformation?.gender || "",
          dob: expert.userDetails?.personalInfo?.dateOfBirth || expert.personalInformation?.dob || null,
          country: expert.userDetails?.personalInfo?.country || expert.personalInformation?.country || "",
          state: expert.userDetails?.personalInfo?.state || expert.personalInformation?.state || "",
          city: expert.userDetails?.personalInfo?.city || expert.personalInformation?.city || "",
          category: expert.personalInformation?.category || "IT",
          bio: expert.userDetails?.personalInfo?.bio || expert.personalInformation?.bio || ""
        },
        professionalDetails: {
          title: expert.professionalDetails?.title || "",
          company: expert.professionalDetails?.company || "",
          totalExperience: expert.professionalDetails?.totalExperience || 0,
          industry: expert.professionalDetails?.industry || "",
          level: level,
          levels: levels,
          previous: expert.professionalDetails?.previous || []
        },
        skillsAndExpertise: {
          mode: expert.skillsAndExpertise?.mode || "Online",
          domains: expert.skillsAndExpertise?.domains || [],
          tools: (expert.skillsAndExpertise?.tools && expert.skillsAndExpertise.tools.length > 0)
            ? expert.skillsAndExpertise.tools
            : (expert.expertSkills ? expert.expertSkills.map(s => s.skillId?.name).filter(Boolean) : []),
          languages: expert.skillsAndExpertise?.languages || []
        },
        expertSkills: expert.expertSkills ? expert.expertSkills.map(s => ({
          _id: s._id,
          skillId: s.skillId?._id || s.skillId,
          skillName: s.skillId?.name || "Unknown Skill",
          level: s.level,
          isEnabled: s.isEnabled
        })) : [],
        availability: {
          sessionDuration: expert.availability?.sessionDuration || 30,
          allowedDurations: (expert.availability?.allowedDurations?.length ? expert.availability.allowedDurations : null) || [expert.availability?.sessionDuration || 30],
          maxPerDay: expert.availability?.maxPerDay || 1,
          weekly: expert.availability?.weekly || {},
          breakDates: expert.availability?.breakDates || []
        },
        verification: expert.verification || {},
        agreement: expert.agreement || {},
        userDetails: {
          email: expert.userDetails?.email || "",
          _id: expert.userDetails?._id
        }
      };
    });

    const payload = { success: true, count: formatted.length, data: formatted };
    verifiedExpertsCache.set(catQuery, { payload, timestamp: Date.now() });

    return res.json(payload);

  } catch (err) {
    console.error("getVerifiedExperts error:", err);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};

/* -------------------- getAllExperts (Public Listing) -------------------- */
export const getAllExperts = async (req, res) => {
  try {
    const experts = await ExpertDetails.find().populate('userId').lean();

    const formatted = await Promise.all(experts.map(async expert => {
      let price = 0;
      try {
        const catName = expert.personalInformation?.category || expert.category;
        if (catName) {
          const catDoc = await Category.findOne({ name: catName });
          if (catDoc) {
            const rule = await PricingRule.findOne({
              categoryId: catDoc._id,
              skillId: null,
              level: expert.professionalDetails?.level || "Intermediate",
              duration: 30 // Default 30 min for listing
            });
            if (rule) price = rule.price;
          }
        }
      } catch (e) { }

      return {
        id: expert._id,
        name: expert.userId?.name || expert.personalInformation?.userName || "Expert",
        role: expert.professionalDetails?.title || "",
        experience: (expert.professionalDetails?.totalExperience || 0) + " yrs",
        skills: expert.skillsAndExpertise?.languages || [],
        rating: 4.8,
        price: price > 0 ? price : 499, // Fallback to 499 if no rule found
        category: expert.personalInformation?.category || expert.category,
        company: expert.professionalDetails?.company || "",
        avatar: expert.userId?.profileImage || expert.profileImage || "",
        location: expert.userId?.personalInfo?.city || expert.personalInformation?.city || "",
        reviews: 32,
        responseTime: "1 hour",
        successRate: 92,
        isVerified: true,
        bio: expert.userId?.personalInfo?.bio || expert.personalInformation?.bio || ""
      };
    }));

    return res.json({ success: true, data: formatted });

  } catch (err) {
    console.error("getAllExperts error:", err);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
};

/* -------------------- Approve Expert -------------------- */
export const approveExpert = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, level } = req.body;

    const updateObj = { status: "Active", verificationRequested: false };
    if (category) {
      updateObj["personalInformation.category"] = category;
    }
    if (level) {
      updateObj["professionalDetails.level"] = level;
    }

    const expert = await ExpertDetails.findByIdAndUpdate(
      id,
      updateObj,
      { new: true }
    );

    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }

    clearVerifiedExpertsCache();

    syncDataChange({
      type: "EXPERT_STATUS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert,
      toAdmin: true
    });
    syncDataChange({
      type: "STATUS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert,
      toAdmin: true
    });

    return res.json({ success: true, message: "Expert approved successfully", data: expert });
  } catch (err) {
    console.error("approveExpert error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* -------------------- Reject Expert -------------------- */
export const rejectExpert = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    const expert = await ExpertDetails.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        verificationRequested: false,
        rejectionReason: reason
      },
      { new: true }
    );

    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }

    clearVerifiedExpertsCache();

    syncDataChange({
      type: "EXPERT_STATUS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert,
      toAdmin: true
    });
    syncDataChange({
      type: "STATUS_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert,
      toAdmin: true
    });

    return res.json({ success: true, message: "Expert rejected successfully", data: expert });
  } catch (err) {
    console.error("rejectExpert error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* -------------------- Update Expert by Admin -------------------- */
export const updateExpertByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const {
      userName,
      name,
      email,
      mobile,
      phone,
      gender,
      dob,
      dateOfBirth,
      bio,
      category,
      city,
      state,
      country,
      title,
      company,
      totalExperience,
      industry,
      level,
      levels,
      status,
      domains,
      tools,
      languages,
      mode,
      linkedin,
      price,
      sessionDuration,
      allowedDurations,
      defaultMeetingLink,
      maxPerDay
    } = body;

    let expert = null;
    if (isValidObjectId(id)) {
      expert = await ExpertDetails.findById(id);
      if (!expert) {
        expert = await ExpertDetails.findOne({ userId: id });
      }
    }

    if (!expert) {
      return res.status(404).json({ success: false, message: "Expert not found" });
    }

    const expertId = expert._id;
    const userId = expert.userId;

    // Build update object for ExpertDetails
    const updateObj = {};

    if (status !== undefined) updateObj.status = status;

    // Personal Information / Category
    if (category !== undefined) updateObj["personalInformation.category"] = category;
    if (userName || name) updateObj["personalInformation.userName"] = userName || name;
    if (mobile || phone) updateObj["personalInformation.mobile"] = mobile || phone;
    if (city !== undefined) updateObj["personalInformation.city"] = city;
    if (state !== undefined) updateObj["personalInformation.state"] = state;
    if (country !== undefined) updateObj["personalInformation.country"] = country;
    if (gender !== undefined) updateObj["personalInformation.gender"] = gender;
    if (dob || dateOfBirth) updateObj["personalInformation.dob"] = dob || dateOfBirth;

    // Professional Details
    if (title !== undefined) updateObj["professionalDetails.title"] = title;
    if (company !== undefined) updateObj["professionalDetails.company"] = company;
    if (totalExperience !== undefined && totalExperience !== "") updateObj["professionalDetails.totalExperience"] = Number(totalExperience);
    if (industry !== undefined) updateObj["professionalDetails.industry"] = industry;
    if (level !== undefined) {
      updateObj["professionalDetails.level"] = level;
      if (!levels) {
        updateObj["professionalDetails.levels"] = [level];
      }
    }
    if (Array.isArray(levels)) updateObj["professionalDetails.levels"] = levels;

    // Skills & Expertise
    if (mode !== undefined) updateObj["skillsAndExpertise.mode"] = mode;
    if (domains !== undefined) {
      updateObj["skillsAndExpertise.domains"] = Array.isArray(domains) ? domains : String(domains).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (tools !== undefined) {
      updateObj["skillsAndExpertise.tools"] = Array.isArray(tools) ? tools : String(tools).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (languages !== undefined) {
      updateObj["skillsAndExpertise.languages"] = Array.isArray(languages) ? languages : String(languages).split(',').map(s => s.trim()).filter(Boolean);
    }

    // Verification
    if (linkedin !== undefined) {
      let l = String(linkedin).trim();
      if (l && !/^https?:\/\//i.test(l)) {
        l = 'https://' + l;
      }
      updateObj["verification.linkedin"] = l;
    }

    if (body.aadhaarNumber !== undefined || body.aadharNumber !== undefined) {
      const raw = String(body.aadhaarNumber || body.aadharNumber || '').trim().replace(/\s/g, '');
      if (raw) {
        updateObj["verification.aadhar.number"] = raw.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
        updateObj["verification.aadhar.rawNumber"] = raw;
        updateObj["verification.aadhar.isVerified"] = true;
      }
    }

    // Availability
    if (sessionDuration !== undefined && sessionDuration !== "") updateObj["availability.sessionDuration"] = Number(sessionDuration);
    if (allowedDurations !== undefined) updateObj["availability.allowedDurations"] = Array.isArray(allowedDurations) ? allowedDurations : [Number(allowedDurations)];
    if (defaultMeetingLink !== undefined) updateObj["availability.defaultMeetingLink"] = defaultMeetingLink;
    if (maxPerDay !== undefined && maxPerDay !== "") updateObj["availability.maxPerDay"] = Number(maxPerDay);

    const updatedExpert = await ExpertDetails.findByIdAndUpdate(
      expertId,
      { $set: updateObj },
      { new: true }
    );

    // Update User model (Source of Truth for name, email, phone, city, etc.)
    if (userId) {
      const userUpdates = {};
      const finalName = userName || name;
      if (finalName) userUpdates.name = finalName;
      if (email) userUpdates.email = email.toLowerCase().trim();

      if (status) {
        if (status === 'Active') userUpdates.status = 'Active';
        else if (status === 'suspended' || status === 'rejected') userUpdates.status = 'Blocked';
      }

      if (mobile || phone) userUpdates["personalInfo.phone"] = mobile || phone;
      if (gender) userUpdates["personalInfo.gender"] = gender;
      if (dob || dateOfBirth) userUpdates["personalInfo.dateOfBirth"] = dob || dateOfBirth;
      if (city !== undefined) userUpdates["personalInfo.city"] = city;
      if (state !== undefined) userUpdates["personalInfo.state"] = state;
      if (country !== undefined) userUpdates["personalInfo.country"] = country;
      if (bio !== undefined) userUpdates["personalInfo.bio"] = bio;

      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(userId, { $set: userUpdates }, { new: true });
      }
    }

    clearVerifiedExpertsCache();

    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: updatedExpert.userId,
      expertId: updatedExpert._id,
      data: updatedExpert,
      toAdmin: true
    });
    syncDataChange({
      type: "EXPERT_STATUS_UPDATED",
      userId: updatedExpert.userId,
      expertId: updatedExpert._id,
      data: updatedExpert,
      toAdmin: true
    });

    return res.json({
      success: true,
      message: "Expert updated successfully",
      data: updatedExpert
    });
  } catch (err) {
    console.error("updateExpertByAdmin error:", err);
    return res.status(500).json({ success: false, message: "Internal server error: " + err.message });
  }
};

/* -------------------- Get Active Experts -------------------- */
export const getActiveExperts = async (req, res) => {
  try {
    const experts = await ExpertDetails.find({ status: { $in: ["verified", "Active"] } })
      .select("user personalInformation expertSkills adminMappings status");

    res.json(experts);
  } catch (error) {
    console.error("Error fetching active experts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------- Search Experts (User Booking) -------------------- */
export const searchExperts = async (req, res) => {
  try {
    const { category, skillId, level, duration } = req.body;

    // Base Query: Active experts only
    const query = { status: "Active" };

    // 1. Filter by Category
    if (category) {
      query["personalInformation.category"] = category;
    }

    // 2. Filter by Skill (if provided)
    if (skillId) {
      query["expertSkills.skillId"] = skillId;
      query["expertSkills.isEnabled"] = true;
    }

    // Fetch experts
    let experts = await ExpertDetails.find(query)
      .populate("userId", "name email profileImage") // To get name
      .populate("expertSkills.skillId", "name"); // To show skill names

    // 3. Filter/Sort by Level (Client side or in-memory filtering for MVP)
    // Logic: specific level matching
    if (skillId && level) {
      experts = experts.filter(e => {
        const skill = e.expertSkills.find(s => s.skillId._id.toString() === skillId && s.isEnabled);
        if (!skill) return false;

        // Simple level checks (Exact match or higher?)
        // For now, exact match or let user decide in UI, 
        // but typically "Intermediate" can do "Beginner".
        const levels = ["Beginner", "Intermediate", "Advanced", "Expert"];
        const expertLevelIdx = levels.indexOf(skill.level);
        const reqLevelIdx = levels.indexOf(level);

        return expertLevelIdx >= reqLevelIdx;
      });
    }

    // Transform for UI
    const results = await Promise.all(experts.map(async (e) => {
      // Calculate Price using Pricing Model
      let price = 0;
      const categoryName = e.personalInformation?.category || "IT";
      // Determine level: if skillId provided, use that skill's level, else default/avg
      let levelToPrice = "Intermediate"; // Default fallback

      if (skillId) {
        const skill = e.expertSkills.find(s => s.skillId._id.toString() === skillId);
        if (skill && skill.level) levelToPrice = skill.level;
      } else if (level) {
        levelToPrice = level;
      }

      const dur = Number(duration) || 60; // Default to 60 for search, or whatever the UI expects

      try {
        // Resolve Category Name to ID
        const catDoc = await Category.findOne({ name: categoryName });

        if (catDoc) {
          const pricingRule = await PricingRule.findOne({
            categoryId: catDoc._id,
            level: levelToPrice, // Correct field name
            duration: dur
          });

          if (pricingRule) price = pricingRule.price;
        }

      } catch (err) {
        // console.error("Price lookup failed in search", err);
      }

      return {
        _id: e._id,
        name: e.userId?.name || e.personalInformation?.userName || "Expert",
        title: e.professionalDetails?.title || "Professional",
        company: e.professionalDetails?.company || "Confidential",
        price: price, // Now from Pricing Table
        rating: e.metrics?.avgRating || 0,
        skills: e.expertSkills.map(s => s.skillId?.name).filter(Boolean),
        profileImage: e.userId?.profileImage || e.profileImage
      };
    }));

    res.json(results);

  } catch (error) {
    console.error("Search experts error:", error);
    res.status(500).json({ message: "Search failed" });
  }
};

/* -------------------- Update My Skills (Expert Self-Service) -------------------- */
export const updateMySkills = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ message: "Unauthorized" });
    const queryUserId = toObjectId(userIdRaw);

    const { expertSkills } = req.body; // Array of { skillId, level, priceAdjustment }

    const expert = await ExpertDetails.findOneAndUpdate(
      { userId: queryUserId },
      { $set: { expertSkills } },
      { new: true }
    ).populate('expertSkills.skillId', 'name');

    if (!expert) return res.status(404).json({ message: "Expert not found" });

    res.json(expert.expertSkills);
  } catch (error) {
    console.error("Update my skills error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* -------------------- Aadhaar OTP Verification -------------------- */
export const sendAadhaarOtpController = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const queryUserId = toObjectId(userIdRaw);
    const { aadhaarNumber } = req.body;

    if (!aadhaarNumber) {
      return res.status(400).json({ success: false, message: "Aadhaar number is required." });
    }

    const cleanAadhaar = aadhaarNumber.toString().replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      return res.status(400).json({ success: false, message: "Please enter a valid 12-digit Aadhaar number." });
    }

    const formatCheck = validateAadhaarFormat(cleanAadhaar);
    if (!formatCheck.valid) {
      return res.status(400).json({ success: false, message: formatCheck.message });
    }

    // Rate Limiting: Max 5 OTP requests per 10 minutes per user
    const rateCheck = checkAadhaarRateLimit(queryUserId.toString());
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message: rateCheck.message
      });
    }

    // Fetch user and expert profile
    const [expert, user] = await Promise.all([
      ExpertDetails.findOne({ userId: queryUserId }),
      User.findById(queryUserId)
    ]);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    // Profile full name from Personal Details
    const rawProfileName = (expert?.personalInformation?.userName || user.name || "").replace(/\s*\((expert|coach|mentor|candidate|admin|user)\)\s*/gi, "").trim();

    if (!rawProfileName || rawProfileName.length < 2) {
      return res.status(400).json({
        success: false,
        code: "PROFILE_NAME_REQUIRED",
        message: "Please complete your Full Name in Personal Details before verifying your Aadhaar card."
      });
    }

    // CHECK: IS THE AADHAAR ID USED BY ANY OTHER USER?
    // Check if this Aadhaar number is already verified on another account
    const aadhaarHash = hashAadhaar(cleanAadhaar);
    const maskedNumber = maskAadhaar(cleanAadhaar);

    const existingOtherAccount = await ExpertDetails.findOne({
      userId: { $ne: queryUserId },
      $or: [
        { "verification.aadhar.hash": aadhaarHash },
        { "verification.aadhar.number": maskedNumber, "verification.aadhar.isVerified": true }
      ]
    });

    if (existingOtherAccount) {
      return res.status(400).json({
        success: false,
        code: "AADHAAR_ALREADY_USED",
        message: "This Aadhaar card number is already registered and verified on another Mockeefy account. Each expert must use their own unique Aadhaar card."
      });
    }

    // Record rate limit consumption only AFTER all validations pass
    recordAadhaarOtpSend(queryUserId.toString());

    // Send OTP to Aadhaar-registered mobile
    const result = await sendAadhaarOtp(cleanAadhaar, rawProfileName);
    return res.json(result);
  } catch (err) {
    console.error("sendAadhaarOtpController error:", err);
    return res.status(400).json({ success: false, message: err.message || "Failed to send Aadhaar OTP" });
  }
};

export const verifyAadhaarOtpController = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const queryUserId = toObjectId(userIdRaw);
    const [expert, user] = await Promise.all([
      ExpertDetails.findOne({ userId: queryUserId }),
      User.findById(queryUserId)
    ]);

    if (!expert) return res.status(404).json({ success: false, message: "Expert profile not found" });
    if (!user) return res.status(404).json({ success: false, message: "User account not found" });

    const { referenceId, otp, aadhaarNumber } = req.body;
    if (!referenceId || !otp) {
      return res.status(400).json({ success: false, message: "Reference ID and OTP are required." });
    }

    const cleanAadhaar = (aadhaarNumber || "").toString().replace(/\D/g, "");
    const aadhaarHash = cleanAadhaar ? hashAadhaar(cleanAadhaar) : null;
    const maskedNumber = cleanAadhaar ? maskAadhaar(cleanAadhaar) : null;

    // Check duplicate usage across accounts
    if (aadhaarHash || maskedNumber) {
      const existing = await ExpertDetails.findOne({
        userId: { $ne: queryUserId },
        $or: [
          ...(aadhaarHash ? [{ "verification.aadhar.hash": aadhaarHash }] : []),
          ...(maskedNumber ? [{ "verification.aadhar.number": maskedNumber, "verification.aadhar.isVerified": true }] : [])
        ]
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          code: "AADHAAR_ALREADY_USED",
          message: "This Aadhaar number is already verified on another account. Each expert must use their own unique Aadhaar card."
        });
      }
    }

    const rawProfileName = (expert?.personalInformation?.userName || user.name || "").replace(/\s*\((expert|coach|mentor|candidate|admin|user)\)\s*/gi, "").trim();

    console.log(`[VERIFY AADHAAR] Calling verifyAadhaarOtp for user "${rawProfileName}" with refId: ${referenceId}`);
    const result = await verifyAadhaarOtp({
      referenceId,
      otp,
      aadhaarNumber: cleanAadhaar,
      aadhaarName: rawProfileName
    });

    // Legal name returned by UIDAI Aadhaar e-KYC
    const aadhaarLegalName = result.name || rawProfileName;
    console.log(`[VERIFY AADHAAR] Profile Name: "${rawProfileName}" | Aadhaar Legal Name: "${aadhaarLegalName}"`);

    // Compare names handling initials and variations
    const nameComparison = compareNames(rawProfileName, aadhaarLegalName);
    console.log(`[VERIFY AADHAAR] Name Comparison:`, nameComparison);

    if (!nameComparison.isAcceptable) {
      console.warn(`[VERIFY AADHAAR] Name mismatch: "${rawProfileName}" vs "${aadhaarLegalName}"`);
      return res.status(400).json({
        success: false,
        code: "NAME_MISMATCH",
        message: `Name mismatch: The legal name on your Aadhaar card ("${aadhaarLegalName}") does not match the name in your Personal Details ("${rawProfileName}"). Please ensure you are verifying your own Aadhaar card, or update your name in Personal Details.`,
        matchScore: nameComparison.score,
        nameOnAadhaar: aadhaarLegalName,
        accountName: rawProfileName,
        reason: nameComparison.reason
      });
    }

    if (!expert.verification) expert.verification = {};
    expert.verification.aadhar = {
      number: result.maskedAadhaar || (maskedNumber || ""),
      hash: aadhaarHash || expert.verification.aadhar?.hash,
      isVerified: true,
      verifiedAt: new Date(),
      referenceId,
      nameOnAadhaar: aadhaarLegalName,
      nameMatchScore: nameComparison.score,
      nameMatchStatus: "MATCH",
      consentGiven: true,
      consentTimestamp: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      purpose: "Identity Verification for Mockeefy Expert Onboarding",
      url: expert.verification.aadhar?.url || "",
      name: expert.verification.aadhar?.name || ""
    };

    // Lock User and Expert Account Names to the verified government Aadhaar legal name
    user.name = aadhaarLegalName;
    await user.save();

    if (!expert.personalInformation) expert.personalInformation = {};
    expert.personalInformation.userName = aadhaarLegalName;

    await expert.save({ validateBeforeSave: false });

    console.log(`[VERIFY AADHAAR SUCCESS] Aadhaar successfully verified for user ${user._id}`);

    syncDataChange({
      type: "VERIFICATION_UPDATED",
      userId: user._id,
      expertId: expert._id,
      data: { aadhar: expert.verification.aadhar, matchScore: nameComparison.score, matchStatus: nameComparison.status }
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: user._id,
      expertId: expert._id,
      data: { name: aadhaarLegalName, personalInformation: expert.personalInformation, verification: expert.verification }
    });

    return res.json({
      success: true,
      message: result.message || "Aadhaar verified successfully! Your identity has been authenticated.",
      aadhar: expert.verification.aadhar,
      matchScore: nameComparison.score,
      matchStatus: nameComparison.status
    });
  } catch (err) {
    console.error("verifyAadhaarOtpController error:", err.message || err);
    return res.status(400).json({ success: false, message: err.message || "Failed to verify Aadhaar OTP" });
  }
};

export const resetAadhaarVerification = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized: user id missing" });

    const queryUserId = toObjectId(userIdRaw);
    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "Expert profile not found" });

    if (!expert.verification) expert.verification = {};
    expert.verification.aadhar = {
      isVerified: false,
      number: "",
      hash: "",
      nameOnAadhaar: "",
      nameMatchScore: 0,
      nameMatchStatus: "UNVERIFIED",
      url: "",
      name: ""
    };

    await expert.save({ validateBeforeSave: false });

    syncDataChange({
      type: "VERIFICATION_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { aadhar: expert.verification.aadhar }
    });

    return res.json({
      success: true,
      message: "Aadhaar verification status reset. You can now re-verify."
    });
  } catch (err) {
    console.error("resetAadhaarVerification error:", err);
    return res.status(500).json({ success: false, message: "Failed to reset verification" });
  }
};

/* -------------------- Expert Agreement -------------------- */
export const getExpertAgreement = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized" });

    const queryUserId = toObjectId(userIdRaw);
    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    const user = await User.findById(queryUserId);

    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    return res.json({
      success: true,
      agreement: expert.agreement || {},
      expertDetails: {
        name: user?.name || expert.name || "",
        email: user?.email || expert.email || "",
        company: expert.professionalDetails?.company || "",
        title: expert.professionalDetails?.title || ""
      }
    });
  } catch (err) {
    console.error("getExpertAgreement error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const saveExpertAgreement = async (req, res) => {
  try {
    const userIdRaw = resolveUserIdFromReq(req);
    if (!userIdRaw) return res.status(401).json({ success: false, message: "Unauthorized" });

    const queryUserId = toObjectId(userIdRaw);
    const expert = await ExpertDetails.findOne({ userId: queryUserId });
    if (!expert) return res.status(404).json({ success: false, message: "Expert not found" });

    if (!expert.agreement) expert.agreement = {};

    expert.agreement.isSigned = true;
    expert.agreement.signedAt = new Date();
    expert.agreement.agreedTerms = req.body.agreedTerms === "true" || req.body.agreedTerms === true;
    if (req.body.signedBy) expert.agreement.signedBy = req.body.signedBy;
    if (req.body.companyName) expert.agreement.companyName = req.body.companyName;
    if (req.body.jobTitle) expert.agreement.jobTitle = req.body.jobTitle;

    // Handle files if uploaded (via Multer/Cloudinary)
    if (req.files) {
      if (req.files.signatureFile && req.files.signatureFile[0]) {
        expert.agreement.signatureFile = {
          url: getFileUrl(req, req.files.signatureFile[0]),
          name: req.files.signatureFile[0].originalname
        };
      }
      if (req.files.agreementPdf && req.files.agreementPdf[0]) {
        expert.agreement.agreementPdf = {
          url: getFileUrl(req, req.files.agreementPdf[0]),
          name: req.files.agreementPdf[0].originalname
        };
      }
    }

    await expert.save({ validateBeforeSave: false });

    syncDataChange({
      type: "AGREEMENT_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: expert.agreement
    });
    syncDataChange({
      type: "PROFILE_UPDATED",
      userId: expert.userId,
      expertId: expert._id,
      data: { agreement: expert.agreement }
    });

    return res.json({
      success: true,
      message: "Expert agreement successfully signed and recorded",
      agreement: expert.agreement
    });
  } catch (err) {
    console.error("saveExpertAgreement error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to save agreement" });
  }
};

/* -------------------- Generate Centered Vector Agreement PDF (pdf-lib) -------------------- */
export async function generateCenteredAgreementPdf(expert) {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const { fetchResumeBuffer } = await import("../services/resumeService.js");

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Standard A4 dimensions in PDF points (72 points = 1 inch)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40; // Exactly 40 points on left and right
  const contentWidth = pageWidth - margin * 2; // Exactly 515.28 points

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const agr = expert.agreement || {};
  const expertName = agr.signedBy || expert.personalInformation?.userName || expert.personalInformation?.name || expert.userId?.name || "Expert";
  const companyName = agr.companyName || expert.professionalDetails?.company || expert.company || "Declared Employer";
  const jobTitle = agr.jobTitle || expert.professionalDetails?.title || expert.title || "Expert Consultant";
  const signedDate = agr.signedAt
    ? new Date(agr.signedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : (expert.createdAt ? new Date(expert.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
  const docRef = (expert._id ? expert._id.toString().slice(-8) : Date.now().toString().slice(-8)).toUpperCase();

  // Helper for word wrapping
  const wrapText = (text, font, size, maxWidth) => {
    const words = String(text || "").split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
      const test = currentLine ? currentLine + " " + word : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) {
        currentLine = test;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  let y = pageHeight - 44;

  // 1. Header
  // Brand Logo / Title
  page.drawText("Mockeefy", {
    x: margin,
    y: y - 18,
    size: 22,
    font: fontBold,
    color: rgb(0 / 255, 79 / 255, 203 / 255)
  });
  page.drawText("PROFESSIONAL INTERVIEW TRAINING PLATFORM", {
    x: margin,
    y: y - 30,
    size: 7.5,
    font: fontBold,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });

  // Header Right details
  const titleText = "EXPERT SERVICE & COMPLIANCE AGREEMENT";
  const titleWidth = fontBold.widthOfTextAtSize(titleText, 10);
  page.drawText(titleText, {
    x: pageWidth - margin - titleWidth,
    y: y - 10,
    size: 10,
    font: fontBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255)
  });

  const refText = `Doc Ref: MCK-AGR-${docRef}`;
  const refWidth = fontReg.widthOfTextAtSize(refText, 8);
  page.drawText(refText, {
    x: pageWidth - margin - refWidth,
    y: y - 22,
    size: 8,
    font: fontReg,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });

  const dateText = `Date: ${signedDate}`;
  const dateWidth = fontReg.widthOfTextAtSize(dateText, 8);
  page.drawText(dateText, {
    x: pageWidth - margin - dateWidth,
    y: y - 33,
    size: 8,
    font: fontReg,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });

  y -= 44;

  // Blue rule
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 2,
    color: rgb(0 / 255, 79 / 255, 203 / 255)
  });

  y -= 14;

  // 2. Contracting Parties Box
  const boxHeight = 52;
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: contentWidth,
    height: boxHeight,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: rgb(226 / 255, 232 / 255, 240 / 255),
    borderWidth: 1
  });

  page.drawText("CONTRACTING PARTIES", {
    x: margin + 12,
    y: y - 14,
    size: 8.5,
    font: fontBold,
    color: rgb(0 / 255, 79 / 255, 203 / 255)
  });

  // Parties left
  page.drawText("Platform Operator: Mockeefy Technologies Inc.", {
    x: margin + 12,
    y: y - 27,
    size: 8.5,
    font: fontBold,
    color: rgb(30 / 255, 41 / 255, 59 / 255)
  });
  page.drawText("Role: Skill Assessment & Interview Training Platform", {
    x: margin + 12,
    y: y - 39,
    size: 8,
    font: fontReg,
    color: rgb(71 / 255, 85 / 255, 105 / 255)
  });

  // Parties right
  const expLabel = `Expert Name: ${expertName}`;
  const expWidth = fontBold.widthOfTextAtSize(expLabel, 8.5);
  page.drawText(expLabel, {
    x: pageWidth - margin - 12 - expWidth,
    y: y - 20,
    size: 8.5,
    font: fontBold,
    color: rgb(30 / 255, 41 / 255, 59 / 255)
  });

  const empLabel = `Current Employer: ${companyName}`;
  const empWidth = fontReg.widthOfTextAtSize(empLabel, 8);
  page.drawText(empLabel, {
    x: pageWidth - margin - 12 - empWidth,
    y: y - 32,
    size: 8,
    font: fontReg,
    color: rgb(71 / 255, 85 / 255, 105 / 255)
  });

  const desLabel = `Designation: ${jobTitle}`;
  const desWidth = fontReg.widthOfTextAtSize(desLabel, 8);
  page.drawText(desLabel, {
    x: pageWidth - margin - 12 - desWidth,
    y: y - 44,
    size: 8,
    font: fontReg,
    color: rgb(71 / 255, 85 / 255, 105 / 255)
  });

  y -= (boxHeight + 14);

  // 3. Legal Clauses
  const clauses = [
    {
      title: "1. Employer Non-Conflict & Moonlighting Warranty",
      text: `The Expert explicitly declares, covenants, and warrants that their enrollment and delivery of advisory, mentoring, and mock interview services on the Mockeefy platform are performed strictly in an individual personal capacity during personal off-hours, and do NOT breach or conflict with any employment contract, company policy, non-compete covenant, or moonlighting restrictions enforced by their current employer (${companyName}).`
    },
    {
      title: "2. Undertaking to Submit Proof of Employment",
      text: "The Expert hereby undertakes, covenants, and agrees to furnish authentic, verifiable proof of current or past employment (such as official employee photo ID card, offer letter, work email verification, or relevant professional documentation) whenever requested by Mockeefy's compliance, security, or audit team. The Expert agrees that falsifying employment affiliations constitutes grounds for immediate termination and permanent forfeiture of platform privileges."
    },
    {
      title: "3. Confidentiality & Non-Disclosure of Proprietary Company Assets",
      text: "The Expert guarantees that under no circumstances will they share, reproduce, disclose, or utilize confidential intellectual property, proprietary code, live client questions, trade secrets, or internal non-public information belonging to their primary employer. All mock interview guidance shall strictly be restricted to industry-standard educational frameworks."
    },
    {
      title: "4. Professional Code of Conduct & Candidate Welfare",
      text: "The Expert agrees to maintain exemplary punctuality, respectful communication, unbiased feedback, and high pedagogical standards. Under no circumstances may an Expert solicit candidates for external private commercial arrangements or off-platform interactions."
    },
    {
      title: "5. Independent Contractor Relationship & Compensation",
      text: "The Expert serves strictly as an independent contractor and not as an employee, partner, or agent of Mockeefy. Payouts are remitted in accordance with Mockeefy's pricing and payout schedules, subject to applicable platform fee deductions and statutory tax withholding."
    },
    {
      title: "6. Legal Validity of Digital Execution",
      text: "This agreement has been electronically acknowledged and executed by the Expert through an authorized signature attachment, carrying full legal enforceability under applicable digital commerce and electronic record legislation."
    }
  ];

  for (const clause of clauses) {
    page.drawText(clause.title, {
      x: margin,
      y,
      size: 9.5,
      font: fontBold,
      color: rgb(15 / 255, 23 / 255, 42 / 255)
    });
    y -= 13;

    const wrappedLines = wrapText(clause.text, fontReg, 8.5, contentWidth - 4);
    for (const line of wrappedLines) {
      page.drawText(line, {
        x: margin,
        y,
        size: 8.5,
        font: fontReg,
        color: rgb(51 / 255, 65 / 255, 85 / 255)
      });
      y -= 11.5;
    }
    y -= 5;
  }

  // 4. Footer & Digital Signature
  const footerY = 125;
  page.drawLine({
    start: { x: margin, y: footerY },
    end: { x: pageWidth - margin, y: footerY },
    thickness: 1.5,
    color: rgb(226 / 255, 232 / 255, 240 / 255)
  });

  // Left side: Signature
  page.drawText("EXPERT DIGITAL SIGNATURE", {
    x: margin,
    y: footerY - 14,
    size: 8.5,
    font: fontBold,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });

  // Embed signature image if available
  let sigEmbedded = false;
  const sigUrl = agr.signatureFile?.url || (typeof agr.signatureFile === "string" ? agr.signatureFile : "");
  if (sigUrl) {
    try {
      const sigBuf = await fetchResumeBuffer(sigUrl);
      if (sigBuf && sigBuf.length > 0) {
        const isJpg = sigBuf[0] === 0xff && sigBuf[1] === 0xd8 && sigBuf[2] === 0xff;
        const isPng = sigBuf[0] === 0x89 && sigBuf[1] === 0x50 && sigBuf[2] === 0x4e && sigBuf[3] === 0x47;
        let img = null;
        if (isPng) {
          img = await pdfDoc.embedPng(sigBuf);
        } else if (isJpg) {
          img = await pdfDoc.embedJpg(sigBuf);
        } else {
          try { img = await pdfDoc.embedPng(sigBuf); } catch { img = await pdfDoc.embedJpg(sigBuf); }
        }

        if (img) {
          const maxW = 140;
          const maxH = 40;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          page.drawImage(img, {
            x: margin,
            y: footerY - 56,
            width: img.width * scale,
            height: img.height * scale
          });
          sigEmbedded = true;
        }
      }
    } catch (e) {
      console.warn("Signature embedding error:", e.message);
    }
  }

  if (!sigEmbedded) {
    page.drawText(expertName, {
      x: margin,
      y: footerY - 45,
      size: 14,
      font: fontBold,
      color: rgb(0 / 255, 47 / 255, 135 / 255)
    });
  }

  page.drawLine({
    start: { x: margin, y: footerY - 60 },
    end: { x: margin + 180, y: footerY - 60 },
    thickness: 1,
    color: rgb(203 / 255, 213 / 255, 225 / 255)
  });

  page.drawText(expertName, {
    x: margin,
    y: footerY - 72,
    size: 9.5,
    font: fontBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255)
  });
  page.drawText(`Designation: ${jobTitle}`, {
    x: margin,
    y: footerY - 83,
    size: 8,
    font: fontReg,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });
  page.drawText(`Date: ${signedDate}`, {
    x: margin,
    y: footerY - 94,
    size: 8,
    font: fontReg,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });

  // Right side: Official Seal
  const sealRightX = pageWidth - margin;
  const sealTitle = "AUTHORIZED PLATFORM SEAL";
  const sealTitleW = fontBold.widthOfTextAtSize(sealTitle, 8.5);
  page.drawText(sealTitle, {
    x: sealRightX - sealTitleW,
    y: footerY - 14,
    size: 8.5,
    font: fontBold,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });

  // Draw circular seal
  const circleRadius = 20;
  const circleCenterX = sealRightX - 35;
  const circleCenterY = footerY - 42;
  page.drawCircle({
    x: circleCenterX,
    y: circleCenterY,
    size: circleRadius,
    borderColor: rgb(0 / 255, 79 / 255, 203 / 255),
    borderWidth: 2,
    color: rgb(240 / 255, 247 / 255, 255 / 255)
  });

  const mckW = fontBold.widthOfTextAtSize("MOCKEEFY", 6.5);
  page.drawText("MOCKEEFY", {
    x: circleCenterX - mckW / 2,
    y: circleCenterY + 2,
    size: 6.5,
    font: fontBold,
    color: rgb(0 / 255, 79 / 255, 203 / 255)
  });
  const verW = fontBold.widthOfTextAtSize("VERIFIED", 6.5);
  page.drawText("VERIFIED", {
    x: circleCenterX - verW / 2,
    y: circleCenterY - 7,
    size: 6.5,
    font: fontBold,
    color: rgb(0 / 255, 79 / 255, 203 / 255)
  });

  const teamText = "Mockeefy Compliance Team";
  const teamW = fontBold.widthOfTextAtSize(teamText, 9.5);
  page.drawText(teamText, {
    x: sealRightX - teamW,
    y: footerY - 72,
    size: 9.5,
    font: fontBold,
    color: rgb(15 / 255, 23 / 255, 42 / 255)
  });

  const execText = "Verified Digital Execution";
  const execW = fontReg.widthOfTextAtSize(execText, 8);
  page.drawText(execText, {
    x: sealRightX - execW,
    y: footerY - 83,
    size: 8,
    font: fontReg,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });

  const valText = "Valid Worldwide";
  const valW = fontReg.widthOfTextAtSize(valText, 8);
  page.drawText(valText, {
    x: sealRightX - valW,
    y: footerY - 94,
    size: 8,
    font: fontReg,
    color: rgb(100 / 255, 116 / 255, 139 / 255)
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/* -------------------- Get Company Document (PDF Streaming & Download) -------------------- */
export const getCompanyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const mode = (req.query.mode || "view").toLowerCase();
    const docType = (req.query.type || "company").toLowerCase();

    let expert = null;
    if (isValidObjectId(id)) {
      expert = await ExpertDetails.findById(id).populate("userId");
      if (!expert) {
        expert = await ExpertDetails.findOne({ userId: id }).populate("userId");
      }
    }

    if (!expert) {
      return res.status(404).send("Expert not found");
    }

    const v = expert.verification || {};
    let rawUrl = "";
    let customName = "";

    const expertName = (expert.personalInformation?.userName || expert.userId?.name || "Expert").replace(/[^a-zA-Z0-9_-]/g, "_");
    let buffer = null;

    if (docType === "agreement") {
      try {
        buffer = await generateCenteredAgreementPdf(expert);
        customName = expertName + "_Agreement";

        // Also update local file cache on disk if expert has agreementPdf url
        if (expert.agreement?.agreementPdf?.url && typeof expert.agreement.agreementPdf.url === "string") {
          const localRel = expert.agreement.agreementPdf.url.replace(/^\//, "");
          const localPath = path.join(process.cwd(), localRel);
          if (fs.existsSync(localPath)) {
            try { fs.writeFileSync(localPath, buffer); } catch (_) {}
          }
        }
      } catch (agrErr) {
        console.error("Error generating centered agreement PDF:", agrErr);
        const agr = expert.agreement || {};
        rawUrl = agr.agreementPdf?.url || (typeof agr.agreementPdf === "string" ? agr.agreementPdf : "") ||
                 agr.signatureFile?.url || (typeof agr.signatureFile === "string" ? agr.signatureFile : "");
        customName = agr.agreementPdf?.name || agr.signatureFile?.name || "Expert_Agreement";
      }
    } else if (docType === "aadhar") {
      rawUrl = v.aadhar?.url || (typeof v.aadhar === "string" ? v.aadhar : "") || v.aadharFile || "";
      customName = v.aadhar?.name || (expertName + "_Aadhaar_Document");
      
      // If no file scan uploaded but Aadhaar was verified via OTP / Sandbox / e-KYC
      if (!rawUrl && (v.aadhar?.isVerified || v.aadhar?.number)) {
        try {
          const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
          const pdfDoc = await PDFDocument.create();
          const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const page = pdfDoc.addPage([595.28, 420.95]); // Half A4 certificate format
          
          const pageWidth = 595.28;
          const pageHeight = 420.95;
          const m = 36;
          
          // Border Card
          page.drawRectangle({
            x: 20,
            y: 20,
            width: pageWidth - 40,
            height: pageHeight - 40,
            borderColor: rgb(0, 79/255, 203/255),
            borderWidth: 2,
            color: rgb(255/255, 255/255, 255/255)
          });
          
          page.drawText("Mockeefy Technologies Inc.", {
            x: m,
            y: pageHeight - 55,
            size: 16,
            font: fontBold,
            color: rgb(0, 79/255, 203/255)
          });
          page.drawText("OFFICIAL AADHAAR e-KYC VERIFICATION RECORD", {
            x: m,
            y: pageHeight - 75,
            size: 11,
            font: fontBold,
            color: rgb(15/255, 23/255, 42/255)
          });
          
          page.drawLine({
            start: { x: m, y: pageHeight - 88 },
            end: { x: pageWidth - m, y: pageHeight - 88 },
            thickness: 1,
            color: rgb(226/255, 232/255, 240/255)
          });
          
          let cy = pageHeight - 120;
          const drawField = (label, val, isSuccess = false) => {
            page.drawText(label, { x: m, y: cy, size: 10, font: fontBold, color: rgb(71/255, 85/255, 105/255) });
            page.drawText(String(val || "N/A"), {
              x: m + 175,
              y: cy,
              size: 10,
              font: fontBold,
              color: isSuccess ? rgb(16/255, 149/255, 78/255) : rgb(15/255, 23/255, 42/255)
            });
            cy -= 26;
          };
          
          drawField("Expert Name:", expert.personalInformation?.userName || expert.userId?.name || "Expert");
          drawField("Aadhaar Number:", v.aadhar.rawNumber ? v.aadhar.rawNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3") : (v.aadhar.number || "Not Provided"));
          drawField("Name on Aadhaar:", v.aadhar.nameOnAadhaar || expert.personalInformation?.userName || "Verified Candidate");
          drawField("Verification Status:", v.aadhar.isVerified ? "VERIFIED (Digital e-KYC / OTP Authenticated)" : "SUBMITTED", true);
          drawField("Name Match Score:", `${v.aadhar.nameMatchScore ?? 100}% (${v.aadhar.nameMatchStatus || "MATCH"})`);
          if (v.aadhar.referenceId) drawField("Verification Ref ID:", v.aadhar.referenceId);
          if (v.aadhar.verifiedAt) drawField("Verification Timestamp:", new Date(v.aadhar.verifiedAt).toLocaleString('en-US'));
          
          page.drawText("This is an electronically validated Aadhaar KYC credential securely stored on Mockeefy.", {
            x: m,
            y: 40,
            size: 8,
            font: fontReg,
            color: rgb(148/255, 163/255, 184/255)
          });
          
          const pdfBytes = await pdfDoc.save();
          buffer = Buffer.from(pdfBytes);
          rawUrl = "dynamic_aadhaar_certificate";
        } catch (e) {
          console.error("Dynamic aadhaar certificate error:", e);
        }
      }
    } else {
      rawUrl = v.companyId?.url || (typeof v.companyId === "string" ? v.companyId : "") || v.companyIdFile || "";
      customName = v.companyId?.name || "Company_Letter";
    }

    if (!rawUrl && !buffer) {
      return res.status(404).send("No document found for this expert");
    }

    let cleanName = customName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!cleanName || cleanName === "Company_Letter" || cleanName === "View_File" || cleanName === "Aadhaar_Document") {
      cleanName = expertName + "_" + (docType === "agreement" ? "Agreement" : docType === "aadhar" ? "Aadhaar" : "Company_Letter");
    }
    const fileName = cleanName + ".pdf";

    if (!buffer && rawUrl) {
      const { fetchResumeBuffer } = await import("../services/resumeService.js");
      buffer = await fetchResumeBuffer(rawUrl);
    }

    if (!buffer || buffer.length === 0) {
      return res.redirect(rawUrl);
    }

    // Check if buffer is already a valid PDF (starts with %PDF)
    const isPdf = buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "%PDF";

    if (!isPdf) {
      // Image (JPG, PNG, WebP) - convert dynamically into a genuine PDF
      try {
        const { PDFDocument } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.create();

        const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

        let embeddedImg = null;
        if (isJpg) {
          embeddedImg = await pdfDoc.embedJpg(buffer);
        } else if (isPng) {
          embeddedImg = await pdfDoc.embedPng(buffer);
        } else {
          try {
            embeddedImg = await pdfDoc.embedJpg(buffer);
          } catch {
            embeddedImg = await pdfDoc.embedPng(buffer);
          }
        }

        if (embeddedImg) {
          // Standard A4 dimensions in PDF points (72 DPI): 595.28 x 841.89
          const pageWidth = 595.28;
          const pageHeight = 841.89;
          const margin = 20;
          const fitWidth = pageWidth - margin * 2;
          const fitHeight = pageHeight - margin * 2;

          const scaleFactor = Math.min(fitWidth / embeddedImg.width, fitHeight / embeddedImg.height, 1);
          const drawWidth = embeddedImg.width * scaleFactor;
          const drawHeight = embeddedImg.height * scaleFactor;
          const x = margin + (fitWidth - drawWidth) / 2;
          const y = pageHeight - margin - drawHeight;

          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          page.drawImage(embeddedImg, { x, y, width: drawWidth, height: drawHeight });

          const pdfBytes = await pdfDoc.save();
          buffer = Buffer.from(pdfBytes);
        }
      } catch (convErr) {
        console.error("PDF conversion error for image:", convErr.message);
      }
    }

    // Strip Helmet restrictive CSP & framing headers so Chrome/Edge PDF viewer can render inline
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("X-Download-Options");

    const disposition = mode === "download" ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", disposition + '; filename="' + fileName + '"; filename*=UTF-8\'\'' + encodeURIComponent(fileName));
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");

    return res.end(buffer);
  } catch (err) {
    console.error("getCompanyDocument error:", err);
    return res.status(500).send("Error loading document: " + err.message);
  }
};
