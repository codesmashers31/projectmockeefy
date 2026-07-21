import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from '../lib/axios';
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Star, Clock, Calendar, CheckCircle, Shield, Video,
  ChevronLeft, ChevronRight, ChevronDown, X, ThumbsUp, MessageCircle, Briefcase,
  Share2, Check, ArrowRight, Timer, BadgeCheck
} from "lucide-react";
import Swal from "sweetalert2";
import Navigation from "./Navigation";
import Footer from "./Footer";
import { mapExpertToProfile, Profile } from "../lib/bookSessionUtils";

/**
 * Enhanced Skeleton Loader matching the LinkedIn-style design
 */
const BookSessionSkeleton = () => (
  <div className="min-h-screen bg-white pb-10">
    <Navigation />
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-7">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-8 space-y-6">
        {/* Profile Header Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-48 bg-gray-200"></div>
          <div className="px-6 pb-6 relative">
            <div className="absolute -top-16 left-6 w-32 h-32 rounded-full border-4 border-white bg-gray-100 shadow-sm"></div>
            <div className="mt-20 space-y-3">
              <div className="h-8 bg-gray-200 w-64 rounded-lg"></div>
              <div className="h-4 bg-gray-200 w-96 rounded"></div>
              <div className="h-4 bg-gray-200 w-48 rounded"></div>
            </div>
            <div className="mt-6 flex gap-3">
              <div className="h-10 bg-gray-200 w-32 rounded-full"></div>
              <div className="h-10 bg-gray-200 w-32 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Details Content Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="h-6 bg-gray-200 w-48 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-50 rounded"></div>
            <div className="h-4 w-full bg-gray-50 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-50 rounded"></div>
          </div>
        </div>
      </div>

        {/* Right column placeholder so layout feels consistent */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="h-6 bg-gray-200 w-2/3 rounded mb-6"></div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg"></div>
              ))}
            </div>
            <div className="mt-8 h-12 bg-gray-200 w-full rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

type PremiumSelectOption = {
  value: string;
  label: string;
};

function PremiumSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: PremiumSelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value) || options[0];
  const isDisabled = options.length <= 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 bg-white border-[1.5px] rounded-xl px-3.5 py-3 text-left transition-all ${
          isDisabled
            ? "cursor-default border-[#E3E8F5] text-[#5A6284]"
            : open
              ? "border-[#2F5FFF] cursor-pointer"
              : "border-[#E3E8F5] hover:border-[#B9CBF5] cursor-pointer"
        }`}
      >
        <div className="min-w-0">
          <p className="text-[13.5px] font-extrabold text-[#141A33] truncate">{selected?.label || "Select option"}</p>
        </div>
        {!isDisabled && (
          <ChevronDown size={15} className={`text-[#5A6284] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && !isDisabled && (
        <div className="absolute z-30 mt-1.5 w-full min-w-full rounded-[14px] border border-[#EAEEF7] bg-white shadow-[0_16px_34px_-14px_rgba(20,26,51,.3)] p-1.5 max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-4 px-3 py-2.5 rounded-[10px] text-left transition-colors ${
                  isActive ? "bg-[#F0F5FF] text-[#2F5FFF]" : "hover:bg-[#F5F7FC] text-[#141A33]"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-extrabold truncate">{option.label}</p>
                </div>
                {isActive ? <Check className="w-3.5 h-3.5 shrink-0 text-[#2F5FFF]" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const BookSessionPage = () => {
  type SessionDuration = 30 | 60;
  const isSessionDuration = (d: unknown): d is SessionDuration => d === 30 || d === 60;

  const [discountCode, setDiscountCode] = useState("");
  const [appliedFreePromo, setAppliedFreePromo] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile: existingProfile, expertId: stateExpertId, price: overridePrice } = location.state || {};
  const queryExpertId = searchParams.get("expertId");

  const expertId = stateExpertId || existingProfile?.id || queryExpertId;

  // React Query: Fetch specific expert profile by ID (cached, public endpoint)
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
    staleTime: 0,
    refetchOnMount: "always",
  });

  const loading = isQueryLoading && !profile;

  const sessionPrice = overridePrice ? overridePrice : (profile?.price || 0);

  // Computed allowed durations options
  const durationOptions = useMemo<SessionDuration[]>(() => {
    const prof = profile || existingProfile;
    const allowed = prof?.availability?.allowedDurations;
    const allowedSet = new Set<SessionDuration>(
      Array.isArray(allowed) ? allowed.filter(isSessionDuration) : []
    );

    // If allowedSet is empty, fallback to sessionDuration or [30]
    if (allowedSet.size === 0) {
      const single = prof?.availability?.sessionDuration;
      if (isSessionDuration(single)) allowedSet.add(single);
      else allowedSet.add(30);
    }

    const weekly = prof?.availability?.weekly || {};
    const configuredDurations = new Set<SessionDuration>();

    Object.values(weekly).forEach((slots: any) => {
      if (Array.isArray(slots)) {
        slots.forEach((slot: any) => {
          if (slot.from && slot.to) {
            const fromParts = slot.from.split(':');
            const toParts = slot.to.split(':');
            if (fromParts.length >= 2 && toParts.length >= 2) {
              const fromMin = parseInt(fromParts[0], 10) * 60 + parseInt(fromParts[1], 10);
              let toMin = parseInt(toParts[0], 10) * 60 + parseInt(toParts[1], 10);
              if (toMin < fromMin) {
                toMin += 24 * 60;
              }
              const diff = toMin - fromMin;
              if (diff === 30 || diff === 60) {
                configuredDurations.add(diff as SessionDuration);
              }
            }
          }
        });
      }
    });

    // If the expert has configured weekly slots, intersect with configuredDurations
    // so we only show durations that actually have slots.
    const finalDurations = Array.from(allowedSet).filter(d => 
      configuredDurations.size === 0 || configuredDurations.has(d)
    );

    if (finalDurations.length > 0) return finalDurations.sort((a, b) => a - b);
    return [30];
  }, [profile?.availability?.allowedDurations, profile?.availability?.sessionDuration, profile?.availability?.weekly, existingProfile]);

  // Initial duration based on state profile or first load to avoid jumps
  const initialDuration = useMemo<SessionDuration>(() => {
    return durationOptions[0] || 30;
  }, [durationOptions]);

  const [sessionDuration, setSessionDuration] = useState<SessionDuration>(initialDuration);

  // Skill (for pricing): expert's skills only
  const skillOptions = useMemo(() => {
    const prof = profile || existingProfile;
    return prof?.skills?.length ? prof.skills : (prof?.category ? [prof.category] : ["General"]);
  }, [profile?.skills, profile?.category, existingProfile]);

  const [selectedSkill, setSelectedSkill] = useState<string>(() => skillOptions[0] || "General");
  const [expertLevel, setExpertLevel] = useState(() => existingProfile?.levels?.[0] || existingProfile?.level || "Rising Mentor");

  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

  const skillSelectOptions = useMemo<PremiumSelectOption[]>(
    () => skillOptions.map((skill) => ({ value: skill, label: skill })),
    [skillOptions]
  );
  const durationSelectOptions = useMemo<PremiumSelectOption[]>(
    () =>
      durationOptions.map((duration) => ({
        value: String(duration),
        label: `${duration} Minutes`,
      })),
    [durationOptions]
  );

  const levelOptions = useMemo(() => {
    const prof = profile || existingProfile;
    return prof?.levels && prof.levels.length > 0
      ? prof.levels
      : [prof?.level || "Rising Mentor"];
  }, [profile?.levels, profile?.level, existingProfile]);

  const levelSelectOptions = useMemo<PremiumSelectOption[]>(
    () =>
      (levelOptions || []).map((lvl) => ({
        value: lvl,
        label: lvl,
      })),
    [levelOptions]
  );

  // Synchronize expert Level selection when profile options change
  useEffect(() => {
    if (levelOptions.length > 0 && !levelOptions.includes(expertLevel)) {
      setExpertLevel(levelOptions[0]);
    }
  }, [levelOptions, expertLevel]);

  // Synchronize Skill selection when profile options change
  useEffect(() => {
    if (skillOptions.length > 0 && !skillOptions.includes(selectedSkill)) {
      setSelectedSkill(skillOptions[0]);
    }
  }, [skillOptions, selectedSkill]);

  // Synchronize Session Duration when profile options change
  useEffect(() => {
    const prof = profile || existingProfile;
    if (prof) {
      const allowed = prof.availability?.allowedDurations;
      const valid = Array.isArray(allowed) ? allowed.filter(isSessionDuration) : [];
      const defaultDur = valid.length > 0 ? valid[0] : (isSessionDuration(prof.availability?.sessionDuration) ? prof.availability.sessionDuration : 30);
      if (!durationOptions.includes(sessionDuration)) {
        setSessionDuration(defaultDur);
      }
    }
  }, [profile, existingProfile, durationOptions, sessionDuration]);
  const [errorValue, setErrorValue] = useState<string | null>(null);

  useEffect(() => {
    if (queryError) {
      setErrorValue((queryError as any)?.message || "Failed to load expert data");
    }
  }, [queryError]);

  // Price is category-based only (expert's category + level + duration). No skill.
  useEffect(() => {
    const fetchPrice = async () => {
      if (!profile?.id || ![30, 60].includes(sessionDuration)) {
        setCalculatedPrice(0);
        return;
      }
      try {
        const res = await axios.get("/api/pricing/calculate-price", {
          params: { expertId: profile.id, duration: sessionDuration, level: expertLevel }
        });
        if (res.data?.finalPrice != null) {
          setCalculatedPrice(res.data.finalPrice);
        } else {
          setCalculatedPrice(0);
        }
      } catch (err) {
        console.error("Pricing fetch failed", err);
        setCalculatedPrice(0);
      }
    };
    fetchPrice();
  }, [profile?.id, sessionDuration, expertLevel]);


  const getKolkataTimeParts = (d: Date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    return {
      year: getPart('year'),
      month: getPart('month') - 1, // 0-indexed
      day: getPart('day'),
      hours: getPart('hour'),
      minutes: getPart('minute'),
      seconds: getPart('second')
    };
  };

  const getKolkataDateString = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return '';
    
    // Explicitly format in India timezone (Kolkata)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(dateObj);
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    
    return `${year}-${month}-${day}`;
  };

  const getKolkataToday = () => {
    const parts = getKolkataTimeParts();
    return new Date(parts.year, parts.month, parts.day);
  };

  const getInitialKolkataMonth = () => {
    const parts = getKolkataTimeParts();
    return new Date(parts.year, parts.month, 1);
  };

  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialKolkataMonth);
  const [selectedDate, setSelectedDate] = useState(0); // Default to first available date (Today)
  // Better: selectedDate as index is tricky with switching months. 
  // Let's keep selectedDate as index of 'dates' array but reset it on month change.

  const [selectedSlot, setSelectedSlot] = useState<{ time: string; available: boolean } | null>(null);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const [showMobileBooking, setShowMobileBooking] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [expertAvatarError, setExpertAvatarError] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Scroll active date into view horizontally on mount or when navigation drawer opens (without scrolling the window vertically)
  useEffect(() => {
    if (carouselRef.current) {
      const activeBtn = carouselRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        const container = carouselRef.current;
        const leftPos = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2);
        container.scrollTo({
          left: leftPos,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedDate, showMobileBooking]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const getShareUrl = () => {
    const id = expertId || profile?.id || "";
    if (typeof window === "undefined") return `/book-session?expertId=${encodeURIComponent(id)}`;
    return `${window.location.origin}/book-session?expertId=${encodeURIComponent(id)}`;
  };

  const handleShare = (platform: "whatsapp" | "linkedin" | "x" | "facebook" | "telegram" | "email" | "copy" | "native") => {
    const shareUrl = getShareUrl();
    const text = `Book a mock interview with ${profile?.name || "expert"} on Mockeefy`;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(shareUrl);

    const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

    if (platform === "native") {
      if (navigator.share) {
        navigator.share({ title: "Mockeefy Expert Booking", text, url: shareUrl }).catch(() => {});
      } else {
        handleShare("copy");
      }
      return;
    }

    switch (platform) {
      case "whatsapp":
        open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`);
        break;
      case "linkedin":
        open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`);
        break;
      case "x":
        open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
        break;
      case "facebook":
        open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
        break;
      case "telegram":
        open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`);
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent("Mock Interview Booking")}&body=${encodedText}%0A${encodedUrl}`;
        break;
      case "copy":
      default:
        navigator.clipboard.writeText(shareUrl);
        Swal.fire({ title: "Copied", text: "Booking link copied to clipboard.", icon: "success", timer: 1800, showConfirmButton: false });
        break;
    }
    setIsShareMenuOpen(false);
  };

  // Reviews
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

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (expertId) {
      const fetchSessions = async () => {
        try {
          const res = await axios.get(`/api/sessions/expert/${expertId}`);
          if (Array.isArray(res.data)) {
            setBookedSessions(res.data);
          }
        } catch (err) {
          console.error("Failed to fetch booked sessions", err);
        }
      };
      fetchSessions();

      const fetchReviews = async () => {
        try {
          setReviewsLoading(true);
          const response = await axios.get(`/api/reviews/expert/${expertId}`);
          if (response.data.success) {
            const formattedReviews = response.data.data.map((r: any) => ({
              ...r,
              date: new Date(r.date).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })
            }));
            setReviews(formattedReviews);
          }
        } catch (error) {
          console.error("Failed to fetch reviews", error);
        } finally {
          setReviewsLoading(false);
        }
      };
      fetchReviews();
    }
  }, [expertId]);

  const dates = useMemo(() => {
    const parts = getKolkataTimeParts(currentMonth);
    const year = parts.year;
    const month = parts.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allDates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

    // Filter out past dates for the current month (Kolkata time)
    const today = getKolkataToday();
    const weekly = profile?.availability?.weekly || {};
    const breakDates = profile?.availability?.breakDates || [];

    // Find all days of the week (e.g., 'friday', 'mon') that have at least one slot configured
    const activeDays = Object.keys(weekly).filter(day => {
      const slots = weekly[day];
      return Array.isArray(slots) && slots.length > 0;
    }).map(d => d.toLowerCase());

    return allDates.filter(date => {
      const kolkataDateStr = getKolkataDateString(date); // "YYYY-MM-DD"
      const isBreakDate = breakDates.some((breakDate: any) => {
        return getKolkataDateString(breakDate.start) === kolkataDateStr;
      });
      if (isBreakDate) return false;

      // Compare calendar dates safely using Kolkata year/month
      if (date.getMonth() > today.getMonth() || date.getFullYear() > today.getFullYear()) {
        if (activeDays.length > 0) {
          const dayShort = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).toLowerCase();
          const dayLong = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).toLowerCase();
          if (!activeDays.includes(dayShort) && !activeDays.includes(dayLong)) {
            return false;
          }
        }
        return true;
      }

      if (date >= today) {
        if (activeDays.length > 0) {
          const dayShort = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).toLowerCase();
          const dayLong = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).toLowerCase();
          if (!activeDays.includes(dayShort) && !activeDays.includes(dayLong)) {
            return false;
          }
        }
        return true;
      }
      return false;
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
    // Allow going back only if it's same month or future in Kolkata
    if (prev.getMonth() < todayKolkata.getMonth() && prev.getFullYear() <= todayKolkata.getFullYear()) {
      setCurrentMonth(getInitialKolkataMonth()); // Reset to today's month in Kolkata
    } else {
      setCurrentMonth(prev);
    }
    setSelectedDate(0);
    setSelectedSlot(null);
  };


  const getAvailableSlots = (dateIndex: number) => {
    if (!profile?.availability) return [];

    const date = dates[dateIndex];
    if (!date) return [];

    const kolkataDateStr = getKolkataDateString(date); // "YYYY-MM-DD"

    const isBreakDate = (profile.availability.breakDates || []).some((breakDate: any) => {
      return getKolkataDateString(breakDate.start) === kolkataDateStr;
    });

    if (isBreakDate) return [];

    // Robust Day Matching (mon, Mon, Monday, etc.) in Asia/Kolkata timezone
    const weekly = profile.availability.weekly || {};
    const dayShort = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).toLowerCase(); // mon
    const dayLong = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).toLowerCase();   // monday

    const availableKey = Object.keys(weekly).find(key => {
      const k = key.toLowerCase();
      return k === dayShort || k === dayLong;
    });

    const weeklyRanges = availableKey ? weekly[availableKey] : [];

    if (!weeklyRanges || weeklyRanges.length === 0) return [];

    const parseTimeToMinutes = (timeStr: string) => {
      const parts = timeStr.split(':');
      if (parts.length < 2) return 0;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      return hours * 60 + minutes;
    };

    const formatMinutesToTime = (totalMinutes: number) => {
      const adjustedMinutes = totalMinutes % (24 * 60);
      const hours = Math.floor(adjustedMinutes / 60);
      const minutes = adjustedMinutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const formatMinutesToHHMM = (totalMinutes: number) => {
      const adjusted = totalMinutes % (24 * 60);
      const hours = Math.floor(adjusted / 60);
      const minutes = adjusted % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    const generatedSlots: { time: string; available: boolean }[] = [];
    const duration = Number(sessionDuration);
    // Step by sessionDuration so we get clean, non-overlapping slots (e.g. 09:00 - 10:00, 10:00 - 11:00)
    const SLOT_STEP_MINUTES = duration;

    weeklyRanges.forEach((range: { from: string; to: string }) => {
      if (!range.from || !range.to) return;

      let currentMinutes = parseTimeToMinutes(range.from);
      let endMinutes = parseTimeToMinutes(range.to);

      if (endMinutes < currentMinutes) {
        endMinutes += 24 * 60;
      }

      const rangeDuration = endMinutes - currentMinutes;
      if (rangeDuration !== duration) return;

      while (currentMinutes + duration <= endMinutes) {
        const nowKolkata = getKolkataTimeParts();
        const todayKolkataStr = getKolkataDateString(new Date());
        const isToday = kolkataDateStr === todayKolkataStr;
        const currentTimeMinutes = nowKolkata.hours * 60 + nowKolkata.minutes;

        // Only hide slots whose start time has already passed (today in Kolkata)
        if (isToday && currentMinutes < currentTimeMinutes) {
          currentMinutes += SLOT_STEP_MINUTES;
          continue;
        }

        const slotStartStr = formatMinutesToHHMM(currentMinutes);
        const slotEndStr = formatMinutesToHHMM(currentMinutes + duration);

        // Build exact slot boundary Dates using Asia/Kolkata offset (+05:30)
        const slotDate = new Date(`${kolkataDateStr}T${slotStartStr}:00+05:30`);
        const slotEndDate = new Date(`${kolkataDateStr}T${slotEndStr}:00+05:30`);

        // Only mark booked if a confirmed session overlaps this exact slot
        const isBooked = bookedSessions.some(session => {
          if (session.status === 'cancelled') return false;
          const sStart = new Date(session.startTime);
          const sEnd = new Date(session.endTime);
          if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) return false;
          // Same calendar day only (India timezone)
          if (getKolkataDateString(sStart) !== kolkataDateStr) return false;
          return slotDate < sEnd && slotEndDate > sStart;
        });

        const slotStart = formatMinutesToTime(currentMinutes);
        const slotEnd = formatMinutesToTime(currentMinutes + duration);
        const timeStr = `${slotStart} - ${slotEnd}`;
        const available = !isBooked;

        const existing = generatedSlots.find(s => s.time === timeStr);
        if (existing) {
          existing.available = existing.available || available;
        } else {
          generatedSlots.push({ time: timeStr, available });
        }
        currentMinutes += SLOT_STEP_MINUTES;
      }
    });

    return generatedSlots.sort((a, b) => a.time.localeCompare(b.time));
  };

  const currentSlots = getAvailableSlots(selectedDate);

  const handlePremiumCreditBooking = async () => {
    if (!profile || !selectedSlot) return;
    
    const payload = buildFreeBookingPayload();
    if (!payload) return;

    try {
      setIsProcessing(true);
      const res = await axios.post("/api/payment/use-premium-credit", { bookingDetails: payload });
      if (res.data?.success) {
        Swal.fire({
          title: "Booked with Credit!",
          text: `Session confirmed. You have ${res.data.remainingCredits} credits left.`,
          icon: "success",
          confirmButtonColor: "#004fcb",
        }).then(() => navigate("/my-sessions"));
      }
    } catch (err: any) {
      Swal.fire({ title: "Error", text: err.response?.data?.message || "Failed to book with credit.", icon: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const showPaymentPage = () => {
    if (!profile) return;
    navigate("/payment", {
      state: {
        bookingDetails: {
          expertId: expertId,
          expertName: profile.name,
          expertRole: profile.role,
          date: dates[selectedDate],
          slot: selectedSlot,
          price: displayPrice,
          duration: sessionDuration,
          category: profile.category,
          level: expertLevel,
          skill: selectedSkill,
          topics: [selectedSkill]
        }
      }
    });
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const buildFreeBookingPayload = () => {
    const dateStr = dates[selectedDate];
    const slot = selectedSlot;
    if (!dateStr || !slot?.time) return null;

    const kolkataDateStr = getKolkataDateString(dateStr); // e.g. "2026-06-30"
    const timeParts = slot.time.split(/\s*[-–]\s*/);
    const startStr = timeParts[0]; // e.g. "09:00 AM"
    
    // Parse time and period
    const [time, period] = startStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');

    // Create correct Date objects using India timezone offset (+05:30)
    const startKolkata = new Date(`${kolkataDateStr}T${hh}:${mm}:00+05:30`);
    const endKolkata = new Date(startKolkata.getTime() + (sessionDuration || 60) * 60000);

    return {
      expertId,
      candidateId: user?.id || user?.userId || (user as any)?._id,
      startTime: startKolkata.toISOString(),
      endTime: endKolkata.toISOString(),
      topics: [selectedSkill],
      duration: sessionDuration,
      skill: selectedSkill,
      category: profile?.category,
      notes: appliedFreePromo 
        ? `Booked with promo code: ${discountCode.trim().toUpperCase()}` 
        : "Booked with free promo code",
    };
  };

  const handleFreeBooking = async () => {
    if (!appliedFreePromo || !selectedSlot || !profile) return;
    const payload = buildFreeBookingPayload();
    if (!payload?.candidateId) {
      Swal.fire({ title: "Login required", text: "Please sign in to book a session.", icon: "warning" });
      return;
    }
    if (!payload) {
      Swal.fire({ title: "Error", text: "Invalid date or slot.", icon: "error" });
      return;
    }
    try {
      const res = await axios.post("/api/payment/create-free-booking", { bookingDetails: payload });
      if (res.data?.success) {
        Swal.fire({
          title: "Booked!",
          text: "Your free session has been confirmed. Check My Sessions for details.",
          icon: "success",
          confirmButtonColor: "#004fcb",
        }).then(() => navigate("/my-sessions"));
      } else {
        throw new Error(res.data?.message || "Booking failed");
      }
    } catch (err: any) {
      Swal.fire({ title: "Error", text: err.message || "Failed to confirm free booking.", icon: "error" });
    }
  };

  const handleApplyPromo = () => {
    const code = discountCode.trim().toUpperCase();
    if (code === "FREEMU001") {
      setAppliedFreePromo(true);
      Swal.fire({ title: "Applied!", text: "Free session — no payment required. Click Confirm & Book to complete.", icon: "success", timer: 2500 });
    } else {
      Swal.fire({ title: "Invalid", text: "Code not found.", icon: "error" });
    }
  };

  if (!expertId) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <BookSessionSkeleton />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{errorValue || "Profile Not Found"}</h2>
          <button
            onClick={() => navigate("/book-session")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Derived display data for the new design
  const ratingDist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating) === star).length;
    const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
    return { star, pct };
  });
  const sessionsTaken = bookedSessions.filter((s) => s.status !== "cancelled").length;
  const expertInitials = (profile.name || "EX").trim().substring(0, 2).toUpperCase();
  const firstName = profile.name.split(" ")[0];

  const parsePriceToNumber = (value: unknown): number | null => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;
    // Accept formats like "₹700/hr", "700", "700.00", "INR 700"
    const match = value.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
    if (!match?.[1]) return null;
    const num = Number(match[1]);
    return Number.isFinite(num) ? num : null;
  };

  // Single source for price display — avoids double rupee symbol and handles string prices like "₹700/hr"
  const basePrice = parsePriceToNumber(sessionPrice) ?? 0;
  const displayPrice = calculatedPrice || basePrice;
  const formatPrice = (amount: number | null | undefined) => {
    if (amount == null || !Number.isFinite(amount)) return "—";
    return `₹${amount}`;
  };

  // Hero card — Expert Detail design
  const ProfileHeader = () => (
    <div className="bg-white rounded-[22px] border border-[#EDF1FB] overflow-hidden shadow-[0_10px_24px_-18px_rgba(20,26,51,.18)]">
      {/* Gradient banner */}
      <div
        className="relative h-[112px]"
        style={{ background: "linear-gradient(110deg,#0E1B4D 0%,#1E3FCC 58%,#2F5FFF 100%)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 1px,transparent 1px 26px),radial-gradient(circle at 85% 0%,rgba(255,255,255,.16),transparent 45%)",
          }}
        />
        <div className="absolute top-3.5 right-3.5 flex gap-2" ref={shareMenuRef}>
          <span className="inline-flex items-center gap-[7px] bg-white/15 border border-white/25 text-white text-[11.5px] font-extrabold px-3.5 py-[7px] rounded-full backdrop-blur whitespace-nowrap">
            {profile.category} Interview Mentor
          </span>
          <button
            type="button"
            onClick={() => setIsShareMenuOpen((v) => !v)}
            className="w-[34px] h-[34px] rounded-full bg-white/15 border border-white/25 flex items-center justify-center cursor-pointer text-white backdrop-blur focus:outline-none"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {isShareMenuOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white border border-[#EAEEF7] rounded-[14px] shadow-[0_16px_34px_-14px_rgba(20,26,51,.3)] p-1.5 z-30">
              <button onClick={() => handleShare("native")} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[#F5F7FC] text-[13.5px] font-bold text-[#141A33]">Share...</button>
              <button onClick={() => handleShare("whatsapp")} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[#F5F7FC] text-[13.5px] font-bold text-[#141A33]">WhatsApp</button>
              <button onClick={() => handleShare("linkedin")} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[#F5F7FC] text-[13.5px] font-bold text-[#141A33]">LinkedIn</button>
              <button onClick={() => handleShare("x")} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[#F5F7FC] text-[13.5px] font-bold text-[#141A33]">X (Twitter)</button>
              <button onClick={() => handleShare("facebook")} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[#F5F7FC] text-[13.5px] font-bold text-[#141A33]">Facebook</button>
              <button onClick={() => handleShare("telegram")} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[#F5F7FC] text-[13.5px] font-bold text-[#141A33]">Telegram</button>
              <button onClick={() => handleShare("email")} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[#F5F7FC] text-[13.5px] font-bold text-[#141A33]">Email</button>
              <button onClick={() => handleShare("copy")} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[#F5F7FC] text-[13.5px] font-bold text-[#141A33]">Copy link</button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 sm:px-7 pb-[22px]">
        {/* Avatar + chips row */}
        <div className="flex items-end justify-between gap-4 flex-wrap -mt-10">
          <div className="relative w-[88px] h-[88px] rounded-full bg-white p-1 box-border shadow-[0_8px_20px_-10px_rgba(20,26,51,.35)]">
            {profile.avatar && !profile.avatar.includes("mockeefy.png") && !profile.avatar.includes("default-avatar.png") && !expertAvatarError ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover"
                onError={() => setExpertAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#EEF2FF] text-[#2F5FFF] flex items-center justify-center text-[27px] font-bold uppercase">
                {expertInitials}
              </div>
            )}
            <div className="absolute bottom-[5px] right-[5px] w-[15px] h-[15px] rounded-full bg-[#22C55E] border-[3px] border-white" />
          </div>
          <div className="flex gap-2 flex-wrap pb-1">
            <span className="inline-flex items-center gap-[7px] bg-white text-[#33395B] border-[1.5px] border-[#E3E8F5] text-[12.5px] font-bold px-[15px] py-[7px] rounded-full whitespace-nowrap">
              <Briefcase className="w-[13px] h-[13px] text-[#2F5FFF]" />
              {profile.category} Specialist
            </span>
            {profile.isVerified && (
              <span className="inline-flex items-center gap-[7px] bg-white text-[#33395B] border-[1.5px] border-[#E3E8F5] text-[12.5px] font-bold px-[15px] py-[7px] rounded-full whitespace-nowrap">
                <Check className="w-[13px] h-[13px] text-[#0E9D5C]" strokeWidth={2.6} />
                Verified Expert
              </span>
            )}
          </div>
        </div>

        {/* Name + verified badge */}
        <div className="flex items-center gap-2.5 flex-wrap mt-3.5">
          <h1 className="text-[25px] font-bold text-[#141A33] tracking-tight leading-tight m-0">{profile.name}</h1>
          {profile.isVerified && <BadgeCheck className="w-[19px] h-[19px] text-white fill-[#2F5FFF]" />}
        </div>

        {/* Role • location • experience */}
        <div className="flex items-center gap-2 flex-wrap mt-[7px] text-[13.5px] font-bold text-[#5A6284]">
          <span className="font-extrabold text-[#33395B] whitespace-nowrap">{profile.role}</span>
          <span className="text-[#D5DAE8]">•</span>
          <span className="whitespace-nowrap">{profile.location}</span>
          <span className="text-[#D5DAE8]">•</span>
          <span className="whitespace-nowrap">{profile.experience} experience</span>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 mt-5 pt-[18px] border-t border-[#F0F2F8] text-center gap-y-4">
          <div className="sm:border-r border-[#F0F2F8]">
            <div className="flex items-center justify-center gap-1.5 font-extrabold text-base text-[#141A33]">
              <Star className="w-3.5 h-3.5 text-[#F5A524] fill-[#F5A524]" />
              {profile.rating ?? 0}
            </div>
            <div className="text-[11px] text-[#8B93B2] font-bold mt-[3px]">
              {profile.reviews === 1 ? "1 Review" : `${profile.reviews ?? 0} Reviews`}
            </div>
          </div>
          <div className="sm:border-r border-[#F0F2F8]">
            <div className="font-extrabold text-base text-[#141A33]">{sessionsTaken > 0 ? `${sessionsTaken}+` : "New"}</div>
            <div className="text-[11px] text-[#8B93B2] font-bold mt-[3px]">Sessions Taken</div>
          </div>
          <div className="sm:border-r border-[#F0F2F8]">
            <div className="font-extrabold text-base text-[#141A33]">{profile.experience}</div>
            <div className="text-[11px] text-[#8B93B2] font-bold mt-[3px]">Experience</div>
          </div>
          <div>
            <div className="font-extrabold text-base text-[#141A33]">
              {profile.responseTime && profile.responseTime !== "New expert" ? profile.responseTime : "< 2 hrs"}
            </div>
            <div className="text-[11px] text-[#8B93B2] font-bold mt-[3px]">Response Time</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Booking card — Expert Detail design; used in sidebar (desktop) and mobile sheet
  const BookingCard = () => (
    <div className="bg-white rounded-[22px] border border-[#EDF1FB] p-6 shadow-[0_10px_24px_-18px_rgba(20,26,51,.18)]">
      <h3 className="text-[19px] font-bold text-[#141A33] tracking-tight m-0">Configure Session</h3>
      <p className="text-[12.5px] text-[#8B93B2] font-bold mt-[3px] mb-5">Topic, duration, date &amp; time</p>

      {/* Level & Duration */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-[10.5px] font-extrabold text-[#8B93B2] tracking-[.08em] mb-2 whitespace-nowrap">EXPERT LEVEL</div>
          <PremiumSelect
            value={expertLevel}
            options={levelSelectOptions}
            onChange={(value) => setExpertLevel(value)}
          />
        </div>
        <div>
          <div className="text-[10.5px] font-extrabold text-[#8B93B2] tracking-[.08em] mb-2 whitespace-nowrap">DURATION</div>
          <PremiumSelect
            value={String(durationOptions.includes(sessionDuration) ? sessionDuration : durationOptions[0])}
            options={durationSelectOptions}
            onChange={(value) => {
              const next = Number(value);
              if (isSessionDuration(next)) setSessionDuration(next);
            }}
          />
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-[#F0F5FF] border border-[#DCE8FF] rounded-2xl px-[18px] py-4 mb-[18px]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10.5px] font-extrabold text-[#5A6284] tracking-[.08em] whitespace-nowrap">TOTAL AMOUNT</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#5A6284]">
            <Timer className="w-[13px] h-[13px]" /> {sessionDuration} min
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-[26px] font-bold ${appliedFreePromo ? "text-[#0E9D5C]" : "text-[#2F5FFF]"}`}>
              {appliedFreePromo ? "Free" : formatPrice(displayPrice)}
            </span>
            {!appliedFreePromo && (
              <span className="text-[12.5px] text-[#5A6284] font-bold whitespace-nowrap">for {sessionDuration} min · INR</span>
            )}
          </div>
          <span className="bg-[#DCE8FF] text-[#2F5FFF] text-[11.5px] font-extrabold px-3 py-[5px] rounded-full whitespace-nowrap">
            {expertLevel}
          </span>
        </div>
      </div>

      {/* Promo code */}
      <div className="flex gap-2.5 mb-[22px]">
        <input
          type="text"
          placeholder="Enter promo code"
          className="flex-1 min-w-0 bg-[#F7F9FE] border border-[#E3E8F5] rounded-xl px-3.5 py-3 text-[13.5px] font-bold text-[#141A33] placeholder:text-[#8B93B2] outline-none focus:border-[#2F5FFF] transition-colors"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
        />
        <button
          type="button"
          onClick={handleApplyPromo}
          className="px-5 bg-[#E3EDFF] text-[#2F5FFF] rounded-xl font-extrabold text-[13.5px] cursor-pointer hover:bg-[#D5E3FF] transition-colors focus:outline-none"
        >
          Apply
        </button>
      </div>
      {appliedFreePromo && (
        <p className="text-[#0E9D5C] text-xs font-bold -mt-4 mb-4">✓ Free session — no payment. Click the button below to complete.</p>
      )}

      {/* Pick a date */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10.5px] font-extrabold text-[#8B93B2] tracking-[.08em] whitespace-nowrap">PICK A DATE</span>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
            className="p-1.5 rounded-lg hover:bg-[#F5F7FC] disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none"
          >
            <ChevronLeft size={16} className="text-[#4A5170]" />
          </button>
          <span className="font-extrabold text-[13.5px] text-[#141A33] whitespace-nowrap">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#F5F7FC] transition-colors focus:outline-none">
            <ChevronRight size={16} className="text-[#4A5170]" />
          </button>
        </div>
      </div>
      <div
        ref={carouselRef}
        className="flex gap-2 overflow-x-auto pb-1 mb-5 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {dates.map((date, index) => {
          const isToday = new Date().toDateString() === date.toDateString();
          const isActive = selectedDate === index;
          return (
            <button
              key={index}
              data-active={isActive}
              onClick={() => {
                setSelectedDate(index);
                setSelectedSlot(null);
              }}
              className={`min-w-[64px] text-center px-1.5 py-[11px] rounded-[14px] cursor-pointer shrink-0 border-[1.5px] transition-colors focus:outline-none ${
                isActive
                  ? "bg-[#2F5FFF] border-[#2F5FFF] text-white"
                  : "bg-white border-[#E3E8F5] text-[#33395B] hover:border-[#B9CBF5]"
              }`}
            >
              <div className="text-[9.5px] font-extrabold tracking-[.06em] opacity-85">
                {isToday ? "TODAY" : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div className="font-bold text-[19px] my-0.5 leading-none tabular-nums">{date.getDate()}</div>
              <div className="text-[9.5px] font-extrabold tracking-[.06em] opacity-85">
                {date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Pick a time */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10.5px] font-extrabold text-[#8B93B2] tracking-[.08em] whitespace-nowrap">PICK A TIME</span>
        <span className="bg-[#EEF2FF] text-[#2F5FFF] text-[11px] font-extrabold px-2.5 py-1 rounded-full">
          {currentSlots.length} slots
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-5 max-h-[320px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {currentSlots.length > 0 ? (
          currentSlots.map((slot, index) => {
            const isSelected = selectedSlot?.time === slot.time;
            const isUnavailable = slot.available === false;
            const timeParts = (slot.time || "").split(/\s*[-–]\s*/);
            const startRaw = timeParts[0]?.trim() ?? "";
            const endRaw = timeParts[1]?.trim() ?? "";
            const compact = (t: string) => t.replace(/^0(\d)/, "$1");
            const start = compact(startRaw);
            const end = compact(endRaw);
            // Same format for every slot: "1:00–1:30 PM" or "12:00–12:30 AM"
            const timeLabel = (() => {
              if (!start || !end) return slot.time || "—";
              const s = start.match(/^(.+?)\s*(AM|PM)$/i);
              const e = end.match(/^(.+?)\s*(AM|PM)$/i);
              const sTime = s ? s[1]!.trim() : start;
              const eTime = e ? e[1]!.trim() : end;
              const sMer = (s && s[2]) ? s[2].toUpperCase() : (e && e[2]) ? e[2].toUpperCase() : "";
              const eMer = (e && e[2]) ? e[2].toUpperCase() : sMer;
              if (sMer && eMer) {
                return sMer === eMer ? `${sTime}–${eTime} ${eMer}` : `${sTime} ${sMer}–${eTime} ${eMer}`;
              }
              return `${start}–${end}`;
            })();
            return (
              <button
                key={index}
                type="button"
                disabled={isUnavailable}
                onClick={() => setSelectedSlot(slot)}
                className={`relative flex items-center justify-center gap-[7px] px-2 py-[11px] rounded-xl font-extrabold text-[12.5px] whitespace-nowrap border-[1.5px] transition-colors focus:outline-none ${
                  isUnavailable
                    ? "bg-[#F5F7FC] border-[#EAEEF7] text-[#B2B8D0] cursor-not-allowed"
                    : isSelected
                      ? "bg-[#F0F5FF] border-[#2F5FFF] text-[#2F5FFF] cursor-pointer"
                      : "bg-white border-[#E3E8F5] text-[#33395B] hover:border-[#B9CBF5] cursor-pointer"
                }`}
                title={slot.time}
              >
                <Clock className="w-[13px] h-[13px] shrink-0" strokeWidth={2} aria-hidden />
                {timeLabel}
                {isUnavailable && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl z-10 bg-[#F5F7FC]/95" aria-hidden>
                    <span className="bg-[#E9EDF7] px-2 py-0.5 rounded text-[9px] font-extrabold text-[#8B93B2] uppercase tracking-wider">
                      Unavailable
                    </span>
                  </div>
                )}
              </button>
            );
          })
        ) : (
          <div className="col-span-2 py-10 text-center bg-[#F7F9FE] rounded-2xl border-2 border-dashed border-[#E3E8F5] flex flex-col items-center justify-center">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
              <Calendar className="w-5 h-5 text-[#8B93B2]" />
            </div>
            <p className="text-[#141A33] font-extrabold text-sm mb-0.5">No slots available</p>
            <p className="text-xs text-[#8B93B2] font-bold">Try another date or the next month</p>
          </div>
        )}
      </div>

      {/* Selected slot summary */}
      {selectedSlot && (
        <div className="mb-4 bg-[#F0F5FF] px-4 py-3.5 rounded-2xl border border-[#DCE8FF]">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10.5px] font-extrabold text-[#5A6284] tracking-[.08em]">SELECTED SLOT</span>
            <button onClick={() => setSelectedSlot(null)} className="text-[#2F5FFF] text-xs font-extrabold hover:underline focus:outline-none">
              Clear
            </button>
          </div>
          <p className="text-[13.5px] font-extrabold text-[#141A33] leading-tight m-0">
            {dates[selectedDate]?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) || ""}
          </p>
          <p className="text-[#2F5FFF] font-extrabold text-[13px] mt-0.5 m-0">At {selectedSlot.time}</p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => {
          if (!selectedSlot) return;
          if (appliedFreePromo) {
            handleFreeBooking();
          } else if (user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)) {
            handlePremiumCreditBooking();
          } else {
            if (!user) {
              Swal.fire({
                title: "Login Required",
                text: "Please sign in to book a session.",
                icon: "info",
                showCancelButton: true,
                confirmButtonText: "Sign In",
                confirmButtonColor: "#004fcb",
              }).then((res) => {
                if (res.isConfirmed) navigate("/signin");
              });
              return;
            }
            showPaymentPage();
          }
        }}
        disabled={!selectedSlot || isProcessing}
        className={`w-full flex items-center justify-center gap-[9px] py-[15px] rounded-[14px] font-extrabold text-[15px] transition-colors ${
          selectedSlot
            ? appliedFreePromo
              ? "bg-[#0E9D5C] text-white hover:bg-[#0C8A50] cursor-pointer"
              : "bg-[#2F5FFF] text-white hover:bg-[#1E3FCC] cursor-pointer"
            : "bg-[#E9EDF7] text-[#8B93B2] cursor-not-allowed"
        }`}
      >
        {isProcessing ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : selectedSlot ? (
          <>
            {appliedFreePromo
              ? "Confirm free booking"
              : user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)
                ? `Book with Credit (${user.freeInterviewsCount} left)`
                : `Book Session — ${formatPrice(displayPrice)}`
            }
            <ArrowRight className="w-[15px] h-[15px]" />
          </>
        ) : (
          "Select a Slot"
        )}
      </button>

      <div className="flex flex-col gap-2 mt-4">
        <span className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#5A6284]">
          <Shield className="w-[13px] h-[13px] text-[#0E9D5C]" />
          Secure 256-bit SSL encrypted payment
        </span>
        <span className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#5A6284]">
          <Clock className="w-[13px] h-[13px] text-[#2F5FFF]" />
          24-hour cancellation policy applies
        </span>
      </div>
    </div>
  );

  const MobileBookingFAB = () => (
    <div className="lg:hidden fixed bottom-4 right-4 z-40">
      <button
        onClick={() => setShowMobileBooking(true)}
        className="flex items-center gap-1.5 px-5 py-3 bg-[#2F5FFF] text-white rounded-full shadow-lg shadow-blue-900/20 hover:bg-[#1E3FCC] active:scale-95 transition-all font-extrabold text-sm"
      >
        <Calendar className="w-4 h-4" />
        Book
      </button>
    </div>
  );

  const CareerAdsSection = () => (
    <div className="bg-white rounded-[22px] border border-[#EDF1FB] overflow-hidden shadow-[0_10px_24px_-18px_rgba(20,26,51,.18)]">
      <div className="px-6 py-4 border-b border-[#F0F2F8]">
        <h4 className="text-[15px] font-bold text-[#141A33] m-0">Recommended for you</h4>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#DCE8FF] bg-[#F0F5FF] p-4 h-full min-h-[164px] flex flex-col">
          <p className="text-[10.5px] font-extrabold text-[#2F5FFF] tracking-[.08em] mb-1">CAREER BOOST</p>
          <p className="text-sm font-extrabold text-[#141A33]">Resume Review Add-on</p>
          <p className="text-xs text-[#5A6284] font-semibold mt-1 leading-relaxed">Get targeted edits from experts and improve shortlisting chances.</p>
          <button className="mt-auto pt-3 text-xs font-extrabold text-[#2F5FFF] hover:underline text-left">Learn more</button>
        </div>
        <div className="rounded-2xl border border-[#FCE3C2] bg-[#FFF6EA] p-4 h-full min-h-[164px] flex flex-col">
          <p className="text-[10.5px] font-extrabold text-[#D9720C] tracking-[.08em] mb-1">NEW OFFER</p>
          <p className="text-sm font-extrabold text-[#141A33]">Bundle &amp; Save</p>
          <p className="text-xs text-[#5A6284] font-semibold mt-1 leading-relaxed">Book 3 sessions together and unlock discount pricing.</p>
          <button className="mt-auto pt-3 text-xs font-extrabold text-[#D9720C] hover:underline text-left">View plans</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-[#F5F7FC] pb-10">
        <Navigation />

        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-5">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-[9px] bg-white border border-[#EAEEF7] rounded-full pl-4 pr-5 py-2.5 font-extrabold text-sm text-[#141A33] mb-[18px] shadow-[0_4px_10px_-6px_rgba(20,26,51,.12)] hover:text-[#2F5FFF] transition-colors focus:outline-none"
          >
            <ChevronLeft className="w-[15px] h-[15px]" strokeWidth={2.4} />
            Back to Home
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-5 items-start">
            {/* Main Content Areas */}
            <div className="min-w-0 space-y-5">
              {ProfileHeader()}

              {/* Tabs Section */}
              <div className="bg-white rounded-[22px] border border-[#EDF1FB] overflow-hidden shadow-[0_10px_24px_-18px_rgba(20,26,51,.18)]">
                <div className="flex gap-1 px-5 pt-3.5 border-b border-[#F0F2F8]">
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`px-[18px] py-[11px] font-bold text-[15.5px] rounded-t-xl border-b-[2.5px] whitespace-nowrap transition-colors focus:outline-none ${
                      activeTab === "details"
                        ? "text-[#2F5FFF] bg-[#F0F5FF] border-[#2F5FFF]"
                        : "text-[#8B93B2] border-transparent hover:text-[#4A5170]"
                    }`}
                  >
                    About Session
                  </button>
                  <button
                    onClick={() => setActiveTab("reviews")}
                    className={`px-[18px] py-[11px] font-bold text-[15.5px] rounded-t-xl border-b-[2.5px] whitespace-nowrap transition-colors focus:outline-none ${
                      activeTab === "reviews"
                        ? "text-[#2F5FFF] bg-[#F0F5FF] border-[#2F5FFF]"
                        : "text-[#8B93B2] border-transparent hover:text-[#4A5170]"
                    }`}
                  >
                    Reviews &amp; Ratings ({reviews.length})
                  </button>
                </div>

                <div className="p-6">
                  {activeTab === "details" ? (
                    <div className="animate-fadeIn">
                      {/* Session Quick Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-[26px]">
                        <div
                          onClick={() => {
                            if (durationOptions.length > 1) {
                              const currentIndex = durationOptions.indexOf(sessionDuration);
                              const nextIndex = (currentIndex + 1) % durationOptions.length;
                              setSessionDuration(durationOptions[nextIndex]);
                              setSelectedSlot(null);
                            }
                          }}
                          className={`flex items-center gap-3.5 bg-[#F7F9FE] border border-[#EFF2FA] rounded-2xl p-4 select-none ${
                            durationOptions.length > 1
                              ? "cursor-pointer hover:border-[#B9CBF5] active:scale-[0.98] transition-all"
                              : ""
                          }`}
                        >
                          <div className="w-[42px] h-[42px] rounded-[13px] bg-[#EEF2FF] flex items-center justify-center shrink-0 text-[#2F5FFF]">
                            <Timer className="w-[19px] h-[19px]" />
                          </div>
                          <div>
                            <div className="font-extrabold text-[15px] text-[#141A33] tabular-nums flex items-center gap-1.5">
                              {sessionDuration}m
                              {durationOptions.length > 1 && (
                                <span className="text-[9px] font-extrabold text-[#2F5FFF] bg-[#EEF2FF] px-1.5 py-0.5 rounded-lg">
                                  Click to change
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#8B93B2] font-bold">Session duration</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3.5 bg-[#F7F9FE] border border-[#EFF2FA] rounded-2xl p-4">
                          <div className="w-[42px] h-[42px] rounded-[13px] bg-[#EEF2FF] flex items-center justify-center shrink-0 text-[#2F5FFF]">
                            <Video className="w-[19px] h-[19px]" />
                          </div>
                          <div>
                            <div className="font-extrabold text-[15px] text-[#141A33]">1:1 Video</div>
                            <div className="text-xs text-[#8B93B2] font-bold">Live interaction</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3.5 bg-[#F7F9FE] border border-[#EFF2FA] rounded-2xl p-4">
                          <div className="w-[42px] h-[42px] rounded-[13px] bg-[#EEF2FF] flex items-center justify-center shrink-0 text-[#2F5FFF]">
                            <CheckCircle className="w-[19px] h-[19px]" />
                          </div>
                          <div>
                            <div className="font-extrabold text-[15px] text-[#141A33]">Customized</div>
                            <div className="text-xs text-[#8B93B2] font-bold">Tailored plan</div>
                          </div>
                        </div>
                      </div>

                      {/* Expertise Tags */}
                      <div className="text-[11.5px] font-extrabold text-[#8B93B2] tracking-[.08em] mb-3">AREAS OF EXPERTISE</div>
                      <div className="flex flex-wrap gap-2 mb-[30px]">
                        {[...profile.skills, "Mock Interviews", "Technical Round", "Behavioral"].map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-[7px] bg-white text-[#33395B] border-[1.5px] border-[#E3E8F5] text-[13px] font-bold px-4 py-2 rounded-full whitespace-nowrap hover:border-[#B9CBF5] hover:text-[#141A33] transition-colors cursor-default"
                          >
                            {skill}
                            <ChevronRight className="w-3 h-3 text-[#8B93B2]" strokeWidth={2.4} />
                          </span>
                        ))}
                      </div>

                      {/* Session Structure */}
                      <h4 className="text-[19px] font-bold text-[#141A33] mb-1.5 m-0">Session flow</h4>
                      <p className="text-[13.5px] text-[#5A6284] font-semibold mb-4">
                        A structured mock interview with clear outcomes — optimized for fast improvement.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                        {[
                          { title: "Align goals", desc: "We confirm your target role, seniority, and focus areas." },
                          { title: "Mock interview", desc: "Real questions, realistic pacing, and professional evaluation." },
                          { title: "Feedback & scorecard", desc: "Strengths, gaps, and specific fixes — no generic advice." },
                          { title: "Next steps", desc: "A short action plan + resources to practice right away." }
                        ].map((step, idx) => (
                          <div key={idx} className="flex gap-3.5 bg-[#F7F9FE] border border-[#EFF2FA] rounded-2xl p-4">
                            <div className="w-[30px] h-[30px] rounded-[10px] bg-[#EEF2FF] text-[#2F5FFF] flex items-center justify-center font-extrabold text-[13.5px] shrink-0">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-[#141A33] mb-[3px]">{step.title}</div>
                              <div className="text-[12.5px] text-[#5A6284] font-semibold leading-normal">{step.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Benefits Checklist */}
                      <div className="bg-[#F0F5FF] border border-[#DCE8FF] rounded-2xl px-[22px] py-5">
                        <div className="text-[11.5px] font-extrabold text-[#2F5FFF] tracking-[.08em] mb-3.5">INCLUDED IN EVERY SESSION</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-6">
                          {[
                            "Performance scorecard",
                            "Actionable improvement plan",
                            "Curated question bank",
                            "Session recording",
                            "Resume review tips",
                            "Follow-up email support"
                          ].map((b, i) => (
                            <span key={i} className="inline-flex items-start gap-[9px] text-[13.5px] font-bold text-[#33395B] leading-snug">
                              <Check className="w-3.5 h-3.5 text-[#0E9D5C] shrink-0 mt-0.5" strokeWidth={2.6} />
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-fadeIn">
                      {/* Rating Summary Card */}
                      <div className="flex gap-7 items-center bg-[#F7F9FE] border border-[#EFF2FA] rounded-2xl p-[22px] mb-[18px] flex-wrap">
                        <div className="text-center min-w-[110px]">
                          <div className="text-[44px] font-bold text-[#141A33] leading-none">{profile.rating}</div>
                          <div className="flex gap-0.5 justify-center my-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-[15px] h-[15px] ${i < Math.round(profile.rating) ? "text-[#F5A524] fill-[#F5A524]" : "text-[#E9EDF7] fill-[#E9EDF7]"}`}
                              />
                            ))}
                          </div>
                          <div className="text-[12.5px] text-[#8B93B2] font-bold">
                            {profile.reviews === 1 ? "1 total review" : `${profile.reviews} total reviews`}
                          </div>
                        </div>
                        <div className="flex-1 min-w-[220px] flex flex-col gap-[7px]">
                          {ratingDist.map((bar) => (
                            <div key={bar.star} className="flex items-center gap-3">
                              <span className="text-xs font-extrabold text-[#5A6284] w-2.5">{bar.star}</span>
                              <div className="flex-1 h-[7px] rounded-full bg-[#E9EDF7] overflow-hidden">
                                <div className="h-full rounded-full bg-[#F5A524]" style={{ width: `${bar.pct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-[#8B93B2] w-[34px] text-right">{bar.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reviews List */}
                      <div className="space-y-4">
                        {reviewsLoading ? (
                          <div className="py-14 text-center">
                            <div className="w-10 h-10 border-4 border-[#2F5FFF]/20 border-t-[#2F5FFF] rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm font-bold text-[#8B93B2]">Curating client feedback...</p>
                          </div>
                        ) : reviews.length > 0 ? (
                          reviews.map((review) => (
                            <div key={review.id} className="border border-[#EFF2FA] rounded-2xl p-5">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex gap-3.5">
                                  <div className="w-[46px] h-[46px] rounded-full bg-[#EEF2FF] text-[#2F5FFF] overflow-hidden shrink-0 flex items-center justify-center font-bold text-[15px]">
                                    {review.avatar ? (
                                      <img src={review.avatar} alt={review.name} className="w-full h-full object-cover" />
                                    ) : (
                                      review.name.trim().substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-[15px] text-[#141A33]">{review.name}</div>
                                    <div className="text-xs text-[#8B93B2] font-bold">{review.role}</div>
                                    <div className="flex gap-0.5 mt-1.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-[13px] h-[13px] ${i < review.rating ? "text-[#F5A524] fill-[#F5A524]" : "text-[#E9EDF7] fill-[#E9EDF7]"}`} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs text-[#8B93B2] font-extrabold uppercase">{review.date}</span>
                              </div>
                              <p className="text-sm text-[#33395B] font-semibold italic my-3.5">"{review.comment}"</p>
                              {review.strengths && review.strengths.length > 0 && (
                                <div className="mb-3.5 flex flex-wrap gap-2">
                                  {review.strengths.map((s, idx) => (
                                    <span key={idx} className="text-[10px] bg-[#E7FBF1] text-[#0E9D5C] px-2 py-1 rounded-md font-extrabold uppercase">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <button className="inline-flex items-center gap-[7px] text-[13px] font-extrabold text-[#5A6284] hover:text-[#2F5FFF] transition-colors focus:outline-none">
                                <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.8} />
                                Helpful
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-14 bg-[#F7F9FE] rounded-2xl border-2 border-dashed border-[#E3E8F5]">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                              <MessageCircle className="w-8 h-8 text-[#C7CDE0]" />
                            </div>
                            <h4 className="text-base font-extrabold text-[#141A33] m-0">No reviews yet</h4>
                            <p className="text-sm text-[#8B93B2] font-bold mt-1 max-w-xs mx-auto">Be the first to share your experience after completing a session.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {CareerAdsSection()}
            </div>

            {/* Right Sidebar Column */}
            <div className="hidden lg:block lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto no-scrollbar">
              <div className="space-y-5 pb-6">
                {BookingCard()}

                {/* Proof Card */}
                <div className="bg-white rounded-[22px] border border-[#EDF1FB] p-6 shadow-[0_10px_24px_-18px_rgba(20,26,51,.18)]">
                  <h4 className="text-[17px] font-bold text-[#141A33] mb-4 m-0">Why learn from {firstName}?</h4>
                  <div className="flex flex-col gap-4">
                    {[
                      {
                        title: "Trusted Guidance",
                        desc: profile.reviews > 0
                          ? `${profile.reviews}+ reviews with strong learner feedback.`
                          : "Verified mentor profile with a structured mock interview approach.",
                      },
                      {
                        title: "Real Interview Experience",
                        desc: `${profile.experience} of hands-on ${profile.category} experience across production teams.`,
                      },
                      {
                        title: "Actionable Feedback",
                        desc: "Every session ends with a scorecard and a concrete practice plan.",
                      },
                    ].map((p, i) => (
                      <div key={i} className="flex gap-[13px]">
                        <div className="w-[38px] h-[38px] rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0 text-[#2F5FFF]">
                          <Check className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div>
                          <div className="font-extrabold text-[13.5px] text-[#141A33]">{p.title}</div>
                          <div className="text-[12.5px] text-[#8B93B2] font-semibold leading-normal mt-0.5">{p.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {MobileBookingFAB()}

        {/* Mobile Booking Sheet */}
        {showMobileBooking && (
          <div className="lg:hidden fixed inset-0 bg-black/60 z-[60] flex items-end animate-fadeIn">
            <div className="bg-white w-full rounded-t-[24px] sm:rounded-t-[32px] max-h-[90vh] overflow-y-auto animate-slideUp relative pb-10 shadow-2xl shadow-black/20">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between z-10">
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Book Session</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">with {profile.name}</p>
                </div>
                <button onClick={() => setShowMobileBooking(false)} className="p-2.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shrink-0" aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="px-4 py-4 pb-8">
                {BookingCard()}
              </div>
            </div>
          </div>
        )}

      </div>
      <Footer />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .white-glass { background: rgba(255, 255, 255, 0.4); border: 1px solid rgba(255, 255, 255, 0.2); }
      `}</style>
    </>
  );
};

export default BookSessionPage;
