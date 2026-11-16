import express from 'express';
import * as certificationController from '../controllers/certificationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/preview', protect, certificationController.getCertificatePreview);
router.get('/history', protect, certificationController.getCertificateHistory);
router.get('/status/:userId', protect, certificationController.getCertificationStatus);
router.get('/verification-status', protect, certificationController.getVerificationStatus);
router.post('/confirm-identity', protect, certificationController.confirmIdentity);
router.post('/issue', protect, certificationController.issueCertificate);
router.post('/admin/review-attendance', protect, admin, certificationController.adminReviewAttendance);
router.get('/master/:userId', protect, certificationController.getMasterCertificate);
router.get('/download/:certificateId', protect, certificationController.verifyDownloadEligibility);
router.get('/verify/:certificateId', certificationController.verifyCertificatePublic);

export default router;
