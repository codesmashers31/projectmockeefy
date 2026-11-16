const WebSocket = require('../node_modules/ws');
const http = require('http');
const { spawn } = require('child_process');

const p = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9461',
  '--headless=new',
  'http://localhost:5173/book-session?expertId=6ae2e7cf2ad1edd333f2aded'
]);

setTimeout(async () => {
  const d = await new Promise(r => http.get('http://127.0.0.1:9461/json/list', res => {
    let buf = ''; res.on('data', c => buf += c); res.on('end', () => r(JSON.parse(buf)));
  }));
  const targetTab = d.find(t => t.url.includes('book-session')) || d[0];
  const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  ws.on('message', m => {
    const parsed = JSON.parse(m.toString());
    console.log('Result:', JSON.stringify(parsed.result?.result?.value, null, 2));
    p.kill();
    process.exit(0);
  });

  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const text = document.body.innerText;
        const pills = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('Nov') || t.includes('Today') || t.includes('Fri'));
        const slots = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(t => t.includes('PM') || t.includes('AM'));
        return {
          title: document.title,
          url: window.location.href,
          hasNoSlotsText: text.includes('No interview slots available today'),
          hasFri827: text.includes('8:27 PM'),
          pills: Array.from(new Set(pills)),
          slots: Array.from(new Set(slots))
        };
      })()`,
      returnByValue: true
    }
  }));
}, 4000);
