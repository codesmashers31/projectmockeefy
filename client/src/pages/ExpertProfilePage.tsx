import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "../lib/axios";
import {
  Star,
  Award,
  CheckCircle2,
  ShieldCheck,
  BadgeCheck,
  Briefcase,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Bookmark,
  ArrowLeft,
  ArrowRight,
  Zap,
  Video,
  Sparkles,
  Check,
  Globe,
  MessageSquare,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { mapExpertToProfile, Profile } from "../lib/bookSessionUtils";
import { getProfileImageUrl } from "../lib/imageUtils";
import { BookingModal } from "../components/BookingModal";
import { useAuth } from "../context/AuthContext";

interface ReviewItem {
  id: string;
  name: string;
  role: string;
  rating: number;
  comment: string;
  date: string;
  avatar?: string;
}

export const ExpertProfileSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse p-4 sm:p-6 text-left font-sans">
      <div className="h-9 w-48 bg-slate-200 rounded-xl" />
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-200 shrink-0" />
          <div className="space-y-3 flex-1 w-full">
            <div className="h-7 w-60 bg-slate-200 rounded-lg" />
            <div className="h-4 w-80 bg-slate-100 rounded" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-24 bg-slate-200/70 rounded-full" />
              <div className="h-6 w-28 bg-slate-200/70 rounded-full" />
              <div className="h-6 w-20 bg-slate-200/70 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 h-48 bg-slate-50" />
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 h-48 bg-slate-50" />
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 h-80 bg-slate-50" />
      </div>
    </div>
  );
};

