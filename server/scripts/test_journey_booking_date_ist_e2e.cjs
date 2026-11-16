const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const { spawn } = require("child_process");
const jwt = require("jsonwebtoken");
const assert = require("assert");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.off("message", handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.on("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function evalInPage(ws, expression) {
  return sendCdp(ws, "Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  }).then(r => r.result?.value);
}

async function captureScreenshot(ws, filename) {
  const shot = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
  const fullPath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(fullPath, Buffer.from(shot.data, "base64"));
  console.log(`[Screenshot] Saved to ${filename}`);
  return fullPath;
}

// Convert date to YYYY-MM-DD in Asia/Kolkata
function toKolkataYMD(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
}

async function runBookingDateE2E() {
  console.log("==========================================================================");
  console.log("🧪 JOURNEYS 4, 5, 6 & REQ 13: BOOKING DATE & IST E2E PROOF (CDP + DB)");
  console.log("==========================================================================");

  await mongoose.connect(process.env.MONGO_URI);
  
  const User = (await import("../models/User.js")).default;
  const Expert = (await import("../models/expertModel.js")).default;
  const Category = (await import("../models/Category.js")).default;
  const PricingRule = (await import("../models/PricingRule.js")).default;
  const SlotReservation = (await import("../models/SlotReservation.js")).default;
  const Session = (await import("../models/Session.js")).default;
  const Wallet = (await import("../models/Wallet.js")).default;

  const testSuffix = Date.now();

  // Create isolated Category & Pricing Rule (500 INR for 30m)
  const categoryName = `DateCat_${testSuffix}`;
  const catDoc = await Category.create({ name: categoryName, status: "Active" });
  await PricingRule.create({
    categoryId: catDoc._id,
    level: "Rising Mentor",
    duration: 30,
    price: 500
  });

  // Create Candidate
  const candidateUser = await User.create({
    name: "Vikram Malhotra (Date Test)",
    email: `cand_date_${testSuffix}@mockeefy.test`,
    password: "TestPassword123!",
    role: "candidate",
    userType: "candidate",
    walletBalance: 5000
  });

  // Create candidate Wallet in MongoDB
  await Wallet.create({
    userId: candidateUser._id,
    availableBalance: 5000,
    frozenBalance: 0
  });

  // Availability schedule
  const allDaysSchedule = {
    sessionDuration: 30,
    maxPerDay: 10,
    weekly: {
      sunday: [{ from: "09:00", to: "21:00" }],
      monday: [{ from: "09:00", to: "21:00" }],
      tuesday: [{ from: "09:00", to: "21:00" }],
      wednesday: [{ from: "09:00", to: "21:00" }],
      thursday: [{ from: "09:00", to: "21:00" }],
      friday: [{ from: "09:00", to: "21:00" }],
      saturday: [{ from: "09:00", to: "21:00" }]
    }
  };

  // Create Expert A (full availability)
  const expertAUser = await User.create({
    name: "Dr. Evelyn Vance",
    email: `exp_a_${testSuffix}@mockeefy.test`,
    password: "TestPassword123!",
    role: "expert",
    userType: "expert"
  });
  const expertADoc = await Expert.create({
    userId: expertAUser._id,
    name: expertAUser.name,
    personalInformation: { userName: expertAUser.name, category: categoryName },
    professionalDetails: { title: "Lead Systems Architect", company: "Google", level: "Rising Mentor" },
    skillsAndExpertise: { domains: [categoryName] },
    availability: allDaysSchedule,
    isActive: true,
    isApproved: true
  });

  // Create Expert B (NO slots today, but slots tomorrow and future)
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayDayName = dayNames[new Date().getDay()];
  const weeklyB = { ...allDaysSchedule.weekly, [todayDayName]: [] };

  const expertBUser = await User.create({
    name: "Prof. Alan Turing",
    email: `exp_b_${testSuffix}@mockeefy.test`,
    password: "TestPassword123!",
    role: "expert",
    userType: "expert"
  });
  const expertBDoc = await Expert.create({
    userId: expertBUser._id,
    name: expertBUser.name,
    personalInformation: { userName: expertBUser.name, category: categoryName },
    professionalDetails: { title: "Theoretical Computer Scientist", company: "Cambridge", level: "Rising Mentor" },
    skillsAndExpertise: { domains: [categoryName] },
    availability: { sessionDuration: 30, maxPerDay: 10, weekly: weeklyB },
    isActive: true,
    isApproved: true
  });

  const candidateToken = jwt.sign(
    { userId: candidateUser._id, id: candidateUser._id, email: candidateUser.email, role: "candidate", userType: "candidate" },
    process.env.JWT_SECRET || "code@1234",
    { expiresIn: "2h" }
  );

  const cdpPort = 9228;
  console.log(`Launching Chrome headless on debug port ${cdpPort}...`);
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,960"
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const jsonRes = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${cdpPort}/json`, (r) => {
        let raw = "";
        r.on("data", chunk => raw += chunk);
        r.on("end", () => res(JSON.parse(raw)));
      }).on("error", rej);
    });

    const ws = new WebSocket(jsonRes[0]?.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    await sendCdp(ws, "Page.enable");
    await sendCdp(ws, "Runtime.enable");

    // Authenticate candidate
    await sendCdp(ws, "Page.navigate", { url: "http://localhost:5173/" });
    await new Promise(r => setTimeout(r, 1000));

    const candidateUserData = {
      id: candidateUser._id.toString(),
      _id: candidateUser._id.toString(),
      name: candidateUser.name,
      email: candidateUser.email,
      role: "candidate",
      userType: "candidate"
    };

    await evalInPage(ws, `
      localStorage.setItem('token', ${JSON.stringify(candidateToken)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(candidateUserData))});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(candidateUserData))});
    `);

    // =========================================================================
    // TEST CASE A: TODAY WITHOUT AVAILABLE SLOTS (EXPERT B)
    // =========================================================================
    console.log("\n--- TEST CASE A: TODAY WITHOUT AVAILABLE SLOTS (EXPERT B) ---");
    await sendCdp(ws, "Page.navigate", { url: `http://localhost:5173/book-session?expertId=${expertBDoc._id.toString()}` });
    await new Promise(r => setTimeout(r, 4000));

    await captureScreenshot(ws, "evidence_req13_today_no_slots_explanation.png");

    const expertBState = await evalInPage(ws, `
      (() => {
        const text = document.body.innerText;
        const activeDateHeader = document.querySelector('[class*="uppercase tracking-wider"]')?.innerText;
        const explanation = text.includes("No remaining slots available for Today") || text.includes("All openings for today have passed");
        const switchBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Switch to'));
        return { text, explanation, hasSwitchBtn: Boolean(switchBtn), switchBtnText: switchBtn?.innerText };
      })()
    `);

    console.log("Expert B today explanation rendered:", expertBState.explanation);
    console.log("Switch button present:", expertBState.hasSwitchBtn, `("${expertBState.switchBtnText}")`);
    assert.ok(expertBState.explanation, "Must explain that today has no remaining slots without silently changing date");
    assert.ok(expertBState.hasSwitchBtn, "Must suggest next available date with switch button");

    // =========================================================================
    // TEST CASE B: EXPERT SWITCHING PRESERVES INTEGRITY
    // =========================================================================
    console.log("\n--- TEST CASE B: SWITCHING EXPERTS ---");
    await sendCdp(ws, "Page.navigate", { url: `http://localhost:5173/book-session?expertId=${expertADoc._id.toString()}` });
    await new Promise(r => setTimeout(r, 4000));

    await captureScreenshot(ws, "evidence_req13_expert_a_slots_loaded.png");

    const expertAState = await evalInPage(ws, `
      (() => {
        const slotBtns = Array.from(document.querySelectorAll('#time-slots-section button, [class*="min-w-[66px]"] ~ div button')).map(b => b.innerText.trim());
        return { slotCount: slotBtns.length, firstFewSlots: slotBtns.slice(0, 5) };
      })()
    `);
    console.log("Expert A slot count loaded:", expertAState.slotCount, expertAState.firstFewSlots);
    assert.ok(expertAState.slotCount > 0, "Expert A must have active time slots");

    // =========================================================================
    // JOURNEY 4: CANDIDATE SELECTS TODAY AND BOOKS
    // =========================================================================
    console.log("\n--- JOURNEY 4: SELECT TODAY AND BOOK SLOT ---");
    const todayKolkataStr = toKolkataYMD(new Date());
    console.log(`Today in Asia/Kolkata is ${todayKolkataStr}`);

    // Click first available slot
    const slotSelection1 = await evalInPage(ws, `
      (() => {
        const slotBtn = Array.from(document.querySelectorAll('button')).find(b => {
          const txt = b.innerText;
          return (txt.includes('AM') || txt.includes('PM')) && !b.disabled && !txt.includes('Booked');
        });
        if (slotBtn) {
          slotBtn.click();
          return { clicked: true, text: slotBtn.innerText };
        }
        return { clicked: false };
      })()
    `);
    console.log("Clicked slot on today:", slotSelection1);
    assert.ok(slotSelection1.clicked, "A slot for today must be clickable");
    await new Promise(r => setTimeout(r, 1000));

    // Check "Use Mockeefy Wallet" checkbox
    await evalInPage(ws, `
      (() => {
        const walletCb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(cb => {
          return cb.closest('label')?.innerText?.includes('Wallet') || cb.parentElement?.innerText?.includes('Wallet');
        });
        if (walletCb && !walletCb.checked) {
          walletCb.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    // Click Proceed to Checkout / Book button
    await evalInPage(ws, `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Proceed') || b.innerText.includes('Book Interview') || b.innerText.includes('Confirm Booking'));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 4000));

    // Check DB Session created for today
    const sessionToday = await Session.findOne({ candidateId: candidateUser._id }).sort({ createdAt: -1 });
    console.log("Booked Today Session in DB:", sessionToday ? {
      sessionId: sessionToday.sessionId,
      startTime: sessionToday.startTime,
      kolkataDate: toKolkataYMD(sessionToday.startTime)
    } : null);

    assert.ok(sessionToday, "Session for today must be confirmed in DB");
    assert.strictEqual(toKolkataYMD(sessionToday.startTime), todayKolkataStr, "Session startTime date in IST must match today's date");

    // =========================================================================
    // JOURNEY 5: CANDIDATE SELECTS TOMORROW AND BOOKS
    // =========================================================================
    console.log("\n--- JOURNEY 5: SELECT TOMORROW AND BOOK SLOT ---");
    const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowKolkataStr = toKolkataYMD(tomorrowDate);
    console.log(`Tomorrow in Asia/Kolkata is ${tomorrowKolkataStr}`);

    await sendCdp(ws, "Page.navigate", { url: `http://localhost:5173/book-session?expertId=${expertADoc._id.toString()}` });
    await new Promise(r => setTimeout(r, 3500));

    // Click Tomorrow in date carousel (2nd button)
    const tomorrowClick = await evalInPage(ws, `
      (() => {
        const dateBtns = Array.from(document.querySelectorAll('button')).filter(b => b.className.includes('min-w-[66px]'));
        if (dateBtns.length > 1) {
          dateBtns[1].click();
          return { clicked: true, text: dateBtns[1].innerText };
        }
        return { clicked: false };
      })()
    `);
    console.log("Clicked tomorrow button:", tomorrowClick);
    assert.ok(tomorrowClick.clicked, "Tomorrow button must be present in carousel");
    await new Promise(r => setTimeout(r, 1500));

    // Select slot on tomorrow
    await evalInPage(ws, `
      (() => {
        const slotBtn = Array.from(document.querySelectorAll('button')).find(b => {
          const txt = b.innerText;
          return (txt.includes('AM') || txt.includes('PM')) && !b.disabled && !txt.includes('Booked');
        });
        if (slotBtn) slotBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    // Check "Use Mockeefy Wallet" checkbox
    await evalInPage(ws, `
      (() => {
        const walletCb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(cb => {
          return cb.closest('label')?.innerText?.includes('Wallet') || cb.parentElement?.innerText?.includes('Wallet');
        });
        if (walletCb && !walletCb.checked) {
          walletCb.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    // Proceed & Pay
    await evalInPage(ws, `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Proceed') || b.innerText.includes('Book Interview') || b.innerText.includes('Confirm Booking'));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 4000));

    const sessionTomorrow = await Session.findOne({ candidateId: candidateUser._id }).sort({ createdAt: -1 });
    console.log("Booked Tomorrow Session in DB:", sessionTomorrow ? {
      sessionId: sessionTomorrow.sessionId,
      startTime: sessionTomorrow.startTime,
      kolkataDate: toKolkataYMD(sessionTomorrow.startTime)
    } : null);

    assert.ok(sessionTomorrow, "Session for tomorrow must be confirmed in DB");
    assert.strictEqual(toKolkataYMD(sessionTomorrow.startTime), tomorrowKolkataStr, "Session startTime date in IST must match tomorrow's date");

    // =========================================================================
    // JOURNEY 6: CANDIDATE SELECTS FUTURE DATE AND BOOKS
    // =========================================================================
    console.log("\n--- JOURNEY 6: SELECT FUTURE DATE (DAY 4 / INDEX 3) AND BOOK SLOT ---");
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const futureKolkataStr = toKolkataYMD(futureDate);
    console.log(`Future date (index 3, +3 days) in Asia/Kolkata is ${futureKolkataStr}`);

    await sendCdp(ws, "Page.navigate", { url: `http://localhost:5173/book-session?expertId=${expertADoc._id.toString()}` });
    await new Promise(r => setTimeout(r, 3500));

    // Click 4th date button in carousel
    const futureClick = await evalInPage(ws, `
      (() => {
        const dateBtns = Array.from(document.querySelectorAll('button')).filter(b => b.className.includes('min-w-[66px]'));
        if (dateBtns.length > 3) {
          dateBtns[3].click();
          return { clicked: true, text: dateBtns[3].innerText };
        }
        return { clicked: false };
      })()
    `);
    console.log("Clicked future date button:", futureClick);
    assert.ok(futureClick.clicked, "Future date button must be present in carousel");
    await new Promise(r => setTimeout(r, 1500));

    // Select slot on future date
    await evalInPage(ws, `
      (() => {
        const slotBtn = Array.from(document.querySelectorAll('button')).find(b => {
          const txt = b.innerText;
          return (txt.includes('AM') || txt.includes('PM')) && !b.disabled && !txt.includes('Booked');
        });
        if (slotBtn) slotBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    // Check "Use Mockeefy Wallet" checkbox
    await evalInPage(ws, `
      (() => {
        const walletCb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(cb => {
          return cb.closest('label')?.innerText?.includes('Wallet') || cb.parentElement?.innerText?.includes('Wallet');
        });
        if (walletCb && !walletCb.checked) {
          walletCb.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    // Proceed & Pay
    await evalInPage(ws, `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Proceed') || b.innerText.includes('Book Interview') || b.innerText.includes('Confirm Booking'));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 4000));

    const sessionFuture = await Session.findOne({ candidateId: candidateUser._id }).sort({ createdAt: -1 });
    console.log("Booked Future Session in DB:", sessionFuture ? {
      sessionId: sessionFuture.sessionId,
      startTime: sessionFuture.startTime,
      kolkataDate: toKolkataYMD(sessionFuture.startTime)
    } : null);

    assert.ok(sessionFuture, "Session for future date must be confirmed in DB");
    assert.strictEqual(toKolkataYMD(sessionFuture.startTime), futureKolkataStr, "Session startTime date in IST must match future date");

    // =========================================================================
    // STEP 4: VERIFY MY SESSIONS DISPLAY & BROWSER REFRESH PERSISTENCE
    // =========================================================================
    console.log("\n--- STEP 4: VERIFY MY SESSIONS DISPLAY & REFRESH PERSISTENCE ---");
    await sendCdp(ws, "Page.navigate", { url: "http://localhost:5173/my-sessions" });
    await new Promise(r => setTimeout(r, 4000));

    await captureScreenshot(ws, "evidence_req13_my_sessions_initial.png");

    const mySessionsText1 = await evalInPage(ws, "document.body.innerText");
    console.log("My Sessions initial render includes expert name:", mySessionsText1.includes("Dr. Evelyn Vance"));

    // Reload page to test refresh persistence
    console.log("Reloading My Sessions page...");
    await sendCdp(ws, "Page.reload");
    await new Promise(r => setTimeout(r, 4000));

    await captureScreenshot(ws, "evidence_req13_my_sessions_post_refresh.png");

    const mySessionsText2 = await evalInPage(ws, "document.body.innerText");
    assert.ok(mySessionsText2.includes("Dr. Evelyn Vance"), "Expert name must persist after browser refresh in My Sessions");

    console.log("✅ JOURNEYS 4, 5, 6 & REQ 13 PROVEN: Today, Tomorrow, Future Date, Refresh Persistence & IST All Match 100%!");

    ws.close();
  } finally {
    chromeProc.kill();
    await mongoose.disconnect();
  }
}
runBookingDateE2E().catch(console.error);
