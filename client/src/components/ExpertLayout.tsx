import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import SideNav from "./SideNav";
import TopNav from "./TopNav";
import Footer from "./Footer";
import { LayoutGrid, Calendar, CalendarDays, Wallet, User, ArrowUp } from "lucide-react";

export default function ExpertLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isDashboardActive =
    location.pathname === "/dashboard" || location.pathname === "/dashboard/";
  const isSessionsActive = location.pathname.startsWith("/dashboard/sessions");
  const isAvailabilityActive = location.pathname.startsWith("/dashboard/availability");
  const isWithdrawActive = location.pathname.startsWith("/dashboard/withdraw");
  const isProfileActive = location.pathname.startsWith("/dashboard/profile");

  return (
    <div className="min-h-screen bg-[#F5F8FF] flex flex-col font-sans text-slate-900 antialiased selection:bg-[#EAF2FF] selection:text-[#0755E8]">
      {/* Top Navigation - Full Width Sticky */}
      <header className="sticky top-0 z-50 bg-white shadow-xs">
        <TopNav onOpenSidebar={() => setSidebarOpen(true)} showLogo={true} />
      </header>

      {/* Main Layout Container - matching candidate max-w-[1440px] centered container */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-24 lg:pb-16">
        <div className="flex items-start gap-5 lg:gap-6 w-full">
          {/* Left Floating Sidebar Navigation */}
          <SideNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Central Main Content Area */}
          <section className="flex-1 min-w-0 w-full animate-in fade-in duration-300">
            <Outlet />
          </section>
        </div>
      </main>

      {/* Mobile Bottom Quick-Access Bar (visible on < lg screens) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg flex items-center justify-around">
        <button
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
            isDashboardActive
              ? "text-[#0755E8]"
              : "text-slate-500 hover:text-slate-800"
          }`}
          title="Dashboard"
          aria-label="Dashboard"
        >
          <LayoutGrid size={18} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => navigate("/dashboard/sessions")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
            isSessionsActive
              ? "text-[#0755E8]"
              : "text-slate-500 hover:text-slate-800"
          }`}
          title="Sessions"
          aria-label="Sessions"
        >
          <Calendar size={18} />
          <span>Sessions</span>
        </button>

        <button
          onClick={() => navigate("/dashboard/availability")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
            isAvailabilityActive
              ? "text-[#0755E8]"
              : "text-slate-500 hover:text-slate-800"
          }`}
          title="Availability"
          aria-label="Availability"
        >
          <CalendarDays size={18} />
          <span>Availability</span>
        </button>

        <button
          onClick={() => navigate("/dashboard/withdraw")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
            isWithdrawActive
              ? "text-[#0755E8]"
              : "text-slate-500 hover:text-slate-800"
          }`}
          title="Payouts"
          aria-label="Payouts"
        >
          <Wallet size={18} />
          <span>Payouts</span>
        </button>

        <button
          onClick={() => navigate("/dashboard/profile")}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
            isProfileActive
              ? "text-[#0755E8]"
              : "text-slate-500 hover:text-slate-800"
          }`}
          title="Profile"
          aria-label="Profile"
        >
          <User size={18} />
          <span>Profile</span>
        </button>
      </div>

      {/* Modern SaaS Footer */}
      <Footer showAppBanner={false} maxWidth="max-w-[1440px]" />
      <BackToTopButton />
    </div>
  );
}

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
