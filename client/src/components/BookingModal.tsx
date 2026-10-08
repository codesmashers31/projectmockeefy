import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import {
  X, Calendar, Clock, Timer, Shield, Check, ArrowRight,
  ChevronLeft, ChevronRight, Sparkles, AlertCircle
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getKolkataToday,
  getKolkataTimeParts,
  getKolkataDateString,
  getInitialKolkataMonth,
  mapExpertToProfile,
  Profile
} from "../lib/bookSessionUtils";
import { MentorProfile } from "./MentorJobCard";

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
    if (initialProfile && "bio" in initialProfile) return initialProfile as Profile;
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialKolkataMonth());
  const [selectedDate, setSelectedDate] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; available: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Duration & Pricing
  const [sessionDuration, setSessionDuration] = useState<number>(60);
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
        const res = await axios.get(`/api/expert/verified`);
        const experts = res.data?.data || res.data || [];
        const found = experts.find((e: any) => (e._id || e.userId) === expertId);
        if (found) {
          const mapped = mapExpertToProfile(found);
          setProfile(mapped);
          if (mapped.sessionDuration) {
            setSessionDuration(mapped.sessionDuration);
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

  // Available duration options
  const durationOptions = useMemo(() => {
    const defaultOptions = [45, 60];
    if (!profile?.availability?.weekly) return defaultOptions;
    const weekly = profile.availability.weekly;
    const durations = new Set<number>();
    Object.values(weekly).forEach((ranges: any) => {
      if (Array.isArray(ranges)) {
        ranges.forEach((range: { from: string; to: string }) => {
          if (range.from && range.to) {
            const [fh, fm] = range.from.split(":").map(Number);
            const [th, tm] = range.to.split(":").map(Number);
            let diff = (th * 60 + tm) - (fh * 60 + fm);
            if (diff < 0) diff += 24 * 60;
            if (diff > 0) durations.add(diff);
          }
        });
      }
    });
    const arr = Array.from(durations).filter((d) => [30, 45, 60, 90].includes(d));
    return arr.length > 0 ? arr.sort((a, b) => a - b) : defaultOptions;
  }, [profile]);

  // Price calculations
  const rawPrice = useMemo(() => {
    if (!profile) return 799;
    if (typeof profile.price === "number") return profile.price;
    if (typeof profile.price === "string") {
      const match = profile.price.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
      if (match?.[1]) return Number(match[1]);
    }
    return 799;
  }, [profile]);

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
    if (code === "FREE100" || code === "MOCKFREE" || code === "FREEMOCK") {
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
        confirmButtonColor: "#2F5FFF",
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
        currentMinutes += step;
      }
    });

    return generatedSlots.sort((a, b) => a.time.localeCompare(b.time));
  }, [dates, selectedDate, profile?.availability, sessionDuration, bookedSessions]);

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

    return {
      expertId: profile.id || expertId,
      expertName: profile.name,
      expertEmail: profile.email || "",
      expertPhone: profile.phone || "",
      expertCategory: profile.category || "IT",
      userCategory: profile.category || "IT",
      sessionCategory: profile.category || "IT",
      sessionType: "1:1 Mock Interview",
      sessionDuration: Number(sessionDuration),
      startTime,
      endTime,
      price: appliedFreePromo ? 0 : displayPrice,
      originalPrice: rawPrice,
      discount: appliedFreePromo ? rawPrice : rawPrice - displayPrice,
      status: "scheduled",
      isPremiumSession: !!(user?.isPremium),
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
        confirmButtonColor: "#2F5FFF",
      }).then((res) => {
        if (res.isConfirmed) {
          navigate("/signin", { state: { returnUrl: `/book-session?expertId=${expertId}` } });
        }
      });
      return;
    }

    const payload = buildPayload();
    if (!payload) return;

    try {
      setIsProcessing(true);

      // 1. Free promo booking
      if (appliedFreePromo) {
        const res = await axios.post("/api/sessions/book-free", payload);
        if (res.data?.success) {
          onClose();
          Swal.fire({
            title: "Booking Confirmed! 🎉",
            text: "Your free session has been scheduled successfully.",
            icon: "success",
            confirmButtonColor: "#2F5FFF",
          }).then(() => navigate("/my-sessions"));
        }
        return;
      }

      // 2. Premium user credit booking
      if (user?.isPremium && (user.freeInterviewsCount ?? 0) > 0) {
        const res = await axios.post("/api/payment/use-premium-credit", { bookingDetails: payload });
        if (res.data?.success) {
          onClose();
          Swal.fire({
            title: "Booked with Credit!",
            text: `Session confirmed. You have ${res.data.remainingCredits} credits left.`,
            icon: "success",
            confirmButtonColor: "#2F5FFF",
          }).then(() => navigate("/my-sessions"));
        }
        return;
      }

      // 3. Paid standard checkout
      const res = await axios.post("/api/payment/create-order", {
        amount: displayPrice,
        currency: "INR",
        bookingDetails: payload,
      });

      if (res.data?.success && res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        // Direct session booking fallback
        const bookRes = await axios.post("/api/sessions", payload);
        if (bookRes.data?.success || bookRes.status === 200 || bookRes.status === 201) {
          onClose();
          Swal.fire({
            title: "Session Booked!",
            text: "Your interview slot has been reserved.",
            icon: "success",
            confirmButtonColor: "#2F5FFF",
          }).then(() => navigate("/my-sessions"));
        }
      }
    } catch (err: any) {
      console.error("Booking error", err);
      Swal.fire({
        title: "Booking Failed",
        text: err?.response?.data?.message || "An error occurred while booking. Please try again.",
        icon: "error",
        confirmButtonColor: "#2F5FFF",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[540px] max-h-[92vh] bg-white rounded-[26px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-[#2F5FFF] font-black text-sm flex items-center justify-center shrink-0 border-2 border-white shadow-xs overflow-hidden">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                (profile?.name || "EX").slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight truncate leading-tight">
                  Book Session with {profile?.name || "Expert"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-bold truncate">
                {profile?.role || "Tech Expert"} · {profile?.company || "Top Tech"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer focus:outline-none shrink-0"
            aria-label="Close booking modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          
          {/* Duration Selector & Price Preview */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">DURATION</span>
              <div className="flex items-center gap-1.5 mt-1">
                {durationOptions.map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => {
                      setSessionDuration(dur);
                      setSelectedSlot(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      sessionDuration === dur
                        ? "bg-[#2F5FFF] text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
                    }`}
                  >
                    {dur} Mins
                  </button>
                ))}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">TOTAL</span>
              <div className="text-xl font-black text-[#2F5FFF] leading-none mt-1">
                {appliedFreePromo ? "Free" : `₹${displayPrice.toLocaleString("en-IN")}`}
              </div>
            </div>
          </div>

          {/* Promo Code Row */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo code (e.g. MOCK20)"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#2F5FFF]"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              className="px-4 py-2 bg-blue-50 text-[#2F5FFF] hover:bg-blue-100 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>

          {/* Calendar: Month & Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black tracking-wider text-slate-700 uppercase">PICK A DATE</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
                  className="w-6 h-6 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-600"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-black text-slate-800">
                  {currentMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Date buttons carousel */}
            <div ref={carouselRef} className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dates.map((date, idx) => {
                const isSelected = selectedDate === idx;
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDate(idx);
                      setSelectedSlot(null);
                    }}
                    className={`min-w-[56px] text-center px-1 py-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-[#2F5FFF] border-[#2F5FFF] text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-blue-200"
                    }`}
                  >
                    <div className="text-[9px] font-extrabold uppercase opacity-85">
                      {isToday ? "TODAY" : date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="font-black text-base my-0.5 leading-none">{date.getDate()}</div>
                    <div className="text-[8.5px] font-bold uppercase opacity-85">
                      {date.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black tracking-wider text-slate-700 uppercase">AVAILABLE SLOTS</span>
              <span className="text-[10.5px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {currentSlots.length} Slots
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
              {currentSlots.length > 0 ? (
                currentSlots.map((slot, idx) => {
                  const isSelected = selectedSlot?.time === slot.time;
                  const isUnavailable = !slot.available;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        isUnavailable
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                          : isSelected
                            ? "bg-blue-50 border-[#2F5FFF] text-[#2F5FFF] shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 cursor-pointer"
                      }`}
                    >
                      <Clock className="w-3 h-3 text-[#2F5FFF] shrink-0" />
                      <span className="truncate">{slot.time}</span>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-black text-slate-700">No slots available for this date</p>
                  <p className="text-[10.5px] text-slate-400">Please choose another date</p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Slot Summary Alert */}
          {selectedSlot && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="leading-tight">
                  <span className="text-xs font-black text-emerald-950">
                    {dates[selectedDate]?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700 ml-1.5">
                    at {selectedSlot.time}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="text-[10.5px] font-bold text-emerald-700 hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTION */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleBooking}
            disabled={!selectedSlot || isProcessing}
            className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              selectedSlot && !isProcessing
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:shadow-blue-500/35 cursor-pointer active:scale-[0.99]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : selectedSlot ? (
              <>
                <span>
                  {appliedFreePromo
                    ? "Confirm Free Session"
                    : user?.isPremium && ((user.freeInterviewsCount ?? 0) > 0)
                      ? `Book with Credit (${user.freeInterviewsCount} left)`
                      : `Confirm & Pay ₹${displayPrice.toLocaleString("en-IN")}`
                  }
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              "Select a Date & Time Slot"
            )}
          </button>

          <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" /> Secure 256-bit Booking
            </span>
            <span>·</span>
            <span>24h Free Reschedule / Cancellation</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
