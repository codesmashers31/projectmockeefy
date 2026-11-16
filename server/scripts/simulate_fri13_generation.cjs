const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function getKolkataTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(date);

  const map = {};
  for (const p of parts) map[p.type] = p.value;
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

function testSlots(date, availability, sessionDuration, bookedSessions, now) {
  console.log('Testing slots for date:', date.toString());
  console.log('now:', now.toISOString(), 'Kolkata now:', now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  const kolkataDateStr = getKolkataDateString(date);
  const todayDateStr = getKolkataDateString(now);
  console.log('kolkataDateStr:', kolkataDateStr, 'todayDateStr:', todayDateStr);

  const dayShort = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).toLowerCase();
  const dayLong = date.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).toLowerCase();
  console.log('dayShort:', dayShort, 'dayLong:', dayLong);

  const weekly = availability.weekly || {};
  const availableKey = Object.keys(weekly).find(key => {
    const k = key.toLowerCase();
    return k === dayShort || k === dayLong;
  });
  console.log('availableKey:', availableKey);

  const weeklyRanges = availableKey ? weekly[availableKey] : [];
  console.log('weeklyRanges:', JSON.stringify(weeklyRanges));

  const duration = sessionDuration || 30;
  const sortedRanges = [...weeklyRanges].sort((a, b) => parseTimeToMinutes(a.from) - parseTimeToMinutes(b.from));

  const generatedSlots = [];

  sortedRanges.forEach(range => {
    let currentMinutes = parseTimeToMinutes(range.from);
    let endMinutes = parseTimeToMinutes(range.to);
    if (endMinutes < currentMinutes) endMinutes += 24 * 60;

    while (currentMinutes + duration <= endMinutes) {
      const slotStartStr = formatMinutesToHHMM(currentMinutes);
      const slotDate = new Date(`${kolkataDateStr}T${slotStartStr}:00+05:30`);
      const slotEndDate = new Date(slotDate.getTime() + duration * 60 * 1000);

      const bookingCutoff = new Date(slotEndDate.getTime() - 10 * 60 * 1000);
      const effectiveDeadline = Math.min(slotDate.getTime(), bookingCutoff.getTime());

      console.log(`\nEvaluating slot ${slotStartStr}:`);
      console.log(`  slotDate: ${slotDate.toISOString()} (${slotDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })})`);
      console.log(`  slotEndDate: ${slotEndDate.toISOString()} (${slotEndDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })})`);
      console.log(`  effectiveDeadline: ${new Date(effectiveDeadline).toISOString()} (${new Date(effectiveDeadline).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })})`);
      console.log(`  now.getTime() >= effectiveDeadline: ${now.getTime()} >= ${effectiveDeadline} -> ${now.getTime() >= effectiveDeadline}`);

      if (now.getTime() >= effectiveDeadline) {
        console.log('  -> EXPIRED because now >= effectiveDeadline');
        currentMinutes += duration;
        continue;
      }

      console.log('  -> VALID & BOOKABLE');
      generatedSlots.push({
        time: `${formatMinutesToTime(currentMinutes)} - ${formatMinutesToTime(currentMinutes + duration)}`,
        available: true
      });
      currentMinutes += duration;
    }
  });

  console.log('\nFinal generated slots:', generatedSlots);
}

async function run() {
  const expertProfileId = '6ae2e7cf2ad1edd333f2aded';
  const res = await get(`http://localhost:5000/api/expert/public/profile/${expertProfileId}`);
  const availability = res.profile.availability;
  
  // Test with current real time (around 22:15 IST)
  const now = new Date();
  
  // Date being evaluated in BookSessionPage:
  const year = 2026;
  const month = 10; // November (0-indexed)
  const day = 13;
  const dateToEvaluate = new Date(year, month, day);

  console.log('=== TEST 1: evaluating new Date(2026, 10, 13) with current now ===');
  testSlots(dateToEvaluate, availability, 30, [], now);

  // Test at 22:13 IST specifically
  const testNow2213 = new Date('2026-11-13T22:13:00+05:30');
  console.log('\n=== TEST 2: evaluating at 22:13:00 IST ===');
  testSlots(dateToEvaluate, availability, 30, [], testNow2213);
}

run();
