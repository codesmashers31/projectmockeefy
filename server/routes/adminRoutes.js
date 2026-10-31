import express from 'express';
import { 
  getDashboardStats, 
  getAdminExpertAgreements, 
  getAdminReports, 
  getAdminExpertCounts,
  realignExpertAgreementPdf 
} from '../controllers/adminController.js';
import { getActiveExperts } from '../controllers/expertController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadVerification } from '../middleware/upload.js';

const router = express.Router();

// Guard all admin routes with authentication and admin role
router.use(protect, admin);

router.get('/stats', getDashboardStats);
router.get('/agreements', getAdminExpertAgreements);
router.post(
  '/agreements/:expertId/realign-pdf',
  uploadVerification.fields([{ name: 'agreementPdf', maxCount: 1 }]),
  realignExpertAgreementPdf
);
router.get('/reports', getAdminReports);
router.get('/experts/counts', getAdminExpertCounts);

// Expert Management Routes
router.get('/experts/active', getActiveExperts);

export default router;
