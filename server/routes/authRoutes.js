import express from "express";
// Verify OTP
import { sendOtp, verifyOtp, registerUser, loginUser, authenticateToken, getProfile, refresh, logoutUser, verifyGoogleToken, resetPassword, googleCallback } from "../controllers/authController.js";
import passport from "passport";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 99999, // relax limits in dev mode to prevent 429 errors
    message: "Too many authentication attempts, please try again after 15 minutes.",
});
const router = express.Router();

router.post('/send-otp', authLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/google-signup', authLimiter, verifyGoogleToken);
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/refresh', refresh);
router.post('/logout', logoutUser);
router.get('/profile', authenticateToken, getProfile);

// Google OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL + '/login' }),
    googleCallback
);


export default router;