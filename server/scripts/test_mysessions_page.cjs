const { spawn } = require("child_process");
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

async function check() {
  const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9280;
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=" + port,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,1100"
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch("http://127.0.0.1:" + port + "/json/version");
  const data = await res.json();
  const ws = new WebSocket(data.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (m, p = {}) => new Promise(res => {
    const curId = id++;
    const handler = (msg) => {
      const d = JSON.parse(msg);
      if (d.id === curId) { ws.off("message", handler); res(d); }
    };
    ws.on("message", handler);
    ws.send(JSON.stringify({ id: curId, method: m, params: p }));
  });

  const t = await send("Target.createTarget", { url: "about:blank" });
  const pws = new WebSocket("ws://127.0.0.1:" + port + "/devtools/page/" + t.result.targetId);
  await new Promise(r => pws.onopen = r);

  pws.on("message", (msg) => {
    const d = JSON.parse(msg);
    if (d.method === "Runtime.consoleAPICalled") {
      console.log("[CONSOLE]", d.params.type, d.params.args.map(a => a.value || a.description).join(" "));
    }
    if (d.method === "Runtime.exceptionThrown") {
      console.error("[EXCEPTION]", d.params.exceptionDetails.text, d.params.exceptionDetails.exception?.description);
    }
  });

  let pid = 1;
  const psend = (m, p = {}) => new Promise(res => {
    const curId = pid++;
    const handler = (msg) => {
      const d = JSON.parse(msg);
      if (d.id === curId) { pws.off("message", handler); res(d); }
    };
    pws.on("message", handler);
    pws.send(JSON.stringify({ id: curId, method: m, params: p }));
  });

  await psend("Page.enable");
  await psend("Runtime.enable");

  const token = jwt.sign(
    {
      email: "darwininfantmichael@gmail.com",
      userType: "candidate",
      name: "Joel A",
      userId: "6ad1fd8b146a0a4e7ca163aa"
    },
    "code@1234",
    { expiresIn: "7d" }
  );

  const userData = {
    id: "6ad1fd8b146a0a4e7ca163aa",
    _id: "6ad1fd8b146a0a4e7ca163aa",
    userId: "6ad1fd8b146a0a4e7ca163aa",
    email: "darwininfantmichael@gmail.com",
    userType: 'candidate',
    role: 'candidate',
    name: 'Joel A',
    isPremium: false
  };

  await psend("Page.navigate", { url: "http://localhost:5173" });
  await new Promise(r => setTimeout(r, 1500));

  await psend("Runtime.evaluate", {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('mockeefy_user_cache', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(userData))});
      localStorage.setItem('userType', 'candidate');
    `
  });

  console.log("Navigating to http://localhost:5173/my-sessions ...");
  await psend("Page.navigate", { url: "http://localhost:5173/my-sessions" });
  await new Promise(r => setTimeout(r, 4500));

  const pageInfo = await psend("Runtime.evaluate", {
    expression: `(() => {
      return {
        url: window.location.href,
        h1: document.querySelector('h1')?.innerText,
        totalText: document.querySelector('.inline-flex')?.innerText,
        bodyHeight: document.body.scrollHeight,
        cardsCount: document.querySelectorAll('.grid > div').length,
        paginationText: Array.from(document.querySelectorAll('div')).find(e => e.textContent.includes('Showing ') && e.textContent.includes('of '))?.innerText
      };
    })()`
  });

  console.log("Page info:", pageInfo.result?.result?.value);

  chrome.kill();
  process.exit(0);
}

check().catch(console.error);
