import express from 'express';
import {
    addPayoutMethod,
    getPayoutMethods,
    initiatePayout,
    getAdminPayoutRequests,
    resolvePayoutRequest,
    getUserEarningsSummary,
    setDefaultPayoutMethod,
    getPayoutHistory,
    getPayoutConfig,
    updatePayoutConfig
} from '../controllers/payoutController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin Payout Management Routes (Strictly Admin Only)
router.get('/admin/requests', protect, admin, getAdminPayoutRequests);
router.put('/admin/request/:id', protect, admin, resolvePayoutRequest);
router.get('/admin/config', protect, admin, getPayoutConfig);
router.put('/admin/config', protect, admin, updatePayoutConfig);

// Expert Payout & Wallet Routes (Require Authentication)
router.use(protect);

router.get('/config', getPayoutConfig);
router.post('/method', addPayoutMethod);
router.get('/methods/:userId', getPayoutMethods);
router.put('/method/:methodId/default', setDefaultPayoutMethod);

// Payout Request Routes
router.post('/request', initiatePayout);
router.get('/summary/:userId', getUserEarningsSummary);
router.get('/history/:userId', getPayoutHistory);

export default router;
