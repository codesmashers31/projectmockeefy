import React, { useState, useEffect } from "react";
import Navigation from "./Navigation";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { ArrowUp, Menu, X, Users, Calendar, Bookmark } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideSidebars?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  hideSidebars = false,
}) => {
  const showLeftSidebar = !hideSidebars;
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F5F8FF] flex flex-col font-sans text-slate-900 antialiased selection:bg-[#EAF2FF] selection:text-[#0755E8]">
      {/* Top Navigation - Sticky */}
      <header className="sticky top-0 z-40 bg-white">
        <Navigation />
      </header>

      {/* Main Layout Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-16">
        <div className="flex items-start gap-5 lg:gap-6 w-full">
          {/* Left Sidebar - Desktop (Sticky Command Center) */}
          {showLeftSidebar && (
            <aside aria-label="Desktop Sidebar" className="hidden lg:block w-[220px] shrink-0 sticky top-[80px] self-start">
              <Sidebar />
            </aside>
          )}

          {/* Central Main Content Area */}
          <section className="flex-1 min-w-0 w-full animate-in fade-in duration-300">
            {children}
          </section>
        </div>
      </main>

      {/* Mobile Bottom Quick-Access Bar (visible on < lg screens) */}
      {showLeftSidebar && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg flex items-center justify-around">
          <button
            onClick={() => navigate("/")}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors ${
              location.pathname === "/" ||
              location.pathname === "/dashboard" ||
              location.pathname === "/mentors" ||
              location.pathname === "/find-mentor" ||
              location.pathname === "/book-session"
                ? "text-[#0755E8]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={18} />
            <span>Experts</span>
          </button>

          <button
            onClick={() => navigate("/saved-experts")}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors ${
              location.pathname === "/saved-experts"
                ? "text-[#0755E8]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bookmark size={18} />
            <span>Saved</span>
          </button>

          <button
            onClick={() => navigate("/my-sessions")}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors ${
              location.pathname === "/my-sessions"
                ? "text-[#0755E8]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar size={18} />
            <span>Sessions</span>
          </button>

          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-800"
          >
            <Menu size={18} />
            <span>Menu</span>
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

      <Footer />
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
      onClick={scrollToTop}
      className={`fixed bottom-16 lg:bottom-6 right-5 z-40 p-3 rounded-full bg-slate-900 hover:bg-[#0755E8] text-white shadow-lg border border-slate-800/10 active:scale-95 transition-all duration-200 cursor-pointer ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-4 scale-75 pointer-events-none"
      }`}
      aria-label="Back to top"
    >
      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
    </button>
  );
};

export default DashboardLayout;
