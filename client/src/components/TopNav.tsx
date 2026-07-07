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
  ChevronDown
} from "lucide-react";
import { io } from "socket.io-client";

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

  useEffect(() => {
    if (!user || !token) return;

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      auth: { token },
    });

    socket.on("new_notification", (notification) => {
      // Unify 'id' and 'read' field names matching frontend expectations
      const formatted = { ...notification, id: notification._id, read: false };
      setNotifications((prev) => [formatted, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

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
          
          {isNotificationsOpen && (
             <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-900 text-sm tracking-tight">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">Mark all read</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="p-4 text-center text-sm text-slate-400">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-400">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                         <div key={n.id} onClick={() => markAsRead(n.id)} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors">
                            <p className="font-black text-slate-800 text-[11px] tracking-tight">{n.title}</p>
                            <p className="text-slate-500 text-[10px] mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
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

          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
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
                <button onClick={() => { handleSignOut(); closeAllDropdowns(); }} className="flex w-full items-center px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-medium transition-all">
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
