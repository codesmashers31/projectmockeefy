import { useEffect, useState, useRef } from "react";
import axios from '../lib/axios';
import { toast } from "sonner";
import { PrimaryButton } from '../pages/ExpertDashboard';
import { X, Copy, Plus, Clock, Calendar as CalendarIcon, CheckCircle2, ChevronDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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

const getKolkataTodayString = () => {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const year = parts.find(p => p.type === 'year')?.value;
  return `${year}-${month}-${day}`;
};

const getKolkataMaxString = () => {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026', 10) + 5;
  return `${year}-${month}-${day}`;
};

const autoAdjustDateYear = (dateStr: string): string => {
  if (!dateStr) return dateStr;
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const inputMonth = parseInt(parts[1], 10);
  const inputDay = parseInt(parts[2], 10);
  
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const formattedParts = formatter.formatToParts(d);
  const currentYear = parseInt(formattedParts.find(p => p.type === 'year')?.value || '2026', 10);
  const currentMonth = parseInt(formattedParts.find(p => p.type === 'month')?.value || '06', 10);
  const currentDay = parseInt(formattedParts.find(p => p.type === 'day')?.value || '30', 10);
  
  let targetYear = currentYear;
  
  if (inputMonth < currentMonth || (inputMonth === currentMonth && inputDay < currentDay)) {
    targetYear = currentYear + 1;
  }
  
  const mm = inputMonth.toString().padStart(2, '0');
  const dd = inputDay.toString().padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
};

interface CustomSelectOption {
  value: string;
  label: string;
}

function CustomSelect({
  value,
  options,
  onChange,
  className = "",
  align = "left",
}: {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
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

  const handleToggle = () => {
    if (!open) {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 200) {
          setOpenUp(true);
        } else {
          setOpenUp(false);
        }
      }
    }
    setOpen((v) => !v);
  };

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer"
      >
        <span className="text-sm font-semibold text-slate-800 truncate">{selected?.label || ""}</span>
        <ChevronDown size={14} className={`text-slate-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute z-30 min-w-[75px] max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl p-1.5 ${
          align === "right" ? "right-0" : "left-0"
        } ${
          openUp ? "bottom-full mb-2" : "top-full mt-2"
        }`}>
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
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-colors cursor-pointer ${
                  isActive ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span>{option.label}</span>
                {isActive && <Check size={12} className="shrink-0 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomDatePicker({
  value,
  onChange,
  placeholder = "dd-mm-yyyy",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setViewDate(parsed);
      }
    }
  }, [value]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const todayKolkata = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  todayKolkata.setHours(0, 0, 0, 0);

  const maxDate = new Date(todayKolkata);
  maxDate.setFullYear(maxDate.getFullYear() + 5);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    const y = selectedDate.getFullYear();
    const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const d = selectedDate.getDate().toString().padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const displayValue = () => {
    if (!value) return "";
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(i);
  }

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          if (!open) {
            if (dropdownRef.current) {
              const rect = dropdownRef.current.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              if (spaceBelow < 300) {
                setOpenUp(true);
              } else {
                setOpenUp(false);
              }
            }
          }
          setOpen((v) => !v);
        }}
        className="w-full flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-left shadow-sm hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer text-sm font-semibold"
      >
        <span className={displayValue() ? "text-slate-800" : "text-slate-400"}>
          {displayValue() || placeholder}
        </span>
        <CalendarIcon size={16} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className={`absolute z-30 w-64 rounded-xl border border-slate-200 bg-white shadow-xl p-3 left-0 ${
          openUp ? "bottom-full mb-2" : "top-full mt-2"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer flex items-center justify-center"
              >
                <ChevronLeft size={16} className="stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer flex items-center justify-center"
              >
                <ChevronRight size={16} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1.5">
            {weekdays.map((wd) => (
              <div key={wd}>{wd}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const cellDate = new Date(currentYear, currentMonth, day);
              const isPast = cellDate < todayKolkata;
              const isFutureLimit = cellDate > maxDate;
              const isDisabled = isPast || isFutureLimit;

              const selectedParts = value ? value.split('-').map(Number) : [];
              const isSelected = selectedParts.length === 3 &&
                selectedParts[0] === currentYear &&
                selectedParts[1] === (currentMonth + 1) &&
                selectedParts[2] === day;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`aspect-square rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#004fcb] text-white"
                      : isDisabled
                      ? "text-slate-300 cursor-default"
                      : "text-slate-700 hover:bg-blue-50 hover:text-[#004fcb] cursor-pointer"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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

// --- Time Helpers ---

// Convert "14:30" -> { hour: "02", minute: "30", period: "PM" }
const parseTime24 = (time24: string) => {
  if (!time24) return { hour: "09", minute: "00", period: "AM" };
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? "PM" : "AM";
  let hour = h % 12;
  if (hour === 0) hour = 12;
  return {
    hour: hour.toString().padStart(2, '0'),
    minute: m.toString().padStart(2, '0'),
    period
  };
};

// Convert { hour, minute, period } -> "14:30"
const formatTime24 = (hour: string, minute: string, period: string) => {
  let h = parseInt(hour);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minute}`;
};

// Display "14:30" as "02:30 PM"
const displayTime = (time24: string) => {
  if (!time24) return "";
  const { hour, minute, period } = parseTime24(time24);
  return `${hour}:${minute} ${period}`;
};

const TimeSelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [localState, setLocalState] = useState(parseTime24(value));

  useEffect(() => {
    setLocalState(parseTime24(value));
  }, [value]);

  const handleChange = (field: 'hour' | 'minute' | 'period', newVal: string) => {
    const newState = { ...localState, [field]: newVal };
    setLocalState(newState);
    onChange(formatTime24(newState.hour, newState.minute, newState.period));
  };

  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const val = (i + 1).toString().padStart(2, '0');
    return { value: val, label: val };
  });

  const minuteOptions = ["00", "15", "30", "45"].map((m) => ({
    value: m,
    label: m,
  }));

  const periodOptions = [
    { value: "AM", label: "AM" },
    { value: "PM", label: "PM" },
  ];

  return (
    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
      <CustomSelect
        value={localState.hour}
        options={hourOptions}
        onChange={(val) => handleChange('hour', val)}
        className="w-16"
      />
      <span className="text-slate-400 font-extrabold">:</span>
      <CustomSelect
        value={localState.minute}
        options={minuteOptions}
        onChange={(val) => handleChange('minute', val)}
        className="w-16"
      />
      <CustomSelect
        value={localState.period}
        options={periodOptions}
        onChange={(val) => handleChange('period', val)}
        className="w-20"
      />
    </div>
  );
};


const EditExpertAvailability = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileState>({
    availability: {
      sessionDuration: 30,
      maxPerDay: 1,
      weekly: {},
      breakDates: []
    }
  });

  const [selectedBlockDate, setSelectedBlockDate] = useState<string>("");

  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayLabel: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    try {
      const res = await axios.get("/api/expert/availability");
      const data = res.data.data;
      const weekly = data.weekly || {};

      // Ensure structure
      Object.keys(weekly).forEach(day => {
        if (Array.isArray(weekly[day])) {
          weekly[day] = weekly[day].map((slot: any) => ({ from: slot.from, to: slot.to }));
        }
      });

      const allowed = Array.isArray(data.allowedDurations) && data.allowedDurations.length > 0
        ? data.allowedDurations.filter((d: number) => d === 30 || d === 60)
        : (data.sessionDuration === 30 || data.sessionDuration === 60 ? [data.sessionDuration] : [30]);
      setProfile((p) => ({
        ...p,
        availability: {
          sessionDuration: data.sessionDuration || 30,
          allowedDurations: allowed,
          defaultMeetingLink: data.defaultMeetingLink || null,
          maxPerDay: data.maxPerDay || 4,
          weekly: weekly,
          breakDates: data.breakDates || [],
        }
      }));
    } catch (err) {
      console.error("Error fetching availability:", err);
    }
  }

  function calculateEndTime(startTime: string, duration: number) {
    if (!startTime) return "";
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalStartMinutes = hours * 60 + minutes;
    const totalEndMinutes = totalStartMinutes + duration;
    const endHours = Math.floor(totalEndMinutes / 60) % 24;
    const endMinutes = totalEndMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  const addSlotForDay = (day: string) => {
    const currentSlots = profile.availability.weekly[day] || [];
    const maxPerDay = profile.availability.maxPerDay || 4;

    if (currentSlots.length >= maxPerDay) {
      toast.error(`Daily limit reached (${maxPerDay} sessions).`);
      return;
    }

    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      const daySlots = weekly[day] || [];
      let defaultStart = "09:00";
      if (daySlots.length > 0) {
        const lastSlot = daySlots[daySlots.length - 1];
        if (lastSlot.to) {
          defaultStart = lastSlot.to;
        }
      }
      const defaultEnd = calculateEndTime(defaultStart, p.availability.sessionDuration);
      weekly[day] = [...daySlots, { from: defaultStart, to: defaultEnd }];
      return { ...p, availability: { ...p.availability, weekly } };
    });
  };

  const updateSlotForDay = (day: string, idx: number, newStartTime: string) => {
    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      const slots = [...(weekly[day] || [])];
      const endTime = calculateEndTime(newStartTime, p.availability.sessionDuration);
      slots[idx] = { ...slots[idx], from: newStartTime, to: endTime }; // Auto-update end time
      weekly[day] = slots;
      return { ...p, availability: { ...p.availability, weekly } };
    });
  };

  const removeSlotForDay = (day: string, idx: number) => {
    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      weekly[day] = weekly[day].filter((_, i) => i !== idx);
      return { ...p, availability: { ...p.availability, weekly } };
    });
  };

  const copyToAllDays = (sourceDay: string) => {
    const sourceSlots = profile.availability.weekly[sourceDay] || [];
    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      days.forEach(d => {
        if (d !== sourceDay) {
          weekly[d] = [...sourceSlots];
        }
      });
      return { ...p, availability: { ...p.availability, weekly } };
    });
    toast.success("Schedule copied to all days");
  };

  const clearDay = (day: string) => {
    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      weekly[day] = [];
      return { ...p, availability: { ...p.availability, weekly } };
    });
  };

  const clearAllDays = () => {
    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      days.forEach(d => {
        weekly[d] = [];
      });
      return { ...p, availability: { ...p.availability, weekly } };
    });
    toast.success("Cleared successfully");
  };

  // --- Break Dates ---
  const addBreakDate = (dateStr: string) => {
    if (!dateStr) return;

    // Automatically correct the year based on month and day
    const adjustedDateStr = autoAdjustDateYear(dateStr);

    const todayStr = getKolkataTodayString();
    const maxStr = getKolkataMaxString();

    if (adjustedDateStr < todayStr) {
      toast.error("Cannot block a past date.");
      return;
    }
    if (adjustedDateStr > maxStr) {
      toast.error("Cannot block a date more than 5 years in the future.");
      return;
    }

    if (profile.availability.breakDates.some(b => b.start === adjustedDateStr)) {
      toast.error("Date already blocked");
      return;
    }
    setProfile((p) => ({
      ...p,
      availability: {
        ...p.availability,
        breakDates: [...p.availability.breakDates, { start: adjustedDateStr, end: adjustedDateStr }]
      }
    }));
  };

  const removeBreakDate = (idx: number) => {
    setProfile((p) => ({
      ...p,
      availability: {
        ...p.availability,
        breakDates: p.availability.breakDates.filter((_, i) => i !== idx)
      }
    }));
  };

  const handleAutoSaveMeetLink = async (e: React.FocusEvent<HTMLInputElement>) => {
    const rawLink = e.target.value.trim();
    if (rawLink && !/^https?:\/\/meet\.google\.com\//i.test(rawLink)) {
      toast.error("Invalid Google Meet link. Use a meet.google.com URL.");
      return;
    }

    try {
      const payload = {
        defaultMeetingLink: rawLink || null
      };
      await axios.put("/api/expert/availability", payload);
      await queryClient.invalidateQueries({ queryKey: ["expertProfile"] });
      toast.success("Meet link auto-saved!");
    } catch (err) {
      console.error("Auto-save Meet link error:", err);
      const message = (err as any)?.response?.data?.message || "Failed to auto-save Meet link";
      toast.error(message);
    }
  };

  const handleKeyDownMeetLink = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const saveAvailability = async () => {
    try {
      const maxSessions = Number(profile.availability.maxPerDay);
      if (isNaN(maxSessions) || maxSessions < 1 || maxSessions > 24) {
        toast.error("Max Sessions / Day must be a number between 1 and 24.");
        return;
      }

      // Validate slots overlap
      const dayLabelsMap: Record<string, string> = {
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday"
      };

      const timeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      for (const day of Object.keys(profile.availability.weekly)) {
        const daySlots = profile.availability.weekly[day] || [];
        const label = dayLabelsMap[day] || day;
        
        // First sort slots by start time to make validation/checking super clean
        const sortedSlots = [...daySlots].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));

        for (let i = 0; i < sortedSlots.length; i++) {
          const slot = sortedSlots[i];
          const start = timeToMinutes(slot.from);
          const end = timeToMinutes(slot.to);

          if (start >= end) {
            toast.error(`Invalid slot on ${label}: ${displayTime(slot.from)} - ${displayTime(slot.to)} cannot end before it starts.`);
            return;
          }

          if (i > 0) {
            const prevSlot = sortedSlots[i - 1];
            const prevEnd = timeToMinutes(prevSlot.to);
            if (start < prevEnd) {
              toast.error(`Slot overlap on ${label}: The slot ${displayTime(slot.from)} - ${displayTime(slot.to)} overlaps with ${displayTime(prevSlot.from)} - ${displayTime(prevSlot.to)}.`);
              return;
            }
          }
        }
      }

      const payload = JSON.parse(JSON.stringify(profile.availability));
      const link = (payload.defaultMeetingLink || '').toString().trim();
      if (payload.defaultMeetingLink !== undefined) payload.defaultMeetingLink = link || null;
      if (link && !/^https?:\/\/meet\.google\.com\//i.test(link)) {
        toast.error("Invalid Google Meet link. Use a meet.google.com URL.");
        return;
      }
      await axios.put("/api/expert/availability", payload);
      await queryClient.invalidateQueries({ queryKey: ["expertProfile"] });
      toast.success("Availability saved successfully!");
      navigate('/dashboard/availability');
    } catch (err) {
      console.error("Save error:", err);
      const message = (err as any)?.response?.data?.message || "Failed to save availability";
      toast.error(message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Availability & Scheduling</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your weekly hours and session preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/availability')}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <PrimaryButton onClick={saveAvailability}>
            <CheckCircle2 size={18} className="mr-2" />
            Save Changes
          </PrimaryButton>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Settings & Blocked Dates */}
          <div className="space-y-6">

            {/* Global Settings Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Clock size={18} className="text-blue-600" />
                Session Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Durations you offer (candidates see only these)</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(profile.availability.allowedDurations || [profile.availability.sessionDuration]).includes(30)}
                        onChange={(e) => {
                          const current = profile.availability.allowedDurations || [profile.availability.sessionDuration];
                          const next = e.target.checked ? [...current.filter((d: number) => d !== 30), 30] : current.filter((d: number) => d !== 30);
                          if (next.length === 0) return;
                          setProfile(p => ({ ...p, availability: { ...p.availability, allowedDurations: next.sort((a: number, b: number) => a - b) } }));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">30 min</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(profile.availability.allowedDurations || [profile.availability.sessionDuration]).includes(60)}
                        onChange={(e) => {
                          const current = profile.availability.allowedDurations || [profile.availability.sessionDuration];
                          const next = e.target.checked ? [...current.filter((d: number) => d !== 60), 60] : current.filter((d: number) => d !== 60);
                          if (next.length === 0) return;
                          setProfile(p => ({ ...p, availability: { ...p.availability, allowedDurations: next.sort((a: number, b: number) => a - b) } }));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">60 min</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">At least one must be selected. Candidates will only see the options you enable.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Default Google Meet link (auto-attach to new bookings)
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={(profile.availability.defaultMeetingLink || "") as string}
                    onChange={(e) => setProfile(p => ({ ...p, availability: { ...p.availability, defaultMeetingLink: e.target.value } }))}
                    onBlur={handleAutoSaveMeetLink}
                    onKeyDown={handleKeyDownMeetLink}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Optional. If set, every new session booked by a candidate will automatically show this Meet link.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Default slot length (for schedule)</label>
                  <CustomSelect
                    value={String(profile.availability.sessionDuration)}
                    options={[
                      { value: "30", label: "30 Minutes" },
                      { value: "60", label: "60 Minutes" },
                    ]}
                    onChange={(val) => setProfile(p => ({ ...p, availability: { ...p.availability, sessionDuration: Number(val) } }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">Used when generating time slots below.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Max Sessions / Day</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={profile.availability.maxPerDay}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setProfile(p => ({ ...p, availability: { ...p.availability, maxPerDay: "" as any } }));
                        return;
                      }
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) {
                        const clamped = Math.max(1, Math.min(24, num));
                        setProfile(p => ({ ...p, availability: { ...p.availability, maxPerDay: clamped } }));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Blocked Dates Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <CalendarIcon size={18} className="text-red-500" />
                Blocked Dates
              </h3>

              <div className="flex gap-2 mb-4">
                <CustomDatePicker
                  value={selectedBlockDate}
                  onChange={(val) => setSelectedBlockDate(val)}
                  placeholder="dd-mm-yyyy"
                />
                <button
                  onClick={() => {
                    if (selectedBlockDate) {
                      addBreakDate(selectedBlockDate);
                      setSelectedBlockDate("");
                    }
                  }}
                  className="bg-gray-900 hover:bg-black text-white p-2 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {profile.availability.breakDates.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-4">No dates blocked.</p>
                )}
                {profile.availability.breakDates.map((date, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-red-50 border border-red-100 px-3 py-2 rounded-lg text-sm text-red-700">
                    <span>{formatKolkataDateString(date.start)}</span>
                    <button onClick={() => removeBreakDate(idx)} className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Weekly Schedule */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 md:p-5 border-b border-gray-100 bg-white flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Weekly Schedule</h3>
                <div className="flex items-center gap-4">
                  <p className="text-xs text-gray-500 hidden sm:block">Set your recurring availability</p>
                  <button
                    onClick={clearAllDays}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {days.map((day) => {
                  const slots = profile.availability.weekly[day] || [];
                  const isAvailable = slots.length > 0;

                  return (
                    <div key={day} className={`p-4 md:p-5 transition-colors ${isAvailable ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                        {/* Day Label & Toggle */}
                        <div className="w-32 pt-1 flex-shrink-0">
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isAvailable}
                                onChange={() => isAvailable ? clearDay(day) : addSlotForDay(day)}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span className={`font-semibold ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
                              {dayLabel[day]}
                            </span>
                          </div>
                        </div>

                        {/* Slots Area */}
                        <div className="flex-1">
                          {!isAvailable ? (
                            <div className="text-sm text-gray-400 italic pt-1">Unavailable</div>
                          ) : (
                            <div className="space-y-3">
                              {slots.map((slot, idx) => (
                                <div key={idx} className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">

                                  <TimeSelect
                                    value={slot.from}
                                    onChange={(newTime) => updateSlotForDay(day, idx, newTime)}
                                  />

                                  <span className="text-gray-300">-</span>

                                  <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1 text-sm text-gray-500 font-medium w-24 text-center">
                                    {displayTime(slot.to)}
                                  </div>

                                  <button
                                    onClick={() => removeSlotForDay(day, idx)}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors ml-auto sm:ml-0"
                                    title="Remove Slot"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}

                              <div className="flex items-center gap-4 pt-2">
                                <button
                                  onClick={() => addSlotForDay(day)}
                                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                                >
                                  <Plus size={14} /> Add Slot
                                </button>

                                {slots.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => copyToAllDays(day)}
                                      className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
                                      title="Copy this schedule to all other days"
                                    >
                                      <Copy size={12} /> Copy to all
                                    </button>
                                    <button
                                      onClick={() => clearDay(day)}
                                      className="text-xs font-medium text-red-400 hover:text-red-600 flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                                      title={`Clear all slots for ${dayLabel[day]}`}
                                    >
                                      <X size={12} /> Clear Day
                                    </button>
                                  </div>
                                )}
                              </div>
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

export default EditExpertAvailability;
