// 把超长 SKILL.md 的主体按二级标题拆分到 references/，正文只留指针。
// 只搬不改：被搬走的原文逐字写入 references 文件，正文那一段替换成三行指引。
// 用法: node split-long.mjs <skillDir> [--max-lines 500] [--apply] [--backup <dir>]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dir = args[0];
if (!dir) { console.error('用法: node split-long.mjs <skillDir> [--max-lines 500] [--apply] [--backup <dir>]'); process.exit(2); }
const li = args.indexOf('--max-lines');
const maxLines = li >= 0 ? Number(args[li + 1]) : 500;
const apply = args.includes('--apply');
const bi = args.indexOf('--backup');
const backupDir = bi >= 0 ? args[bi + 1] : '';

const file = path.join(dir, 'SKILL.md');
const text = fs.readFileSync(file, 'utf8');
const lines = text.split('\n');

// 切段：preamble（第一个 ## 之前）+ 每个 ## 段
const sections = [];
let cur = { title: '', start: 0, lines: [] };
lines.forEach((ln, i) => {
  if (/^##\s+\S/.test(ln) && i > 0) {
    sections.push(cur);
    cur = { title: ln.replace(/^##\s+/, '').trim(), start: i, lines: [ln] };
  } else {
    cur.lines.push(ln);
  }
});
sections.push(cur);

const slug = (t) => t.replace(/[`*"'《》「」（）()\[\]【】:：/\\|]/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'section';
const refDir = path.join(dir, 'references');

let total = lines.length;
const plan = [];
// 从最大的段开始搬，直到行数达标
// 从文末往前搬：前面的入口/判定规则留在正文，末尾的长附录先出列
for (let i = sections.length - 1; i >= 0 && total > maxLines; i--) {
  const s = sections[i];
  if (!s.title || s.lines.length <= 20 || s.moved) continue;
  s.moved = true;
  plan.push({ i, n: s.lines.length, s });
  total -= s.lines.length - 4; // 替换成 4 行指针
}

if (!plan.length) { console.log('无需拆分：' + lines.length + ' 行 ≤ ' + maxLines); process.exit(0); }

console.log('原文 ' + lines.length + ' 行，搬 ' + plan.length + ' 段，预计剩 ' + total + ' 行');
for (const p of plan) console.log('  搬 ' + String(p.n).padStart(4) + ' 行  ' + p.s.title);

if (!apply) { console.log('\n（dry-run，未写入）'); process.exit(0); }

fs.mkdirSync(refDir, { recursive: true });
if (backupDir) { fs.mkdirSync(backupDir, { recursive: true }); fs.copyFileSync(file, path.join(backupDir, 'SKILL.md')); }

const out = [];
const usedNames = new Set();
for (const p of plan) {
  let name = slug(p.s.title) + '.md';
  let n = 2;
  while (usedNames.has(name)) name = slug(p.s.title) + '-' + (n++) + '.md';
  usedNames.add(name);
  const body = p.s.lines.join('\n').replace(/^\n+|\n+$/g, '') + '\n';
  fs.writeFileSync(path.join(refDir, name), body, 'utf8');
  p.file = name;
}

for (const s of sections) {
  if (s.moved) {
    out.push(s.lines[0]);
    out.push('');
    out.push('本节细节已移入 `references/' + s.file + '`：动手前先读取，按其中规则执行，不要凭记忆代替。');
    out.push('');
  } else {
    out.push(...s.lines);
  }
}

const result = out.join('\n');
fs.writeFileSync(file, result, 'utf8');
console.log('\n写出：SKILL.md → ' + result.split('\n').length + ' 行，references 新增 ' + plan.length + ' 个文件');
