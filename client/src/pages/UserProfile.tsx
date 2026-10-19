import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Upload,
  Camera,
  Trash2,
  FileText,
  CheckCircle2,
  Star,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileCheck,
  Sparkles,
  User as UserIcon,
  X,
  Calendar,
  Award,
  Bookmark,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  ShieldCheck,
  Heart,
} from "lucide-react";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { getProfileImageUrl, compressImage } from "../lib/imageUtils";
import { Link } from "react-router-dom";

interface ResumeItem {
  _id: string;
  title: string;
  template?: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function UserProfile() {
  const { user, fetchProfile } = useAuth();
  const userId = user?.id || user?._id || user?.userId;

  // Image Upload States
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Resume Management States
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeTitle, setResumeTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Stop global loader on mount
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: false } }));
  }, []);

  // Fetch Resumes
  const loadResumes = async () => {
    if (!userId) return;
    try {
      setIsLoadingResumes(true);
      const res = await axios.get("/api/user/resumes", {
        headers: { userid: userId },
      });
      if (res.data?.success) {
        setResumes(res.data.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load resumes:", err);
      toast.error("Could not load your resumes. Please refresh the page.");
    } finally {
      setIsLoadingResumes(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [userId]);

  // Fetch candidate sessions to calculate finished interviews and stats
  const { data: candidateSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["candidateProfileSessions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await axios.get(`/api/sessions/candidate/${userId}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  // Calculate Finished / Completed Interviews
  const completedSessions = useMemo(() => {
    return candidateSessions.filter(
      (s: any) => (s.status || "").toLowerCase() === "completed"
    );
  }, [candidateSessions]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return candidateSessions.filter(
      (s: any) =>
        new Date(s.startTime) > now &&
        !["cancelled", "completed"].includes((s.status || "").toLowerCase())
    );
  }, [candidateSessions]);

  const completedCount = completedSessions.length;

  // Calculate Unlocked Certificates (Categories with 3+ completed sessions)
  const certificatesCount = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    completedSessions.forEach((s: any) => {
      const cat = s.category || s.expertDetails?.category || "General";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    return Object.values(categoryMap).filter((count) => count >= 3).length;
  }, [completedSessions]);

  // Recent completed sessions for preview
  const recentCompleted = useMemo(() => {
    return [...completedSessions]
      .sort(
        (a: any, b: any) =>
          new Date(b.startTime || b.date || 0).getTime() -
          new Date(a.startTime || a.date || 0).getTime()
      )
      .slice(0, 2);
  }, [completedSessions]);

  const practiceMinutes = completedCount * 45;
  const sessionsToNextCert = completedCount === 0 ? 3 : 3 - (completedCount % 3 === 0 ? 0 : completedCount % 3);
  const milestoneProgress =
    completedCount === 0
      ? 0
      : Math.round(((completedCount % 3 === 0 ? 3 : completedCount % 3) / 3) * 100);

  // Sync Saved Mentors Count from localStorage
  const [savedCount, setSavedCount] = useState<number>(0);
  useEffect(() => {
    const updateSavedCount = () => {
      try {
        const saved = localStorage.getItem("savedExperts");
        if (saved) {
          const parsed = JSON.parse(saved);
          setSavedCount(Array.isArray(parsed) ? parsed.length : 0);
        } else {
          setSavedCount(0);
        }
      } catch (e) {
        setSavedCount(0);
      }
    };

    updateSavedCount();
    window.addEventListener("storage", updateSavedCount);
    return () => window.removeEventListener("storage", updateSavedCount);
  }, []);

  // Handle Profile Image Selection & Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setIsUploadingImage(true);
      const compressed = await compressImage(file, 600, 0.7);
      const localUrl = URL.createObjectURL(compressed);
      setImagePreview(localUrl);

      const formData = new FormData();
      formData.append("profileImage", compressed);

      const res = await axios.post("/api/user/profile/image", formData, {
        headers: {
          userid: userId,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        toast.success("Profile photo updated successfully!");
        await fetchProfile();
      } else {
        toast.error(res.data?.message || "Failed to update profile image");
      }
    } catch (err: any) {
      console.error("Image upload error:", err);
      toast.error(err.response?.data?.message || "Error uploading image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  // Handle Remove Profile Image
  const handleRemoveImage = async () => {
    if (!userId) return;
    try {
      setIsDeletingImage(true);
      const res = await axios.delete("/api/user/profile/image", {
        headers: { userid: userId },
      });
      if (res.data?.success) {
        setImagePreview(null);
        toast.success("Profile photo removed.");
        await fetchProfile();
      } else {
        toast.error(res.data?.message || "Failed to remove image");
      }
    } catch (err: any) {
      console.error("Failed to remove profile image:", err);
      toast.error("Error removing photo.");
    } finally {
      setIsDeletingImage(false);
    }
  };

  // Handle Drag & Drop for Resumes
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleSelectedResumeFile(file);
  };

  const handleResumeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSelectedResumeFile(file);
  };

  const handleSelectedResumeFile = (file: File) => {
    const validExtensions = [".pdf", ".doc", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error("Invalid file format. Please upload a PDF, DOC, or DOCX file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setSelectedFile(file);
    if (!resumeTitle) {
      setResumeTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  // Upload Resume File
  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !userId) {
      toast.error("Please select a resume file to upload.");
      return;
    }

    try {
      setIsUploadingResume(true);
      const formData = new FormData();
      formData.append("resume", selectedFile);
      formData.append("title", resumeTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, ""));

      const res = await axios.post("/api/user/resumes/upload", formData, {
        headers: {
          userid: userId,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        toast.success("Resume uploaded successfully!");
        setSelectedFile(null);
        setResumeTitle("");
        if (resumeInputRef.current) resumeInputRef.current.value = "";
        await loadResumes();
      } else {
        toast.error(res.data?.message || "Failed to upload resume.");
      }
    } catch (err: any) {
      console.error("Resume upload failed:", err);
      toast.error(err.response?.data?.message || "Failed to upload resume file.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  // Set Default Resume
  const handleSetDefault = async (resumeId: string) => {
    if (!userId) return;
    try {
      const res = await axios.patch(`/api/user/resumes/${resumeId}/default`, {}, {
        headers: { userid: userId },
      });
      if (res.data?.success) {
        toast.success("Default resume updated for mock interviews!");
        setResumes((prev) =>
          prev.map((r) => ({
            ...r,
            isDefault: r._id === resumeId,
          }))
        );
      }
    } catch (err: any) {
      console.error("Failed to set default resume:", err);
      toast.error("Could not set default resume.");
    }
  };

  // Delete Resume
  const handleDeleteResume = async (resumeId: string) => {
    if (!userId) return;
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      const res = await axios.delete(`/api/user/resumes/${resumeId}`, {
        headers: { userid: userId },
      });
      if (res.data?.success) {
        toast.success("Resume deleted.");
        setResumes((prev) => prev.filter((r) => r._id !== resumeId));
      }
    } catch (err: any) {
      console.error("Failed to delete resume:", err);
      toast.error("Could not delete resume.");
    }
  };

  // User display initials
  const initials = (user?.name || "Candidate")
    .trim()
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentPhoto = imagePreview || (user?.profileImage ? getProfileImageUrl(user.profileImage) : null);
  const hasPhoto = !!currentPhoto && !currentPhoto.includes("mockeefy.png") && !currentPhoto.includes("default-avatar.png");

  return (
    <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-[28px] p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden pb-16 font-sans text-left">
      {/* Decorative gradient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />

      <div className="w-full space-y-8 relative z-10">

        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Profile & Resumes
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Update your photo and manage multiple resumes for technical mock interviews.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {isLoadingSessions ? "..." : `${completedCount} ${completedCount === 1 ? "Interview Finished" : "Interviews Finished"}`}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-[#0755E8] border border-blue-200/80 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0755E8]" />
              <span>Verified Candidate</span>
            </span>
          </div>
        </div>

        {/* 2. SECTION 1: PROFILE PHOTO UPDATE */}
        <section className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            {/* Avatar & User Details */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                  {hasPhoto ? (
                    <img
                      src={currentPhoto!}
                      alt={user?.name || "Profile Photo"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#EAF2FF] text-[#0755E8] font-black text-2xl flex items-center justify-center select-none">
                      {initials}
                    </div>
                  )}

                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Camera Quick Button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#0755E8] hover:bg-[#0645C7] text-white flex items-center justify-center shadow-xs border-2 border-white transition-all active:scale-90 cursor-pointer"
                  title="Upload new photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1 leading-snug">
                <h2 className="text-lg font-black text-slate-900 truncate">
                  {user?.name || "Candidate Name"}
                </h2>
                <p className="text-xs sm:text-[13px] font-medium text-slate-500 truncate mt-0.5">
                  {user?.email || "candidate@mockeefy.com"}
                </p>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[#0755E8] text-[11px] font-bold uppercase tracking-tight">
                    Candidate Profile
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Visible to interview experts
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {isLoadingSessions ? "..." : `${completedCount} ${completedCount === 1 ? "Interview Finished" : "Interviews Finished"}`}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2.5 sm:self-center">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleImageFileChange}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImage}
                className="px-4 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Photo</span>
                  </>
                )}
              </button>

              {hasPhoto && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isDeletingImage || isUploadingImage}
                  className="px-3.5 py-2.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {isDeletingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 2. INTERACTIVE INTERVIEW STATS & CANDIDATE METRICS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0755E8]" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Interview Track Record &amp; Activity
              </h2>
            </div>
            <Link
              to="/my-sessions"
              className="text-xs font-bold text-[#0755E8] hover:text-[#0645C7] hover:underline inline-flex items-center gap-1 transition-colors"
            >
              <span>View All Sessions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4 Interactive Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Finished Interviews Card (Primary Requested Metric) */}
            <Link
              to="/my-sessions"
              className="group relative bg-white hover:bg-gradient-to-b hover:from-emerald-50/30 hover:to-white border border-slate-200/90 hover:border-emerald-400/80 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Finished
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                    {isLoadingSessions ? "..." : completedCount}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    {completedCount === 1 ? "session" : "sessions"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1.5 flex items-center justify-between">
                  <span>Finished Mock Tests</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </p>
              </div>
            </Link>

            {/* 2. Upcoming / Scheduled Sessions */}
            <Link
              to="/my-sessions"
              className="group relative bg-white hover:bg-gradient-to-b hover:from-blue-50/30 hover:to-white border border-slate-200/90 hover:border-[#0755E8]/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(7,85,232,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#0755E8] border border-[#93B8FF]/60 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
                  <Calendar className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10.5px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full border border-[#93B8FF]/50 uppercase tracking-wider">
                  Upcoming
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                    {isLoadingSessions ? "..." : upcomingSessions.length}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    {upcomingSessions.length === 1 ? "session" : "sessions"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1.5 flex items-center justify-between">
                  <span>Scheduled Slots</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0755E8] group-hover:translate-x-1 transition-all" />
                </p>
              </div>
            </Link>

            {/* 3. Verified Certificates Earned */}
            <Link
              to="/certificates"
              className="group relative bg-white hover:bg-gradient-to-b hover:from-amber-50/30 hover:to-white border border-slate-200/90 hover:border-amber-400/70 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(245,158,11,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
                  <Award className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60 uppercase tracking-wider">
                  Certificates
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                    {isLoadingSessions ? "..." : certificatesCount}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    unlocked
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1.5 flex items-center justify-between">
                  <span>Track Certifications</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                </p>
              </div>
            </Link>

            {/* 4. Saved Interview Experts */}
            <Link
              to="/saved-experts"
              className="group relative bg-white hover:bg-gradient-to-b hover:from-blue-50/30 hover:to-white border border-slate-200/90 hover:border-blue-400/70 rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(7,85,232,0.15)] flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs">
                  <Bookmark className="w-5 h-5 stroke-[2.2] fill-[#0755E8] text-[#0755E8]" />
                </div>
                <span className="text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 uppercase tracking-wider">
                  Saved
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                    {savedCount}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    {savedCount === 1 ? "expert" : "experts"}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1.5 flex items-center justify-between">
                  <span>Saved Interview Experts</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </p>
              </div>
            </Link>
          </div>

          {/* Interactive Milestone & Mock Practice Banner */}
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#0755E8] text-white text-[10.5px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  {completedCount > 0 ? "Track Mastery Level" : "Mock Interview Goal"}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {completedCount === 0
                    ? "Complete 3 interviews in any track to unlock your verified Certificate"
                    : `${completedCount} Mock ${completedCount === 1 ? "Interview" : "Interviews"} Finished • ~${practiceMinutes} mins Practice`}
                </span>
              </div>

              {/* Progress bar toward certificate */}
              <div className="space-y-1 max-w-lg">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>
                    {completedCount === 0
                      ? "Milestone: 0 / 3 Mock Interviews"
                      : `Milestone: ${completedCount % 3 === 0 && completedCount > 0 ? 3 : completedCount % 3} of 3 sessions completed`}
                  </span>
                  <span className="text-[#0755E8] font-bold">{milestoneProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0755E8] to-[#2563EB] rounded-full transition-all duration-500"
                    style={{ width: `${milestoneProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
              <Link
                to="/"
                className="px-4 py-2.5 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold transition-all shadow-xs active:scale-95 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>{completedCount > 0 ? "Book Next Mock Interview" : "Schedule 1st Mock Interview"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Recent Finished Sessions Preview (If Any Finished) */}
          {recentCompleted.length > 0 && (
            <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recent Finished Sessions
                  </h3>
                </div>
                <Link
                  to="/my-sessions"
                  className="text-xs font-bold text-[#0755E8] hover:underline"
                >
                  View Notes &amp; Feedback
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentCompleted.map((session: any) => {
                  const expertName =
                    session.expertDetails?.name || session.expert || "Senior Interview Expert";
                  const role =
                    session.expertDetails?.role || session.role || "Technical Expert";
                  const company =
                    session.expertDetails?.company || session.company || "";
                  const dateStr = session.startTime
                    ? new Date(session.startTime).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Completed";
                  const category = session.category || "Technical Interview";

                  return (
                    <div
                      key={session._id || session.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center font-black text-sm shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {expertName}
                          </p>
                          <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                            {role} {company ? `• ${company}` : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {category}
                            </span>
                            <span className="text-[10.5px] text-slate-400 font-medium">
                              {dateStr}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        to="/my-sessions"
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#EAF2FF] text-[#0755E8] border border-slate-200 hover:border-[#93B8FF] text-[11px] font-bold transition-all shrink-0 whitespace-nowrap shadow-2xs"
                      >
                        Review
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 3. SECTION 2: MULTI-RESUME UPLOAD & MANAGEMENT */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-[#0755E8]" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                  Resumes
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EAF2FF] text-[#0755E8] text-xs font-black">
                  {resumes.length}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Upload multiple tailored resumes for different roles. Interview experts will review your default resume.
              </p>
            </div>

            <Link
              to="/resume-builder"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#0755E8] rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0755E8]" />
              <span>Build with AI</span>
            </Link>
          </div>

          {/* Upload Dropzone Box */}
          <form
            onSubmit={handleUploadResume}
            className={`bg-slate-50/70 border-2 border-dashed rounded-2xl p-6 sm:p-7 transition-all ${
              isDragging ? "border-[#0755E8] bg-blue-50/40" : "border-slate-200 hover:border-slate-300"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleResumeFileSelect}
            />

            <div className="flex flex-col items-center justify-center text-center">
              <div
                onClick={() => resumeInputRef.current?.click()}
                className="w-13 h-13 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF] flex items-center justify-center text-[#0755E8] mb-3 cursor-pointer hover:scale-105 transition-transform shadow-2xs"
              >
                <Upload className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-extrabold text-slate-900">
                {selectedFile ? (
                  <span className="text-[#0755E8]">{selectedFile.name}</span>
                ) : (
                  <>Drag & drop your resume or <span className="text-[#0755E8] underline cursor-pointer" onClick={() => resumeInputRef.current?.click()}>browse files</span></>
                )}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Supported formats: PDF, DOC, DOCX (Max size: 10MB)
              </p>

              {/* Selected File Details & Custom Label */}
              {selectedFile && (
                <div className="w-full max-w-md mt-4 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-left animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#0755E8] shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setResumeTitle("");
                        if (resumeInputRef.current) resumeInputRef.current.value = "";
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-tight block">
                      Target Role / Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Frontend Engineer, Full Stack Resume"
                      value={resumeTitle}
                      onChange={(e) => setResumeTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0755E8] font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploadingResume}
                    className="w-full mt-3 py-2 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingResume ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading Resume...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload & Save Resume</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* List of Uploaded Resumes */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-extrabold text-slate-900">
              Uploaded Resumes ({resumes.length})
            </h3>

            {isLoadingResumes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-slate-50 border border-slate-200/70 animate-pulse" />
                ))}
              </div>
            ) : resumes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resumes.map((resume) => {
                  const dateStr = resume.updatedAt
                    ? new Date(resume.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recently";

                  return (
                    <div
                      key={resume._id}
                      className={`group relative bg-white rounded-2xl border transition-all p-4.5 flex flex-col justify-between shadow-2xs hover:shadow-xs text-left ${
                        resume.isDefault
                          ? "border-[#0755E8]/60 bg-blue-50/20 shadow-[0_4px_16px_-4px_rgba(7,85,232,0.08)]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        {/* Top Row: Icon + Title + Default Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] border border-[#93B8FF] text-[#0755E8] flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1 leading-tight">
                              <h4 className="text-sm font-extrabold text-slate-900 truncate">
                                {resume.title || "Untitled Resume"}
                              </h4>
                              <p className="text-[11.5px] text-slate-500 font-medium truncate mt-0.5">
                                {resume.fileName || `${resume.title || "Resume"}.pdf`}
                              </p>
                            </div>
                          </div>

                          {resume.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0755E8] border border-blue-200 text-[10px] font-black uppercase tracking-tight shrink-0">
                              <Star className="w-3 h-3 fill-[#0755E8]" />
                              <span>Default</span>
                            </span>
                          )}
                        </div>

                        {/* File Details Chips */}
                        <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400 font-medium">
                          <span>Updated {dateStr}</span>
                          {resume.fileSize && (
                            <>
                              <span>•</span>
                              <span>{resume.fileSize}</span>
                            </>
                          )}
                          {resume.template && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-slate-600">{resume.template} Template</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-3.5 mt-3.5 border-t border-slate-100">
                        <div>
                          {!resume.isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(resume._id)}
                              className="text-xs font-bold text-[#0755E8] hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <Star className="w-3 h-3" />
                              <span>Set as Default</span>
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active for Interview Experts</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {resume.fileUrl ? (
                            <a
                              href={resume.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0755E8] hover:bg-slate-50 transition-colors"
                              title="Preview / Download Resume"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          ) : (
                            <Link
                              to="/resume-builder"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#0755E8] hover:bg-slate-50 transition-colors"
                              title="Edit in Resume Builder"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteResume(resume._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Resume"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Resumes Uploaded Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Upload your first resume using the dropzone above or create one with our AI Resume Builder.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
