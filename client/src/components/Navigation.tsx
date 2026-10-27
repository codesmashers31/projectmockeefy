import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import {
  Bell,
  Search,
  X,
  Menu,
  LogOut,
  User,
  BookOpen,
  HelpCircle,
  ChevronDown,
  Bookmark,
  Award,
  Crown,
  Sparkles,
  CreditCard,
  Compass,
  Heart,
  CheckCheck,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useSocketEvent, useDataSync } from "../context/SocketContext";
import MockeefyLogo from "./MockeefyLogo";
import Avatar from "./ui/avatar";

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

interface NavigationProps {
  showSkeletons?: boolean;
}

function formatRelativeTime(dateString?: string) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getNotificationIcon(type?: string, title?: string) {
  const t = (type || "").toLowerCase();
  const text = (title || "").toLowerCase();
  if (t === "session" || text.includes("meeting") || text.includes("session")) {
    return <Calendar size={15} className="text-[#0755E8]" />;
  }
  if (t === "success" || text.includes("completed") || text.includes("booked") || text.includes("confirmed")) {
    return <CheckCircle2 size={15} className="text-emerald-500" />;
  }
  if (t === "warning" || text.includes("starting soon") || text.includes("urgent")) {
    return <Clock size={15} className="text-amber-500" />;
  }
  return <Bell size={15} className="text-[#0755E8]" />;
}

