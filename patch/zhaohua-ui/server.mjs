// 造化鼎本地桥：把 zhaohua CLI 变成页面能点的接口
// 启动：bun.exe server.mjs   （默认 127.0.0.1:8791）
// 只用本机回环地址，不出网。
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync, rmSync, copyFileSync, openSync, readSync, closeSync} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
const ZHAOHUA_DIR = process.env.ZHAOHUA_DIR || 'D:\\造化鼎';
// 唯一真相：patch\skills（不再用 staging\skills 当打包源）
const SKILLS_DIR = process.env.ZHAOHUA_SKILLS || 'D:\\造化乾坤鼎-工作台\\patch\\skills';
const PORT = Number(process.env.ZHAOHUA_BRIDGE_PORT || 8791);
const PACKS_DIR = process.env.ZHAOHUA_PACKS || 'D:\\造化乾坤鼎-工作台\\patch\\staging\\packs';
const PRODUCT_DIR = process.env.ZHAOHUA_PRODUCT || 'D:\\造化乾坤鼎-工作台\\patch\\staging\\product';
const DEPLOY_DIR = process.env.ZHAOHUA_DEPLOY || 'D:\\造化乾坤鼎-工作台\\_work\\stable\\data\\skills';
const DEPLOY_BACKUP = process.env.ZHAOHUA_DEPLOY_BACKUP || 'D:\\造化乾坤鼎-工作台\\patch\\_backup\\skills';
const CLI = `${ZHAOHUA_DIR}\\core\\bin\\zhaohua.mjs`;
const EVAL_DIR = process.env.ZHAOHUA_EVAL || 'D:\\造化乾坤鼎-工作台\\patch\\eval';
const EVAL_OUT = process.env.ZHAOHUA_EVAL_OUT || 'D:\\造化乾坤鼎-工作台\\patch\\staging\\eval';
const FUSED_DIR = process.env.ZHAOHUA_FUSED || 'D:\\造化乾坤鼎-工作台\\patch\\staging\\fused';
const SECRET_FILE = process.env.ZHAOHUA_KEY_FILE || 'D:\\造化乾坤鼎-工作台\\patch\\secrets\\deepseek.key';

// 模型 key 只在跑子进程时注入环境变量；接口只回报"有没有"，从不回显内容
function readSecret() {
  try {
    const raw = readFileSync(SECRET_FILE, 'utf8').trim();
    return raw.length > 8 ? raw : '';
  } catch {
    return '';
  }
}

async function runCli(args, timeoutMs = 180000, extraEnv = null) {
  const started = Date.now();
  const proc = Bun.spawn([Bun.argv[0], CLI, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', ...(extraEnv || {}) },
  });
  const timer = setTimeout(() => { try { proc.kill(); } catch {} }, timeoutMs);
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  clearTimeout(timer);
  const exitCode = await proc.exited;
  return { exitCode, stdout: out, stderr: err, durationMs: Date.now() - started };
}

// 把 audit 的文本输出解析成结构化：每个技能一行，带失败规则
function parseAudit(text) {
  const skills = [];
  let current = null;
  const stageOf = (name) => {
    const map = {
      'ai-film-router': '00', 'film-synopsis': '01', 'film-characters': '02', 'film-worldbuilding': '03',
      'film-treatment': '04', 'film-screenplay': '05', 'film-stress-test': '06', 'film-lira-assets': '07',
      'film-acting': '08', 'film-cinedance': '09',
    };
    return map[name] || null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    const head = line.match(/^\s{2}(\S.*?)(PASS|FAIL)\s*$/);
    if (head) {
      const full = head[1];
      const name = full.split(/[\\/]/).filter(Boolean).pop() || full;
      current = { name, stage: stageOf(name), ok: head[2] === 'PASS', rules: [] };
      skills.push(current);
      continue;
    }
    const rule = line.match(/^\s{2}(R\d\d)\s+(fail|manual|pass)\s+(.*)$/);
    if (rule && current) {
      current.rules.push({ id: rule[1], status: rule[2], message: rule[3].trim() });
    }
  }
  const tally = {};
  for (const s of skills) {
    for (const r of s.rules) {
      if (r.status !== 'fail') continue;
      tally[r.id] = (tally[r.id] || 0) + 1;
    }
  }
  return {
    skills,
    total: skills.length,
    failed: skills.filter((s) => !s.ok).length,
    passed: skills.filter((s) => s.ok).length,
    tally,
    rulesTotal: Object.values(tally).reduce((a, b) => a + b, 0),
  };
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// 列出已产出的技能包：名字 / 字节 / 时间 / EVIDENCE 前几行
function listPacks() {
  if (!existsSync(PACKS_DIR)) return { dir: PACKS_DIR, packs: [] };
  const packs = [];
  for (const name of readdirSync(PACKS_DIR)) {
    if (name.startsWith('.')) continue;
    const dir = join(PACKS_DIR, name);
    let st;
    try { st = statSync(dir); } catch { continue; }
    if (!st.isDirectory()) continue;
    const evidence = join(dir, 'EVIDENCE.md');
    let head = '';
    let bytes = 0;
    try {
      const text = readFileSync(evidence, 'utf8');
      bytes = text.length;
      head = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 4).join(' / ').slice(0, 300);
    } catch {}
    packs.push({ name, mtime: st.mtimeMs, evidenceBytes: bytes, head });
  }
  packs.sort((a, b) => b.mtime - a.mtime);
  return { dir: PACKS_DIR, packs };
}
function sha256File(file) {
  try { return createHash('sha256').update(readFileSync(file)).digest('hex'); } catch { return null; }
}

// 已装包目录里取某技能的最新版本
function latestInstall(skill) {
  const root = join(PRODUCT_DIR, 'packs', skill);
  if (!existsSync(root)) return null;
  const versions = readdirSync(root).filter((n) => !n.startsWith('.') && statSync(join(root, n)).isDirectory());
  if (!versions.length) return null;
  versions.sort((a, b) => statSync(join(root, b)).mtimeMs - statSync(join(root, a)).mtimeMs);
  const version = versions[0];
  return { version, dir: join(root, version) };
}

