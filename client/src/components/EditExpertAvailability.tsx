import { useEffect, useState, useRef } from "react";
import axios from '../lib/axios';
import { toast } from "sonner";
import { PrimaryButton } from '../pages/ExpertDashboard';
import { X, Copy, Plus, Clock, Calendar as CalendarIcon, CheckCircle2, ChevronDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ExpertPageSkeleton from "./ExpertPageSkeleton";

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

const timeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Convert "14:30" -> { hour: "02", minute: "30", period: "PM" }
const parseTime24 = (time24: string) => {
  if (!time24) return { hour: "09", minute: "00", period: "AM" };
  const [h, m] = time24.split(':').map(Number);
  const period = (h || 0) >= 12 ? "PM" : "AM";
  let hour = (h || 0) % 12;
  if (hour === 0) hour = 12;
  return {
    hour: hour.toString().padStart(2, '0'),
    minute: (m || 0).toString().padStart(2, '0'),
    period
  };
};

// Convert { hour, minute, period } -> "14:30"
const formatTime24 = (hour: string, minute: string, period: string) => {
  let h = parseInt(hour, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  const m = parseInt(minute, 10) || 0;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Display "14:30" as "02:30 PM"
const displayTime = (time24: string) => {
  if (!time24) return "";
  const [h, m] = time24.split(':').map(Number);
  const period = (h || 0) >= 12 ? "PM" : "AM";
  let hour = (h || 0) % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')} ${period}`;
};

// Robust parser that analyzes user-typed time string:
// Supports: "10:20", "10.20", "10 20", "1020", "930", "10", "9", "10:20 AM", "10:20pm", "1020pm", "14:30"
const parseTypedTime = (input: string, fallbackPeriod?: 'AM' | 'PM'): { time24: string; period: 'AM' | 'PM' } | null => {
  if (!input) return null;
  const raw = input.trim().toLowerCase();

  // 1. Try separated format: "10:20", "10.20", "10 20", with optional am/pm
  const sepRegex = /^(\d{1,2})[:.\s](\d{1,2})\s*(am|pm)?$/i;
  // 2. Try unseparated 3 or 4 digits: "1020", "0930", "930", "815", with optional am/pm
  const compactRegex = /^(\d{1,2})(\d{2})\s*(am|pm)?$/i;
  // 3. Try plain hour: "10", "9", "2", with optional am/pm
  const hourRegex = /^(\d{1,2})\s*(am|pm)?$/i;

  let hours = 0;
  let minutes = 0;
  let period: string | null = null;

  const matchSep = raw.match(sepRegex);
  if (matchSep) {
    hours = parseInt(matchSep[1], 10);
    minutes = parseInt(matchSep[2], 10);
    period = matchSep[3] ? matchSep[3].toLowerCase() : (fallbackPeriod ? fallbackPeriod.toLowerCase() : null);
  } else {
    const rawNoSep = raw.replace(/\s+/g, '');
    const matchCompact = rawNoSep.match(compactRegex);
    if (matchCompact && rawNoSep.length <= 6) {
      hours = parseInt(matchCompact[1], 10);
      minutes = parseInt(matchCompact[2], 10);
      period = matchCompact[3] ? matchCompact[3].toLowerCase() : (fallbackPeriod ? fallbackPeriod.toLowerCase() : null);
    } else {
      const matchHour = raw.match(hourRegex);
      if (matchHour) {
        hours = parseInt(matchHour[1], 10);
        minutes = 0;
        period = matchHour[2] ? matchHour[2].toLowerCase() : (fallbackPeriod ? fallbackPeriod.toLowerCase() : null);
      } else {
        return null;
      }
    }
  }

  // Validate minutes (0 to 59)
  if (minutes < 0 || minutes > 59) return null;

  let resolvedPeriod: 'AM' | 'PM' = 'AM';

  if (period) {
    if (hours < 1 || hours > 12) return null;
    resolvedPeriod = period === 'pm' ? 'PM' : 'AM';
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
  } else {
    // 24-hour detection or smart fallback
    if (hours >= 13 && hours <= 23) {
      resolvedPeriod = 'PM';
    } else if (hours === 0 || hours === 24) {
      hours = 0;
      resolvedPeriod = 'AM';
    } else if (hours === 12) {
      hours = 12;
      resolvedPeriod = 'PM';
    } else if (hours >= 1 && hours <= 11) {
      resolvedPeriod = fallbackPeriod || 'AM';
      if (resolvedPeriod === 'PM' && hours !== 12) hours += 12;
      if (resolvedPeriod === 'AM' && hours === 12) hours = 0;
    } else {
      return null;
    }
  }

  const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return { time24, period: resolvedPeriod };
};

const getTimeParts = (time24: string): { hour12: string; minute: string; period: 'AM' | 'PM' } => {
  if (!time24) return { hour12: "09", minute: "00", period: "AM" };
  const [h, m] = time24.split(':').map(Number);
  const period: 'AM' | 'PM' = (h || 0) >= 12 ? 'PM' : 'AM';
  let h12 = (h || 0) % 12;
  if (h12 === 0) h12 = 12;
  const hour12 = h12.toString().padStart(2, '0');
  const minute = (m || 0).toString().padStart(2, '0');
  return { hour12, minute, period };
};

const parseAndFormatTime = (
  input: string,
  currentPeriod: 'AM' | 'PM'
): { formatted12: string; time24: string; hours: number; minutes: number } | null => {
  if (!input) return null;
  const raw = input.trim();

  // Strip all spaces and convert dot/dash to colon
  const clean = raw.replace(/\s+/g, '').replace(/[.-]/g, ':').replace(/[^0-9:]/g, '');
  if (!clean) return null;

  let hours = -1;
  let minutes = 0;

  if (clean.includes(':')) {
    const parts = clean.split(':');
    if (parts[0] !== '') hours = parseInt(parts[0], 10);
    if (parts[1] && parts[1] !== '') {
      minutes = parseInt(parts[1].slice(0, 2), 10);
    } else {
      minutes = 0;
    }
  } else {
    if (clean.length === 4) {
      hours = parseInt(clean.slice(0, 2), 10);
      minutes = parseInt(clean.slice(2, 4), 10);
    } else if (clean.length === 3) {
      const firstTwo = parseInt(clean.slice(0, 2), 10);
      if (firstTwo >= 10 && firstTwo <= 12) {
        hours = firstTwo;
        minutes = parseInt(clean.slice(2), 10);
      } else {
        hours = parseInt(clean.slice(0, 1), 10);
        minutes = parseInt(clean.slice(1, 3), 10);
      }
    } else if (clean.length >= 1 && clean.length <= 2) {
      hours = parseInt(clean, 10);
      minutes = 0;
    }
  }

  if (isNaN(hours) || hours < 1 || hours > 12) return null;
  if (isNaN(minutes) || minutes < 0 || minutes > 59) return null;

  const formatted12 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  let h24 = hours;
  if (currentPeriod === 'PM' && hours !== 12) h24 += 12;
  if (currentPeriod === 'AM' && hours === 12) h24 = 0;
  const time24 = `${h24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return { formatted12, time24, hours, minutes };
};

// Automatically and seamlessly formats user input with a colon (e.g. "1130" -> "11:30", "11." -> "11:", "130" -> "1:30")
// Strips extra spaces, prevents accidental digit doubling, and preserves smooth backspacing.
const formatTimeInput = (input: string, isDeleting = false): string => {
  if (!input) return '';

  // Strip all whitespace immediately - prevents awkward "01 : 30"
  let raw = input.replace(/\s+/g, '');

  if (isDeleting) {
    return raw.replace(/[^0-9:]/g, '').slice(0, 5);
  }

  // Convert dot, dash to colon
  let clean = raw.replace(/[.-]/g, ':').replace(/[^0-9:]/g, '').slice(0, 5);

  // If already contains a colon
  if (clean.includes(':')) {
    const parts = clean.split(':');
    let h = parts[0].slice(0, 2);
    let m = parts.slice(1).join('').replace(/:/g, '').slice(0, 2);

    let hNum = parseInt(h, 10);
    if (!isNaN(hNum) && hNum > 12) {
      h = '12';
    }

    return m.length > 0 ? `${h}:${m}` : `${h}:`;
  }

  // Digits only without colon:
  // If 4 digits (e.g. "1130" -> "11:30", "0930" -> "09:30", "1020" -> "10:20")
  if (clean.length === 4) {
    let h = clean.slice(0, 2);
    let m = clean.slice(2, 4);
    let hNum = parseInt(h, 10);
    if (!isNaN(hNum) && hNum > 12) h = '12';
    return `${h}:${m}`;
  }

  // If 3 digits (e.g. "113" -> "11:3", "130" -> "1:30", "930" -> "9:30")
  if (clean.length === 3) {
    const firstTwo = parseInt(clean.slice(0, 2), 10);
    if (firstTwo >= 10 && firstTwo <= 12) {
      return `${clean.slice(0, 2)}:${clean.slice(2)}`;
    } else {
      return `${clean.slice(0, 1)}:${clean.slice(1)}`;
    }
  }

  // If 2 digits (e.g. "11" -> "11:", "10" -> "10:", "12" -> "12:", "09" -> "09:")
  if (clean.length === 2) {
    const num = parseInt(clean, 10);
    if (num >= 10 && num <= 12) {
      return `${clean}:`;
    } else if (clean === '00') {
      return '12:';
    } else if (clean[0] === '0') {
      return `${clean}:`;
    } else if (num > 12) {
      // User typed e.g. "13" (meaning 1:3) or "25" (meaning 2:5)
      return `${clean[0]}:${clean[1]}`;
    }
  }

  return clean;
};

const TimeInputWithPeriod = ({
  value,
  onChange,
  placeholder = "09:00",
  className = "",
}: {
  value: string;
  onChange: (val: string, showToast?: boolean) => boolean | void;
  placeholder?: string;
  className?: string;
}) => {
  const parts = getTimeParts(value);
  const [typedText, setTypedText] = useState(`${parts.hour12}:${parts.minute}`);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parts.period);
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDeletingRef = useRef(false);

  // Sync from outside ONLY when the user is not actively typing
  useEffect(() => {
    if (!isFocused) {
      const p = getTimeParts(value);
      setTypedText(`${p.hour12}:${p.minute}`);
      setPeriod(p.period);
      setHasError(false);
    }
  }, [value, isFocused]);

  const commitTime = (rawText: string, currentPeriod: 'AM' | 'PM') => {
    const parsed = parseAndFormatTime(rawText, currentPeriod);
    if (!parsed) {
      // Revert to valid current state
      const p = getTimeParts(value);
      setTypedText(`${p.hour12}:${p.minute}`);
      setHasError(false);
      return;
    }

    setTypedText(parsed.formatted12);
    if (parsed.time24 !== value) {
      const ok = onChange(parsed.time24, true);
      if (ok === false) {
        // Validation failed (e.g. past 11:30 PM cutoff or overlap):
        // Keep the input text visible so expert can easily correct it, but flag error!
        setHasError(true);
        return;
      }
    }
    setHasError(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatTimeInput(rawVal, isDeletingRef.current);
    isDeletingRef.current = false;

    setTypedText(formatted);
    setHasError(false);

    // Live sync when complete time is typed (e.g. "11:30", "10:20", "01:30", "1:30")
    if (formatted.includes(':')) {
      const [h, m] = formatted.split(':');
      if (h.length >= 1 && m && m.length === 2) {
        const parsed = parseAndFormatTime(formatted, period);
        if (parsed) {
          onChange(parsed.time24, false);
        }
      }
    }
  };

  const handlePeriodToggle = (newPeriod: 'AM' | 'PM') => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    commitTime(typedText, newPeriod);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className={`flex items-center gap-1.5 bg-white border rounded-xl px-2.5 py-1.5 shadow-2xs transition-all ${
        hasError
          ? "border-red-500 ring-2 ring-red-200"
          : "border-slate-200 hover:border-[#0755E8]/60 focus-within:border-[#0755E8] focus-within:ring-2 focus-within:ring-[#0755E8]/15"
      }`}>
        <Clock size={14} className={hasError ? "text-red-500 shrink-0" : "text-slate-400 shrink-0"} />
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInputChange}
          maxLength={5}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            setIsFocused(true);
            setTimeout(() => inputRef.current?.select(), 20);
          }}
          onBlur={() => {
            setIsFocused(false);
            commitTime(typedText, period);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
              isDeletingRef.current = true;
            } else {
              isDeletingRef.current = false;
            }
            if (e.key === "Enter") {
              commitTime(typedText, period);
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          className={`w-14 sm:w-16 text-center text-xs sm:text-sm font-bold bg-transparent outline-none tracking-tight select-all placeholder:text-slate-400 ${
            hasError ? "text-red-600 font-extrabold" : "text-slate-800"
          }`}
        />
      </div>

      <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/90 shadow-2xs">
        <button
          type="button"
          onClick={() => handlePeriodToggle('AM')}
          className={`px-2 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
            period === 'AM'
              ? "bg-[#0755E8] text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
          title="Morning (AM)"
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => handlePeriodToggle('PM')}
          className={`px-2 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
            period === 'PM'
              ? "bg-[#0755E8] text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
          title="Evening (PM)"
        >
          PM
        </button>
      </div>
    </div>
  );
};

const ManualTimeInput = TimeInputWithPeriod;
const TypeableTimeInput = TimeInputWithPeriod;
const TimeSelect = TimeInputWithPeriod;


const EditExpertAvailability = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileState>({
    availability: {
      sessionDuration: 30,
      maxPerDay: 1,
      weekly: {},
      breakDates: []
    }
  });

  const [selectedBlockDate, setSelectedBlockDate] = useState<string>("");
  const [highlightedDay, setHighlightedDay] = useState<string | null>(null);

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

      // Ensure structure and preserve custom to time if present
      const duration = data.sessionDuration || 30;
      Object.keys(weekly).forEach(day => {
        if (Array.isArray(weekly[day])) {
          weekly[day] = weekly[day].map((slot: any) => {
            const from = slot.from || "09:00";
            let to = slot.to || "";
            const startMin = timeToMinutes(from);
            let endMin = timeToMinutes(to);
            if (endMin === 0 && startMin > 0) endMin = 1440;
            if (!to || endMin <= startMin) {
              to = calculateEndTime(from, duration);
            }
            return { from, to };
          }).sort((a: any, b: any) => timeToMinutes(a.from) - timeToMinutes(b.from));
        }
      });

      // Normalize to single duration (prefer sessionDuration if legacy data had both)
      const singleDuration = Number(data.sessionDuration) === 60 ? 60 : 30;
      setProfile((p) => ({
        ...p,
        availability: {
          sessionDuration: singleDuration,
          allowedDurations: [singleDuration],
          defaultMeetingLink: data.defaultMeetingLink || null,
          maxPerDay: data.maxPerDay || 4,
          weekly: weekly,
          breakDates: data.breakDates || [],
        }
      }));
    } catch (err) {
      console.error("Error fetching availability:", err);
      toast.error("Failed to load availability.");
    } finally {
      setLoading(false);
    }
  }

  function calculateEndTime(startTime: string, duration: number) {
    if (!startTime) return "";
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalStartMinutes = (hours || 0) * 60 + (minutes || 0);
    const totalEndMinutes = totalStartMinutes + duration;
    const endHours = Math.floor(totalEndMinutes / 60) % 24;
    const endMinutes = totalEndMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  const getSlotRangeMinutes = (slot: Slot) => {
    const start = timeToMinutes(slot.from);
    let end = timeToMinutes(slot.to);
    if (end === 0 && start > 0) {
      end = 24 * 60; // 1440 (midnight at end of day)
    } else if (end < start) {
      end += 24 * 60;
    }
    return { start, end };
  };

  const minutesToHHMM = (totalMinutes: number): string => {
    const adjusted = ((totalMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(adjusted / 60);
    const minutes = adjusted % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getNextDay = (currentDay: string): string => {
    const idx = days.indexOf(currentDay);
    return days[(idx + 1) % days.length];
  };

  const addSlotForDay = (day: string) => {
    const duration = Number(profile.availability.sessionDuration) === 60 ? 60 : 30;
    const currentSlots = profile.availability.weekly[day] || [];
    const maxPerDay = profile.availability.maxPerDay || 4;
    const maxStartMin = 1440 - duration;
    const lastSlotLabel = duration === 60 ? "11:00 PM – 12:00 AM" : "11:30 PM – 12:00 AM";

    // 1. If day currently has no slots, cleanly start at standard 09:00 AM
    if (currentSlots.length === 0) {
      const from = "09:00";
      const to = calculateEndTime(from, duration);
      setProfile((p) => {
        const weekly = { ...p.availability.weekly };
        weekly[day] = [{ from, to }];
        return { ...p, availability: { ...p.availability, weekly } };
      });
      return;
    }

    // Sort existing slots by start time
    const sorted = [...currentSlots].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));
    const lastSlot = sorted[sorted.length - 1];
    let lastStartMin = timeToMinutes(lastSlot.from);
    let lastEndMin = timeToMinutes(lastSlot.to);
    if (lastEndMin === 0 && lastStartMin > 0) lastEndMin = 1440;

    // 2. CHECK IF CURRENT DAY HAS REACHED THE FINAL PERMITTED SLOT (e.g. 11:30 PM – 12:00 AM)
    // OR CANNOT ACCOMMODATE ANOTHER SLOT BEFORE MIDNIGHT
    const isAtOrPastMidnightCutoff = lastStartMin >= maxStartMin || lastEndMin >= 1440;

    if (isAtOrPastMidnightCutoff) {
      // --- AUTOMATIC NEXT-DAY SCHEDULING ---
      const nextDay = getNextDay(day);
      const nextDayLabel = dayLabel[nextDay] || nextDay;
      const nextDaySlots = profile.availability.weekly[nextDay] || [];

      // Check maxPerDay on next day
      if (nextDaySlots.length >= maxPerDay) {
        toast.error(`The last slot for ${dayLabel[day]} is ${lastSlotLabel}. Cannot add slot to ${nextDayLabel}: daily limit reached (${maxPerDay} sessions).`);
        return;
      }

      let newSlotForNextDay: Slot | null = null;
      const BREAK_DURATION = 30;
      const sortedNext = [...nextDaySlots].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));

      // Continuous availability sequence starting at 12:30 AM (30 min after midnight) with 30-min break intervals
      for (let candStart = BREAK_DURATION; candStart + duration <= 1440; candStart += (duration + BREAK_DURATION)) {
        const candEnd = candStart + duration;

        const overlaps = sortedNext.some((s) => {
          const r = getSlotRangeMinutes(s);
          return candStart < r.end && candEnd > r.start;
        });

        if (!overlaps) {
          newSlotForNextDay = {
            from: minutesToHHMM(candStart),
            to: minutesToHHMM(candEnd)
          };
          break;
        }
      }

      if (!newSlotForNextDay) {
        toast.error(`The last slot for ${dayLabel[day]} is ${lastSlotLabel}. Cannot add slot to ${nextDayLabel}: no available time slots remaining.`);
        return;
      }

      // Add to next day while preserving all existing slots
      setProfile((p) => {
        const weekly = { ...p.availability.weekly };
        const updatedNextDaySlots = [...(weekly[nextDay] || []), newSlotForNextDay!].sort(
          (a, b) => timeToMinutes(a.from) - timeToMinutes(b.from)
        );
        weekly[nextDay] = updatedNextDaySlots;
        return { ...p, availability: { ...p.availability, weekly } };
      });

      // Display clear informational notification as required by business rule
      toast.info(`The last slot for this day is ${lastSlotLabel}. Your next slot has been added to the following day.`);

      // Visually highlight destination day row and scroll into view
      setHighlightedDay(nextDay);
      setTimeout(() => {
        setHighlightedDay((prev) => (prev === nextDay ? null : prev));
      }, 2500);

      setTimeout(() => {
        const el = document.getElementById(`day-row-${nextDay}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);

      return;
    }

    // --- NORMAL SAME-DAY SLOT ADDITION ---
    // Check if current day reached daily capacity
    if (currentSlots.length >= maxPerDay) {
      toast.error(`Daily limit reached on ${dayLabel[day]} (${maxPerDay} sessions).`);
      return;
    }

    const BREAK_DURATION = 30;
    let candStart = lastEndMin + BREAK_DURATION;
    let candEnd = candStart + duration;

    let newSlot: Slot | null = null;
    if (candEnd <= 1440) {
      const overlaps = sorted.some((s) => {
        const r = getSlotRangeMinutes(s);
        return candStart < r.end && candEnd > r.start;
      });
      if (!overlaps) {
        newSlot = {
          from: minutesToHHMM(candStart),
          to: minutesToHHMM(candEnd)
        };
      }
    }

    if (!newSlot) {
      // Find earlier gap on current day with 30-min break
      for (let min = BREAK_DURATION; min + duration <= 1440; min += (duration + BREAK_DURATION)) {
        const cStart = min;
        const cEnd = min + duration;
        const overlaps = sorted.some((s) => {
          const r = getSlotRangeMinutes(s);
          return cStart < r.end && cEnd > r.start;
        });
        if (!overlaps) {
          newSlot = {
            from: minutesToHHMM(cStart),
            to: minutesToHHMM(cEnd)
          };
          break;
        }
      }
    }

    if (!newSlot) {
      toast.error(`No more available slots can be added on ${dayLabel[day]}.`);
      return;
    }

    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      const newSlots = [...(weekly[day] || []), newSlot!].sort(
        (a, b) => timeToMinutes(a.from) - timeToMinutes(b.from)
      );
      weekly[day] = newSlots;
      return { ...p, availability: { ...p.availability, weekly } };
    });
  };

  const toggleDay = (day: string) => {
    const slots = profile.availability.weekly[day] || [];
    if (slots.length > 0) {
      // Currently active -> Clear this day
      clearDay(day);
    } else {
      // Currently off -> Turn ON and cleanly initialize with 09:00 AM
      const duration = Number(profile.availability.sessionDuration) === 60 ? 60 : 30;
      const from = "09:00";
      const to = calculateEndTime(from, duration);
      setProfile((p) => {
        const weekly = { ...p.availability.weekly };
        weekly[day] = [{ from, to }];
        return { ...p, availability: { ...p.availability, weekly } };
      });
    }
  };

  const updateSlotStartTimeForDay = (day: string, idx: number, newStartTime: string, showToast = true): boolean => {
    const slots = profile.availability.weekly[day] || [];
    const currentSlot = slots[idx];
    if (!currentSlot) return false;

    // Automatically compute end time based on the interval the expert selected (30m or 60m)
    const duration = Number(profile.availability.sessionDuration) === 60 ? 60 : 30;
    const startMin = timeToMinutes(newStartTime);
    const maxStartMin = 1440 - duration;
    const lastSlotLabel = duration === 60 ? "11:00 PM – 12:00 AM" : "11:30 PM – 12:00 AM";

    // Strict daily cutoff: Reject any slot starting after 11:30 PM (or 11:00 PM for 60m)
    if (startMin > maxStartMin) {
      if (showToast) {
        toast.error(`${lastSlotLabel} is the last available slot of the day. You cannot add another slot after this time. Please select a slot on the next day.`);
      }
      return false;
    }

    const newEndTime = calculateEndTime(newStartTime, duration);
    let endMin = timeToMinutes(newEndTime);
    if (endMin === 0 && startMin > 0) endMin = 1440;

    // Strict daily cutoff: Slot cannot cross midnight into the next day
    if (endMin > 1440) {
      if (showToast) {
        toast.error(`${lastSlotLabel} is the last available slot of the day. You cannot add another slot after this time. Please select a slot on the next day.`);
      }
      return false;
    }

    // Check overlap with other slots on this day
    const otherSlots = slots.filter((_, i) => i !== idx);
    const hasOverlap = otherSlots.some((s) => {
      const r = getSlotRangeMinutes(s);
      return startMin < r.end && endMin > r.start;
    });

    if (hasOverlap) {
      if (showToast) {
        toast.error(`Slot ${displayTime(newStartTime)} - ${displayTime(newEndTime)} overlaps with another slot on ${dayLabel[day] || day}`);
      }
      return false;
    }

    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      const currentSlots = [...(weekly[day] || [])];
      currentSlots[idx] = { from: newStartTime, to: newEndTime };
      weekly[day] = currentSlots;
      return { ...p, availability: { ...p.availability, weekly } };
    });
    return true;
  };

  const updateSlotEndTimeForDay = (day: string, idx: number, newEndTime: string): boolean => {
    const slots = profile.availability.weekly[day] || [];
    const currentSlot = slots[idx];
    if (!currentSlot) return false;

    const startMin = timeToMinutes(currentSlot.from);
    let endMin = timeToMinutes(newEndTime);
    if (endMin === 0 && startMin > 0) endMin = 1440;

    if (endMin <= startMin) {
      toast.error(`End time (${displayTime(newEndTime)}) must be after start time (${displayTime(currentSlot.from)})`);
      return false;
    }

    // Check overlap with other slots on this day
    const otherSlots = slots.filter((_, i) => i !== idx);
    const hasOverlap = otherSlots.some((s) => {
      const r = getSlotRangeMinutes(s);
      return startMin < r.end && endMin > r.start;
    });

    if (hasOverlap) {
      toast.error(`Slot ${displayTime(currentSlot.from)} - ${displayTime(newEndTime)} overlaps with another slot on ${dayLabel[day] || day}`);
      return false;
    }

    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      const currentSlots = [...(weekly[day] || [])];
      currentSlots[idx] = { from: currentSlot.from, to: newEndTime };
      weekly[day] = currentSlots;
      return { ...p, availability: { ...p.availability, weekly } };
    });
    return true;
  };

  const updateSlotRangeForDay = (day: string, idx: number, newStartTime: string, newEndTime: string): boolean => {
    const slots = profile.availability.weekly[day] || [];
    const currentSlot = slots[idx];
    if (!currentSlot) return false;

    const startMin = timeToMinutes(newStartTime);
    let endMin = timeToMinutes(newEndTime);
    if (endMin === 0 && startMin > 0) endMin = 1440;

    if (endMin <= startMin) {
      toast.error(`End time (${displayTime(newEndTime)}) must be after start time (${displayTime(newStartTime)})`);
      return false;
    }

    // Check overlap with other slots on this day
    const otherSlots = slots.filter((_, i) => i !== idx);
    const hasOverlap = otherSlots.some((s) => {
      const r = getSlotRangeMinutes(s);
      return startMin < r.end && endMin > r.start;
    });

    if (hasOverlap) {
      toast.error(`Slot ${displayTime(newStartTime)} - ${displayTime(newEndTime)} overlaps with another slot on ${dayLabel[day] || day}`);
      return false;
    }

    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      const currentSlots = [...(weekly[day] || [])];
      currentSlots[idx] = { from: newStartTime, to: newEndTime };
      weekly[day] = currentSlots;
      return { ...p, availability: { ...p.availability, weekly } };
    });
    return true;
  };

  const updateSlotDurationForDay = (day: string, idx: number, newDuration: 30 | 60) => {
    setProfile((p) => {
      const weekly = { ...p.availability.weekly };
      const slots = [...(weekly[day] || [])];
      const currentSlot = slots[idx];
      if (!currentSlot) return p;

      const newEndTime = calculateEndTime(currentSlot.from, newDuration);
      const startMin = timeToMinutes(currentSlot.from);
      let endMin = timeToMinutes(newEndTime);
      if (endMin === 0 && startMin > 0) endMin = 1440;

      // Check overlap with other slots on this day
      const otherSlots = slots.filter((_, i) => i !== idx);
      const hasOverlap = otherSlots.some((s) => {
        const r = getSlotRangeMinutes(s);
        return startMin < r.end && endMin > r.start;
      });

      if (hasOverlap) {
        toast.error(`Changing this slot to ${newDuration} mins overlaps with another slot on ${dayLabel[day] || day}`);
        return p;
      }

      slots[idx] = { from: currentSlot.from, to: newEndTime };
      slots.sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));
      weekly[day] = slots;
      return { ...p, availability: { ...p.availability, weekly } };
    });
  };

  // Single-selection session duration handler: strictly synchronizes offered duration and default slot length
  const handleSelectDuration = (newDur: 30 | 60) => {
    setProfile(p => ({
      ...p,
      availability: {
        ...p.availability,
        sessionDuration: newDur,
        allowedDurations: [newDur],
      }
    }));
  };

  // Alias for backward compatibility
  const updateSlotForDay = updateSlotStartTimeForDay;

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

      const duration = Number(profile.availability.sessionDuration) === 60 ? 60 : 30;
      const maxStartMin = 1440 - duration;
      const lastSlotLabel = duration === 60 ? "11:00 PM – 12:00 AM" : "11:30 PM – 12:00 AM";

      // Validate slots overlap, strict midnight cutoff, and session duration limits
      for (const day of Object.keys(profile.availability.weekly)) {
        const daySlots = profile.availability.weekly[day] || [];
        const label = dayLabel[day] || day;

        if (daySlots.length > maxSessions) {
          toast.error(`Daily limit exceeded on ${label}: max ${maxSessions} sessions allowed.`);
          return;
        }

        // First sort slots by start time to make validation/checking super clean
        const sortedSlots = [...daySlots].sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));

        for (let i = 0; i < sortedSlots.length; i++) {
          const slot = sortedSlots[i];
          const start = timeToMinutes(slot.from);
          let end = timeToMinutes(slot.to);
          if (end === 0 && start > 0) {
            end = 1440; // 12:00 AM (midnight)
          }

          // Strict daily cutoff check
          if (start > maxStartMin) {
            toast.error(`${lastSlotLabel} is the last available slot of the day. Slot ${displayTime(slot.from)} on ${label} begins after this time. Please select a slot on the next day.`);
            return;
          }

          // Strict midnight boundary: cannot cross midnight into next day
          if (end > 1440) {
            toast.error(`Slot ${displayTime(slot.from)} - ${displayTime(slot.to)} on ${label} cannot cross midnight into the next day.`);
            return;
          }

          if (start >= end) {
            toast.error(`Invalid slot on ${label}: ${displayTime(slot.from)} - ${displayTime(slot.to)} cannot end before it starts.`);
            return;
          }

          if (i > 0) {
            const prevSlot = sortedSlots[i - 1];
            let prevEnd = timeToMinutes(prevSlot.to);
            if (prevEnd === 0 && timeToMinutes(prevSlot.from) > 0) {
              prevEnd = 1440;
            }
            if (start < prevEnd) {
              toast.error(`Slot overlap on ${label}: The slot ${displayTime(slot.from)} - ${displayTime(slot.to)} overlaps with ${displayTime(prevSlot.from)} - ${displayTime(prevSlot.to)}.`);
              return;
            }
          }
        }
      }

      const payload = JSON.parse(JSON.stringify(profile.availability));
      if (payload.weekly) {
        Object.keys(payload.weekly).forEach(day => {
          if (Array.isArray(payload.weekly[day])) {
            payload.weekly[day].sort((a: Slot, b: Slot) => timeToMinutes(a.from) - timeToMinutes(b.from));
          }
        });
      }
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

  if (loading) return <ExpertPageSkeleton variant="availability" />;

  return (
    <div className="sidebar-main-card relative w-full max-w-[1400px] mx-auto rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-8 animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Availability &amp; Scheduling</h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Configure your weekly hours and session preferences.</p>
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

        {/* Content */}
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Durations you offer (candidates see only this)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-w-sm">
                    <label
                      onClick={() => handleSelectDuration(30)}
                      className={`flex items-center gap-2 py-2 px-2.5 sm:px-3 rounded-xl border transition-all cursor-pointer ${
                        profile.availability.sessionDuration === 30
                          ? "border-[#0755E8] bg-blue-50/80 shadow-2xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sessionDurationRadio"
                        value="30"
                        checked={profile.availability.sessionDuration === 30}
                        onChange={() => handleSelectDuration(30)}
                        className="w-3.5 h-3.5 text-[#0755E8] border-slate-300 focus:ring-[#0755E8] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={`text-xs sm:text-sm font-bold block leading-tight whitespace-nowrap ${
                          profile.availability.sessionDuration === 30 ? "text-[#0755E8]" : "text-slate-800"
                        }`}>
                          30 min
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block leading-tight whitespace-nowrap">
                          Half Hour
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => handleSelectDuration(60)}
                      className={`flex items-center gap-2 py-2 px-2.5 sm:px-3 rounded-xl border transition-all cursor-pointer ${
                        profile.availability.sessionDuration === 60
                          ? "border-[#0755E8] bg-blue-50/80 shadow-2xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sessionDurationRadio"
                        value="60"
                        checked={profile.availability.sessionDuration === 60}
                        onChange={() => handleSelectDuration(60)}
                        className="w-3.5 h-3.5 text-[#0755E8] border-slate-300 focus:ring-[#0755E8] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={`text-xs sm:text-sm font-bold block leading-tight whitespace-nowrap ${
                          profile.availability.sessionDuration === 60 ? "text-[#0755E8]" : "text-slate-800"
                        }`}>
                          60 min
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block leading-tight whitespace-nowrap">
                          One Hour
                        </span>
                      </div>
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Select exactly one duration. Candidates booking your sessions will only see this duration.
                  </p>
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
                      { value: "30", label: "30 Minutes (Half Hour)" },
                      { value: "60", label: "60 Minutes (One Hour)" },
                    ]}
                    onChange={(val) => {
                      const newDur = Number(val) === 60 ? 60 : 30;
                      handleSelectDuration(newDur);
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">Synchronized with your offered duration. Used when generating new time slots.</p>
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
                    <div
                      key={day}
                      id={`day-row-${day}`}
                      className={`p-4 md:p-5 transition-all duration-500 rounded-xl ${
                        highlightedDay === day
                          ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-md'
                          : isAvailable
                          ? 'bg-white'
                          : 'bg-gray-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                        {/* Day Label & Toggle */}
                        <div className="w-32 pt-1 flex-shrink-0">
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isAvailable}
                                onChange={() => toggleDay(day)}
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
                                <div key={`${day}-${idx}`} className="flex flex-wrap items-center gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    {/* 1. Start Time Input with nearby AM/PM toggle */}
                                    <TimeInputWithPeriod
                                      value={slot.from}
                                      onChange={(newTime, showToast) => updateSlotStartTimeForDay(day, idx, newTime, showToast)}
                                      placeholder="09:00"
                                    />

                                    <span className="text-slate-400 font-bold px-0.5 select-none">-</span>

                                    {/* 2. End Time (Read-only / Fixed by the selected interval) */}
                                    <div
                                      className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-600 select-none shadow-2xs"
                                      title={`Fixed end time (${Number(profile.availability.sessionDuration) === 60 ? "60" : "30"} mins interval)`}
                                    >
                                      <Clock size={14} className="text-slate-400 shrink-0" />
                                      <span className="tracking-tight">{displayTime(slot.to)}</span>
                                    </div>
                                  </div>

                                  {/* 3. Remove Slot */}
                                  <button
                                    type="button"
                                    onClick={() => removeSlotForDay(day, idx)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto sm:ml-0 cursor-pointer"
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
