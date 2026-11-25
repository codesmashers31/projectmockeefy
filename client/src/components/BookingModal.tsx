import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import {
  X, Calendar, Clock, Shield, Check, ArrowRight,
  ChevronLeft, ChevronRight, BadgeCheck, CheckSquare, Square,
  Award, Sparkles, Wallet, CreditCard
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
  getKolkataToday,
  getKolkataTimeParts,
  getKolkataDateString,
  getInitialKolkataMonth,
  generateAvailableSlotsForDate,
  getFirstAvailableMonth,
  mapExpertToProfile,
  Profile
} from "../lib/bookSessionUtils";
import { useDataSync } from "../context/SocketContext";
import { MentorProfile } from "./MentorJobCard";
import { getProfileImageUrl } from "../lib/imageUtils";
import { ConfirmationLoadingModal, BookingFlowState } from "./ConfirmationLoadingModal";
import { showBookingSuccessAlert } from "../lib/bookingSuccessAlert";
import { showBookingAuthAlert } from "../lib/bookingAuthAlert";
import { PendingBookingIntent, savePendingBooking, clearPendingBooking } from "../lib/pendingBooking";

export const AVAILABLE_LEVELS = [
  "Rising Mentor",
  "Professional Mentor",
  "Senior Mentor",
  "Elite Mentor",
  "FAANG Mentor",
];

export const LEVEL_DESCRIPTIONS: Record<string, string> = {
  "Rising Mentor": "Foundational practice & core interview concepts",
  "Professional Mentor": "Real-world technical problem solving & live coding",
  "Senior Mentor": "System design, deep architectural rigor & leadership",
  "Elite Mentor": "Specialized high-impact domains & executive interview prep",
  "FAANG Mentor": "FAANG & top tech bar-raiser mock interview standard"
};

const DEFAULT_CATEGORY_MATRIX: Record<string, Record<string, number>> = {
  "IT": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3999 },
  "HR": { "Rising Mentor": 399, "Professional Mentor": 799, "Senior Mentor": 1299, "Elite Mentor": 1999, "FAANG Mentor": 2999 },
  "Business": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3499 },
  "Design": { "Rising Mentor": 499, "Professional Mentor": 899, "Senior Mentor": 1399, "Elite Mentor": 2299, "FAANG Mentor": 3299 },
  "AI": { "Rising Mentor": 999, "Professional Mentor": 1499, "Senior Mentor": 2499, "Elite Mentor": 3499, "FAANG Mentor": 4999 },
  "Software Development": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3999 },
  "Web Development": { "Rising Mentor": 499, "Professional Mentor": 899, "Senior Mentor": 1399, "Elite Mentor": 2299, "FAANG Mentor": 3499 },
  "Mobile Development": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3999 },
  "DevOps & Cloud": { "Rising Mentor": 599, "Professional Mentor": 1099, "Senior Mentor": 1699, "Elite Mentor": 2699, "FAANG Mentor": 4299 },
  "Data Science & ML": { "Rising Mentor": 699, "Professional Mentor": 1199, "Senior Mentor": 1799, "Elite Mentor": 2899, "FAANG Mentor": 4499 },
  "Cybersecurity": { "Rising Mentor": 599, "Professional Mentor": 1099, "Senior Mentor": 1699, "Elite Mentor": 2699, "FAANG Mentor": 4299 },
  "Database": { "Rising Mentor": 499, "Professional Mentor": 899, "Senior Mentor": 1399, "Elite Mentor": 2299, "FAANG Mentor": 3499 },
  "QA & Testing": { "Rising Mentor": 399, "Professional Mentor": 799, "Senior Mentor": 1299, "Elite Mentor": 1999, "FAANG Mentor": 2999 },
  "Agile & Project Management": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3499 },
  "System Design": { "Rising Mentor": 799, "Professional Mentor": 1299, "Senior Mentor": 1999, "Elite Mentor": 2999, "FAANG Mentor": 4999 },
  "Full Stack Development (MERN)": { "Rising Mentor": 499, "Professional Mentor": 999, "Senior Mentor": 1499, "Elite Mentor": 2499, "FAANG Mentor": 3999 }
};

