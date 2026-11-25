import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";

// Proactively prefetch candidate page chunks so navigating between tabs is 100% instantaneous without unmounting shell
const prefetchTabs = () => {
  try {
    import("../pages/CertificatesPage");
    import("../pages/UserProfile");
    import("../components/MySessions");
  } catch {
    // ignore
  }
};

export default function UserShell() {
  useEffect(() => {
    prefetchTabs();
  }, []);

  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="w-full min-h-[500px] rounded-2xl sm:rounded-[28px] bg-white/70 border border-slate-200/90 shadow-2xs animate-pulse p-8 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#0755E8] border-t-transparent animate-spin" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </DashboardLayout>
  );
}

