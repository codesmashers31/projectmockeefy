import { useEffect, useRef, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import axios from '../lib/axios';
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  Camera,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  BookOpen,
  Briefcase,
  Award,
  Calendar,
  ShieldCheck,
  Send,
  Lock,
  FileText,
  Check,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
  Globe,
  Building2,
  GraduationCap,
  Crop,
  Upload
} from "lucide-react";
import { compressImage, compressOriginalImage, getProfileImageUrl } from "../lib/imageUtils";
import ImageCropperModal from "./ImageCropperModal";

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
    verificationRequested: false
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
    // Open cropper with the FULL original uncropped image so user can crop again with all pixels intact
    const rawSrc = profile.originalPhotoUrl || profile.photoUrl;
    if (!rawSrc) return;
    setSelectedOriginalFile(null); // Keep original photo already saved on server
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
          verificationRequested: Boolean(p.verificationRequested || res.data.verificationRequested)
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

    setUploading(true);
    try {
      const compressedCrop = await compressImage(file, 600, 0.85);
      const formData = new FormData();
      formData.append("photo", compressedCrop);

      // If user uploaded a brand new file, include the high-resolution original file
      if (selectedOriginalFile) {
        const compressedOrig = await compressOriginalImage(selectedOriginalFile);
        formData.append("originalPhoto", compressedOrig);
      } else if (profile.originalPhotoUrl) {
        // If re-cropping existing photo, preserve original photo url
        formData.append("originalPhotoUrl", profile.originalPhotoUrl);
      }

      const res = await axios.post("/api/expert/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.success) {
        toast.success("Profile photo updated");
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

  const isVerificationDocDone = !missingSections.includes("Verification Documents");
  const isAgreementDone = !missingSections.includes("Service Agreement");
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
        icon: Clock,
        color: "text-amber-700 bg-amber-50 border-amber-200",
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
      icon: AlertCircle,
      color: "text-slate-700 bg-slate-100 border-slate-200",
    };
  };

  const statusConfig = getStatusConfig(profile.status, profile.verificationRequested, isEligibleForVerification);
  const StatusIcon = statusConfig.icon;

  // Setup roadmap definitions for unverified/rejected states
  const roadmapSections = [
    {
      id: "personal",
      name: "Personal Info",
      backendKey: "Personal Information",
      desc: "Contact details, phone & location",
      icon: User,
      mandatory: false,
      onClick: () => onNavigate?.("personal")
    },
    {
      id: "tier",
      name: "Category & Level",
      backendKey: "",
      desc: "Domain category, seniority & rates",
      icon: Award,
      mandatory: false,
      onClick: () => onNavigate?.("tier")
    },
    {
      id: "education",
      name: "Education & Degrees",
      backendKey: "Education",
      desc: "Academic degrees & institutions",
      icon: GraduationCap,
      mandatory: false,
      onClick: () => onNavigate?.("education")
    },
    {
      id: "profession",
      name: "Experience",
      backendKey: "Professional Details",
      desc: "Current role, companies & history",
      icon: Briefcase,
      mandatory: false,
      onClick: () => onNavigate?.("profession")
    },
    {
      id: "verification",
      name: "Verification Docs",
      backendKey: "Verification Documents",
      desc: "Govt ID (Aadhaar), Company ID & LinkedIn",
      icon: ShieldCheck,
      mandatory: true,
      onClick: () => onNavigate?.("verification")
    },
    {
      id: "agreement",
      name: "Service Agreement",
      backendKey: "Service Agreement",
      desc: "Signed coach terms & signature",
      icon: FileText,
      mandatory: true,
      onClick: () => onNavigate?.("agreement")
    },
    {
      id: "photo",
      name: "Profile Photo",
      backendKey: "Profile Photo",
      desc: "Clear professional headshot",
      icon: Camera,
      mandatory: false,
      onClick: () => photoInputRef.current?.click()
    },
    {
      id: "availability",
      name: "Availability Slots",
      backendKey: "Availability",
      desc: "Weekly schedule for interview slots",
      icon: Calendar,
      mandatory: false,
      onClick: () => navigate("/dashboard/availability")
    }
  ];

  if (loading && !profile.name) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[360px] bg-white rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-semibold">Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Executive Hero Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left: Avatar & Identity Details */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 min-w-0 flex-1 text-center sm:text-left">
          {/* Avatar with Camera Overlay Button */}
          <div className="relative shrink-0 group">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-200 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              {(profile.photoUrl && !profile.photoUrl.includes("default-avatar.png") && !profile.photoUrl.includes("ui-avatars.com")) ? (
                <img
                  src={getProfileImageUrl(profile.photoUrl)}
                  alt={profile.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-blue-700 uppercase tracking-wider">
                  {(profile.name || user?.name || 'ME').trim().substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Quick Upload / Adjust Button & Popover */}
            <div ref={photoMenuRef} className="absolute -bottom-1.5 -right-1.5 z-20">
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
                className="bg-white p-1.5 rounded-xl shadow-md border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-all cursor-pointer group-hover:scale-105 active:scale-95 flex items-center justify-center"
                title={hasCustomPhoto ? "Adjust or change photo" : "Upload profile photo"}
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>

              {/* Photo Options Dropdown */}
              {photoMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={handleAdjustCurrentPhoto}
                    className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 text-blue-600" />
                    <span>Adjust & Crop Photo</span>
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

          {/* Identity info */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">
                {profile.name || user?.name || "Expert"}
              </h1>
              {profile.status === "Active" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200/80 shadow-2xs">
                  <svg className="w-3.5 h-3.5 fill-current text-blue-600 shrink-0" viewBox="0 0 24 24">
                    <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7l-3.61.81.34 3.68L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  VERIFIED
                </span>
              )}
            </div>

            <p className="text-sm font-medium text-slate-600 truncate max-w-xl">
              {profile.title ? (
                <>
                  <span className="font-semibold text-slate-800">{profile.title}</span>
                  {profile.company && <span className="text-slate-500"> at {profile.company}</span>}
                </>
              ) : (
                <span className="text-slate-400 italic">No headline set (complete in Personal Info)</span>
              )}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-2xs ${statusConfig.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>

              {(profile.city || profile.country) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200/60">
                  <Globe className="w-3 h-3 text-slate-400" />
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </span>
              )}

              {profile.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200/60">
                  {profile.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Consolidated Verification Status & Action Anchor */}
        <div className="w-full lg:w-92 shrink-0">
          {profile.status === "Active" ? (
            /* Active Expert Certificate Card */
            <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 border border-emerald-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">Verified Expert</h3>
                    <p className="text-[11px] text-emerald-700 font-medium">Credentials Approved</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-emerald-900/80 leading-relaxed font-normal">
                Your profile is verified and discoverable. Candidates can search and book interview sessions with you.
              </p>
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800">
                <span className="font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Live on Mockeefy
                </span>
                <button
                  onClick={() => navigate("/dashboard/availability")}
                  className="font-bold text-emerald-700 hover:text-emerald-900 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                >
                  Manage Slots ➜
                </button>
              </div>
            </div>
          ) : profile.verificationRequested && profile.status === "pending" ? (
            /* Application Under Review Card */
            <div className="bg-gradient-to-br from-amber-50/90 via-amber-50/30 to-slate-50 border border-amber-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">Review In Progress</h3>
                    <p className="text-[11px] text-amber-700 font-medium">Pending Admin Review</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  In Queue
                </span>
              </div>
              <p className="text-xs text-amber-900/80 leading-relaxed font-normal">
                Your profile is in the admin review queue. Submitted documents and agreement are being validated.
              </p>
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-800 font-semibold">
                <span>Verification Queue</span>
                <span className="text-[11px] text-amber-600 font-medium">Est. 24–48 hours</span>
              </div>
            </div>
          ) : isEligibleForVerification ? (
            /* Ready for Verification CTA Card */
            <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 border border-blue-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-950">Ready for Verification</h3>
                    <p className="text-[11px] text-blue-700 font-medium">{completion}% Completed • Requirements Met</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  Eligible
                </span>
              </div>
              <p className="text-xs text-blue-900/80 leading-relaxed font-normal">
                You have fulfilled all requirements (Score &ge; 80%, Verification Documents, and Service Agreement).
              </p>
              <button
                onClick={handleRequestVerification}
                disabled={requesting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
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
            /* Incomplete Setup Status & Requirements Card */
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
                <span className="text-xs font-extrabold text-blue-600">{completion}%</span>
              </div>

              {/* Requirements Checklist */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-600">Completion Score</span>
                  <span className={`font-bold flex items-center gap-1 ${completion >= 80 ? "text-emerald-600" : "text-slate-500"}`}>
                    {completion >= 80 ? <Check className="w-3.5 h-3.5" /> : `${completion}% / 80%`}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-600">Verification Docs (Mandatory)</span>
                  <span className={`font-bold flex items-center gap-1 ${isVerificationDocDone ? "text-emerald-600" : "text-rose-600"}`}>
                    {isVerificationDocDone ? <Check className="w-3.5 h-3.5" /> : "Required"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-600">Service Agreement (Mandatory)</span>
                  <span className={`font-bold flex items-center gap-1 ${isAgreementDone ? "text-emerald-600" : "text-rose-600"}`}>
                    {isAgreementDone ? <Check className="w-3.5 h-3.5" /> : "Required"}
                  </span>
                </div>
              </div>

              <button
                disabled
                className="w-full py-2 px-3 bg-slate-200/80 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                title="Reach 80% score, upload verification documents, and sign service agreement"
              >
                <Lock className="w-3.5 h-3.5" />
                Complete Requirements to Verify
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Body Content */}
      {profile.status === "Active" ? (
        /* Executive Overview for Active Experts */
        <div className="space-y-6">
          {/* Row 1: Key Executive Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Public Standing */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Public Standing</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Globe className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Active & Discoverable</p>
                <p className="text-xs text-slate-500 mt-0.5">Your profile appears in candidate searches.</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center text-xs font-semibold text-emerald-700 gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Verified Expert Badge Active
              </div>
            </div>

            {/* Card 2: Coaching Tier */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coaching Tier</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 truncate">
                  {profile.level || "Intermediate Mentor"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {profile.category || "General Coaching"}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => onNavigate?.("tier")}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Manage Tier & Category ➜
                </button>
              </div>
            </div>

            {/* Card 3: Experience */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Experience</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {profile.totalExperience ? `${profile.totalExperience} Years Exp.` : "Professional"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {profile.company ? `At ${profile.company}` : (profile.industry || "Industry Expert")}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => onNavigate?.("profession")}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Update Experience ➜
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Profile Modules Grid */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Profile Sections</h3>
                <p className="text-xs text-slate-500 mt-0.5">Quickly jump to any section to manage your details and documents.</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                All Sections Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
              {[
                { id: "personal", title: "Personal Information", icon: User, desc: "Contact details, phone & location" },
                { id: "tier", title: "Category & Level", icon: Award, desc: "Seniority level, domain & rates" },
                { id: "education", title: "Education & Degrees", icon: GraduationCap, desc: "Colleges, degrees & graduation year" },
                { id: "profession", title: "Experience", icon: Briefcase, desc: "Current job, past companies & history" },
                { id: "verification", title: "Verification Documents", icon: ShieldCheck, desc: "Government ID, Company ID & LinkedIn" },
                { id: "agreement", title: "Service Agreement", icon: FileText, desc: "Signed digital agreement & terms" },
              ].map((sec) => (
                <div
                  key={sec.id}
                  onClick={() => onNavigate?.(sec.id)}
                  className="group p-4 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all bg-white cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 transition-colors">
                        <sec.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {sec.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{sec.desc}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 text-[11px]">
                      <Check className="w-3 h-3 text-emerald-600" /> Active
                    </span>
                    <span className="font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-xs">
                      Edit ➜
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Setup Roadmap for Incomplete / Pending / Rejected Experts */
        <div className="space-y-6">
          {/* Admin Rejection Alert Banner (Only if rejected) */}
          {profile.status === "rejected" && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-rose-800">
                <XCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-base">Updates Required by Admin</h3>
              </div>
              <p className="text-sm text-rose-900 bg-white/90 p-4 rounded-xl border border-rose-100 leading-relaxed font-medium">
                {profile.rejectionReason || "Please update your profile details as requested by the admin team."}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <span className="text-xs text-rose-700 font-medium">
                  Review the sections below, update the required fields, and resubmit for verification.
                </span>
                <button
                  onClick={handleResubmit}
                  disabled={loading || !isEligibleForVerification}
                  className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 ${
                    isEligibleForVerification
                      ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Resubmit for Verification
                </button>
              </div>
            </div>
          )}

          {/* Section Roadmap Grid */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 md:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Profile Setup Roadmap</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete sections to reach at least 80% completion score and unlock verification.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full w-fit">
                {Math.max(0, 8 - missingSections.length)} of 8 Sections Completed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {roadmapSections.map((sec) => {
                const isMissing = sec.backendKey ? missingSections.includes(sec.backendKey) : false;
                const IconComponent = sec.icon;

                return (
                  <div
                    key={sec.id}
                    onClick={sec.onClick}
                    className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isMissing
                        ? sec.mandatory
                          ? "bg-rose-50/30 border-rose-200 hover:border-rose-300 hover:bg-rose-50/50"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
                        : "bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${
                          isMissing
                            ? sec.mandatory ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                            : "bg-emerald-50 text-emerald-600"
                        }`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        {sec.mandatory && (
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isMissing
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            Mandatory
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {sec.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{sec.desc}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      {isMissing ? (
                        <span className={`text-[11px] font-bold ${sec.mandatory ? "text-rose-600" : "text-amber-600"}`}>
                          Action Required
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Completed
                        </span>
                      )}

                      <span className={`font-bold text-xs flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform ${
                        isMissing ? "text-slate-700" : "text-blue-600"
                      }`}>
                        {isMissing ? "Complete ➜" : "Edit ➜"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        fileName={cropperFileName}
        title="Adjust & Crop Profile Photo"
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