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

async function runCertificatesJourney() {
  console.log("==========================================================================");
  console.log("🧪 JOURNEY 2 & 3: CERTIFICATES COMPLETE E2E VERIFICATION (CDP + API + DB)");
  console.log("==========================================================================");

  await mongoose.connect(process.env.MONGO_URI);
  
  const User = (await import("../models/User.js")).default;
  const Session = (await import("../models/Session.js")).default;
  const ReviewDetails = (await import("../models/reviewModel.js")).default;
  const Category = (await import("../models/Category.js")).default;
  const Certification = (await import("../models/Certification.js")).default;

  // Use isolated test candidate
  const testSuffix = Date.now();
  const testCandidate = await User.create({
    name: `Aarav Patel`,
    email: `cand_cert_e2e_${testSuffix}@mockeefy.test`,
    password: "TestPassword123!",
    role: "candidate",
    userType: "candidate"
  });

  const testExpert = await User.create({
    name: `Dr. Evelyn Vance`,
    email: `exp_cert_e2e_${testSuffix}@mockeefy.test`,
    password: "TestPassword123!",
    role: "expert",
    userType: "expert"
  });

  let category = await Category.findOne({ name: "System Design", status: "Active" });
  if (!category) {
    category = await Category.create({ name: "System Design", status: "Active" });
  }

  // Create 4 completed sessions:
  // Session 1: completed, attended, expert review -> QUALIFYING #1
  // Session 2: completed, attended, candidate review -> QUALIFYING #2
  // Session 3: completed, attended, no review yet -> INELIGIBLE (Awaiting feedback)
  // Session 4: completed, attended, no review yet -> INELIGIBLE (Awaiting feedback)
  const sessionDocs = [];
  for (let i = 1; i <= 4; i++) {
    const sId = `ses_journey_${i}_${testSuffix}`;
    const sess = await Session.create({
      sessionId: sId,
      candidateId: testCandidate._id,
      expertId: testExpert._id,
      status: "completed",
      attendanceStatus: "attended",
      candidateJoinedAt: new Date(Date.now() - (120 - i * 10) * 60 * 1000),
      startTime: new Date(Date.now() - (120 - i * 10) * 60 * 1000),
      endTime: new Date(Date.now() - (90 - i * 10) * 60 * 1000),
      duration: 30,
      price: 500,
      category: category.name,
      categoryId: category._id,
      categoryNameSnapshot: category.name,
      topics: [category.name],
      paymentStatus: "paid"
    });
    sessionDocs.push(sess);

    if (i === 1) {
      await ReviewDetails.create({
        sessionId: sId,
        expertId: testExpert._id,
        candidateId: testCandidate._id,
        reviewerRole: "expert",
        overallRating: 5,
        feedback: "Excellent architecture and scalability reasoning."
      });
    } else if (i === 2) {
      await ReviewDetails.create({
        sessionId: sId,
        expertId: testExpert._id,
        candidateId: testCandidate._id,
        reviewerRole: "candidate",
        overallRating: 5,
        feedback: "Superb mentor guidance on microservices."
      });
    }
  }

  const token = jwt.sign(
    { userId: testCandidate._id, id: testCandidate._id, email: testCandidate.email, role: "candidate", userType: "candidate" },
    process.env.JWT_SECRET || "code@1234",
    { expiresIn: "2h" }
  );

  const cdpPort = 9227;
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
      id: testCandidate._id.toString(),
      _id: testCandidate._id.toString(),
      name: testCandidate.name,
      email: testCandidate.email,
      role: "candidate",
      userType: "candidate"
    };

    await evalInPage(ws, `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(candidateUserData))});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(candidateUserData))});
    `);

    // =========================================================================
    // STEP 1: VERIFY 2 ELIGIBLE INTERVIEWS (JOURNEY 2)
    // =========================================================================
    console.log("\n--- STEP 1: VERIFY 2 ELIGIBLE INTERVIEWS (JOURNEY 2) ---");
    await sendCdp(ws, "Page.navigate", { url: "http://localhost:5173/certificates" });
    await new Promise(r => setTimeout(r, 4000));

    await captureScreenshot(ws, "evidence_journey2_2_of_3_eligible.png");

    const pageState1 = await evalInPage(ws, `
      (() => {
        const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.innerText);
        const text = document.body.innerText;
        const cards = Array.from(document.querySelectorAll('[id^="interview-card-"]')).map(el => ({
          text: el.innerText.trim(),
          isQualifying: el.innerText.includes('Qualifying #')
        }));
        return { text, h2s, cards };
      })()
    `);

    console.log("Page H2 headings:", pageState1.h2s);
    console.log("Total interview cards rendered:", pageState1.cards.length);
    const qualifyingCount1 = pageState1.cards.filter(c => c.isQualifying).length;
    console.log("Qualifying cards count:", qualifyingCount1);
    assert.strictEqual(qualifyingCount1, 2, "Candidate must see exactly 2 qualifying interview cards in UI");
    assert.ok(pageState1.text.includes("2 / 3 qualifying interviews completed"), "Must display '2 / 3 qualifying interviews completed'");
    assert.ok(pageState1.text.includes("2 of 3 Qualifying"), "Must display '2 of 3 Qualifying' badge");

    // =========================================================================
    // STEP 2: SUBMIT QUALIFYING FEEDBACK FOR 3RD INTERVIEW (JOURNEY 3)
    // =========================================================================
    console.log("\n--- STEP 2: SUBMIT QUALIFYING FEEDBACK FOR 3RD INTERVIEW (JOURNEY 3) ---");
    const thirdSessionId = sessionDocs[2].sessionId;
    console.log(`Submitting feedback for 3rd session (${thirdSessionId})...`);

    const reviewRes = await fetch(`http://localhost:5000/api/sessions/${thirdSessionId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        reviewerRole: "candidate",
        overallRating: 5,
        feedback: "Outstanding session on distributed consensus and Raft."
      })
    });
    const reviewData = await reviewRes.json();
    console.log("Review submission response:", reviewData.success, reviewData.message);
    assert.ok(reviewData.success, "Feedback submission must succeed");

    // Wait for real-time socket sync or reload
    await new Promise(r => setTimeout(r, 2000));
    await sendCdp(ws, "Page.navigate", { url: "http://localhost:5173/certificates" });
    await new Promise(r => setTimeout(r, 4000));

    await captureScreenshot(ws, "evidence_journey3_3_of_3_ready.png");

    const pageState2 = await evalInPage(ws, `
      (() => {
        const text = document.body.innerText;
        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Confirm Name') || b.innerText.includes('Generate Certificate'));
        const cards = Array.from(document.querySelectorAll('[id^="interview-card-"]')).map(el => ({
          text: el.innerText.trim(),
          isQualifying: el.innerText.includes('Qualifying #')
        }));
        return { text, hasConfirmBtn: Boolean(confirmBtn), cards };
      })()
    `);

    const qualifyingCount2 = pageState2.cards.filter(c => c.isQualifying).length;
    console.log("Updated Qualifying cards count:", qualifyingCount2);
    assert.strictEqual(qualifyingCount2, 3, "Candidate must see exactly 3 qualifying interview cards in UI");
    assert.ok(pageState2.text.includes("CERTIFICATE READY (3/3)") || pageState2.text.includes("3/3 Ready"), "Must indicate 3/3 Milestone Ready");
    assert.ok(pageState2.hasConfirmBtn, "Action button 'Confirm Name & Generate Certificate' must appear");

    // =========================================================================
    // STEP 3: CLICK CONFIRM NAME & GENERATE CERTIFICATE
    // =========================================================================
    console.log("\n--- STEP 3: CONFIRM IDENTITY AND GENERATE CERTIFICATE ---");
    await evalInPage(ws, `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Confirm Name') || b.innerText.includes('Generate Certificate'));
        if (btn) btn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1500));

    // Check the confirmation checkbox inside the modal
    console.log("Checking confirmation checkbox in modal...");
    await evalInPage(ws, `
      (() => {
        const chk = document.querySelector('input[type="checkbox"]');
        if (chk) {
          chk.click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    // Click Confirm button inside confirmation modal
    console.log("Clicking Confirm Name in modal footer...");
    await evalInPage(ws, `
      (() => {
        const modalBtns = Array.from(document.querySelectorAll('button'));
        const issueBtn = modalBtns.find(b => b.innerText.trim() === 'Confirm Name');
        if (issueBtn) issueBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 5000));

    await captureScreenshot(ws, "evidence_journey3_certificate_issued.png");

    // Check MongoDB Certification collection
    const issuedCert = await Certification.findOne({
      userId: testCandidate._id,
      certificateStatus: "ISSUED"
    });
    console.log("MongoDB Issued Certificate:", issuedCert ? {
      certificateId: issuedCert.certificateId,
      name: issuedCert.name,
      milestoneNumber: issuedCert.milestoneNumber,
      qualifyingSessionIds: issuedCert.qualifyingSessionIds
    } : null);

    assert.ok(issuedCert, "Certificate must be officially persisted in MongoDB");
    assert.strictEqual(issuedCert.qualifyingSessionIds.length, 3, "Certificate must lock exactly 3 qualifying session IDs");
    console.log("✅ JOURNEY 2 & 3 COMPLETED AND 100% PROVEN: 2/3 progress -> 3rd feedback -> 3/3 ready -> Certificate issued!");

    ws.close();
  } finally {
    chromeProc.kill();
    await mongoose.disconnect();
  }
}
runCertificatesJourney().catch(console.error);
