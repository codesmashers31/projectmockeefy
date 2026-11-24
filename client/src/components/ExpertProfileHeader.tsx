import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import axios from '../lib/axios';
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  Camera,
  CheckCircle2,
  XCircle,
  User,
  Briefcase,
  Award,
  Calendar,
  ShieldCheck,
  Send,
  Lock,
  FileText,
  Check,
  ExternalLink,
  Clock,
  Sparkles,
  Globe,
  Building2,
  GraduationCap,
  Crop,
  Upload,
  Zap,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  Code,
  Layers,
  Video,
  CalendarPlus,
  Star,
  CheckCheck,
} from "lucide-react";
import { compressImage, compressOriginalImage, getProfileImageUrl } from "../lib/imageUtils";
import { formatDisplayName } from "../lib/utils";
import ImageCropperModal from "./ImageCropperModal";
import ExpertPageSkeleton from "./ExpertPageSkeleton";

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
    totalExperience: "" as string | number,
    industry: "",
    level: "",
    category: "",
    city: "",
    country: "",
    photoUrl: "",
    originalPhotoUrl: "",
    status: "pending",
    rejectionReason: "",
    verificationRequested: false,
    email: "",
    phone: "",
    education: [] as any[],
    verification: {} as any,
    agreement: {} as any,
  });
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const hasLoadedRef = useRef(false);

  // --- Image Cropper & Menu State ---
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [cropperFileName, setCropperFileName] = useState("profile_photo.jpg");
  const [selectedOriginalFile, setSelectedOriginalFile] = useState<File | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const photoMenuRef = useRef<HTMLDivElement>(null);

  const hasCustomPhoto = Boolean(
    profile.photoUrl &&
    !profile.photoUrl.includes("default-avatar.png") &&
    !profile.photoUrl.includes("ui-avatars.com")
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (photoMenuRef.current && !photoMenuRef.current.contains(e.target as Node)) {
        setPhotoMenuOpen(false);
      }
    };
    if (photoMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [photoMenuOpen]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Photo size must be below 15MB.");
      return;
    }
    setSelectedOriginalFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCropperImageSrc(objectUrl);
    setCropperFileName(file.name);
    setCropperOpen(true);
    setPhotoMenuOpen(false);
    e.target.value = "";
  };

  const handleAdjustCurrentPhoto = () => {
    const rawSrc = profile.originalPhotoUrl || profile.photoUrl;
    if (!rawSrc) return;
    setSelectedOriginalFile(null);
    const resolvedSrc = getProfileImageUrl(rawSrc);
    setCropperImageSrc(resolvedSrc);
    setCropperFileName("profile_photo.jpg");
    setCropperOpen(true);
    setPhotoMenuOpen(false);
  };

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
          totalExperience: p.totalExperience ?? "",
          industry: p.industry || "",
          level: p.level || "",
          category: p.category || "",
          city: p.city || "",
          country: p.country || "",
          photoUrl: p.photoUrl || "",
          originalPhotoUrl: p.originalPhotoUrl || p.photoUrl || "",
          status: p.status || "pending",
          rejectionReason: p.rejectionReason || "",
          verificationRequested: Boolean(p.verificationRequested || res.data.verificationRequested),
          email: p.email || user.email || "",
          phone: p.phone || p.mobile || p.personalInfo?.phone || "",
          education: p.education || [],
          verification: p.verification || {},
          agreement: p.agreement || {},
        });
        setCompletion(res.data.completion || 0);
        setMissingSections(res.data.missingSections || []);
        hasLoadedRef.current = true;
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handlePhotoUpload = async (croppedFile: File) => {
    try {
      setUploading(true);
      const displayBlob = await compressImage(croppedFile);
      const formData = new FormData();
      formData.append("photo", displayBlob, "avatar.jpg");

      if (selectedOriginalFile) {
        const compressedOrig = await compressOriginalImage(selectedOriginalFile);
        formData.append("originalPhoto", compressedOrig, "original.jpg");
      }

      const res = await axios.post("/api/expert/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        toast.success("Profile photo updated successfully!");
        setProfile(prev => ({
          ...prev,
          photoUrl: res.data.profile?.photoUrl || prev.photoUrl,
          originalPhotoUrl: res.data.profile?.originalPhotoUrl || prev.originalPhotoUrl
        }));
        setSelectedOriginalFile(null);
        fetchProfile();
        refreshGlobalUser();
        onRefresh?.();
      }
    } catch (err: any) {
      console.error("Upload Error:", err);
      toast.error(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const isPersonalDone = Boolean(profile.name || user?.name) && Boolean(profile.phone || profile.mobile) && !missingSections.includes("Personal Information");
  const isCategoryDone = Boolean(profile.category) && !missingSections.includes("Skills & Expertise");
  const isEducationDone = Array.isArray(profile.education) && profile.education.length > 0 && !missingSections.includes("Education");
  const isExperienceDone = (Boolean(profile.title) || Boolean(profile.company)) && !missingSections.includes("Professional Details");
  const isVerificationDocDone = !missingSections.includes("Verification Documents") && Boolean(
    profile.verification?.companyId?.url ||
    profile.verification?.aadhar?.isVerified ||
    profile.verification?.aadhar?.url ||
    profile.verification?.aadhar?.number
  );
  const isAgreementDone = !missingSections.includes("Service Agreement") && Boolean(profile.agreement?.isSigned);

  const completedModulesCount = [
    isPersonalDone,
    isCategoryDone,
    isEducationDone,
    isExperienceDone,
    isVerificationDocDone,
    isAgreementDone,
  ].filter(Boolean).length;

  const isEligibleForVerification = completion >= 80 && isVerificationDocDone && isAgreementDone;

  const handleRequestVerification = async () => {
    if (completion < 80) {
      toast.error(`Please reach at least 80% profile completion before requesting verification (currently ${completion}%).`);
      return;
    }
    if (!isVerificationDocDone) {
      toast.error("Verification Documents must be fully completed before requesting verification.");
      return;
    }
    if (!isAgreementDone) {
      toast.error("Service Agreement must be signed before requesting verification.");
      return;
    }

    try {
      setRequesting(true);
      const res = await axios.post("/api/expert/request-verification");
      if (res.data.success) {
        toast.success(res.data.message || "Profile submitted to admin for verification successfully!");
        setProfile(prev => ({
          ...prev,
          status: "pending",
          verificationRequested: true
        }));
        fetchProfile();
        refreshGlobalUser();
        onRefresh?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit verification request");
    } finally {
      setRequesting(false);
    }
  };

  const handleResubmit = async () => {
    if (completion < 80) {
      toast.error(`Please reach at least 80% profile completion before resubmitting (currently ${completion}%).`);
      return;
    }
    if (!isVerificationDocDone) {
      toast.error("Verification Documents must be fully completed before resubmitting.");
      return;
    }
    if (!isAgreementDone) {
      toast.error("Service Agreement must be signed before resubmitting.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post("/api/expert/resubmit");
      if (res.data.success) {
        toast.success("Profile resubmitted for verification");
        fetchProfile();
        refreshGlobalUser();
        onRefresh?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resubmit");
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string, isRequested: boolean, isEligible: boolean) => {
    if (status === "Active") {
      return {
        label: "Verified Expert",
        icon: ShieldCheck,
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    }
    if (status === "approved") {
      return {
        label: "Approved",
        icon: CheckCircle2,
        color: "text-blue-700 bg-blue-50 border-blue-200",
      };
    }
    if (status === "rejected") {
      return {
        label: "Action Needed",
        icon: XCircle,
        color: "text-rose-700 bg-rose-50 border-rose-200",
      };
    }
    if (isRequested) {
      return {
        label: "Under Review",
        icon: completion >= 100 ? CheckCircle2 : Clock,
        color: completion >= 100 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-blue-700 bg-blue-50 border-blue-200",
      };
    }
    if (completion >= 100) {
      return {
        label: "100% Completed",
        icon: CheckCircle2,
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    }
    if (isEligible) {
      return {
        label: "Ready for Verification",
        icon: Sparkles,
        color: "text-blue-700 bg-blue-50 border-blue-200",
      };
    }
    return {
      label: "In Setup",
      icon: Clock,
      color: "text-slate-700 bg-slate-100 border-slate-200",
    };
  };

  const statusConfig = getStatusConfig(profile.status, profile.verificationRequested, isEligibleForVerification);
  const StatusIcon = statusConfig.icon;

  if (loading && !profile.name) {
    return <ExpertPageSkeleton variant="profile" />;
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Executive Top Hero Header Card with Clean Non-Overlaying Layout */}
      <div className="bg-gradient-to-r from-[#D8E9FF] via-[#EFF6FF] to-white border border-blue-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 relative overflow-hidden">
        {/* Subtle ambient gradient mesh */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />

        {/* Identity Row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 min-w-0 text-center sm:text-left relative z-10">
          {/* Avatar with Camera Hover Button */}
          <div className="relative shrink-0 group">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              {(profile.photoUrl && !profile.photoUrl.includes("default-avatar.png") && !profile.photoUrl.includes("ui-avatars.com")) ? (
                <img
                  src={getProfileImageUrl(profile.photoUrl)}
                  alt={profile.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-[#0755E8] uppercase tracking-wider">
                  {(profile.name || user?.name || 'ME').trim().substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Camera Overlay Trigger */}
            <div ref={photoMenuRef} className="absolute -bottom-1 -right-1 z-20">
              <button
                type="button"
                onClick={() => {
                  if (hasCustomPhoto) {
                    setPhotoMenuOpen(prev => !prev);
                  } else {
                    photoInputRef.current?.click();
                  }
                }}
                disabled={uploading}
                className="bg-white p-2 rounded-xl shadow-md border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-[#0755E8] transition-all cursor-pointer group-hover:scale-105 active:scale-95 flex items-center justify-center"
                title={hasCustomPhoto ? "Adjust or change photo" : "Upload profile photo"}
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#0755E8] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {photoMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={handleAdjustCurrentPhoto}
                    className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-[#0755E8] hover:bg-blue-50/80 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 text-[#0755E8]" />
                    <span>Adjust &amp; Crop Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      photoInputRef.current?.click();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload New Photo</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={photoInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelected}
            />
          </div>

          {/* Identity Info */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate capitalize">
                {formatDisplayName(profile.name || user?.name || "Expert Mentor")}
              </h1>
              {profile.status === "Active" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-[#0755E8] bg-blue-50 border border-blue-200/90 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0755E8]" />
                  MOCKEEFY VERIFIED
                </span>
              )}
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span>{profile.title || (user?.title ? user.title : "") || "Title in Setup"}</span>
              {profile.company && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/80">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  {profile.company}
                </span>
              )}
            </div>

            {/* Badges Ribbon */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold border shadow-2xs ${statusConfig.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>

              {(profile.city || profile.country) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200/80">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </span>
              )}

              {profile.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-blue-50/70 text-[#0755E8] border border-blue-200/80">
                  <Code className="w-3.5 h-3.5 text-[#0755E8]" />
                  {profile.category}
                </span>
              )}

              {profile.totalExperience ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                  <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                  {profile.totalExperience} Yrs Exp
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Verification Status Card - Full width & clean flow, preventing any overlay */}
        <div className="w-full pt-3 border-t border-slate-100 relative z-10">
          {profile.status === "Active" ? (
            <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">Verified Expert Status</h3>
                    <p className="text-[11px] text-emerald-700 font-medium">Credentials Approved &amp; Live</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Trust Checkmarks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-900/90 font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>UIDAI Aadhaar Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Work ID at {profile.company || "MNC"} Confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Coach Agreement Signed</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs gap-2">
                {user?.id && (
                  <button
                    onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
                    className="font-bold text-[#0755E8] hover:underline flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Public View ↗
                  </button>
                )}
                <button
                  onClick={() => navigate("/dashboard/availability")}
                  className="font-bold text-emerald-800 hover:text-emerald-950 transition-colors flex items-center gap-1 text-xs cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs"
                >
                  Manage Slots ➜
                </button>
              </div>
            </div>
          ) : isEligibleForVerification ? (
            <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white border border-blue-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-950">Ready for Verification</h3>
                    <p className="text-[11px] font-medium text-blue-700">
                      {completion}% Completed • Criteria Met
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  Eligible
                </span>
              </div>
              <p className="text-xs text-blue-900/80 leading-relaxed font-normal">
                You have fulfilled all verification requirements. Submit your credentials to go live on the platform.
              </p>
              <button
                onClick={handleRequestVerification}
                disabled={requesting}
                className="w-full py-2.5 px-4 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
              >
                {requesting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {requesting ? "Submitting..." : "Verify Profile Now"}
              </button>
            </div>
          ) : (
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-700 text-white rounded-lg shadow-xs">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Verification Criteria</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Need 80% + Mandatory Sections</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#0755E8]">{completion}%</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-600">Completion Score</span>
                  <span className={`font-bold ${completion >= 80 ? "text-emerald-600" : "text-slate-500"}`}>
                    {completion}% / 80%
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-600">Verification Docs</span>
                  <span className={`font-bold ${isVerificationDocDone ? "text-emerald-600" : "text-rose-600"}`}>
                    {isVerificationDocDone ? "✓ Done" : "Required"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-600">Service Agreement</span>
                  <span className={`font-bold ${isAgreementDone ? "text-emerald-600" : "text-rose-600"}`}>
                    {isAgreementDone ? "✓ Signed" : "Required"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. PROFILE MODULES & CREDENTIALS (RICH CONTENT - DYNAMIC DATA) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Profile Modules &amp; Verified Documentation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and configure all active credentials, verification files, and coaching tracks.
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${
            completedModulesCount === 6
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-amber-700 bg-amber-50 border-amber-200"
          }`}>
            {completedModulesCount === 6 ? "All 6 Modules Active" : `${completedModulesCount} of 6 Modules Configured`}
          </span>
        </div>

        {/* 6 Dynamic Module Cards in a 3x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Module 1: Personal Information */}
          <div
            onClick={() => onNavigate?.("personal")}
            className={`group p-5 rounded-2xl border ${
              isPersonalDone ? "border-slate-200/90 hover:border-blue-300" : "border-amber-200/80 bg-amber-50/10 hover:border-amber-300"
            } hover:shadow-md hover:-translate-y-1 transition-all bg-white cursor-pointer flex flex-col justify-between gap-4 text-left`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isPersonalDone ? "bg-blue-50 text-[#0755E8] border-blue-200/80" : "bg-amber-50 text-amber-600 border-amber-200/80"
                } group-hover:scale-105 transition-transform shadow-2xs`}>
                  <User className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isPersonalDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {isPersonalDone ? "✓ Configured" : "Incomplete"}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors">
                  Personal Information
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Contact details, phone number &amp; location</p>
              </div>

              {/* Dynamic Content Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(profile.name || user?.name) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700">
                    <User className="w-3 h-3 text-slate-400" />
                    {formatDisplayName(profile.name || user?.name || "")}
                  </span>
                )}
                {(profile.phone || profile.mobile) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {profile.phone || profile.mobile}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700">
                    Phone Required
                  </span>
                )}
                {(profile.city || profile.country) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {[profile.city, profile.country].filter(Boolean).join(", ")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700">
                    Location Required
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">{isPersonalDone ? "Settings Active" : "Setup Required"}</span>
              <span className="font-bold text-[#0755E8] group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-xs">
                {isPersonalDone ? "Edit Information ➜" : "Complete Setup ➜"}
              </span>
            </div>
          </div>

          {/* Module 2: Category & Coaching Tier */}
          <div
            onClick={() => onNavigate?.("tier")}
            className={`group p-5 rounded-2xl border ${
              isCategoryDone ? "border-slate-200/90 hover:border-indigo-300" : "border-amber-200/80 bg-amber-50/10 hover:border-amber-300"
            } hover:shadow-md hover:-translate-y-1 transition-all bg-white cursor-pointer flex flex-col justify-between gap-4 text-left`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isCategoryDone ? "bg-indigo-50 text-indigo-600 border-indigo-200/80" : "bg-amber-50 text-amber-600 border-amber-200/80"
                } group-hover:scale-105 transition-transform shadow-2xs`}>
                  <Award className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isCategoryDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {isCategoryDone ? "✓ Active Tier" : "Not Selected"}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Category &amp; Pricing Tier
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Seniority level, domain &amp; mock session rates</p>
              </div>

              {/* Dynamic Content Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.category ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50/70 border border-indigo-100 text-[11px] font-bold text-indigo-700">
                    <Code className="w-3 h-3 text-indigo-500" />
                    {profile.category}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700">
                    Domain Not Selected
                  </span>
                )}
                {profile.category && profile.level ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700">
                    <Award className="w-3 h-3 text-slate-400" />
                    {profile.level}
                  </span>
                ) : null}
                {!profile.category && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                    Pricing Tiers Unset
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">{isCategoryDone ? "Pricing Active" : "Setup Required"}</span>
              <span className="font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-xs">
                {isCategoryDone ? "Manage Rates ➜" : "Configure Domain ➜"}
              </span>
            </div>
          </div>

          {/* Module 3: Education & Degrees */}
          <div
            onClick={() => onNavigate?.("education")}
            className={`group p-5 rounded-2xl border ${
              isEducationDone ? "border-slate-200/90 hover:border-emerald-300" : "border-amber-200/80 bg-amber-50/10 hover:border-amber-300"
            } hover:shadow-md hover:-translate-y-1 transition-all bg-white cursor-pointer flex flex-col justify-between gap-4 text-left`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isEducationDone ? "bg-emerald-50 text-emerald-600 border-emerald-200/80" : "bg-amber-50 text-amber-600 border-amber-200/80"
                } group-hover:scale-105 transition-transform shadow-2xs`}>
                  <GraduationCap className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isEducationDone ? `✓ ${profile.education?.length || 1} Verified` : "Not Added"
                }`}>
                  {isEducationDone ? `✓ ${profile.education?.length || 1} Verified` : "Not Added"}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Education &amp; Degrees
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Colleges, academic degrees &amp; graduations</p>
              </div>

              {/* Dynamic Content Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.isArray(profile.education) && profile.education.length > 0 ? (
                  profile.education.slice(0, 2).map((edu: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50/70 border border-emerald-100 text-[11px] font-semibold text-emerald-800">
                      <GraduationCap className="w-3 h-3 text-emerald-600" />
                      {[edu.degree, edu.institution || edu.college].filter(Boolean).join(" • ") || "Academic Degree"}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700">
                      No Degrees Added
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                      Add College / Graduation
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">{isEducationDone ? "Credentials Active" : "Action Required"}</span>
              <span className="font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-xs">
                {isEducationDone ? "Manage Degrees ➜" : "+ Add Education ➜"}
              </span>
            </div>
          </div>

          {/* Module 4: Professional Experience */}
          <div
            onClick={() => onNavigate?.("profession")}
            className={`group p-5 rounded-2xl border ${
              isExperienceDone ? "border-slate-200/90 hover:border-purple-300" : "border-amber-200/80 bg-amber-50/10 hover:border-purple-300"
            } hover:shadow-md hover:-translate-y-1 transition-all bg-white cursor-pointer flex flex-col justify-between gap-4 text-left`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isExperienceDone ? "bg-purple-50 text-purple-600 border-purple-200/80" : "bg-amber-50 text-amber-600 border-amber-200/80"
                } group-hover:scale-105 transition-transform shadow-2xs`}>
                  <Briefcase className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isExperienceDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {isExperienceDone ? "✓ Active" : "Not Added"}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  Professional Experience
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Current role, corporate tenure &amp; companies</p>
              </div>

              {/* Dynamic Content Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.company ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50/70 border border-purple-100 text-[11px] font-bold text-purple-800">
                    <Building2 className="w-3 h-3 text-purple-600" />
                    {profile.company}
                  </span>
                ) : null}
                {profile.title ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700">
                    {profile.title}
                  </span>
                ) : null}
                {profile.totalExperience !== "" && profile.totalExperience !== undefined && profile.totalExperience !== null ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700">
                    {profile.totalExperience} Yrs Exp.
                  </span>
                ) : null}
                {!profile.company && !profile.title && (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-700">
                      No Experience Added
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                      Add Current Role &amp; Company
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">{isExperienceDone ? "History Verified" : "Action Required"}</span>
              <span className="font-bold text-purple-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-xs">
                {isExperienceDone ? "Update Experience ➜" : "+ Add Experience ➜"}
              </span>
            </div>
          </div>

          {/* Module 5: Verification Documents */}
          <div
            onClick={() => onNavigate?.("verification")}
            className={`group p-5 rounded-2xl border ${
              isVerificationDocDone ? "border-slate-200/90 hover:border-amber-300" : "border-rose-200/80 bg-rose-50/10 hover:border-rose-300"
            } hover:shadow-md hover:-translate-y-1 transition-all bg-white cursor-pointer flex flex-col justify-between gap-4 text-left`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isVerificationDocDone ? "bg-amber-50 text-amber-700 border-amber-200/80" : "bg-rose-50 text-rose-600 border-rose-200/80"
                } group-hover:scale-105 transition-transform shadow-2xs`}>
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isVerificationDocDone
                    ? (profile.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200")
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {isVerificationDocDone ? (profile.status === "Active" ? "✓ Approved" : "✓ Uploaded") : "Required"}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                  Verification Documents
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Government ID, Corporate ID &amp; LinkedIn</p>
              </div>

              {/* Dynamic Content Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {profile.verification?.aadhar?.isVerified || profile.verification?.aadhar?.url || profile.verification?.aadhar?.number ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                    ✓ Aadhaar Added
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[11px] font-medium text-rose-700">
                    Aadhaar Pending
                  </span>
                )}
                {profile.verification?.companyId?.url ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                    ✓ Work ID Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[11px] font-medium text-rose-700">
                    Work ID Pending
                  </span>
                )}
                {profile.verification?.linkedin?.url && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700">
                    ✓ LinkedIn Linked
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">{isVerificationDocDone ? "Security Submitted" : "Verification Required"}</span>
              <span className="font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-xs">
                {isVerificationDocDone ? "Inspect Credentials ➜" : "Upload Documents ➜"}
              </span>
            </div>
          </div>

          {/* Module 6: Master Service Agreement */}
          <div
            onClick={() => onNavigate?.("agreement")}
            className={`group p-5 rounded-2xl border ${
              isAgreementDone ? "border-slate-200/90 hover:border-slate-400" : "border-rose-200/80 bg-rose-50/10 hover:border-rose-300"
            } hover:shadow-md hover:-translate-y-1 transition-all bg-white cursor-pointer flex flex-col justify-between gap-4 text-left`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isAgreementDone ? "bg-slate-100 text-slate-700 border-slate-200/80" : "bg-rose-50 text-rose-600 border-rose-200/80"
                } group-hover:scale-105 transition-transform shadow-2xs`}>
                  <FileText className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isAgreementDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {isAgreementDone ? "✓ Signed" : "Required"}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                  Master Service Agreement
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Signed coach terms &amp; candidate confidentiality</p>
              </div>

              {/* Dynamic Content Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {isAgreementDone ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Digitally Signed &amp; Active
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700">
                      Candidate NDA Active
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[11px] font-medium text-rose-700">
                      Agreement Pending Signature
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                      Sign Terms to Activate
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400">{isAgreementDone ? "Legal Standard Met" : "Mandatory Signature"}</span>
              <span className="font-bold text-slate-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-xs">
                {isAgreementDone ? "Review Agreement ➜" : "Sign Agreement ➜"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        fileName={cropperFileName}
        title="Adjust &amp; Crop Profile Photo"
        onClose={() => setCropperOpen(false)}
        onCropComplete={(croppedFile) => {
          handlePhotoUpload(croppedFile);
        }}
      />
    </div>
  );
});

ExpertProfileHeader.displayName = "ExpertProfileHeader";

export default ExpertProfileHeader;
