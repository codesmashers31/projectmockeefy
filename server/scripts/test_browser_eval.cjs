const WebSocket = require('../node_modules/ws');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

async function testInBrowser() {
  const cdpPort = 9502;
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${cdpPort}`,
    '--user-data-dir=' + path.join(__dirname, '../tmp/chrome-test-eval-2'),
    '--headless=new',
    'about:blank'
  ]);

  let tabs = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      tabs = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${cdpPort}/json/list`, res => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
      });
      if (tabs && tabs.length > 0) break;
    } catch (_) {}
  }

  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  function sendCdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 10000000);
      const msgHandler = (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.id === id) {
            ws.off('message', msgHandler);
            if (msg.error) reject(new Error(msg.error.message));
            else resolve(msg.result);
          }
        } catch (err) {}
      };
      ws.on('message', msgHandler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCdp('Page.enable');
  await sendCdp('Runtime.enable');
  await sendCdp('Page.navigate', { url: 'http://localhost:5173/book-session?expertId=6ae2e7cf2ad1edd333f2aded' });
  await new Promise(r => setTimeout(r, 4000));

  const evalResult = await sendCdp('Runtime.evaluate', {
    expression: `(async () => {
      const p = await fetch('/api/expert/public/profile/6ae2e7cf2ad1edd333f2aded').then(r => r.json());
      const s = await fetch('/api/sessions/expert/6ae2e7cf2ad1edd333f2aded').then(r => r.json());
      return {
        availability: p.profile.availability,
        sessionsCount: s.length,
        sessions: s
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('API inside browser:', JSON.stringify(evalResult.result?.value, null, 2));

  chromeProc.kill();
  process.exit(0);
}
testInBrowser();
