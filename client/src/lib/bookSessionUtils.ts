
// Helper types and functions (copied from CoachSessionCard to avoid circular deps or complex refactoring for now)
import {
    Code, Users, Briefcase, PenTool, BarChart3, DollarSign, Brain
} from "lucide-react";
import { getProfileImageUrl } from "./imageUtils";

type Category = "IT" | "HR" | "Business" | "Design" | "Marketing" | "Finance" | "AI";

export interface Profile {
    id: string;
    name: string;
    role: string;
    industry: string;
    category: Category;
    avatar: string;
    location: string;
    experience: string;
    skills: string[];
    languages: string[];
    mode: string;
    rating: number;
    reviews: number;
    price: string;
    minPrice?: number;
    responseTime: string;
    successRate: number;
    isVerified: boolean;
    isFeatured?: boolean;
    availableTime?: string;
    company?: string;
    level?: string; // Added level for dynamic pricing
    levels?: string[]; // Added levels for multiple choice
    logo?: string; // BookSessionPage uses logo instead of avatar sometimes? Standardizing on avatar if possible but mapping for safety
    openings?: number;
    availability?: {
        sessionDuration: number;
        /** Durations (minutes) this expert offers. e.g. [30], [60], or [30, 60]. */
        allowedDurations?: number[];
        maxPerDay: number;
        weekly: Record<string, { from: string; to: string }[]>;
        breakDates: any[];
    };
}

