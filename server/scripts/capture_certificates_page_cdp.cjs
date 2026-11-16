const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { WebSocket } = require('ws');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const ARTIFACT_DIR = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\fa4cc859-e99d-440e-a4b9-ef64c859d17c";

async function captureCertPage() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const User = (await import('../models/User.js')).default;
  const candidateUser = await User.findOne({ userType: 'candidate' });

  const candidateToken = jwt.sign(
    { userId: candidateUser._id, userType: 'candidate', email: candidateUser.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const port = 9345;
  const userDataDir = path.join(__dirname, '../tmp/chrome_cert_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--window-size=1280,900'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function getWs() {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/json`, res => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => resolve(JSON.parse(b)[0]?.webSocketDebuggerUrl));
      }).on('error', reject);
    });
  }

  const wsUrl = await getWs();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.once('open', r));

  function sendCdp(method, params = {}) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.removeListener('message', onMsg);
          resolve(msg.result);
        }
      };
      ws.on('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCdp('Runtime.enable');
  await sendCdp('Page.enable');

  await sendCdp('Page.navigate', { url: 'http://localhost:5173/signin' });
  await new Promise(r => setTimeout(r, 1200));

  await sendCdp('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', '${candidateToken}');
      localStorage.setItem('user', JSON.stringify({
        id: '${candidateUser._id}',
        _id: '${candidateUser._id}',
        userId: '${candidateUser._id}',
        name: '${candidateUser.name}',
        email: '${candidateUser.email}',
        userType: 'candidate',
        role: 'candidate'
      }));
    `
  });

  await sendCdp('Page.navigate', { url: 'http://localhost:5173/certificates' });
  await new Promise(r => setTimeout(r, 3000));

  const shotRes = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join(ARTIFACT_DIR, 'evidence_certificates_page_verified.png');
  fs.writeFileSync(shotPath, Buffer.from(shotRes.data, 'base64'));
  console.log('Saved certificate page screenshot to:', shotPath);

  ws.close();
  chromeProc.kill();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  await mongoose.disconnect();
}

captureCertPage().catch(console.error);
