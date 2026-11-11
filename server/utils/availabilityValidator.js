import mongoose from 'mongoose';
import ExpertDetails from '../models/expertModel.js';
import Session from '../models/Session.js';

/**
 * Helper to convert HH:MM string into minutes from start of day.
 */
export const timeStringToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) {
        const parts = timeStr.split(':');
        if (parts.length < 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) || 0;
    const period = (match[3] || '').toUpperCase();
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
};

/**
 * Formats a Date object into YYYY-MM-DD string in the specified timezone.
 */
export const getDateStringInTimezone = (date, timezone = 'Asia/Kolkata') => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value;
    const m = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${y}-${m}-${day}`;
};

/**
 * Gets time parts (hours, minutes) of a Date object in the specified timezone.
 */
export const getTimePartsInTimezone = (date, timezone = 'Asia/Kolkata') => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
        hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(d);
    const getPart = (type) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    return {
        hours: getPart('hour') % 24,
        minutes: getPart('minute'),
        seconds: getPart('second')
    };
};

/**
 * Authoritative backend validation of a requested booking slot.
 * Enforces all business rules against current MongoDB state:
 * 1. Future slot verification (slot start time must be in the future).
 * 2. Expert existence and retrieval of latest availability.
 * 3. Timezone awareness (expert configured timezone or Asia/Kolkata default).
 * 4. Blocked / break dates validation.
 * 5. Weekly recurring availability validation (weekday must be enabled and slot within range).
 * 6. Session duration validation against offered durations.
 * 7. Overlap / conflict check against existing booked sessions.
 * 8. Daily session limit (maxPerDay) check.
 *
 * @param {object} params
 * @param {string|object} params.expertId - Expert _id or userId
 * @param {Date|string} params.startTime - Start date/time
 * @param {Date|string} params.endTime - End date/time
 * @param {number} [params.duration] - Session duration in minutes
 * @param {string} [params.excludeSessionId] - Optional session ID to exclude (for rescheduling)
 * @returns {Promise<{ valid: boolean, error?: string, status?: number, expert?: object }>}
 */
export const validateBookingSlot = async ({
    expertId,
    startTime,
    endTime,
    duration,
    excludeSessionId = null
}) => {
    const start = new Date(startTime);
    let end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime())) {
        return { valid: false, error: 'Invalid session start time.', status: 400 };
    }

    // 1. Future Slot Validation:
    // Slot start time must be strictly in the future
    if (start.getTime() <= now.getTime()) {
        return {
            valid: false,
            error: 'Selected time slot has already passed or started. Please choose an upcoming slot.',
            status: 400
        };
    }

    // Determine duration
    let effectiveDuration = Number(duration);
    if (!effectiveDuration || isNaN(effectiveDuration)) {
        if (!isNaN(end.getTime()) && end > start) {
            effectiveDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        } else {
            effectiveDuration = 30;
        }
    }

    if (isNaN(end.getTime()) || end <= start) {
        end = new Date(start.getTime() + effectiveDuration * 60 * 1000);
    }

    // 2. Expert Lookup
    let expert = null;
    if (mongoose.Types.ObjectId.isValid(expertId)) {
        const oid = new mongoose.Types.ObjectId(expertId);
        expert = await ExpertDetails.findOne({ $or: [{ _id: oid }, { userId: oid }] });
    } else {
        expert = await ExpertDetails.findOne({
            $or: [{ expertID: expertId }, { userId: expertId }]
        });
    }

    if (!expert) {
        return { valid: false, error: 'Expert not found.', status: 404 };
    }

    const availability = expert.availability || {};
    const expertTimezone = availability.timezone || 'Asia/Kolkata';

    // 3. Duration Validation: Ensure session duration is offered by expert
    const offeredDurations = Array.isArray(availability.allowedDurations) && availability.allowedDurations.length > 0
        ? availability.allowedDurations
        : [availability.sessionDuration || 30];

    if (!offeredDurations.includes(effectiveDuration)) {
        return {
            valid: false,
            error: `Session duration of ${effectiveDuration} minutes is not offered by this expert. Available: ${offeredDurations.join(', ')} minutes.`,
            status: 400
        };
    }

    // 4. Date & Weekday in Expert's Timezone
    const slotDateStr = getDateStringInTimezone(start, expertTimezone);
    const dayShort = start.toLocaleDateString('en-US', { timeZone: expertTimezone, weekday: 'short' }).toLowerCase();
    const dayLong = start.toLocaleDateString('en-US', { timeZone: expertTimezone, weekday: 'long' }).toLowerCase();

    // 5. Blocked / Break Dates Check
    const breakDates = availability.breakDates || [];
    const isBreak = breakDates.some((b) => {
        const bStart = b?.start ? getDateStringInTimezone(b.start, expertTimezone) : (typeof b === 'string' ? getDateStringInTimezone(b, expertTimezone) : '');
        const bEnd = b?.end ? getDateStringInTimezone(b.end, expertTimezone) : bStart;
        return Boolean(bStart && slotDateStr >= bStart && slotDateStr <= bEnd);
    });

    if (isBreak) {
        return {
            valid: false,
            error: 'The expert has marked this date as unavailable (break / time off). Please choose another date.',
            status: 400
        };
    }

    // 6. Weekly Recurring Schedule Check
    let weekly = availability.weekly || {};
    if (weekly instanceof Map) {
        weekly = Object.fromEntries(weekly);
    }

    const availableKey = Object.keys(weekly).find((k) => {
        const keyLower = k.toLowerCase();
        return keyLower === dayShort || keyLower === dayLong;
    });

    const dayRanges = availableKey ? weekly[availableKey] : [];
    if (!Array.isArray(dayRanges) || dayRanges.length === 0) {
        return {
            valid: false,
            error: `The expert does not have available hours on ${start.toLocaleDateString('en-US', { timeZone: expertTimezone, weekday: 'long' })}s.`,
            status: 400
        };
    }

    // Convert start and end times to minutes from start of day in expert's timezone
    const startParts = getTimePartsInTimezone(start, expertTimezone);
    const slotStartMinutes = startParts.hours * 60 + startParts.minutes;
    const slotEndMinutes = slotStartMinutes + effectiveDuration;

    // Must fit within at least one configured availability range
    const fitsInRange = dayRanges.some((range) => {
        if (!range.from || !range.to) return false;
        const rangeStart = timeStringToMinutes(range.from);
        let rangeEnd = timeStringToMinutes(range.to);
        if (rangeEnd === 0 && rangeStart > 0) rangeEnd = 1440; // midnight
        if (rangeEnd < rangeStart) rangeEnd += 1440;

        return slotStartMinutes >= rangeStart && slotEndMinutes <= rangeEnd;
    });

    if (!fitsInRange) {
        return {
            valid: false,
            error: 'The selected time slot falls outside the expert\'s configured working hours for this day.',
            status: 400
        };
    }

    // 7. Conflicting Bookings Check
    const expertIds = [expert._id, expert.userId, expertId].filter(Boolean);
    const conflictQuery = {
        expertId: { $in: expertIds },
        status: { $in: ['confirmed', 'live', 'upcoming', 'Upcoming', 'pending'] },
        startTime: { $lt: end },
        endTime: { $gt: start }
    };

    if (excludeSessionId) {
        conflictQuery.sessionId = { $ne: excludeSessionId };
        conflictQuery._id = { $ne: excludeSessionId };
    }

    const conflictingSession = await Session.findOne(conflictQuery).lean();
    if (conflictingSession) {
        return {
            valid: false,
            error: 'Slot conflict: This interview slot is already booked. Please choose another slot.',
            status: 409
        };
    }

    // 8. Max Sessions Per Day Check
    const maxPerDay = Number(availability.maxPerDay) || 4;
    // Calculate start and end of that day in UTC corresponding to expert's timezone
    const dayStartProbe = new Date(start);
    dayStartProbe.setUTCHours(0, 0, 0, 0);
    // Find all sessions where date string in expertTimezone matches slotDateStr
    const existingDaySessions = await Session.find({
        expertId: { $in: expertIds },
        status: { $in: ['confirmed', 'live', 'upcoming', 'Upcoming', 'pending'] },
        startTime: {
            $gte: new Date(start.getTime() - 24 * 60 * 60 * 1000),
            $lte: new Date(start.getTime() + 24 * 60 * 60 * 1000)
        }
    }).lean();

    const sameDayCount = existingDaySessions.filter(s => {
        if (excludeSessionId && (s.sessionId === excludeSessionId || s._id?.toString() === excludeSessionId)) {
            return false;
        }
        return getDateStringInTimezone(s.startTime, expertTimezone) === slotDateStr;
    }).length;

    if (sameDayCount >= maxPerDay) {
        return {
            valid: false,
            error: `The expert has reached their maximum limit of ${maxPerDay} sessions for this date.`,
            status: 400
        };
    }

    return {
        valid: true,
        expert,
        effectiveDuration,
        startTime: start,
        endTime: end,
        timezone: expertTimezone
    };
};
