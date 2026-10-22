import express from 'express';
import { getDashboardStats, getAdminExpertAgreements } from '../controllers/adminController.js';
import { getActiveExperts } from '../controllers/expertController.js';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/agreements', getAdminExpertAgreements);

// Expert Management Routes
router.get('/experts/active', getActiveExperts);

export default router;
