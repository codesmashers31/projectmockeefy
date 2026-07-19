import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from '../lib/axios';
import { Button } from "../components/ui/button";
import { Bell, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    metadata?: {
        link?: string;
    };
}

const Notifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useState(() => {
        window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: true } }));
    });

    useEffect(() => {
        window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: loading } }));
    }, [loading]);

    const fetchNotifications = async () => {
        try {
            // Fetch ALL notifications (no unreadOnly filter)
            const { data } = await axios.get('/api/notifications');
            setNotifications(data.notifications);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        } else {
            setLoading(false);
        }
    }, [user]);

    const markAsRead = async (id: string, link?: string) => {
        try {
            await axios.put('/api/notifications/read', { notificationIds: [id] });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));

            if (link) {
                // Navigate or window location
                // window.location.href = link; 
            }
        } catch (error) {
            console.error("Failed to mark read", error);
            toast.error("Failed to update notification");
        }
    };

    const markAllRead = async () => {
        try {
            await axios.put('/api/notifications/read', { notificationIds: 'all' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success("All notifications marked as read");
        } catch (error) {
            console.error("Failed to mark all read", error);
            toast.error("Failed to mark all read");
        }
    };

    return (
        <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-[28px] p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden pb-12 font-sans text-left">
            {/* Decorative gradient glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />

            <div className="w-full relative z-10 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none flex items-center gap-2">
                            <Bell className="w-5 h-5 text-blue-600 animate-bounce" />
                            Notifications
                        </h1>
                        <p className="text-xs font-semibold text-gray-500 mt-1">Stay updated with your sessions and activity</p>
                    </div>

                    {notifications.some(n => !n.isRead) && (
                        <Button
                            variant="outline"
                            onClick={markAllRead}
                            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm py-1.5 h-auto text-xs font-extrabold"
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-slate-50/50 rounded-2xl border border-slate-100/60 shimmer-shining"></div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/30 border border-slate-200/50 rounded-2xl">
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-black text-gray-900">No notifications yet</h3>
                        <p className="text-xs font-semibold text-gray-500 mt-1">When you get notifications, they'll show up here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <div
                                key={notification._id}
                                onClick={() => !notification.isRead && markAsRead(notification._id, notification.metadata?.link)}
                                className={`
                                    relative group p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer
                                    ${notification.isRead
                                        ? 'bg-white border-slate-100/80 hover:bg-slate-50/30'
                                        : 'bg-white border-blue-100/80 shadow-sm hover:shadow-md border-l-4 border-l-blue-500'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`
                                        w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                                        ${notification.isRead ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-600'}
                                    `}>
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <p className={`text-sm font-black ${notification.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                                                {notification.title}
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 flex-shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {new Date(notification.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">
                                            {notification.message}
                                        </p>
                                        {notification.metadata?.link && (
                                            <div className="mt-2">
                                                <span className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                                    View Details &rarr;
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
