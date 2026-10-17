import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from '../lib/axios';
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Star, Clock, Calendar, CheckCircle, Shield, Video,
  ChevronLeft, ChevronRight, ChevronDown, ThumbsUp, MessageCircle, Briefcase,
  Share2, Check, ArrowRight, ArrowLeft, Timer, BadgeCheck, Code2, Compass, FileText,
  MessageSquare, AlertCircle, Info, Sparkles, UserCheck, CheckCircle2
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
  mapExpertToProfile,
  Profile,
  getKolkataToday,
  getKolkataTimeParts,
  getKolkataDateString,
  getInitialKolkataMonth
} from "../lib/bookSessionUtils";

/**
 * Skeleton Loader matching Mockeefy clean design
 */
const BookSessionSkeleton = () => (
  <div className="w-full space-y-6 animate-pulse font-sans text-left">
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
      // Strip query parameter from address bar
      window.history.replaceState({}, document.title, window.location.pathname);
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

  // Selected session goal
  const [selectedGoal, setSelectedGoal] = useState<string>("technical");
  const [userDiscussionNotes, setUserDiscussionNotes] = useState<string>("");

  // Promo code & pricing states
  const [discountCode, setDiscountCode] = useState("");
  const [appliedFreePromo, setAppliedFreePromo] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [expertAvatarError, setExpertAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "reviews">("about");

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

  // Fetch expert profile
  const { data: profile, isLoading: isQueryLoading, error: queryError } = useQuery<Profile | null>({
    queryKey: ["expertProfile", expertId],
    queryFn: async () => {
      if (!expertId) return null;
      const response = await axios.get(`/api/expert/public/profile/${expertId}`);
      if (response.data?.success && response.data?.profile) {
        return mapExpertToProfile(response.data.profile);
      }
      throw new Error("Expert profile not found");
    },
    initialData: existingProfile || undefined,
    enabled: !!expertId,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: "always",
  });

  const loading = isQueryLoading && !profile;

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

  // Expert Level & calculated pricing
  const expertLevel = profile?.level || existingProfile?.level || "Senior";
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

  const basePrice = useMemo(() => {
    if (overridePrice) return Number(overridePrice) || 0;
    if (profile?.price) {
      const parsed = parseInt(String(profile.price).replace(/[^\d]/g, ""), 10);
      return Number.isFinite(parsed) ? parsed : 499;
    }
    return 499;
  }, [profile?.price, overridePrice]);

  useEffect(() => {
    const fetchPrice = async () => {
      if (!profile?.id || ![30, 60].includes(sessionDuration)) {
        setCalculatedPrice(basePrice);
        return;
      }
      try {
        const res = await axios.get("/api/pricing/calculate-price", {
          params: { expertId: profile.id, duration: sessionDuration, level: expertLevel }
        });
        if (res.data?.finalPrice != null) {
          setCalculatedPrice(res.data.finalPrice);
        } else {
          setCalculatedPrice(basePrice);
        }
      } catch (err) {
        setCalculatedPrice(basePrice);
      }
    };
    fetchPrice();
  }, [profile?.id, sessionDuration, expertLevel, basePrice]);

  // Actual session fee for the chosen duration & level
  const sessionFee = calculatedPrice > 0 ? calculatedPrice : basePrice;
  const promoDiscount = appliedFreePromo ? sessionFee : 0;
  const finalPayable = Math.max(0, sessionFee - promoDiscount);
  const displayPrice = finalPayable;

  // Calendar dates in Asia/Kolkata timezone
  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialKolkataMonth);
  const [selectedDate, setSelectedDate] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; available: boolean } | null>(null);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);

  // Fetch booked sessions & reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!expertId) return;

    const fetchSessions = async () => {
      try {
        const res = await axios.get(`/api/sessions/expert/${expertId}`);
        if (Array.isArray(res.data)) {
          setBookedSessions(res.data);
        }
      } catch (err) {
        console.error("Failed to load booked sessions", err);
      }
    };
    fetchSessions();

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

  // Compute valid dates for currentMonth
  const dates = useMemo(() => {
    const parts = getKolkataTimeParts(currentMonth);
    const year = parts.year;
    const month = parts.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allDates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

    const today = getKolkataToday();
    const weekly = profile?.availability?.weekly || {};
    const breakDates = profile?.availability?.breakDates || [];

    const activeDays = Object.keys(weekly).filter(day => {
      const slots = weekly[day];
      return Array.isArray(slots) && slots.length > 0;
    }).map(d => d.toLowerCase());

    return allDates.filter(date => {
      const kolkataDateStr = getKolkataDateString(date);
      const isBreakDate = breakDates.some((b: any) => getKolkataDateString(b.start) === kolkataDateStr);
      if (isBreakDate) return false;

      // In current month, cannot pick past days
      if (date < today) return false;

      // If activeDays configured, check weekday
      if (activeDays.length > 0) {
        const dayShort = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).toLowerCase();
        const dayLong = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).toLowerCase();
        if (!activeDays.includes(dayShort) && !activeDays.includes(dayLong)) {
          return false;
        }
      }
      return true;
    });
  }, [currentMonth, profile?.availability?.weekly, profile?.availability?.breakDates]);

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDate(0);
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
    setSelectedDate(0);
    setSelectedSlot(null);
  };

  // Generate slots for selected date
  const currentSlots = useMemo(() => {
    if (!profile?.availability || !dates[selectedDate]) return [];

    const date = dates[selectedDate];
    const kolkataDateStr = getKolkataDateString(date);

    const weekly = profile.availability.weekly || {};
    const dayShort = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).toLowerCase();
    const dayLong = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).toLowerCase();

    const activeKey = Object.keys(weekly).find(k => {
      const lower = k.toLowerCase();
      return lower === dayShort || lower === dayLong;
    });

    const weeklyRanges = activeKey ? weekly[activeKey] : [];
    if (!weeklyRanges || weeklyRanges.length === 0) return [];

    const parseTimeToMinutes = (t: string) => {
      const parts = t.split(":");
      return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
    };

    const formatMinutesToTime = (min: number) => {
      const adjusted = min % (24 * 60);
      const h = Math.floor(adjusted / 60);
      const m = adjusted % 60;
      const period = h >= 12 ? "PM" : "AM";
      const displayHours = h % 12 || 12;
      return `${displayHours.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
    };

    const formatMinutesToHHMM = (min: number) => {
      const adjusted = min % (24 * 60);
      return `${Math.floor(adjusted / 60).toString().padStart(2, "0")}:${(adjusted % 60).toString().padStart(2, "0")}`;
    };

    const generatedSlots: { time: string; available: boolean }[] = [];
    const duration = sessionDuration;

    weeklyRanges.forEach((range: { from: string; to: string }) => {
      if (!range.from || !range.to) return;
      let currentMin = parseTimeToMinutes(range.from);
      let endMin = parseTimeToMinutes(range.to);
      if (endMin < currentMin) endMin += 24 * 60;

      while (currentMin + duration <= endMin) {
        const nowKolkata = getKolkataTimeParts();
        const isToday = kolkataDateStr === getKolkataDateString(new Date());
        const nowMinutes = nowKolkata.hours * 60 + nowKolkata.minutes;

        // Do not display past times today
        if (isToday && currentMin < nowMinutes) {
          currentMin += duration;
          continue;
        }

        const slotStartStr = formatMinutesToHHMM(currentMin);
        const slotEndStr = formatMinutesToHHMM(currentMin + duration);
        const slotDate = new Date(`${kolkataDateStr}T${slotStartStr}:00+05:30`);
        const slotEndDate = new Date(`${kolkataDateStr}T${slotEndStr}:00+05:30`);

        const isBooked = bookedSessions.some(session => {
          if (session.status === 'cancelled') return false;
          const sStart = new Date(session.startTime);
          const sEnd = new Date(session.endTime);
          if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) return false;
          if (getKolkataDateString(sStart) !== kolkataDateStr) return false;
          return slotDate < sEnd && slotEndDate > sStart;
        });

        const timeStr = `${formatMinutesToTime(currentMin)} - ${formatMinutesToTime(currentMin + duration)}`;
        const available = !isBooked;

        const existing = generatedSlots.find(s => s.time === timeStr);
        if (existing) {
          existing.available = existing.available || available;
        } else {
          generatedSlots.push({ time: timeStr, available });
        }
        currentMin += duration;
      }
    });

    return generatedSlots.sort((a, b) => a.time.localeCompare(b.time));
  }, [dates, selectedDate, profile?.availability, sessionDuration, bookedSessions]);

  const handleApplyPromo = () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a discount code.");
      return;
    }
    if (code === "FREEMU001") {
      setAppliedFreePromo(true);
      toast.success("Promo code applied! 100% Free Mentorship Session unlocked.");
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
    const shareText = `Book a 1:1 mentorship session with ${profile?.name || "Mentor"} on Mockeefy!`;
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
        text: "Please sign in to confirm your mentorship booking.",
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

    const date = dates[selectedDate];
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
    const currentGoalObj = SESSION_GOALS.find(g => g.id === selectedGoal);

    const payload = {
      expertId: profile.id || expertId,
      expertName: profile.name,
      expertEmail: (profile as any).email || "",
      expertPhone: (profile as any).phone || "",
      expertCategory: profile.category || "IT",
      userCategory: profile.category || "IT",
      sessionCategory: profile.category || "IT",
      sessionType: currentGoalObj?.title || "1:1 Mock Interview",
      sessionDuration: Number(sessionDuration),
      startTime,
      endTime,
      price: appliedFreePromo ? 0 : sessionFee,
      originalPrice: sessionFee,
      discount: appliedFreePromo ? sessionFee : 0,
      status: "scheduled",
      isPremiumSession: !!(user?.isPremium),
      notes: userDiscussionNotes.trim() ? `${userDiscussionNotes.trim()} [Goal: ${currentGoalObj?.title}]` : `[Goal: ${currentGoalObj?.title}]`,
    };

    try {
      setIsProcessing(true);

      // 1. Free promo booking
      if (appliedFreePromo) {
        const res = await axios.post("/api/sessions/book-free", payload);
        if (res.data?.success) {
          Swal.fire({
            title: "Booking Confirmed! 🎉",
            text: `Your free session with ${profile.name} has been scheduled for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${selectedSlot.time}.`,
            icon: "success",
            confirmButtonColor: "#0755E8",
          }).then(() => navigate("/my-sessions"));
        }
        return;
      }

      // 2. Premium user credit booking
      if (user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)) {
        const res = await axios.post("/api/payment/use-premium-credit", { bookingDetails: payload });
        if (res.data?.success) {
          Swal.fire({
            title: "Booked with Credit! 🎯",
            text: `Session confirmed. You have ${res.data.remainingCredits ?? 0} free credits remaining.`,
            icon: "success",
            confirmButtonColor: "#0755E8",
          }).then(() => navigate("/my-sessions"));
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

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "Mockeefy",
        description: `${sessionDuration} Min Mock Interview with ${profile.name}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            setIsProcessing(true);
            const verifyRes = await axios.post("/api/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentType: "booking",
              bookingDetails: {
                expertId: profile.id || expertId,
                candidateId: user?.id || user?.userId || (user as any)?._id,
                startTime,
                endTime,
                price: sessionFee,
                topics: [currentGoalObj?.title || "1:1 Mentorship"],
                duration: Number(sessionDuration),
                notes: userDiscussionNotes.trim() ? `${userDiscussionNotes.trim()} [Goal: ${currentGoalObj?.title}]` : `[Goal: ${currentGoalObj?.title}]`
              }
            });

            if (verifyRes.data?.success) {
              Swal.fire({
                title: "Booking Confirmed! 🎉",
                text: `Your mock interview with ${profile.name} is scheduled for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${selectedSlot.time}.`,
                icon: "success",
                confirmButtonColor: "#0755E8",
                confirmButtonText: "View My Bookings"
              }).then(() => {
                navigate("/my-sessions");
              });
            } else {
              throw new Error(verifyRes.data?.message || "Payment verification failed.");
            }
          } catch (verifyErr: any) {
            console.error("Payment Verification Error:", verifyErr);
            Swal.fire({
              title: "Payment Verification Failed",
              text: verifyErr?.response?.data?.message || verifyErr.message || "Could not verify payment.",
              icon: "error"
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
            toast.info("Payment was cancelled. Your slot is still selected.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err?.response?.data?.message || err.message || "Failed to initiate payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Fallback for missing/invalid expertId
  if (!expertId || (!loading && !profile)) {
    return (
      <div className="w-full font-sans text-left py-12">
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200/80 p-8 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Mentor Not Found</h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
            We couldn't locate the requested mentor profile. Browse our verified mentor directory to choose an expert for your session.
          </p>
          <Link
            to="/find-mentor"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>Browse All Mentors</span>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <BookSessionSkeleton />;
  }

  const expertInitials = (profile.name || "EX").trim().substring(0, 2).toUpperCase();
  const selectedGoalObj = SESSION_GOALS.find(g => g.id === selectedGoal) || SESSION_GOALS[0];
  const selectedDateObj = dates[selectedDate];

  return (
    <div className="w-full space-y-6 font-sans text-left pb-16 animate-in fade-in duration-200">
      
      {/* 1. Page Header with Clean Breadcrumbs & Back Button */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-5 sm:px-6 py-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-2">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/mentors");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-[#EAF2FF] text-slate-700 hover:text-[#0755E8] border border-slate-200 hover:border-[#93B8FF] text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
            title="Back to Mentors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Mentors</span>
          </button>

          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
            <Link to="/mentors" className="text-slate-600 hover:text-[#0755E8] transition-colors">
              Find Mentors
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
              Book Your Mentorship Session
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
              title="Share mentor profile"
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
        {/* LEFT / MAIN COLUMN (lg:col-span-8): Booking Form Sections */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 space-y-6">

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
                About Mentor
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
                      {(profile as any).bio || `${profile.name} is a verified ${profile.category} mentor with ${profile.experience ? (profile.experience.toLowerCase().includes("fresher") ? "early-stage industry experience" : `${profile.experience} of industry experience`) : "industry experience"} specializing in mock interviews, career guidance, and practical technical preparation.`}
                    </p>
                  </div>

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

          {/* Section A: Session Goal Selection */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2FF] border border-[#93B8FF] text-[11px] font-bold text-[#0755E8] uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3 h-3 text-[#0755E8]" />
                <span>Step 1</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                What would you like help with?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the primary focus area so {profile.name.split(" ")[0]} can tailor questions and advice to your needs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SESSION_GOALS.map((goal) => {
                const isSelected = selectedGoal === goal.id;
                const IconComponent = goal.icon;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#F0F5FF] border-[#0755E8] shadow-xs ring-2 ring-[#0755E8]/15"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected ? "bg-[#0755E8] text-white" : "bg-[#EAF2FF] text-[#0755E8]"
                        }`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-[#0755E8] bg-[#0755E8] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <h3 className={`text-sm font-bold leading-snug ${
                        isSelected ? "text-[#0755E8]" : "text-slate-900"
                      }`}>
                        {goal.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-normal mt-1 leading-relaxed">
                        {goal.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section B: Scheduling (Date & Time) */}
          <div id="time-slots-section" className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs scroll-mt-20">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2FF] border border-[#93B8FF] text-[11px] font-bold text-[#0755E8] uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 text-[#0755E8]" />
                <span>Step 2</span>
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

            {/* Month Header & Picker Controls */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Date
              </span>
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

            {/* Date Carousel */}
            <div
              ref={carouselRef}
              className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none"
            >
              {dates.length > 0 ? (
                dates.map((date, index) => {
                  const isToday = new Date().toDateString() === date.toDateString();
                  const isSelected = selectedDate === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedDate(index);
                        setSelectedSlot(null);
                      }}
                      className={`min-w-[66px] text-center px-2 py-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-[#0755E8] border-[#0755E8] text-white shadow-xs ring-2 ring-[#0755E8]/20"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                        {isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" })}
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
                <div className="w-full py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No availability dates configured for this month.
                </div>
              )}
            </div>

            {/* Available Time Slots Header */}
            <div className="flex items-center justify-between mb-2.5 pt-1 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Available Slots for {selectedDateObj ? selectedDateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""}
              </span>
              <span className="text-[11px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full border border-[#93B8FF]/40">
                {currentSlots.filter(s => s.available).length} slots available
              </span>
            </div>

            {/* Time Slot Grid (Natural flow, non-truncated time ranges) */}
            {currentSlots.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {currentSlots.map((slot, index) => {
                  const isSelected = selectedSlot?.time === slot.time;
                  const isUnavailable = !slot.available;

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`relative flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all border outline-none focus-visible:ring-2 focus-visible:ring-[#0755E8] ${
                        isUnavailable
                          ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                          : isSelected
                          ? "bg-[#0755E8] border-[#0755E8] text-white shadow-sm ring-2 ring-[#0755E8]/25 cursor-pointer"
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
                        <Check className="w-4 h-4 text-white stroke-[3] shrink-0" />
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
          </div>

          {/* Section C: Session Preferences & Discussion Details */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF2FF] border border-[#93B8FF] text-[11px] font-bold text-[#0755E8] uppercase tracking-wider mb-1.5">
                <Video className="w-3 h-3 text-[#0755E8]" />
                <span>Step 3</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Session Preferences &amp; Discussion Notes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide optional context so your mentor can prepare specific interview questions or feedback.
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

          {/* Section D: What You'll Get & Before Your Session */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 leading-tight">
              What to Expect &amp; How to Prepare
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* What You'll Get */}
              <div className="p-4 bg-[#F0F5FF]/70 border border-[#DCE8FF] rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0755E8] uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-[#0755E8]" />
                  <span>What You'll Get</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0755E8] shrink-0 mt-0.5" />
                    <span>Focused one-on-one video coaching tailored to your target company.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0755E8] shrink-0 mt-0.5" />
                    <span>Real-time technical or behavioral interview simulation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0755E8] shrink-0 mt-0.5" />
                    <span>Actionable scorecard identifying your strengths and core blindspots.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#0755E8] shrink-0 mt-0.5" />
                    <span>Targeted next steps and suggested preparation materials.</span>
                  </li>
                </ul>
              </div>

              {/* Before Your Session */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Info className="w-4 h-4 text-slate-600" />
                  <span>Before Your Session</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8] shrink-0 mt-1.5" />
                    <span>Have your resume or portfolio links accessible for reference.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8] shrink-0 mt-1.5" />
                    <span>List 2-3 specific topics or algorithmic patterns you want to drill.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8] shrink-0 mt-1.5" />
                    <span>Join from a quiet environment with a working microphone and camera.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8] shrink-0 mt-1.5" />
                    <span>Log in 3-5 minutes early to test your connection.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT / SECONDARY COLUMN (lg:col-span-4): Sticky Summary */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 lg:self-start">
          
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
                  {profile.isVerified && (
                    <BadgeCheck className="w-4 h-4 text-white fill-[#0755E8] shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {profile.role}
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
              </div>
            </div>

            {/* Quick Profile Links */}
            <div className="pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Verified Mentor</span>
              <button
                type="button"
                onClick={() => {
                  const tabs = document.getElementById("mentor-reviews-tabs");
                  if (tabs) tabs.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
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

            {/* Selected Goal Item */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0">
                <selectedGoalObj.icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Goal</p>
                <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {selectedGoalObj.title}
                </p>
              </div>
            </div>

            {/* Selected Date & Time Slot (Updates immediately with honest placeholders) */}
            <div className="p-3 bg-[#F0F5FF]/60 rounded-xl border border-[#DCE8FF] flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#0755E8] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-[#0755E8] uppercase tracking-wider">Scheduled Time</p>
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

            {/* Promo Code Input */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Enter code (e.g. FREEMU001)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0755E8]"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-3.5 py-2 bg-[#EAF2FF] hover:bg-[#dbe7fd] text-[#0755E8] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {appliedFreePromo && (
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 mt-1">
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

            {/* Price Breakdown (Fully synchronized) */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
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
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-100 items-baseline">
                <div>
                  <span>Total Payable</span>
                  <span className="block text-[10px] font-normal text-slate-400">All fees &amp; taxes included</span>
                </div>
                <span className={`text-base font-extrabold tabular-nums ${appliedFreePromo ? "text-emerald-600" : "text-[#0755E8]"}`}>
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
                selectedSlot
                  ? appliedFreePromo
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    : "bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white shadow-[#0755E8]/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : selectedSlot ? (
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
              ) : (
                <>
                  <span>Select an Available Slot</span>
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
        </div>
      </div>
    </div>
  );
}
