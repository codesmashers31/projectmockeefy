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
import PreferencesSection from "../components/profile/PreferencesSection";
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
    { id: "preferences", label: "Preferences", icon: Target },
  ];

  const completion = profileData?.profileCompletion ?? 0;
  const warnings: string[] = profileData?.profileWarnings || [];

  return (
    <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-[28px] p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden pb-12 font-sans text-left">
      {/* Decorative gradient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />
      
      <div className="w-full space-y-6 relative z-10">
        
        {/* Header Section: Title, Completion, Resume Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              Profile Settings
            </h1>
            <p className="text-xs text-gray-500">
              Manage your credentials and preferences to optimize your candidate profile.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Progress Box */}
            <div className="px-3.5 py-2 bg-gray-50 rounded-xl border border-gray-100/80 text-right min-w-[110px]">
              <p className="text-[9px] uppercase font-bold text-gray-400">Completion</p>
              <p className="text-xl font-black text-blue-600 mt-0.5">{isLoading ? "..." : `${completion}%`}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Horizontal Scrollable) */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 pt-0.5 px-0.5 border-b border-gray-100 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-xl border whitespace-nowrap snap-start shrink-0
                  ${isActive 
                     ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                     : "bg-white text-gray-600 border-gray-200 hover:text-gray-900"}
                `}
              >
                <Icon size={13} className={isActive ? "text-white" : "text-gray-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Warnings Canvas */}
        {warnings.length > 0 && !isLoading && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/50 flex gap-3.5 items-start shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle size={15} />
            </div>
            <div className="flex-1 space-y-1.5">
              <h4 className="text-xs font-bold text-amber-900">Visibility Checklist:</h4>
              <div className="flex flex-wrap gap-1.5">
                {warnings.map((warning, index) => (
                  <span key={index} className="text-[10px] font-bold text-amber-800 bg-white px-2 py-1 rounded-md border border-amber-200/40">
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
            <div className="w-full flex flex-col items-center justify-center text-gray-400 gap-3 min-h-[300px]">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-xs font-medium">Loading profile section...</span>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              {activeTab === "personal" && <PersonalInfoSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "education" && <EducationSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "experience" && <ExperienceSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "certifications" && <CertificationsSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "skills" && <SkillsSection profileData={profileData} onUpdate={refetch} />}
              {activeTab === "preferences" && <PreferencesSection profileData={profileData} onUpdate={refetch} />}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
