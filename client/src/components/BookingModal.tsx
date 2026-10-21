import React, { useState, useEffect, useMemo, useRef } from "react";
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
      if ("availability" in initialProfile && (initialProfile as any).availability) {
        return initialProfile as Profile;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialKolkataMonth());
  const [selectedDate, setSelectedDate] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; available: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mentor Tier Level Selection (Image 1 style)
  const [selectedLevel, setSelectedLevel] = useState<string>("Rising Mentor");
  const [levelPrices, setLevelPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);

  // Duration & Pricing (default 30m / 60m matching UI image)
  const [sessionDuration, setSessionDuration] = useState<number>(30);
  const [discountCode, setDiscountCode] = useState<string>("");
  const [appliedFreePromo, setAppliedFreePromo] = useState<boolean>(false);
  const [appliedPromoPercent, setAppliedPromoPercent] = useState<number>(0);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch expert details if not provided or incomplete
  useEffect(() => {
    if (!isOpen || !expertId) return;

    const fetchExpert = async () => {
      try {
        setLoading(true);
        let expertData = null;
        try {
          const res = await axios.get(`/api/expert/public/profile/${expertId}`);
          if (res.data?.success && res.data?.profile) {
            expertData = res.data.profile;
          }
        } catch {
          // Fallback to verified list if public profile not found
        }

        if (!expertData) {
          const res = await axios.get(`/api/expert/verified`);
          const experts = res.data?.data || res.data || [];
          expertData = experts.find((e: any) => (e._id || e.userId) === expertId);
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
  }, [isOpen, expertId]);

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
              return;
            }
          } catch (_) {}

          const base = catDefaults[lvl] || 499;
          newPrices[lvl] = sessionDuration === 30 ? base : Math.round(base * 1.8);
        })
      );

      if (isMounted) {
        setLevelPrices(newPrices);
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
    if (levelPrices[selectedLevel] != null) {
      return levelPrices[selectedLevel];
    }
    const prof = profile || initialProfile;
    const category = prof?.category || "IT";
    const catDefaults = DEFAULT_CATEGORY_MATRIX[category] || DEFAULT_CATEGORY_MATRIX["IT"];
    const base = catDefaults[selectedLevel] || 499;
    return sessionDuration === 30 ? base : Math.round(base * 1.8);
  }, [levelPrices, selectedLevel, profile, initialProfile, sessionDuration]);

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

  // Dates for current month
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

  // Generate Available Slots for Selected Date
  const currentSlots = useMemo(() => {
    if (!profile?.availability || !dates[selectedDate]) return [];
    const date = dates[selectedDate];
    const kolkataDateStr = getKolkataDateString(date);

    const isBreakDate = (profile.availability.breakDates || []).some((b: any) => getKolkataDateString(b.start) === kolkataDateStr);
    if (isBreakDate) return [];

    const weekly = profile.availability.weekly || {};
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

    const generatedSlots: { time: string; available: boolean }[] = [];
    const duration = Number(sessionDuration);
    const step = duration;

    weeklyRanges.forEach((range: { from: string; to: string }) => {
      if (!range.from || !range.to) return;
      let currentMinutes = parseTimeToMinutes(range.from);
      let endMinutes = parseTimeToMinutes(range.to);
      if (endMinutes < currentMinutes) endMinutes += 24 * 60;

      while (currentMinutes + duration <= endMinutes) {
        const nowKolkata = getKolkataTimeParts();
        const isToday = kolkataDateStr === getKolkataDateString(new Date());
        const currentTimeMinutes = nowKolkata.hours * 60 + nowKolkata.minutes;

        if (isToday && currentMinutes < currentTimeMinutes) {
          currentMinutes += step;
          continue;
        }

        const slotStartStr = formatMinutesToHHMM(currentMinutes);
        const slotEndStr = formatMinutesToHHMM(currentMinutes + duration);
        const slotDate = new Date(`${kolkataDateStr}T${slotStartStr}:00+05:30`);
        const slotEndDate = new Date(`${kolkataDateStr}T${slotEndStr}:00+05:30`);

        const isBooked = bookedSessions.some(session => {
          if (session.status === "cancelled") return false;
          const sStart = new Date(session.startTime);
          const sEnd = new Date(session.endTime);
          if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) return false;
          if (getKolkataDateString(sStart) !== kolkataDateStr) return false;
          return slotDate < sEnd && slotEndDate > sStart;
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
          generatedSlots.push({ time: timeStr, available: true });
        }
        currentMinutes += step;
      }
    });

    return generatedSlots.sort((a, b) => a.time.localeCompare(b.time));
  }, [dates, selectedDate, profile?.availability, sessionDuration, bookedSessions]);

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
    if (!profile || !selectedSlot || !dates[selectedDate]) return null;
    const date = dates[selectedDate];
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
      expertName: profile.name,
      expertEmail: (profile as any).email || "",
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

    const selectedDateStr = dates[selectedDate]?.toLocaleDateString("en-US", {
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

      // 3. User notification: Toast
      toast.success(`Meeting Scheduled! Your meeting has been scheduled on ${selectedDateStr} at ${selectedTimeSlot}.`);

      // 4. User notification: Modal
      Swal.fire({
        title: `${successTitle} 🎉`,
        html: `
          <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #334155;">
            <p style="margin-bottom: 8px;">Your meeting has been scheduled on <strong>${selectedDateStr}</strong> at <strong>${selectedTimeSlot}</strong>.</p>
            <p style="margin-bottom: 8px;"><strong>Mentor:</strong> ${profile?.name || "Mentor"}</p>
            ${extraNote ? `<p style="margin-bottom: 8px; color: #475569;">${extraNote}</p>` : ""}
            <p style="color: #059669; font-weight: 500;">✓ This timing slot is confirmed and removed from available slots.</p>
          </div>
        `,
        icon: "success",
        confirmButtonColor: "#0755E8",
        confirmButtonText: "View My Bookings",
      }).then(() => {
        onClose();
        navigate("/my-sessions");
      });
    };

    try {
      setIsProcessing(true);

      // 1. Free promo booking
      if (appliedFreePromo) {
        const res = await axios.post("/api/sessions/book-free", payload);
        if (res.data?.success) {
          onBookingSuccess("Meeting Scheduled!", "Free promotional session unlocked.");
        }
        return;
      }

      // 2. Premium user credit booking
      if (user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)) {
        const res = await axios.post("/api/payment/use-premium-credit", { bookingDetails: payload });
        if (res.data?.success) {
          onBookingSuccess("Meeting Scheduled!", `Booked with Premium Credit (${res.data.remainingCredits ?? 0} credits remaining).`);
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

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "Mockeefy",
        description: `${sessionDuration} Min Mock Interview with ${profile?.name || "Mentor"}`,
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
                expertId: profile?.id || expertId,
                candidateId: user?.id || user?.userId || (user as any)?._id,
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
      console.error("Booking error", err);
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

  if (!isOpen || typeof document === "undefined") return null;

  const expertDisplayName = profile?.name || (initialProfile as any)?.name || "Interview Expert";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-left my-auto animate-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP MODAL HEADER: Expert Summary & Dismiss (X) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#F0F5FF]/80 via-white to-white border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-[#0755E8] text-base shadow-2xs">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={expertDisplayName} className="w-full h-full object-cover" />
              ) : (
                expertDisplayName.slice(0, 2).toUpperCase()
              )}
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight truncate">
                  {expertDisplayName}
                </h3>
                {(profile?.isVerified ?? (initialProfile as any)?.isVerified) && (
                  <BadgeCheck className="w-4 h-4 text-white fill-[#0755E8] shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {profile?.role || (initialProfile as any)?.role || "Interview Expert"} • <span className="text-[#0755E8] font-bold">₹{displayPrice} ({sessionDuration}m)</span>
              </p>
              {expertLevels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {expertLevels.map((lvl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center transition-all cursor-pointer ${
                        selectedLevel === lvl
                          ? "bg-[#0755E8] text-white border-[#0755E8] shadow-xs"
                          : "text-[#0755E8] bg-[#EAF2FF] border-[#93B8FF]/40 hover:bg-[#dbe7fd]"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-600 hover:text-rose-800 border border-rose-200/80 hover:border-rose-300 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
            aria-label="Close booking modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* MODAL BODY: EXACT STEP 1 PROCESS FROM USER IMAGE */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          
          {/* 1. EXPERT LEVELS SELECTION (Matches User Image Style) */}
          <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Expert Levels (Choose Multi-option)
                </label>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Select all levels you wish to support. Candidates can choose their preferred tier when booking you.
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

          {/* 2. SELECT DATE Header & Month Picker Controls */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              SELECT DATE
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

          {/* 3. Date Carousel (Matches User Image Cards: TODAY 21 OCT, SUN 25 OCT, etc.) */}
          <div
            ref={carouselRef}
            className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none"
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

          {/* 4. AVAILABLE SLOTS FOR Header with Badge */}
          <div className="flex items-center justify-between mb-2.5 pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              AVAILABLE SLOTS FOR {dates[selectedDate] ? dates[selectedDate].toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase() : ""}
            </span>
            <span className="text-[11px] font-bold text-[#0755E8] bg-[#EAF2FF] px-2.5 py-0.5 rounded-full border border-[#93B8FF]/40">
              {currentSlots.filter(s => s.available).length} slots available
            </span>
          </div>

          {/* 5. Time Slots Grid OR Empty State Box (Matches User Image Dotted Container) */}
          {currentSlots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {currentSlots.map((slot, index) => {
                const isSelected = selectedSlot?.time === slot.time;
                const isUnavailable = !slot.available;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => setSelectedSlot(slot)}
                    className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border outline-none ${
                      isUnavailable
                        ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-75"
                        : isSelected
                        ? "bg-[#0755E8] border-[#0755E8] text-white shadow-sm ring-2 ring-[#0755E8]/25 cursor-pointer"
                        : "bg-white border-slate-200 text-slate-700 hover:border-[#0755E8] hover:bg-[#F5F8FF] hover:text-[#0755E8] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : isUnavailable ? "text-slate-300" : "text-[#0755E8]"}`} />
                      <span className={`whitespace-nowrap tabular-nums font-semibold text-xs ${
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
            <div className="py-8 text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6">
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
                    {dates[selectedDate]?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {selectedSlot.time} ({sessionDuration}m)
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
        <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300/90 bg-slate-200 hover:bg-slate-300 active:bg-slate-400/80 text-slate-800 hover:text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedSlot || isProcessing}
            onClick={handleBooking}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
              selectedSlot && !isProcessing
                ? "bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white cursor-pointer shadow-blue-500/20"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
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
