import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from '../lib/axios';
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Star, Clock, Calendar, CheckCircle, Shield, Video,
  ChevronLeft, ChevronRight, ChevronDown, ThumbsUp, MessageCircle, Briefcase,
  Share2, Check, ArrowRight, ArrowLeft, Timer, BadgeCheck, Code2, Compass, FileText,
  MessageSquare, AlertCircle, Info, Sparkles, UserCheck, CheckCircle2, CreditCard,
  ShieldCheck, HelpCircle, Award, RotateCcw, Headphones, X, CheckSquare, Square
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
  mapExpertToProfile,
  Profile,
  getKolkataToday,
  getKolkataTimeParts,
  getKolkataDateString,
  getInitialKolkataMonth,
  generateAvailableSlotsForDate,
  getFirstAvailableMonth
} from "../lib/bookSessionUtils";
import { AVAILABLE_LEVELS } from "./BookingModal";
import { ConfirmationLoadingModal, BookingFlowState } from "./ConfirmationLoadingModal";
import { showBookingSuccessAlert } from "../lib/bookingSuccessAlert";

/**
 * Skeleton Loader matching Mockeefy clean design
 */
const BookSessionSkeleton = () => (
  <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-[28px] p-5 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden pb-16 font-sans text-left">
    {/* Decorative gradient glow */}
    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-3xl pointer-events-none" />
    <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />
    <div className="w-full space-y-6 animate-pulse font-sans text-left relative z-10">
      <div className="h-6 w-64 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
            <div className="h-6 bg-slate-200 w-48 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
            <div className="h-6 bg-slate-200 w-40 rounded" />
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

type SessionDuration = 30 | 60;
const isSessionDuration = (d: unknown): d is SessionDuration => d === 30 || d === 60;

interface Review {
  id: string;
  name: string;
  role: string;
  rating: number;
  comment: string;
  date: string;
  avatar?: string;
  strengths?: string[];
}

const SESSION_GOALS = [
  {
    id: "technical",
    title: "Technical Interview Preparation",
    desc: "Practice coding problems, data structures, algorithms, and technical concepts.",
    icon: Code2,
  },
  {
    id: "career",
    title: "Career Guidance",
    desc: "Discuss career progression paths, role requirements, and professional growth.",
    icon: Compass,
  },
  {
    id: "resume",
    title: "Resume Review",
    desc: "Receive actionable feedback on your resume structure, ATS alignment, and presentation.",
    icon: FileText,
  },
  {
    id: "mentorship",
    title: "General Mentorship",
    desc: "Ask personalized industry questions, discuss roadmap challenges, and plan next steps.",
    icon: MessageSquare,
  },
];

const BOOKING_FAQS = [
  {
    q: "How do I access the live video session?",
    a: "You'll receive a direct meeting link via email and on your dashboard. When your slot arrives, simply click 'Join Meeting Room' right from your browser—no downloads or complex setup required."
  },
  {
    q: "Can I reschedule my session if needed?",
    a: "Yes! You can reschedule your slot free of charge up to 2 hours before the scheduled time directly from your 'My Sessions' dashboard."
  },
  {
    q: "When will I receive my scorecard & feedback?",
    a: "Your interview expert submits an in-depth scorecard covering technical depth, communication, and problem-solving metrics within 24 hours of session completion."
  },
  {
    q: "Will I get an official Certificate of Completion?",
    a: "Yes, every completed mock interview issues a verified Mockeefy Certificate of Interview Completion that you can add directly to LinkedIn or your resume."
  }
];

export default function BookSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const { profile: existingProfile, expertId: stateExpertId, price: overridePrice } = location.state || {};
  const queryExpertId = searchParams.get("expertId");
  const storedExpertId = typeof window !== "undefined" ? sessionStorage.getItem("current_booking_expert_id") : null;
  const expertId = stateExpertId || existingProfile?.id || queryExpertId || storedExpertId;

  // Immediately sanitize browser address bar so database ID is never exposed
  useEffect(() => {
    if (queryExpertId) {
      sessionStorage.setItem("current_booking_expert_id", queryExpertId);
      // Strip query parameter from address bar while preserving router history state
      window.history.replaceState(window.history.state, document.title, window.location.pathname);
    } else if (expertId) {
      sessionStorage.setItem("current_booking_expert_id", expertId);
    }
  }, [queryExpertId, expertId]);

  // Load Razorpay Checkout SDK dynamically on this page
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const [userDiscussionNotes, setUserDiscussionNotes] = useState<string>("");

  // Promo code & pricing states
  const [discountCode, setDiscountCode] = useState("");
  const [appliedFreePromo, setAppliedFreePromo] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"not_paid" | "paid">("not_paid");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [expertAvatarError, setExpertAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "reviews">("about");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Lock body scroll when profile modal is open
  useEffect(() => {
    if (isProfileModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isProfileModalOpen]);

  // Handle ESC key to dismiss profile modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isProfileModalOpen) {
        setIsProfileModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProfileModalOpen]);

  const shareMenuRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Close share menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch expert profile with instant verified fallback
  const { data: profile, isLoading: isQueryLoading, error: queryError } = useQuery<Profile | null>({
    queryKey: ["expertProfile", expertId],
    queryFn: async () => {
      if (!expertId) return null;
      try {
        const response = await axios.get(`/api/expert/public/profile/${expertId}`);
        if (response.data?.success && response.data?.profile) {
          return mapExpertToProfile(response.data.profile);
        }
      } catch (err) {
        console.warn("Public profile endpoint error, trying verified list fallback", err);
      }

      // Fallback to verified experts list
      try {
        const res = await axios.get(`/api/expert/verified`);
        const experts = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const matched = experts.find((e: any) => (e._id || e.userId) === expertId);
        if (matched) {
          return mapExpertToProfile(matched);
        }
      } catch (fallbackErr) {
        console.error("Verified fallback failed", fallbackErr);
      }

      throw new Error("Expert profile not found");
    },
    initialData: existingProfile && (existingProfile as any).availability ? existingProfile : undefined,
    enabled: !!expertId,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const loading = isQueryLoading && !profile;

  // Auto-scroll directly to Step 1 (Select Date & Available Time Slot) when navigated from Book Session
  useEffect(() => {
    if (!loading && profile) {
      if (
        location.hash === "#time-slots-section" ||
        location.hash === "#step-1" ||
        location.state?.scrollToSlots ||
        searchParams.get("step") === "1"
      ) {
        const timer = setTimeout(() => {
          const el = document.getElementById("time-slots-section");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, profile, location.hash, location.state, searchParams]);

  // Computed allowed durations
  const durationOptions = useMemo<SessionDuration[]>(() => {
    const prof = profile || existingProfile;
    const allowed = prof?.availability?.allowedDurations;
    const allowedSet = new Set<SessionDuration>(
      Array.isArray(allowed) ? allowed.filter(isSessionDuration) : []
    );

    if (allowedSet.size === 0) {
      const single = prof?.availability?.sessionDuration;
      if (isSessionDuration(single)) allowedSet.add(single);
      else allowedSet.add(30);
    }

    const arr = Array.from(allowedSet).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [30];
  }, [profile?.availability?.allowedDurations, profile?.availability?.sessionDuration, existingProfile]);

  const [sessionDuration, setSessionDuration] = useState<SessionDuration>(() => durationOptions[0] || 30);

  useEffect(() => {
    if (durationOptions.length > 0 && !durationOptions.includes(sessionDuration)) {
      setSessionDuration(durationOptions[0]);
    }
  }, [durationOptions, sessionDuration]);

  // Expert Level & calculated pricing (strictly only mentor's profile levels)
  const expertLevels = useMemo<string[]>(() => {
    const prof = profile || existingProfile;
    const levels = prof?.levels || (prof as any)?.professionalDetails?.levels;
    if (Array.isArray(levels) && levels.length > 0) {
      const valid = levels.filter((lvl: string) => AVAILABLE_LEVELS.includes(lvl));
      if (valid.length > 0) return valid;
    }
    const single = prof?.level || (prof as any)?.professionalDetails?.level;
    if (single && AVAILABLE_LEVELS.includes(single)) {
      return [single];
    }
    return ["Rising Mentor"];
  }, [profile, existingProfile]);

  const [selectedLevel, setSelectedLevel] = useState<string>(() => {
    const prof = (existingProfile as any);
    if (prof?.level && AVAILABLE_LEVELS.includes(prof.level)) return prof.level;
    if (Array.isArray(prof?.levels) && prof.levels.length > 0) return prof.levels[0];
    return "Rising Mentor";
  });
  const [levelPrices, setLevelPrices] = useState<Record<string, number>>(() => {
    const prof = (existingProfile as any);
    const rawVal = prof?.minPrice ?? prof?.rawExpert?.minPrice ?? prof?.price ?? overridePrice;
    const parsed = typeof rawVal === "number" ? rawVal : parseInt(String(rawVal || "").replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      const primary = prof?.level || (Array.isArray(prof?.levels) ? prof.levels[0] : "Rising Mentor");
      return { [primary]: parsed };
    }
    return {};
  });
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [bookingFlowState, setBookingFlowState] = useState<BookingFlowState>("selecting");

  useEffect(() => {
    if (expertLevels.length > 0 && !expertLevels.includes(selectedLevel)) {
      setSelectedLevel(expertLevels[0]);
    }
  }, [expertLevels, selectedLevel]);

  const basePrice = useMemo(() => {
    if (overridePrice) return Number(overridePrice) || 0;
    const prof = (existingProfile as any) || (profile as any);
    const rawVal = prof?.minPrice ?? prof?.rawExpert?.minPrice ?? prof?.price;
    if (rawVal != null) {
      const parsed = parseInt(String(rawVal).replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 499;
  }, [profile, existingProfile, overridePrice]);

  useEffect(() => {
    const expertIdToUse = profile?.id || (existingProfile as any)?._id || (existingProfile as any)?.id || expertId;
    if (!expertIdToUse || ![30, 60].includes(sessionDuration) || expertLevels.length === 0) {
      setCalculatedPrice(basePrice);
      return;
    }

    let active = true;
    const fetchAllPrices = async () => {
      const prices: Record<string, number> = {};
      await Promise.all(
        expertLevels.map(async (lvl) => {
          try {
            const res = await axios.get("/api/pricing/calculate-price", {
              params: { expertId: expertIdToUse, duration: sessionDuration, level: lvl }
            });
            if (res.data?.finalPrice != null) {
              prices[lvl] = res.data.finalPrice;
              return;
            }
          } catch (_) {}
          prices[lvl] = sessionDuration === 30 ? 499 : 899;
        })
      );
      if (active) {
        setLevelPrices(prices);
        if (prices[selectedLevel] != null) {
          setCalculatedPrice(prices[selectedLevel]);
        }
      }
    };
    fetchAllPrices();
    return () => {
      active = false;
    };
  }, [profile?.id, (existingProfile as any)?._id, (existingProfile as any)?.id, expertId, sessionDuration, selectedLevel, basePrice, expertLevels]);

  // Actual session fee for the chosen duration & level
  const sessionFee = levelPrices[selectedLevel] ?? (calculatedPrice > 0 ? calculatedPrice : basePrice);
  const promoDiscount = appliedFreePromo ? sessionFee : 0;
  const finalPayable = Math.max(0, sessionFee - promoDiscount);
  const displayPrice = finalPayable;

  // Calendar dates in Asia/Kolkata timezone
  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialKolkataMonth);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; available: boolean } | null>(null);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);

  const [canScrollCarouselLeft, setCanScrollCarouselLeft] = useState(false);
  const [canScrollCarouselRight, setCanScrollCarouselRight] = useState(false);

  const checkCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollCarouselLeft(el.scrollLeft > 4);
    setCanScrollCarouselRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollCarousel = (direction: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollAmount = 210;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
    setTimeout(checkCarouselScroll, 320);
  };

  // Drag-to-flick mouse handlers
  const isDraggingCarousel = useRef(false);
  const startDragX = useRef(0);
  const scrollLeftStart = useRef(0);
  const hasDragged = useRef(false);

  const handleCarouselMouseDown = (e: React.MouseEvent) => {
    const el = carouselRef.current;
    if (!el) return;
    isDraggingCarousel.current = true;
    hasDragged.current = false;
    startDragX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
    el.style.scrollBehavior = "auto";
  };

  const handleCarouselMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCarousel.current) return;
    const el = carouselRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startDragX.current;
    if (Math.abs(walk) > 4) {
      hasDragged.current = true;
    }
    el.scrollLeft = scrollLeftStart.current - walk;
    checkCarouselScroll();
  };

  const handleCarouselMouseUpOrLeave = () => {
    if (!isDraggingCarousel.current) return;
    isDraggingCarousel.current = false;
    const el = carouselRef.current;
    if (el) {
      el.style.scrollBehavior = "smooth";
      checkCarouselScroll();
    }
  };

  const handleCarouselWheel = (e: React.WheelEvent) => {
    const el = carouselRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      checkCarouselScroll();
    }
  };

  // Fetch booked sessions & reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!expertId) return;

    let isMounted = true;
    const fetchSessions = async () => {
      try {
        const candidateUserId = user?.id || user?._id || (user as any)?.userId;
        const [expertRes, candidateRes] = await Promise.allSettled([
          axios.get(`/api/sessions/expert/${expertId}`),
          candidateUserId
            ? axios.get(`/api/sessions/candidate/${candidateUserId}`)
            : Promise.resolve({ data: [] }),
        ]);

        if (!isMounted) return;

        const allBooked: any[] = [];
        if (expertRes.status === "fulfilled" && Array.isArray(expertRes.value.data)) {
          allBooked.push(...expertRes.value.data);
        }
        if (candidateRes.status === "fulfilled" && Array.isArray(candidateRes.value.data)) {
          allBooked.push(...candidateRes.value.data);
        }

        setBookedSessions(allBooked);
      } catch (err) {
        console.error("Failed to load booked sessions", err);
      }
    };
    fetchSessions();

    return () => {
      isMounted = false;
    };
  }, [expertId, user?.id, user?._id, (user as any)?.userId]);

  useEffect(() => {
    if (!expertId) return;

    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const res = await axios.get(`/api/reviews/expert/${expertId}`);
        if (res.data?.success && Array.isArray(res.data.data)) {
          setReviews(res.data.data.map((r: any) => ({
            id: r._id || r.id || String(Math.random()),
            name: r.candidateName || r.name || "Candidate",
            role: r.candidateRole || r.role || "Software Engineer",
            rating: r.overallRating || r.rating || 5,
            comment: r.feedback || r.comment || "Great mock interview with insightful feedback.",
            date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Recently",
            avatar: r.candidateAvatar || r.avatar,
            strengths: r.strengths || [],
          })));
        }
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [expertId]);

  // Compute valid dates for currentMonth that actually have scheduled, available openings
  const dates = useMemo(() => {
    if (!profile?.availability) return [];

    const parts = getKolkataTimeParts(currentMonth);
    const year = parts.year;
    const month = parts.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allDates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const todayDateStr = getKolkataDateString(new Date());

    return allDates.filter(date => {
      const dateStr = getKolkataDateString(date);
      // Past days cannot be selected
      if (dateStr < todayDateStr) return false;

      // Only show dates where the expert has scheduled timings with remaining available slots
      const slots = generateAvailableSlotsForDate(date, profile.availability, sessionDuration, bookedSessions);
      return slots.length > 0;
    });
  }, [currentMonth, profile?.availability, sessionDuration, bookedSessions]);

  // Derived active date (eliminates index desynchronization and array out-of-bounds flickers)
  const activeDate = useMemo(() => {
    if (!dates || dates.length === 0) return null;
    if (selectedDateStr) {
      const found = dates.find(d => getKolkataDateString(d) === selectedDateStr);
      if (found) return found;
    }
    return dates[0];
  }, [dates, selectedDateStr]);

  // Synchronize selectedDateStr with available dates
  useEffect(() => {
    if (dates.length > 0) {
      const exists = dates.some(d => getKolkataDateString(d) === selectedDateStr);
      if (!exists) {
        setSelectedDateStr(getKolkataDateString(dates[0]));
      }
    } else {
      setSelectedDateStr("");
    }
  }, [dates, selectedDateStr]);

  // If opening page and current month has 0 openings, auto-navigate to the first month with available openings
  const hasAutoSelectedMonth = useRef(false);
  useEffect(() => {
    hasAutoSelectedMonth.current = false;
  }, [expertId]);

  useEffect(() => {
    if (profile?.availability && !hasAutoSelectedMonth.current) {
      hasAutoSelectedMonth.current = true;
      const firstAvailMonth = getFirstAvailableMonth(profile.availability, sessionDuration, bookedSessions);
      if (
        firstAvailMonth.getMonth() !== currentMonth.getMonth() ||
        firstAvailMonth.getFullYear() !== currentMonth.getFullYear()
      ) {
        setCurrentMonth(firstAvailMonth);
      }
    }
  }, [profile?.availability, sessionDuration, bookedSessions]);

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDateStr("");
    setSelectedSlot(null);
  };

  const prevMonth = () => {
    const todayKolkata = getKolkataToday();
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (prev.getMonth() < todayKolkata.getMonth() && prev.getFullYear() <= todayKolkata.getFullYear()) {
      setCurrentMonth(getInitialKolkataMonth());
    } else {
      setCurrentMonth(prev);
    }
    setSelectedDateStr("");
    setSelectedSlot(null);
  };

  // Generate slots for selected date
  const currentSlots = useMemo(() => {
    if (!profile?.availability || !activeDate) return [];
    return generateAvailableSlotsForDate(activeDate, profile.availability, sessionDuration, bookedSessions);
  }, [activeDate, profile?.availability, sessionDuration, bookedSessions]);

  // Auto-deselect if the selected slot becomes unavailable or was booked
  useEffect(() => {
    if (selectedSlot && !currentSlots.some((s) => s.time === selectedSlot.time)) {
      setSelectedSlot(null);
    }
  }, [currentSlots, selectedSlot]);

  // Real-time listener for booked sessions across browser tabs / windows
  useEffect(() => {
    const handleSessionBooked = (e: any) => {
      if (e.detail?.expertId === expertId) {
        setBookedSessions((prev) => [
          ...prev,
          { startTime: e.detail.startTime, endTime: e.detail.endTime, status: "confirmed" },
        ]);
      }
    };
    window.addEventListener("session-booked", handleSessionBooked);
    return () => window.removeEventListener("session-booked", handleSessionBooked);
  }, [expertId]);

  const handleApplyPromo = () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a discount code.");
      return;
    }
    if (code === "FREEMU001") {
      setAppliedFreePromo(true);
      toast.success("Promo code applied! 100% Free Mock Interview Session unlocked.");
    } else {
      toast.error("Invalid or expired promo code.");
    }
  };

  const handleRemovePromo = () => {
    setAppliedFreePromo(false);
    setDiscountCode("");
    toast.info("Promo code removed.");
  };

  // Share handlers
  const handleShare = (type: string) => {
    const shareUrl = window.location.href;
    const shareText = `Book a 1:1 session with ${profile?.name || "Interview Expert"} on Mockeefy!`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (type) {
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`);
        break;
      case "x":
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
        break;
      case "whatsapp":
        window.open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`);
        break;
      case "copy":
      default:
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
        break;
    }
    setIsShareMenuOpen(false);
  };

  // Booking Execution
  const handleProceedBooking = async () => {
    if (!selectedSlot) {
      toast.error("Please select an available time slot before continuing.");
      const slotsElement = document.getElementById("time-slots-section");
      if (slotsElement) {
        slotsElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (!user) {
      Swal.fire({
        title: "Sign In Required",
        text: "Please sign in to confirm your session booking.",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Sign In",
        confirmButtonColor: "#0755E8",
      }).then((res) => {
        if (res.isConfirmed) {
          navigate("/signin", { state: { returnUrl: `/book-session?expertId=${expertId}` } });
        }
      });
      return;
    }

    const date = activeDate;
    if (!date || !profile) return;

    const kolkataDateStr = getKolkataDateString(date);
    const [startRaw, endRaw] = selectedSlot.time.split(/\s*[-–]\s*/);

    const parseToHHMM = (timeStr: string) => {
      const match = (timeStr || "").trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return "00:00";
      let h = parseInt(match[1], 10);
      const m = match[2];
      const mer = (match[3] || "").toUpperCase();
      if (mer === "PM" && h < 12) h += 12;
      if (mer === "AM" && h === 12) h = 0;
      return `${h.toString().padStart(2, "0")}:${m}`;
    };

    const startTime = new Date(`${kolkataDateStr}T${parseToHHMM(startRaw)}:00+05:30`).toISOString();
    const endTime = new Date(`${kolkataDateStr}T${parseToHHMM(endRaw)}:00+05:30`).toISOString();

    const candidateId = user?.id || user?.userId || (user as any)?._id;

    const payload = {
      expertId: profile.id || expertId,
      candidateId,
      userId: candidateId,
      candidateName: user?.name,
      candidateEmail: user?.email,
      candidatePhone: user?.personalInfo?.phone || user?.phone,
      expertName: profile.name,
      expertEmail: (profile as any).userDetails?.email || (profile as any).email || "",
      expertPhone: (profile as any).phone || "",
      expertCategory: profile.category || "IT",
      userCategory: profile.category || "IT",
      sessionCategory: profile.category || "IT",
      sessionType: "1:1 Live Mock Interview",
      sessionDuration: Number(sessionDuration),
      level: selectedLevel,
      startTime,
      endTime,
      price: appliedFreePromo ? 0 : sessionFee,
      originalPrice: sessionFee,
      discount: appliedFreePromo ? sessionFee : 0,
      status: "scheduled",
      isPremiumSession: !!(user?.isPremium),
      notes: userDiscussionNotes.trim() || "1:1 Live Mock Interview",
    };

    const selectedDateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const selectedTimeSlot = selectedSlot.time;

    const onBookingSuccess = (successTitle: string, extraNote: string = "") => {
      // 1. Instantly remove this timing slot from available slots locally
      setBookedSessions((prev) => [
        ...prev,
        { startTime: payload.startTime, endTime: payload.endTime, status: "confirmed" },
      ]);

      // 2. Dispatch cross-component event so all screens/tabs update instantly
      window.dispatchEvent(
        new CustomEvent("session-booked", {
          detail: {
            expertId: profile?.id || expertId,
            startTime: payload.startTime,
            endTime: payload.endTime,
          },
        })
      );

      setPaymentStatus("paid");

      // 3. User notification: Toast
      toast.success(`Meeting Scheduled! Your meeting has been scheduled on ${selectedDateStr} at ${selectedTimeSlot}.`);

      // 4. Mark confirmed and navigate to /my-sessions
      setBookingFlowState("confirmed");
      navigate("/my-sessions", { replace: true });

      // 5. User notification: Professional Confirmation Modal (No icons/emojis, structured layout)
      showBookingSuccessAlert({
        title: "Meeting Scheduled",
        mentorName: profile.name,
        dateStr: selectedDateStr,
        timeSlot: selectedTimeSlot,
        duration: sessionDuration,
        extraNote,
        onConfirm: () => {
          navigate("/my-sessions");
        },
      });
    };

    try {
      setIsProcessing(true);

      // 1. Free promo booking
      if (appliedFreePromo) {
        setBookingFlowState("confirming");
        const res = await axios.post("/api/sessions/book-free", payload);
        if (res.data?.success) {
          onBookingSuccess("Meeting Scheduled!", "Free promotional session unlocked.");
        } else {
          setBookingFlowState("selecting");
          throw new Error(res.data?.message || "Free booking failed.");
        }
        return;
      }

      // 2. Premium user credit booking
      if (user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)) {
        setBookingFlowState("confirming");
        const res = await axios.post("/api/payment/use-premium-credit", { bookingDetails: payload });
        if (res.data?.success) {
          onBookingSuccess("Meeting Scheduled!", `Booked with Premium Credit (${res.data.remainingCredits ?? 0} credits remaining).`);
        } else {
          setBookingFlowState("selecting");
          throw new Error(res.data?.message || "Premium credit booking failed.");
        }
        return;
      }

      // 3. Paid Standard Checkout: DIRECTLY OPEN RAZORPAY GATEWAY ON THIS SAME PAGE!
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay payment gateway failed to load. Please check your internet connection.");
      }

      // Create order with Razorpay backend
      const orderResponse = await axios.post("/api/payment/create-order", {
        amount: sessionFee,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`
      });

      if (!orderResponse.data?.success || !orderResponse.data?.order) {
        throw new Error(orderResponse.data?.message || "Failed to create payment order.");
      }

      const { order } = orderResponse.data;
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_SqNEn1MzouLlsg";
      let paymentCompleted = false;

      // Switch to payment_processing state before opening Razorpay checkout window
      setBookingFlowState("payment_processing");

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "Mockeefy",
        description: `${sessionDuration} Min Mock Interview with ${profile.name}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            paymentCompleted = true;
            // IMMEDIATELY enter confirming state so previous booking screen never flashes
            setBookingFlowState("confirming");
            setIsProcessing(true);
            const verifyRes = await axios.post("/api/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentType: "booking",
              user: user,
              bookingDetails: {
                expertId: profile.id || expertId,
                expertName: profile.name,
                expertEmail: (profile as any).userDetails?.email || (profile as any).email || "",
                candidateId,
                candidateName: user?.name,
                candidateEmail: user?.email,
                candidatePhone: user?.personalInfo?.phone || user?.phone,
                startTime,
                endTime,
                price: sessionFee,
                topics: [profile.category || "1:1 Mock Interview"],
                duration: Number(sessionDuration),
                level: selectedLevel,
                notes: userDiscussionNotes.trim() ? userDiscussionNotes.trim() : "1:1 Live Mock Interview"
              }
            });

            if (verifyRes.data?.success) {
              onBookingSuccess("Meeting Scheduled!");
            } else {
              throw new Error(verifyRes.data?.message || "Payment verification failed.");
            }
          } catch (verifyErr: any) {
            console.error("Payment Verification Error:", verifyErr);
            setBookingFlowState("error");
            Swal.fire({
              title: "Payment Verification Failed",
              text: verifyErr?.response?.data?.message || verifyErr.message || "Could not verify payment.",
              icon: "error"
            }).then(() => {
              setBookingFlowState("selecting");
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#0755E8",
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            if (!paymentCompleted) {
              setBookingFlowState("selecting");
              toast.info("Payment was cancelled. Your slot is still selected.");
            }
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Booking error", err);
      setBookingFlowState("selecting");
      Swal.fire({
        title: "Booking Failed",
        text: err?.response?.data?.message || err.message || "An error occurred while booking. Please try again.",
        icon: "error",
        confirmButtonColor: "#0755E8",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (bookingFlowState === "confirmed") {
    return null;
  }

  if (bookingFlowState === "confirming" || bookingFlowState === "payment_processing") {
    return (
      <ConfirmationLoadingModal
        expertName={profile?.name || "Mentor"}
        isConfirming={bookingFlowState === "confirming"}
      />
    );
  }

  // Fallback for missing/invalid expertId
  if (!expertId || (!loading && !profile)) {
    return (
      <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-[28px] p-5 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden pb-16 font-sans text-left">
        {/* Decorative gradient glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />

        <div className="w-full relative z-10 py-12">
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Interview Expert Not Found</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              We couldn't locate the requested interview expert profile. Browse our verified directory to choose an expert for your session.
            </p>
            <Link
              to="/find-mentor"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Browse All Interview Experts</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <BookSessionSkeleton />;
  }

  const expertInitials = (profile.name || "EX").trim().substring(0, 2).toUpperCase();
  const selectedDateObj = activeDate;

  return (
    <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-[28px] p-5 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden pb-16 font-sans text-left">
      {/* Decorative gradient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10 animate-in fade-in duration-200">
        
        {/* 1. Page Header with Clean Breadcrumbs & Back Button */}
        <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/80 px-5 sm:px-6 py-4 shadow-2xs">
        <div className="flex items-center justify-between gap-4 mb-2">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              const targetId = expertId || profile?.id;
              navigate("/", {
                state: {
                  scrollToExpertId: targetId,
                  scrollToExpertName: profile?.name,
                  preventScrollTop: true,
                },
              });
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] hover:bg-[#D5E5FF] active:bg-[#C2DBFF] text-[#0755E8] border border-[#93B8FF]/80 hover:border-[#0755E8]/60 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Back to Interview Experts"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Interview Experts</span>
          </button>

          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
            <Link
              to="/"
              state={{
                scrollToExpertId: expertId || profile?.id,
                scrollToExpertName: profile?.name,
                preventScrollTop: true,
              }}
              className="text-slate-600 hover:text-[#0755E8] transition-colors"
            >
              Find Interview Experts
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 truncate max-w-[200px]">
              {profile.name}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-[#0755E8] font-bold">Book a Session</span>
          </nav>
        </div>

        {/* Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              Book Your Interview Session
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
              Get personalized guidance to help you prepare, build confidence, and reach your career goals.
            </p>
          </div>

          {/* Quick Share action */}
          <div className="relative shrink-0" ref={shareMenuRef}>
            <button
              type="button"
              onClick={() => setIsShareMenuOpen(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              title="Share interview expert profile"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            {isShareMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => handleShare("copy")}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0755E8] rounded-lg transition-colors cursor-pointer"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={() => handleShare("linkedin")}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0755E8] rounded-lg transition-colors cursor-pointer"
                >
                  Share to LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => handleShare("whatsapp")}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0755E8] rounded-lg transition-colors cursor-pointer"
                >
                  Share to WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => handleShare("x")}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0755E8] rounded-lg transition-colors cursor-pointer"
                >
                  Share to X (Twitter)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Workspace: Two-Column Balanced Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================== */}
        {/* LEFT / MAIN COLUMN (lg:col-span-7): Booking Form Sections */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-6">

          {/* Section A: Scheduling (Date & Time) - Now Step 1 */}
          <div id="time-slots-section" className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs scroll-mt-20">
            
            {/* EXPERT LEVELS SELECTION (Matches User Image Style) */}
            <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/90 mb-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Select Expert Level
                  </label>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Click the level of expert you want to conduct your mock interview session.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full border border-[#93B8FF]/40">
                  Tier: {selectedLevel}
                </span>
              </div>

              <div className={`grid gap-2.5 sm:gap-3 ${expertLevels.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                {expertLevels.map((level) => {
                  const isChecked = selectedLevel === level;
                  const price = levelPrices[level];

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedLevel(level)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isChecked
                          ? "border-[#0755E8] bg-blue-50/40 text-[#0755E8] shadow-sm font-semibold ring-2 ring-[#0755E8]/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 text-[#0755E8]">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-[#0755E8]" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <span className={`text-sm font-bold truncate ${isChecked ? "text-[#0755E8]" : "text-slate-800"}`}>
                          {level}
                        </span>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        {price != null ? (
                          <span className={`text-xs font-black px-2.5 py-1 rounded-lg transition-all ${
                            isChecked
                              ? "bg-[#0755E8] text-white shadow-xs"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            ₹{price}
                          </span>
                        ) : (
                          <div className="w-10 h-5 bg-slate-200/70 rounded-md animate-pulse" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2FF] border border-[#93B8FF] text-[11px] font-bold text-[#0755E8] uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 text-[#0755E8]" />
                <span>Step 1</span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Select Date &amp; Available Time Slot
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All session times are displayed in your local India Standard Time (IST / GMT+5:30).
                  </p>
                </div>

                {/* Duration Toggle Buttons */}
                {durationOptions.length > 1 && (
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {durationOptions.map(dur => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => {
                          setSessionDuration(dur);
                          setSelectedSlot(null);
                          setPaymentStatus("not_paid");
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          sessionDuration === dur
                            ? "bg-white text-[#0755E8] shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {dur} Min
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Month Header & Picker Controls with Date Carousel Flick Buttons */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Date
                </span>
                {/* Carousel date scroll arrows (flick left/right through dates) */}
                <div className="flex items-center gap-1 ml-1">
                  <button
                    type="button"
                    onClick={() => scrollCarousel("left")}
                    disabled={!canScrollCarouselLeft}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-opacity"
                    title="Scroll dates left"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCarousel("right")}
                    disabled={!canScrollCarouselRight}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-opacity"
                    title="Scroll dates right"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Month Picker Navigation */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 min-w-[110px] text-center">
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Date Carousel with drag-to-flick, mousewheel, and smooth centering */}
            {loading || !profile?.availability ? (
              <div className="flex gap-2 overflow-hidden pb-2 mb-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="min-w-[66px] h-[72px] rounded-xl bg-slate-100 border border-slate-200/60 animate-pulse shrink-0"
                  />
                ))}
              </div>
            ) : (
              <div
                ref={carouselRef}
                onMouseDown={handleCarouselMouseDown}
                onMouseMove={handleCarouselMouseMove}
                onMouseUp={handleCarouselMouseUpOrLeave}
                onMouseLeave={handleCarouselMouseUpOrLeave}
                onWheel={handleCarouselWheel}
                className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none select-none cursor-grab active:cursor-grabbing scroll-smooth"
              >
                {dates.length > 0 ? (
                  dates.map((date) => {
                    const dateStr = getKolkataDateString(date);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isSelected = activeDate && dateStr === getKolkataDateString(activeDate);
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={(e) => {
                          if (hasDragged.current) return;
                          setSelectedDateStr(dateStr);
                          setSelectedSlot(null);
                          setPaymentStatus("not_paid");
                          (e.currentTarget as HTMLElement).scrollIntoView({
                            behavior: "smooth",
                            inline: "center",
                            block: "nearest",
                          });
                        }}
                        className={`min-w-[66px] text-center px-2 py-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-[#0755E8] border-[#0755E8] text-white shadow-xs ring-2 ring-[#0755E8]/20"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                          {isToday ? "TODAY" : date.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div className="font-extrabold text-lg my-0.5 tabular-nums leading-none">
                          {date.getDate()}
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-85">
                          {date.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="w-full py-4 px-3 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5">
                    <span>No openings scheduled for this month.</span>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="text-[#0755E8] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Check next month <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Available Time Slots Header & Grid (or empty month state) */}
            {dates.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/60 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4">
                <Calendar className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs sm:text-sm font-bold text-slate-800">No time slots scheduled for this month</p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                  {profile.name} has not scheduled any timings for {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}. Please check the next month for open slots.
                </p>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="mt-3 px-3.5 py-1.5 bg-[#0755E8] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Check Next Month</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                {/* Available Time Slots Header */}
                <div className="flex items-center justify-between mb-2.5 pt-1 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Available Slots for {activeDate ? activeDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""}
                  </span>
                  <span className="text-[11px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full border border-[#93B8FF]/40">
                    {currentSlots.filter(s => s.available).length} slots available
                  </span>
                </div>

                {/* Time Slot Grid (Natural flow, non-truncated time ranges) */}
                {loading || !profile?.availability ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-[38px] sm:h-[40px] rounded-xl bg-slate-100 border border-slate-200/60 animate-pulse"
                      />
                    ))}
                  </div>
                ) : currentSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                    {currentSlots.map((slot) => {
                      const isSelected = selectedSlot?.time === slot.time;
                      const isUnavailable = !slot.available;

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => {
                            setSelectedSlot(isSelected ? null : slot);
                            setPaymentStatus("not_paid");
                          }}
                          className={`relative flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all border outline-none focus-visible:ring-2 focus-visible:ring-[#0755E8] ${
                            isUnavailable
                              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                              : isSelected
                              ? "bg-[#0755E8] border-[#0755E8] text-white shadow-xs ring-2 ring-[#0755E8]/25 cursor-pointer"
                              : "bg-white border-slate-200 text-slate-700 hover:border-[#0755E8] hover:bg-[#F5F8FF] hover:text-[#0755E8] cursor-pointer"
                          }`}
                          title={isUnavailable ? `${slot.time} (Already Booked)` : slot.time}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : isUnavailable ? "text-slate-300" : "text-[#0755E8]"}`} />
                            <span className={`whitespace-nowrap tabular-nums tracking-tight font-semibold text-xs ${
                              isUnavailable ? "line-through text-slate-400" : isSelected ? "text-white font-bold" : "text-slate-800"
                            }`}>
                              {slot.time}
                            </span>
                          </div>
                          {isUnavailable ? (
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded shrink-0">
                              Booked
                            </span>
                          ) : isSelected ? (
                            <Check className="w-3.5 h-3.5 text-white stroke-[3] shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-slate-50/60 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-4">
                    <Calendar className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs sm:text-sm font-bold text-slate-800">No time slots available on this day</p>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                      {profile.name} has no remaining openings for this date. Please select another date from the carousel above.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Divider and Relocated Promo Code & Payment Details - Displayed only when user selects an available time slot */}
            {selectedSlot && (
              <div className="border-t border-slate-100 pt-5 mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Promo Code Input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Promo Code
                  </label>
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Enter code (e.g. FREEMU001)"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0755E8] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-4 py-2.5 bg-[#EAF2FF] hover:bg-[#dbe7fd] text-[#0755E8] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedFreePromo && (
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 mt-1 max-w-md">
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Free Promo Applied (100% off)
                      </span>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-red-500 hover:text-red-700 underline text-[10px] cursor-pointer font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Session Fee ({sessionDuration} mins)</span>
                    <span className="text-slate-900 font-bold tabular-nums">₹{sessionFee}</span>
                  </div>
                  {appliedFreePromo && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Promo Discount (100% off)</span>
                      <span className="tabular-nums">-₹{sessionFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2.5 border-t border-slate-100 items-baseline">
                    <div>
                      <span className="text-sm font-bold text-slate-900">Total Payable</span>
                      <span className="block text-[11px] font-normal text-slate-400">All fees &amp; taxes included</span>
                    </div>
                    <span className={`text-lg font-extrabold tabular-nums ${appliedFreePromo ? "text-emerald-600" : "text-[#0755E8]"}`}>
                      {appliedFreePromo ? "Free" : `₹${finalPayable}`}
                    </span>
                  </div>
                </div>

                {/* Single Prominent Confirmation CTA Button */}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleProceedBooking}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                    appliedFreePromo
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                      : "bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white shadow-[#0755E8]/20"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {appliedFreePromo
                          ? "Confirm Free Booking"
                          : user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)
                          ? `Book with Credit (${user.freeInterviewsCount} left)`
                          : `Proceed to Payment — ₹${finalPayable}`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Trust and Authenticity Badges */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Secure 256-bit encrypted checkout via Razorpay</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#0755E8] shrink-0" />
                    <span>Direct in-browser 1:1 video room provided on confirmation</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Session Preferences & Discussion Details - Step 2 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2FF] border border-[#93B8FF] text-[11px] font-bold text-[#0755E8] uppercase tracking-wider mb-1.5">
                <Video className="w-3 h-3 text-[#0755E8]" />
                <span>Step 2</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Session Preferences &amp; Discussion Notes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide optional context so your interview expert can prepare specific interview questions or feedback.
              </p>
            </div>

            <div className="space-y-4">
              {/* Meeting Format Pill */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0755E8] shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900">Meeting Format: 1-on-1 Live Video</p>
                  <p className="text-[11px] text-slate-500">Includes interactive shared notes and built-in screen sharing.</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  Live
                </span>
              </div>

              {/* Discussion Topics Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  What would you like to discuss? <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={userDiscussionNotes}
                  onChange={(e) => setUserDiscussionNotes(e.target.value)}
                  placeholder="e.g. Practicing system design for Senior Backend roles at tier-1 tech companies, reviewing specific LeetCode patterns, or refining resume bullet points."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0755E8] focus:ring-2 focus:ring-[#93B8FF]/20 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Mentor Profile Overview: About Mentor & Reviews Tabs */}
          <div id="mentor-reviews-tabs" className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs scroll-mt-20">
            {/* Tabs Bar */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("about")}
                className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
                  activeTab === "about"
                    ? "text-[#0755E8] border-[#0755E8] bg-[#F0F5FF]/50 rounded-t-xl"
                    : "text-slate-500 border-transparent hover:text-slate-900"
                }`}
              >
                About Interview Expert
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className={`px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
                  activeTab === "reviews"
                    ? "text-[#0755E8] border-[#0755E8] bg-[#F0F5FF]/50 rounded-t-xl"
                    : "text-slate-500 border-transparent hover:text-slate-900"
                }`}
              >
                Reviews &amp; Ratings ({reviews.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 sm:p-6">
              {activeTab === "about" ? (
                <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">About {profile.name}</h3>
                    <p className="text-slate-600">
                      {(profile as any).bio || `${profile.name} is a verified ${profile.category} interview expert with ${profile.experience ? (profile.experience.toLowerCase().includes("fresher") ? "early-stage industry experience" : `${profile.experience} of industry experience`) : "industry experience"} specializing in mock interviews, career guidance, and practical technical preparation.`}
                    </p>
                  </div>

                  {expertLevels.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Mentor Level &amp; Expertise Tier
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {expertLevels.map((lvl, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-[#EAF2FF] border border-[#93B8FF]/40 rounded-lg text-xs font-bold text-[#0755E8] inline-flex items-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5 text-[#0755E8]" />
                            {lvl}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.skills && profile.skills.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Core Competencies &amp; Technologies
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsLoading ? (
                    <div className="py-8 text-center text-xs text-slate-500">Loading reviews...</div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{r.name}</span>
                              <span className="text-[11px] text-slate-400">• {r.role}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{r.rating}.0</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 italic">"{r.comment}"</p>
                          <p className="text-[10px] text-slate-400 pt-1">{r.date}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm font-bold text-slate-800">No reviews yet</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Be the first candidate to book a session and leave a review for {profile.name}!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT / SECONDARY COLUMN (lg:col-span-5): Complete Companion Cards */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card 1: Mentor Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
              <div className="relative w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#0755E8] text-base">
                {profile.avatar && !profile.avatar.includes("default-avatar") && !expertAvatarError ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    onError={() => setExpertAvatarError(true)}
                  />
                ) : (
                  expertInitials
                )}
                <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                    {profile.name}
                  </h3>
                  <BadgeCheck className="w-4 h-4 text-white fill-[#0755E8] shrink-0" />
                </div>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  <span>{profile.role}</span>
                  {profile.company && (
                    <span className="text-slate-700 font-semibold"> at {profile.company}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-slate-600 flex-wrap">
                  <span className="flex items-center gap-0.5 text-amber-600">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{profile.rating || "4.9"}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{profile.experience}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[#0755E8] font-bold tabular-nums">₹{sessionFee} ({sessionDuration}m)</span>
                </div>
                {expertLevels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {expertLevels.map((lvl, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2 py-0.5 rounded-full border border-[#93B8FF]/40 inline-flex items-center"
                      >
                        {lvl}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Profile Links */}
            <div className="pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Verified Interview Expert</span>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="text-[#0755E8] font-bold hover:underline cursor-pointer"
              >
                View Full Profile &amp; Reviews
              </button>
            </div>
          </div>

          {/* Card 2: Interactive Booking Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Booking Summary
            </h3>

            {/* Session Format */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
                <Video className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Format</p>
                <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  1:1 Live Mock Interview
                </p>
              </div>
            </div>

            {/* Selected Date & Time Slot (Updates immediately with honest placeholders) */}
            <div className="p-3 bg-[#F0F5FF]/60 rounded-xl border border-[#DCE8FF] flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#0755E8] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] font-bold text-[#0755E8] uppercase tracking-wider">Scheduled Time</p>
                  {selectedSlot && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-colors ${
                      paymentStatus === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${paymentStatus === "paid" ? "bg-emerald-600 animate-pulse" : "bg-amber-500"}`} />
                      {paymentStatus === "paid" ? "Paid" : "Not Paid"}
                    </span>
                  )}
                </div>
                {selectedDateObj ? (
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {selectedDateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic mt-0.5">
                    Please select a date on the left
                  </p>
                )}
                {selectedSlot ? (
                  <p className="text-xs font-bold text-[#0755E8] mt-0.5 flex items-center gap-1.5">
                    <span>{selectedSlot.time}</span>
                    <span className="text-slate-400 font-normal">•</span>
                    <span>{sessionDuration} mins</span>
                  </p>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 mt-1">
                    Select a time slot
                  </span>
                )}
              </div>
            </div>

            {/* Payment Status Indicator (Dynamically displays Not Paid / Paid) */}
            {selectedSlot && (
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-top-1 ${
                paymentStatus === "paid"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-amber-50/70 border-amber-200/80 text-amber-900"
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    paymentStatus === "paid"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-200/80 text-amber-800"
                  }`}>
                    {paymentStatus === "paid" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Payment Status
                    </p>
                    <p className="text-xs font-bold truncate mt-0.5">
                      {paymentStatus === "paid" ? "Payment Completed" : "Payment Pending"}
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 transition-colors ${
                  paymentStatus === "paid"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-amber-200 text-amber-900 border border-amber-300/80"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${paymentStatus === "paid" ? "bg-white" : "bg-amber-600"}`} />
                  {paymentStatus === "paid" ? "Paid" : "Not Paid"}
                </span>
              </div>
            )}
          </div>

          {/* Card 3: Mockeefy Guarantee */}
          <div className="bg-gradient-to-br from-[#F0F5FF] via-white to-white rounded-2xl border border-blue-200/70 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0755E8]" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Mockeefy Guarantee
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1 text-slate-700">
              <div className="p-2.5 bg-white rounded-xl border border-blue-100 flex items-center gap-2 shadow-2xs">
                <Award className="w-4 h-4 text-[#0755E8] shrink-0" />
                <span className="text-[11px] font-bold leading-tight">100% Vetted Experts</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-blue-100 flex items-center gap-2 shadow-2xs">
                <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold leading-tight">Free Reschedule</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-blue-100 flex items-center gap-2 shadow-2xs">
                <Video className="w-4 h-4 text-[#0755E8] shrink-0" />
                <span className="text-[11px] font-bold leading-tight">HD Video Room</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-blue-100 flex items-center gap-2 shadow-2xs">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold leading-tight">256-Bit Encrypted</span>
              </div>
            </div>
          </div>

          {/* Card 4: Frequently Asked Questions & Support */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#0755E8]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Common Questions
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {BOOKING_FAQS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200/80 overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-3 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-2 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="p-3 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Support Link */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-[#0755E8]" />
                <span>Need support? <a href="mailto:support@mockeefy.com" className="text-[#0755E8] font-bold hover:underline">support@mockeefy.com</a></span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ======================================================== */}
    {/* EXPERT PROFILE & REVIEWS POPUP MODAL (WITH BLURRED BG)   */}
    {/* ======================================================== */}
    {isProfileModalOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-expert-name"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => setIsProfileModalOpen(false)}
      >
        {/* Modal Window Container */}
        <div
          className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 font-sans text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top-Right Dismiss Button */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(false)}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-600 hover:text-rose-800 border border-rose-200/80 hover:border-rose-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* 1. TOP HEADER SECTION (Matches Image 1) */}
          <div className="p-5 sm:p-6 bg-gradient-to-b from-[#f0f5ff]/70 via-white to-white border-b border-slate-100">
            <div className="flex items-start gap-4">
              {/* Rounded Avatar with Active Online Status Dot */}
              <div className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#0755E8] text-lg sm:text-xl shadow-2xs">
                {profile.avatar && !profile.avatar.includes("default-avatar") && !expertAvatarError ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    onError={() => setExpertAvatarError(true)}
                  />
                ) : (
                  expertInitials
                )}
                <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              {/* Expert Name, Role, Rating & Pricing */}
              <div className="min-w-0 flex-1 pr-7">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 id="modal-expert-name" className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                    {profile.name}
                  </h2>
                  <BadgeCheck className="w-4.5 h-4.5 text-white fill-[#0755E8] shrink-0" />
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  <span>{profile.role}</span>
                  {profile.company && (
                    <span className="text-slate-700 font-semibold"> at {profile.company}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-600 flex-wrap">
                  <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{profile.rating || "4.9"}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{profile.experience}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[#0755E8] font-bold tabular-nums">
                    ₹{sessionFee} ({sessionDuration}m)
                  </span>
                </div>
                {expertLevels.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1">
                      Click the level of expert you want:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {expertLevels.map((lvl) => {
                        const isSelected = selectedLevel === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setSelectedLevel(lvl)}
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#0755E8] text-white border-[#0755E8] shadow-xs"
                                : "text-[#0755E8] bg-[#EAF2FF] border-[#93B8FF]/40 hover:bg-blue-100"
                            }`}
                          >
                            {lvl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Sub-Bar: Verified Expert & Real-time Booking Status */}
            <div className="mt-3.5 pt-3 border-t border-slate-100/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Interview Expert</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Available for Bookings</span>
              </div>
            </div>
          </div>

          {/* 2. TABS BAR (Matches Image 2) */}
          <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 border-b border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`px-4 py-2 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
                activeTab === "about"
                  ? "text-[#0755E8] border-[#0755E8] bg-[#F0F5FF]/70 rounded-t-xl"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              About Interview Expert
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`px-4 py-2 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
                activeTab === "reviews"
                  ? "text-[#0755E8] border-[#0755E8] bg-[#F0F5FF]/70 rounded-t-xl"
                  : "text-slate-500 border-transparent hover:text-slate-800"
              }`}
            >
              Reviews &amp; Ratings ({reviews.length})
            </button>
          </div>

          {/* 3. MODAL SCROLLABLE CONTENT (Matches Image 2) */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 max-h-[48vh]">
            {activeTab === "about" ? (
              <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1.5 text-sm sm:text-base">
                    About {profile.name}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {(profile as any).bio || `${profile.name} is a verified ${profile.category} interview expert with ${profile.experience ? (profile.experience.toLowerCase().includes("fresher") ? "early-stage industry experience" : `${profile.experience} of industry experience`) : "industry experience"} specializing in mock interviews, career guidance, and practical technical preparation.`}
                  </p>
                </div>

                {profile.skills && profile.skills.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      CORE COMPETENCIES &amp; TECHNOLOGIES
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(profile.skills)).map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-200/60 transition-colors"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {expertLevels.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      MENTOR LEVEL &amp; EXPERTISE TIER
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {expertLevels.map((lvl, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-[#EAF2FF] border border-[#93B8FF]/40 rounded-xl text-xs font-bold text-[#0755E8] inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Award className="w-3.5 h-3.5 text-[#0755E8]" />
                          {lvl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-700 block mb-0.5">Session Format</span>
                    <span className="text-slate-500">1:1 Live Video Mock Interview with Real-Time Feedback</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-700 block mb-0.5">Deliverables</span>
                    <span className="text-slate-500">Structured Scorecard &amp; Verified Completion Certificate</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {reviewsLoading ? (
                  <div className="py-8 text-center text-xs text-slate-500">Loading verified reviews...</div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{r.name}</span>
                            <span className="text-[11px] text-slate-400">• {r.role}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{r.rating}.0</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 italic">"{r.comment}"</p>
                        <p className="text-[10px] text-slate-400 pt-1">{r.date}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-bold text-slate-800">No reviews yet</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Be the first candidate to book a session and leave a review for {profile.name}!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. MODAL ACTION FOOTER */}
          <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 hover:text-rose-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => {
                setIsProfileModalOpen(false);
                const slots = document.getElementById("time-slots-section");
                if (slots) slots.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
            >
              <span>Select Time Slot &amp; Book</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
