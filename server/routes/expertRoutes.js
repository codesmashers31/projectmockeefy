// routes/expertRoutes.js
import express from "express";
import {
  getExpertProfile,
  uploadProfilePhoto,
  getPersonalInfo,
  updatePersonalInfo,
  getEducation,
  updateEducation,
  deleteEducationEntry,
  getProfessional,
  updateProfessional,
  deletePreviousExperience,
  getSkillsAndExpertise,
  updateSkillsAndExpertise,
  getAvailability,
  updateAvailability,
  deleteBreakDate,
  deleteWeeklySlot,
  uploadVerificationDocs, getExpertProfileImage,
  getAllExperts,
  getVerifiedExperts,
  getPendingExperts,
  getExpertById,
  getPublicExpertById,
  getRejectedExperts,
  approveExpert,
  rejectExpert,
  resubmitProfile,
  requestVerification,
  getExpertStats,
  searchExperts,
  updateMySkills,
  updateExpertByAdmin,
  sendAadhaarOtpController,
  verifyAadhaarOtpController,
  resetAadhaarVerification,
  getExpertAgreement,
  saveExpertAgreement
} from "../controllers/expertController.js";

import { authenticateToken } from "../controllers/authController.js";
import { uploadProfile, uploadVerification } from "../middleware/upload.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes (Accessible for candidate browsing & search)
router.post('/search', searchExperts);
router.get("/all-experts", getAllExperts);
router.get("/verified", getVerifiedExperts);
router.get("/verified-experts", getVerifiedExperts); // Alias for compatibility
router.get("/public/profile/:id", getPublicExpertById); // Public Profile (PII stripped)

// Admin-Only Expert Verification & Status Management
router.get("/pending", protect, admin, getPendingExperts);
router.get("/rejected", protect, admin, getRejectedExperts);
router.put("/approve/:id", protect, admin, approveExpert);
router.put("/reject/:id", protect, admin, rejectExpert);
router.put("/admin/update/:id", protect, admin, updateExpertByAdmin); // Admin endpoint to edit expert details

// Protect all expert routes
router.use(authenticateToken);

// Profile
router.get("/profile", getExpertProfile);
router.get("/stats", getExpertStats);
router.get("/admin/profile/:id", protect, admin, getExpertById); // Restricted to Admin role only
router.post(
  "/profile/photo",
  uploadProfile.fields([
    { name: "photo", maxCount: 1 },
    { name: "originalPhoto", maxCount: 1 }
  ]),
  uploadProfilePhoto
);
router.get("/profile/image", getExpertProfileImage);

// The rest of your expert routes (implementations must exist in controller)
router.get("/personalinfo", getPersonalInfo);
router.put("/personalinfo", updatePersonalInfo);

router.get("/education", getEducation);
router.put("/education", updateEducation);
router.delete("/education/:idx", deleteEducationEntry);

router.get("/profession", getProfessional);
router.put("/profession", updateProfessional);
router.delete("/profession/previous/:idx", deletePreviousExperience);

router.get("/skills", getSkillsAndExpertise);
router.put("/skills", updateSkillsAndExpertise);
router.put('/myskills', updateMySkills); // Advanced mapping self-service

router.get("/availability", getAvailability);
router.put("/availability", updateAvailability);
router.delete("/availability/delbreak", deleteBreakDate);
router.delete("/availability/delslot", deleteWeeklySlot);
router.post("/resubmit", resubmitProfile);
router.post("/request-verification", requestVerification);

// Verification
router.post("/verification/aadhar/send-otp", sendAadhaarOtpController);
router.post("/verification/aadhar/verify-otp", verifyAadhaarOtpController);
router.post("/verification/aadhar/reset", resetAadhaarVerification);

router.put(
  "/verification",
  uploadVerification.fields([
    { name: "companyIdFile", maxCount: 1 },
    { name: "aadharFile", maxCount: 1 },
  ]),
  uploadVerificationDocs
);

// Agreement
router.get("/agreement", getExpertAgreement);
router.post(
  "/agreement",
  uploadVerification.fields([
    { name: "signatureFile", maxCount: 1 },
    { name: "agreementPdf", maxCount: 1 }
  ]),
  saveExpertAgreement
);

export default router;
