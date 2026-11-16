import express from 'express';
import { getWalletBalance, getWalletTransactions, requestCashRefund } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWalletBalance);
router.get('/balance', protect, getWalletBalance);
router.get('/transactions', protect, getWalletTransactions);
router.post('/cash-refund', protect, requestCashRefund);

export default router;
