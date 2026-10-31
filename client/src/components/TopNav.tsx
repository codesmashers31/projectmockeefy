// src/components/TopNav.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from '../lib/axios';
import { useAuth } from "../context/AuthContext";
import { getProfileImageUrl } from "../lib/imageUtils";
import {
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  CreditCard,
  Calendar,
  Search,
  HelpCircle,
  ChevronDown,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  X
} from "lucide-react";
import { useSocketEvent, useDataSync } from "../context/SocketContext";

interface Notification {
  id: string;
  _id?: string;
  title: string;
  message: string;
  time: string;
  read?: boolean;
  isRead?: boolean;
  type: "info" | "success" | "warning" | "error";
}

export default function TopNav({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => n.read === false || n.isRead === false).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const res = await axios.get(`/api/notifications`);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchNotifications();
    else setNotifications([]);
  }, [user, fetchNotifications]);

  // Real-time notification arrival
  useSocketEvent("new_notification", (notification: any) => {
    const formatted = { ...notification, id: notification._id, read: false };
    setNotifications((prev) => [formatted, ...prev]);
  });

  // Real-time synchronization when notifications are marked read in another session
  useDataSync("NOTIFICATION_SYNC", (payload) => {
    const ids = payload.data?.notificationIds;
    if (ids === "all") {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
    } else if (Array.isArray(ids)) {
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id || n._id) ? { ...n, read: true, isRead: true } : n))
      );
    }
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await axios.post(`/api/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark notification read", err);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await axios.post(`/api/notifications/mark-all-read`);
    } catch (err) {
      console.error("Failed to mark all read", err);
      fetchNotifications();
    }
  };

  const handleSignOut = () => {
    closeAllDropdowns();
    logout();
    navigate("/signin", { replace: true });
  };

  const closeAllDropdowns = () => {
    setIsNotificationsOpen(false);
    setIsProfileOpen(false);
  };

  const avatarSrc = getProfileImageUrl(user?.profileImage || (user as any)?.photoUrl);

  return (
    <header className="h-[68px] w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/70 px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_2px_18px_-8px_rgba(0,0,0,0.10)]">
      <div className="flex items-center gap-4">
        <button onClick={onOpenSidebar} className="xl:hidden p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all active:scale-95">
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center space-x-2.5">
        {/* Notifications */}
        <div className="relative flex items-center" ref={notificationsRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen((s) => !s);
              setIsProfileOpen(false);
              if (!isNotificationsOpen && user) fetchNotifications();
            }}
            className="p-2.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all active:scale-95 relative flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
               <span className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] rounded-full h-3.5 w-3.5 flex items-center justify-center font-black border-2 border-white">
                 {unreadCount}
               </span>
            )}
          </button>
          
          {/* Backdrop for mobile */}
          {isNotificationsOpen && (
            <div
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-150"
              onClick={() => setIsNotificationsOpen(false)}
              aria-hidden="true"
            />
          )}

          {isNotificationsOpen && (
             <div className="fixed inset-x-3 sm:inset-x-auto top-[72px] sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-[360px] max-w-sm mx-auto sm:max-w-none bg-white border border-slate-200 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2FF] text-[#0755E8]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[11px] text-[#0755E8] hover:text-[#0645C7] font-semibold cursor-pointer hover:underline flex items-center gap-1">
                        <CheckCheck size={13} />
                        <span>Mark all read</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="sm:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <div className="max-h-[min(65vh,380px)] overflow-y-auto divide-y divide-slate-100 overscroll-contain">
                    {loadingNotifications ? (
                      <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-300">
                          <Bell size={18} />
                        </div>
                        <p className="text-slate-700 text-xs font-semibold">All caught up!</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                         <div key={n.id} onClick={() => markAsRead(n.id)} className={`px-4 py-3 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-start gap-3 relative ${!n.read ? "bg-[#F5F8FF]/80" : ""}`}>
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 mt-0.5 text-[#0755E8]">
                               <Bell size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className={`text-xs truncate ${!n.read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{n.title}</p>
                               <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                            </div>
                            {!n.read && (
                               <span className="w-2 h-2 rounded-full bg-[#0755E8] shrink-0 mt-2 self-start ring-4 ring-[#0755E8]/10" />
                            )}
                         </div>
                      ))
                    )}
                </div>
             </div>
          )}
        </div>

        <button className="p-2.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all active:scale-95 relative flex items-center justify-center">
          <HelpCircle size={18} />
        </button>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 mx-2 self-center"></div>

        {/* Profile */}
        <div className="relative flex items-center" ref={profileRef}>
          <button
            onClick={() => {
              setIsProfileOpen((s) => !s);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center space-x-2.5 pl-2 pr-1.5 py-1.5 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 group"
          >
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-semibold text-slate-900 leading-none tracking-tight">
                {user?.name?.split(" ")[0] || "User"}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {user?.userType === 'expert' ? "Expert" : user?.userType === 'admin' ? "Admin" : "Member"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden ring-2 ring-transparent group-hover:ring-blue-100/50 transition-all flex items-center justify-center">
               {user?.profileImage || (user as any)?.photoUrl ? (
                  <img src={avatarSrc} alt="profile" className="w-full h-full object-cover" />
               ) : (
                  <User size={16} strokeWidth={2} className="text-slate-400" />
               )}
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isProfileOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Backdrop for profile menu on mobile */}
          {isProfileOpen && (
            <div
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-150"
              onClick={() => setIsProfileOpen(false)}
              aria-hidden="true"
            />
          )}

          {isProfileOpen && (
            <div className="fixed right-3 sm:absolute sm:right-0 top-[72px] sm:top-full mt-0 sm:mt-2 w-[calc(100vw-24px)] sm:w-64 max-w-[280px] bg-white border border-slate-200 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm flex justify-center items-center">
                    {user?.profileImage ? <img src={avatarSrc} className="w-full h-full object-cover" /> : <User size={18} className="text-slate-400" />}
                 </div>
                 <div className="overflow-hidden">
                   <p className="font-semibold text-slate-900 text-sm truncate tracking-tight">{user?.name}</p>
                   <p className="text-[10px] text-slate-400 truncate mt-0.5 tracking-tighter">{user?.email}</p>
                 </div>
              </div>
              
              <div className="p-1.5 space-y-0.5">
                {user?.userType === 'admin' ? (
                  <>
                    <Link to="/admin" onClick={closeAllDropdowns} className="flex items-center px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">
                      <Settings size={16} className="mr-3 text-slate-400" /> Admin Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/dashboard" onClick={closeAllDropdowns} className="flex items-center px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">
                      <Settings size={16} className="mr-3 text-slate-400" /> Expert Panel
                    </Link>
                    <Link to="/dashboard/profile" onClick={closeAllDropdowns} className="flex items-center px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">
                      <User size={16} className="mr-3 text-slate-400" /> Profile Settings
                    </Link>
                    <Link to="/dashboard/sessions" onClick={closeAllDropdowns} className="flex items-center px-3.5 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-sm font-medium transition-all">
                      <Calendar size={16} className="mr-3 text-slate-400" /> My Sessions
                    </Link>
                  </>
                )}
              </div>

              <div className="border-t border-slate-100 mt-1.5 px-1.5 py-1.5">
                <button onClick={handleSignOut} className="flex w-full items-center px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-medium transition-all">
                  <LogOut size={16} className="mr-3" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
