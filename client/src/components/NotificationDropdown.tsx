import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import axios from '../lib/axios';

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

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const { data } = await axios.get('/api/notifications');
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const markAsRead = async () => {
        if (unreadCount === 0) return;
        try {
            await axios.put('/api/notifications/read', { notificationIds: 'all' });
            setUnreadCount(0);
            // Optimistically update local state
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark notifications as read', error);
        }
    };

    const handleToggle = () => {
        if (!isOpen) {
            setIsOpen(true);
            fetchNotifications(); // Refresh on open
            // Mark as read when opening? or maybe just when clicking specific items?
            // User requirement: "if i click it its read it like that" -> usually implies clicking the bell marks all or clicking item marks item.
            // Let's mark all as read when opening the dropdown for simplicity, or we can do it explicitly.
            // Let's keep it manual or auto on open. Common pattern: badge clears on open.
            markAsRead();
        } else {
            setIsOpen(false);
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Poll for notifications every 60 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 relative focus:outline-none"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-150"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {isOpen && (
                <div className="fixed inset-x-3 sm:inset-x-auto top-[68px] sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-80 max-w-sm mx-auto sm:max-w-none bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer hover:underline"
                                >
                                    <CheckCheck size={13} />
                                    <span>Mark all read</span>
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="sm:hidden p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/50 cursor-pointer"
                                aria-label="Close notifications"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm py-8">
                                No notifications
                            </div>
                        ) : (
                            <ul>
                                {notifications.map((notification) => (
                                    <li
                                        key={notification._id}
                                        className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="p-3">
                                            <p className="text-sm font-medium text-gray-900 mb-1">{notification.title}</p>
                                            <p className="text-xs text-gray-600 leading-snug mb-2">{notification.message}</p>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {notification.metadata?.link && (
                                                    <a
                                                        href={notification.metadata.link}
                                                        className="text-[10px] font-semibold text-blue-600 hover:underline"
                                                    >
                                                        View Details
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
