const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");
const { spawn } = require("child_process");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

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

async function inspectCertificatesPage() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const cid = "6af326acf549d9aa26049ba4"; // Joel
  const user = await mongoose.connection.collection("users").findOne({ _id: new mongoose.Types.ObjectId(cid) });
  console.log("Candidate User:", user?.name, user?.email);

  const token = jwt.sign(
    { userId: user._id, id: user._id, email: user.email, role: "candidate", userType: "candidate" },
    process.env.JWT_SECRET || "code@1234",
    { expiresIn: "2h" }
  );

  const cdpPort = 9226;
  console.log(`Launching Chrome headless on port ${cdpPort}...`);
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

    const pageWsUrl = jsonRes[0]?.webSocketDebuggerUrl;
    const ws = new WebSocket(pageWsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    await sendCdp(ws, "Page.enable");
    await sendCdp(ws, "Runtime.enable");

    // Navigate to root to set token in localStorage
    await sendCdp(ws, "Page.navigate", { url: "http://localhost:5173/" });
    await new Promise(r => setTimeout(r, 1000));

    const candidateUserData = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: "candidate",
      userType: "candidate"
    };

    await evalInPage(ws, `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(candidateUserData))});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(candidateUserData))});
    `);

    // Navigate to Certificates page
    console.log("Navigating to http://localhost:5173/certificates...");
    await sendCdp(ws, "Page.navigate", { url: "http://localhost:5173/certificates" });
    await new Promise(r => setTimeout(r, 4000));

    // Capture screenshot
    const shotResult = await sendCdp(ws, "Page.captureScreenshot", { format: "png" });
    const fs = require("fs");
    fs.writeFileSync(
      "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c\\evidence_cert_page_joel_2_interviews.png",
      Buffer.from(shotResult.data, "base64")
    );
    console.log("Captured screenshot to evidence_cert_page_joel_2_interviews.png");

    const pageDetails = await evalInPage(ws, `
      (() => {
        const interviewCards = Array.from(document.querySelectorAll('[id^="interview-card-"]')).map(el => ({
          text: el.innerText.trim(),
          isQualifying: el.innerText.includes('Qualifying #')
        }));
        return {
          bodyText: document.body.innerText,
          dropdownButtonText: Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-haspopup') === 'listbox')?.innerText,
          allH2: Array.from(document.querySelectorAll('h2')).map(h => h.innerText),
          interviewCards
        };
      })()
    `);

    console.log("Dropdown button text:", pageDetails.dropdownButtonText);
    console.log("All H2:", pageDetails.allH2);
    console.log("Interview Cards rendered:", pageDetails.interviewCards.length);
    pageDetails.interviewCards.forEach((c, i) => {
      console.log(`  Card ${i + 1} (isQualifying=${c.isQualifying}):`, c.text.replace(/\n+/g, " | "));
    });

    const lines = pageDetails.bodyText.split("\n").map(l => l.trim()).filter(Boolean);
    console.log("\nKey Lines found on page:");
    lines.forEach(l => {
      if (l.includes("qualifying") || l.includes("Completed") || l.includes("completed") || l.includes("Milestone") || l.includes("Full Stack") || l.includes("MERN")) {
        console.log("  >>>", l);
      }
    });

    ws.close();
  } finally {
    chromeProc.kill();
    await mongoose.disconnect();
  }
}
inspectCertificatesPage().catch(console.error);
