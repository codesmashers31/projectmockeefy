import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  Clock,
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
  const navigate = useNavigate();
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
  const [bonusBreakdown, setBonusBreakdown] = useState<any>(null);
  const hasLoadedRef = useRef(false);

  const hasAvailability = Boolean(
    bonusBreakdown?.availability?.completed ?? (
      profileData?.availability?.weekly &&
      Object.values(profileData.availability.weekly).some((arr: any) => Array.isArray(arr) && arr.length > 0)
    )
  );

  const hasSkills = Boolean(
    bonusBreakdown?.skills?.completed ?? (
      (Array.isArray(profileData?.expertSkills) && profileData.expertSkills.length > 0) ||
      (Array.isArray(profileData?.skillsAndExpertise?.tools) && profileData.skillsAndExpertise.tools.length > 0) ||
      (Array.isArray(profileData?.skillsAndExpertise?.domains) && profileData.skillsAndExpertise.domains.length > 0)
    )
  );

  const isApproved = Boolean(
    user?.isExpertVerified ||
    user?.expertStatus?.toLowerCase() === "active" ||
    user?.expertStatus?.toLowerCase() === "approved" ||
    status === "Active" ||
    status === "approved" ||
    profileData?.isVerified ||
    profileData?.status?.toLowerCase() === "active" ||
    profileData?.status?.toLowerCase() === "approved"
  );

  const isUnderReview = !isApproved && Boolean(
    user?.verificationRequested ||
    profileData?.verificationRequested
  );

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

  const completedModulesCount = TABS.filter(
    (t) => t.id !== "overview" && !isTabIncomplete(t.id)
  ).length;

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
        setBonusBreakdown(res.data.bonusBreakdown || null);
        hasLoadedRef.current = true;
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
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
      "EXPERT_STATUS_UPDATED",
      "VERIFICATION_UPDATED",
      "EDUCATION_UPDATED",
      "EXPERIENCE_UPDATED",
      "SKILLS_UPDATED",
      "AVAILABILITY_UPDATED",
      "AGREEMENT_UPDATED",
      "RECONNECTED",
    ],
    (payload) => {
      if ((payload.type === "STATUS_UPDATED" || payload.type === "EXPERT_STATUS_UPDATED") && payload.data?.status) {
        setStatus(payload.data.status);
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
    <div className="sidebar-main-card relative w-full rounded-2xl border border-blue-200/80 bg-gradient-to-b from-[#DCEBFF] via-[#F4F8FF] to-white p-3.5 sm:p-5 md:p-6 shadow-[0_8px_32px_-12px_rgba(7,85,232,0.08)] overflow-hidden font-sans text-left space-y-4 animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting - Vivid & clearly visible */}
      <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/35 via-indigo-300/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-gradient-to-br from-sky-400/25 via-blue-200/20 to-transparent blur-2xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-200/30 via-blue-100/10 to-transparent pointer-events-none" />

      {/* Content Layer */}
      <div className="relative z-10 space-y-4">
      {/* 1. Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Expert Profile &amp; Mentorship Hub
            </h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs border ${
              isApproved
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/90"
                : isUnderReview
                ? "bg-blue-50 text-[#0755E8] border-blue-200/90"
                : "bg-amber-50 text-amber-700 border-amber-200/90"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? "bg-emerald-500 animate-pulse" : isUnderReview ? "bg-blue-500 animate-pulse" : "bg-amber-500"}`} />
              {isApproved ? "Approved Mentor" : isUnderReview ? "Waiting for Admin Approval" : `${completion}% Complete`}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage your executive credentials, coaching tracks, hourly pricing, and verified background details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.id && (
            <button
              onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50/80 border border-blue-200/90 text-[#0755E8] text-xs font-bold rounded-lg transition-all shadow-2xs cursor-pointer"
              title="Preview how candidates view your profile"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#0755E8]" />
              Preview Public Profile
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Executive 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">
        {/* Left Navigation Card */}
        <aside className="w-full lg:w-52 shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 flex flex-col justify-between space-y-2.5">
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
            {isApproved ? (
              <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 truncate">Approved Mentor</p>
                    <p className="text-[11px] text-emerald-700 font-medium">100% Discoverable</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200/60 font-semibold text-emerald-800">
                  <span>MNC Credentials Live</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
            ) : isUnderReview ? (
              <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/50 border border-blue-200/90 rounded-2xl p-3.5 space-y-2 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0755E8] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-950 truncate">Under Admin Review</p>
                    <p className="text-[11px] text-[#0755E8] font-medium">100% Profile Complete</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200/60 font-semibold text-blue-800">
                  <span>Waiting for Approval</span>
                  <span className="w-2 h-2 rounded-full bg-[#0755E8] animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 space-y-2.5 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Profile Progress</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[#0755E8] font-black text-sm">{completion}%</span>
                    <span className="text-[10px] text-slate-400 font-semibold">/ 100%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-[#0755E8] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(completion, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 px-0.5">
                    <span>0%</span>
                    <span className="text-blue-600 font-bold">{completedModulesCount} of 6 Modules</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Qualification Status */}
                <div className={`p-2 rounded-xl border text-[11px] space-y-0.5 ${
                  isApproved
                    ? "bg-emerald-50/90 border-emerald-200/90 text-emerald-950"
                    : isUnderReview
                    ? "bg-blue-50/90 border-blue-200/90 text-blue-950"
                    : completion >= 80
                    ? "bg-blue-50/90 border-blue-200/90 text-blue-950"
                    : "bg-amber-50/80 border-amber-200/80 text-amber-950"
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 truncate">
                      {isApproved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : isUnderReview ? (
                        <Clock className="w-3.5 h-3.5 text-[#0755E8] shrink-0" />
                      ) : completion >= 80 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0755E8] shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate">
                        {isApproved
                          ? "Approved Mentor"
                          : isUnderReview
                          ? "Waiting for Admin Approval"
                          : completion >= 80
                          ? "Ready for Verification"
                          : "Mentor In Setup"}
                      </span>
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full shrink-0 ${
                      isApproved
                        ? "bg-emerald-200/80 text-emerald-800"
                        : isUnderReview
                        ? "bg-blue-200/80 text-blue-800"
                        : completion >= 80
                        ? "bg-blue-200/80 text-blue-800"
                        : "bg-amber-200/80 text-amber-800"
                    }`}>
                      {isApproved
                        ? "Approved"
                        : isUnderReview
                        ? "Under Review"
                        : completion >= 80
                        ? "Eligible"
                        : "In Progress"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {isApproved
                      ? "Your mentor account is approved and active on the platform."
                      : isUnderReview
                      ? "Your credentials have been submitted and are undergoing admin review."
                      : completion >= 80
                      ? "Requirements fulfilled (80%+). Ready to submit for admin approval."
                      : "Complete required profile modules to submit for approval."}
                  </p>
                </div>
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
