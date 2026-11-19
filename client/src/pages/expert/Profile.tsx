import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ExpertProfileHeader from "../../components/ExpertProfileHeader";
import PersonalInfo from "../../components/PersonalInfo";
import ExpertEducation from "../../components/ExpertEducation";
import ExpertProfession from "../../components/ExpertProfession";
import VerificationManager from "../../components/expert/VerificationManager";
import CategoryAndLevelSection from "../../components/CategoryAndLevelSection";
import AgreementPage from "./Agreement";
import axios from '../../lib/axios';
import { useAuth } from "../../context/AuthContext";
import { useDataSync } from "../../context/SocketContext";
import ExpertPageSkeleton from "../../components/ExpertPageSkeleton";
import {
  User,
  BookOpen,
  Briefcase,
  ShieldCheck,
  LayoutDashboard,
  CheckCircle2,
  Award,
  FileText,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// Define the tabs with icons and identifiers
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "personal", label: "Personal Info", icon: User },
  { id: "tier", label: "Category & Level", icon: Award },
  { id: "education", label: "Education", icon: BookOpen },
  { id: "profession", label: "Experience", icon: Briefcase },
  { id: "verification", label: "Verification", icon: ShieldCheck },
  { id: "agreement", label: "Agreement", icon: FileText },
];

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabQuery = searchParams.get("tab");
  const [active, setActive] = useState<string>(tabQuery || "overview");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== active) {
      setActive(tabParam);
    }
  }, [searchParams]);

  const handleTabSelect = (tabId: string) => {
    setActive(tabId);
    setSearchParams({ tab: tabId });
  };

  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [completion, setCompletion] = useState<number>(0);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const hasLoadedRef = useRef(false);

  // Derived state to check if a specific section is missing
  const isSectionMissing = (tabId: string) => {
    const isActive = status?.toLowerCase() === "active" || status?.toLowerCase() === "approved" || completion >= 100;
    if (isActive) return false;

    if (tabId === "overview") return false;

    if (tabId === "tier") {
      if (profileData?.category || profileData?.personalInformation?.category || !missingSections.includes("Skills & Expertise")) {
        return false;
      }
    }

    if (tabId === "verification") {
      const v = profileData?.verification;
      const hasCompanyId = Boolean(v?.companyId?.url);
      const hasAadhaar = Boolean(v?.aadhar?.isVerified || v?.aadhar?.url || v?.aadhar?.hash || v?.aadhar?.number || v?.aadhar?.rawNumber || v?.aadhar?.maskedNumber);
      if (hasCompanyId || hasAadhaar || !missingSections.includes("Verification Documents")) return false;
    }

    if (tabId === "personal") {
      if ((profileData?.name && (profileData?.mobile || profileData?.personalInfo?.phone || profileData?.phone)) || !missingSections.includes("Personal Information")) {
        return false;
      }
    }

    if (tabId === "education") {
      if ((Array.isArray(profileData?.education) && profileData.education.length > 0) || !missingSections.includes("Education")) {
        return false;
      }
    }

    if (tabId === "profession") {
      if (profileData?.title || profileData?.professionalDetails?.title || profileData?.company || !missingSections.includes("Professional Details")) {
        return false;
      }
    }

    if (tabId === "agreement") {
      if (profileData?.agreement?.isSigned || !missingSections.includes("Service Agreement") || isActive) {
        return false;
      }
    }

    const sectionMap: Record<string, string> = {
      personal: "Personal Information",
      tier: "Skills & Expertise",
      education: "Education",
      profession: "Professional Details",
      verification: "Verification Documents",
      agreement: "Service Agreement"
    };

    const backendName = sectionMap[tabId];
    if (!backendName) return false;

    return missingSections.includes(backendName);
  };

  const isTabIncomplete = (tabId: string) => {
    const isActive = status?.toLowerCase() === "active" || status?.toLowerCase() === "approved" || completion >= 100;
    if (isActive) return false;
    if (tabId === 'overview') return false;
    return isSectionMissing(tabId);
  };

  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    try {
      if (!hasLoadedRef.current) {
        setLoading(true);
      }
      const res = await axios.get("/api/expert/profile");
      if (res.data?.success) {
        const p = res.data.profile || {};
        const newStatus = p.status || "pending";
        setStatus(newStatus);
        setProfileData(p);
        setCompletion(res.data.completion || 0);
        setMissingSections(res.data.missingSections || []);
        localStorage.setItem('profile_status', newStatus);
        hasLoadedRef.current = true;
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
      const cached = localStorage.getItem('profile_status');
      if (cached) setStatus(cached);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user, fetchProfileData]);

  // Synchronize in real time when any profile section is updated
  useDataSync(
    [
      "PROFILE_UPDATED",
      "PERSONAL_INFO_UPDATED",
      "STATUS_UPDATED",
      "VERIFICATION_UPDATED",
      "EDUCATION_UPDATED",
      "EXPERIENCE_UPDATED",
      "SKILLS_UPDATED",
      "AVAILABILITY_UPDATED",
      "AGREEMENT_UPDATED",
      "RECONNECTED",
    ],
    (payload) => {
      if (payload.type === "STATUS_UPDATED" && payload.data?.status) {
        setStatus(payload.data.status);
        localStorage.setItem("profile_status", payload.data.status);
      }
      fetchProfileData();
    }
  );

  const handleUpdate = () => {
    fetchProfileData();
  };

  const renderContent = () => {
    const commonProps = { onUpdate: handleUpdate, profileData };

    switch (active) {
      case "overview":
        return <ExpertProfileHeader onNavigate={(tab) => handleTabSelect(tab)} onRefresh={fetchProfileData} />;
      case "personal":
        return <PersonalInfo {...commonProps} isMissing={isSectionMissing('personal')} />;
      case "tier":
        return <CategoryAndLevelSection {...commonProps} isMissing={isSectionMissing('tier')} />;
      case "education":
        return <ExpertEducation {...commonProps} isMissing={isSectionMissing('education')} />;
      case "profession":
        return <ExpertProfession {...commonProps} isMissing={isSectionMissing('professional') || isSectionMissing('profession')} />;
      case "verification":
        return <VerificationManager onUpdate={handleUpdate} />;
      case "agreement":
        return <AgreementPage onUpdate={handleUpdate} />;
      default:
        return <ExpertProfileHeader onNavigate={(tab) => handleTabSelect(tab)} onRefresh={fetchProfileData} />;
    }
  };

  if (isAuthLoading || (loading && !profileData)) {
    return <ExpertPageSkeleton variant="profile" />;
  }

  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-6 animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      {/* Content Layer */}
      <div className="relative z-10 space-y-6">
      {/* 1. Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Expert Profile &amp; Mentorship Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {status === "Active" ? "Verified Mentor" : `${completion}% Complete`}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage your executive credentials, coaching tracks, hourly pricing, and verified background details.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {user?.id && (
            <button
              onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50/80 border border-blue-200/90 text-[#0755E8] text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
              title="Preview how candidates view your profile"
            >
              <ExternalLink className="w-4 h-4 text-[#0755E8]" />
              Preview Public Profile
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Executive 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Navigation Card */}
        <aside className="w-full lg:w-60 shrink-0 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 flex flex-col justify-between space-y-3 lg:space-y-4">
          <div className="space-y-2 lg:space-y-3">
            <div className="px-2 pt-1 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                PROFILE SECTIONS
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0755E8] border border-blue-100">
                {TABS.length} MODULES
              </span>
            </div>

            {/* Tab navigation pills - horizontal scrollable on mobile, vertical stack on desktop */}
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 pb-2 lg:pb-0 thin-scrollbar -mx-1 px-1">
              {TABS.map((tab) => {
                const isIncomplete = isTabIncomplete(tab.id);
                const isActive = active === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
                    className={`flex items-center gap-2 lg:gap-3 px-3 sm:px-3.5 py-2 lg:py-2.5 text-xs sm:text-sm font-bold rounded-xl lg:rounded-2xl transition-all cursor-pointer text-left shrink-0 lg:w-full ${
                      isActive
                        ? "bg-[#0755E8] text-white shadow-sm shadow-[#0755E8]/25"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/60 lg:border-transparent"
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span className="whitespace-nowrap lg:truncate flex-1">{tab.label}</span>

                    <div className="shrink-0">
                      {isIncomplete ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isActive ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          Setup
                        </span>
                      ) : (
                        <CheckCircle2 className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${isActive ? "text-emerald-200" : "text-emerald-500"}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Mentor Status Card */}
          <div className="pt-3 border-t border-slate-100">
            {status === "Active" ? (
              <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 truncate">Verified Mentor</p>
                    <p className="text-[11px] text-emerald-700 font-medium">100% Discoverable</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200/60 font-semibold text-emerald-800">
                  <span>MNC Credentials Live</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Profile Progress</span>
                  <span className="text-[#0755E8] font-black">{completion}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0755E8] rounded-full transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {completion >= 80 ? "Ready for verification" : "Target: 80% to request review"}
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 min-w-0 w-full">
          {active === "overview" ? (
            renderContent()
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 animate-in fade-in duration-150">
              {renderContent()}
            </div>
          )}
        </main>
      </div>
    </div>
  </div>
  );
}
