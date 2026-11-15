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
      const rec0 = rows.find(r => r.skill === s && r.to === rp);
      const localChanged = rec0 && rec0.landedSha && rec0.landedSha !== cur;
      if (srcExists && srcNow !== st.srcSha) {
        state = localChanged ? 'branch' : 'update';
      } else if (localChanged) {
        state = 'local';
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


// ---------- 接线：把 references 写进 SKILL.md 正文 ----------
const WIRE_MARK = '## 本层参考资料（投放接线）';
function wireOne(skill) {
  const md = join(SKILLS, skill, 'SKILL.md');
  if (!existsSync(md)) return { skill, ok: false, error: '没有 SKILL.md' };
  let text = readFileSync(md, 'utf8');
  const rows = loadLedger().filter(r => r.skill === skill);
  const add = [];
  for (const r of rows) {
    if (text.includes(r.to)) continue;
    if (add.some(a => a.to === r.to)) continue;
    add.push({ to: r.to, srcId: r.srcId, epoch: r.epoch });
  }
  if (!add.length) return { skill, ok: true, added: 0, bytes: statSync(md).size };
  let next = text.replace(/\s+$/, '');
  if (!next.includes(WIRE_MARK)) {
    next += '\n\n' + WIRE_MARK + '\n\n> 这一节是造化鼎投放时自动接的线：下面每个文件来自外部来料，文件头有来源戳；改它们之前先看 sha，因为来源可能更新。\n';
  }
  for (const a of add) {
    next += '\n- `' + a.to + '` ← ' + a.srcId.replace('qkd:skills/', '') + '（epoch ' + a.epoch + '）';
  }
  writeFileSync(md, next + '\n', 'utf8');
  return { skill, ok: true, added: add.length, bytes: statSync(md).size, files: add.map(a => a.to) };
}

function cmdWire(skill) {
  const rows = loadLedger();
  const skills = skill ? [skill] : [...new Set(rows.map(r => r.skill))].sort();
  const out = skills.map(s => wireOne(s));
  console.log(JSON.stringify({ ok: true, result: out, totalAdded: out.reduce((a, b) => a + (b.added || 0), 0) }, null, 2));
}
// ---------- 来料清单 ----------
function cmdSources() {
  const rows = loadLedger();
  const stamped = new Set(rows.map(r => r.srcId));
  const targetOf = new Map();
  for (const r of rows) {
    if (!targetOf.has(r.srcId)) targetOf.set(r.srcId, []);
    targetOf.get(r.srcId).push(r.skill + '/' + r.to);
  }
  const out = [];
  const skillsDir = join(SRC_ROOT, 'skills');
  for (const layer of readdirSyncSafe(skillsDir)) {
    const refsDir = join(skillsDir, layer, 'references');
    if (!existsSync(refsDir)) continue;
    for (const f of readdirSyncSafe(refsDir)) {
      if (!/\.(md|txt)$/i.test(f)) continue;
      const abs = join(refsDir, f);
      let st; try { st = statSync(abs); } catch { continue; }
      if (!st.isFile()) continue;
      const srcId = 'qkd:skills/' + layer + '/references/' + f;
      out.push({
        srcId, layer, name: f, bytes: st.size, sha: sha(abs),
        stamped: stamped.has(srcId), targets: targetOf.get(srcId) || [],
      });
    }
  }
  out.sort((a, b) => (a.stamped === b.stamped ? b.bytes - a.bytes : (a.stamped ? 1 : -1)));
  console.log(JSON.stringify({ ok: true, sources: out, total: out.length, unstamped: out.filter(s => !s.stamped).length }, null, 2));
}

// ---------- 拆件：按标题切节 ----------
function splitSections(text) {
  const lines = text.split(/\r?\n/);
  const secs = [];
  let cur = { level: 0, title: '(开篇)', start: 0, lines: [] };
  lines.forEach((ln, i) => {
    const m = /^(#{1,3})\s+(.*)$/.exec(ln);
    if (m) {
      if (cur.lines.length) secs.push(cur);
      cur = { level: m[1].length, title: m[2].trim(), start: i, lines: [ln] };
    } else {
      cur.lines.push(ln);
    }
  });
  if (cur.lines.length) secs.push(cur);
  return secs.map((s, i) => ({ n: i + 1, level: s.level, title: s.title, lines: s.lines.length, chars: s.lines.join('\n').length, body: s.lines }));
}

function parseSel(sel, max) {
  if (!sel) return null;
  const set = new Set();
  for (const part of String(sel).split(',')) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!m) continue;
    const a = Number(m[1]), b = Number(m[2] || m[1]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= max) set.add(i);
  }
  return set.size ? set : null;
}

