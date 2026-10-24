import React, { useState, useEffect } from "react";
import Navigation from "./Navigation";
import Sidebar, { SkeletonSidebar } from "./Sidebar";
import Footer from "./Footer";
import { ArrowUp, Menu, X, Users, Calendar, Bookmark, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import axios from "../lib/axios";

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideSidebars?: boolean;
  showSkeletons?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  hideSidebars = false,
  showSkeletons: propShowSkeletons,
}) => {
  const showLeftSidebar = !hideSidebars;
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const isExpertsActive =
    location.pathname === "/" ||
    location.pathname === "/dashboard" ||
    location.pathname === "/mentors" ||
    location.pathname === "/find-mentor" ||
    location.pathname === "/book-session" ||
    location.pathname.startsWith("/expert");

  const isSavedActive =
    location.pathname === "/saved-experts" ||
    location.pathname === "/liked-mentors";

  const isSessionsActive =
    location.pathname === "/my-sessions" ||
    location.pathname.startsWith("/my-sessions");

  const isProfileActive =
    location.pathname === "/profile" ||
    location.pathname.startsWith("/profile");

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const isHomeOrDiscovery =
    location.pathname === "/" ||
    location.pathname === "/mentors" ||
    location.pathname === "/find-mentor";

  // Subscribe to the exact same allMentorsList query as FindMentor and App prefetch.
  // TanStack Query deduplicates this so only one network call happens, and both components
  // transition from skeleton -> content at the exact same render tick.
  const { isLoading: isExpertsLoading } = useQuery({
    queryKey: ["allMentorsList"],
    queryFn: async () => {
      const response = await axios.get("/api/expert/verified");
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: isHomeOrDiscovery,
  });

  // Skeletons are ONLY shown while the center interviewers are being fetched from the backend.
  // The moment the interviewers are fetched, showSkeletons is false and all content presents without delay!
  const showSkeletons =
    propShowSkeletons ?? (isHomeOrDiscovery && isExpertsLoading);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F5F8FF] flex flex-col font-sans text-slate-900 antialiased selection:bg-[#EAF2FF] selection:text-[#0755E8]">
      {/* Top Navigation - Sticky */}
      <header className="sticky top-0 z-40 bg-white">
        <Navigation showSkeletons={showSkeletons} />
      </header>

      {/* Main Layout Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-16">
        <div className="flex items-start gap-5 lg:gap-6 w-full">
          {/* Left Sidebar - Desktop (Sticky Command Center) */}
          {showLeftSidebar && (
            <aside aria-label="Desktop Sidebar" className="hidden lg:block w-[250px] shrink-0 sticky top-[80px] self-start">
              {showSkeletons ? <SkeletonSidebar /> : <Sidebar />}
            </aside>
          )}

          {/* Central Main Content Area */}
          <section className="flex-1 min-w-0 w-full animate-in fade-in duration-300">
            {React.isValidElement(children)
              ? React.cloneElement(children as React.ReactElement<any>, { showSkeletons })
              : children}
          </section>
        </div>
      </main>

      {/* Mobile Bottom Quick-Access Bar (visible on < lg screens) */}
      {showLeftSidebar && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg flex items-center justify-around">
          <button
            onClick={() => navigate("/")}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
              isExpertsActive
                ? "text-[#0755E8]"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Interview Experts"
            aria-label="Interview Experts"
          >
            <Users size={18} />
            <span>Experts</span>
          </button>

          <button
            onClick={() => navigate("/saved-experts")}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
              isSavedActive
                ? "text-[#0755E8]"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Saved Experts"
            aria-label="Saved Experts"
          >
            <Bookmark size={18} />
            <span>Saved</span>
          </button>

          <button
            onClick={() => navigate("/my-sessions")}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
              isSessionsActive
                ? "text-[#0755E8]"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="My Sessions"
            aria-label="My Sessions"
          >
            <Calendar size={18} />
            <span>Sessions</span>
          </button>

          <button
            onClick={handleProfileClick}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
              isProfileActive
                ? "text-[#0755E8]"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Profile & Resumes"
            aria-label="Profile & Resumes"
          >
            <User size={18} />
            <span>Profile</span>
          </button>
        </div>
      )}

      {/* Mobile Drawer (When "Menu" is clicked) */}
      {isMobileNavOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          className="lg:hidden fixed inset-0 z-50 flex bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-white shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Navigation</span>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      <Footer showSkeletons={showSkeletons} />
      <BackToTopButton />
    </div>
  );
};

const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`fixed bottom-16 lg:bottom-6 right-5 z-40 p-3 rounded-full bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white shadow-lg shadow-[#0755E8]/30 hover:shadow-xl hover:shadow-[#0755E8]/45 border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#93B8FF] focus:ring-offset-2 active:scale-95 transition-all duration-200 cursor-pointer group ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-4 scale-75 pointer-events-none"
      }`}
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp className="w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
};

export default DashboardLayout;