export const getKolkataTimeParts = (d: Date = new Date()) => {
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

export const getKolkataDateString = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return '';

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

export const getKolkataToday = () => {
    const parts = getKolkataTimeParts();
    return new Date(parts.year, parts.month, parts.day);
};

export const getInitialKolkataMonth = () => {
    const parts = getKolkataTimeParts();
    return new Date(parts.year, parts.month, 1);
};

export interface AvailableSlot {
    time: string;
    startMinutes: number;
    available: boolean;
}

/**
 * Generates all valid, unbooked available slots for a given date according to expert availability, duration, and booked sessions.
 */
export const generateAvailableSlotsForDate = (
    date: Date,
    availability: any,
    sessionDuration: number = 30,
    bookedSessions: any[] = []
): AvailableSlot[] => {
    if (!availability || !date) return [];

    const kolkataDateStr = getKolkataDateString(date);
    const todayDateStr = getKolkataDateString(new Date());
    // Past dates cannot have available slots
    if (kolkataDateStr < todayDateStr) return [];

    // Break dates check
    const breakDates = availability.breakDates || [];
    const isBreakDate = breakDates.some((b: any) => {
        const bStart = b?.start ? getKolkataDateString(b.start) : (typeof b === 'string' ? getKolkataDateString(b) : '');
        const bEnd = b?.end ? getKolkataDateString(b.end) : bStart;
        return Boolean(bStart && kolkataDateStr >= bStart && kolkataDateStr <= bEnd);
    });
    if (isBreakDate) return [];

    let weekly = availability.weekly || {};
    if (weekly instanceof Map) {
        weekly = Object.fromEntries(weekly);
    }
    const dayShort = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).toLowerCase();
    const dayLong = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).toLowerCase();

    const availableKey = Object.keys(weekly).find(key => {
        const k = key.toLowerCase();
        return k === dayShort || k === dayLong;
    });

    const weeklyRanges = availableKey ? weekly[availableKey] : [];
    if (!Array.isArray(weeklyRanges) || weeklyRanges.length === 0) return [];

    const parseTimeToMinutes = (timeStr: string) => {
        const parts = (timeStr || "").split(":");
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

    const generatedSlots: AvailableSlot[] = [];
    const duration = Number(sessionDuration) || 30;
    const step = duration;

    // Sort ranges by start time
    const sortedRanges = [...weeklyRanges].sort((a: any, b: any) => parseTimeToMinutes(a.from) - parseTimeToMinutes(b.from));

    sortedRanges.forEach((range: { from: string; to: string }) => {
        if (!range.from || !range.to || !range.from.trim() || !range.to.trim()) return;
        let currentMinutes = parseTimeToMinutes(range.from);
        let endMinutes = parseTimeToMinutes(range.to);
        if (endMinutes < currentMinutes) endMinutes += 24 * 60;

        // Snap start time to solid 30-minute block boundaries
        if (currentMinutes % 30 !== 0) {
            currentMinutes = Math.ceil(currentMinutes / 30) * 30;
        }

        while (currentMinutes + duration <= endMinutes) {
            const nowKolkata = getKolkataTimeParts();
            const isToday = kolkataDateStr === todayDateStr;
            const currentTimeMinutes = nowKolkata.hours * 60 + nowKolkata.minutes;

            // Do not display past times today (if start time has passed)
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

            const isBooked = (bookedSessions || []).some((session: any) => {
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

            // If the slot is already booked, omit it completely so it is not shown as available
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
};

/**
 * Returns true if an expert has at least one valid, unbooked available time slot for the date.
 */
export const hasAvailableSlotsForDate = (
    date: Date,
    availability: any,
    sessionDuration: number = 30,
    bookedSessions: any[] = []
): boolean => {
    return generateAvailableSlotsForDate(date, availability, sessionDuration, bookedSessions).length > 0;
};

/**
 * Finds the first month (starting from initial Kolkata month up to maxLookaheadMonths)
 * that contains at least one date with available, bookable slots.
 */
export const getFirstAvailableMonth = (
    availability: any,
    sessionDuration: number = 30,
    bookedSessions: any[] = [],
    maxLookaheadMonths: number = 3
): Date => {
    const initialMonth = getInitialKolkataMonth();
    if (!availability) return initialMonth;

    const todayDateStr = getKolkataDateString(new Date());

    for (let offset = 0; offset <= maxLookaheadMonths; offset++) {
        const candidateMonth = new Date(initialMonth.getFullYear(), initialMonth.getMonth() + offset, 1);
        const parts = getKolkataTimeParts(candidateMonth);
        const year = parts.year;
        const month = parts.month;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let hasSlotsInMonth = false;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = getKolkataDateString(date);
            if (dateStr < todayDateStr) continue;

            if (hasAvailableSlotsForDate(date, availability, sessionDuration, bookedSessions)) {
                hasSlotsInMonth = true;
                break;
            }
        }

        if (hasSlotsInMonth) {
            return candidateMonth;
        }
    }

    return initialMonth;
};

const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const calculateProfessionalExperience = (professionalDetails: any) => {
    if (!professionalDetails?.previous || professionalDetails.previous.length === 0) return null;
    let totalMonths = 0;
    const today = new Date();
    professionalDetails.previous.forEach((job: any) => {
        if (job.start) {
            const startDate = new Date(job.start);
            const endDate = job.end ? new Date(job.end) : today;
            const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                (endDate.getMonth() - startDate.getMonth());
            totalMonths += months;
        }
    });
    const years = Math.floor(totalMonths / 12);
    if (years <= 0) return "Less than 1 year";
    if (years === 1) return "1 year";
    return `${years}+ years`;
};

const getCurrentCompany = (professionalDetails: any, category: string) => {
    if (!professionalDetails?.previous || professionalDetails.previous.length === 0) {
        if (professionalDetails?.company) return professionalDetails.company;
        return `${category} Consultant`;
    }
    const currentJob = professionalDetails.previous.find((job: any) => !job.endDate);
    if (currentJob?.company) return currentJob.company;
    const sortedJobs = [...professionalDetails.previous].sort((a: any, b: any) => {
        const dateA = a.end ? new Date(a.end) : new Date();
        const dateB = b.end ? new Date(b.end) : new Date();
        return dateB.getTime() - dateA.getTime();
    });
    return sortedJobs[0]?.company || professionalDetails?.company || `${category} Consultant`;
};

const getJobTitle = (professionalDetails: any, category: string) => {
    if (professionalDetails?.title) return professionalDetails.title;
    if (!professionalDetails?.previous || professionalDetails.previous.length === 0) return `${category} Expert`;
    const currentJob = professionalDetails.previous.find((job: any) => !job.end);
    if (currentJob?.title) return currentJob.title;
    const sortedJobs = [...professionalDetails.previous].sort((a: any, b: any) => {
        const dateA = a.end ? new Date(a.end) : new Date();
        const dateB = b.end ? new Date(b.end) : new Date();
        return dateB.getTime() - dateA.getTime();
    });
    return sortedJobs[0]?.title || `${category} Expert`;
};

const formatAvailability = (availability: any) => {
    if (!availability) return "Flexible Hours";
    const duration = availability.sessionDuration || 60;
    const maxPerDay = availability.maxPerDay || 1;
    return `${duration} min sessions, up to ${maxPerDay}/day`;
};

const calculatePrice = (experience: string, category: string) => {
    const basePrices: { [key: string]: number } = {
        IT: 500, HR: 400, Business: 600, Design: 450, Marketing: 400, Finance: 550, AI: 700
    };
    const basePrice = basePrices[category] || 500;
    if (experience.includes("Fresher") || experience.includes("Less than")) return `₹${basePrice - 100}/hr`;
    else if (experience.includes("1 year") || experience.includes("2 year")) return `₹${basePrice}/hr`;
    else {
        const yearsMatch = experience.match(/(\d+)\+/);
        if (yearsMatch) {
            const years = parseInt(yearsMatch[1]);
            if (years >= 10) return `₹${basePrice + 300}/hr`;
            else if (years >= 5) return `₹${basePrice + 200}/hr`;
            else return `₹${basePrice + 100}/hr`;
        }
    }
    return `₹${basePrice}/hr`;
};

export const mapExpertToProfile = (expert: any): Profile => {
    const category = expert.personalInformation?.category || "IT";
    let experience = "";
    if (expert.professionalDetails?.totalExperience > 0) {
        experience = expert.professionalDetails.totalExperience === 1 ? "1 year" : `${expert.professionalDetails.totalExperience} years`;
    } else {
        const workExperience = calculateProfessionalExperience(expert.professionalDetails);
        if (workExperience) experience = workExperience;
        else if (expert.personalInformation?.dob) {
            const age = calculateAge(expert.personalInformation.dob);
            const yearsExp = Math.max(0, age - 22);
            experience = yearsExp === 0 ? "Fresher" : yearsExp === 1 ? "1 year" : `${yearsExp}+ years`;
        } else experience = "Experienced Professional";
    }

    const company = getCurrentCompany(expert.professionalDetails, category);
    const role = getJobTitle(expert.professionalDetails, category);
    // Prefer expertSkills (skills with pricing) for booking; fallback to domains/tools
    const expertSkillNames = (expert.expertSkills || [])
        .filter((s: any) => s.isEnabled !== false)
        .map((s: any) => (typeof s.skillId === "object" ? s.skillId?.name : null)).filter(Boolean);
    const legacySkills = [
        ...(expert.skillsAndExpertise?.domains || []),
        ...(expert.skillsAndExpertise?.tools || [])
    ].map((skill: string) => skill.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    const skills = expertSkillNames.length > 0 ? expertSkillNames : (legacySkills.length > 0 ? legacySkills : [category]);

    const languages = (expert.skillsAndExpertise?.languages || []).map((lang: string) => lang.charAt(0).toUpperCase() + lang.slice(1));
    const availableTime = formatAvailability(expert.availability);
    const mode = expert.skillsAndExpertise?.mode || "Online";

    const city = expert.personalInformation?.city || "";
    const state = expert.personalInformation?.state || "";
    const country = expert.personalInformation?.country || "";
    let location = mode;
    if (city && state) location = `${city}, ${state}`;
    else if (state) location = state;
    else if (country) location = country;

    const rawMin = expert.minPrice != null
        ? Number(expert.minPrice)
        : typeof expert.price === "number"
        ? expert.price
        : null;

    const parsedPriceStr = expert.price && expert.price !== "₹—"
        ? (String(expert.price).startsWith('₹') ? String(expert.price) : `₹${expert.price}`)
        : null;

    const price = rawMin != null
        ? `₹${rawMin}`
        : parsedPriceStr
        ? parsedPriceStr
        : expert.pricing?.hourlyRate 
        ? `₹${expert.pricing.hourlyRate}/hr` 
        : calculatePrice(experience, category);

    const minPrice = rawMin ?? (parsedPriceStr ? parseInt(parsedPriceStr.replace(/[^\d]/g, ""), 10) : undefined);
    const rating = expert.metrics?.avgRating || 0;
    const reviews = expert.metrics?.totalReviews || 0;
    const successRate = expert.metrics?.totalSessions > 0 ? Math.round((expert.metrics.completedSessions / expert.metrics.totalSessions) * 100) : 0;
    const responseTime = expert.metrics?.avgResponseTime > 0 ? `${Math.round(expert.metrics.avgResponseTime)} hours` : 'New expert';
    const industry = expert.professionalDetails?.industry || category;
    const avatar = getProfileImageUrl(expert.profileImage);

    const normalizeLevel = (lvl?: string): string => {
        if (!lvl) return "Rising Mentor";
        const lower = String(lvl).toLowerCase().trim();
        if (lower === "beginner") return "Rising Mentor";
        if (lower === "intermediate") return "Professional Mentor";
        if (lower === "advanced") return "Senior Mentor";
        return String(lvl).trim();
    };

    const rawLevels = (Array.isArray(expert.professionalDetails?.levels) && expert.professionalDetails.levels.length > 0)
        ? expert.professionalDetails.levels
        : (Array.isArray(expert.levels) && expert.levels.length > 0)
        ? expert.levels
        : (expert.professionalDetails?.level ? [expert.professionalDetails.level] : (expert.level ? [expert.level] : ["Rising Mentor"]));
    const levels = Array.from(new Set(rawLevels.map(normalizeLevel)));
    const level = normalizeLevel(expert.professionalDetails?.level || expert.level || levels[0] || "Rising Mentor");

    return {
        id: expert._id || expert.userId,
        name: expert.personalInformation?.userName || "Expert",
        role, industry, experience, skills: skills.length > 0 ? skills : ["Interview Coaching"],
        rating, price, minPrice: (minPrice && minPrice > 0) ? minPrice : undefined, category: category as Category, company,
        avatar, location, mode, reviews, responseTime, successRate,
        isVerified: expert.status === "Active",
        availableTime, languages,
        level,
        levels,
        logo: avatar, // Mapping avatar to logo for compatibility
        openings: 5, // Default openings
        availability: expert.availability // Passing raw availability
    };
};
