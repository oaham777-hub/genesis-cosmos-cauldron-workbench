// 给桥加"事件总线"（观象台的燃料）
//
// 为什么用脚本改而不是手改：桥是 ~470 行的运行时代码，手改容易漏；
// 这个脚本幂等——已经加过就跳过，改完写回；出问题 git 能回滚。
//
// 做三件事：
//   1) 在 fetch 里记 lastPath / lastSkill / 起始时间
//   2) 把 `return json(` 换成 `return reply(`（reply 先发事件再回 JSON）
//   3) 新增 /events (SSE) /history /emit 三个端点和环形缓冲

import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2] || 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui\\server.mjs';
let src = readFileSync(file, 'utf8');

if (src.includes('ZHAOHUA_EVENTS_MAX')) {
  console.log('已经加过事件总线，跳过。');
  process.exit(0);
}

// 1) 把裸的 json 返回换成 reply（reply 内部再调 json，注意不要制造同样的字符串）
const before = (src.match(/return json\(/g) || []).length;
src = src.replace(/return json\(/g, 'return reply(');
console.log(`替换 return json( → return reply( ：${before} 处`);

// 2) 事件总线本体，插在 Bun.serve 之前
const bus = `
// ---------- 事件总线（观象台燃料）----------
// 只存内存、只在回环口；观象台断开也不影响业务。
const EVENTS = [];
const EVENTS_MAX = Number(process.env.ZHAOHUA_EVENTS_MAX || 400);
const EV_CLIENTS = new Set();
let EV_SEQ = 0;
let lastPath = '';
let lastSkill = '';
let reqT0 = Date.now();

const KIND_BY_PATH = {
  '/audit': 'audit',
  '/inspect': 'inspect',
  '/verify': 'verify',
  '/pack': 'pack',
  '/install': 'install',
  '/deploy': 'deploy',
  '/eval': 'eval',
  '/create': 'create',
  '/fuse': 'fuse',
};

function briefOf(kind, data) {
  try {
    if (!data || typeof data !== 'object') return '';
    if (kind === 'audit') {
      if (Number.isFinite(data.failed)) return \`失败 \${data.failed} · 通过 \${data.passed}\`;
      if (data.error) return String(data.error).slice(0, 120);
    }
    if (kind === 'pack' && data.outDir) return String(data.outDir).split(/[\\\\/]/).slice(-1)[0];
    if (kind === 'install') return \`\${data.action || ''} \${data.installed?.name || ''} \${data.installed?.version || ''}\`.trim();
    if (kind === 'deploy') return data.deployed ? \`落地 \${data.deployed.name || ''} \${data.deployed.version || ''}\`.trim() : (data.needsConfirm ? '待确认' : '');
    if (kind === 'eval') {
      const s = data.summary;
      if (s && typeof s === 'object') {
        return Object.entries(s).map(([k, v]) => \`\${k} \${v.hit}/\${v.total}\`).join(' · ');
      }
    }
    if (kind === 'fuse' && data.outDir) return String(data.outDir).split(/[\\\\/]/).slice(-1)[0];
    if (kind === 'create' && data.outDir) return String(data.outDir).split(/[\\\\/]/).slice(-1)[0];
    if (data.error) return String(data.error).slice(0, 120);
  } catch {}
  return '';
}

function emitEvent(kind, fields = {}) {
  const ev = { seq: ++EV_SEQ, ts: Date.now(), kind, ...fields };
  EVENTS.push(ev);
  if (EVENTS.length > EVENTS_MAX) EVENTS.shift();
  const line = 'data: ' + JSON.stringify(ev) + '\\n\\n';
  for (const c of EV_CLIENTS) {
    try { c.enqueue(line); } catch {}
  }
  return ev;
}

// 所有路由的出口都走这里：先广播一条事件，再返回（事件失败绝不影响业务）
function reply(data, status = 200) {
  try {
    const kind = KIND_BY_PATH[lastPath];
    if (kind) {
      const ok = status < 400 && data && data.ok !== false;
      emitEvent(kind, {
        target: lastSkill || '',
        ok,
        ms: Date.now() - reqT0,
        brief: briefOf(kind, data),
      });
    }
  } catch {}
  return json(data, status);
}

const server = Bun.serve({`;

src = src.replace('const server = Bun.serve({', bus.trimStart());

// 3) fetch 开头记上下文
src = src.replace(
  "      const url = new URL(req.url);",
  `      const url = new URL(req.url);
      lastPath = url.pathname;
      lastSkill = url.searchParams.get('skill') || url.searchParams.get('config') || url.searchParams.get('name') || '';
      reqT0 = Date.now();`,
);

// 4) 三个端点，插在 /health 之前
const routes = `
      // 观象台：首屏快照
      if (url.pathname === '/history') {
        const since = Math.max(0, Number(url.searchParams.get('since') || 0));
        return new Response(JSON.stringify({ ok: true, seq: EV_SEQ, events: EVENTS.filter((e) => e.seq > since) }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        });
      }

      // 观象台：SSE 长连接
      if (url.pathname === '/events') {
        const since = Math.max(0, Number(url.searchParams.get('since') || 0));
        const stream = new ReadableStream({
          start(controller) {
            try {
              for (const ev of EVENTS) {
                if (ev.seq > since) controller.enqueue('data: ' + JSON.stringify(ev) + '\\n\\n');
              }
              controller.enqueue(': connected\\n\\n');
              EV_CLIENTS.add(controller);
            } catch {}
          },
          cancel(ctl) { EV_CLIENTS.delete(ctl); },
        });
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // 手动投一条（脚本 / 工具 / 以后的乾坤鼎埋点都走这里）
      if (url.pathname === '/emit' && req.method === 'POST') {
        let body = {};
        try { body = await req.json(); } catch {}
        const kind = String(body.kind || 'note').slice(0, 24);
        const ev = emitEvent(kind, {
          target: String(body.target || '').slice(0, 96),
          ok: body.ok !== false,
          ms: Number.isFinite(body.ms) ? body.ms : null,
          brief: String(body.brief || '').slice(0, 160),
          src: String(body.src || 'manual').slice(0, 24),
        });
        return json({ ok: true, seq: ev.seq });
      }

      if (url.pathname === '/health') {`;

src = src.replace("      if (url.pathname === '/health') {", routes.trimStart());

writeFileSync(file, src, 'utf8');
console.log('写回完成：', file);
console.log('含 /events:', src.includes("url.pathname === '/events'"), '| 含 emitEvent:', src.includes('function emitEvent'));
