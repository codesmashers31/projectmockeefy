import express from 'express';
import { getAllUsers, toggleUserStatus } from '../controllers/userAdminController.js';
import { authenticateToken } from '../controllers/authController.js';
import User from '../models/User.js';

const router = express.Router();

// Strict Admin Authorization Middleware (Phase 5.2)
const requireAdmin = async (req, res, next) => {
    try {
        console.log("[requireAdmin Middleware] req.user:", req.user);
        if (!req.user || !req.user.userId) {
            console.log("[requireAdmin Middleware] Fail: No userId in req.user");
            return res.status(403).json({ message: 'Forbidden: Authentication credentials not found.' });
        }
        const dbUser = await User.findById(req.user.userId);
        console.log("[requireAdmin Middleware] dbUser found:", dbUser ? { _id: dbUser._id, email: dbUser.email, userType: dbUser.userType } : "null");
        if (dbUser && dbUser.userType && dbUser.userType.toLowerCase() === 'admin') {
            next();
        } else {
            console.log("[requireAdmin Middleware] Fail: User is not an admin");
            res.status(403).json({ message: 'Forbidden: Admin access required.' });
        }
    } catch (error) {
        console.error("requireAdmin error:", error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Protect all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/', getAllUsers);
router.put('/:id/status', toggleUserStatus);

export default router;
