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

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(displayH)}:${pad(m)} ${ampm}`;
}

// Emulate client generateAvailableSlotsForDate
function generateSlotsForDay(configuredIntervals, sessionDuration, slotInterval = 30) {
  const duration = sessionDuration || 30;
  const generated = [];

  for (const interval of configuredIntervals) {
    const fromMin = parseTimeToMinutes(interval.from);
    const toMin = parseTimeToMinutes(interval.to);

    for (let slotStartMin = fromMin; slotStartMin + duration <= toMin; slotStartMin += slotInterval) {
      const slotEndMin = slotStartMin + duration;
      const startStr = minutesToTimeString(slotStartMin);
      const endStr = minutesToTimeString(slotEndMin);
      generated.push({
        from: interval.from,
        to: interval.to,
        slotStartMin,
        slotEndMin,
        display: `${startStr} - ${endStr}`,
        intervalStartMin: fromMin,
        intervalEndMin: toMin,
        isCompletelyInside: slotStartMin >= fromMin && slotEndMin <= toMin
      });
    }
  }
  return generated;
}

async function verifyAllDays() {
  const expertProfileId = '6ae2e7cf2ad1edd333f2aded';
  const res = await get(`http://localhost:5000/api/expert/public/profile/${expertProfileId}`);
  const weekly = res.profile.availability.weekly;
  const sessionDuration = res.profile.availability.sessionDuration;

  console.log('Session Duration:', sessionDuration);
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  let allInside = true;

  for (const day of days) {
    const intervals = weekly[day] || [];
    console.log(`\n=== DAY: ${day.toUpperCase()} ===`);
    console.log('Configured Intervals:', JSON.stringify(intervals));
    const slots = generateSlotsForDay(intervals, sessionDuration);
    console.log(`Generated Slots Count: ${slots.length}`);
    for (const slot of slots) {
      console.log(`  Slot: ${slot.display} (${slot.slotStartMin}m - ${slot.slotEndMin}m) inside [${slot.from} (${slot.intervalStartMin}m), ${slot.to} (${slot.intervalEndMin}m)] -> ${slot.isCompletelyInside ? 'PASS' : 'FAIL'}`);
      if (!slot.isCompletelyInside) allInside = false;
    }
  }

  console.log('\nOVERALL RESULT - All slots completely inside configured intervals:', allInside ? 'PASS' : 'FAIL');
}

verifyAllDays();
