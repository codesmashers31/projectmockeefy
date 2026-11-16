const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testWithClock(targetTimeIso) {
  const cdpPort = 9445;
  const userDataDir = path.join(__dirname, '../tmp/chrome-avail-cdp2');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1280,900',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function cdpGet(urlPath) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${cdpPort}${urlPath}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
  }

  const tabs = await cdpGet('/json/list');
  const targetTab = tabs.find(t => t.type === 'page') || tabs[0];
  const wsUrl = targetTab.webSocketDebuggerUrl;

  const WebSocket = (await import('../node_modules/ws/index.js')).default;
  const ws = new WebSocket(wsUrl);

  await new Promise(r => ws.on('open', r));

  let reqId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (msg) => {
        const data = JSON.parse(msg);
        if (data.id === id) {
          ws.off('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  // Override Date to simulate 8:30 PM IST (before cutoff 8:47 PM)
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      const targetTime = new Date("${targetTimeIso}").getTime();
      const realNow = Date.now();
      const offset = targetTime - realNow;
      const RealDate = Date;
      function MockDate(...args) {
        if (args.length === 0) {
          return new RealDate(RealDate.now() + offset);
        }
        return new RealDate(...args);
      }
      MockDate.now = () => RealDate.now() + offset;
      MockDate.prototype = RealDate.prototype;
      MockDate.UTC = RealDate.UTC;
      MockDate.parse = RealDate.parse;
      window.Date = MockDate;
    `
  });

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  console.log(`Navigating to http://localhost:5173/book-session?expertId=${expertId} with clock = ${targetTimeIso}...`);
  await send('Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertId}` });

  await new Promise(r => setTimeout(r, 4000));

  const textRes = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        bodyText: document.body.innerText.substring(0, 1500),
        hasToday: document.body.innerText.includes('Today') || document.body.innerText.includes('Nov 13'),
        has827Slot: document.body.innerText.includes('8:27 PM')
      };
    })()`,
    returnByValue: true
  });

  console.log('DOM Results:', JSON.stringify(textRes.result?.value, null, 2));

  // Save screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join('C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c', 'evidence_candidate_calendar_simulated_830pm.png');
  fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`Saved screenshot to ${shotPath}`);

  ws.close();
  chromeProc.kill();
}

// 8:30 PM IST on Nov 13 = 15:00 UTC on Nov 13
testWithClock('2026-11-13T15:00:00.000Z').catch(console.error);
