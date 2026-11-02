import express from "express";
import { authenticateToken } from "../controllers/authController.js";
import { getNotifications, markAsRead } from "../controllers/notificationController.js";

const router = express.Router();

router.use(authenticateToken); // Protect all routes

router.get('/', getNotifications);
router.put('/read', markAsRead);
router.post('/read', markAsRead);
router.post('/mark-all-read', markAsRead);
router.put('/mark-all-read', markAsRead);
router.post('/:id/read', markAsRead);
router.put('/:id/read', markAsRead);

export default router;
