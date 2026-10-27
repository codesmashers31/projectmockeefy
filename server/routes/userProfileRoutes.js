/**
 * User Profile Routes
 */

import express from "express";
import {
    getUserProfile,
    updatePersonalInfo,
    updateEducation,
    updateExperience,
    updateSkills,
    updatePreferences,
    saveProfileImage,
    updateCertifications,
    getResumeData,
    getUserResumes,
    createResume,
    updateResume,
    deleteResume,
    setDefaultResume,
    duplicateResume,
    getAISuggestions,
    uploadResumeFile,
    deleteProfileImage,
    getResumeFileById
} from "../controllers/userProfileController.js";
import { uploadUserProfile, uploadResume } from "../middleware/upload.js";
import { authenticateToken } from "../controllers/authController.js";

const router = express.Router();

// Public / Tab-friendly resume file streaming route (must precede strict token auth)
router.get("/resumes/:id/file", getResumeFileById);

// Protect all user routes (Phase 5.2)
router.use(authenticateToken);

// Get user profile
router.get("/profile", getUserProfile);

// Get Resume Data (New)
router.get("/profile/resume", getResumeData);

// Resume Management Routes
router.get("/resumes", getUserResumes);
router.post("/resumes", createResume);
router.post("/resumes/upload", uploadResume.single("resume"), uploadResumeFile);
router.put("/resumes/:id", updateResume);
router.delete("/resumes/:id", deleteResume);
router.patch("/resumes/:id/default", setDefaultResume);
router.post("/resumes/:id/duplicate", duplicateResume);
router.post("/resumes/ai-suggestions", getAISuggestions);

// Update personal info
router.put("/profile/personal", updatePersonalInfo);

// Update education
router.put("/profile/education", updateEducation);

// Update experience
router.put("/profile/experience", updateExperience);

// Update certifications
router.put("/profile/certifications", updateCertifications);

// Update skills
router.put("/profile/skills", updateSkills);

// Update preferences
router.put("/profile/preferences", updatePreferences);

// Upload & delete profile image
router.post(
  "/profile/image",
  uploadUserProfile.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "originalProfileImage", maxCount: 1 }
  ]),
  saveProfileImage
);
router.delete("/profile/image", deleteProfileImage);

export default router;
