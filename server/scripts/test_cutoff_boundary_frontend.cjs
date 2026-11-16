const http = require('http');

function get(url) {
  return new Promise((resolve) => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });
}

function getKolkataTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
  }).formatToParts(date);
  const map = {}; for (const p of parts) map[p.type] = p.value;
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10) - 1,
    day: parseInt(map.day, 10),
    hours: parseInt(map.hour, 10),
    minutes: parseInt(map.minute, 10),
    seconds: parseInt(map.second, 10)
  };
}

function getKolkataDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const parts = getKolkataTimeParts(d);
  const m = String(parts.month + 1).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${m}-${day}`;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function formatMinutesToHHMM(totalMinutes) {
  const adjusted = totalMinutes % (24 * 60);
  return String(Math.floor(adjusted / 60)).padStart(2, '0') + ':' + String(adjusted % 60).padStart(2, '0');
}

function formatMinutesToTime(totalMinutes) {
  const adjusted = totalMinutes % (24 * 60);
  const hours = Math.floor(adjusted / 60);
  const minutes = adjusted % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return String(displayHours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ' ' + period;
}

function generateSlots(date, availability, sessionDuration, bookedSessions, now) {
  const kolkataDateStr = getKolkataDateString(date);
  const weekly = availability.weekly || {};
  const dayShort = date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).toLowerCase();
  const availableKey = Object.keys(weekly).find(key => key.toLowerCase() === dayShort);
  const weeklyRanges = availableKey ? weekly[availableKey] : [];
  const duration = sessionDuration || 30;

  const generatedSlots = [];
  weeklyRanges.forEach(range => {
    let currentMinutes = parseTimeToMinutes(range.from);
    let endMinutes = parseTimeToMinutes(range.to);
    if (endMinutes < currentMinutes) endMinutes += 24 * 60;

    while (currentMinutes + duration <= endMinutes) {
      const slotStartStr = formatMinutesToHHMM(currentMinutes);
      const slotDate = new Date(`${kolkataDateStr}T${slotStartStr}:00+05:30`);
      const slotEndDate = new Date(slotDate.getTime() + duration * 60 * 1000);

      const bookingCutoff = new Date(slotEndDate.getTime() - 10 * 60 * 1000);
      if (now.getTime() >= bookingCutoff.getTime()) {
        currentMinutes += duration;
        continue;
      }

      const slotStart = formatMinutesToTime(currentMinutes);
      const slotEnd = formatMinutesToTime(currentMinutes + duration);
      generatedSlots.push(`${slotStart} - ${slotEnd}`);
      currentMinutes += duration;
    }
  });

  return generatedSlots;
}

async function run() {
  const expertProfileId = '6ae2e7cf2ad1edd333f2aded';
  const res = await get(`http://localhost:5000/api/expert/public/profile/${expertProfileId}`);
  const availability = res.profile.availability;
  const targetDate = new Date(2026, 10, 13); // Friday Nov 13, 2026

  console.log('=== TESTING CANDIDATE FRONTEND SLOT VISIBILITY BOUNDARIES ===');

  const testTimes = [
    { label: '10:39 PM IST', time: '2026-11-13T17:09:00.000Z', expect1030: true, expect1100: true },
    { label: '10:49 PM IST', time: '2026-11-13T17:19:00.000Z', expect1030: true, expect1100: true },
    { label: '10:50 PM IST', time: '2026-11-13T17:20:00.000Z', expect1030: false, expect1100: true },
    { label: '11:19 PM IST', time: '2026-11-13T17:49:00.000Z', expect1030: false, expect1100: true },
    { label: '11:20 PM IST', time: '2026-11-13T17:50:00.000Z', expect1030: false, expect1100: false }
  ];

  let allPassed = true;
  for (const tt of testTimes) {
    const now = new Date(tt.time);
    const slots = generateSlots(targetDate, availability, 30, [], now);
    const has1030 = slots.some(s => s.includes('10:30 PM'));
    const has1100 = slots.some(s => s.includes('11:00 PM'));

    const pass = (has1030 === tt.expect1030) && (has1100 === tt.expect1100);
    if (!pass) allPassed = false;

    console.log(`[${tt.label}] Slots: [${slots.join(', ')}] | 10:30PM: ${has1030} (exp ${tt.expect1030}), 11:00PM: ${has1100} (exp ${tt.expect1100}) -> ${pass ? 'PASS' : 'FAIL'}`);
  }

  console.log(`\nOverall Frontend Slot Visibility Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

run();