function deployedList() {
  const out = [];
  if (!existsSync(DEPLOY_DIR)) return out;
  for (const name of readdirSync(DEPLOY_DIR)) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const dir = join(DEPLOY_DIR, name);
    let st;
    try { st = statSync(dir); } catch { continue; }
    if (!st.isDirectory()) continue;
    let version = '';
    try { version = JSON.parse(readFileSync(join(dir, 'skill.pack.json'), 'utf8')).version || ''; } catch {}
    out.push({ name, version, mtime: st.mtimeMs, skillSha: sha256File(join(dir, 'SKILL.md')) });
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}
const BANS = 'D:\\造化乾坤鼎-工作台\\patch\\tools\\bans.mjs';
const UPLOAD_STAGE = 'D:\\造化乾坤鼎-工作台\\patch\\_upload';
const UPLOAD_MAX_MB = Number(process.env.ZHAOHUA_UPLOAD_MAX_MB || 150);
const UPLOAD_MAX_FILES = Number(process.env.ZHAOHUA_UPLOAD_MAX_FILES || 1500);
const INGEST = 'D:\\造化乾坤鼎-工作台\\patch\\tools\\ingest.mjs';
const ROOT2 = 'D:\\造化乾坤鼎-工作台';
const DEV_DIR = 'D:\\造化乾坤鼎-工作台\\_work\\stable';
const DISTILL = 'D:\\造化乾坤鼎-工作台\\patch\\tools\\distill.mjs';
const GAP = 'D:\\造化乾坤鼎-工作台\\patch\\tools\\gap.mjs';
async function runTool(script, args) {
  const proc = Bun.spawn([Bun.argv[0], script, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const exitCode = await proc.exited;
  try { return JSON.parse(out); } catch { return { ok: false, exitCode, stderr: err.slice(0, 800) }; }
}
async function runDistill(args) {
  return runTool(DISTILL, args);
}
async function runBans(args) {
  return runTool(BANS, args);
}
function banArgs(fromSkills, dir) {
  return ['check', '--from', fromSkills.join(','), '--dir', dir];
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
  });

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
      if (Number.isFinite(data.failed)) return `失败 ${data.failed} · 通过 ${data.passed}`;
      if (data.error) return String(data.error).slice(0, 120);
    }
    if (kind === 'pack' && data.outDir) return String(data.outDir).split(/[\\/]/).slice(-1)[0];
    if (kind === 'install') return `${data.action || ''} ${data.installed?.name || ''} ${data.installed?.version || ''}`.trim();
    if (kind === 'deploy') return data.deployed ? `落地 ${data.deployed.name || ''} ${data.deployed.version || ''}`.trim() : (data.needsConfirm ? '待确认' : '');
    if (kind === 'eval') {
      const s = data.summary;
      if (s && typeof s === 'object') {
        return Object.entries(s).map(([k, v]) => `${k} ${v.hit}/${v.total}`).join(' · ');
      }
    }
    if (kind === 'fuse' && data.outDir) return String(data.outDir).split(/[\\/]/).slice(-1)[0];
    if (kind === 'create' && data.outDir) return String(data.outDir).split(/[\\/]/).slice(-1)[0];
    if (data.error) return String(data.error).slice(0, 120);
  } catch {}
  return '';
}