export default function ExpertProfilePage() {
  const { expertId } = useParams<{ expertId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rawExpert, setRawExpert] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);

  // Bookmark / Save state
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("savedExperts");
      if (saved && expertId) {
        const parsed = JSON.parse(saved);
        return parsed.some((item: any) => (item.expertID || item.id || item._id) === expertId);
      }
    } catch {
      // ignore
    }
    return false;
  });

  const toggleSave = () => {
    if (!profile) return;
    try {
      const saved = localStorage.getItem("savedExperts");
      let parsed: any[] = saved ? JSON.parse(saved) : [];
      const currentId = profile.id || expertId;

      if (isSaved) {
        parsed = parsed.filter((item: any) => (item.expertID || item.id || item._id) !== currentId);
        setIsSaved(false);
        toast.info(`Removed ${profile.name} from saved experts`);
      } else {
        parsed.push({
          expertID: currentId,
          id: currentId,
          _id: currentId,
          name: profile.name,
          role: profile.role,
          company: profile.company,
          avatar: profile.avatar,
          rating: profile.rating,
          reviews: profile.reviews,
          price: profile.price,
          experience: profile.experience,
          skills: profile.skills,
          category: profile.category,
        });
        setIsSaved(true);
        toast.success(`Saved ${profile.name} to your wishlist`);
      }
      localStorage.setItem("savedExperts", JSON.stringify(parsed));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `${profile?.name || "Expert"} on Mockeefy`,
      text: `Book a 1:1 Mock Interview session with ${profile?.name || "this expert"} on Mockeefy!`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied to clipboard!");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied to clipboard!");
      } catch {
        toast.error("Could not copy link.");
      }
    }
  };

  // Fetch expert details
  useEffect(() => {
    if (!expertId) {
      setError("Expert ID not specified.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchExpert = async () => {
      setLoading(true);
      setError(null);

      try {
        let fetchedData: any = null;

        // 1. Try public profile endpoint first (clean, PII stripped)
        try {
          const res = await axios.get(`/api/expert/public/profile/${expertId}`);
          if (res.data?.success && res.data?.profile) {
            fetchedData = res.data.profile;
          }
        } catch {
          // Fallback to verified list if public profile endpoint fails
        }

        // 2. Fallback to /api/expert/verified list
        if (!fetchedData) {
          const res = await axios.get("/api/expert/verified");
          const experts = res.data?.data || res.data || [];
          fetchedData = experts.find(
            (e: any) => (e._id || e.userId || e.id) === expertId
          );
        }

        if (!isMounted) return;

        if (fetchedData) {
          setRawExpert(fetchedData);
          const mapped = mapExpertToProfile(fetchedData);
          setProfile(mapped);
        } else {
          setError("Interview expert not found or inactive.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error loading expert profile:", err);
        setError("Failed to load expert profile. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExpert();

    // Fetch reviews
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const res = await axios.get(`/api/reviews/expert/${expertId}`);
        if (isMounted && res.data?.success && Array.isArray(res.data.data)) {
          setReviews(
            res.data.data.map((r: any) => ({
              id: r._id || r.id || String(Math.random()),
              name: r.candidateName || r.name || "Candidate",
              role: r.candidateRole || r.role || "Software Engineer",
              rating: r.overallRating || r.rating || 5,
              comment: r.feedback || r.comment || "Great mock interview with insightful feedback.",
              date: r.createdAt
                ? new Date(r.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Recently",
              avatar: r.candidateAvatar || r.avatar,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        if (isMounted) setReviewsLoading(false);
      }
    };

    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [expertId]);

  if (loading) {
    return <ExpertProfileSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Expert Profile Unavailable
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            {error || "We couldn't locate this interview expert profile. Explore our verified experts directory."}
          </p>
          <Link
            to="/find-mentor"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>Browse All Interview Experts</span>
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl =
    profile.avatar ||
    (rawExpert?.profileImage ? getProfileImageUrl(rawExpert.profileImage) : null) ||
    getProfileImageUrl(null);

  const bioText =
    rawExpert?.personalInformation?.bio ||
    (rawExpert as any)?.bio ||
    `Experienced ${profile.role} with ${profile.experience} in the industry. Specialized in conducting realistic mock interviews, code reviews, and providing actionable feedback to help candidates crack top tech companies.`;

  const educationList: any[] = rawExpert?.education || [];
  const previousJobs: any[] = rawExpert?.professionalDetails?.previous || [];

  const expertLevels = profile.levels && profile.levels.length > 0
    ? profile.levels
    : [profile.level || "Rising Mentor"];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 px-3 sm:px-6 font-sans text-left">
      {/* 1. Header Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate("/find-mentor");
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back to Interview Experts</span>
        </button>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="text-slate-600 hover:text-[#0755E8] transition-colors">
            Home
          </Link>
          <span className="text-slate-300">/</span>
          <Link to="/find-mentor" className="text-slate-600 hover:text-[#0755E8] transition-colors">
            Interview Experts
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-[#0755E8] font-bold truncate max-w-[200px]">
            {profile.name}
          </span>
        </nav>
      </div>

      {/* 2. Hero Profile Card */}
      <div className="relative bg-gradient-to-b from-[#F0F5FF]/90 via-[#F8FAFF] to-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-200/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-indigo-200/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-5">
          {/* Avatar and Identity */}
          <div className="flex flex-row items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden p-0.5">
                <img
                  src={avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover object-top rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = getProfileImageUrl(null);
                  }}
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0E9D5C] text-white flex items-center justify-center border-2 border-white shadow-2xs" title="Verified Expert">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {profile.name}
                </h1>
                <span title="Verified Interview Expert" className="inline-flex items-center shrink-0">
                  <BadgeCheck className="w-4 h-4 text-white fill-[#0755E8]" />
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Mentor
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px] font-semibold">
                  {profile.category || "IT"}
                </span>
              </div>

              <p className="text-xs sm:text-[13px] font-medium text-slate-600 leading-snug">
                {profile.role}
                {profile.company && (
                  <span className="text-slate-500 font-normal"> at <strong className="text-slate-800 font-semibold">{profile.company}</strong></span>
                )}
              </p>

              {/* Badges / Quick stats */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-slate-600 flex-wrap pt-0.5">
                <div className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50/90 px-2 py-0.5 rounded-md border border-amber-200/50">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <span>{profile.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({reviews.length || profile.reviews})</span>
                </div>

                <div className="flex items-center gap-1 text-slate-700 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/70">
                  <Briefcase className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>{profile.experience}</span>
                </div>

                <div className="flex items-center gap-1 text-slate-700 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/70">
                  <Video className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>1:1 Live Video</span>
                </div>

                {profile.location && (
                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[140px] sm:max-w-none">{profile.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-row md:flex-col items-center sm:items-stretch gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-0">
            <button
              type="button"
              onClick={() => setIsBookingModalOpen(true)}
              className="flex-1 md:flex-none h-10 px-4 sm:px-5 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#0537A0] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-98 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Book Mock Interview</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 shrink-0" />
            </button>

            <div className="flex items-center gap-2 w-auto md:w-full shrink-0">
              <button
                type="button"
                onClick={toggleSave}
                className={`h-10 px-3 sm:px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 shrink-0 ${
                  isSaved
                    ? "bg-rose-50 text-rose-600 border-rose-200 shadow-2xs"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90"
                }`}
                title={isSaved ? "Saved in wishlist" : "Save expert to wishlist"}
              >
                <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isSaved ? "fill-current" : ""}`} />
                <span>{isSaved ? "Saved" : "Save"}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="h-10 px-3 sm:px-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-bold transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap flex-1 shrink-0"
                title="Share expert profile"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Section */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>About {profile.name}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {bioText}
            </p>

            {/* What to expect checklist */}
            <div className="pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                What you will get in this mock interview
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Real-world technical &amp; behavioral question sets tailored to your target company</span>
                </div>
                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Live coding &amp; system architecture problem-solving evaluation</span>
                </div>
                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Verbal debrief + actionable written performance scorecard</span>
                </div>
                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Resume, GitHub &amp; project portfolio review with insider tips</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supported Mentorship Levels */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Mentorship Levels Offered</span>
            </h2>
            <p className="text-xs text-slate-500">
              Choose the tier that matches your career level and target preparation depth.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {expertLevels.map((lvl) => (
                <div
                  key={lvl}
                  className="bg-gradient-to-br from-blue-50/50 via-slate-50/50 to-white rounded-2xl border border-blue-100/80 p-3.5 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">
                      {lvl}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      1:1 Live Simulation &amp; Evaluation
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#EAF2FF] hover:bg-[#D5E5FF] text-[#0755E8] text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Expertise */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Skills &amp; Domain Expertise</span>
            </h2>

            {profile.skills && profile.skills.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Technical Skills &amp; Tools
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.languages && profile.languages.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Spoken Languages
                </span>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Experience & Career History */}
          {previousJobs && previousJobs.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>Work Experience</span>
              </h2>

              <div className="space-y-3">
                {previousJobs.map((job, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 shadow-2xs">
                      {job.company ? job.company[0].toUpperCase() : "W"}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        {job.title || "Software Engineer"}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">
                        {job.company || "Company"}
                        {job.start && (
                          <span className="text-slate-400 font-normal">
                            {" "}• {job.start} {job.end ? `- ${job.end}` : "- Present"}
                          </span>
                        )}
                      </p>
                      {job.description && (
                        <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                          {job.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {educationList && educationList.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Education &amp; Credentials</span>
              </h2>

              <div className="space-y-3">
                {educationList.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0 shadow-2xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        {edu.degree || "Degree"} {edu.field ? `in ${edu.field}` : ""}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">
                        {edu.institution || "University"}
                        {edu.end && (
                          <span className="text-slate-400 font-normal">
                            {" "}• Class of {edu.end}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidate Reviews */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Candidate Reviews ({reviews.length})</span>
              </h2>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{profile.rating.toFixed(1)} rating</span>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading reviews...</div>
            ) : reviews.length > 0 ? (
              <div className="space-y-3 pt-1">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {rev.name ? rev.name[0].toUpperCase() : "C"}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block leading-tight">
                            {rev.name}
                          </span>
                          <span className="text-[11px] text-slate-500 block leading-tight">
                            {rev.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-slate-200 text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      "{rev.comment}"
                    </p>

                    <div className="text-[10px] text-slate-400 text-right">
                      {rev.date}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-slate-100">
                <Star className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">No reviews published yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Be the first candidate to book a session and leave a review!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Booking Sidebar (1 col) */}
        <div className="space-y-6">
          <div className="sticky top-24 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-5 text-left">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Session Investment
              </span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  ₹{profile.price ? profile.price.replace(/[^\d]/g, "") || "499" : "499"}
                </span>
                <span className="text-xs font-semibold text-slate-500">/ starting tier</span>
              </div>
            </div>

            {/* Quick Benefits list */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Session Highlights
              </span>
              <ul className="space-y-2 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>1:1 Live Interactive Video Mock Interview</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Real Coding &amp; System Design Practice</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Instant Performance Scorecard &amp; Feedback</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span>Flexible 30 or 60 minute slot lengths</span>
                </li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#0537A0] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Calendar className="w-4 h-4" />
                <span>Select Date &amp; Time Slot</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleSave}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
                <span>{isSaved ? "Saved to Wishlist" : "Save for Later"}</span>
              </button>
            </div>

            {/* Trust badge */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Satisfaction &amp; Verified Expert Protection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal (Opened directly from this Profile Page) */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          expertId={expertId}
          initialProfile={profile}
        />
      )}
    </div>
  );
}
