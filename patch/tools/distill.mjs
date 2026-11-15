// 蒸馏账本：来源戳、地图、时间线、更新检查。
// 用法：
//   bun distill.mjs stamp   [--dry]     从 imports.jsonl 回溯打戳（一次）
//   bun distill.mjs map     --json      技能×三层的融入度
//   bun distill.mjs timeline --json     按 epoch 的技能变更历史
//   bun distill.mjs updates  --json     来源有新版本的条目
//   bun distill.mjs land --src <qkd:路径> --skill <名> --to <references/x.md> [--epoch N]
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const SKILLS = join(ROOT, 'patch', 'skills');
const SRC_ROOT = 'D:\\乾坤鼎\\乾坤鼎Agent';
const IMPORTS = join(ROOT, 'patch', 'ledger', 'imports.jsonl');
const LEDGER = join(ROOT, 'patch', 'ledger', 'distill.jsonl');
const EPOCHS = join(ROOT, 'patch', 'ledger', 'epochs.jsonl');

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const rel = (p) => p.replace(ROOT + '\\', '').replace(/\\/g, '/');

function readJsonl(p) {
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
function writeJsonl(p, rows) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
}
function appendJsonl(p, row) {
  mkdirSync(dirname(p), { recursive: true });
  const prev = existsSync(p) ? readFileSync(p, 'utf8') : '';
  writeFileSync(p, prev + JSON.stringify(row) + '\n', 'utf8');
}

// 文件第一行：<!-- src: qkd:skills/04-shotlist/SKILL.md | epoch: 1 | sha: xxx -->
const STAMP_RE = /^<!--\s*src:\s*(qkd:[^\s|]+)\s*\|\s*epoch:\s*(\d+)\s*\|\s*sha:\s*([0-9a-f]{64})\s*-->\s*$/;

function readStamp(abs) {
  try {
    const head = readFileSync(abs, 'utf8').split(/\r?\n/, 1)[0];
    const m = STAMP_RE.exec(head);
    return m ? { src: m[1], epoch: Number(m[2]), srcSha: m[3] } : null;
  } catch { return null; }
}

function layerOf(relPath) {
  if (/(^|\/)SKILL\.md$/i.test(relPath)) return 'body';
  if (/(^|\/)agent\.json$/i.test(relPath)) return 'caps';
  return 'refs';
}

function skillFiles(skill) {
  const base = join(SKILLS, skill);
  const out = [];
  const walk = (d) => {
    for (const e of statSync(d).isDirectory() ? readdirSyncSafe(d) : []) {
      const abs = join(d, e);
      if (statSync(abs).isDirectory()) walk(abs);
      else out.push(abs);
    }
  };
  walk(base);
  return out;
}
function readdirSyncSafe(d) {
  try { return readdirSync(d); } catch { return []; }
}