function emitEvent(kind, fields = {}) {
  // 观象台（参考 HALOFLUX 页面）认的字段：platform / agent_name / kind / text
  // 这里同时给出别名，让同一个事件既服务我们自己的面板，也能被那套视觉直接消费。
  const alias = {
    platform: (fields.target && fields.target !== '') ? fields.target : ('zhaohua-' + kind),
    agent_name: (fields.target && fields.target !== '') ? fields.target : ('zhaohua-' + kind),
    capability: kind,
    role: 'assistant',
    session_id: 'zhaohua-bridge',
    text: fields.brief || (kind + (fields.ok === false ? ' failed' : ' ok')),
    tokens: null
  };
  const ev = { seq: ++EV_SEQ, ts: Date.now(), kind, ...fields, ...alias };
  EVENTS.push(ev);
  if (EVENTS.length > EVENTS_MAX) EVENTS.shift();
  const line = 'data: ' + JSON.stringify(ev) + '\n\n';
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

// 启动时清 7 天前的上传暂存（只删我们自己的目录）
try {
  if (existsSync(UPLOAD_STAGE)) {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    for (const d of readdirSync(UPLOAD_STAGE)) {
      const p = join(UPLOAD_STAGE, d);
      try { if (statSync(p).isDirectory() && statSync(p).mtimeMs < cutoff) rmSync(p, { recursive: true, force: true }); } catch {}
    }
  }
} catch {}

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: PORT,
  // 默认 idleTimeout 只有 10s：评估/融合一次要跑几十秒，会被掐断连接
  idleTimeout: 240,
  async fetch(req) {
    const url = new URL(req.url);
    lastPath = url.pathname;
    lastSkill = url.searchParams.get('skill') || url.searchParams.get('config') || url.searchParams.get('name') || '';
    reqT0 = Date.now();
    if (req.method === 'OPTIONS') return reply({ ok: true });
    try {
// 观象台：首屏快照
      if (url.pathname === '/history') {
        const since = Math.max(0, Number(url.searchParams.get('since') || 0));
        return new Response(JSON.stringify({ ok: true, seq: EV_SEQ, events: EVENTS.filter((e) => e.seq > since) }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // 观象台：SSE 长连接
      if (url.pathname === '/events') {
        const since = Math.max(0, Number(url.searchParams.get('since') || 0));
        const stream = new ReadableStream({
          start(controller) {
            try {
              for (const ev of EVENTS) {
                if (ev.seq > since) controller.enqueue('data: ' + JSON.stringify(ev) + '\n\n');
              }
              controller.enqueue(': connected\n\n');
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

      if (url.pathname === '/gap') {
      const target = url.searchParams.get('target') || '';
      const from = url.searchParams.get('from') || '';
      if (!target || !from) return json({ ok: false, error: '需要 target 与 from' }, 400);
      return json(await runTool(GAP, ['plan', '--target', target, '--from', from]));
    }
    if (url.pathname === '/gap-files') {
      const target = url.searchParams.get('target') || '';
      const fromSkill = url.searchParams.get('fromSkill') || '';
      if (!target || !fromSkill) return json({ ok: false, error: '需要 target 与 fromSkill' }, 400);
      return json(await runTool(GAP, ['files', '--target', target, '--from-skill', fromSkill]));
    }
    if (url.pathname === '/gap-graft') {
      const target = url.searchParams.get('target') || '';
      const from = url.searchParams.get('from') || '';
      const sections = url.searchParams.get('sections') || '';
      const mode = url.searchParams.get('mode') || 'file';
      const as = url.searchParams.get('as') || '';
      if (!target || !from || !sections) return json({ ok: false, error: '需要 target、from、sections' }, 400);
      if (url.searchParams.get('confirm') !== 'yes') {
        return json({ ok: false, needsConfirm: true, message: '会改 patch\\skills\\' + target + '，并记一条新 epoch。带 confirm=yes 才写。' });
      }
      const args = ['graft', '--target', target, '--from', from, '--sections', sections, '--mode', mode, '--confirm'];
      if (as) args.push('--as', as);
      const r = await runTool(GAP, args);
      return reply(r);
    }    if (url.pathname === '/distill-diff') {
      const skill = url.searchParams.get('skill') || '';
      const to = url.searchParams.get('to') || '';
      if (!skill || !to) return json({ ok: false, error: '缺 skill 或 to' }, 400);
      const args = ['diff', '--skill', skill, '--to', to];
      const srcRoot = url.searchParams.get('srcRoot');
      if (srcRoot) args.push('--src-root', srcRoot);
      return json(await runDistill(args));
    }
    if (url.pathname === '/distill-pull') {
      const skill = url.searchParams.get('skill') || '';
      const to = url.searchParams.get('to') || '';
      if (!skill || !to) return json({ ok: false, error: '缺 skill 或 to' }, 400);
      if (url.searchParams.get('confirm') !== 'yes') {
        return json({ ok: false, needsConfirm: true, message: '会用来源的当前内容覆盖这一个文件，并记一条新 epoch。确认后才写。' }, 428);
      }
      const args = ['pull', '--skill', skill, '--to', to];
      const srcRoot = url.searchParams.get('srcRoot');
      if (srcRoot) args.push('--src-root', srcRoot);
      if (url.searchParams.get('force') === 'yes') args.push('--force');
      return json(await runDistill(args));
    }
    if (url.pathname === '/distill-keep') {
      const skill = url.searchParams.get('skill') || '';
      const to = url.searchParams.get('to') || '';
      if (!skill || !to) return json({ ok: false, error: '缺 skill 或 to' }, 400);
      if (url.searchParams.get('confirm') !== 'yes') {
        return json({ ok: false, needsConfirm: true, message: '把当前文件内容登记为“我们的版本”，之后来源再变会重新提示可更新。' }, 428);
      }
      return json(await runDistill(['keep', '--skill', skill, '--to', to]));
    }
    if (url.pathname === '/distill-wire') {
      const sk = url.searchParams.get('skill') || '';
      if (url.searchParams.get('confirm') !== 'yes') {
        return json({ ok: false, needsConfirm: true, hint: '会在 SKILL.md 末尾加一节「本层参考资料（投放接线）」，把没被正文引用的 references 列进去。' });
      }
      return json(await runDistill(sk ? ['wire', '--skill', sk] : ['wire']));
    }    if (url.pathname === '/skill-backups') {
      const r = Bun.spawnSync([process.execPath, INGEST, 'backups'], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NO_COLOR: '1' } });
      let j; try { j = JSON.parse(new TextDecoder().decode(r.stdout)); } catch { j = { ok: false, error: new TextDecoder().decode(r.stderr).slice(0, 300) }; }
      return reply(j);
    }

    if (url.pathname === '/restore-skill') {
      const stamp = url.searchParams.get('backup') || '';
      const name = url.searchParams.get('name') || '';
      if (!stamp || !name) return reply({ ok: false, error: '需要 backup 与 name' }, 400);
      if (url.searchParams.get('confirm') !== 'yes') return reply({ ok: false, needsConfirm: true, name, backup: stamp, hint: '会覆盖 patch\\skills\\' + name + '（先再备份一次），再同步运行区。' });
      const r = Bun.spawnSync([process.execPath, INGEST, 'restore', '--backup', stamp, '--name', name, '--confirm'], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NO_COLOR: '1' } });
      let j; try { j = JSON.parse(new TextDecoder().decode(r.stdout)); } catch { j = { ok: false, error: new TextDecoder().decode(r.stderr).slice(0, 300) }; }
      if (!j.ok) return reply(j, 400);
      const sync = Bun.spawnSync(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(ROOT2, 'patch', 'apply.ps1'), '-Skills', '-Target', DEV_DIR], { stdout: 'pipe', stderr: 'pipe' });
      return reply({ ...j, synced: sync.exitCode === 0 });
    }

    if (url.pathname === '/skills-truth') {
      const list = [];
      try {
        for (const d of readdirSync(SKILLS_DIR)) {
          const p = join(SKILLS_DIR, d);
          try {
            if (!statSync(p).isDirectory()) continue;
          } catch { continue; }
          let files = 0;
          try { files = readdirSync(p).length; } catch {}
          list.push({
            name: d,
            hasSkillMd: existsSync(join(p, 'SKILL.md')),
            hasPack: existsSync(join(p, 'skill.pack.json')),
            runtime: existsSync(join(DEPLOY_DIR, d)),
            files,
          });
        }
      } catch {}
      list.sort((a, b) => a.name.localeCompare(b.name));
      return reply({ dir: SKILLS_DIR, runtimeDir: DEPLOY_DIR, skills: list });
    }

    if (url.pathname === '/uninstall-skill') {
      const name = url.searchParams.get('name') || '';
      if (!name) return reply({ ok: false, error: '需要 name' }, 400);
      if (url.searchParams.get('confirm') !== 'yes') {
        return reply({ ok: false, needsConfirm: true, name, hint: '会从 patch\\skills 与运行区一起移除（先备份）。确认请带 confirm=yes。' });
      }
      const r = Bun.spawnSync([process.execPath, INGEST, 'uninstall', '--name', name, '--confirm'], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NO_COLOR: '1' } });
      let j; try { j = JSON.parse(new TextDecoder().decode(r.stdout)); } catch { j = { ok: false, error: new TextDecoder().decode(r.stderr).slice(0, 400) }; }
      return reply(j, j.ok ? 200 : 400);
    }

    if (url.pathname === '/install-skill') {
      const pkg = url.searchParams.get('pkg') || '';
      const rel = url.searchParams.get('rel') || '';
      if (!pkg || !rel) return reply({ ok: false, error: '需要 pkg 与 rel' }, 400);
      if (url.searchParams.get('confirm') !== 'yes') {
        return reply({ ok: false, needsConfirm: true, hint: '会在 patch\\skills\\ 下新建一份技能，并同步到运行区。确认请带 confirm=yes。' });
      }
      const forceArg = url.searchParams.get('force') === 'yes' ? ['--force'] : [];
      const r = Bun.spawnSync([process.execPath, INGEST, 'install', '--pkg', pkg, '--rel', rel, '--confirm', ...forceArg], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NO_COLOR: '1' } });
      let j; try { j = JSON.parse(new TextDecoder().decode(r.stdout)); } catch { j = { ok: false, error: new TextDecoder().decode(r.stderr).slice(0, 400) }; }
      if (!j.ok) return reply(j, j.error ? 400 : 200);
      const sync = Bun.spawnSync(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(ROOT2, 'patch', 'apply.ps1'), '-Skills', '-Target', DEV_DIR], { stdout: 'pipe', stderr: 'pipe' });
      const syncTxt = new TextDecoder().decode(sync.stdout) + new TextDecoder().decode(sync.stderr);
      return reply({ ...j, synced: sync.exitCode === 0, syncTail: syncTxt.split(/\r?\n/).filter(Boolean).slice(-4) });
    }

    if (url.pathname === '/ingest-upload' && req.method === 'POST') {
      try {
        const form = await req.formData();
        const name = String(form.get('name') || '').replace(/[\\/:*?"<>|]/g, '_').trim() || ('upload-' + Date.now());
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const stage = join(UPLOAD_STAGE, stamp);
        mkdirSync(stage, { recursive: true });
        let n = 0;
        let total = 0;
        for (const [k, v] of form.entries()) {
          if (k !== 'files' || typeof v === 'string') continue;
          total += v.size || 0;
          if (n + 1 > UPLOAD_MAX_FILES) return reply({ ok: false, error: '文件数超过上限 ' + UPLOAD_MAX_FILES + '，先解压挑文件再传' }, 413);
          if (total > UPLOAD_MAX_MB * 1024 * 1024) return reply({ ok: false, error: '体积超过上限 ' + UPLOAD_MAX_MB + 'MB，先解压挑文件再传' }, 413);
          const rel = String(v.name || 'file').replace(/\\/g, '/').replace(/^\/+/, '').split('/').filter((s) => s && s !== '..').join('\\');
          const to = join(stage, rel || ('file-' + n));
          mkdirSync(dirname(to), { recursive: true });
          writeFileSync(to, Buffer.from(await v.arrayBuffer()));
          n++;
        }
        if (!n) return reply({ ok: false, error: '没收到文件' }, 400);
        const r = Bun.spawnSync([process.execPath, INGEST, 'ingest', '--path', stage, '--name', name, '--confirm'], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NO_COLOR: '1' } });
        const txt = new TextDecoder().decode(r.stdout);
        let j; try { j = JSON.parse(txt); } catch { j = { ok: false, error: txt.slice(0, 400) }; }
        return reply({ ...j, uploaded: n, staged: stage });
      } catch (e) {
        return reply({ ok: false, error: '上传失败：' + e.message }, 500);
      }
    }    if (url.pathname === '/ingest-scan') {
      const p = url.searchParams.get('path') || '';
      if (!p) return reply({ ok: false, error: '缺少 path' }, 400);
      const r = Bun.spawnSync([process.execPath, INGEST, 'scan', '--path', p], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NO_COLOR: '1' } });
      const txt = new TextDecoder().decode(r.stdout);
      try { return reply(JSON.parse(txt)); } catch { return reply({ ok: false, error: txt.slice(0, 400) }, 500); }
    }
    if (url.pathname === '/ingest-do') {
      const p = url.searchParams.get('path') || '';
      const name = url.searchParams.get('name') || '';
      if (url.searchParams.get('confirm') !== 'yes') return reply({ ok: false, needsConfirm: true, hint: '会复制进 patch\\sources\\<包名>\\ 并登记账本；带 confirm=yes 再调' });
      if (!p || !name) return reply({ ok: false, error: '缺少 path 或 name' }, 400);
      const r = Bun.spawnSync([process.execPath, INGEST, 'ingest', '--path', p, '--name', name, '--confirm'], { stdout: 'pipe', stderr: 'pipe', env: { ...process.env, NO_COLOR: '1' } });
      const txt = new TextDecoder().decode(r.stdout);
      try { return reply(JSON.parse(txt)); } catch { return reply({ ok: false, error: txt.slice(0, 400) }, 500); }
    }    if (url.pathname === '/sources') return json(await runDistill(['sources']));
    if (url.pathname === '/distill-plan') {
      return json(await runDistill(['plan', '--src', url.searchParams.get('src') || '', '--skill', url.searchParams.get('skill') || '', '--to', url.searchParams.get('to') || '']));
    }
    if (url.pathname === '/distill-land') {
      const to = url.searchParams.get('to') || '';
      if (!url.searchParams.get('src') || !url.searchParams.get('skill')) return json({ ok: false, error: '缺 src / skill' }, 400);
      if (url.searchParams.get('confirm') !== 'yes') {
        return json({ ok: false, needsConfirm: true, hint: '这会往 patch\\skills\\<技能>\\ 写一个文件并记一条账，确认后再点一次。' });
      }
      return json(await runDistill(['land', '--src', url.searchParams.get('src'), '--skill', url.searchParams.get('skill'), '--to', to, '--sections', url.searchParams.get('sections') || '', '--label', url.searchParams.get('label') || '']));
    }    if (url.pathname === '/bans') {
        const from = (url.searchParams.get('from') || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (!from.length) return reply({ error: '要给 from（技能名，逗号分隔）' }, 400);
        const dir = url.searchParams.get('dir');
        if (dir) {
          if (!existsSync(dir)) return reply({ error: '目录不存在：' + dir }, 404);
          return reply(await runBans(banArgs(from, dir)));
        }
        const to = url.searchParams.get('to') || '';
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(to)) return reply({ error: '要给 to（技能名）或 dir' }, 400);
        return reply(await runBans(['check', '--from', from.join(','), '--to', to]));
      }
      if (url.pathname === '/distill') { const r = url.searchParams.get('srcRoot'); return json(await runDistill(['map'].concat(r ? ['--src-root', r] : []))); }
    if (url.pathname === '/distill-timeline') return json(await runDistill(['timeline']));
    if (url.pathname === '/distill-updates') { const r = url.searchParams.get('srcRoot'); return json(await runDistill(['updates'].concat(r ? ['--src-root', r] : []))); }

    if (url.pathname === '/health') {
        return reply({ ok: true, zhaohuaDir: ZHAOHUA_DIR, skillsDir: SKILLS_DIR, skillsExists: existsSync(SKILLS_DIR) });
      }
      if (url.pathname === '/audit') {
        const target = url.searchParams.get('dir') || SKILLS_DIR;
        const r = await runCli(['audit', target]);
        return reply({ ...parseAudit(r.stdout + r.stderr), exitCode: r.exitCode, durationMs: r.durationMs, target, raw: r.stdout.slice(-4000) });
      }
      if (url.pathname === '/verify') {
        const product = url.searchParams.get('product') || `${ZHAOHUA_DIR}\\zhaohua.product.json`;
        const r = await runCli(['verify', product]);
        return reply({ exitCode: r.exitCode, durationMs: r.durationMs, text: (r.stdout + r.stderr).slice(-8000) });
      }
      if (url.pathname === '/inspect') {
        const skill = url.searchParams.get('skill');
        if (!skill) return reply({ error: '缺少 skill 参数' }, 400);
        const r = await runCli(['inspect', `${SKILLS_DIR}\\${skill}`]);
        return reply({ exitCode: r.exitCode, durationMs: r.durationMs, text: r.stdout + r.stderr });
      }
      if (url.pathname === '/packs') {
        return reply(listPacks());
      }
      if (url.pathname === '/pack') {
        const skill = url.searchParams.get('skill');
        if (!skill) return reply({ error: '缺少 skill 参数' }, 400);
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(skill)) return reply({ error: '技能名不合法' }, 400);
        const src = `${SKILLS_DIR}\\${skill}`;
        if (!existsSync(src)) return reply({ error: `找不到技能目录：${src}` }, 404);
        const out = `${PACKS_DIR}\\${skill}`;
        let history = null;
        if (existsSync(out)) {
          history = `${PACKS_DIR}\\.history\\${skill}-${stamp()}`;
          mkdirSync(dirname(history), { recursive: true });
          renameSync(out, history);
        }
        const version = (url.searchParams.get('version') || '0.1.0').replace(/[^0-9a-zA-Z._-]/g, '');
        const r = await runCli(['pack', src, '--adopt', '--out', out, '--manifest', '--version', version, '--json']);
        let parsed = null;
        try { parsed = JSON.parse(r.stdout.trim()); } catch { parsed = null; }
        return reply({
          ok: r.exitCode === 0 || r.exitCode === 3,
          exitCode: r.exitCode,
          durationMs: r.durationMs,
          skill,
          out,
          history,
          pack: parsed,
          text: parsed ? null : (r.stdout + r.stderr).slice(-4000),
          packs: listPacks(),
        });
      }
      if (url.pathname === '/packs-installed') {
      const root = join(PRODUCT_DIR, 'packs');
      const list = [];
      try {
        for (const name of readdirSync(root)) {
          const nd = join(root, name);
          let st; try { st = statSync(nd); } catch { continue; }
          if (!st.isDirectory() || name === '.history') continue;
          for (const ver of readdirSync(nd)) {
            const vd = join(nd, ver);
            let vs; try { vs = statSync(vd); } catch { continue; }
            if (!vs.isDirectory()) continue;
            const man = join(vd, 'skill.pack.json');
            let meta = {};
            if (existsSync(man)) { try { meta = JSON.parse(readFileSync(man, 'utf8')); } catch {} }
            const src0 = (meta.sources || [])[0] || {};
            list.push({
              name, version: ver,
              source: src0.path || meta.source || null,
              license: meta.license || null,
              sha256: (src0.sha256 || meta.sha256 || '').slice(0, 12) || null,
              refs: (meta.references || []).length,
              caps: (meta.capabilities || []).length,
              mtime: vs.mtimeMs,
            });
          }
        }
      } catch {}
      list.sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(b.version).localeCompare(String(a.version)));
      let history = 0;
      try { const h = join(root, '.history'); if (existsSync(h)) history = readdirSync(h).length; } catch {}
      return reply({ ok: true, dir: root, packs: list, history });
    }

    if (url.pathname === '/pack-evidence') {
      const name = url.searchParams.get('name') || '';
      const ver = url.searchParams.get('version') || '';
      if (!/^[\w.\-]+$/.test(name) || !/^[\w.\-]+$/.test(ver)) return reply({ ok: false, error: 'name/version 非法' }, 400);
      const p = join(PRODUCT_DIR, 'packs', name, ver, 'EVIDENCE.md');
      if (!existsSync(p)) return reply({ ok: false, error: '这份包没有 EVIDENCE.md' }, 404);
      const text = readFileSync(p, 'utf8');
      return reply({ ok: true, name, version: ver, bytes: Buffer.byteLength(text), text: text.slice(0, 20000) });
    }

    if (url.pathname === '/deployed') return reply({ dir: DEPLOY_DIR, skills: deployedList() });

      // ── P4：评估（两臂）与融合（create）──────────────────────────────
      if (url.pathname === '/creds') {
        return reply({ keyFile: SECRET_FILE, hasKey: readSecret().length > 0 });
      }
      if (url.pathname === '/eval-runs') {
      const dir = join(EVAL_DIR, 'runs');
      const list = [];
      try {
        for (const f of readdirSync(dir)) {
          if (!f.endsWith('.json')) continue;
          const p = join(dir, f);
          let head = {};
          try {
            const j = JSON.parse(readFileSync(p, 'utf8'));
            head = {
              file: f, generated_at: j.generated_at || null, model: j.model || null,
              tasks: ((j.config || {}).tasks || []).length,
              arms: ((j.config || {}).arms || []).map((a) => a.id),
              assertions: (j.assertions || []).length,
              tokens: j.tokens || null,
            };
          } catch { head = { file: f, error: '解析失败' }; }
          list.push({ ...head, bytes: statSync(p).size, mtime: statSync(p).mtimeMs });
        }
      } catch {}
      list.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
      return reply({ ok: true, dir, runs: list });
    }

    if (url.pathname === '/eval-run') {
      const f = url.searchParams.get('file') || '';
      if (!/^[\w.\-]+$/.test(f)) return reply({ ok: false, error: 'file 非法' }, 400);
      const p = join(EVAL_DIR, 'runs', f);
      if (!existsSync(p)) return reply({ ok: false, error: '没有这份证据：' + f }, 404);
      return reply({ ok: true, file: f, evidence: JSON.parse(readFileSync(p, 'utf8')) });
    }

    if (url.pathname === '/eval-configs') {
        if (!existsSync(EVAL_DIR)) return reply({ dir: EVAL_DIR, configs: [] });
        const configs = readdirSync(EVAL_DIR)
          .filter((f) => f.endsWith('.json'))
          .map((f) => {
            const full = `${EVAL_DIR}\\${f}`;
            const st = statSync(full);
            return { name: f, size: st.size, mtime: st.mtime.toISOString() };
          });
        return reply({ dir: EVAL_DIR, configs });
      }
      if (url.pathname === '/eval-config') {
        const name = url.searchParams.get('name') || '';
        if (!/^[A-Za-z0-9._-]+\.json$/.test(name)) return reply({ error: '配置名不合法' }, 400);
        const f = `${EVAL_DIR}\\${name}`;
        if (!existsSync(f)) return reply({ error: '没有这份配置：' + f }, 404);
        try {
          const cfg = JSON.parse(readFileSync(f, 'utf8'));
          return reply({
            ok: true,
            name,
            schema: cfg.schema || '',
            model: cfg.model || '',
            max_tokens: cfg.max_tokens || 0,
            tasks: (cfg.tasks || []).map((x) => x.id),
            arms: (cfg.arms || []).map((x) => x.id),
            assertions: (cfg.assertions || []).length,
            bytes: statSync(f).size,
          });
        } catch (e) {
          return reply({ error: '配置读不了：' + e.message }, 500);
        }
      }      if (url.pathname === '/eval') {
        const name = url.searchParams.get('config') || '';
        const dry = url.searchParams.get('dry') === '1';
        if (!/^[A-Za-z0-9._-]+\.json$/.test(name)) return reply({ error: '配置名不合法' }, 400);
        const cfg = `${EVAL_DIR}\\${name}`;
        if (!existsSync(cfg)) return reply({ error: `没有这份配置：${cfg}` }, 404);
        const key = readSecret();
        if (!dry && !key) {
          return reply({ error: '没有模型 key：把 key 放到 ' + SECRET_FILE + '（一行，sk- 开头）' }, 400);
        }
        // 注意：CLI 的 --out 是"目录"，证据文件落在 <目录>\eval-<配置名>-<时间戳>.json
        const outDir = `${EVAL_OUT}\\${name.replace(/\.json$/, '')}`;
        mkdirSync(outDir, { recursive: true });
        const args = ['eval', cfg, '--out', outDir];
        if (dry) args.push('--dry-run');
        const r = await runCli(args, 900000, key ? { QKD_MODEL_API_KEY: key } : null);
        if (dry) {
          return reply({ dry: true, config: name, exitCode: r.exitCode, durationMs: r.durationMs, text: (r.stdout + r.stderr).slice(-4000) });
        }
        const pickLatest = (dir) => {
          try {
            const files = readdirSync(dir)
              .filter((f) => f.endsWith('.json'))
              .map((f) => ({ f, m: statSync(`${dir}\\${f}`).mtimeMs }))
              .sort((a, b) => b.m - a.m);
            return files.length ? `${dir}\\${files[0].f}` : null;
          } catch {
            return null;
          }
        };
        const evidenceFile = pickLatest(outDir);
        // 让评估页能看见：把新证据并入 patch\eval\runs（最近证据只扫这个目录）
        try {
          if (evidenceFile) {
            const runsDir = join(EVAL_DIR, 'runs');
            mkdirSync(runsDir, { recursive: true });
            const dest = join(runsDir, evidenceFile.split('\\').pop());
            if (!existsSync(dest)) copyFileSync(evidenceFile, dest);
          }
        } catch (e) {
          /* 收口失败不影响本次结果返回 */
        }
        let evidence = null;
        if (evidenceFile) {
          try {
            evidence = JSON.parse(readFileSync(evidenceFile, 'utf8'));
          } catch {
            evidence = null;
          }
        }
        if (!evidence) {
          return reply({ dry: false, config: name, ok: false, exitCode: r.exitCode, text: (r.stdout + r.stderr).slice(-4000) });
        }
        const arms = evidence.config?.arms?.map((a) => a.id) ?? [];
        const allAssertions = evidence.config?.assertions?.map((a) => a.id) ?? [];
        const summary = Object.entries(evidence.summary ?? {}).map(([arm, s]) => ({
          arm,
          hit: s.hit,
          total: s.total,
          verified: s.verified,
          passed: s.passed,
          rate: s.pass_rate,
          truncated: s.truncated,
          chars: s.chars,
        }));
        return reply({
          dry: false,
          config: name,
          ok: r.exitCode === 0,
          exitCode: r.exitCode,
          durationMs: r.durationMs,
          model: evidence.model,
          maxTokens: evidence.max_tokens,
          tokens: evidence.tokens,
          arms,
          tasks: evidence.config?.tasks?.map((t) => t.id) ?? [],
          assertions: allAssertions,
          rows: (evidence.rows ?? []).map((row) => ({
            task: row.task,
            arm: row.arm,
            finish: row.finish,
            truncated: row.truncated === true,
            tokens: (row.input_tokens ?? 0) + (row.output_tokens ?? 0),
            hit: row.hit_count,
            hits: row.hits ?? [],
            missed: allAssertions.filter((id) => !(row.hits ?? []).includes(id)),
            chars: (row.text ?? '').length,
          })),
          summary,
          isolation: evidence.isolation ?? null,
          evidenceFile,
          text: (r.stdout || '').slice(-2000),
        });
      }
      if (url.pathname === '/fused') {
        if (!existsSync(FUSED_DIR)) return reply({ dir: FUSED_DIR, dirs: [] });
        const dirs = readdirSync(FUSED_DIR).map((d) => {
          const full = `${FUSED_DIR}\\${d}`;
          return { name: d, mtime: statSync(full).mtime.toISOString(), hasSkill: existsSync(`${full}\\SKILL.md`) };
        });
        return reply({ dir: FUSED_DIR, dirs });
      }
      if (url.pathname === '/create') {
        // 融合：把多份技能的正文交给模型合成一份新的（要 key，要确认，产物落 staging\fused）
        const skill = url.searchParams.get('skill') || '';
        const sources = (url.searchParams.get('sources') || '').split(',').map((s) => s.trim()).filter(Boolean);
        const name = (url.searchParams.get('name') || skill).trim();
        const mode = url.searchParams.get('mode') || 'merge';
        const confirm = url.searchParams.get('confirm') === 'yes';
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) return reply({ error: '名字不合法（用 kebab-case）' }, 400);
        if (!['merge', 'absorb', 'compose'].includes(mode)) return reply({ error: 'mode 只能是 merge / absorb / compose' }, 400);
        if (!sources.length) return reply({ error: '至少要给两份来料' }, 400);
        const dirs = [];
        for (const s of sources) {
          if (!/^[a-z0-9][a-z0-9._-]*$/i.test(s)) return reply({ error: `来料名不合法：${s}` }, 400);
          const full = `${SKILLS_DIR}\\${s}`;
          if (!existsSync(`${full}\\SKILL.md`)) return reply({ error: `来料不是一个技能目录：${full}` }, 404);
          dirs.push(full);
        }
        const key = readSecret();
        if (!key) return reply({ error: '没有模型 key：把 key 放到 ' + SECRET_FILE }, 400);
        const out = `${FUSED_DIR}\\${name}`;
        if (!confirm) {
          return reply({
            needsConfirm: true,
            would: { argv: ['create', ...dirs.map((d) => d.replace(SKILLS_DIR, '<skills>')), '--out', out, '--mode', mode, '--name', name], needsModel: true },
            note: '融合会生成一份新技能正文（不覆盖任何现有技能）。确认后带 confirm=yes 再调一次。',
          });
        }
        const r = await runCli(['create', ...dirs, '--out', out, '--mode', mode, '--name', name, '--json'], 900000, { QKD_MODEL_API_KEY: key });
        let parsed = null;
        try {
          parsed = JSON.parse(r.stdout.trim());
        } catch {
          parsed = null;
        }
        const rec = existsSync(out + '\\SKILL.md') ? await runDistill(['fuse-record', '--dir', out, '--name', name, '--kind', 'create', '--inputs', sources.join(',')]) : null;
        return reply({
          recorded: rec,
          ok: r.exitCode === 0,
          exitCode: r.exitCode,
          durationMs: r.durationMs,
          out,
          name,
          mode,
          summary: parsed
            ? {
                bytesOut: parsed.bytesOut ?? parsed.bytes ?? null,
                rules: parsed.rules ?? parsed.rulesPassed ?? null,
                failed: parsed.failed ?? null,
              }
            : null,
          text: parsed ? null : (r.stdout + r.stderr).slice(-4000),
        });
      }

      if (url.pathname === '/fuse') {
        // 语义融合：走模型（fuse-skill），约 1 分钟；产物目录名必须等于 frontmatter name（R01）
        const base = url.searchParams.get('base') || '';
        const other = url.searchParams.get('other') || '';
        const confirm = url.searchParams.get('confirm') === 'yes';
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(base) || !/^[a-z0-9][a-z0-9._-]*$/i.test(other)) {
          return reply({ error: 'base / other 必须是技能目录名' }, 400);
        }
        const baseDir = SKILLS_DIR + '\\' + base;
        const otherDir = SKILLS_DIR + '\\' + other;
        for (const d of [baseDir, otherDir]) {
          if (!existsSync(d + '\\SKILL.md')) return reply({ error: '不是技能目录：' + d }, 404);
        }
        const key = readSecret();
        if (!key) return reply({ error: '没有模型 key：把 key 放到 ' + SECRET_FILE }, 400);
        const out = FUSED_DIR + '\\fuse-' + base + '\\' + base;
        if (!confirm) {
          return reply({
            needsConfirm: true,
            would: { argv: ['fuse-skill', base, other, '--out', out], needsModel: true, model: 'deepseek-flash', etaSeconds: 60 },
            note: '语义融合会把两份正文交给模型重写合成一份新技能（约 1 分钟、按 token 计费）。不覆盖任何现有技能。',
          });
        }
        mkdirSync(dirname(out), { recursive: true });
        const r = await runCli(['fuse-skill', baseDir, otherDir, '--out', out], 900000, { QKD_MODEL_API_KEY: key });
        const rec = existsSync(out + '\\SKILL.md') ? await runDistill(['fuse-record', '--dir', out, '--name', 'fuse-' + base, '--kind', 'fuse', '--inputs', base + ',' + other]) : null;
        const fuseBans = existsSync(out + '\\SKILL.md') ? await runBans(banArgs([base, other], out)) : null;
        return reply({
          recorded: rec,
          bans: fuseBans,
          adoptHint: existsSync(out + '\\SKILL.md') ? '产物还在沙盒：要进鼎点「收编进鼎」（带 confirm=yes 调 /adopt）' : null,
          ok: r.exitCode === 0,
          exitCode: r.exitCode,
          durationMs: r.durationMs,
          out,
          base,
          other,
          text: (r.stdout + r.stderr).slice(-4000),
        });
      }
      if (url.pathname === '/adopt') {
        // 收编：把沙盒融合产物搬进唯一真相 patch\skills\<skill>，逐文件打戳 + 记 epoch
        const name = (url.searchParams.get('name') || '').trim();
        const skill = (url.searchParams.get('skill') || name).trim();
        const confirm = url.searchParams.get('confirm') === 'yes';
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) return reply({ error: '名字不合法' }, 400);
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(skill)) return reply({ error: '技能名不合法' }, 400);
        let dir = FUSED_DIR + '\\' + name;
        // fuse-skill 的产物会多一层同名目录（nested），两种都认
        if (!existsSync(dir + '\\SKILL.md')) {
          // fuse-skill 的产物会多一层同名目录（名字不一定是 name），扫一层找带 SKILL.md 的
          try { for (const e of readdirSync(dir)) { const sub = dir + '\\' + e; if (statSync(sub).isDirectory() && existsSync(sub + '\\SKILL.md')) { dir = sub; break; } } } catch {}
        }
        if (!existsSync(dir + '\\SKILL.md')) return reply({ error: '沙盒里没有这个产物：' + dir }, 404);
        const target = SKILLS_DIR + '\\' + skill;
        if (!confirm) {
          return reply({
            needsConfirm: true,
            would: { from: dir, to: target, note: existsSync(target) ? '目标技能已存在，将按文件覆盖（先备份）' : '将新建这个技能目录' },
          });
        }
        if (existsSync(target)) {
          const stampDir = DEPLOY_BACKUP + '\\' + stamp() + '\\' + skill;
          mkdirSync(dirname(stampDir), { recursive: true });
          cpSync(target, stampDir, { recursive: true });
        }
        // 禁令门：用账本里这笔产物的来料做基线
        const ledgerPath = 'D:\\造化乾坤鼎-工作台\\patch\\ledger\\distill.jsonl';
        let inputs = [];
        try {
          for (const line of readFileSync(ledgerPath, 'utf8').split(/\r?\n/)) {
            if (!line.trim()) continue;
            const row = JSON.parse(line);
            if (row.by === 'fuse' && row.skill === name && row.inputs) inputs = String(row.inputs).split(',').filter(Boolean);
          }
        } catch {}
        if (!inputs.length && existsSync(SKILLS_DIR + '\\\\' + skill + '\\\\SKILL.md')) inputs = [skill];
        let bansGate = null;
        if (inputs.length) {
          bansGate = await runBans(banArgs(inputs, dir));
          const force = url.searchParams.get('force') === 'yes';
          if (bansGate && bansGate.missingCount > 0 && !force) {
            return reply({
              blocked: true,
              reason: '禁令核对没过：模型融合把 ' + bansGate.missingCount + '/' + bansGate.total + ' 条「禁止/不得」弄丢了',
              bans: bansGate,
              hint: '确认要收编就带 force=yes 再调一次（不建议；先回去补正文更稳）',
            }, 409);
          }
        }
        const r = await runDistill(['adopt', '--dir', dir, '--skill', skill]);
        return reply(r);
      }
      if (url.pathname === '/install') {
        const skill = url.searchParams.get('skill') || '';
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(skill)) return reply({ error: '技能名不合法' }, 400);
        const packDir = `${PACKS_DIR}\\${skill}`;
        if (!existsSync(packDir)) return reply({ error: `还没有包：${packDir}，先打包` }, 404);
        // 已经装过同名包 → 用 pack-upgrade（旧版进 .history），否则第一次装用 pack-install
        const already = latestInstall(skill);
        const sub = already ? 'pack-upgrade' : 'pack-install';
        const r = await runCli([sub, packDir, '--into', PRODUCT_DIR, '--json']);
        let parsed = null;
        try { parsed = JSON.parse(r.stdout.trim()); } catch { parsed = null; }
        return reply({
          ok: parsed ? parsed.ok : r.exitCode === 0,
          exitCode: r.exitCode,
          durationMs: r.durationMs,
          skill,
          action: sub,
          previous: already ? already.version : null,
          report: parsed,
          text: parsed ? null : (r.stdout + r.stderr).slice(-3000),
          installed: latestInstall(skill),
        });
      }
      if (url.pathname === '/deploy') {
        const skill = url.searchParams.get('skill') || '';
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(skill)) return reply({ error: '技能名不合法' }, 400);
        const latest = latestInstall(skill);
        if (!latest) return reply({ error: '还没安装到产品目录（先点「安装」）' }, 400);
        if (url.searchParams.get('confirm') !== 'yes') {
          return reply({ needsConfirm: true, skill, version: latest.version, dir: latest.dir,
            message: `确认把 ${skill}@${latest.version} 写进乾坤鼎的 data\\skills ？会先把现有目录备份到 patch\\_backup\\skills。` });
        }
        const target = join(DEPLOY_DIR, skill);
        let backup = null;
        if (existsSync(target)) {
          backup = join(DEPLOY_BACKUP, stamp(), skill);
          mkdirSync(dirname(backup), { recursive: true });
          cpSync(target, backup, { recursive: true });
        }
        mkdirSync(target, { recursive: true });
        cpSync(latest.dir, target, { recursive: true });
        const srcSha = sha256File(join(latest.dir, 'SKILL.md'));
        const dstSha = sha256File(join(target, 'SKILL.md'));
        const verified = !!(srcSha && srcSha === dstSha);
        return reply({ ok: verified, skill, version: latest.version, backup, verified, srcSha, dstSha, deployedAt: Date.now(), skills: deployedList() });
      }
      return reply({ error: 'not found', path: url.pathname }, 404);
    } catch (e) {
      return reply({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },
});

console.log(`造化鼎桥已启动 http://127.0.0.1:${server.port}  skills=${SKILLS_DIR}`);
