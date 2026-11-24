import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

export default function ExpertLayout({ children }: { active?: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F8FF]">
      <TopNav showLogo={true} />
      <main className="max-w-[1440px] mx-auto p-4 sm:p-6">
        {/* Nested routes render here */}
        {children || <Outlet />}
      </main>
    </div>
  );
}
