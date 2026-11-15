// 禁令核对：把技能里的"禁止/不得/不要"条目抽出来，核对目标里还在不在。
// 用法：
//   bun bans.mjs list  --skill <名>[,<名>] [--json]
//   bun bans.mjs check --from <名>[,<名>] --to <名> [--gate] [--json]
//   bun bans.mjs check --from <名>... --dir <沙盒产物目录> [--gate]
// --gate：有丢失时退出码 3（供桥当门禁用）
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKILLS = process.env.ZHAOHUA_SKILLS || 'D:\\造化乾坤鼎-工作台\\patch\\skills';

const BAN_RE = /(禁止|严禁|不得|不可|不能|不允许|不要|切勿|勿|避免|不准|禁止使用|must not|must never|never |do not |don't |forbidden|not allowed|avoid )/i;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const abs = join(dir, e);
    let st = null;
    try { st = statSync(abs); } catch { continue; }
    if (st.isDirectory()) walk(abs, out);
    else if (/\.(md|txt)$/i.test(e)) out.push(abs);
  }
  return out;
}

function norm(s) {
  return String(s || '')
    .replace(/[`*_>#\-|]/g, ' ')
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。；：、！？“”‘’（）《》【】…—·,.;:!?"'()\[\]{}]/g, '')
    .toLowerCase();
}

function bansOf(absFile) {
  const text = readFileSync(absFile, 'utf8');
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    if (/^(```|~~~|---)/.test(raw)) continue;
    if (!BAN_RE.test(raw)) continue;
    const clean = raw.replace(/^[-*+\d.\s>]+/, '').trim();
    if (clean.length < 8) continue;
    out.push({ file: absFile, line: i + 1, text: clean.slice(0, 300), key: norm(clean).slice(0, 40) });
  }
  return out;
}

function corpusOf(absDir) {
  const files = walk(absDir);
  const joined = files.map((f) => norm(readFileSync(f, 'utf8'))).join('\u0001');
  return { files, joined };
}

function listBans(names) {
  const out = [];
  for (const name of names) {
    const dir = join(SKILLS, name);
    if (!existsSync(dir)) { out.push({ skill: name, error: '技能目录不存在：' + dir, bans: [] }); continue; }
    const bans = [];
    for (const f of walk(dir)) bans.push(...bansOf(f));
    out.push({ skill: name, dir, count: bans.length, bans });
  }
  return out;
}

function checkBans(fromNames, target, targetDirArg) {
  const from = listBans(fromNames);
  const targetDir = targetDirArg || join(SKILLS, target);
  if (!existsSync(targetDir)) return { ok: false, error: '目标不存在：' + targetDir };
  const { files, joined } = corpusOf(targetDir);
  const kept = [];
  const missing = [];
  for (const s of from) {
    for (const b of (s.bans || [])) {
      const needle = b.key;
      const hit = needle && joined.includes(needle);
      const row = { skill: s.skill, text: b.text, line: b.line, from: b.file.split('\\').slice(-2).join('/') };
      if (hit) kept.push(row);
      else missing.push(row);
    }
  }
  const total = kept.length + missing.length;
  return {
    ok: true,
    target: targetDir,
    targetFiles: files.length,
    from: from.map((s) => ({ skill: s.skill, count: s.count, error: s.error })),
    total,
    kept: kept.length,
    missingCount: missing.length,
    coverage: total ? Math.round((kept.length / total) * 100) : 100,
    missing: missing.slice(0, 60),
    keptSample: kept.slice(0, 10),
  };
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const names = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

if (cmd === 'list') {
  const r = listBans(names(val('--skill')));
  console.log(JSON.stringify({ ok: true, skills: r.map((s) => ({ skill: s.skill, count: s.count, error: s.error, sample: (s.bans || []).slice(0, 8).map((b) => b.text) })) }, null, 2));
} else if (cmd === 'check') {
  const r = checkBans(names(val('--from')), val('--to'), val('--dir'));
  console.log(JSON.stringify(r, null, 2));
  if (argv.includes('--gate') && r.missingCount > 0) process.exit(3);
} else {
  console.error('用法: list --skill a,b | check --from a,b --to c [--gate] [--dir 沙盒目录]');
  process.exit(2);
}
