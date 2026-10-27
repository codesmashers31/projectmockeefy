
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../controllers/authController.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret';

// Re-export authenticateToken as protect for consistency with other routes
export const protect = authenticateToken;

// Middleware to optionally verify JWT token but not fail if none is provided
export const optionalProtect = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return next();
        }
        req.user = user;
        next();
    });
};

// Role authorization middleware
export const authorize = (...roles) => {
    return async (req, res, next) => {
        // If authenticateToken / protect hasn't run yet, auto-authenticate from header or cookie
        if (!req.user) {
            const authHeader = req.headers['authorization'];
            let token = authHeader && authHeader.split(' ')[1];
            if (!token && req.cookies) {
                token = req.cookies.jwt;
            }

            if (!token) {
                return res.status(401).json({ message: "Not authorized, no token provided" });
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                req.user = decoded;
            } catch (err) {
                return res.status(401).json({ message: "Invalid or expired token" });
            }
        }

        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, no user found" });
        }

        const userRole = (req.user.userType || req.user.role || '').toLowerCase();
        const allowedRoles = roles.map(r => r.toLowerCase());

        if (allowedRoles.includes(userRole)) {
            return next();
        }

        // Check database if user was assigned/promoted to admin but token is older
        const userId = req.user.userId || req.user.id || req.user._id;
        if (userId) {
            try {
                const User = (await import('../models/User.js')).default;
                const dbUser = await User.findById(userId);
                if (dbUser && dbUser.userType && allowedRoles.includes(dbUser.userType.toLowerCase())) {
                    req.user.userType = dbUser.userType;
                    return next();
                }
            } catch (dbErr) {
                console.error("DB authorization check error:", dbErr);
            }
        }

        return res.status(403).json({ message: `User role ${req.user.userType || req.user.role} is not authorized to access this route` });
    };
};

export const admin = authorize('admin');

