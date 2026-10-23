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
import { Skeleton } from "../../components/ui/skeleton";
import {
  User,
  BookOpen,
  Briefcase,
  ShieldCheck,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Award,
  FileText
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
  const { user } = useAuth();
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

  // showSidebar state removed as it is no longer needed for the new mobile layout
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [completion, setCompletion] = useState<number>(0);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const hasLoadedRef = useRef(false);

  // Derived state to check if a specific section is missing
  const isSectionMissing = (tabId: string) => {
    // Map tab IDs to backend section names
    const sectionMap: Record<string, string> = {
      personal: "Personal Information",
      education: "Education",
      profession: "Professional Details",
      verification: "Verification Documents",
      agreement: "Service Agreement"
    };

    const backendName = sectionMap[tabId];
    if (!backendName) return false; // Overview or unknown

    return missingSections.includes(backendName);
  };

  const isTabIncomplete = (tabId: string) => {
    if (tabId === 'overview') {
      return missingSections.length > 0;
    }
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

  // Handler to refresh data after updates in child components
  const handleUpdate = () => {
    fetchProfileData();
  };

  const renderContent = () => {
    // Pass onUpdate to all children so they can trigger a re-fetch of missing sections
    const commonProps = { onUpdate: handleUpdate, profileData };

    switch (active) {
      case "overview":
        return <ExpertProfileHeader onNavigate={(tab) => { handleTabSelect(tab); }} onRefresh={fetchProfileData} />;
      case "personal":
        return <PersonalInfo {...commonProps} isMissing={isSectionMissing('personal')} />;
      case "tier":
        return <CategoryAndLevelSection {...commonProps} />;
      case "education":
        return <ExpertEducation {...commonProps} isMissing={isSectionMissing('education')} />;
      case "profession":
        return <ExpertProfession {...commonProps} isMissing={isSectionMissing('professional') || isSectionMissing('profession')} />;
      case "verification":
        return <VerificationManager />;
      case "agreement":
        return <AgreementPage onUpdate={handleUpdate} />;
      default:
        return <ExpertProfileHeader onNavigate={(tab) => { handleTabSelect(tab); }} onRefresh={fetchProfileData} />;
    }
  };

  if (loading && !profileData) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-3 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="col-span-9 space-y-4">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">

        <div className="flex-1 flex min-h-0">
          {/* LEFT SIDEBAR - Fixed Width on Desktop, Hidden on Mobile */}
          <div className="hidden lg:flex w-64 border-r border-gray-200 bg-white flex-col shrink-0 overflow-y-auto transition-all">
            {/* <div className="p-6 border-b border-gray-100 bg-white text-center">
              <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl mb-3 shadow-inner">
                {user?.name?.[0]?.toUpperCase() || "E"}
              </div>
              <h2 className="font-bold text-gray-900 truncate px-2">{user?.name}</h2>
              <p className="text-sm text-gray-500 mb-3">{user?.email}</p>

              <div className={`px-3 py-1.5 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5 ${getStatusColor(status)}`}>
                <span className={`relative flex h-2 w-2`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'Active' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'Active' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                </span>
                {getStatusLabel(status)}
              </div>
            </div> */}

            {/* Navigation Links */}
            <div className="p-3 space-y-1">
              {TABS.map((tab) => {
                const isIncomplete = isTabIncomplete(tab.id);

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActive(tab.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                      active === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 shrink-0 ${active === tab.id ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{tab.label}</span>

                    <div className="ml-auto shrink-0">
                      {isIncomplete ? (
                        <AlertCircle className={`w-3.5 h-3.5 ${active === tab.id ? "text-amber-300" : "text-amber-500"}`} />
                      ) : (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${active === tab.id ? "text-emerald-300" : "text-emerald-500"}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Profile Status Widget - Bottom of Sidebar */}
            {status === "Active" ? (
              <div className="p-4 mt-auto border-t border-slate-100 bg-emerald-50/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 truncate">Verified Expert</p>
                    <p className="text-[11px] text-emerald-700 font-medium">Profile is live & active</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Setup Progress</span>
                  <span className="text-blue-600 font-extrabold">{completion}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium pt-0.5">
                  {profileData?.verificationRequested ? (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      In Review
                    </span>
                  ) : completion >= 80 && !missingSections.includes("Verification Documents") && !missingSections.includes("Service Agreement") ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Ready to verify
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Target: 80% to verify
                    </span>
                  )}
                  <span className="text-slate-400 font-normal">
                    {missingSections.length === 0 ? "Complete" : `${missingSections.length} remaining`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT CONTENT AREA - Flexible */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col">
            <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">

              {/* Mobile Tab Navigation */}
              <div className="lg:hidden mb-6 overflow-x-auto no-scrollbar pb-2">
                <div className="flex items-center gap-2">
                  {TABS.map((tab) => {
                    const isIncomplete = isTabIncomplete(tab.id);
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabSelect(tab.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                          active === tab.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                        {isIncomplete ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {active === "overview" ? (
                renderContent()
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 md:p-8 min-h-[500px]">
                  {renderContent()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
