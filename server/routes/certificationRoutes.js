import express from 'express';
import * as certificationController from '../controllers/certificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/status/:userId', protect, certificationController.getCertificationStatus);
router.get('/verification-status', protect, certificationController.getVerificationStatus);
router.post('/confirm-identity', protect, certificationController.confirmIdentity);
router.post('/issue', protect, certificationController.issueCertificate);
router.get('/master/:userId', protect, certificationController.getMasterCertificate);

export default router;
