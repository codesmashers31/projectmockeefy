const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";
const JWT_SECRET = process.env.JWT_SECRET || "code@1234";

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msg = JSON.stringify({ id, method, params });
    const handler = (data) => {
      const resp = JSON.parse(data.toString());
      if (resp.id === id) {
        ws.off('message', handler);
        if (resp.error) reject(resp.error);
        else resolve(resp.result);
      }
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

async function runBrowserTest() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.models.User || (await import('../models/User.js')).default;
  const ExpertDetails = mongoose.models.ExpertDetails || (await import('../models/expertModel.js')).default;

  const expert = await ExpertDetails.findOne({ status: "Active" });
  // Set Tuesday to have single 12:00 PM - 12:30 PM slot
  expert.availability.weekly.tue = [{ from: "12:00", to: "12:30" }];
  expert.availability.sessionDuration = 30;
  expert.availability.maxPerDay = 6;
  expert.markModified('availability');
  await expert.save();
  console.log('Set Tuesday initial slot: 12:00 PM - 12:30 PM');

  const user = await User.findById(expert.user || expert.userId);
  const token = jwt.sign(
    { email: user.email, userType: 'expert', name: user.name, userId: user._id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const userData = {
    id: user._id.toString(),
    _id: user._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    userType: 'expert',
    role: 'expert',
    name: user.name,
  };

  const port = 9298;
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const jsonRes = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${port}/json`, (r) => {
        let raw = '';
        r.on('data', chunk => raw += chunk);
        r.on('end', () => res(JSON.parse(raw)));
      }).on('error', rej);
    });

    const pageWsUrl = jsonRes[0]?.webSocketDebuggerUrl;
    const WebSocket = require('ws');
    const ws = new WebSocket(pageWsUrl);
    await new Promise(r => ws.on('open', r));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'Runtime.enable');

    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1000));

    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `
        localStorage.clear();
        localStorage.setItem('token', ${JSON.stringify(token)});
        localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
        localStorage.setItem('role', 'expert');
      `
    });

    console.log('Navigating to http://localhost:5173/dashboard/availability/edit ...');
    await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/dashboard/availability/edit' });
    await new Promise(r => setTimeout(r, 2500));

    // Click "+ Add Slot" on Tuesday (row id: day-row-tue)
    const addTuesdaySlot = `
      (function() {
        const tueRow = document.getElementById('day-row-tue');
        if (!tueRow) return { error: 'No tueRow' };
        const addBtn = Array.from(tueRow.querySelectorAll('button')).find(b => b.textContent.includes('Add Slot'));
        if (addBtn) {
          addBtn.click();
          return { clicked: true };
        }
        return { error: 'Add slot button not found' };
      })()
    `;

    console.log('Clicking "+ Add Slot" for Slot 2 (expected: 12:30 PM - 01:00 PM)...');
    await sendCdp(ws, 'Runtime.evaluate', { expression: addTuesdaySlot });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking "+ Add Slot" for Slot 3 (expected: 01:00 PM - 01:30 PM)...');
    await sendCdp(ws, 'Runtime.evaluate', { expression: addTuesdaySlot });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking "+ Add Slot" for Slot 4 (expected: 01:30 PM - 02:00 PM)...');
    await sendCdp(ws, 'Runtime.evaluate', { expression: addTuesdaySlot });
    await new Promise(r => setTimeout(r, 1000));

    // Read rendered Tuesday slot elements
    const inspectTuesdaySlots = `
      (function() {
        const tueRow = document.getElementById('day-row-tue');
        const rows = [];
        tueRow.querySelectorAll('div[class*="flex items-center gap-2 flex-wrap sm:flex-nowrap"]').forEach(container => {
          const input = container.querySelector('input[type="text"]');
          const periodBtn = container.querySelector('button[class*="bg-blue-600"]');
          const endDiv = container.querySelector('div[title*="Fixed end time"]');
          rows.push({
            start: input ? input.value : '',
            period: periodBtn ? periodBtn.textContent.trim() : '',
            end: endDiv ? endDiv.textContent.trim() : ''
          });
        });
        return rows;
      })()
    `;
    const tueSlotsRes = await sendCdp(ws, 'Runtime.evaluate', { expression: inspectTuesdaySlots, returnByValue: true });
    console.log('Rendered Tuesday consecutive slots in browser:', tueSlotsRes.result?.value);

    // Capture screenshot of the editor showing Tuesday consecutive slots
    const editShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_availability_consecutive_slots.png'), Buffer.from(editShot.data, 'base64'));
    console.log('Saved evidence_availability_consecutive_slots.png');

    // Click "Save Availability"
    console.log('Clicking "Save Availability" ...');
    const saveExpr = `
      (function() {
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Save Availability'));
        if (saveBtn) {
          saveBtn.click();
          return { clicked: true };
        }
        return { error: 'No save button' };
      })()
    `;
    await sendCdp(ws, 'Runtime.evaluate', { expression: saveExpr });
    await new Promise(r => setTimeout(r, 2500));

    // Capture screenshot of View Availability page
    const viewShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_availability_view_consecutive_slots.png'), Buffer.from(viewShot.data, 'base64'));
    console.log('Saved evidence_availability_view_consecutive_slots.png');

    // Reload page to verify persistence from DB
    console.log('Reloading View Availability page ...');
    await sendCdp(ws, 'Page.reload');
    await new Promise(r => setTimeout(r, 2500));

    const reloadedShot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'evidence_availability_persisted_after_refresh.png'), Buffer.from(reloadedShot.data, 'base64'));
    console.log('Saved evidence_availability_persisted_after_refresh.png');

    ws.close();
  } finally {
    chromeProc.kill('SIGKILL');
    await mongoose.disconnect();
    console.log('Browser test completed.');
  }
}

runBrowserTest().catch(console.error);