export const BookingModalSkeleton: React.FC<{
  onClose?: () => void;
  initialProfile?: MentorProfile | Profile | null;
}> = ({ onClose }) => {
  return (
    <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-left my-auto font-sans animate-in zoom-in-95 duration-150">
      {/* Header Skeleton */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F0F5FF]/90 via-[#F8FAFF] to-white border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-slate-200/80 border border-slate-200 shrink-0 animate-pulse" />

          <div className="min-w-0 space-y-1.5">
            <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
            <div className="h-3.5 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="flex items-center gap-1.5 pt-1">
              <div className="h-6 w-24 bg-[#EBF3FF] border border-[#BFD7FE] rounded-full animate-pulse" />
              <div className="h-6 w-28 bg-[#EBF3FF]/60 border border-[#BFD7FE]/50 rounded-full animate-pulse hidden sm:inline-block" />
              <div className="h-6 w-24 bg-[#EBF3FF]/40 border border-[#BFD7FE]/40 rounded-full animate-pulse hidden sm:inline-block" />
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 hover:text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5"
            aria-label="Close booking modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Body Skeleton */}
      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-4.5 space-y-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {/* Title & Duration row */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Select Date &amp; Available Time Slot
            </h2>
            <p className="text-xs text-slate-500">
              All session times are displayed in your local India Standard Time (IST / GMT+5:30).
            </p>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 gap-1 animate-pulse">
            <div className="w-14 h-6 bg-white rounded-lg shadow-xs" />
            <div className="w-14 h-6 bg-transparent rounded-lg" />
          </div>
        </div>

        {/* Select date header row */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            SELECT DATE
          </span>
          <div className="h-6 w-32 bg-slate-100 rounded-lg animate-pulse" />
        </div>

        {/* Date cards */}
        <div className="flex gap-2.5 overflow-hidden pb-1 mb-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="min-w-[68px] h-[74px] rounded-2xl bg-slate-100/80 border border-slate-200/70 flex flex-col items-center justify-center gap-1.5 p-2 shrink-0 animate-pulse"
            >
              <div className="h-2.5 w-10 bg-slate-200/80 rounded" />
              <div className="h-5 w-7 bg-slate-200/80 rounded" />
              <div className="h-2 w-8 bg-slate-200/80 rounded" />
            </div>
          ))}
        </div>

        {/* Available slots header */}
        <div className="flex items-center justify-between mb-2 pt-2 border-t border-slate-100">
          <div className="h-4 w-44 bg-slate-200/80 rounded animate-pulse" />
          <div className="h-5 w-24 bg-[#EAF2FF] border border-[#93B8FF]/40 rounded-full animate-pulse" />
        </div>

        {/* Slots grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 p-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[56px] sm:h-[60px] rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center px-4 gap-2.5 animate-pulse"
            >
              <div className="w-4 h-4 rounded-full bg-slate-200/80 shrink-0" />
              <div className="h-4 w-32 bg-slate-200/70 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="p-4 sm:px-6 sm:py-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-[#EAF0F8] hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#E2E8F0] text-slate-400 cursor-not-allowed shadow-none select-none"
        >
          <span>Select an Available Slot</span>
          <ArrowRight className="w-4 h-4 opacity-50" />
        </button>
      </div>
    </div>
  );
};

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  expertId: string;
  initialProfile?: MentorProfile | Profile | null;
  initialPendingBooking?: PendingBookingIntent | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  expertId,
  initialProfile,
  initialPendingBooking,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(() => {
    if (initialProfile) {
      if ((initialProfile as any).rawExpert) {
        return mapExpertToProfile((initialProfile as any).rawExpert);
      }
      if ("availability" in initialProfile && (initialProfile as any).availability) {
        return {
          id: (initialProfile as any).expertID || (initialProfile as any).id || (initialProfile as any)._id,
          name: (initialProfile as any).name || "Expert",
          role: (initialProfile as any).role || "Interview Expert",
          industry: (initialProfile as any).industry || (initialProfile as any).category || "IT",
          category: (initialProfile as any).category || "IT",
          avatar: (initialProfile as any).avatar || "",
          location: (initialProfile as any).location || "Remote",
          experience: (initialProfile as any).experience || "5+ yrs",
          skills: (initialProfile as any).skills || [],
          languages: (initialProfile as any).languages || ["English"],
          mode: (initialProfile as any).mode || "Online",
          rating: (initialProfile as any).rating || 4.9,
          reviews: (initialProfile as any).reviews || 10,
          price: (initialProfile as any).price || "799",
          responseTime: (initialProfile as any).responseTime || "Fast response",
          successRate: (initialProfile as any).successRate || 95,
          isVerified: (initialProfile as any).isVerified ?? true,
          company: (initialProfile as any).company,
          level: (initialProfile as any).level || "Rising Mentor",
          levels: (initialProfile as any).levels || [(initialProfile as any).level || "Rising Mentor"],
          availability: (initialProfile as any).availability
        } as Profile;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialProfile) {
      if ((initialProfile as any).rawExpert?.availability || (initialProfile as any).availability) {
        return false;
      }
    }
    return true;
  });
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState<boolean>(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (initialPendingBooking?.selectedDateStr) {
      const d = new Date(initialPendingBooking.selectedDateStr);
      if (!isNaN(d.getTime())) {
        return new Date(d.getFullYear(), d.getMonth(), 1);
      }
    }
    return getInitialKolkataMonth();
  });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    initialPendingBooking?.selectedDateStr || ""
  );
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; available: boolean } | null>(
    initialPendingBooking?.selectedSlot || null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingFlowState, setBookingFlowState] = useState<BookingFlowState>("selecting");
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const formatPrice = (val: number) => {
    const rounded = Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  // Authoritative candidate wallet balance retrieval
  const fetchCandidateWallet = useCallback(() => {
    if (user) {
      axios.get("/api/wallet/balance")
        .then((res) => {
          const bal = res.data?.availableBalance ?? res.data?.data?.availableBalance ?? res.data?.balance ?? res.data?.data?.balance ?? 0;
          setWalletBalance(Number(bal) || 0);
        })
        .catch(() => setWalletBalance(0));
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchCandidateWallet();
    }
  }, [isOpen, user, fetchCandidateWallet]);

  // Real-time synchronization for wallet updates (deposits, refunds, credits)
  useDataSync(["WALLET_UPDATED", "RECONNECTED"], (payload) => {
    if (payload?.data && typeof payload.data.availableBalance === "number") {
      setWalletBalance(payload.data.availableBalance);
    } else {
      fetchCandidateWallet();
    }
  });

  const [currentTick, setCurrentTick] = useState<number>(() => Date.now());

  // Periodically update current tick to ensure real-time slot tracking (e.g. at 1:30 PM a 1:30 PM slot auto-hides)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTick(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset booking flow state to selecting whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setBookingFlowState("selecting");
      if (!initialPendingBooking?.selectedLevel) {
        setSelectedLevel("");
      }
    }
  }, [isOpen, initialPendingBooking]);

  // Mentor Tier Level Selection (starts as "" so selecting field shows "Select one option")
  const [selectedLevel, setSelectedLevel] = useState<string>(
    initialPendingBooking?.selectedLevel || ""
  );
  const modalDialogRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const [levelPrices, setLevelPrices] = useState<Record<string, number>>(() => {
    const prof = initialProfile as any;
    const rawExpert = prof?.rawExpert;
    const minVal = prof?.minPrice ?? rawExpert?.minPrice ?? prof?.price ?? rawExpert?.price;
    const parsed = typeof minVal === "number" ? minVal : parseInt(String(minVal || "").replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      const primary = prof?.level || (Array.isArray(prof?.levels) ? prof.levels[0] : "Rising Mentor");
      return {
        [primary]: parsed,
        [`${primary}_30`]: parsed,
        [`${primary}_60`]: Math.round(parsed * 1.8),
      };
    }
    return {};
  });
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);

  // Duration & Pricing (default 30m / 60m matching UI image)
  const [sessionDuration, setSessionDuration] = useState<number>(() => {
    if (initialPendingBooking?.selectedDuration) {
      return initialPendingBooking.selectedDuration;
    }
    const rawDur =
      (initialProfile as any)?.sessionDuration ||
      (initialProfile as any)?.rawExpert?.sessionDuration ||
      (initialProfile as any)?.rawExpert?.availability?.sessionDuration ||
      (initialProfile as any)?.availability?.sessionDuration;
    return rawDur === 60 ? 60 : 30;
  });
  const [discountCode, setDiscountCode] = useState<string>("");
  const [appliedFreePromo, setAppliedFreePromo] = useState<boolean>(false);
  const [appliedPromoPercent, setAppliedPromoPercent] = useState<number>(0);

  const carouselRef = useRef<HTMLDivElement>(null);
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

  // Drag-to-flick mouse handlers (1:1 smooth tracking without accidental click)
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

  // Resolve target expert ID from all possible props and mappings
  const targetExpertId = useMemo(() => {
    return (
      expertId ||
      profile?.id ||
      (profile as any)?._id ||
      (initialProfile as any)?.id ||
      (initialProfile as any)?._id ||
      (initialProfile as any)?.expertID ||
      (initialProfile as any)?.rawExpert?._id ||
      (initialProfile as any)?.rawExpert?.userId
    );
  }, [expertId, profile?.id, (profile as any)?._id, initialProfile]);

  const fetchReqIdRef = useRef(0);

  const fetchSessions = useCallback(async () => {
    if (!targetExpertId) return;
    setIsSessionsLoading(true);
    setSessionsError(null);
    const reqId = fetchReqIdRef.current;
    try {
      const candidateUserId = user?.id || user?._id || (user as any)?.userId;
      const [expertRes, candidateRes] = await Promise.allSettled([
        axios.get(`/api/sessions/expert/${targetExpertId}`),
        candidateUserId
          ? axios.get(`/api/sessions/candidate/${candidateUserId}`)
          : Promise.resolve({ data: [] }),
      ]);

      if (reqId !== fetchReqIdRef.current) return;

      const expertFailed = expertRes.status === "rejected" || !Array.isArray((expertRes as any).value?.data);
      const candidateFailed = candidateUserId && (candidateRes.status === "rejected" || !Array.isArray((candidateRes as any).value?.data));

      if (expertFailed || candidateFailed) {
        console.error("Availability data source failed in BookingModal:", { expertRes, candidateRes });
        setSessionsError("Unable to load interview slot availability. Please retry.");
        return;
      }

      const allBooked: any[] = [];
      if (expertRes.status === "fulfilled" && Array.isArray(expertRes.value.data)) {
        allBooked.push(...expertRes.value.data);
      }
      if (candidateRes.status === "fulfilled" && Array.isArray(candidateRes.value.data)) {
        allBooked.push(...candidateRes.value.data);
      }

      setSessionsError(null);
      setBookedSessions(allBooked);
    } catch (err) {
      if (reqId === fetchReqIdRef.current) {
        console.error("Failed to load booked sessions", err);
        setSessionsError("Failed to load availability data. Please retry.");
      }
    } finally {
      if (reqId === fetchReqIdRef.current) {
        setIsSessionsLoading(false);
      }
    }
  }, [targetExpertId, user?.id, user?._id, (user as any)?.userId]);

  const fetchExpert = useCallback(async (showLoadingSpinner = true) => {
    if (!targetExpertId) return;
    const reqId = fetchReqIdRef.current;
    try {
      if (showLoadingSpinner && !(initialProfile as any)?.rawExpert) {
        setLoading(true);
      }
      let expertData = null;
      try {
        const res = await axios.get(`/api/expert/public/profile/${targetExpertId}`);
        if (res.data?.success && res.data?.profile) {
          expertData = res.data.profile;
        }
      } catch {
        // Fallback to verified list if public profile not found
      }

      if (reqId !== fetchReqIdRef.current) return;

      if (!expertData) {
        const res = await axios.get(`/api/expert/verified`);
        const experts = res.data?.data || res.data || [];
        expertData = experts.find(
          (e: any) =>
            (e._id || e.userId || e.id || e.expertID)?.toString() === targetExpertId.toString()
        );
      }

      if (reqId !== fetchReqIdRef.current) return;

      if (expertData) {
        const mapped = mapExpertToProfile(expertData);
        setProfile(mapped);
        if (mapped.sessionDuration) {
          setSessionDuration(mapped.sessionDuration === 60 ? 60 : 30);
        }
      }
    } catch (err) {
      if (reqId === fetchReqIdRef.current) {
        console.error("Failed to load expert for booking", err);
      }
    } finally {
      if (showLoadingSpinner && reqId === fetchReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [targetExpertId, initialProfile]);

  // Synchronously invalidate and reset state when target expert changes
  useEffect(() => {
    fetchReqIdRef.current += 1;
    if (initialPendingBooking?.selectedDateStr) {
      userExplicitlySelectedDateRef.current = initialPendingBooking.selectedDateStr;
      setSelectedDateStr(initialPendingBooking.selectedDateStr);
      if (initialPendingBooking.selectedSlot) {
        setSelectedSlot(initialPendingBooking.selectedSlot);
      }
    } else {
      userExplicitlySelectedDateRef.current = null;
      setSelectedDateStr("");
      setSelectedSlot(null);
    }
    setBookedSessions([]);
    setIsSessionsLoading(true);

    if (targetExpertId) {
      const prof = initialProfile as any;
      const initialId = prof?.id || prof?._id || prof?.expertID || prof?.rawExpert?._id || prof?.rawExpert?.userId;
      if (initialId && String(initialId) === String(targetExpertId)) {
        setProfile(prof.rawExpert ? mapExpertToProfile(prof.rawExpert) : prof);
      } else {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  }, [targetExpertId, initialPendingBooking]);

  // Dedicated effect: ALWAYS fetch booked sessions & authoritative expert profile when modal opens
  useEffect(() => {
    if (!isOpen || !targetExpertId) return;

    setIsSessionsLoading(true);
    if ((initialProfile as any)?.rawExpert && !profile) {
      setProfile(mapExpertToProfile((initialProfile as any).rawExpert));
    } else if (initialProfile && !profile) {
      setProfile(initialProfile);
    }

    fetchSessions();
    fetchExpert(false);
  }, [isOpen, targetExpertId, fetchSessions, fetchExpert]);

  // Real-time synchronization when availability or booked sessions change
  useDataSync(
    ["AVAILABILITY_UPDATED", "PROFILE_UPDATED", "SESSION_CREATED", "SESSION_UPDATED", "SESSION_CANCELLED"],
    (payload) => {
      if (!isOpen || !targetExpertId) return;

      const evtExpertId = payload.expertId || payload.data?.expertId || payload.data?.userId;
      const targetStr = targetExpertId.toString();

      if (
        payload.type === "AVAILABILITY_UPDATED" ||
        payload.type === "PROFILE_UPDATED"
      ) {
        if (!evtExpertId || evtExpertId.toString() === targetStr) {
          fetchExpert(false);
        }
      } else if (
        payload.type === "SESSION_CREATED" ||
        payload.type === "SESSION_UPDATED" ||
        payload.type === "SESSION_CANCELLED"
      ) {
        fetchSessions();
      }
    }
  );

  // Handle escape key & strictly lock background page scrolling behind modal
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    // Strictly lock root scrolling so the page behind cannot scroll
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overflowY = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.overflowY = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Prevent keyboard navigation keys from scrolling the background page
      const scrollKeys = ["Space", " ", "PageUp", "PageDown", "End", "Home"];
      if (scrollKeys.includes(e.key)) {
        const target = e.target as HTMLElement | null;
        const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (!isInput) {
          const modal = modalDialogRef.current;
          if (!modal || !modal.contains(target)) {
            e.preventDefault();
          }
        }
      }
    };

    // Prevent background wheel and touch scrolling behind the selecting date & available time slot modal
    const preventBackgroundScroll = (e: WheelEvent | TouchEvent) => {
      const modal = modalDialogRef.current;
      // If the scroll event happened outside the modal dialog (e.g. on backdrop or background page), block it
      if (!modal || !modal.contains(e.target as Node)) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // If wheel event happened inside the modal dialog
      if (e instanceof WheelEvent) {
        // If wheel is over date carousel, handle horizontal scrolling cleanly without triggering vertical page scroll
        const carousel = carouselRef.current;
        if (carousel && carousel.contains(e.target as Node)) {
          if (e.cancelable) e.preventDefault();
          if (e.deltaY !== 0) {
            carousel.scrollLeft += e.deltaY;
            checkCarouselScroll();
          }
          return;
        }

        // Find the closest scrollable container inside the modal dialog
        let scrollableEl: HTMLElement | null = null;
        let curr = e.target as HTMLElement | null;
        while (curr && curr !== modal) {
          const style = window.getComputedStyle(curr);
          if (
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            curr.scrollHeight > curr.clientHeight
          ) {
            scrollableEl = curr;
            break;
          }
          curr = curr.parentElement;
        }

        // If target is not inside any scrollable container (e.g. header, footer, static text), prevent background scroll
        if (!scrollableEl) {
          if (e.cancelable) e.preventDefault();
          return;
        }

        // Inside a scrollable container (e.g. modal body or slots grid)
        const isScrollingDown = e.deltaY > 0;
        const isAtBottom = scrollableEl.scrollHeight - scrollableEl.scrollTop <= scrollableEl.clientHeight + 1;
        const isAtTop = scrollableEl.scrollTop <= 0;

        // Prevent scroll from propagating to document once top/bottom boundary is reached
        if ((isScrollingDown && isAtBottom) || (!isScrollingDown && isAtTop)) {
          if (e.cancelable) e.preventDefault();
        }
      } else if (e instanceof TouchEvent) {
        // Find closest scrollable container for touch gestures
        let scrollableEl: HTMLElement | null = null;
        let curr = e.target as HTMLElement | null;
        while (curr && curr !== modal) {
          const style = window.getComputedStyle(curr);
          if (
            (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflowX === "auto" || style.overflowX === "scroll") &&
            (curr.scrollHeight > curr.clientHeight || curr.scrollWidth > curr.clientWidth)
          ) {
            scrollableEl = curr;
            break;
          }
          curr = curr.parentElement;
        }

        if (!scrollableEl) {
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", preventBackgroundScroll, { passive: false });
    window.addEventListener("touchmove", preventBackgroundScroll, { passive: false });

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.overflowY = "";
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.overflowY = "";
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", preventBackgroundScroll);
      window.removeEventListener("touchmove", preventBackgroundScroll);
    };
  }, [isOpen, onClose]);

  // Allowed duration options: mentor offers exactly ONE duration (30 Min or 60 Min)
  const durationOptions = useMemo<number[]>(() => {
    const prof = profile || initialProfile;
    const allowed = (prof as any)?.availability?.allowedDurations;
    if (Array.isArray(allowed) && allowed.length === 1) {
      const dur = Number(allowed[0]);
      if (dur === 30 || dur === 60) return [dur];
    }
    // If legacy expert has multiple or none, prefer their existing default slot length
    const singleDur = (prof as any)?.availability?.sessionDuration || (prof as any)?.sessionDuration || 30;
    return [singleDur === 60 ? 60 : 30];
  }, [profile, initialProfile]);

  useEffect(() => {
    if (durationOptions.length > 0 && !durationOptions.includes(sessionDuration)) {
      setSessionDuration(durationOptions[0]);
    }
  }, [durationOptions, sessionDuration]);

  // Only the levels supported by this specific mentor (from profile.levels or profile.level)
  const expertLevels = useMemo<string[]>(() => {
    const prof = profile || initialProfile;
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
  }, [profile, initialProfile]);

  // Keep selectedLevel strictly within this mentor's supported levels if one is chosen
  useEffect(() => {
    if (initialPendingBooking?.selectedLevel && expertLevels.includes(initialPendingBooking.selectedLevel)) {
      setSelectedLevel(initialPendingBooking.selectedLevel);
    } else if (expertLevels.length > 0 && (!selectedLevel || !expertLevels.includes(selectedLevel))) {
      setSelectedLevel(expertLevels[0]);
    }
  }, [expertLevels, selectedLevel, initialPendingBooking]);

  // Dynamic Level Prices loading from API (only for this mentor's levels)
  useEffect(() => {
    const currentExpertId = profile?.id || expertId || (initialProfile as any)?._id || (initialProfile as any)?.id;
    if (!isOpen || !currentExpertId || expertLevels.length === 0) return;

    let isMounted = true;
    const fetchLevelPrices = async () => {
      setLoadingPrices(true);
      const category = profile?.category || (initialProfile as any)?.category || "IT";
      const catDefaults = DEFAULT_CATEGORY_MATRIX[category] || DEFAULT_CATEGORY_MATRIX["IT"];
      const newPrices: Record<string, number> = {};

      await Promise.all(
        expertLevels.map(async (lvl) => {
          try {
            const res = await axios.get("/api/pricing/calculate-price", {
              params: {
                expertId: currentExpertId,
                duration: sessionDuration,
                level: lvl
              }
            });
            if (res.data?.success && res.data?.finalPrice != null) {
              newPrices[lvl] = res.data.finalPrice;
              newPrices[`${lvl}_${sessionDuration}`] = res.data.finalPrice;
              return;
            }
          } catch (_) {}

          const base = catDefaults[lvl] || 499;
          const fallback = sessionDuration === 30 ? base : Math.round(base * 1.8);
          newPrices[lvl] = fallback;
          newPrices[`${lvl}_${sessionDuration}`] = fallback;
        })
      );

      if (isMounted) {
        setLevelPrices((prev) => ({ ...prev, ...newPrices }));
        setLoadingPrices(false);
      }
    };

    fetchLevelPrices();
    return () => {
      isMounted = false;
    };
  }, [isOpen, expertId, profile?.id, profile?.category, sessionDuration, initialProfile, expertLevels]);

  const getPriceForLevel = useCallback((lvl: string, dur: number = sessionDuration) => {
    const key = `${lvl}_${dur}`;
    if (levelPrices[key] != null) return levelPrices[key];
    if (levelPrices[lvl] != null) {
      return dur === 30 ? levelPrices[lvl] : Math.round(levelPrices[lvl] * 1.8);
    }
    const cat = profile?.category || (initialProfile as any)?.category || "IT";
    const defaults = DEFAULT_CATEGORY_MATRIX[cat] || DEFAULT_CATEGORY_MATRIX["IT"];
    const base = defaults[lvl] || 499;
    return dur === 30 ? base : Math.round(base * 1.8);
  }, [levelPrices, sessionDuration, profile?.category, initialProfile]);

  // Price calculations based on selectedLevel and duration
  const rawPrice = useMemo(() => {
    if (!selectedLevel) {
      return getPriceForLevel(expertLevels[0] || "Rising Mentor", sessionDuration);
    }
    return getPriceForLevel(selectedLevel, sessionDuration);
  }, [selectedLevel, sessionDuration, expertLevels, getPriceForLevel]);

  const displayPrice = useMemo(() => {
    let p = rawPrice;
    if (appliedPromoPercent > 0) {
      p = Math.round(p * (1 - appliedPromoPercent / 100));
    }
    return p;
  }, [rawPrice, appliedPromoPercent]);

  type PaymentMethodType = 'MOCKEEFY_WALLET' | 'RAZORPAY' | 'COMBINED';
  const [userSelectedPaymentMethod, setUserSelectedPaymentMethod] = useState<PaymentMethodType | null>(null);

  const paymentMethod: PaymentMethodType = useMemo(() => {
    if (userSelectedPaymentMethod === 'MOCKEEFY_WALLET') {
      if (walletBalance >= displayPrice && displayPrice > 0) return 'MOCKEEFY_WALLET';
      if (walletBalance > 0) return 'COMBINED';
      return 'RAZORPAY';
    }
    if (userSelectedPaymentMethod === 'COMBINED') {
      if (walletBalance > 0 && walletBalance < displayPrice) return 'COMBINED';
      if (walletBalance >= displayPrice && displayPrice > 0) return 'MOCKEEFY_WALLET';
      return 'RAZORPAY';
    }
    if (userSelectedPaymentMethod === 'RAZORPAY') {
      return 'RAZORPAY';
    }
    // Default smart selection
    if (walletBalance >= displayPrice && displayPrice > 0) return 'MOCKEEFY_WALLET';
    if (walletBalance > 0) return 'COMBINED';
    return 'RAZORPAY';
  }, [userSelectedPaymentMethod, walletBalance, displayPrice]);

  const useWallet = paymentMethod === 'MOCKEEFY_WALLET' || paymentMethod === 'COMBINED';

  const setUseWallet = (val: boolean) => {
    if (val) {
      if (walletBalance >= displayPrice && displayPrice > 0) {
        setUserSelectedPaymentMethod('MOCKEEFY_WALLET');
      } else if (walletBalance > 0) {
        setUserSelectedPaymentMethod('COMBINED');
      } else {
        setUserSelectedPaymentMethod('RAZORPAY');
      }
    } else {
      setUserSelectedPaymentMethod('RAZORPAY');
    }
  };

  const handleApplyPromo = () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) return;
    if (code === "FREE100" || code === "MOCKFREE" || code === "FREEMOCK" || code === "FREEMU001") {
      setAppliedFreePromo(true);
      setAppliedPromoPercent(100);
      Swal.fire({
        title: "Promo Applied!",
        text: "100% discount applied. Session is free!",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
    } else if (code === "MOCK20" || code === "SAVE20") {
      setAppliedPromoPercent(20);
      setAppliedFreePromo(false);
      Swal.fire({
        title: "Promo Applied!",
        text: "20% discount applied successfully!",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({
        title: "Invalid Code",
        text: "This promo code is not valid.",
        icon: "error",
        confirmButtonColor: "#0755E8",
      });
    }
  };

  // Active Availability directly available synchronously or from loaded profile
  const activeAvailability = useMemo(() => {
    return (
      profile?.availability ||
      (initialProfile as any)?.rawExpert?.availability ||
      (initialProfile as any)?.availability ||
      null
    );
  }, [profile?.availability, initialProfile]);

  const hasAvailabilityError = Boolean(sessionsError);
  const isContentLoading = loading || isSessionsLoading || !activeAvailability;

  // Dates for current month that actually have scheduled, available openings
  const dates = useMemo(() => {
    if (isContentLoading || hasAvailabilityError || !activeAvailability) return [];

    const now = new Date();
    const parts = getKolkataTimeParts(currentMonth);
    const year = parts.year;
    const month = parts.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allDates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const todayDateStr = getKolkataDateString(now);

    return allDates.filter(date => {
      const dateStr = getKolkataDateString(date);
      // Past days cannot be selected
      if (dateStr < todayDateStr) return false;

      // Only show dates where the expert has scheduled timings with at least one genuinely available slot
      const slots = generateAvailableSlotsForDate(date, activeAvailability, sessionDuration, bookedSessions, now);
      return slots.some(s => s.available === true);
    });
  }, [currentMonth, activeAvailability, sessionDuration, bookedSessions, currentTick, isContentLoading]);

  const userExplicitlySelectedDateRef = useRef<string | null>(
    initialPendingBooking?.selectedDateStr || null
  );

  // Derived active date (eliminates index desynchronization and array out-of-bounds flickers)
  const activeDate = useMemo(() => {
    if (selectedDateStr) {
      const found = dates.find(d => getKolkataDateString(d) === selectedDateStr);
      if (found) return found;
    }
    if (!dates || dates.length === 0) return null;
    return dates[0];
  }, [dates, selectedDateStr]);

  const isTodayActive = useMemo(() => {
    if (!activeDate) return false;
    return getKolkataDateString(activeDate) === getKolkataDateString(new Date());
  }, [activeDate]);

  const todayStatus = useMemo(() => {
    if (isContentLoading || !activeAvailability) return { hasSlots: false, dateStr: "", label: "", isCurrentMonth: false };
    const now = new Date();
    const todayStr = getKolkataDateString(now);
    const todayParts = getKolkataTimeParts(now);
    const todayDate = new Date(todayParts.year, todayParts.month, todayParts.day, 12, 0, 0);
    const currentMonthParts = getKolkataTimeParts(currentMonth);
    const isCurrentMonth = todayParts.year === currentMonthParts.year && todayParts.month === currentMonthParts.month;
    const slots = generateAvailableSlotsForDate(todayDate, activeAvailability, sessionDuration, bookedSessions, now);
    const hasSlots = slots.some(s => s.available === true);
    return {
      hasSlots,
      dateStr: todayStr,
      label: todayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata" }),
      isCurrentMonth
    };
  }, [activeAvailability, sessionDuration, bookedSessions, currentMonth, currentTick, isContentLoading]);

  const nextAvailableDateInfo = useMemo(() => {
    if (isContentLoading || !activeAvailability || !dates || dates.length === 0) return null;
    const now = new Date();
    const todayStr = getKolkataDateString(now);
    const candidate = dates.find(d => getKolkataDateString(d) > todayStr) || dates[0];
    if (candidate) {
      return {
        date: candidate,
        dateStr: getKolkataDateString(candidate),
        label: candidate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata" }),
      };
    }
    return null;
  }, [activeAvailability, dates, isContentLoading]);

  // Synchronize selectedDateStr with available dates without overwriting candidate's explicit selection
  useEffect(() => {
    if (isContentLoading) return;
    if (dates.length > 0) {
      if (userExplicitlySelectedDateRef.current) {
        const stillValid = dates.some(d => getKolkataDateString(d) === userExplicitlySelectedDateRef.current);
        if (stillValid) {
          setSelectedDateStr(userExplicitlySelectedDateRef.current);
          return;
        }
      }
      const now = new Date();
      const todayStr = getKolkataDateString(now);
      if (dates.some(d => getKolkataDateString(d) === todayStr)) {
        if (!selectedDateStr || selectedDateStr !== todayStr) {
          setSelectedDateStr(todayStr);
        }
      } else {
        const firstAvailStr = getKolkataDateString(dates[0]);
        if (!selectedDateStr || !dates.some(d => getKolkataDateString(d) === selectedDateStr)) {
          setSelectedDateStr(firstAvailStr);
        }
      }
    } else {
      if (!initialPendingBooking?.selectedDateStr) {
        setSelectedDateStr("");
        setSelectedSlot(null);
      }
    }
  }, [dates, isContentLoading, initialPendingBooking]);

  // If opening modal and current month has 0 openings, auto-navigate to the first month with available openings
  const hasAutoSelectedMonth = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasAutoSelectedMonth.current = false;
    }
  }, [isOpen, expertId]);

  useEffect(() => {
    if (activeAvailability && !hasAutoSelectedMonth.current) {
      hasAutoSelectedMonth.current = true;
      const firstAvailMonth = getFirstAvailableMonth(activeAvailability, sessionDuration, bookedSessions);
      if (
        firstAvailMonth.getMonth() !== currentMonth.getMonth() ||
        firstAvailMonth.getFullYear() !== currentMonth.getFullYear()
      ) {
        setCurrentMonth(firstAvailMonth);
      }
    }
  }, [activeAvailability, sessionDuration, bookedSessions]);

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

  // Generate Available Slots for Selected Date
  const currentSlots = useMemo(() => {
    if (!activeAvailability || !activeDate) return [];
    return generateAvailableSlotsForDate(activeDate, activeAvailability, sessionDuration, bookedSessions, new Date());
  }, [activeDate, activeAvailability, sessionDuration, bookedSessions, currentTick]);

  // Auto-deselect if the selected slot becomes unavailable or was booked (only after content is fully loaded)
  useEffect(() => {
    if (isContentLoading || !activeAvailability || currentSlots.length === 0) return;
    if (selectedSlot && !currentSlots.some((s) => s.time === selectedSlot.time)) {
      setSelectedSlot(null);
    }
  }, [currentSlots, selectedSlot, isContentLoading, activeAvailability]);

  // Re-anchor slot if initialPendingBooking specified one and slots have loaded
  useEffect(() => {
    if (initialPendingBooking?.selectedSlot && currentSlots.length > 0) {
      if (!selectedSlot || selectedSlot.time !== initialPendingBooking.selectedSlot.time) {
        const match = currentSlots.find((s) => s.time === initialPendingBooking.selectedSlot?.time);
        if (match) {
          setSelectedSlot(match);
        }
      }
    }
  }, [currentSlots, initialPendingBooking, selectedSlot]);

  // Real-time listener for booked sessions across browser tabs / windows
  useEffect(() => {
    const handleSessionBooked = (e: any) => {
      if (e.detail?.startTime && e.detail?.endTime) {
        setBookedSessions((prev) => [
          ...prev,
          { startTime: e.detail.startTime, endTime: e.detail.endTime, status: "confirmed" },
        ]);
      }
      if (targetExpertId) {
        axios.get(`/api/sessions/expert/${targetExpertId}`).then((res) => {
          if (Array.isArray(res.data)) {
            setBookedSessions(res.data);
          }
        }).catch(() => {});
      }
    };
    window.addEventListener("session-booked", handleSessionBooked);
    return () => window.removeEventListener("session-booked", handleSessionBooked);
  }, [targetExpertId]);

  const expertDisplayName = profile?.name || (initialProfile as any)?.name || "Interview Expert";
  const expertRole = profile?.role || (initialProfile as any)?.role || "Interview Expert";
  const expertCompany =
    profile?.company ||
    (initialProfile as any)?.company ||
    (initialProfile as any)?.rawExpert?.professionalDetails?.company ||
    (profile as any)?.professionalDetails?.company ||
    "";
  const expertAvatar = useMemo(() => {
    if (profile?.avatar) return profile.avatar;
    if ((initialProfile as any)?.avatar) return (initialProfile as any).avatar;
    if ((initialProfile as any)?.profileImage) return getProfileImageUrl((initialProfile as any).profileImage);
    return null;
  }, [profile?.avatar, initialProfile]);

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

  // Booking Execution
  const buildPayload = () => {
    if (!profile || !selectedSlot || !activeDate) return null;
    const date = activeDate;
    const kolkataDateStr = getKolkataDateString(date);
    const [startRaw, endRaw] = (selectedSlot.time || "").split(/\s*[-–]\s*/);

    const parseToHHMM = (timeStr: string) => {
      const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return "00:00";
      let h = parseInt(match[1], 10);
      const m = match[2];
      const mer = (match[3] || "").toUpperCase();
      if (mer === "PM" && h < 12) h += 12;
      if (mer === "AM" && h === 12) h = 0;
      return `${h.toString().padStart(2, "0")}:${m}`;
    };

    const startDate = new Date(`${kolkataDateStr}T${parseToHHMM(startRaw)}:00+05:30`);
    const durationMin = Number(sessionDuration) || 30;
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    const candidateId = user?.id || user?.userId || (user as any)?._id;

    return {
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
      price: appliedFreePromo ? 0 : displayPrice,
      originalPrice: rawPrice,
      discount: appliedFreePromo ? rawPrice : rawPrice - displayPrice,
      status: "scheduled",
      isPremiumSession: !!(user?.isPremium),
      notes: "1:1 Live Mock Interview",
    };
  };

  const triggerAuthPrompt = (defaultAction?: "login" | "signup") => {
    const mentorName = profile?.name || (initialProfile as any)?.name || "your mentor";
    const mentorAvatar = profile?.avatar || (initialProfile as any)?.avatar || "";
    const slotTime = selectedSlot?.time || "";
    const dateText = selectedDateStr
      ? new Date(selectedDateStr).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      : "";

    const currentExpertId = String(targetExpertId || expertId);

    const pendingIntent: PendingBookingIntent = {
      expertId: currentExpertId,
      expertName: mentorName,
      expertRole: profile?.role || (initialProfile as any)?.role,
      expertAvatar: mentorAvatar,
      selectedLevel: selectedLevel || undefined,
      selectedDuration: sessionDuration,
      selectedDateStr: selectedDateStr || undefined,
      selectedSlot: selectedSlot || undefined,
      selectedDomain: (profile as any)?.category || (initialProfile as any)?.category || undefined,
      cachedProfile: profile || initialProfile || undefined,
      rawExpert: (profile as any)?.rawExpert || (initialProfile as any)?.rawExpert || undefined,
      sourceUrl: window.location.pathname + (window.location.search ? window.location.search : ""),
      timestamp: Date.now(),
    };
    savePendingBooking(pendingIntent);

    const returnUrl = `${window.location.pathname}?resumeBooking=true&expertId=${currentExpertId}`;

    if (defaultAction === "login") {
      navigate(`/signin?returnUrl=${encodeURIComponent(returnUrl)}`, {
        state: { returnUrl, pendingBooking: pendingIntent },
      });
      return;
    }
    if (defaultAction === "signup") {
      navigate(`/signup?returnUrl=${encodeURIComponent(returnUrl)}`, {
        state: { returnUrl, pendingBooking: pendingIntent },
      });
      return;
    }

    showBookingAuthAlert({
      mentorName,
      dateStr: dateText,
      timeSlot: slotTime,
      duration: sessionDuration,
      onLogin: () => {
        navigate(`/signin?returnUrl=${encodeURIComponent(returnUrl)}`, {
          state: { returnUrl, pendingBooking: pendingIntent },
        });
      },
      onSignUp: () => {
        navigate(`/signup?returnUrl=${encodeURIComponent(returnUrl)}`, {
          state: { returnUrl, pendingBooking: pendingIntent },
        });
      },
    });
  };

  const handleBooking = async () => {
    if (isProcessing || !selectedSlot) return;

    if (!selectedLevel) {
      toast.error("Please select an expert level before proceeding.");
      return;
    }

    if (!user) {
      triggerAuthPrompt();
      return;
    }

    const currentUserId = String(user?.id || (user as any)?._id || (user as any)?.userId || "");
    const expertTarget = String(targetExpertId || profile?.id || "");
    if (currentUserId && expertTarget && currentUserId === expertTarget) {
      toast.error("You cannot book an interview session with yourself.");
      return;
    }

    const payload = buildPayload();
    if (!payload) return;

    const formattedBookingDate = activeDate?.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) || "";
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

      // 3. User notification: Concise Toast
      toast.success("Interview booked successfully.");

      // 4. Mark confirmed, close modal, and navigate to /my-sessions
      clearPendingBooking();
      setBookingFlowState("confirmed");
      onClose();
      navigate("/my-sessions");

      // 5. User notification: Professional Confirmation Modal (No icons/emojis, structured layout)
      showBookingSuccessAlert({
        title: "Meeting Scheduled",
        mentorName: profile?.name || "Mentor",
        dateStr: formattedBookingDate,
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

      // 3. Full Wallet Payment (Deducts full amount directly from wallet without gateway)
      if (paymentMethod === 'MOCKEEFY_WALLET' && walletBalance >= displayPrice) {
        setBookingFlowState("confirming");
        const res = await axios.post("/api/payment/book-with-wallet", {
          bookingDetails: payload,
          price: displayPrice,
          paymentMethod: 'MOCKEEFY_WALLET'
        });
        if (res.data?.success) {
          fetchCandidateWallet();
          onBookingSuccess("Meeting Scheduled!", "Booked using your Mockeefy wallet balance.");
        } else {
          setBookingFlowState("selecting");
          throw new Error(res.data?.message || "Wallet booking failed.");
        }
        return;
      }

      // 4. Standard or Partial Wallet Checkout via Razorpay modal
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay payment gateway failed to load. Please check your internet connection.");
      }

      const isCombined = paymentMethod === 'COMBINED';
      const orderResponse = await axios.post("/api/payment/create-order", {
        amount: displayPrice,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        useWallet: isCombined,
        paymentMethod: paymentMethod,
        bookingDetails: payload
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
        description: `${sessionDuration} Min Mock Interview with ${profile?.name || "Mentor"}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            paymentCompleted = true;
            // IMMEDIATELY enter confirming state so previous booking modal never flashes
            setBookingFlowState("confirming");
            setIsProcessing(true);
            const verifyRes = await axios.post("/api/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentType: isCombined ? "hybrid" : "booking",
              user: user,
              useWallet: isCombined,
              walletDeduction: isCombined ? Math.min(walletBalance, displayPrice) : 0,
              bookingDetails: {
                expertId: profile?.id || expertId,
                expertName: profile?.name || "Mentor",
                expertEmail: (profile as any)?.userDetails?.email || (profile as any)?.email || "",
                candidateId: user?.id || user?.userId || (user as any)?._id,
                candidateName: user?.name,
                candidateEmail: user?.email,
                candidatePhone: user?.personalInfo?.phone || user?.phone,
                startTime: payload.startTime,
                endTime: payload.endTime,
                price: displayPrice,
                topics: [profile?.category || "Technical Interview"],
                duration: Number(sessionDuration),
                level: selectedLevel,
                notes: "Booked via Mockeefy Modal"
              }
            });

            if (verifyRes.data?.awaitingReconciliation || verifyRes.status === 202) {
              setBookingFlowState("selecting");
              onClose();
              Swal.fire({
                title: "Payment Verification in Progress",
                html: `
                  <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
                    <p style="margin-bottom: 12px;">Your payment is being verified with Razorpay. Your money is being tracked securely. You do not need to make another payment. We will update your booking or wallet once verification is complete.</p>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 12px 0;">
                      <p style="margin: 4px 0;"><strong>Payment ID:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${verifyRes.data?.paymentId || 'N/A'}</code></p>
                      <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${displayPrice}</p>
                    </div>
                  </div>
                `,
                icon: "info",
                showCancelButton: true,
                confirmButtonText: "View Wallet",
                cancelButtonText: "View My Sessions",
                confirmButtonColor: "#0755E8",
                cancelButtonColor: "#64748b"
              }).then((result) => {
                if (result.isConfirmed) {
                  navigate("/wallet");
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                  navigate("/my-sessions");
                }
              });
              return;
            }

            if (verifyRes.data?.walletCredited) {
              setBookingFlowState("selecting");
              onClose();
              Swal.fire({
                title: verifyRes.data.title || "Payment Added to Your Mockeefy Wallet",
                html: `
                  <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
                    <p style="margin-bottom: 12px;">${verifyRes.data.message}</p>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 12px 0;">
                      <p style="margin: 4px 0;"><strong>Credited Amount:</strong> ₹${verifyRes.data.amountCredited}</p>
                      <p style="margin: 4px 0;"><strong>Updated Wallet Balance:</strong> ₹${verifyRes.data.updatedBalance}</p>
                      <p style="margin: 4px 0; font-size: 11.5px; color: #64748b;"><strong>Wallet Transaction Ref:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${verifyRes.data.walletTransactionRef || 'N/A'}</code></p>
                    </div>
                  </div>
                `,
                icon: "info",
                showCancelButton: true,
                confirmButtonText: "View Wallet",
                cancelButtonText: "Book Another Interview",
                confirmButtonColor: "#0755E8",
                cancelButtonColor: "#64748b"
              }).then((result) => {
                if (result.isConfirmed) {
                  navigate("/wallet");
                }
              });
              return;
            }

            if (verifyRes.data?.success) {
              onBookingSuccess("Meeting Scheduled!");
            } else {
              throw new Error(verifyRes.data?.message || "Payment verification failed.");
            }
          } catch (verifyErr: any) {
            console.error("Payment Verification Error:", verifyErr);
            setBookingFlowState("error");

            if (verifyErr?.response?.data?.awaitingReconciliation || verifyErr?.response?.status === 202) {
              onClose();
              Swal.fire({
                title: "Payment Verification in Progress",
                html: `
                  <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
                    <p style="margin-bottom: 12px;">Your payment is being verified with Razorpay. Your money is being tracked securely. You do not need to make another payment. We will update your booking or wallet once verification is complete.</p>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 12px 0;">
                      <p style="margin: 4px 0;"><strong>Payment ID:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${verifyErr?.response?.data?.paymentId || 'N/A'}</code></p>
                      <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${displayPrice}</p>
                    </div>
                  </div>
                `,
                icon: "info",
                showCancelButton: true,
                confirmButtonText: "View Wallet",
                cancelButtonText: "View My Sessions",
                confirmButtonColor: "#0755E8",
                cancelButtonColor: "#64748b"
              }).then((result) => {
                if (result.isConfirmed) {
                  navigate("/wallet");
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                  navigate("/my-sessions");
                }
              });
              return;
            }

            if (verifyErr?.response?.data?.walletCredited) {
              const d = verifyErr.response.data;
              onClose();
              Swal.fire({
                title: d.title || "Payment Added to Your Mockeefy Wallet",
                html: `
                  <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
                    <p style="margin-bottom: 12px;">${d.message}</p>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 12px 0;">
                      <p style="margin: 4px 0;"><strong>Credited Amount:</strong> ₹${d.amountCredited}</p>
                      <p style="margin: 4px 0;"><strong>Updated Wallet Balance:</strong> ₹${d.updatedBalance}</p>
                      <p style="margin: 4px 0; font-size: 11.5px; color: #64748b;"><strong>Transaction Ref:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${d.walletTransactionRef || 'N/A'}</code></p>
                    </div>
                  </div>
                `,
                icon: "info",
                showCancelButton: true,
                confirmButtonText: "View Wallet",
                cancelButtonText: "Book Another Interview",
                confirmButtonColor: "#0755E8",
                cancelButtonColor: "#64748b"
              }).then((result) => {
                if (result.isConfirmed) {
                  navigate("/wallet");
                }
              });
              return;
            }

            const isCutoff = Boolean(verifyErr?.response?.data?.cutoffExpired);
            const isConflict = Boolean(verifyErr?.response?.data?.slotConflict);
            Swal.fire({
              title: isCutoff ? "Booking Cutoff Reached" : (isConflict ? "Slot Unavailable" : "Payment Verification Failed"),
              text: verifyErr?.response?.data?.message || verifyErr.message || "Could not verify payment.",
              icon: isCutoff || isConflict ? "warning" : "error"
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
              if (orderResponse.data?.walletDeduction > 0) {
                axios.post("/api/payment/cancel-partial-booking", {
                  orderId: order.id,
                  walletDebitTxnId: orderResponse.data?.walletDebitTxnId
                }).then((cRes) => {
                  if (cRes.data?.restored) {
                    toast.info(`Payment was cancelled. ₹${cRes.data.restoredAmount} restored to your Mockeefy wallet.`);
                    fetchCandidateWallet();
                  } else {
                    toast.info("Payment was cancelled. Your slot is still selected.");
                  }
                }).catch(() => {
                  toast.info("Payment was cancelled. Your slot is still selected.");
                });
              } else {
                toast.info("Payment was cancelled. Your slot is still selected.");
              }
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

  if (!isOpen || bookingFlowState === "confirmed" || typeof document === "undefined") return null;

  if (bookingFlowState === "confirming" || bookingFlowState === "payment_processing") {
    return (
      <ConfirmationLoadingModal
        expertName={expertDisplayName}
        isConfirming={bookingFlowState === "confirming"}
      />
    );
  }

  const isInitialModalLoading = (loading || !profile) && !initialProfile;

  if (isInitialModalLoading) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden overscroll-contain"
        onClick={onClose}
      >
        <div ref={modalDialogRef} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl my-auto">
          <BookingModalSkeleton onClose={onClose} initialProfile={initialProfile} />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden overscroll-contain"
      onClick={onClose}
    >
      <div
        ref={modalDialogRef}
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left my-auto animate-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP MODAL HEADER: Expert Summary & Dismiss (X) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F0F5FF]/90 via-[#F8FAFF] to-white border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Circular Avatar matching reference image */}
            <div className="relative shrink-0">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-1.5 overflow-hidden">
                {expertAvatar ? (
                  <img
                    src={expertAvatar}
                    alt={expertDisplayName}
                    className="w-full h-full object-contain rounded-full"
                  />
                ) : (
                  <span className="font-extrabold text-[#0755E8] text-base">
                    {expertDisplayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#10B981] ring-2 ring-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight truncate">
                  {expertDisplayName}
                </h3>
                <span title="Verified Interview Expert" className="inline-flex items-center shrink-0">
                  <BadgeCheck className="w-4.5 h-4.5 text-white fill-[#0755E8]" />
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium truncate mt-0.5">
                <span>{expertRole}</span>
                {expertCompany && (
                  <span className="text-slate-700 font-semibold"> at {expertCompany}</span>
                )}
                <span className="mx-1">•</span>
                <span className="text-[#0755E8] font-bold">
                  {selectedLevel ? (
                    loadingPrices && levelPrices[selectedLevel] == null && levelPrices[`${selectedLevel}_${sessionDuration}`] == null ? (
                      <span className="inline-block w-8 h-3.5 bg-blue-100/70 rounded animate-pulse align-middle" />
                    ) : (
                      `₹${displayPrice} (${sessionDuration}m)`
                    )
                  ) : (
                    `From ₹${getPriceForLevel(expertLevels[0] || "Rising Mentor", sessionDuration)} (${sessionDuration}m)`
                  )}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 hover:text-slate-800 border border-slate-200/80 flex items-center justify-center transition-all cursor-pointer shrink-0 mt-0.5"
            aria-label="Close booking modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div
          ref={modalBodyRef}
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-4.5 space-y-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {!user && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl text-xs text-blue-950 animate-in fade-in shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-[#0755E8] shrink-0" />
                <span className="leading-snug">
                  Choose your slot below. You'll be prompted to sign in or create an account to finalize your booking.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => triggerAuthPrompt("login")}
                  className="px-3 py-1 rounded-xl bg-white border border-blue-200/90 text-[#0755E8] hover:bg-blue-50/80 text-[11.5px] font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => triggerAuthPrompt("signup")}
                  className="px-3 py-1 rounded-xl bg-[#0755E8] hover:bg-[#0645C7] text-white text-[11.5px] font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
          <div>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 id="booking-modal-title" className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Select Date &amp; Available Time Slot
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  All session times are displayed in your local India Standard Time (IST / GMT+5:30).
                </p>
              </div>

              {/* Duration Toggle Buttons ([30 Min] [60 Min]) */}
              {durationOptions.length > 0 && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                  {durationOptions.map((dur) => (
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

          {/* EXPERT LEVEL SELECTION (1-Click, clean segmented cards) */}
          {expertLevels.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#0755E8]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Select Expert Tier
                  </span>
                </div>
                <span className="text-[10.5px] font-bold text-[#0755E8] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                  {sessionDuration} Min Session
                </span>
              </div>

              <div
                className={`grid gap-1.5 sm:gap-2 ${
                  expertLevels.length === 1
                    ? "grid-cols-1"
                    : expertLevels.length === 2
                    ? "grid-cols-2"
                    : expertLevels.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-4"
                }`}
              >
                {expertLevels.map((lvl) => {
                  const isSelected = selectedLevel === lvl;
                  const lvlPrice = getPriceForLevel(lvl, sessionDuration);
                  const shortName = lvl.replace(" Mentor", "");
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={`relative flex flex-col items-start p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-b from-[#EEF4FF] to-[#F8FAFF] border-[#0755E8] shadow-xs ring-2 ring-[#0755E8]/20"
                          : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-1">
                        <span className={`text-[11px] sm:text-xs font-bold truncate ${isSelected ? "text-[#0755E8]" : "text-slate-800"}`}>
                          {shortName}
                        </span>
                        {isSelected ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-[#0755E8] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                        )}
                      </div>
                      <span className={`text-xs sm:text-[13px] font-black mt-1 tabular-nums ${isSelected ? "text-[#0755E8]" : "text-slate-900"}`}>
                        ₹{lvlPrice.toLocaleString("en-IN")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SELECT DATE Header & Navigation Controls */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              SELECT DATE
            </span>

            {/* Month Picker Controls */}
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

          {/* 3. Date Carousel with drag-to-flick, mousewheel, and smooth centering */}
          {todayStatus.isCurrentMonth && !todayStatus.hasSlots && (
            <div className="p-2 sm:p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] sm:text-xs truncate font-medium">
                  No interview slots available today.
                  {nextAvailableDateInfo ? ` Next: ${nextAvailableDateInfo.label}` : " No upcoming slots in this month."}
                </span>
              </div>
              {nextAvailableDateInfo && (
                <button
                  type="button"
                  onClick={() => {
                    userExplicitlySelectedDateRef.current = nextAvailableDateInfo.dateStr;
                    setSelectedDateStr(nextAvailableDateInfo.dateStr);
                    setSelectedSlot(null);
                  }}
                  className={`px-2.5 py-1 text-white font-bold rounded-lg transition-all text-[11px] shrink-0 cursor-pointer shadow-2xs ${
                    selectedDateStr === nextAvailableDateInfo.dateStr
                      ? "bg-[#0755E8] hover:bg-blue-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {selectedDateStr === nextAvailableDateInfo.dateStr ? `Viewing ${nextAvailableDateInfo.label}` : `View ${nextAvailableDateInfo.label}`}
                </button>
              )}
            </div>
          )}

          {isContentLoading ? (
            <div className="flex gap-2.5 overflow-hidden pb-2 mb-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="min-w-[68px] h-[74px] rounded-2xl bg-slate-100 border border-slate-200/70 animate-pulse flex flex-col items-center justify-center gap-1.5 p-2 shrink-0"
                >
                  <div className="h-2.5 w-10 bg-slate-200/80 rounded" />
                  <div className="h-5 w-7 bg-slate-200/80 rounded" />
                  <div className="h-2 w-8 bg-slate-200/80 rounded" />
                </div>
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
              className="flex gap-2 overflow-x-auto pb-1 select-none cursor-grab active:cursor-grabbing scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {hasAvailabilityError ? (
                <div className="w-full py-5 px-4 text-center bg-rose-50/70 rounded-xl border border-rose-200 flex flex-col items-center justify-center gap-2">
                  <p className="text-xs font-semibold text-rose-800">{sessionsError || "Unable to load interview slot availability."}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSessionsLoading(true);
                      setSessionsError(null);
                      fetchSessions();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Retry</span>
                  </button>
                </div>
              ) : dates.length > 0 ? (
                dates.map((date) => {
                  const dateStr = getKolkataDateString(date);
                  const isToday = getKolkataDateString(new Date()) === dateStr;
                  const isSelected = activeDate && dateStr === getKolkataDateString(activeDate);
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={(e) => {
                        if (hasDragged.current) return;
                        userExplicitlySelectedDateRef.current = dateStr;
                        setSelectedDateStr(dateStr);
                        setSelectedSlot(null);
                        (e.currentTarget as HTMLElement).scrollIntoView({
                          behavior: "smooth",
                          inline: "center",
                          block: "nearest",
                        });
                      }}
                      className={`min-w-[66px] text-center px-2 py-2.5 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-[#0755E8] border-[#0755E8] text-white shadow-xs ring-2 ring-[#0755E8]/20"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 flex items-center justify-center gap-1">
                        {isToday && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide ${isSelected ? "bg-white text-[#0755E8]" : "bg-emerald-100 text-emerald-800 border border-emerald-300"}`}>
                            TODAY
                          </span>
                        )}
                        {!isToday && date.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" })}
                      </div>
                      <div className="font-extrabold text-lg my-0.5 tabular-nums leading-none">
                        {date.toLocaleDateString("en-US", { day: "numeric", timeZone: "Asia/Kolkata" })}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-85">
                        {date.toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Kolkata" })}
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

          {/* 4 & 5. AVAILABLE SLOTS FOR Header & Time Slots Grid (or empty month state) */}
          {hasAvailabilityError ? (
            <div className="py-8 text-center bg-rose-50/60 rounded-2xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center p-6 min-h-[140px]">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
              <p className="text-sm font-bold text-rose-900">Unable to load interview slots</p>
              <p className="text-xs text-rose-700 mt-1 max-w-sm">
                {sessionsError || "An error occurred while fetching availability. Please try again."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSessionsLoading(true);
                  setSessionsError(null);
                  fetchSessions();
                }}
                className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Retry</span>
              </button>
            </div>
          ) : dates.length === 0 ? (
            <div className="py-8 text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 min-h-[140px]">
              <Calendar className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-800">No time slots scheduled for this month</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {expertDisplayName} has not scheduled any timings for {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}. Please check the next month for open slots.
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
              {/* AVAILABLE SLOTS FOR Header with Badge */}
              <div className="flex items-center justify-between mb-2 pt-2 border-t border-slate-100">
                {isContentLoading ? (
                  <div className="h-4 w-44 bg-slate-200/80 rounded animate-pulse" />
                ) : (
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    AVAILABLE SLOTS FOR {activeDate ? activeDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata" }).toUpperCase() : ""}
                  </span>
                )}
                {isContentLoading ? (
                  <div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse" />
                ) : (
                  <span className="text-[11px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full border border-[#93B8FF]/40">
                    {currentSlots.filter(s => s.available).length} slots available
                  </span>
                )}
              </div>

              {/* Time Slots Grid OR Empty State Box */}
              {isContentLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 p-0.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-[38px] sm:h-[40px] rounded-xl bg-slate-100 border border-slate-200/70 animate-pulse flex items-center px-3.5 gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-200/80 shrink-0" />
                      <div className="h-3.5 w-24 bg-slate-200/70 rounded" />
                    </div>
                  ))}
                </div>
              ) : currentSlots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 max-h-[190px] sm:max-h-[220px] overflow-y-auto overscroll-contain p-0.5 [scrollbar-width:thin] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {currentSlots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    const isUnavailable = !slot.available;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => setSelectedSlot(isSelected ? null : slot)}
                        className={`relative flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all border outline-none ${
                          isUnavailable
                            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                            : isSelected
                            ? "bg-[#0755E8] border-[#0755E8] text-white shadow-xs ring-2 ring-[#0755E8]/25 cursor-pointer"
                            : "bg-white border-slate-200 text-slate-800 hover:border-[#0755E8] hover:bg-[#F8FAFF] cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : isUnavailable ? "text-slate-300" : "text-[#0755E8]"}`} />
                          <span className={`whitespace-nowrap tabular-nums text-xs ${
                            isUnavailable ? "line-through text-slate-400" : isSelected ? "text-white font-bold" : "text-slate-800"
                          }`}>
                            {slot.time}
                          </span>
                        </div>
                        {isUnavailable ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded shrink-0">
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
                <div className="py-8 text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 min-h-[140px]">
                  <Calendar className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-800">
                    {isTodayActive ? "No remaining slots available for Today" : "No time slots available on this day"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {isTodayActive && nextAvailableDateInfo
                      ? `All openings for today have passed. Next available date with openings is ${nextAvailableDateInfo.label}.`
                      : `${expertDisplayName} has no remaining openings for this date. Please select another date from the carousel above.`}
                  </p>
                  {isTodayActive && nextAvailableDateInfo && (
                    <button
                      type="button"
                      onClick={() => {
                        userExplicitlySelectedDateRef.current = nextAvailableDateInfo.dateStr;
                        setSelectedDateStr(nextAvailableDateInfo.dateStr);
                        setSelectedSlot(null);
                      }}
                      className="mt-3 px-3.5 py-1.5 bg-[#0755E8] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>Switch to {nextAvailableDateInfo.label}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* 6. Selected Slot Summary Bar & Optional Promo */}
          {selectedSlot && (
            <div className="border-t border-slate-100 pt-4 mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-950 truncate">
                    {activeDate?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata" })} at {selectedSlot.time} ({sessionDuration}m)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              {/* Promo code row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo code (optional)"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0755E8]"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-3.5 py-2 bg-[#EAF2FF] text-[#0755E8] hover:bg-[#dbe7fd] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {appliedFreePromo && (
                <div className="flex items-center justify-between text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <span>Free Promo Applied (100% off)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedFreePromo(false);
                      setAppliedPromoPercent(0);
                      setDiscountCode("");
                    }}
                    className="text-red-500 hover:underline text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* 5. Dedicated Payment Method Selection Section */}
              {user && !appliedFreePromo && !(user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)) && (
                <div className="p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border border-slate-200/90 rounded-2xl space-y-3 text-left shadow-2xs">
                  {/* Heading */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#0755E8]" />
                        <span>Choose Payment Method</span>
                      </h4>
                      <p className="text-[10.5px] text-slate-500 font-medium">
                        Select your preferred payment method before confirming the booking
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Available Balance</span>
                      <span className={`text-xs font-extrabold ${walletBalance > 0 ? "text-emerald-700" : "text-slate-500"}`}>
                        ₹{formatPrice(walletBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Hidden backward-compatible checkbox for automated scripts expecting #use-mockeefy-wallet-toggle */}
                  <input
                    type="checkbox"
                    id="use-mockeefy-wallet-toggle"
                    disabled={walletBalance <= 0}
                    checked={(paymentMethod === 'MOCKEEFY_WALLET' || paymentMethod === 'COMBINED') && walletBalance > 0}
                    onChange={(e) => setUseWallet(e.target.checked)}
                    className="hidden sr-only"
                  />

                  {/* Payment Method Cards */}
                  <div className="space-y-2.5">

                    {/* OPTION A: MOCKEEFY WALLET */}
                    <div
                      onClick={() => {
                        if (walletBalance >= displayPrice) {
                          setUserSelectedPaymentMethod('MOCKEEFY_WALLET');
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all ${
                        walletBalance >= displayPrice
                          ? paymentMethod === 'MOCKEEFY_WALLET'
                            ? "border-[#0755E8] bg-blue-50/50 ring-2 ring-[#0755E8]/20 cursor-pointer shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer"
                          : "border-slate-200 bg-slate-50/70 opacity-75 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="radio"
                            id="payment-method-mockeefy-wallet"
                            name="booking-payment-method-modal"
                            disabled={walletBalance < displayPrice}
                            checked={paymentMethod === 'MOCKEEFY_WALLET'}
                            onChange={() => setUserSelectedPaymentMethod('MOCKEEFY_WALLET')}
                            className="mt-1 w-4 h-4 text-[#0755E8] border-slate-300 focus:ring-[#0755E8] cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center text-[#0755E8] shrink-0 mt-0.5">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Option A</span>
                              <span className="text-xs font-bold text-slate-900">Mockeefy Wallet</span>
                              {walletBalance >= displayPrice ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Full Coverage Available
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  {walletBalance <= 0 ? "Insufficient Mockeefy Wallet Balance (₹0)" : `Insufficient for Full Payment (₹${formatPrice(walletBalance)} / ₹${formatPrice(displayPrice)})`}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                              Pay with Mockeefy Wallet — Use Mockeefy Wallet Balance (Internal credits &amp; expert payouts)
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-slate-900">₹{formatPrice(displayPrice)}</span>
                        </div>
                      </div>

                      {/* Option A Breakdown */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between items-center">
                          <span>Available Mockeefy wallet balance:</span>
                          <span className="font-semibold text-slate-800">₹{formatPrice(walletBalance)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Interview booking price:</span>
                          <span className="font-semibold text-slate-800">₹{formatPrice(displayPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-700 font-semibold">
                          <span>Wallet contribution:</span>
                          <span className="font-bold tabular-nums">
                            {walletBalance >= displayPrice && paymentMethod === 'MOCKEEFY_WALLET' ? `-₹${formatPrice(displayPrice)}` : "₹0"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-slate-900 pt-1 border-t border-slate-200/60">
                          <span>Remaining payable amount:</span>
                          <span className="text-xs font-extrabold text-[#0755E8] tabular-nums">
                            {paymentMethod === 'MOCKEEFY_WALLET' ? "₹0 (Fully Covered)" : `₹${formatPrice(displayPrice)}`}
                          </span>
                        </div>

                        {walletBalance >= displayPrice ? (
                          <p className="text-[10.5px] text-emerald-700 font-semibold pt-1">
                            ✓ Full amount covered by Mockeefy wallet. Instant confirmation without launching Razorpay. Remaining balance: ₹{formatPrice(walletBalance - displayPrice)}.
                          </p>
                        ) : walletBalance > 0 ? (
                          <p className="text-[10.5px] text-amber-700 pt-1">
                            Your wallet balance of ₹{formatPrice(walletBalance)} is insufficient for full payment. Select Combined Payment below or use Razorpay.
                          </p>
                        ) : (
                          <p className="text-[10.5px] text-slate-500 pt-1">
                            Your Mockeefy wallet balance is ₹0. Full payment of ₹{formatPrice(displayPrice)} will be processed via Razorpay.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* COMBINED OPTION: PARTIAL WALLET + RAZORPAY (Visible when 0 < walletBalance < displayPrice) */}
                    {walletBalance > 0 && walletBalance < displayPrice && (
                      <div
                        onClick={() => setUserSelectedPaymentMethod('COMBINED')}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          paymentMethod === 'COMBINED'
                            ? "border-[#0755E8] bg-blue-50/50 ring-2 ring-[#0755E8]/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <input
                              type="radio"
                              id="payment-method-combined"
                              name="booking-payment-method-modal"
                              checked={paymentMethod === 'COMBINED'}
                              onChange={() => setUserSelectedPaymentMethod('COMBINED')}
                              className="mt-1 w-4 h-4 text-[#0755E8] border-slate-300 focus:ring-[#0755E8] cursor-pointer"
                            />
                            <div className="w-7 h-7 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                              <Wallet className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Combined</span>
                                <span className="text-xs font-bold text-slate-900">Partial Wallet + Razorpay</span>
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  Selectable Method
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                                Pay ₹{formatPrice(displayPrice - walletBalance)} via Razorpay + ₹{formatPrice(walletBalance)} Wallet
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-extrabold text-[#0755E8]">₹{formatPrice(displayPrice - walletBalance)} via Razorpay</span>
                          </div>
                        </div>

                        {/* Combined Breakdown */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
                          <div className="flex justify-between items-center">
                            <span>Available Mockeefy wallet balance:</span>
                            <span className="font-semibold text-slate-800">₹{formatPrice(walletBalance)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Interview booking price:</span>
                            <span className="font-semibold text-slate-800">₹{formatPrice(displayPrice)}</span>
                          </div>
                          <div className="flex justify-between items-center text-emerald-700 font-semibold">
                            <span>Mockeefy Wallet contribution:</span>
                            <span className="font-bold tabular-nums">-₹{formatPrice(walletBalance)}</span>
                          </div>
                          <div className="flex justify-between items-center font-bold text-slate-900 pt-1 border-t border-slate-200/60">
                            <span>Remaining payable via Razorpay:</span>
                            <span className="text-xs font-extrabold text-[#0755E8] tabular-nums">
                              ₹{formatPrice(displayPrice - walletBalance)}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-blue-700 font-medium pt-1">
                            ₹{formatPrice(walletBalance)} contributed from wallet. Remaining ₹{formatPrice(displayPrice - walletBalance)} will be collected via Razorpay.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* OPTION B: RAZORPAY */}
                    <div
                      onClick={() => setUserSelectedPaymentMethod('RAZORPAY')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        paymentMethod === 'RAZORPAY'
                          ? "border-[#0755E8] bg-blue-50/50 ring-2 ring-[#0755E8]/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="radio"
                            id="payment-method-razorpay"
                            name="booking-payment-method-modal"
                            checked={paymentMethod === 'RAZORPAY'}
                            onChange={() => setUserSelectedPaymentMethod('RAZORPAY')}
                            className="mt-1 w-4 h-4 text-[#0755E8] border-slate-300 focus:ring-[#0755E8] cursor-pointer"
                          />
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/10 flex items-center justify-center text-[#0755E8] shrink-0 mt-0.5">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Option B</span>
                              <span className="text-xs font-bold text-slate-900">Razorpay</span>
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                UPI, Cards, Netbanking
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                              Pay full booking amount through Razorpay payment gateway
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-slate-900">₹{displayPrice}</span>
                        </div>
                      </div>

                      {/* Razorpay Breakdown */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-600">
                        <div className="flex justify-between items-center">
                          <span>Interview booking price:</span>
                          <span className="font-semibold text-slate-800">₹{displayPrice}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Wallet contribution:</span>
                          <span className="font-semibold text-slate-500">₹0 (Wallet untouched)</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-slate-900 pt-1 border-t border-slate-200/60">
                          <span>Razorpay payable amount:</span>
                          <span className="text-xs font-extrabold text-[#0755E8] tabular-nums">
                            ₹{displayPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-500">
                          <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Supported: UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards, Netbanking &amp; External Wallets</span>
                        </div>
                        {walletBalance > 0 && (
                          <p className="text-[10.5px] text-slate-500 pt-0.5">
                            Your available ₹{formatPrice(walletBalance)} Mockeefy wallet balance will NOT be deducted.
                          </p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL ACTION FOOTER: Allocate Meeting & Book */}
        <div className="p-4 sm:px-6 sm:py-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-[#EAF0F8] hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedSlot || !selectedLevel || isProcessing}
            onClick={handleBooking}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              selectedSlot && selectedLevel && !isProcessing
                ? "bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white cursor-pointer shadow-sm shadow-[#0755E8]/20"
                : "bg-[#E2E8F0] text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {!selectedSlot
                    ? "Select an Available Slot"
                    : !selectedLevel
                    ? "Select one option to continue"
                    : appliedFreePromo
                    ? "Confirm Free Session"
                    : user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)
                    ? `Book with Credit (${user.freeInterviewsCount} left)`
                    : paymentMethod === 'MOCKEEFY_WALLET'
                    ? `Confirm Booking — ₹${formatPrice(displayPrice)} from Mockeefy Wallet`
                    : paymentMethod === 'COMBINED'
                    ? `Pay ₹${formatPrice(displayPrice - walletBalance)} via Razorpay + ₹${formatPrice(walletBalance)} Wallet`
                    : `Confirm & Allocate Meeting — ₹${formatPrice(displayPrice)}`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
