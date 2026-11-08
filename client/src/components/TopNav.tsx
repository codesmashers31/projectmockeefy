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
  X,
  Clock,
  Video,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  LifeBuoy
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpTab, setHelpTab] = useState<"all" | "interviews" | "availability" | "payouts" | "support">("all");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const res = await axios.get(`/api/notifications`);
      const raw = res.data.notifications || [];
      const formatted = raw.map((n: any) => ({
        ...n,
        id: n._id || n.id,
        isRead: Boolean(n.isRead ?? n.read),
        read: Boolean(n.isRead ?? n.read),
      }));
      setNotifications(formatted);
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
      if (helpRef.current && !helpRef.current.contains(target)) {
        setIsHelpOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
        setIsHelpOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id || n._id === id ? { ...n, read: true, isRead: true } : n))
      );
      await axios.put('/api/notifications/read', { notificationIds: [id] });
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
      await axios.put('/api/notifications/read', { notificationIds: 'all' });
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
    setIsHelpOpen(false);
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("support@mockeefy.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const avatarSrc = getProfileImageUrl(user?.profileImage || (user as any)?.photoUrl);

  return (
    <header className="h-16 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
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
              setIsHelpOpen(false);
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
             <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-[68px] sm:top-full sm:right-0 sm:-translate-x-3 sm:mt-2.5 w-auto sm:w-[360px] max-w-sm mx-auto sm:max-w-none bg-white border border-slate-200 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                      notifications.map(n => {
                         const isItemUnread = !n.isRead && !n.read;
                         const notifId = n.id || n._id || '';
                         return (
                           <div
                             key={notifId}
                             onClick={() => {
                               if (isItemUnread) markAsRead(notifId);
                             }}
                             className={`px-4 py-3 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-start gap-3 relative group ${isItemUnread ? "bg-[#F5F8FF]/80" : ""}`}
                           >
                              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 mt-0.5 text-[#0755E8]">
                                 <Bell size={15} />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className={`text-xs truncate ${isItemUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{n.title}</p>
                                 <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                              </div>
                              {isItemUnread && (
                                 <div className="flex items-center gap-1.5 shrink-0 mt-1 self-start">
                                   <button
                                     type="button"
                                     title="Mark as read"
                                     onClick={(e) => markAsRead(notifId, e)}
                                     className="p-1 rounded-full text-slate-400 hover:text-[#0755E8] hover:bg-blue-50 transition-colors cursor-pointer"
                                   >
                                     <CheckCheck size={13} />
                                   </button>
                                   <span className="w-2 h-2 rounded-full bg-[#0755E8] ring-4 ring-[#0755E8]/10" />
                                 </div>
                              )}
                           </div>
                         );
                      })
                    )}
                </div>
             </div>
          )}
        </div>

        {/* Help & Knowledge Guide */}
        <div className="relative flex items-center" ref={helpRef}>
          <button
            onClick={() => {
              setIsHelpOpen((s) => !s);
              setIsNotificationsOpen(false);
              setIsProfileOpen(false);
            }}
            className={`p-2.5 rounded-xl transition-all active:scale-95 relative flex items-center justify-center cursor-pointer ${
              isHelpOpen
                ? "bg-[#EAF2FF] text-[#0755E8] ring-2 ring-[#0755E8]/20 shadow-xs"
                : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
            }`}
            aria-label="Expert Help & Guidelines"
            title="Help & Platform Guidelines"
          >
            <HelpCircle size={18} />
          </button>

          {/* Backdrop for mobile */}
          {isHelpOpen && (
            <div
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-150"
              onClick={() => setIsHelpOpen(false)}
              aria-hidden="true"
            />
          )}

          {isHelpOpen && (
            <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-[68px] sm:top-full sm:-right-12 md:sm:right-0 sm:mt-2.5 w-auto sm:w-[480px] max-w-[calc(100vw-24px)] bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_50px_-10px_rgba(15,23,42,0.18)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0755E8] text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight">Expert Help & Knowledge</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2FF] text-[#0755E8] border border-blue-200/50">
                        Guide
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">Everything you need to know as a Mockeefy Expert</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close help"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: "all", label: "All Topics" },
                  { id: "interviews", label: "Interviews" },
                  { id: "availability", label: "Availability" },
                  { id: "payouts", label: "Payouts" },
                  { id: "support", label: "Support Desk" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setHelpTab(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      helpTab === tab.id
                        ? "bg-[#0755E8] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Content Body */}
              <div className="p-4 max-h-[min(65vh,480px)] overflow-y-auto space-y-3 text-slate-700 text-xs overscroll-contain">
                {/* 1. Mock Interviews Card */}
                {(helpTab === "all" || helpTab === "interviews") && (
                  <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100/80 hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-2 mb-2 text-[#0755E8] font-bold text-xs">
                      <div className="w-5 h-5 rounded-md bg-[#0755E8]/10 flex items-center justify-center">
                        <Video size={13} className="text-[#0755E8]" />
                      </div>
                      <span>Mock Interview Guidelines & Lifecycle</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600 pl-6 list-disc text-[11px] leading-relaxed marker:text-blue-500">
                      <li>
                        <strong className="text-slate-800">Join 2–3 mins early:</strong> Test your camera, microphone, and internet connection before the candidate arrives.
                      </li>
                      <li>
                        <strong className="text-slate-800">In-Meeting Tools:</strong> Candidate resume and collaborative live coding runner are directly available inside the room.
                      </li>
                      <li>
                        <strong className="text-slate-800">Submit Scorecard within 2 hrs:</strong> Fill out the detailed evaluation & scores promptly so candidate receives feedback and your payout is unlocked.
                      </li>
                    </ul>
                  </div>
                )}

                {/* 2. Availability & 11:30 PM Cutoff Card */}
                {(helpTab === "all" || helpTab === "availability") && (
                  <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-100/80 hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold text-xs">
                      <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center">
                        <Clock size={13} className="text-amber-700" />
                      </div>
                      <span>Availability & 11:30 PM Daily Cutoff</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600 pl-6 list-disc text-[11px] leading-relaxed marker:text-amber-500">
                      <li>
                        <strong className="text-slate-800">Slot Durations:</strong> Configure 30-min or 60-min sessions with automatic break buffers.
                      </li>
                      <li>
                        <strong className="text-slate-800">Strict 11:30 PM Cutoff:</strong> No interview slots may begin past 11:30 PM (or 11:00 PM for 60m slots) to adhere to platform hours.
                      </li>
                      <li>
                        <strong className="text-slate-800">Dynamic Slot Rollover:</strong> Active weekly slots automatically rollover daily without manual re-entry.
                      </li>
                    </ul>
                  </div>
                )}

                {/* 3. Weekly Wednesday Payout Policy Card */}
                {(helpTab === "all" || helpTab === "payouts") && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100/80 hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold text-xs">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
                        <CreditCard size={13} className="text-emerald-700" />
                      </div>
                      <span>Weekly Wednesday Payout Policy</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600 pl-6 list-disc text-[11px] leading-relaxed marker:text-emerald-500">
                      <li>
                        <strong className="text-slate-800">Wednesday 10:00 AM IST:</strong> Payout requests are verified, audited, and processed every week on Wednesday.
                      </li>
                      <li>
                        <strong className="text-slate-800">Submission Cutoff:</strong> To receive your payout in the current week, request your withdrawal before Wednesday 10:00 AM IST.
                      </li>
                      <li>
                        <strong className="text-slate-800">Minimum Balance:</strong> Withdrawals can only be initiated when available balance meets or exceeds the admin-set minimum.
                      </li>
                    </ul>
                  </div>
                )}

                {/* 4. Attendance & Rescheduling Card */}
                {(helpTab === "all" || helpTab === "interviews") && (
                  <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-100/80 hover:border-purple-200 transition-all">
                    <div className="flex items-center gap-2 mb-2 text-purple-700 font-bold text-xs">
                      <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center">
                        <ShieldCheck size={13} className="text-purple-700" />
                      </div>
                      <span>Attendance & Quality Standards</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600 pl-6 list-disc text-[11px] leading-relaxed marker:text-purple-500">
                      <li>
                        <strong className="text-slate-800">Zero No-Shows:</strong> Punctuality directly influences your mentor badge, ranking, and booking requests.
                      </li>
                      <li>
                        <strong className="text-slate-800">6-Hour Notice:</strong> Reschedule at least 6 hours in advance for emergencies so candidates can plan accordingly.
                      </li>
                      <li>
                        <strong className="text-slate-800">10-Min Candidate Window:</strong> Please wait at least 10 minutes in the call room if a candidate runs late.
                      </li>
                    </ul>
                  </div>
                )}

                {/* 5. Direct Help Desk & Support */}
                {(helpTab === "all" || helpTab === "support") && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                        <div className="w-5 h-5 rounded-md bg-blue-100 text-[#0755E8] flex items-center justify-center">
                          <LifeBuoy size={13} />
                        </div>
                        <span>Need Help or Live Assistance?</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active Support
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                      Encountered an ongoing session issue, technical glitch, dispute, or payout question? Our expert support team is here to assist.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1">
                        <Mail size={14} className="text-[#0755E8] shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate select-all">
                          support@mockeefy.com
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyEmail}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copiedEmail ? (
                            <>
                              <Check size={12} className="text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href="mailto:support@mockeefy.com?subject=Expert%20Assistance%20Request"
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#0755E8] hover:bg-[#0645C7] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>Email Desk</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Navigation Footer */}
              <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Quick Shortcuts:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    to="/dashboard/sessions"
                    onClick={closeAllDropdowns}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:text-[#0755E8] hover:bg-blue-50 transition-colors"
                  >
                    Sessions
                  </Link>
                  <span className="text-slate-300">•</span>
                  <Link
                    to="/dashboard/availability"
                    onClick={closeAllDropdowns}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:text-[#0755E8] hover:bg-blue-50 transition-colors"
                  >
                    Availability
                  </Link>
                  <span className="text-slate-300">•</span>
                  <Link
                    to="/dashboard/withdraw"
                    onClick={closeAllDropdowns}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:text-[#0755E8] hover:bg-blue-50 transition-colors"
                  >
                    Payouts
                  </Link>
                  <span className="text-slate-300">•</span>
                  <Link
                    to="/dashboard/profile"
                    onClick={closeAllDropdowns}
                    className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:text-[#0755E8] hover:bg-blue-50 transition-colors"
                  >
                    Profile
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 mx-2 self-center"></div>

        {/* Profile */}
        <div className="relative flex items-center" ref={profileRef}>
          <button
            onClick={() => {
              setIsProfileOpen((s) => !s);
              setIsNotificationsOpen(false);
              setIsHelpOpen(false);
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
