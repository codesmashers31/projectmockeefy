import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
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
import { formatDisplayName } from "../lib/utils";
import { BookingModal } from "../components/BookingModal";
import { useAuth } from "../context/AuthContext";
import MockeefyLogo from "../components/MockeefyLogo";
import { getPendingBooking, clearPendingBooking, PendingBookingIntent } from "../lib/pendingBooking";

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
    <div className="min-h-screen bg-[#F5F8FF] text-slate-900 font-sans antialiased flex flex-col">
      <header className="w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-xs h-16 flex items-center px-4 sm:px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="h-8 w-28 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-8 w-20 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </header>
      <div className="flex-1 w-full max-w-6xl mx-auto space-y-6 animate-pulse p-4 sm:p-6 text-left font-sans">
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
    </div>
  );
};

export default function ExpertProfilePage() {
  const { expertId } = useParams<{ expertId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const locationState = location.state as any;
  const initialData = locationState?.initialExpert;

  const [rawExpert, setRawExpert] = useState<any | null>(() => initialData || null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (initialData) {
      try {
        return mapExpertToProfile(initialData);
      } catch {
        // ignore mapping error
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => !initialData);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return false;
      const pending = getPendingBooking();
      const resume = new URLSearchParams(window.location.search).get("resumeBooking") === "true";
      return Boolean(pending || resume);
    } catch {
      return false;
    }
  });

  // Check if current logged-in user is viewing their own profile (Unconditional hook)
  const isOwnProfile = useMemo(() => {
    if (!user) return false;
    const currentUserId = String(user.id || (user as any)._id || (user as any).userId || "");
    const targetExpertId = String(expertId || profile?.id || rawExpert?._id || rawExpert?.userId || "");
    const rawExpertUserId = String(rawExpert?.userId || "");
    const rawExpertId = String(rawExpert?._id || "");

    if (currentUserId && (currentUserId === targetExpertId || currentUserId === rawExpertUserId || currentUserId === rawExpertId)) {
      return true;
    }
    if (user.email && rawExpert?.email && user.email.toLowerCase() === rawExpert.email.toLowerCase()) {
      return true;
    }
    if (user.userType?.toLowerCase() === "expert") {
      if (profile?.name && user.name && profile.name.trim().toLowerCase() === user.name.trim().toLowerCase()) {
        return true;
      }
    }
    return false;
  }, [user, expertId, profile, rawExpert]);

  const hasResumedBookingRef = useRef(false);
  const [pendingBookingData, setPendingBookingData] = useState<PendingBookingIntent | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      return getPendingBooking();
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!user || hasResumedBookingRef.current) return;
    const pending = getPendingBooking();
    const resumeParam = new URLSearchParams(location.search).get("resumeBooking") === "true";
    if (pending || resumeParam) {
      const targetId = pending?.expertId;
      if (
        !targetId ||
        String(targetId) === String(expertId) ||
        String(targetId) === String(profile?.id) ||
        String(targetId) === String(rawExpert?._id)
      ) {
        hasResumedBookingRef.current = true;
        setPendingBookingData(pending);
        setIsBookingModalOpen(true);
        if (resumeParam) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        toast.success(
          `Welcome back, ${user.name?.split(" ")[0] || "there"}! Resuming your booking with ${profile?.name || pending?.expertName || "your mentor"}.`
        );
      }
    }
  }, [user, expertId, profile, rawExpert, location.search]);

  // Immediately force scroll to top (0, 0) before paint
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [expertId]);

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
      if (!initialData) {
        setLoading(true);
      }
      setError(null);

      try {
        let fetchedData: any = null;

        // 1. Try public profile endpoint first (clean, PII stripped)
        try {
          const res = await axios.get(`/api/expert/public/profile/${expertId}`);
          if (res.data?.success && res.data?.profile) {
            fetchedData = res.data.profile;
          }
        } catch (apiErr: any) {
          if (apiErr.response?.status === 404) {
            // Private or non-existent profile - strictly honor privacy setting
            setError(apiErr.response?.data?.message || "This expert profile is private or not available.");
            return;
          }
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

    // Manage search engine indexing meta tag
    return () => {};
  }, [expertId]);

  // Search Engine Indexing (robots meta tag management)
  useEffect(() => {
    if (!rawExpert) return;
    const isIndexed = rawExpert.allowSearchEngines !== false && rawExpert.settings?.allowSearchEngines !== false;

    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const wasCreated = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = isIndexed ? "index, follow" : "noindex, nofollow";

    return () => {
      if (wasCreated && meta && meta.parentNode) {
        meta.parentNode.removeChild(meta);
      } else if (meta) {
        meta.content = "index, follow";
      }
    };
  }, [rawExpert]);

  useEffect(() => {
    if (!expertId) return;
    let isMounted = true;

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
      <div className="min-h-screen bg-[#F5F8FF] text-slate-900 font-sans antialiased flex flex-col justify-center items-center py-12 px-4 text-center">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-xs">
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
            to="/"
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

  const hasReviews = reviews.length > 0 || (profile.reviews && profile.reviews > 0);
  const displayRating = hasReviews ? (profile.rating > 0 ? profile.rating.toFixed(1) : "5.0") : "5.0";
  const displayReviewCount = hasReviews ? (reviews.length || profile.reviews) : 0;
  const cleanPrice = profile.price ? parseInt(profile.price.replace(/[^\d]/g, ""), 10) || 499 : 499;
  const originalPrice = Math.max(cleanPrice + 500, Math.round((cleanPrice * 1.4) / 100) * 100 - 1);

  const handleBack = () => {
    // If expert opened their own profile in a new tab:
    if (user?.userType?.toLowerCase() === "expert") {
      navigate("/dashboard");
      return;
    }
    if (window.history.length > 2 && document.referrer && document.referrer.includes(window.location.host)) {
      navigate(-1);
      return;
    }
    const targetId = profile?.id || expertId;
    const targetName = profile?.name;
    if (targetId) {
      try {
        sessionStorage.setItem("lastViewedExpertId", String(targetId));
      } catch {}
    }
    if (targetName) {
      try {
        sessionStorage.setItem("lastViewedExpertName", String(targetName));
      } catch {}
    }
    navigate("/", {
      state: {
        scrollToExpertId: targetId,
        scrollToExpertName: targetName,
        preventScrollTop: true,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-slate-900 font-sans antialiased selection:bg-[#EAF2FF] selection:text-[#0755E8] flex flex-col">
      {/* Clean Public Top Bar (No Sidebar, No Candidate Dashboard Navbar) */}
      <header className="w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-xs font-sans">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group active:scale-95 transition-transform">
            <MockeefyLogo className="h-7 w-7 sm:h-8 sm:w-8" variant="brand" />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-sans font-extrabold tracking-tight text-[#0755E8] group-hover:text-[#0645C7] transition-colors leading-none">
                Mockeefy
              </span>
              <span className="text-[9px] text-slate-400 tracking-wider font-bold uppercase leading-tight mt-0.5">
                Verified Expert Profile
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-bold transition-all shadow-2xs hover:border-slate-300 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>{user?.userType?.toLowerCase() === "expert" ? "Back to Dashboard" : "Back to Experts"}</span>
          </button>
        </div>
      </header>

      {/* Main Profile Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto space-y-4 sm:space-y-5 pb-16 px-3 sm:px-6 pt-4 font-sans text-left">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200/90 text-[11px] font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
          >
            <ArrowLeft className="w-3 h-3 stroke-[2.5]" />
            <span>{user?.userType?.toLowerCase() === "expert" ? "Back to Dashboard" : "Back to Interview Experts"}</span>
          </button>

          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <Link to="/" className="text-slate-600 hover:text-[#0755E8] transition-colors">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <button
              type="button"
              onClick={handleBack}
              className="text-slate-600 hover:text-[#0755E8] transition-colors cursor-pointer font-semibold"
            >
              Interview Experts
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-[#0755E8] font-bold truncate max-w-[200px] capitalize">
              {formatDisplayName(profile.name)}
            </span>
          </nav>
        </div>

      {/* 2. Executive Hero Profile Card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#EBF3FF] via-[#F8FAFF] to-white border border-slate-200/90 p-4 sm:p-5.5 shadow-xs">
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-indigo-200/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Main Top Row: Avatar + Info + Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Avatar + Details */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
              {/* Avatar with Verified Beacon */}
              <div className="relative shrink-0 self-start sm:self-auto">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border-2 border-slate-200/90 shadow-sm overflow-hidden p-0.5">
                  <img
                    src={avatarUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover object-top rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = getProfileImageUrl(null);
                    }}
                  />
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#0E9D5C] text-white flex items-center justify-center border-2 border-white shadow-xs"
                  title="Verified Expert"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>

              {/* Identity & Badges */}
              <div className="space-y-1 min-w-0 flex-1">
                {/* Name + Verified Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug capitalize">
                    {formatDisplayName(profile.name)}
                  </h1>
                  <BadgeCheck className="w-4.5 h-4.5 text-white fill-[#0755E8] shrink-0" title="Verified Expert" />
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Mentor
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#0755E8] border border-blue-200 text-[10px] font-bold shadow-2xs">
                    {profile.category || "IT"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Accepting Bookings
                  </span>
                </div>

                {/* Role & Company */}
                <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 flex-wrap">
                  <span>{profile.role}</span>
                  {profile.company && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 font-bold text-[11px] shadow-2xs">
                        <span className="w-3.5 h-3.5 rounded bg-[#0755E8] text-white flex items-center justify-center text-[9px] font-black">
                          {profile.company[0].toUpperCase()}
                        </span>
                        <span>{profile.company}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
              <button
                type="button"
                disabled={isOwnProfile}
                onClick={() => {
                  if (isOwnProfile) return;
                  setIsBookingModalOpen(true);
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-all inline-flex items-center justify-center gap-1.5 ${
                  isOwnProfile
                    ? "bg-slate-200/90 text-slate-400 border border-slate-300/70 cursor-not-allowed shadow-none"
                    : "bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#0537A0] text-white hover:shadow-md cursor-pointer active:scale-95"
                }`}
                title={isOwnProfile ? "Booking is disabled for your own profile" : "Book Mock Interview"}
              >
                <Calendar className={`w-3.5 h-3.5 ${isOwnProfile ? "text-slate-400" : "text-white"}`} />
                <span>{isOwnProfile ? "Book Mock Interview (Disabled)" : "Book Mock Interview"}</span>
                {!isOwnProfile && <ArrowRight className="w-3 h-3" />}
              </button>

              <button
                type="button"
                disabled={isOwnProfile}
                onClick={isOwnProfile ? undefined : toggleSave}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 ${
                  isOwnProfile
                    ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-60"
                    : isSaved
                    ? "bg-rose-50 text-rose-600 border-rose-200 shadow-2xs cursor-pointer"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs cursor-pointer"
                }`}
                title={isOwnProfile ? "You cannot save your own profile" : isSaved ? "Saved to wishlist" : "Save expert to wishlist"}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isSaved && !isOwnProfile ? "fill-rose-500 text-rose-500" : ""}`} />
                <span>{isSaved && !isOwnProfile ? "Saved" : "Save"}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-bold transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center gap-1.5"
                title="Share expert profile"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Meta Stats Strip */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 flex-wrap pt-2.5 border-t border-slate-200/80">
            {hasReviews ? (
              <div className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50/90 px-2.5 py-0.5 rounded-lg border border-amber-200/60 shadow-2xs text-[11px]">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span>{displayRating}</span>
                <span className="text-slate-500 font-normal">({displayReviewCount} {displayReviewCount === 1 ? 'review' : 'reviews'})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50/90 px-2.5 py-0.5 rounded-lg border border-emerald-200/60 shadow-2xs text-[11px]">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span>5.0</span>
                <span className="text-emerald-700 font-normal">(Verified Expert)</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs text-[11px]">
              <Briefcase className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="font-semibold">{profile.experience} Experience</span>
            </div>

            <div className="flex items-center gap-1 text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs text-[11px]">
              <Video className="w-3 h-3 text-indigo-600 shrink-0" />
              <span className="font-semibold">1:1 Live Video</span>
            </div>

            {profile.location && (
              <div className="flex items-center gap-1 text-slate-600 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs text-[11px]">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{profile.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left / Main Details (2 cols) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* About Section */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0755E8] flex items-center justify-center border border-blue-100">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>About {profile.name}</span>
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">Verified Mentor Profile</span>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
              {bioText}
            </p>

            {/* What you will get in this mock interview */}
            <div className="pt-1.5">
              <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>What You Will Get In This Mock Interview</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50/60 via-slate-50/50 to-white border border-blue-100/80 shadow-2xs hover:shadow-xs transition-all space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-[#0755E8] flex items-center justify-center text-[11px]">
                      🎯
                    </span>
                    <span>Targeted Company Questions</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed pl-6.5">
                    Real-world technical &amp; behavioral question sets tailored to your target company's hiring bar.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50/60 via-slate-50/50 to-white border border-indigo-100/80 shadow-2xs hover:shadow-xs transition-all space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px]">
                      💻
                    </span>
                    <span>Live Coding &amp; System Design</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed pl-6.5">
                    Real-time code execution, complexity analysis, and whiteboard architecture evaluation in live sandbox.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50/60 via-slate-50/50 to-white border border-emerald-100/80 shadow-2xs hover:shadow-xs transition-all space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center text-[11px]">
                      📊
                    </span>
                    <span>Actionable Written Scorecard</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed pl-6.5">
                    Verbal debrief plus permanent written scoring on problem solving, code quality, and communication.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50/60 via-slate-50/50 to-white border border-amber-100/80 shadow-2xs hover:shadow-xs transition-all space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center text-[11px]">
                      📑
                    </span>
                    <span>Resume &amp; GitHub Critique</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed pl-6.5">
                    Line-by-line portfolio, GitHub, and resume review with insider tips from active tech interviewers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Supported Mentorship Levels */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Mentorship Levels Offered
                  </h2>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Choose the tier that matches your career level and target preparation depth.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              {expertLevels.map((lvl) => (
                <div
                  key={lvl}
                  className="relative bg-gradient-to-br from-blue-50/40 via-white to-white rounded-xl border border-slate-200/90 hover:border-blue-300 p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-2.5 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#0755E8] border border-blue-200/80 text-[10px] font-bold">
                        {lvl}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{cleanPrice}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      1:1 Mock Interview &amp; Evaluation
                    </h3>

                    <ul className="text-[10.5px] text-slate-600 space-y-1 pt-0.5">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>Full 45-60 min live interactive session</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>Personalized rubric report scorecard</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(true)}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#EAF2FF] hover:bg-[#0755E8] text-[#0755E8] hover:text-white text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 group-hover:shadow-xs active:scale-98"
                  >
                    <span>Select Tier &amp; Book</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Expertise */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span>Skills &amp; Domain Expertise</span>
              </h2>
            </div>

            {profile.skills && profile.skills.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Technical Problem Solving &amp; Tools
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/90 text-slate-700 text-[11px] font-medium shadow-2xs hover:border-blue-300 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.languages && profile.languages.length > 0 && (
              <div className="pt-2.5 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-slate-500" />
                  <span>Spoken Languages</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.languages.map((lang, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-medium shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Experience & Career History */}
          {previousJobs && previousJobs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0755E8] flex items-center justify-center border border-blue-100">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <span>Work Experience</span>
                </h2>
                <span className="text-[11px] font-semibold text-slate-400">Verified History</span>
              </div>

              <div className="space-y-2.5 pt-0.5">
                {previousJobs.map((job, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-slate-50/90 via-white to-slate-50/50 border border-slate-200/80 flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#0755E8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {job.company ? job.company[0].toUpperCase() : "W"}
                    </div>
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-xs font-bold text-slate-900">
                          {job.title || "Software Engineer"}
                        </h3>
                        {job.start && (
                          <span className="text-[10.5px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {job.start} {job.end ? `- ${job.end}` : "- Present"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#0755E8] font-bold">
                        {job.company || "Company"}
                      </p>
                      {job.description && (
                        <p className="text-[11px] text-slate-500 pt-0.5 leading-relaxed">
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
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <span>Education &amp; Credentials</span>
                </h2>
                <span className="text-[11px] font-semibold text-slate-400">Verified Academics</span>
              </div>

              <div className="space-y-2.5 pt-0.5">
                {educationList.map((edu, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/50 border border-slate-200/80 flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-xs font-bold text-slate-900">
                          {edu.degree || "Degree"} {edu.field ? `in ${edu.field}` : ""}
                        </h3>
                        {edu.end && (
                          <span className="text-[10.5px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            Class of {edu.end}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-800 font-bold">
                        {edu.institution || "University"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidate Reviews */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0755E8] flex items-center justify-center border border-blue-100">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <span>Candidate Reviews ({reviews.length})</span>
              </h2>
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/60 shadow-2xs">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{displayRating} rating</span>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading reviews...</div>
            ) : reviews.length > 0 ? (
              <div className="space-y-2.5 pt-0.5">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0755E8] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {rev.name ? rev.name[0].toUpperCase() : "C"}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block leading-tight">
                            {rev.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-tight">
                            {rev.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= rev.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-slate-200 text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed italic">
                      "{rev.comment}"
                    </p>

                    <div className="text-[10px] text-slate-400 text-right">
                      {rev.date}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 px-3 text-center bg-gradient-to-b from-blue-50/30 to-slate-50/50 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] border border-[#93B8FF] flex items-center justify-center mx-auto text-[#0755E8] shadow-xs">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Be the First Verified Reviewer</h3>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Book a 1:1 mock interview with {profile.name}. Receive an actionable scorecard and share your candid feedback to help future candidates!
                </p>
                <div className="pt-1.5">
                  <button
                    type="button"
                    disabled={isOwnProfile}
                    onClick={() => {
                      if (isOwnProfile) return;
                      setIsBookingModalOpen(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      isOwnProfile
                        ? "bg-slate-200/90 text-slate-400 border border-slate-300/70 cursor-not-allowed shadow-none"
                        : "bg-[#0755E8] hover:bg-[#0645C7] text-white shadow-xs cursor-pointer active:scale-95"
                    }`}
                    title={isOwnProfile ? "Booking is disabled for your own profile" : "Book Session & Review First"}
                  >
                    <Calendar className={`w-3.5 h-3.5 ${isOwnProfile ? "text-slate-400" : "text-white"}`} />
                    <span>{isOwnProfile ? "Book Session (Disabled)" : "Book Session & Review First"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Booking Sidebar (1 col) */}
        <div className="space-y-4">
          <div className="sticky top-20 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden text-left">
            <div className="p-4 sm:p-5 space-y-4">
              {/* Session Investment Price Header */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#0755E8] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                    SESSION INVESTMENT
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Available Slots Open
                  </span>
                </div>

                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    ₹{cleanPrice}
                  </span>
                  <span className="text-xs font-bold text-slate-400 line-through">
                    ₹{originalPrice}
                  </span>
                  <span className="text-[10.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                    Save 30%
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                  Per 1:1 comprehensive mock interview with full rubric report
                </p>
              </div>

              {/* Session Highlights */}
              <div className="space-y-2 pt-2.5 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
                  What's Included:
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-700 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0755E8] shrink-0 mt-0.5" />
                    <span>1:1 Live Interactive Video Mock Interview</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0755E8] shrink-0 mt-0.5" />
                    <span>Real Coding Sandbox &amp; Architecture Practice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0755E8] shrink-0 mt-0.5" />
                    <span>Instant Written Rubric Scorecard &amp; Feedback</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0755E8] shrink-0 mt-0.5" />
                    <span>Flexible 30 or 60 minute slot lengths</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Free Rescheduling up to 2 hours prior</span>
                  </li>
                </ul>
              </div>

              {/* Primary and Secondary Action Buttons */}
              <div className="space-y-2 pt-1.5">
                <button
                  type="button"
                  disabled={isOwnProfile}
                  onClick={() => {
                    if (isOwnProfile) return;
                    setIsBookingModalOpen(true);
                  }}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isOwnProfile
                      ? "bg-slate-200/90 text-slate-400 border border-slate-300/70 cursor-not-allowed shadow-none"
                      : "bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#0537A0] text-white shadow-sm hover:shadow-md cursor-pointer active:scale-98"
                  }`}
                  title={isOwnProfile ? "Booking is disabled for your own profile" : "Select Date & Time Slot"}
                >
                  <Calendar className={`w-3.5 h-3.5 ${isOwnProfile ? "text-slate-400" : "text-white"}`} />
                  <span>{isOwnProfile ? "Select Date & Time Slot (Disabled)" : "Select Date & Time Slot"}</span>
                  {!isOwnProfile && <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {isOwnProfile && (
                  <div className="p-2 bg-amber-50/90 border border-amber-200/80 rounded-lg text-center">
                    <p className="text-[10.5px] font-bold text-amber-800">
                      Preview Mode
                    </p>
                    <p className="text-[9.5px] text-amber-700 mt-0.5 leading-snug">
                      You are viewing your own public profile. Booking is disabled for your account.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isOwnProfile}
                  onClick={isOwnProfile ? undefined : toggleSave}
                  className={`w-full py-2 px-3.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    isOwnProfile
                      ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-60"
                      : "bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 border-slate-200 cursor-pointer"
                  }`}
                  title={isOwnProfile ? "You cannot save your own profile" : isSaved ? "Saved to wishlist" : "Save to Shortlist"}
                >
                  <Bookmark className={`w-3 h-3 ${isSaved && !isOwnProfile ? "fill-rose-500 text-rose-500" : ""}`} />
                  <span>{isSaved && !isOwnProfile ? "Saved to Wishlist" : "Save to Shortlist"}</span>
                </button>
              </div>

              {/* Guarantee & Money Back Policy */}
              <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                <div className="flex items-start gap-1.5 text-[10.5px] text-slate-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-800 font-bold">100% Candidate Money Safety:</strong> If an expert fails to attend, your funds are immediately refunded to your wallet.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      </main>

      {/* Booking Modal (Opened directly from this Profile Page) */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setPendingBookingData(null);
            clearPendingBooking();
          }}
          expertId={expertId}
          initialProfile={profile}
          initialPendingBooking={pendingBookingData}
        />
      )}
    </div>
  );
}