function srcPathOf(srcId) {
  // qkd:skills/04-shotlist/SKILL.md → D:\乾坤鼎\乾坤鼎Agent\skills\04-shotlist\SKILL.md
  return join(SRC_ROOT, srcId.replace(/^qkd:/, '').replace(/\//g, '\\'));
}

function loadLedger() { return readJsonl(LEDGER); }

function cmdStamp(dry) {
  const imports = readJsonl(IMPORTS);
  const rows = loadLedger();
  const seen = new Set(rows.map(r => r.skill + '|' + r.to));
  let added = 0, skipped = 0, missing = 0;
  for (const it of imports) {
    const key = it.skill + '|' + it.to;
    if (seen.has(key)) { skipped++; continue; }
    const abs = join(SKILLS, it.skill, it.to.replace(/\//g, '\\'));
    if (!existsSync(abs)) { missing++; continue; }
    const already = readStamp(abs);
    if (!already) {
      const body = readFileSync(abs, 'utf8');
      const head = `<!-- src: qkd:${it.src} | epoch: 1 | sha: ${it.srcSha256} -->`;
      if (!dry) writeFileSync(abs, head + '\r\n' + body, 'utf8');
    }
    const row = {
      epoch: 1, ts: it.ts, srcId: `qkd:${it.src}`, srcSha: it.srcSha256,
      skill: it.skill, to: it.to, layer: layerOf(it.to),
      landedSha: sha(abs), bytes: statSync(abs).size, by: 'retro-imports',
    };
    if (!dry) appendJsonl(LEDGER, row);
    rows.push(row); seen.add(key); added++;
  }
  if (!existsSync(EPOCHS) && !dry) {
    appendJsonl(EPOCHS, { epoch: 1, ts: new Date().toISOString(), label: '首次注入：乾坤鼎 04 镜表 + 06 提示词', files: added });
  }
  console.log(JSON.stringify({ ok: true, added, skipped, missing, dry: !!dry }, null, 2));
}

function cmdMap() {
  const rows = loadLedger();
  const bySkill = new Map();
  for (const r of rows) {
    if (!bySkill.has(r.skill)) bySkill.set(r.skill, []);
    bySkill.get(r.skill).push(r);
  }
  const skills = readdirSyncSafe(SKILLS).filter(n => statSync(join(SKILLS, n)).isDirectory()).sort();
  const out = [];
  for (const s of skills) {
    const files = skillFiles(s);
    const layers = { body: { total: 0, in: 0 }, refs: { total: 0, in: 0 }, caps: { total: 0, in: 0 } };
    let bodyText = '';
    try { bodyText = readFileSync(join(SKILLS, s, 'SKILL.md'), 'utf8'); } catch {}
    const entries = [];
    for (const f of files) {
      const rp = rel(f).replace(`patch/skills/${s}/`, '');
      const L = layerOf(rp);
      layers[L].total++;
      const st = readStamp(f);
      if (!st) continue;
      layers[L].in++;
      const cur = sha(f);
      let state = 'ok';
      const srcAbs = srcPathOf(st.src);
      const srcExists = existsSync(srcAbs);
      const srcNow = srcExists ? sha(srcAbs) : null;
      if (srcExists && srcNow !== st.srcSha) {
        const rec = rows.find(r => r.skill === s && r.to === rp);
        const localChanged = rec && rec.landedSha && rec.landedSha !== cur;
        state = localChanged ? 'branch' : 'update';
      }
      if (state === 'ok' && !bodyText.includes(basename(rp))) state = 'orphan';
      entries.push({ path: rp, layer: L, state, src: st.src, epoch: st.epoch, srcSha: st.srcSha, shaNow: cur });
    }
    out.push({ skill: s, layers, total: files.length, in: entries.length, refsOrphans: entries.filter(e => e.state === 'orphan').length, entries });
  }
  console.log(JSON.stringify({ ok: true, skills: out, epochCount: readJsonl(EPOCHS).length }, null, 2));
}

function cmdTimeline() {
  const rows = loadLedger();
  const eps = readJsonl(EPOCHS);
  const map = new Map();
  for (const r of rows) {
    const e = r.epoch || 1;
    if (!map.has(e)) map.set(e, { epoch: e, files: 0, skills: {} });
    const g = map.get(e);
    g.files++;
    g.skills[r.skill] = (g.skills[r.skill] || 0) + 1;
  }
  const out = [...map.values()].sort((a, b) => a.epoch - b.epoch).map(g => {
    const meta = eps.find(x => x.epoch === g.epoch) || {};
    return { ...g, ts: meta.ts || null, label: meta.label || `epoch ${g.epoch}` };
  });
  console.log(JSON.stringify({ ok: true, epochs: out }, null, 2));
}

function cmdUpdates() {
  const rows = loadLedger();
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = r.skill + '|' + r.to;
    if (seen.has(k)) continue;
    seen.add(k);
    const srcAbs = srcPathOf(r.srcId);
    if (!existsSync(srcAbs)) continue;
    const now = sha(srcAbs);
    if (now === r.srcSha) continue;
    const abs = join(SKILLS, r.skill, r.to.replace(/\//g, '\\'));
    const cur = existsSync(abs) ? sha(abs) : null;
    const localChanged = cur && r.landedSha && r.landedSha !== cur;
    out.push({ skill: r.skill, to: r.to, srcId: r.srcId, state: localChanged ? 'branch' : 'update', recordedSrcSha: r.srcSha, srcShaNow: now, landedSha: r.landedSha, shaNow: cur, epoch: r.epoch });
  }
  console.log(JSON.stringify({ ok: true, updates: out, count: out.length }, null, 2));
}

const [cmd] = process.argv.slice(2);
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

if (cmd === 'stamp') cmdStamp(flag('--dry'));
else if (cmd === 'map') cmdMap();
else if (cmd === 'timeline') cmdTimeline();
else if (cmd === 'updates') cmdUpdates();
else {
  console.error('用法: stamp|map|timeline|updates');
  process.exit(2);
}
