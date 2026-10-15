import { useState, useEffect, useRef } from "react";
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
  X
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
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 md:p-9 shadow-xs pb-16 font-sans text-left">
      <div className="w-full space-y-8">

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

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[#0755E8] text-[11px] font-bold uppercase tracking-tight">
                    Candidate Profile
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Visible to mentors
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
                Upload multiple tailored resumes for different roles. Mentors will review your default resume.
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
                              <span>Active for Mentors</span>
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
