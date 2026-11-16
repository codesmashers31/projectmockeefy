// Test client slot generation with universal 10-minute cutoff rule
const testSlots = () => {
    console.log("Testing client slot generation with universal 10-minute cutoff rule...");

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
        const displayHours = hours % 12 || 12;
        return String(displayHours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + " " + period;
    }

    function formatMinutesToHHMM(totalMinutes) {
        const adjusted = totalMinutes % (24 * 60);
        return String(Math.floor(adjusted / 60)).padStart(2, "0") + ":" + String(adjusted % 60).padStart(2, "0");
    }

    function generateAvailableSlotsForDate(date, availability, sessionDuration = 30, bookedSessions = [], now = new Date()) {
        const kolkataDateStr = "2026-11-19";
        const weekly = availability.weekly || {};
        const weeklyRanges = weekly.thursday || [];
        const generatedSlots = [];
        const duration = Number(sessionDuration) || 30;
        const step = duration;

        weeklyRanges.forEach((range) => {
            let currentMinutes = parseTimeToMinutes(range.from);
            let endMinutes = parseTimeToMinutes(range.to);
            if (endMinutes < currentMinutes) endMinutes += 24 * 60;

            while (currentMinutes + duration <= endMinutes) {
                if (currentMinutes + duration > 24 * 60) break;
                const slotStartStr = formatMinutesToHHMM(currentMinutes);
                const slotDate = new Date(`${kolkataDateStr}T${slotStartStr}:00+05:30`);
                const slotEndDate = new Date(slotDate.getTime() + duration * 60 * 1000);

                const bookingCutoff = new Date(slotEndDate.getTime() - 10 * 60 * 1000);
                if (now.getTime() >= bookingCutoff.getTime()) {
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

    const avail = {
        weekly: {
            thursday: [{ from: "09:00", to: "12:00" }]
        }
    };

    // 1. Clock at 09:10 AM (start 09:00 has passed, but 20 mins remain before 09:30 end)
    const clock1 = new Date("2026-11-19T09:10:00+05:30");
    const slots1 = generateAvailableSlotsForDate(new Date(), avail, 30, [], clock1);
    const hasSlot1 = slots1.some(s => s.time === "09:00 AM - 09:30 AM");
    console.log("  At 09:10 AM, 09:00-09:30 AM slot visible:", hasSlot1, "(Expected: true)");
    if (!hasSlot1) throw new Error("Slot should be visible at 09:10 AM");

    // 2. Clock at 09:19 AM (1 min before cutoff)
    const clock2 = new Date("2026-11-19T09:19:00+05:30");
    const slots2 = generateAvailableSlotsForDate(new Date(), avail, 30, [], clock2);
    const hasSlot2 = slots2.some(s => s.time === "09:00 AM - 09:30 AM");
    console.log("  At 09:19 AM, 09:00-09:30 AM slot visible:", hasSlot2, "(Expected: true)");
    if (!hasSlot2) throw new Error("Slot should be visible at 09:19 AM");

    // 3. Clock at 09:20 AM (Cutoff reached!)
    const clock3 = new Date("2026-11-19T09:20:00+05:30");
    const slots3 = generateAvailableSlotsForDate(new Date(), avail, 30, [], clock3);
    const hasSlot3 = slots3.some(s => s.time === "09:00 AM - 09:30 AM");
    console.log("  At 09:20 AM, 09:00-09:30 AM slot visible:", hasSlot3, "(Expected: false)");
    if (hasSlot3) throw new Error("Slot should NOT be visible at 09:20 AM");

    // 4. 60-min slot at 10:45 AM (end is 11:00 AM, cutoff is 10:50 AM)
    const clock4 = new Date("2026-11-19T10:45:00+05:30");
    const slots4 = generateAvailableSlotsForDate(new Date(), avail, 60, [], clock4);
    const hasSlot4 = slots4.some(s => s.time === "10:00 AM - 11:00 AM");
    console.log("  At 10:45 AM, 60-min 10:00-11:00 AM slot visible:", hasSlot4, "(Expected: true)");
    if (!hasSlot4) throw new Error("60-min slot should be visible at 10:45 AM");

    // 5. 60-min slot at 10:50 AM (Cutoff reached!)
    const clock5 = new Date("2026-11-19T10:50:00+05:30");
    const slots5 = generateAvailableSlotsForDate(new Date(), avail, 60, [], clock5);
    const hasSlot5 = slots5.some(s => s.time === "10:00 AM - 11:00 AM");
    console.log("  At 10:50 AM, 60-min 10:00-11:00 AM slot visible:", hasSlot5, "(Expected: false)");
    if (hasSlot5) throw new Error("60-min slot should NOT be visible at 10:50 AM");

    console.log("✅ All client-side slot generation tests passed successfully!");
};

testSlots();
