import { useEffect, useState, useCallback } from "react";
import axios from '../lib/axios';
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, Calendar as CalendarIcon, Video, CheckCircle2, ExternalLink, Copy, Check, Sparkles } from "lucide-react";
import ExpertPageSkeleton from "./ExpertPageSkeleton";
import { useDataSync } from "../context/SocketContext";
import { toast } from "sonner";

const formatKolkataDateString = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

interface Slot {
  from: string;
  to: string;
}

interface Availability {
  sessionDuration: number;
  allowedDurations?: number[];
  defaultMeetingLink?: string | null;
  maxPerDay: number;
  weekly: Record<string, Slot[]>;
  breakDates: { start: string; end: string }[];
}

interface ProfileState {
  availability: Availability;
}

// Convert "14:30" -> "02:30 PM"
const displayTime = (time24: string) => {
  if (!time24) return "";
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? "PM" : "AM";
  let hour = h % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')} ${period}`;
};

const ViewExpertAvailability = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [copiedLink, setCopiedLink] = useState(false);

  const parseWeeklySlots = useCallback((weeklyData: any) => {
    const weekly: Record<string, Slot[]> = {};
    if (!weeklyData || typeof weeklyData !== 'object') return weekly;

    const timeToMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    Object.keys(weeklyData).forEach(day => {
      if (Array.isArray(weeklyData[day])) {
        weekly[day] = weeklyData[day]
          .map((slot: any) => ({ from: slot.from, to: slot.to }))
          .sort((a: any, b: any) => timeToMinutes(a.from) - timeToMinutes(b.from));
      } else {
        weekly[day] = [];
      }
    });
    return weekly;
  }, []);

  const [profile, setProfile] = useState<ProfileState | null>(() => {
    const passed = (location.state as any)?.savedAvailability;
    if (passed && typeof passed === 'object') {
      const singleDur = Number(passed.sessionDuration) === 60 ? 60 : 30;
      return {
        availability: {
          sessionDuration: singleDur,
          allowedDurations: [singleDur],
          defaultMeetingLink: passed.defaultMeetingLink || null,
          maxPerDay: passed.maxPerDay || 4,
          weekly: parseWeeklySlots(passed.weekly),
          breakDates: passed.breakDates || [],
        }
      };
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!profile);

  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayLabel: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday"
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    try {
      if (!profile) setLoading(true);
      const res = await axios.get("/api/expert/availability");
      const data = res.data?.data;
      if (!data) return;

      const weekly = parseWeeklySlots(data.weekly);
      const singleDuration = Number(data.sessionDuration) === 60 ? 60 : 30;
      setProfile({
        availability: {
          sessionDuration: singleDuration,
          allowedDurations: [singleDuration],
          defaultMeetingLink: data.defaultMeetingLink || null,
          maxPerDay: data.maxPerDay || 4,
          weekly: weekly,
          breakDates: data.breakDates || [],
        }
      });
    } catch (err) {
      console.error("Error fetching availability:", err);
    } finally {
      setLoading(false);
    }
  }

  useDataSync(['AVAILABILITY_UPDATED', 'PROFILE_UPDATED'], () => {
    fetchAvailability();
  });

  const handleCopyMeetLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Google Meet link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return <ExpertPageSkeleton variant="availability" />;
  }

  if (!profile) return null;

  const totalWeeklySlots = Object.values(profile.availability.weekly).reduce(
    (acc, curr) => acc + (curr?.length || 0),
    0
  );

  return (
    <div className="sidebar-main-card relative w-full rounded-2xl border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-5 md:p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-4 animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      {/* Content Layer */}
      <div className="relative z-10 space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Availability &amp; Scheduling
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 text-[11px] font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{totalWeeklySlots > 0 ? "Accepting Bookings" : "Schedule Inactive"}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            View your weekly hours and session preferences.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/availability/edit')}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:py-2 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-[#0755E8]/25 hover:shadow-md cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <span>Edit Availability</span>
        </button>
      </div>

      {/* 2. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left Column: Settings & Blocked Dates */}
        <div className="space-y-4">
          {/* Session Settings Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-[#0755E8] rounded-xl border border-blue-100">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Session Settings
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">PREFERENCES</span>
            </div>

            <div className="space-y-4 text-left">
              {/* Durations Offered */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Durations Offered
                </p>
                <div className="flex gap-2">
                  {profile.availability.allowedDurations?.map(d => (
                    <span
                      key={d}
                      className="px-3.5 py-1.5 bg-blue-50 text-[#0755E8] rounded-xl text-xs font-bold border border-blue-200/80 shadow-2xs inline-flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {d} mins
                    </span>
                  ))}
                </div>
              </div>

              {/* Default Meet Link */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Default Meet Link
                </p>
                {profile.availability.defaultMeetingLink ? (
                  <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <Video className="w-3 h-3 text-emerald-600" /> Google Meet
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyMeetLink(profile.availability.defaultMeetingLink!)}
                        className="text-[#0755E8] hover:text-[#0645C7] text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Copy link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <a
                      href={profile.availability.defaultMeetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#0755E8] hover:underline font-semibold break-all flex items-center gap-1"
                    >
                      <span className="truncate">{profile.availability.defaultMeetingLink}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Not set</p>
                )}
              </div>

              {/* Default Slot Length */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-200/70">
                <span className="text-xs font-semibold text-slate-600">Default Slot Length</span>
                <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {profile.availability.sessionDuration} Minutes
                </span>
              </div>

              {/* Max Sessions / Day */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-200/70">
                <span className="text-xs font-semibold text-slate-600">Max Sessions / Day</span>
                <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {profile.availability.maxPerDay} sessions
                </span>
              </div>
            </div>
          </div>

          {/* Blocked Dates Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Blocked Dates
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {profile.availability.breakDates.length} BLOCKED
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {profile.availability.breakDates.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-medium italic">No dates blocked.</p>
                </div>
              ) : (
                profile.availability.breakDates.map((date, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-rose-50/70 border border-rose-100 px-3.5 py-2.5 rounded-xl text-xs text-rose-800 font-semibold"
                  >
                    <span>{formatKolkataDateString(date.start)}</span>
                    <span className="text-[10px] uppercase font-bold text-rose-600 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                      Unavailable
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Weekly Schedule */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Weekly Schedule</h3>
                <p className="text-xs text-slate-500 mt-0.5">Recurring time slots available for candidate bookings</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-[#0755E8] border border-blue-100">
                {totalWeeklySlots} Active Slots / Week
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {days.map((day) => {
                const slots = profile.availability.weekly[day] || [];
                const isAvailable = slots.length > 0;

                return (
                  <div
                    key={day}
                    className={`py-4 transition-colors rounded-xl px-2.5 ${
                      isAvailable ? 'hover:bg-slate-50/70' : 'opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="w-36 flex items-center gap-2 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className={`text-sm font-bold ${isAvailable ? 'text-slate-900' : 'text-slate-500'}`}>
                          {dayLabel[day]}
                        </span>
                      </div>

                      <div className="flex-1">
                        {!isAvailable ? (
                          <span className="text-xs text-slate-400 font-medium italic">
                            Unavailable
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {slots.map((slot, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs"
                              >
                                <span>{displayTime(slot.from)}</span>
                                <span className="text-slate-400 font-normal">–</span>
                                <span>{displayTime(slot.to)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default ViewExpertAvailability;
