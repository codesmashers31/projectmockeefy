import express from 'express';
import { getWalletBalance, getWalletTransactions } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWalletBalance);
router.get('/transactions', protect, getWalletTransactions);

export default router;
