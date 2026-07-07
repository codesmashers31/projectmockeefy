
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
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, no user found" });
        }
        if (!roles.includes(req.user.userType)) {
            return res.status(403).json({ message: `User role ${req.user.userType} is not authorized to access this route` });
        }
        next();
    };
};

export const admin = authorize('admin');