export default function Navigation({ showSkeletons = false }: NavigationProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const { user, token, logout } = useAuth();
  const { data: userProfile } = useUserProfile();
  const profileImage = user?.profileImage || userProfile?.profileImage;

  // Sync search input with URL params when on home page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || params.get("search");
    if (q) {
      setSearchQuery(q);
    } else if (location.pathname !== "/" && location.pathname !== "/mentors" && location.pathname !== "/find-mentor") {
      setSearchQuery("");
    }
  }, [location.pathname, location.search]);

  // Fetch Notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get("/api/notifications?unreadOnly=true");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Real-time notification arrival
  useSocketEvent("new_notification", (notification: any) => {
    const formatted: Notification = {
      _id: notification._id,
      type: notification.type || "info",
      title: notification.title,
      message: notification.message,
      isRead: false,
      createdAt: notification.createdAt || new Date().toISOString(),
      metadata: notification.metadata,
    };
    setNotifications((prev) => [formatted, ...prev]);
    setUnreadCount((prev) => prev + 1);
  });

  // Real-time synchronization when notifications are marked read in another session
  useDataSync("NOTIFICATION_SYNC", (payload) => {
    const ids = payload.data?.notificationIds;
    if (ids === "all") {
      setNotifications([]);
      setUnreadCount(0);
    } else if (Array.isArray(ids)) {
      setNotifications((prev) => prev.filter((n) => !ids.includes(n._id)));
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    }
  });

  const markAsRead = async (id: string) => {
    try {
      await axios.put("/api/notifications/read", { notificationIds: [id] });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark read", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    closeAllDropdowns();
    if (notification.metadata?.link) {
      navigate(notification.metadata.link);
    } else if (
      notification.title?.toLowerCase().includes("session") ||
      notification.title?.toLowerCase().includes("meeting") ||
      notification.message?.toLowerCase().includes("session")
    ) {
      navigate("/my-sessions");
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put("/api/notifications/read", { notificationIds: "all" });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all read", error);
    }
  };

  const closeAllDropdowns = () => {
    setIsNotificationOpen(false);
    setIsProfileMenuOpen(false);
    setIsMenuOpen(false);
    setIsMoreOpen(false);
  };

  useEffect(() => {
    closeAllDropdowns();
  }, [location.pathname]);

  // Close dropdowns on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target) && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllDropdowns();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/");
    }
  };

  // Primary navigation links: My Sessions, Certificates, and More
  const navItems = [
    { name: "My Sessions", href: "/my-sessions" },
    { name: "Certificates", href: "/certificates" },
  ];

  const moreItems = [
    { name: "Saved Interview Experts", href: "/saved-experts", icon: <Bookmark size={16} /> },
    { name: "Subscription Plans", href: "/plans", icon: <CreditCard size={16} /> },
    { name: "Tips & Guidance", href: "/tips", icon: <Sparkles size={16} /> },
    { name: "Help & Support", href: "/help", icon: <HelpCircle size={16} /> },
  ];

  const profileMenuItems = [
    { name: "Profile Settings", href: "/profile", icon: <User size={16} /> },
    { name: "My Sessions", href: "/my-sessions", icon: <Compass size={16} /> },
    { name: "Saved Interview Experts", href: "/saved-experts", icon: <Bookmark size={16} /> },
    { name: "Certificates", href: "/certificates", icon: <Award size={16} /> },
    { name: "Help & Support", href: "/help", icon: <HelpCircle size={16} /> },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") return location.pathname === "/" || location.pathname === "/dashboard";
    return location.pathname === href || (location.pathname.startsWith(href) && href !== "/");
  };

  return (
    <>
      <nav
        ref={menuRef}
        aria-label="Main Navigation"
        className="bg-white border-b border-slate-200/80 sticky top-0 z-50 w-full h-16 shadow-[0_1px_2px_rgba(0,0,0,0.02)] font-sans"
      >
        <div className="max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto h-full flex items-center justify-between gap-3 sm:gap-4 lg:gap-0">
          {/* ========================================================= */}
          {/* LEFT: Mockeefy Logo aligned with the 250px Side Nav       */}
          {/* ========================================================= */}
          <div className="flex items-center justify-start lg:justify-center lg:w-[250px] shrink-0 h-full">
            {showSkeletons ? (
              <div className="flex items-center gap-2.5">
                <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl bg-slate-100 border border-slate-200/50 shimmer-shining shrink-0" />
                <div className="h-5 sm:h-6 w-24 rounded-lg bg-slate-100 border border-slate-200/50 shimmer-shining" />
              </div>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-2.5 group active:scale-95 transition-transform"
                onClick={closeAllDropdowns}
              >
                <MockeefyLogo className="h-8.5 w-8.5 sm:h-9 sm:w-9" variant="brand" />
                <span className="text-[19px] sm:text-[20px] font-sans font-extrabold tracking-tight text-[#0755E8] group-hover:text-[#0645C7] transition-colors">
                  Mockeefy
                </span>
              </Link>
            )}
          </div>

          {/* ========================================================================= */}
          {/* CENTER EXPERTS ZONE: Nav Links start where the center experts section starts */}
          {/* ========================================================================= */}
          {showSkeletons ? (
            <div className="hidden md:flex items-center justify-start gap-6 lg:gap-7 flex-1 h-full pl-3 lg:pl-7 xl:pl-8 pr-4">
              <div className="h-4 w-28 rounded-md bg-slate-100 shimmer-shining" />
              <div className="h-4 w-28 rounded-md bg-slate-100 shimmer-shining" />
              <div className="h-4 w-24 rounded-md bg-slate-100 shimmer-shining" />
              <div className="h-4 w-16 rounded-md bg-slate-100 shimmer-shining" />
            </div>
          ) : (
            <div className="hidden md:flex items-center justify-start gap-6 lg:gap-7 flex-1 h-full pl-3 lg:pl-7 xl:pl-8 pr-4">
              {navItems.map((item) => {
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`relative h-full flex items-center text-[14px] lg:text-[14.5px] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:text-[#0755E8] ${
                      active
                        ? "text-[#0755E8] font-bold"
                        : "text-slate-600 hover:text-[#0755E8] font-medium"
                    }`}
                    onClick={closeAllDropdowns}
                  >
                    <span>{item.name}</span>
                    {active && (
                      <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#0755E8] rounded-t-full" />
                    )}
                  </Link>
                );
              })}

              {/* "More" Dropdown Menu */}
              <div className="relative h-full flex items-center" ref={moreMenuRef}>
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={isMoreOpen}
                  aria-label="More navigation options"
                  onClick={() => {
                    setIsMoreOpen((prev) => !prev);
                    setIsProfileMenuOpen(false);
                    setIsNotificationOpen(false);
                  }}
                  className={`flex items-center gap-1 text-[14px] lg:text-[14.5px] transition-colors cursor-pointer focus-visible:outline-none ${
                    isMoreOpen
                      ? "text-[#0755E8] font-bold"
                      : "text-slate-600 hover:text-[#0755E8] font-medium"
                  }`}
                >
                  <span>More</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      isMoreOpen ? "rotate-180 text-[#0755E8]" : "text-slate-400"
                    }`}
                  />
                </button>

                {isMoreOpen && (
                  <div className="absolute left-0 top-[calc(100%-4px)] w-60 bg-white border border-slate-200/80 rounded-2xl shadow-[0_12px_36px_-6px_rgba(0,0,0,0.12)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-1 space-y-0.5">
                      {moreItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="flex items-center px-3.5 py-2.5 rounded-xl text-slate-700 hover:text-[#0755E8] hover:bg-[#F5F8FF] text-[13.5px] font-medium transition-colors"
                          onClick={closeAllDropdowns}
                        >
                          <span className="mr-3 text-slate-400 group-hover:text-[#0755E8]">
                            {item.icon}
                          </span>
                          <span>{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* RIGHT GROUP: Small Search Bar + Notifications + Profile   */}
          {/* ========================================================= */}
          {showSkeletons ? (
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <div className="hidden md:flex items-center">
                <div className="h-8 w-36 sm:w-40 md:w-44 lg:w-48 rounded-full bg-slate-100 shimmer-shining" />
              </div>
              <div className="w-8.5 h-8.5 rounded-full bg-slate-100 shimmer-shining shrink-0" />
              <div className="w-8.5 h-8.5 rounded-full bg-slate-100 shimmer-shining shrink-0" />
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Small Compact Search Bar */}
            <div className="hidden md:flex items-center">
              <form onSubmit={handleSearchSubmit} className="relative w-36 sm:w-40 md:w-44 lg:w-48">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search interview experts..."
                  className="w-full h-8 pl-3 pr-7 text-[12px] bg-[#F8FAFC] hover:bg-white focus:bg-white text-slate-800 placeholder:text-slate-400 rounded-full border border-slate-200/90 focus:border-[#0755E8] focus:outline-none focus:ring-1 focus:ring-[#0755E8]/20 transition-all shadow-2xs"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0755E8] hover:bg-[#0645C7] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Search size={11} className="stroke-[2.5]" />
                </button>
              </form>
            </div>
            {/* Authenticated User Controls */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Notifications Bell */}
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    aria-label="View notifications"
                    aria-expanded={isNotificationOpen}
                    onClick={() => {
                      setIsNotificationOpen(!isNotificationOpen);
                      setIsProfileMenuOpen(false);
                      setIsMoreOpen(false);
                      setIsMenuOpen(false);
                      if (!isNotificationOpen) fetchNotifications();
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF] ${
                      isNotificationOpen
                        ? "bg-[#EAF2FF] text-[#0755E8]"
                        : "text-slate-600 hover:text-[#0755E8] hover:bg-slate-100"
                    }`}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-[#0755E8] text-white text-[8px] rounded-full min-w-[15px] h-3.5 px-0.5 flex items-center justify-center font-bold border-2 border-white shadow-xs">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Backdrop for mobile view */}
                  {isNotificationOpen && (
                    <div
                      className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-150"
                      onClick={() => setIsNotificationOpen(false)}
                      aria-hidden="true"
                    />
                  )}

                  {/* Notifications Popover */}
                  {isNotificationOpen && (
                    <div className="fixed inset-x-3 sm:inset-x-auto top-[68px] sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-[360px] max-w-sm mx-auto sm:max-w-none bg-white border border-slate-200/90 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">
                            Notifications
                          </h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2FF] text-[#0755E8]">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="text-[11px] text-[#0755E8] hover:text-[#0645C7] font-semibold cursor-pointer hover:underline flex items-center gap-1 active:scale-95 transition-transform"
                            >
                              <CheckCheck size={13} />
                              <span>Mark all read</span>
                            </button>
                          )}
                          <button
                            onClick={() => setIsNotificationOpen(false)}
                            className="sm:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 cursor-pointer"
                            aria-label="Close notifications"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[min(65vh,380px)] overflow-y-auto divide-y divide-slate-100 overscroll-contain">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-300">
                              <Bell size={18} />
                            </div>
                            <p className="text-slate-700 text-xs font-semibold">
                              All caught up!
                            </p>
                            <p className="text-slate-400 text-[11px] mt-0.5">
                              No new notifications right now
                            </p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification._id}
                              className={`px-4 py-3 hover:bg-slate-50/90 active:bg-slate-100/80 cursor-pointer transition-colors flex items-start gap-3 relative group ${
                                !notification.isRead ? "bg-[#F5F8FF]/80" : ""
                              }`}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type, notification.title)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className={`text-xs truncate ${
                                      !notification.isRead
                                        ? "font-bold text-slate-900"
                                        : "font-medium text-slate-700"
                                    }`}
                                  >
                                    {notification.title}
                                  </p>
                                  {notification.createdAt && (
                                    <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                                      {formatRelativeTime(notification.createdAt)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                                  {notification.message}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[#0755E8] shrink-0 mt-2 self-start ring-4 ring-[#0755E8]/10" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                        <Link
                          to="/notifications"
                          onClick={closeAllDropdowns}
                          className="w-full py-1.5 px-3 text-center text-xs font-semibold text-[#0755E8] hover:text-[#0645C7] hover:bg-[#EAF2FF]/60 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>See all notifications</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

                {/* Profile Pill Button */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(!isProfileMenuOpen);
                      setIsNotificationOpen(false);
                      setIsMoreOpen(false);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      <Avatar name={user?.name} src={profileImage} className="w-full h-full" />
                    </div>
                    <div className="text-left hidden lg:block leading-tight">
                      <p className="text-[13px] font-semibold text-slate-900 leading-tight truncate max-w-[110px]">
                        {user.name?.split(" ")[0] || "User"}
                      </p>
                      <p className="text-[10.5px] font-medium text-slate-500 leading-none">
                        {user.isPremium ? "Premium" : "Member"}
                      </p>
                    </div>
                    <ChevronDown
                      size={13}
                      className={`text-slate-400 transition-transform duration-200 ${
                        isProfileMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Backdrop for profile menu on mobile */}
                  {isProfileMenuOpen && (
                    <div
                      className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-150"
                      onClick={() => setIsProfileMenuOpen(false)}
                      aria-hidden="true"
                    />
                  )}

                  {/* Profile Dropdown */}
                  {isProfileMenuOpen && (
                    <div className="fixed right-3 sm:absolute sm:right-0 top-[68px] sm:top-full mt-0 sm:mt-2 w-[calc(100vw-24px)] sm:w-64 max-w-[280px] bg-white border border-slate-200/80 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                          <Avatar name={user?.name} src={profileImage} className="w-full h-full" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-slate-900 text-xs truncate">
                              {user.name}
                            </p>
                            {user.isPremium && (
                              <Crown size={11} className="text-[#0755E8] shrink-0 fill-current" />
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="p-1 space-y-0.5">
                        {profileMenuItems.map((item) => (
                          <Link
                            key={item.name}
                            to={item.href}
                            className="flex items-center px-3.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors"
                            onClick={closeAllDropdowns}
                          >
                            <span className="mr-3 text-slate-400">{item.icon}</span>
                            <span>{item.name}</span>
                          </Link>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 mt-1 p-1">
                        <button
                          onClick={() => {
                            logout();
                            closeAllDropdowns();
                          }}
                          className="flex w-full items-center px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <LogOut size={15} className="mr-3" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Guest Actions (Naukri Reference: Login, Register, For Mentors) */
              <div className="flex items-center gap-2.5">
                <Link
                  to="/signin"
                  className="px-4 sm:px-5 py-1.5 h-9 rounded-full text-[#0755E8] border border-[#0755E8] hover:bg-[#EAF2FF] text-[13px] sm:text-[13.5px] font-semibold transition-all inline-flex items-center justify-center whitespace-nowrap cursor-pointer"
                >
                  Log in
                </Link>

                <Link
                  to="/signup"
                  className="px-4 sm:px-5 py-1.5 h-9 rounded-full bg-[#0755E8] hover:bg-[#0645C7] text-white text-[13px] sm:text-[13.5px] font-semibold transition-all shadow-xs inline-flex items-center justify-center whitespace-nowrap cursor-pointer"
                >
                  Register
                </Link>

                <div className="hidden lg:flex items-center pl-1">
                  <Link
                    to="/signup?role=expert"
                    className="flex items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-[#0755E8] transition-colors whitespace-nowrap"
                  >
                    <span>For Interview Experts</span>
                    <ChevronDown size={13} className="text-slate-400" />
                  </Link>
                </div>
              </div>
            )}

            {/* Mobile Menu Hamburger */}
            <div className="md:hidden flex items-center">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen);
                  setIsNotificationOpen(false);
                  setIsProfileMenuOpen(false);
                  setIsMoreOpen(false);
                }}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
                className="p-2 text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93B8FF]"
              >
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        )}
      </div>

        {/* ========================================================= */}
        {/* MOBILE DRAWER (For screen < md)                            */}
        {/* ========================================================= */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-xl z-50 animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 space-y-3">
              {/* Mobile Search Input */}
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search interview experts, skills, roles..."
                  className="w-full h-10 pl-4 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0755E8]"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#0755E8] text-white flex items-center justify-center"
                >
                  <Search size={14} />
                </button>
              </form>

              {/* Mobile Nav Links */}
              <div className="space-y-1 pt-1">
                {navItems.map((item) => {
                  const active = isLinkActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        active
                          ? "bg-[#EAF2FF] text-[#0755E8]"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      onClick={closeAllDropdowns}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>

              {/* Extra Items */}
              <div className="border-t border-slate-100 pt-2 space-y-1">
                <p className="px-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  More Options
                </p>
                {moreItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl"
                    onClick={closeAllDropdowns}
                  >
                    <span className="text-slate-400">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>

              {/* Auth Controls in Mobile */}
              <div className="border-t border-slate-100 pt-3">
                {user ? (
                  <div className="space-y-2">
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl"
                      onClick={closeAllDropdowns}
                    >
                      <User size={16} className="text-slate-400" />
                      <span>Profile & Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        closeAllDropdowns();
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
                    >
                      <LogOut size={16} />
                      <span>Sign out</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      to="/signin"
                      onClick={closeAllDropdowns}
                      className="h-10 border border-[#0755E8] text-[#0755E8] rounded-xl text-xs font-semibold flex items-center justify-center hover:bg-[#EAF2FF]"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={closeAllDropdowns}
                      className="h-10 bg-[#0755E8] text-white rounded-xl text-xs font-semibold flex items-center justify-center hover:bg-[#0645C7]"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Backdrop overlay for mobile menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}