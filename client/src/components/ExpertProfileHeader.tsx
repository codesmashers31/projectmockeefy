import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import axios from '../lib/axios';
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Camera, AlertCircle, CheckCircle, XCircle, User, BookOpen, Briefcase, Award, Calendar, ShieldCheck, LayoutDashboard } from "lucide-react";
import { compressImage } from "../lib/imageUtils";

// Progress Ring Component
const ProgressRing = memo(({
  percent = 0,
  children
}: {
  percent?: number;
  children: React.ReactNode
}) => {
  const size = 110; // Slightly larger for better visibility
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3b82f6"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
});

ProgressRing.displayName = "ProgressRing";

interface ExpertProfileHeaderProps {
  onNavigate?: (tab: string) => void;
  onRefresh?: () => void;
}

const ExpertProfileHeader = memo(({ onRefresh, onNavigate }: ExpertProfileHeaderProps) => {
  const { user, fetchProfile: refreshGlobalUser } = useAuth();
  const navigate = useNavigate();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    name: "",
    title: "",
    company: "",
    photoUrl: "",
    status: "pending",
    rejectionReason: ""
  });
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const hasLoadedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    if (!hasLoadedRef.current) {
      setLoading(true);
    }
    try {
      const res = await axios.get("/api/expert/profile");

      if (res.data?.success) {
        const p = res.data.profile || {};
        setProfile({
          name: p.name || user.name || "",
          title: p.title || "",
          company: p.company || "",
          photoUrl: p.photoUrl || "",
          status: p.status || "pending",
          rejectionReason: p.rejectionReason || ""
        });
        setCompletion(res.data.completion || 0);
        setMissingSections(res.data.missingSections || []);
        hasLoadedRef.current = true;
      }
    } catch (err: any) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handlePhotoUpload = async (file: File) => {
    if (!file || !user) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error("Photo size must be below 1MB. Please upload a smaller image.");
      return;
    }

    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("photo", compressedFile);

      const res = await axios.post("/api/expert/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        toast.success("Profile photo updated");
        setProfile(prev => ({
          ...prev,
          photoUrl: res.data.profile?.photoUrl || prev.photoUrl
        }));
        // Refresh to get updated completion status
        fetchProfile();
        // Sync global auth state so TopNav updates
        refreshGlobalUser();
        // Notify parent (ProfilePage) to refresh its state
        onRefresh?.();
      }
    } catch (err: any) {
      console.error("Upload Error:", err);
      toast.error(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleResubmit = async () => {
    try {
      setLoading(true);
      const res = await axios.post("/api/expert/resubmit");
      if (res.data.success) {
        toast.success("Profile resubmitted");
        fetchProfile();
        refreshGlobalUser();
        onRefresh?.();
      }
    } catch (err) {
      toast.error("Failed to resubmit");
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      Active: {
        label: "Verified",
        icon: CheckCircle,
        color: "text-green-600 bg-green-50 border-green-200",
        badgeColor: "bg-green-500"
      },
      approved: {
        label: "Approved",
        icon: CheckCircle,
        color: "text-blue-600 bg-blue-50 border-blue-200",
        badgeColor: "bg-blue-500"
      },
      rejected: {
        label: "Rejected",
        icon: XCircle,
        color: "text-red-600 bg-red-50 border-red-200",
        badgeColor: "bg-red-500"
      },
      default: {
        label: "Pending Verification",
        icon: AlertCircle,
        color: "text-amber-600 bg-amber-50 border-amber-200",
        badgeColor: "bg-amber-500"
      }
    };

    return configs[status as keyof typeof configs] || configs.default;
  };

  const statusConfig = getStatusConfig(profile.status);
  const StatusIcon = statusConfig.icon;

  const sectionTabMap: Record<string, string> = {
    "Personal Information": "personal",
    "Education": "education",
    "Professional Details": "profession",
    "Verification Documents": "verification"
  };

  const getSectionIcon = (sectionName: string) => {
    const icons: Record<string, any> = {
      "Personal Information": User,
      "Education": BookOpen,
      "Professional Details": Briefcase,
      "Skills & Expertise": Award,
      "Availability": Calendar,
      "Profile Photo": Camera,
      "Verification Documents": ShieldCheck
    };
    return icons[sectionName] || AlertCircle;
  };

  const handleSectionClick = (sectionName: string) => {
    const tab = sectionTabMap[sectionName];
    if (tab) {
      onNavigate?.(tab);
    } else if (sectionName === "Availability") {
      navigate("/dashboard/availability");
    } else if (sectionName === "Skills & Expertise") {
      navigate("/dashboard/skills");
    } else if (sectionName === "Profile Photo") {
      photoInputRef.current?.click();
    }
  };

  if (loading && !profile.name) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 font-medium">Loading profile overview...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Premium Header Card */}
      <div className="bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50/20 border border-slate-200/60 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-sm">
        {/* Left: Avatar with Progress Ring */}
        <div className="relative shrink-0">
          <ProgressRing percent={completion}>
            {(profile.photoUrl && !profile.photoUrl.includes("default-avatar.png") && !profile.photoUrl.includes("ui-avatars.com")) ? (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                <img
                  src={profile.photoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white flex items-center justify-center shadow-md">
                <span className="text-3xl font-black text-blue-700 uppercase">
                  {(profile.name || user?.name || 'ME').trim().substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </ProgressRing>

          {/* Upload Button */}
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md border hover:bg-gray-50 transition-colors disabled:opacity-75 z-10 cursor-pointer"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-gray-600" />
            )}
          </button>

          <input
            ref={photoInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
          />
        </div>

        {/* Right/Main: Profile Details */}
        <div className="flex-1 min-w-0 text-center md:text-left space-y-2.5">
          {profile.status === "Active" && (
            <div className="flex justify-center md:justify-start">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 shadow-sm animate-fade-in shrink-0" title="Verified Expert">
                <svg className="w-4 h-4 fill-current text-blue-500 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7l-3.61.81.34 3.68L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                VERIFIED EXPERT
              </span>
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              {profile.name || user?.name || "Your Name"}
            </h2>

            {(profile.title || profile.company) && (
              <p className="text-sm font-semibold text-slate-600 truncate max-w-xl">
                {profile.title}{profile.title && profile.company && " at "}{profile.company}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${statusConfig.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Setup Wizard Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Progress Bar Display */}
        <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
            <span>Profile Completion</span>
            <span className="text-blue-600 font-extrabold text-sm">
              {loading ? "..." : `${completion}%`}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden w-full relative">
            {loading ? (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
            ) : (
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${completion}%` }}
              />
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Completing your profile will increase your search visibility and unlock advanced mentor booking tools.
          </p>
        </div>

        {/* Dynamic Action Setup Wizard */}
        <div className="md:col-span-8">
          {completion < 100 ? (
            <div className="bg-amber-50/30 rounded-2xl border border-amber-100 p-5 md:p-6 space-y-4">
              {profile.status === "rejected" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-red-700">
                    <XCircle className="w-5 h-5 shrink-0" />
                    <h4 className="font-bold text-base">Updates Required</h4>
                  </div>
                  <p className="text-sm text-red-700 bg-red-50 p-4 rounded-xl border border-red-100 leading-relaxed font-semibold">
                    {profile.rejectionReason || "Please update your profile information as requested."}
                  </p>
                  <button
                    onClick={handleResubmit}
                    disabled={loading}
                    className="w-full py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm cursor-pointer"
                  >
                    {loading ? "Submitting..." : "Resubmit Profile"}
                  </button>
                </div>
              ) : (
                missingSections.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 text-amber-800">
                      <AlertCircle className="w-5 h-5 shrink-0 animate-pulse text-amber-600" />
                      <h4 className="font-bold text-base">Complete Your Profile Setup</h4>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        "Personal Information",
                        "Education",
                        "Professional Details",
                        "Skills & Expertise",
                        "Availability",
                        "Profile Photo",
                        "Verification Documents"
                      ].map((section, idx) => {
                        const isMissing = missingSections.includes(section);
                        const SectionIcon = getSectionIcon(section);
                        return (
                          <li key={idx} className="col-span-1">
                            <button
                              type="button"
                              onClick={() => handleSectionClick(section)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                                isMissing
                                  ? "bg-white hover:bg-amber-50/60 border-amber-200/60 hover:border-amber-300 text-amber-900 cursor-pointer"
                                  : "bg-green-50/30 hover:bg-green-50/50 border-green-200/40 hover:border-green-300 text-green-800 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-1.5 rounded-lg shrink-0 ${
                                  isMissing 
                                    ? "bg-amber-50 text-amber-600" 
                                    : "bg-green-50 text-green-600"
                                }`}>
                                  <SectionIcon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold truncate">
                                  {section}
                                </span>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                {isMissing ? (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
                                    Go ➜
                                  </span>
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="bg-green-50/40 border border-green-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="p-3.5 bg-green-100 rounded-full shrink-0 text-green-600">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-green-800 text-lg mb-0.5">All Set!</h4>
                <p className="text-sm text-green-600/90 leading-relaxed font-semibold">
                  Your profile is 100% complete and pending verification by our admin team.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ExpertProfileHeader.displayName = "ExpertProfileHeader";

export default ExpertProfileHeader;