function cmdPlan(srcId, skill, to) {
  const abs = srcPathOf(srcId);
  if (!existsSync(abs)) { console.log(JSON.stringify({ ok: false, error: '来料不存在: ' + abs })); return; }
  const text = readFileSync(abs, 'utf8');
  const secs = splitSections(text);
  const target = join(SKILLS, skill, (to || 'references/' + basenameSafe(srcId)).replace(/\//g, '\\'));
  console.log(JSON.stringify({
    ok: true, srcId, skill, to: to || 'references/' + basenameSafe(srcId),
    srcBytes: statSync(abs).size, srcSha: sha(abs),
    sections: secs.map(s => ({ n: s.n, level: s.level, title: s.title, lines: s.lines, chars: s.chars })),
    collision: existsSync(target), targetAbs: target,
  }, null, 2));
}
function basenameSafe(srcId) { return srcId.split('/').pop(); }

function cmdLand(srcId, skill, to, sel, epochArg, labelArg) {
  const abs = srcPathOf(srcId);
  if (!existsSync(abs)) { console.log(JSON.stringify({ ok: false, error: '来料不存在' })); process.exit(1); }
  if (!skill) { console.log(JSON.stringify({ ok: false, error: '缺 --skill' })); process.exit(1); }
  const text = readFileSync(abs, 'utf8');
  const secs = splitSections(text);
  const want = parseSel(sel, secs.length);
  let body;
  if (want) body = secs.filter(s => want.has(s.n)).map(s => s.body.join('\n').trim()).join('\n\n') + '\n';
  else body = text;
  const epoch = Number(epochArg) || nextEpoch();
  const relTo = (to || 'references/' + basenameSafe(srcId)).replace(/\\/g, '/');
  const targetAbs = join(SKILLS, skill, relTo.replace(/\//g, '\\'));
  mkdirSync(dirname(targetAbs), { recursive: true });
  const stamp = `<!-- src: ${srcId} | epoch: ${epoch} | sha: ${sha(abs)} -->`;
  const existed = existsSync(targetAbs);
  writeFileSync(targetAbs, stamp + '\r\n' + body, 'utf8');
  const row = {
    epoch, ts: new Date().toISOString(), srcId, srcSha: sha(abs),
    skill, to: relTo, layer: layerOf(relTo),
    landedSha: sha(targetAbs), bytes: statSync(targetAbs).size,
    by: 'ui-land', sections: want ? [...want].sort((a, b) => a - b) : null,
  };
  appendJsonl(LEDGER, row);
  const eps = readJsonl(EPOCHS);
  if (!eps.some(e => e.epoch === epoch)) {
    appendJsonl(EPOCHS, { epoch, ts: row.ts, label: labelArg || ('投放：' + srcId.replace('qkd:skills/', '') + ' → ' + skill + '/' + relTo), files: 1 });
  }
  const wire = flag('--no-wire') ? null : wireOne(skill);
  console.log(JSON.stringify({ ok: true, epoch, to: relTo, targetAbs, bytes: row.bytes, landedSha: row.landedSha, overwrote: existed, sections: row.sections, wired: wire ? (wire.added || 0) : 0, skillMdBytes: wire ? wire.bytes : null }, null, 2));
}

function nextEpoch() {
  const eps = readJsonl(EPOCHS);
  return (eps.reduce((m, e) => Math.max(m, e.epoch || 0), 0) || 0) + 1;
}
const [cmd] = process.argv.slice(2);
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

if (cmd === 'stamp') cmdStamp(flag('--dry'));
else if (cmd === 'map') cmdMap();
else if (cmd === 'timeline') cmdTimeline();
else if (cmd === 'updates') cmdUpdates();
else if (cmd === 'sources') cmdSources();
else if (cmd === 'plan') cmdPlan(val('--src'), val('--skill'), val('--to'));
else if (cmd === 'wire') cmdWire(val('--skill'));
else if (cmd === 'land') cmdLand(val('--src'), val('--skill'), val('--to'), val('--sections'), val('--epoch'), val('--label'));
else {
  console.error('用法: stamp|map|timeline|updates|sources|plan|land|wire');
  process.exit(2);
}
