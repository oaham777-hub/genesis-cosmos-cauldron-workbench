// 造化鼎本地桥：把 zhaohua CLI 变成页面能点的接口
// 启动：bun.exe server.mjs   （默认 127.0.0.1:8791）
// 只用本机回环地址，不出网。
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
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

async function runCli(args, timeoutMs = 180000) {
  const started = Date.now();
  const proc = Bun.spawn([Bun.argv[0], CLI, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
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

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return json({ ok: true });
    try {
      if (url.pathname === '/health') {
        return json({ ok: true, zhaohuaDir: ZHAOHUA_DIR, skillsDir: SKILLS_DIR, skillsExists: existsSync(SKILLS_DIR) });
      }
      if (url.pathname === '/audit') {
        const target = url.searchParams.get('dir') || SKILLS_DIR;
        const r = await runCli(['audit', target]);
        return json({ ...parseAudit(r.stdout + r.stderr), exitCode: r.exitCode, durationMs: r.durationMs, target, raw: r.stdout.slice(-4000) });
      }
      if (url.pathname === '/verify') {
        const product = url.searchParams.get('product') || `${ZHAOHUA_DIR}\\zhaohua.product.json`;
        const r = await runCli(['verify', product]);
        return json({ exitCode: r.exitCode, durationMs: r.durationMs, text: (r.stdout + r.stderr).slice(-8000) });
      }
      if (url.pathname === '/inspect') {
        const skill = url.searchParams.get('skill');
        if (!skill) return json({ error: '缺少 skill 参数' }, 400);
        const r = await runCli(['inspect', `${SKILLS_DIR}\\${skill}`]);
        return json({ exitCode: r.exitCode, durationMs: r.durationMs, text: r.stdout + r.stderr });
      }
      if (url.pathname === '/packs') {
        return json(listPacks());
      }
      if (url.pathname === '/pack') {
        const skill = url.searchParams.get('skill');
        if (!skill) return json({ error: '缺少 skill 参数' }, 400);
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(skill)) return json({ error: '技能名不合法' }, 400);
        const src = `${SKILLS_DIR}\\${skill}`;
        if (!existsSync(src)) return json({ error: `找不到技能目录：${src}` }, 404);
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
        return json({
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
      if (url.pathname === '/deployed') return json({ dir: DEPLOY_DIR, skills: deployedList() });
      if (url.pathname === '/install') {
        const skill = url.searchParams.get('skill') || '';
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(skill)) return json({ error: '技能名不合法' }, 400);
        const packDir = `${PACKS_DIR}\\${skill}`;
        if (!existsSync(packDir)) return json({ error: `还没有包：${packDir}，先打包` }, 404);
        // 已经装过同名包 → 用 pack-upgrade（旧版进 .history），否则第一次装用 pack-install
        const already = latestInstall(skill);
        const sub = already ? 'pack-upgrade' : 'pack-install';
        const r = await runCli([sub, packDir, '--into', PRODUCT_DIR, '--json']);
        let parsed = null;
        try { parsed = JSON.parse(r.stdout.trim()); } catch { parsed = null; }
        return json({
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
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(skill)) return json({ error: '技能名不合法' }, 400);
        const latest = latestInstall(skill);
        if (!latest) return json({ error: '还没安装到产品目录（先点「安装」）' }, 400);
        if (url.searchParams.get('confirm') !== 'yes') {
          return json({ needsConfirm: true, skill, version: latest.version, dir: latest.dir,
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
        return json({ ok: verified, skill, version: latest.version, backup, verified, srcSha, dstSha, deployedAt: Date.now(), skills: deployedList() });
      }      return json({ error: 'not found', path: url.pathname }, 404);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },
});

console.log(`造化鼎桥已启动 http://127.0.0.1:${server.port}  skills=${SKILLS_DIR}`);
