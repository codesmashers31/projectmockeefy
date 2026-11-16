const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function captureEvidence() {
  const cdpPort = 9444;
  const userDataDir = path.join(__dirname, '../tmp/chrome-avail-cdp');

  // Spawn Chrome
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

  const expertId = '6ae2e7cf2ad1edd333f2aded';
  console.log(`Navigating to http://localhost:5173/book-session?expertId=${expertId}...`);
  await send('Page.navigate', { url: `http://localhost:5173/book-session?expertId=${expertId}` });

  await new Promise(r => setTimeout(r, 4000));

  // Evaluate DOM to see what dates and slots are visible
  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const dates = Array.from(document.querySelectorAll('[data-testid^="date-pill"], button')).map(b => b.innerText.trim()).filter(t => t.includes('Nov') || t.includes('Today') || t.includes('Fri'));
      const banner = document.querySelector('.bg-amber-50, .bg-amber-50\\/90')?.innerText || '';
      const slots = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('PM') || t.includes('AM'));
      return {
        url: window.location.href,
        banner,
        dates: dates.slice(0, 15),
        slots: slots.slice(0, 15)
      };
    })()`,
    returnByValue: true
  });

  console.log('DOM Evaluation:', JSON.stringify(evalRes.value, null, 2));

  // Take screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join('C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c', 'evidence_candidate_calendar_verified.png');
  fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`Screenshot saved to ${shotPath}`);

  ws.close();
  chromeProc.kill();
}

captureEvidence().catch(console.error);
