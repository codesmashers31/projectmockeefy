import express from 'express';
import {
    addPayoutMethod,
    getPayoutMethods,
    initiatePayout,
    getAdminPayoutRequests,
    resolvePayoutRequest,
    getUserEarningsSummary,
    setDefaultPayoutMethod,
    getPayoutHistory
} from '../controllers/payoutController.js';

const router = express.Router();

// Payout Method Routes
router.post('/method', addPayoutMethod);
router.get('/methods/:userId', getPayoutMethods);
router.put('/method/:methodId/default', setDefaultPayoutMethod);

// Payout Request Routes
router.post('/request', initiatePayout);
router.get('/summary/:userId', getUserEarningsSummary);
router.get('/history/:userId', getPayoutHistory);

// Admin Payout Management Routes
router.get('/admin/requests', getAdminPayoutRequests);
router.put('/admin/request/:id', resolvePayoutRequest);

export default router;
