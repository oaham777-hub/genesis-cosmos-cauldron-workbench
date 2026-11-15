// 只补缺：对比"来料 vs 目标技能"，列出目标里没有的节/文件；按勾选补进去。
// 用法：
//   bun gap.mjs plan --target film-cinedance --from "qkd:skills/06-prompt/references/xxx.md" [--json]
//   bun gap.mjs files --target film-cinedance --from-skill film-shotlist [--json]
//   bun gap.mjs graft --target film-cinedance --from "<srcId>" --sections 2,5-6 --mode body [--json]
//   bun gap.mjs graft --target film-cinedance --from "<srcId>" --sections 2 --mode file --as references/xxx.md [--json]
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const SKILLS = join(ROOT, 'patch', 'skills');
const SRC_ROOT = 'D:\\乾坤鼎\\乾坤鼎Agent';
const LEDGER = join(ROOT, 'patch', 'ledger', 'distill.jsonl');
const EPOCHS = join(ROOT, 'patch', 'ledger', 'epochs.jsonl');

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const readJsonl = (p) => (existsSync(p) ? readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);
const appendJsonl = (p, row) => { mkdirSync(dirname(p), { recursive: true }); const prev = existsSync(p) ? readFileSync(p, 'utf8') : ''; writeFileSync(p, prev + JSON.stringify(row) + '\n', 'utf8'); };
const nextEpoch = () => { const rows = readJsonl(EPOCHS); return rows.reduce((m, r) => Math.max(m, r.epoch || 0), 0) + 1; };
const srcPath = (id) => join(SRC_ROOT, String(id).replace(/^qkd:/, '').replace(/\//g, '\\'));
const argv = process.argv.slice(2);
const cmd = argv[0];
const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const has = (n) => argv.includes(n);
const out = (o) => console.log(JSON.stringify(o, null, 2));

function sectionsOf(text) {
  const lines = text.split(/\r?\n/);
  const res = [];
  let cur = null;
  for (const ln of lines) {
    const m = /^(#{1,3})\s+(.*)$/.exec(ln);
    if (m) {
      if (cur) res.push(cur);
      cur = { no: res.length + 1, level: m[1].length, title: m[2].trim(), lines: [] };
    } else if (cur) cur.lines.push(ln);
  }
  if (cur) res.push(cur);
  const total = res.reduce((s, x) => s + x.lines.join('\n').length, 0) || 1;
  return res.map((x) => {
    const body = x.lines.join('\n').trim();
    return { no: x.no, level: x.level, title: x.title, chars: body.length, share: +(body.length / total).toFixed(3), body };
  });
}

const sigLines = (body) => body.split(/\r?\n/)  .map((l) => l.replace(/^[\s>*\-\d.、（）()]+/, '').trim())
  .filter((l) => l.length >= 12)
  .slice(0, 3);

// 补进来的正文里可能带 references/xxx.md 这类链接，目标技能里没有对应文件 → 降级成纯文字，避免 R06 假缺失。
function relink(body, targetDir) {
  const exists = (name) => existsSync(join(targetDir, 'references', name));
  return body
    .replace(/\[([^\]]+)\]\(\.\.?\/[^)]*?references\/([^)#\s]+)(#[^)]*)?\)/g, (m, text, name, anc) => (exists(name) ? m : text))
    .replace(/\[([^\]]+)\]\(references\/([^)#\s]+)(#[^)]*)?\)/g, (m, text, name, anc) => (exists(name) ? m : text))
    .replace(/`references\/([^`#\s]+)`/g, (m, name) => (exists(name) ? m : '`' + name + '`'))
    .replace(/(?<![\w/`])references\/([A-Za-z0-9._-]+\.md)/g, (m, name) => (exists(name) ? m : name));
}
function norm(s) { return s.replace(/\s+/g, '').replace(/[，。；：、,.;:!?！？"“”'‘’`]/g, ''); }

function plan(target, fromId) {
  const srcAbs = srcPath(fromId);
  if (!existsSync(srcAbs)) return { ok: false, error: '来料不存在：' + srcAbs };
  const targetSkill = join(SKILLS, target, 'SKILL.md');
  if (!existsSync(targetSkill)) return { ok: false, error: '目标技能不存在：' + target };
  const srcText = readFileSync(srcAbs, 'utf8');
  const tgtText = norm(readFileSync(targetSkill, 'utf8'));
  const secs = sectionsOf(srcText).map((s) => {
    const sig = sigLines(s.body);
    const hit = sig.filter((l) => tgtText.includes(norm(l).slice(0, 24)));
    return { no: s.no, title: s.title, chars: s.chars, share: s.share, present: hit.length > 0, hitLines: hit.length, preview: (s.body.split(/\r?\n/).find((l) => l.trim()) || '').slice(0, 80) };
  });
  const missing = secs.filter((s) => !s.present);
  return { ok: true, target, from: fromId, srcBytes: statSync(srcAbs).size, sections: secs, missing: missing.map((s) => s.no), coverage: +((secs.length - missing.length) / (secs.length || 1)).toFixed(2) };
}

function filesGap(target, fromSkill) {
  const fromDir = join(SKILLS, fromSkill, 'references');
  const toDir = join(SKILLS, target, 'references');
  const list = (d) => (existsSync(d) ? readdirSync(d).filter((f) => statSync(join(d, f)).isFile()) : []);
  const from = list(fromDir).map((f) => ({ name: f, bytes: statSync(join(fromDir, f)).size }));
  const to = new Set(list(toDir));
  const tgtBody = existsSync(join(SKILLS, target, 'SKILL.md')) ? readFileSync(join(SKILLS, target, 'SKILL.md'), 'utf8') : '';
  return {
    ok: true, target, fromSkill,
    onlyInSource: from.filter((f) => !to.has(f.name)).map((f) => ({ ...f, referenced: tgtBody.includes(f.name) })),
    shared: from.filter((f) => to.has(f.name)).map((f) => f.name),
  };
}

function graft(target, fromId, sel, mode, asName) {
  const srcAbs = srcPath(fromId);
  if (!existsSync(srcAbs)) return { ok: false, error: '来料不存在：' + srcAbs };
  const secs = sectionsOf(readFileSync(srcAbs, 'utf8'));
  const pick = sel ? secs.filter((s) => sel.includes(s.no)) : secs;
  if (!pick.length) return { ok: false, error: '没选中任何节' };
  const srcSha = sha(srcAbs);
  const epoch = nextEpoch();
  const stamp = `<!-- src: ${fromId} | epoch: ${epoch} | sha: ${srcSha} -->`;

  if (mode === 'file') {
    const rel = (asName || ('references/' + basename(srcAbs))).replace(/\\/g, '/');
    const dst = join(SKILLS, target, rel.replace(/\//g, '\\'));
    mkdirSync(dirname(dst), { recursive: true });
    const head = pick.length === secs.length ? '' : `<!-- 摘录：第 ${pick.map((s) => s.no).join(',')} 节 -->\n`;
    const tgtDir = join(SKILLS, target);
    const txt = pick.map((s) => '## ' + s.title + '\n' + relink(s.body, tgtDir)).join('\n\n');
    writeFileSync(dst, stamp + '\n' + head + txt + '\n', 'utf8');
    appendJsonl(LEDGER, { epoch, ts: new Date().toISOString(), srcId: fromId, srcSha, skill: target, to: rel, layer: 'refs', landedSha: sha(dst), bytes: statSync(dst).size, by: 'gap-graft' });
    appendJsonl(EPOCHS, { epoch, ts: new Date().toISOString(), label: `补缺（文件）：${target}/${basename(rel)} ← ${fromId.replace('qkd:', '')}`, files: 1 });
    return { ok: true, mode, epoch, wrote: rel, bytes: statSync(dst).size, sections: pick.map((s) => s.no) };
  }

  const skillFile = join(SKILLS, target, 'SKILL.md');
  const body = readFileSync(skillFile, 'utf8');
  const block = '\n\n' + stamp + '\n## 补入：' + pick.map((s) => s.title).join(' / ') + '\n\n' +
    '> 本节由造化鼎「只补缺」补入，来源 ' + fromId + '，epoch ' + epoch + '。改之前先看戳里的 sha。\n\n' +
    pick.map((s) => '### ' + s.title + '\n\n' + relink(s.body, join(SKILLS, target))).join('\n\n') + '\n';
  writeFileSync(skillFile, body.replace(/\s*$/, '') + block, 'utf8');
  appendJsonl(EPOCHS, { epoch, ts: new Date().toISOString(), label: `补缺（正文）：${target} ← ${fromId.replace('qkd:', '')} 第 ${pick.map((s) => s.no).join(',')} 节`, files: 1 });
  return { ok: true, mode: 'body', epoch, added: block.length, sections: pick.map((s) => s.no), skillFile };
}

function parseSel(s) {
  if (!s) return null;
  const out2 = [];
  for (const part of String(s).split(',')) {
    const t = part.trim();
    if (!t) continue;
    const m = /^(\d+)-(\d+)$/.exec(t);
    if (m) { for (let i = +m[1]; i <= +m[2]; i++) out2.push(i); } else if (/^\d+$/.test(t)) out2.push(+t);
  }
  return out2;
}

if (cmd === 'plan') out(plan(val('--target'), val('--from')));
else if (cmd === 'files') out(filesGap(val('--target'), val('--from-skill')));
else if (cmd === 'graft') {
  if (!has('--confirm')) out({ ok: false, needsConfirm: true, message: '会改 patch\\skills 下的目标技能，并记一条新 epoch。加 --confirm 才写。' });
  else out(graft(val('--target'), val('--from'), parseSel(val('--sections')), val('--mode') || 'body', val('--as')));
} else out({ ok: false, error: '用法: plan|files|graft' });
