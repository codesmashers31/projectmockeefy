const axios = require('axios');
const BASE_URL = 'http://localhost:5000';

function getKolkataDateString(d) {
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
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) {
    const parts = timeStr.split(":");
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10) || 0;
  const period = (match[3] || "").toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatMinutesToTime(totalMinutes) {
  const adjusted = totalMinutes % (24 * 60);
  const hours = Math.floor(adjusted / 60);
  const minutes = adjusted % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${displayHours}:${displayMinutes} ${period}`;
}

function formatMinutesToHHMM(totalMinutes) {
  const adjusted = totalMinutes % (24 * 60);
  const hours = Math.floor(adjusted / 60);
  const minutes = adjusted % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function generateAvailableSlotsForDate(date, availability, sessionDuration = 30, bookedSessions = [], now = new Date()) {
  if (!availability || !date) return [];
  const kolkataDateStr = getKolkataDateString(date);
  const todayDateStr = getKolkataDateString(now);
  if (kolkataDateStr < todayDateStr) return [];

  let weekly = availability.weekly || {};
  const dayShort = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).toLowerCase();
  const dayLong = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).toLowerCase();

  const availableKey = Object.keys(weekly).find(key => {
    const k = key.toLowerCase();
    return k === dayShort || k === dayLong;
  });

  const weeklyRanges = availableKey ? weekly[availableKey] : [];
  if (!Array.isArray(weeklyRanges) || weeklyRanges.length === 0) return [];

  const generatedSlots = [];
  const duration = Number(sessionDuration) || 30;
  const step = duration;

  const sortedRanges = [...weeklyRanges].sort((a, b) => parseTimeToMinutes(a.from) - parseTimeToMinutes(b.from));

  sortedRanges.forEach((range) => {
    if (!range.from || !range.to || !range.from.trim() || !range.to.trim()) return;
    let currentMinutes = parseTimeToMinutes(range.from);
    let endMinutes = parseTimeToMinutes(range.to);
    if (endMinutes < currentMinutes) endMinutes += 24 * 60;

    while (currentMinutes + duration <= endMinutes) {
      if (currentMinutes + duration > 24 * 60) break;

      const slotStartStr = formatMinutesToHHMM(currentMinutes);
      const slotDate = new Date(`${kolkataDateStr}T${slotStartStr}:00+05:30`);
      const slotEndDate = new Date(slotDate.getTime() + duration * 60 * 1000);

      const bookingCutoff = new Date(slotEndDate.getTime() - 10 * 60 * 1000);
      const isPastCutoff = now.getTime() >= bookingCutoff.getTime();

      if (isPastCutoff) {
        currentMinutes += step;
        continue;
      }

      const isBooked = (bookedSessions || []).some((session) => {
        const status = (session.status || "").toLowerCase();
        if (status === "cancelled") return false;
        const sStart = new Date(session.startTime);
        const sEnd = new Date(session.endTime);
        if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) return false;
        const startMatches = getKolkataDateString(sStart) === kolkataDateStr;
        const endMatches = getKolkataDateString(sEnd) === kolkataDateStr;
        if (!startMatches && !endMatches) return false;
        return slotDate.getTime() < (sEnd.getTime() - 1000) && slotEndDate.getTime() > (sStart.getTime() + 1000);
      });

      if (isBooked) {
        currentMinutes += step;
        continue;
      }

      const slotStart = formatMinutesToTime(currentMinutes);
      const slotEnd = formatMinutesToTime(currentMinutes + duration);
      const timeStr = `${slotStart} - ${slotEnd}`;
      generatedSlots.push({ time: timeStr, startMinutes: currentMinutes, available: true });
      currentMinutes += step;
    }
  });

  return generatedSlots;
}

async function testAllDates() {
  const expertId = '6ae2e7cf2ad1edd333f2aded';
  const profileRes = await axios.get(`${BASE_URL}/api/expert/public/profile/${expertId}`);
  const availability = profileRes.data.profile.availability;

  const sessionsRes = await axios.get(`${BASE_URL}/api/sessions/expert/${expertId}`);
  const bookedSessions = sessionsRes.data;

  // Let's test from Nov 13, 2026 to Nov 20, 2026 with clock at 8:50 PM IST (Nov 13)
  const clockAfter847 = new Date('2026-11-13T20:50:00+05:30');
  console.log('=== EVALUATING DATES WITH CLOCK AT 8:50 PM IST (Nov 13) ===');

  for (let day = 13; day <= 20; day++) {
    const dt = new Date(`2026-11-${day < 10 ? '0' + day : day}T12:00:00+05:30`);
    const dateStr = getKolkataDateString(dt);
    const dayName = dt.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" });
    const slots = generateAvailableSlotsForDate(dt, availability, 30, bookedSessions, clockAfter847);
    console.log(`${dateStr} (${dayName}): ${slots.length} slots`, slots.map(s => s.time));
  }

  // Also test with clock at 8:30 PM IST (Nov 13)
  const clockBefore847 = new Date('2026-11-13T20:30:00+05:30');
  console.log('\n=== EVALUATING DATES WITH CLOCK AT 8:30 PM IST (Nov 13) ===');

  for (let day = 13; day <= 20; day++) {
    const dt = new Date(`2026-11-${day < 10 ? '0' + day : day}T12:00:00+05:30`);
    const dateStr = getKolkataDateString(dt);
    const dayName = dt.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long" });
    const slots = generateAvailableSlotsForDate(dt, availability, 30, bookedSessions, clockBefore847);
    console.log(`${dateStr} (${dayName}): ${slots.length} slots`, slots.map(s => s.time));
  }
}
testAllDates().catch(console.error);
