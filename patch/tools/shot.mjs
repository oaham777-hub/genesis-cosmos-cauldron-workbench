// 截图工具（CDP，直连页面 target）。`msedge --screenshot` 对持续 rAF 的重页面会挂住。
// 用法：bun shot.mjs <url> <out.png> [waitMs] [w] [h]
import { writeFileSync } from 'node:fs';

const [, , url, out, waitMsArg, wArg, hArg] = process.argv;
if (!url || !out) { console.error('用法: bun shot.mjs <url> <out.png> [waitMs] [w] [h]'); process.exit(2); }
const waitMs = Number(waitMsArg || 3500);
const W = Number(wArg || 1600);
const H = Number(hArg || 1100);

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = `C:\\Users\\Oaham\\AppData\\Local\\Temp\\zh-shot-${Date.now()}`;

const proc = Bun.spawn([EDGE, '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, 'about:blank'], { stdout: 'ignore', stderr: 'ignore' });

async function targetWs() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
      const page = (list || []).find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('拿不到页面 target');
}

const wsUrl = await targetWs();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
};
function send(method, params = {}) {
  const msgId = ++id;
  return new Promise((res) => {
    pending.set(msgId, res);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await new Promise(r => setTimeout(r, waitMs));

const shot = await send('Page.captureScreenshot', { format: 'png' });
if (!shot.result || !shot.result.data) {
  console.error('截图失败: ' + JSON.stringify(shot).slice(0, 400));
  try { proc.kill(); } catch {}
  process.exit(3);
}
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('ok ' + out);
try { ws.close(); } catch {}
try { proc.kill(); } catch {}
process.exit(0);
