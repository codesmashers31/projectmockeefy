import Notification from '../models/Notification.js';
import { emitToUser, syncDataChange } from '../services/socketService.js';

// Get all notifications for a user
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID not found" });
        }
        const { unreadOnly } = req.query;

        const query = { userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 for performance

        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
};

// Mark as read
export const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id || req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID not found" });
        }
        const { notificationIds } = req.body || {};

        let ids = notificationIds;
        if (req.params?.id) {
            ids = [req.params.id];
        } else if (req.path?.includes('mark-all-read') || req.originalUrl?.includes('mark-all-read')) {
            ids = 'all';
        } else if (typeof ids === 'string' && ids !== 'all') {
            ids = [ids];
        } else if (!ids && req.body?.notificationId) {
            ids = [req.body.notificationId];
        }

        // Build user query supporting both ObjectId and string representation
        const userQuery = {
            $or: [
                { userId: userId },
                { userId: userId.toString() }
            ]
        };

        if (ids === 'all') {
            await Notification.updateMany(
                { ...userQuery, isRead: false },
                { isRead: true }
            );
        } else if (Array.isArray(ids) && ids.length > 0) {
            await Notification.updateMany(
                { ...userQuery, _id: { $in: ids } },
                { isRead: true }
            );
        }

        emitToUser(userId, 'notification_read', { notificationIds: ids });
        syncDataChange({
            type: 'NOTIFICATION_SYNC',
            userId,
            data: { notificationIds: ids }
        });

        const unreadCount = await Notification.countDocuments({ ...userQuery, isRead: false });

        res.json({ success: true, unreadCount });
    } catch (error) {
        console.error("Mark Read Error:", error);
        res.status(500).json({ message: "Failed to update notifications" });
    }
};

// Helper to create notification (internal use)
export const createNotification = async ({ userId, type, title, message, metadata }) => {
    try {
        if (type === 'product_update' || type === 'marketing') {
            const ExpertDetails = (await import('../models/expertModel.js')).default;
            const expert = await ExpertDetails.findOne({ userId }).lean();
            if (expert && expert.settings?.marketingEmails === false) {
                console.log(`[Notification] 🔕 Expert ${userId} has disabled product updates. Suppressing notification.`);
                return null;
            }
        }

        const notification = new Notification({
            userId,
            type: type || 'system',
            title,
            message,
            metadata
        });
        await notification.save();
        
        // Emit real-time socket event
        emitToUser(userId, 'new_notification', notification);
        
        return notification;
    } catch (error) {
        console.error("Create Notification Error:", error);
        // Don't throw, just log. Notifications shouldn't break main flow.
    }
};
