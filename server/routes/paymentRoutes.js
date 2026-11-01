import express from 'express';
import { createOrder, verifyPayment, createFreeBooking, usePremiumCredit, createFreeSubscription } from '../controllers/paymentController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Order creation and verification support token authentication
router.post('/create-order', optionalProtect, createOrder);
router.post('/verify-payment', optionalProtect, verifyPayment);

// Sensitive free-credit and subscription endpoints require strict authentication
router.post('/create-free-booking', protect, createFreeBooking);
router.post('/use-premium-credit', protect, usePremiumCredit);
router.post('/create-free-subscription', protect, createFreeSubscription);

export default router;
