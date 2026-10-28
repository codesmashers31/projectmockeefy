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
  User as UserIcon,
  X,
  ArrowRight,
  Clock,
  ChevronRight,
  ShieldCheck,
  Heart,
  Crop,
} from "lucide-react";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { getProfileImageUrl, compressImage, compressOriginalImage } from "../lib/imageUtils";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import ImageCropperModal from "../components/ImageCropperModal";

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

  // Image Upload & Cropper States
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [cropperFileName, setCropperFileName] = useState("profile_photo.jpg");
  const [selectedOriginalFile, setSelectedOriginalFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Resume Management States
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeTitle, setResumeTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Stop global loader on mount
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: false } }));
  }, []);

  // Fetch Resumes
  const loadResumes = async () => {
    const effectiveUserId = userId || user?.id || user?._id || (user as any)?.userId;
    if (!effectiveUserId && !localStorage.getItem("token")) return;
    try {
      setIsLoadingResumes(true);
      const res = await axios.get("/api/user/resumes", {
        headers: effectiveUserId ? { userid: String(effectiveUserId) } : {},
      });
      if (res.data?.success) {
        setResumes(res.data.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load resumes:", err);
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

  const completedCount = completedSessions.length;

  // Handle Profile Image Selection (Opens Cropper Modal)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image size must be less than 15MB");
      return;
    }

    setSelectedOriginalFile(file);
    const localUrl = URL.createObjectURL(file);
    setCropperImageSrc(localUrl);
    setCropperFileName(file.name);
    setCropperOpen(true);
    e.target.value = "";
  };

  const handleAdjustCurrentPhoto = () => {
    const rawSrc = user?.originalProfileImage || currentPhoto;
    if (!rawSrc) {
      imageInputRef.current?.click();
      return;
    }
    setSelectedOriginalFile(null); // Keep original photo already saved on server
    const resolved = getProfileImageUrl(rawSrc);
    setCropperImageSrc(resolved);
    setCropperFileName("profile_photo.jpg");
    setCropperOpen(true);
  };

  // Upload cropped image file from cropper modal
  const uploadCroppedPhoto = async (croppedFile: File) => {
    if (!userId) return;

    try {
      setIsUploadingImage(true);
      const localUrl = URL.createObjectURL(croppedFile);
      setImagePreview(localUrl);

      const compressedCrop = await compressImage(croppedFile, 600, 0.85);
      const formData = new FormData();
      formData.append("profileImage", compressedCrop);

      // If user uploaded a brand new file, include the high-resolution original file
      if (selectedOriginalFile) {
        const compressedOrig = await compressOriginalImage(selectedOriginalFile);
        formData.append("originalProfileImage", compressedOrig);
      } else if (user?.originalProfileImage) {
        formData.append("originalProfileImage", user.originalProfileImage);
      }

      const res = await axios.post("/api/user/profile/image", formData, {
        headers: {
          ...(userId ? { userid: String(userId) } : {}),
        },
      });

      if (res.data?.success) {
        toast.success("Profile photo updated successfully!");
        setSelectedOriginalFile(null);
        await fetchProfile();
      } else {
        toast.error(res.data?.message || "Failed to update profile image");
      }
    } catch (err: any) {
      console.error("Image upload error:", err);
      toast.error(err.response?.data?.message || "Error uploading image. Please try again.");
    } finally {
      setIsUploadingImage(false);
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
    setUploadError(null);
    if (!resumeTitle) {
      setResumeTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  // Upload Resume File
  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!selectedFile) {
      const msg = "Please select a resume file to upload.";
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    const effectiveUserId = userId || user?.id || user?._id || (user as any)?.userId;
    const token = localStorage.getItem("token");

    if (!effectiveUserId && !token) {
      const msg = "Please log in to upload your resume.";
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    // Send debug attempt beacon
    fetch(`${API_BASE_URL}/api/debug-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "resume_upload_start",
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        hasUserId: !!effectiveUserId,
        hasToken: !!token,
      }),
    }).catch(() => {});

    try {
      setIsUploadingResume(true);
      const formData = new FormData();
      formData.append("resume", selectedFile);
      formData.append("title", resumeTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, ""));

      // Use native fetch to ensure browser constructs 100% compliant multipart boundary
      const requestHeaders: Record<string, string> = {};
      if (token) requestHeaders["Authorization"] = `Bearer ${token}`;
      if (effectiveUserId) requestHeaders["userid"] = String(effectiveUserId);

      const response = await fetch(`${API_BASE_URL}/api/user/resumes/upload`, {
        method: "POST",
        headers: requestHeaders,
        body: formData,
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        toast.success("Resume uploaded successfully!");
        setSelectedFile(null);
        setResumeTitle("");
        setUploadError(null);
        if (resumeInputRef.current) resumeInputRef.current.value = "";
        await loadResumes();
      } else {
        const msg = data?.message || `Upload failed with status ${response.status}.`;
        setUploadError(msg);
        toast.error(msg);

        fetch(`${API_BASE_URL}/api/debug-log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "resume_upload_rejected",
            status: response.status,
            message: msg,
            data,
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error("Resume upload failed:", err);
      const msg = err.message || "Failed to upload resume file.";
      setUploadError(msg);
      toast.error(msg);

      fetch(`${API_BASE_URL}/api/debug-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "resume_upload_exception",
          error: err.message,
          stack: err.stack,
        }),
      }).catch(() => {});
    } finally {
      setIsUploadingResume(false);
    }
  };

  // Set Default Resume
  const handleSetDefault = async (resumeId: string) => {
    const effectiveUserId = userId || user?.id || user?._id || (user as any)?.userId;
    if (!effectiveUserId && !localStorage.getItem("token")) return;
    try {
      const res = await axios.patch(`/api/user/resumes/${resumeId}/default`, {}, {
        headers: effectiveUserId ? { userid: String(effectiveUserId) } : {},
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
    const effectiveUserId = userId || user?.id || user?._id || (user as any)?.userId;
    if (!effectiveUserId && !localStorage.getItem("token")) return;
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      const res = await axios.delete(`/api/user/resumes/${resumeId}`, {
        headers: effectiveUserId ? { userid: String(effectiveUserId) } : {},
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
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 overflow-hidden pb-16 font-sans text-left">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">

        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              Profile &amp; Resumes
            </h1>
            <p className="text-xs sm:text-[13px] font-medium text-slate-500 mt-0.5">
              Update your photo and manage multiple resumes for technical mock interviews.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-[11px] sm:text-xs font-semibold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {isLoadingSessions ? "..." : `${completedCount} ${completedCount === 1 ? "Interview Finished" : "Interviews Finished"}`}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#0755E8] border border-blue-200/80 text-[11px] sm:text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0755E8]" />
              <span>Verified Candidate</span>
            </span>
          </div>
        </div>

        {/* 2. SECTION 1: PROFILE PHOTO UPDATE */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
            
            {/* Avatar & User Details */}
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
              <div className="relative group shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs flex items-center justify-center shrink-0">
                  {hasPhoto ? (
                    <img
                      src={currentPhoto!}
                      alt={user?.name || "Profile Photo"}
                      className="w-full h-full object-cover object-top rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#EAF2FF] text-[#0755E8] font-bold text-lg sm:text-xl flex items-center justify-center select-none">
                      {initials}
                    </div>
                  )}

                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Camera Quick Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (hasPhoto) {
                      handleAdjustCurrentPhoto();
                    } else {
                      imageInputRef.current?.click();
                    }
                  }}
                  disabled={isUploadingImage}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0755E8] hover:bg-[#0645C7] text-white flex items-center justify-center shadow-xs border-2 border-white transition-all active:scale-90 cursor-pointer"
                  title={hasPhoto ? "Adjust or crop photo from original" : "Upload new photo"}
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              <div className="min-w-0 flex-1 leading-snug">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {user?.name || "Candidate Name"}
                </h2>
                <p className="text-xs sm:text-[13px] font-medium text-slate-500 truncate mt-0.5">
                  {user?.email || "candidate@mockeefy.com"}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[#0755E8] text-[10.5px] font-bold uppercase tracking-tight">
                    Candidate Profile
                  </span>
                  <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                    Visible to interview experts
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>
                      {isLoadingSessions ? "..." : `${completedCount} ${completedCount === 1 ? "Interview Finished" : "Interviews Finished"}`}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 sm:self-center pt-1 sm:pt-0">
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
                className="h-9 sm:h-9.5 px-3.5 sm:px-4 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
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
                  onClick={handleAdjustCurrentPhoto}
                  disabled={isUploadingImage}
                  className="h-9 sm:h-9.5 px-3 sm:px-3.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0755E8] border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                  title="Adjust framing and re-crop from full original photo"
                >
                  <Crop className="w-3.5 h-3.5 text-[#0755E8]" />
                  <span>Adjust & Crop</span>
                </button>
              )}

              {hasPhoto && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isDeletingImage || isUploadingImage}
                  className="h-9 sm:h-9.5 px-3 sm:px-3.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 whitespace-nowrap"
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

        {/* 2. SECTION 2: MULTI-RESUME UPLOAD & MANAGEMENT */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <FileCheck className="w-5 h-5 text-[#0755E8]" />
              <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                Resumes
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EAF2FF] text-[#0755E8] text-xs font-black">
                {resumes.length}
              </span>
            </div>
          </div>

          {/* Upload Dropzone Box & Staging Card */}
          <form
            onSubmit={handleUploadResume}
            className={`relative rounded-2xl transition-all overflow-hidden ${
              isDragging
                ? "border-2 border-[#0755E8] bg-[#F0F5FF]/70 shadow-[0_4px_24px_-4px_rgba(7,85,232,0.18)]"
                : selectedFile
                ? "border-2 border-[#93B8FF]/80 bg-white shadow-xs"
                : "border-2 border-dashed border-slate-300 hover:border-[#0755E8]/70 bg-gradient-to-b from-[#f8faff] via-white to-white hover:from-[#F0F5FF]/30 shadow-xs"
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

            {!selectedFile ? (
              /* State 1: Fresh Drag & Drop Zone */
              <div
                onClick={() => resumeInputRef.current?.click()}
                className="p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                {/* Upload Icon with smooth hover float & ambient glow */}
                <div className="relative mb-3.5">
                  <div className="absolute inset-0 rounded-2xl bg-[#0755E8]/20 blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />
                  <div className="relative w-14 h-14 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/60 flex items-center justify-center text-[#0755E8] shadow-2xs group-hover:scale-110 group-hover:bg-[#0755E8] group-hover:text-white transition-all duration-200">
                    <Upload className="w-6 h-6 stroke-[2.2]" />
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-[#0755E8] transition-colors">
                  Drag &amp; drop your resume here, or <span className="underline decoration-[#0755E8]/40 decoration-2 underline-offset-4">browse files</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5 max-w-md">
                  Upload your latest tailored resume for technical, coding, or behavioral mock interviews.
                </p>

                {/* Formats Pills */}
                <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 text-[10.5px] font-black uppercase tracking-wider shadow-2xs">
                    PDF
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0755E8] border border-blue-200/80 text-[10.5px] font-black uppercase tracking-wider shadow-2xs">
                    DOC
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0755E8] border border-blue-200/80 text-[10.5px] font-black uppercase tracking-wider shadow-2xs">
                    DOCX
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">• Max 10MB</span>
                </div>
              </div>
            ) : (
              /* State 2: Selected File Staging Card (Replaces dropzone cleanly without redundancy) */
              <div className="p-5 sm:p-6 bg-gradient-to-b from-[#f0f5ff]/40 via-white to-white space-y-5 animate-in fade-in duration-200">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-900 truncate max-w-xs sm:max-w-md">
                          {selectedFile.name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10.5px] font-bold text-slate-600">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-600 font-bold inline-flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ready to upload &amp; save to your profile</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => resumeInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      Change File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setResumeTitle("");
                        if (resumeInputRef.current) resumeInputRef.current.value = "";
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="Discard file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Target Role Input with Smart Suggestions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Resume Label / Target Role
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Helps interview experts identify your focus</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer, Full Stack Resume"
                    value={resumeTitle}
                    onChange={(e) => setResumeTitle(e.target.value)}
                    className="w-full bg-white px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-[#0755E8] focus:ring-2 focus:ring-[#93B8FF]/20 font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 transition-all shadow-2xs"
                  />

                  {/* Quick role suggestions */}
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">Quick suggestions:</span>
                    {["Full Stack Developer", "Frontend Engineer", "Backend SDE", "DevOps Engineer", "Data Scientist"].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setResumeTitle(role)}
                        className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                          resumeTitle === role
                            ? "bg-[#0755E8] text-white border-[#0755E8]"
                            : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Error Banner */}
                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setResumeTitle("");
                      if (resumeInputRef.current) resumeInputRef.current.value = "";
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingResume}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#0755E8] to-[#1264FF] hover:from-[#0645C7] hover:to-[#0755E8] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isUploadingResume ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading Resume...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload &amp; Save Resume</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* List of Uploaded Resumes */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>My Tailored Resumes</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EAF2FF] text-[#0755E8] text-xs font-black">
                    {resumes.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Interview experts automatically review your active default resume during live mock sessions.
                </p>
              </div>
            </div>

            {isLoadingResumes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-36 rounded-2xl bg-slate-50 border border-slate-200/70 animate-pulse" />
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

                  const isPdf = Boolean(
                    (resume.fileName && resume.fileName.toLowerCase().endsWith(".pdf")) ||
                    (resume.fileUrl && resume.fileUrl.toLowerCase().includes(".pdf")) ||
                    (resume.title && resume.title.toLowerCase().endsWith(".pdf"))
                  );

                  return (
                    <div
                      key={resume._id}
                      className={`group relative rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between text-left hover:-translate-y-0.5 ${
                        resume.isDefault
                          ? "bg-gradient-to-br from-[#F0F5FF]/90 via-white to-white border-2 border-[#0755E8] shadow-[0_4px_24px_-4px_rgba(7,85,232,0.14)]"
                          : "bg-white hover:bg-slate-50/40 border border-slate-200/90 hover:border-slate-300 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-xs"
                      }`}
                    >
                      {/* Top Row: File Icon + Title + Status Badge */}
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            {/* File Type Pill */}
                            <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 border shadow-2xs ${
                              isPdf
                                ? "bg-rose-50 border-rose-200/90 text-rose-600"
                                : "bg-blue-50 border-blue-200/90 text-[#0755E8]"
                            }`}>
                              <FileText className="w-5 h-5 stroke-[2.2]" />
                              <span className="text-[8.5px] font-black uppercase tracking-wider mt-0.5">
                                {isPdf ? "PDF" : "DOC"}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1 leading-tight">
                              <h4 className="text-sm font-black text-slate-900 truncate">
                                {resume.title || "Untitled Resume"}
                              </h4>
                              <p className="text-[11.5px] text-slate-500 font-medium truncate mt-0.5">
                                {resume.fileName || `${resume.title || "Resume"}.pdf`}
                              </p>
                            </div>
                          </div>

                          {resume.isDefault ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-[10.5px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(resume._id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#EAF2FF] text-slate-600 hover:text-[#0755E8] border border-slate-200 text-[10.5px] font-bold transition-all shrink-0 cursor-pointer"
                              title="Set as default for upcoming interviews"
                            >
                              <Star className="w-3 h-3" />
                              <span>Make Default</span>
                            </button>
                          )}
                        </div>

                        {/* File Details Chips */}
                        <div className="flex items-center gap-2 mt-3.5 text-[11px] text-slate-400 font-medium flex-wrap">
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Updated {dateStr}</span>
                          </span>
                          {resume.fileSize && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{resume.fileSize}</span>
                            </>
                          )}
                          {resume.template && (
                            <>
                              <span>•</span>
                              <span className="text-[#0755E8] font-bold">{resume.template} Template</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-3.5 mt-3.5 border-t border-slate-100">
                        {/* Status Note or Make Default Link */}
                        <div>
                          {resume.isDefault ? (
                            <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active for Interview Experts</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(resume._id)}
                              className="text-xs font-bold text-[#0755E8] hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <Star className="w-3.5 h-3.5" />
                              <span>Set as Primary Resume</span>
                            </button>
                          )}
                        </div>

                        {/* Preview, Download, Delete Buttons */}
                        <div className="flex items-center gap-1.5">
                          {resume.fileUrl ? (
                            <>
                              <a
                                href={`${API_BASE_URL}/api/user/resumes/${resume._id}/file?mode=view`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-[#EAF2FF] hover:bg-[#0755E8] text-[#0755E8] hover:text-white border border-[#93B8FF]/60 text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                                title="Preview Resume in New Tab"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </a>
                              <a
                                href={`${API_BASE_URL}/api/user/resumes/${resume._id}/file?mode=download`}
                                download={resume.fileName || `${resume.title || "Resume"}.pdf`}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-[#0755E8] hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                title="Download Resume File"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </>
                          ) : (
                            <Link
                              to="/resume-builder"
                              className="px-2.5 py-1.5 rounded-xl bg-[#EAF2FF] hover:bg-[#0755E8] text-[#0755E8] hover:text-white border border-[#93B8FF]/60 text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5"
                              title="Edit in Resume Builder"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Edit in Builder</span>
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteResume(resume._id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
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
              <div className="bg-gradient-to-b from-[#f0f5ff]/30 via-white to-white rounded-2xl border border-dashed border-slate-200 p-8 text-center flex flex-col items-center">
                <div className="w-13 h-13 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/60 flex items-center justify-center text-[#0755E8] mb-3 shadow-2xs">
                  <FileText className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h4 className="text-sm font-black text-slate-900">No Resumes Uploaded Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  Upload your target resume using the dropzone above.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        fileName={cropperFileName}
        title="Adjust & Crop Profile Photo"
        onClose={() => setCropperOpen(false)}
        onCropComplete={(croppedFile) => {
          uploadCroppedPhoto(croppedFile);
        }}
      />
    </div>
  );
}
