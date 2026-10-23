import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import {
  X, Calendar, Clock, Shield, Check, ArrowRight,
  ChevronLeft, ChevronRight, BadgeCheck, CheckSquare, Square
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
  getKolkataToday,
  getKolkataTimeParts,
  getKolkataDateString,
  getInitialKolkataMonth,
  mapExpertToProfile,
  Profile
} from "../lib/bookSessionUtils";
import { MentorProfile } from "./MentorJobCard";
import { getProfileImageUrl } from "../lib/imageUtils";
import { ConfirmationLoadingModal, BookingFlowState } from "./ConfirmationLoadingModal";
import { showBookingSuccessAlert } from "../lib/bookingSuccessAlert";

export const AVAILABLE_LEVELS = [
  "Rising Mentor",
  "Professional Mentor",
  "Senior Mentor",
  "Elite Mentor",
  "FAANG Mentor",
];

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
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  expertId,
  initialProfile
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
  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialKolkataMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; available: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingFlowState, setBookingFlowState] = useState<BookingFlowState>("selecting");

  // Reset booking flow state to selecting whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setBookingFlowState("selecting");
    }
  }, [isOpen]);

  // Mentor Tier Level Selection (Image 1 style)
  const [selectedLevel, setSelectedLevel] = useState<string>("Rising Mentor");
  const [levelPrices, setLevelPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);

  // Duration & Pricing (default 30m / 60m matching UI image)
  const [sessionDuration, setSessionDuration] = useState<number>(() => {
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

  // Dedicated effect: ALWAYS fetch booked sessions when modal opens or expert/user changes
  useEffect(() => {
    if (!isOpen || !targetExpertId) return;

    let isMounted = true;
    const fetchSessions = async () => {
      try {
        const candidateUserId = user?.id || user?._id || (user as any)?.userId;
        const [expertRes, candidateRes] = await Promise.allSettled([
          axios.get(`/api/sessions/expert/${targetExpertId}`),
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
  }, [isOpen, targetExpertId, user?.id, user?._id, (user as any)?.userId]);

  // Fetch expert details if not provided or incomplete
  useEffect(() => {
    if (!isOpen) return;

    if ((initialProfile as any)?.rawExpert && !profile) {
      setProfile(mapExpertToProfile((initialProfile as any).rawExpert));
    }

    const hasAvailability = Boolean(
      profile?.availability ||
      (initialProfile as any)?.availability ||
      (initialProfile as any)?.rawExpert?.availability
    );

    // If availability is already present, synchronize session duration and skip expert metadata fetching
    if (hasAvailability) {
      const dur =
        profile?.sessionDuration ||
        (initialProfile as any)?.sessionDuration ||
        (initialProfile as any)?.rawExpert?.sessionDuration ||
        (initialProfile as any)?.rawExpert?.availability?.sessionDuration ||
        (initialProfile as any)?.availability?.sessionDuration;
      if (dur) {
        setSessionDuration(dur === 60 ? 60 : 30);
      }
      return;
    }

    const fetchExpert = async () => {
      try {
        setLoading(true);
        let expertData = (initialProfile as any)?.rawExpert || null;
        if (!expertData && targetExpertId) {
          try {
            const res = await axios.get(`/api/expert/public/profile/${targetExpertId}`);
            if (res.data?.success && res.data?.profile) {
              expertData = res.data.profile;
            }
          } catch {
            // Fallback to verified list if public profile not found
          }

          if (!expertData) {
            const res = await axios.get(`/api/expert/verified`);
            const experts = res.data?.data || res.data || [];
            expertData = experts.find(
              (e: any) =>
                (e._id || e.userId || e.id || e.expertID) === targetExpertId
            );
          }
        }

        if (expertData) {
          const mapped = mapExpertToProfile(expertData);
          setProfile(mapped);
          if (mapped.sessionDuration) {
            setSessionDuration(mapped.sessionDuration === 60 ? 60 : 30);
          }
        }
      } catch (err) {
        console.error("Failed to load expert for booking", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExpert();
  }, [isOpen, targetExpertId]);

  // Handle escape key & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Allowed duration options (matches user image: 30 Min & 60 Min)
  const durationOptions = useMemo<number[]>(() => {
    const prof = profile || initialProfile;
    const allowed = (prof as any)?.availability?.allowedDurations;
    if (Array.isArray(allowed) && allowed.length > 0) {
      const filtered = allowed.filter((d: number) => d === 30 || d === 60);
      if (filtered.length > 0) return filtered.sort((a: number, b: number) => a - b);
    }
    return [30, 60];
  }, [profile, initialProfile]);

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

  // Keep selectedLevel strictly within this mentor's supported levels
  useEffect(() => {
    if (expertLevels.length > 0 && !expertLevels.includes(selectedLevel)) {
      setSelectedLevel(expertLevels[0]);
    }
  }, [expertLevels, selectedLevel]);

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

  // Price calculations based on selectedLevel and duration
  const rawPrice = useMemo(() => {
    const key = `${selectedLevel}_${sessionDuration}`;
    if (levelPrices[key] != null) {
      return levelPrices[key];
    }
    if (levelPrices[selectedLevel] != null) {
      return levelPrices[selectedLevel];
    }
    const prof = profile || initialProfile;
    const minVal = (prof as any)?.minPrice ?? (prof as any)?.price;
    const parsedMin = typeof minVal === "number" ? minVal : (parseInt(String(minVal || "").replace(/[^\d]/g, ""), 10) || null);

    // If expert has a defined starting price (e.g. Sudhan ₹2) and current selection is their first tier
    if (selectedLevel === expertLevels[0] && parsedMin != null && parsedMin > 0) {
      return sessionDuration === 30 ? parsedMin : Math.round(parsedMin * 1.8);
    }

    const category = prof?.category || "IT";
    const catDefaults = DEFAULT_CATEGORY_MATRIX[category] || DEFAULT_CATEGORY_MATRIX["IT"];
    const base = catDefaults[selectedLevel] || (parsedMin ?? 499);
    return sessionDuration === 30 ? base : Math.round(base * 1.8);
  }, [levelPrices, selectedLevel, sessionDuration, profile, initialProfile, expertLevels]);

  const displayPrice = useMemo(() => {
    let p = rawPrice;
    if (appliedPromoPercent > 0) {
      p = Math.round(p * (1 - appliedPromoPercent / 100));
    }
    return p;
  }, [rawPrice, appliedPromoPercent]);

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

  const isContentLoading = loading && !activeAvailability;

  // Dates for current month
  const dates = useMemo(() => {
    if (!activeAvailability) return [];

    const parts = getKolkataTimeParts(currentMonth);
    const year = parts.year;
    const month = parts.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allDates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const today = getKolkataToday();
    const weekly = activeAvailability.weekly || {};
    const breakDates = activeAvailability.breakDates || [];

    const activeDays = Object.keys(weekly).filter(day => {
      const slots = weekly[day];
      return Array.isArray(slots) && slots.length > 0;
    }).map(d => d.toLowerCase());

    return allDates.filter(date => {
      const kolkataDateStr = getKolkataDateString(date);
      const isBreakDate = breakDates.some((breakDate: any) => getKolkataDateString(breakDate.start) === kolkataDateStr);
      if (isBreakDate) return false;

      if (date >= today || date.getMonth() > today.getMonth() || date.getFullYear() > today.getFullYear()) {
        if (activeDays.length > 0) {
          const dayShort = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).toLowerCase();
          const dayLong = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).toLowerCase();
          if (!activeDays.includes(dayShort) && !activeDays.includes(dayLong)) {
            return false;
          }
        }
        return true;
      }
      return false;
    });
  }, [currentMonth, activeAvailability]);

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
    }
  }, [dates, selectedDateStr]);

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
    const date = activeDate;
    const kolkataDateStr = getKolkataDateString(date);

    const isBreakDate = (activeAvailability.breakDates || []).some((b: any) => getKolkataDateString(b.start) === kolkataDateStr);
    if (isBreakDate) return [];

    const weekly = activeAvailability.weekly || {};
    const dayShort = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).toLowerCase();
    const dayLong = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).toLowerCase();

    const availableKey = Object.keys(weekly).find(key => {
      const k = key.toLowerCase();
      return k === dayShort || k === dayLong;
    });

    const weeklyRanges = availableKey ? weekly[availableKey] : [];
    if (!weeklyRanges || weeklyRanges.length === 0) return [];

    const parseTimeToMinutes = (timeStr: string) => {
      const parts = timeStr.split(":");
      if (parts.length < 2) return 0;
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };

    const formatMinutesToTime = (totalMinutes: number) => {
      const adjusted = totalMinutes % (24 * 60);
      const hours = Math.floor(adjusted / 60);
      const minutes = adjusted % 60;
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
    };

    const formatMinutesToHHMM = (totalMinutes: number) => {
      const adjusted = totalMinutes % (24 * 60);
      return `${Math.floor(adjusted / 60).toString().padStart(2, "0")}:${(adjusted % 60).toString().padStart(2, "0")}`;
    };

    const generatedSlots: { time: string; startMinutes: number; available: boolean }[] = [];
    const duration = Number(sessionDuration);
    const step = duration;

    // Sort ranges by start time
    const sortedRanges = [...weeklyRanges].sort((a: any, b: any) => parseTimeToMinutes(a.from) - parseTimeToMinutes(b.from));

    sortedRanges.forEach((range: { from: string; to: string }) => {
      if (!range.from || !range.to) return;
      let currentMinutes = parseTimeToMinutes(range.from);
      let endMinutes = parseTimeToMinutes(range.to);
      if (endMinutes < currentMinutes) endMinutes += 24 * 60;

      // Snap start time to solid 30-minute block boundaries
      if (currentMinutes % 30 !== 0) {
        currentMinutes = Math.ceil(currentMinutes / 30) * 30;
      }

      while (currentMinutes + duration <= endMinutes) {
        const nowKolkata = getKolkataTimeParts();
        const isToday = kolkataDateStr === getKolkataDateString(new Date());
        const currentTimeMinutes = nowKolkata.hours * 60 + nowKolkata.minutes;

        if (isToday && currentMinutes < currentTimeMinutes) {
          currentMinutes += step;
          continue;
        }

        // Prevent overlapping with any slot already generated
        const overlapsWithExisting = generatedSlots.some(s => 
          currentMinutes < s.startMinutes + duration && (currentMinutes + duration) > s.startMinutes
        );
        if (overlapsWithExisting) {
          currentMinutes += step;
          continue;
        }

        const slotStartStr = formatMinutesToHHMM(currentMinutes);
        const slotEndStr = formatMinutesToHHMM(currentMinutes + duration);
        const slotDate = new Date(`${kolkataDateStr}T${slotStartStr}:00+05:30`);
        const slotEndDate = new Date(`${kolkataDateStr}T${slotEndStr}:00+05:30`);

        const isBooked = bookedSessions.some((session) => {
          const status = (session.status || "").toLowerCase();
          if (status === "cancelled") return false;

          const sStart = new Date(session.startTime);
          const sEnd = new Date(session.endTime);
          if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) return false;

          const startMatches = getKolkataDateString(sStart) === kolkataDateStr;
          const endMatches = getKolkataDateString(sEnd) === kolkataDateStr;
          if (!startMatches && !endMatches) return false;

          return slotDate.getTime() < sEnd.getTime() && slotEndDate.getTime() > sStart.getTime();
        });

        // If the slot is already booked, omit it completely so it is removed from available slots for all users
        if (isBooked) {
          currentMinutes += step;
          continue;
        }

        const slotStart = formatMinutesToTime(currentMinutes);
        const slotEnd = formatMinutesToTime(currentMinutes + duration);
        const timeStr = `${slotStart} - ${slotEnd}`;

        const existing = generatedSlots.find(s => s.time === timeStr);
        if (!existing) {
          generatedSlots.push({ time: timeStr, startMinutes: currentMinutes, available: true });
        }
        currentMinutes += step;
      }
    });

    return generatedSlots.sort((a, b) => a.startMinutes - b.startMinutes);
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

    const startTime = new Date(`${kolkataDateStr}T${parseToHHMM(startRaw)}:00+05:30`).toISOString();
    const endTime = new Date(`${kolkataDateStr}T${parseToHHMM(endRaw)}:00+05:30`).toISOString();

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

  const handleBooking = async () => {
    if (!selectedSlot) return;

    if (!user) {
      Swal.fire({
        title: "Login Required",
        text: "Please sign in to complete your booking.",
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

    const payload = buildPayload();
    if (!payload) return;

    const formattedBookingDate = activeDate?.toLocaleDateString("en-US", {
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

      // 3. User notification: Toast
      toast.success(`Meeting Scheduled! Your meeting has been scheduled on ${formattedBookingDate} at ${selectedTimeSlot}.`);

      // 4. Mark confirmed, close modal, and navigate to /my-sessions
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

      // 3. Paid standard checkout via Razorpay modal
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay payment gateway failed to load. Please check your internet connection.");
      }

      const orderResponse = await axios.post("/api/payment/create-order", {
        amount: displayPrice,
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
              paymentType: "booking",
              user: user,
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

  if (!isOpen || bookingFlowState === "confirmed" || typeof document === "undefined") return null;

  if (bookingFlowState === "confirming" || bookingFlowState === "payment_processing") {
    return (
      <ConfirmationLoadingModal
        expertName={expertDisplayName}
        isConfirming={bookingFlowState === "confirming"}
      />
    );
  }

  if (isContentLoading) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl my-auto">
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
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
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
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight truncate">
                {expertDisplayName}
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium truncate mt-0.5">
                {expertRole} • <span className="text-[#0755E8] font-bold">₹{displayPrice} ({sessionDuration}m)</span>
              </p>
              {expertLevels.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                  {expertLevels.map((lvl) => {
                    const isSelected = selectedLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevel(lvl)}
                        className={`text-xs font-semibold px-3 sm:px-3.5 py-1 rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0755E8] text-white border-[#0755E8] shadow-xs"
                            : "text-[#0755E8] bg-[#EBF3FF] border-[#BFD7FE] hover:bg-blue-100/70"
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              )}
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
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-4.5 space-y-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                <div className="w-full py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No availability dates configured for this month.
                </div>
              )}
            </div>
          )}

          {/* 4. AVAILABLE SLOTS FOR Header with Badge */}
          <div className="flex items-center justify-between mb-2 pt-2 border-t border-slate-100">
            {isContentLoading ? (
              <div className="h-4 w-44 bg-slate-200/80 rounded animate-pulse" />
            ) : (
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                AVAILABLE SLOTS FOR {activeDate ? activeDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase() : ""}
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

          {/* 5. Time Slots Grid OR Empty State Box */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 max-h-[220px] overflow-y-auto p-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
              <p className="text-sm font-bold text-slate-800">No time slots available on this day</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {expertDisplayName} has no remaining openings for this date. Please select another date from the carousel above.
              </p>
            </div>
          )}

          {/* 6. Selected Slot Summary Bar & Optional Promo */}
          {selectedSlot && (
            <div className="border-t border-slate-100 pt-4 mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-950 truncate">
                    {activeDate?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {selectedSlot.time} ({sessionDuration}m)
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
            disabled={!selectedSlot || isProcessing}
            onClick={handleBooking}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              selectedSlot && !isProcessing
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
                    : appliedFreePromo
                    ? "Confirm Free Session"
                    : user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)
                    ? `Book with Credit (${user.freeInterviewsCount} left)`
                    : `Confirm & Allocate Meeting — ₹${displayPrice}`}
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
