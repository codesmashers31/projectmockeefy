import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import TopNav from "./TopNav";
import { LayoutGrid, Calendar, CalendarDays, Wallet, User } from "lucide-react";

export default function ExpertLayout() {
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
    <div className="min-h-screen bg-gradient-to-b from-[#EEF4FF] via-[#F6F9FF] to-[#FAF8FF] flex flex-col font-sans text-slate-900 antialiased selection:bg-[#EAF2FF] selection:text-[#0755E8]">
      {/* Top Navigation - Full Width Sticky */}
      <header className="sticky top-0 z-50 bg-white shadow-xs">
        <TopNav showLogo={true} />
      </header>

      {/* Main Layout Container - Full Width Content (No cramped double sidebar) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-8 pt-5 sm:pt-6 pb-20 lg:pb-12 text-[13.5px]">
        <section className="w-full min-w-0 animate-in fade-in duration-300">
          <Outlet />
        </section>
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
    </div>
  );
}
