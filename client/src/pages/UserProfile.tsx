import { useState, useEffect } from "react";
import {
  User,
  Briefcase,
  FileText,
  AlertTriangle,
  Zap,
  Target,
  BookOpen,
  Trophy
} from "lucide-react";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import PersonalInfoSection from "../components/profile/PersonalInfoSection";
import EducationSection from "../components/profile/EducationSection";
import ExperienceSection from "../components/profile/ExperienceSection";
import CertificationsSection from "../components/profile/CertificationsSection";
import SkillsSection from "../components/profile/SkillsSection";
import { useQuery } from "@tanstack/react-query";

export default function UserProfile() {
  const { user } = useAuth();
  const userId = user?.id || user?._id || user?.userId;
  const [activeTab, setActiveTab] = useState("personal");

  const { data: profileData, isLoading, refetch } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await axios.get("/api/user/profile", {
        headers: { userid: userId },
      });
      return response.data.success ? response.data.data : null;
    },
    enabled: !!userId,
  });

  useState(() => {
    window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: true } }));
  });

  useEffect(() => {
    if (!userId) {
      window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: false } }));
    } else {
      window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: isLoading } }));
    }
  }, [isLoading, userId]);

  const tabs = [
    { id: "personal", label: "Personal", icon: User },
    { id: "education", label: "Education", icon: BookOpen },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "certifications", label: "Certificates", icon: Trophy },
    { id: "skills", label: "Skills", icon: Zap },
  ];

  const completion = profileData?.profileCompletion ?? 0;
  const warnings: string[] = profileData?.profileWarnings || [];
  const ringRadius = 22;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (completion / 100) * ringCircumference;

  return (
    <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-[28px] p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden pb-12 font-sans text-left">
      {/* Decorative gradient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">

        {/* Header Section: Title, Completion, Resume Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Profile Settings
            </h1>
            <p className="text-[13px] font-medium text-slate-500">
              Manage your credentials and preferences to optimize your candidate profile.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Progress Ring */}
            <div className="flex items-center gap-3 pl-4 pr-5 py-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
                  <defs>
                    <linearGradient id="profileCompletionRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#004fcb" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <circle cx="24" cy="24" r={ringRadius} fill="none" stroke="#eef2ff" strokeWidth="4" />
                  <circle
                    cx="24" cy="24" r={ringRadius}
                    fill="none"
                    stroke="url(#profileCompletionRing)"
                    strokeWidth="4"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="text-[11px] font-black text-[#004fcb]">{isLoading ? "…" : `${completion}%`}</span>
              </div>
              <div className="leading-tight">
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Profile</p>
                <p className="text-[13px] font-extrabold text-slate-800">Completion</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Horizontal Scrollable) */}
        <div className="flex gap-2 overflow-x-auto pb-3 pt-0.5 px-0.5 border-b border-slate-100 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold transition-all duration-200 rounded-2xl border whitespace-nowrap snap-start shrink-0
                  ${isActive
                     ? "bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/20"
                     : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"}
                `}
              >
                <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Warnings Canvas */}
        {warnings.length > 0 && !isLoading && (
          <div className="bg-amber-50/70 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/60 flex gap-3.5 items-start shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle size={15} />
            </div>
            <div className="flex-1 space-y-1.5">
              <h4 className="text-xs font-bold text-amber-900">Visibility Checklist:</h4>
              <div className="flex flex-wrap gap-1.5">
                {warnings.map((warning, index) => (
                  <span key={index} className="text-[10px] font-bold text-amber-800 bg-white/80 px-2 py-1 rounded-md border border-amber-200/40">
                    {warning}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Content Canvas */}
        <div className="min-h-[360px] md:min-h-[480px] pt-2">
          {isLoading ? (
            <div className="w-full flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[300px]">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-[#004fcb] rounded-full animate-spin"></div>
              <span className="text-xs font-medium">Loading profile section...</span>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              {activeTab === "personal" && <PersonalInfoSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "education" && <EducationSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "experience" && <ExperienceSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "certifications" && <CertificationsSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "skills" && <SkillsSection profileData={profileData} onUpdate={refetch} />}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
