// workflow 专用：把 A3–A12 按"规划 / 拍摄 / 提示词"聚合成三册，正文只留 A0–A2 + 索引。
// 逐字搬运，不改写正文；替换处只放指针。用法:
//   node split-workflow.mjs <workflowSkillDir> [--apply] [--backup <dir>]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dir = args[0];
if (!dir) { console.error('用法: node split-workflow.mjs <workflowSkillDir> [--apply] [--backup <dir>]'); process.exit(2); }
const apply = args.includes('--apply');
const bi = args.indexOf('--backup');
const backupDir = bi >= 0 ? args[bi + 1] : '';

const file = path.join(dir, 'SKILL.md');
const text = fs.readFileSync(file, 'utf8');
const lines = text.split('\n');

// 按 ## 切段
const sections = [];
let cur = { title: '', lines: [] };
for (const ln of lines) {
  if (/^##\s+\S/.test(ln) && cur.lines.length) { sections.push(cur); cur = { title: ln.replace(/^##\s+/, '').trim(), lines: [ln] }; }
  else cur.lines.push(ln);
}
sections.push(cur);

const BOOKS = [
  { file: 'runbook-plan.md',   title: '阶段手册·规划（A3 预算 / A4 资产 / A5 站位）', keys: ['A3.', 'A4.', 'A5.'] },
  { file: 'runbook-shoot.md',  title: '阶段手册·拍摄（A6 表演 / A7 运镜 / A8 跨段连续性）', keys: ['A6.', 'A7.', 'A8.'] },
  { file: 'runbook-prompt.md', title: '阶段手册·提示词（A9 模板 / A10 输出结构 / A11 校验 / A12 抛光）', keys: ['A9.', 'A10.', 'A11.', 'A12.'] }
];

const bookOf = (title) => BOOKS.find(b => b.keys.some(k => title.startsWith(k)));

const plan = [];
for (const s of sections) {
  const b = s.title ? bookOf(s.title) : null;
  if (b) plan.push({ section: s, book: b });
}

if (!plan.length) { console.log('没有可搬的段（A3–A12 未找到）'); process.exit(2); }

const movedLines = plan.reduce((n, p) => n + p.section.lines.length, 0);
const after = lines.length - movedLines + plan.length * 4;
console.log('原文 ' + lines.length + ' 行，搬 ' + plan.length + ' 段 / ' + movedLines + ' 行，预计剩 ' + after + ' 行');
for (const b of BOOKS) {
  const secs = plan.filter(p => p.book === b);
  console.log('  ' + b.file.padEnd(22) + secs.map(p => p.section.title.split(' ')[0]).join(' ') + '  (' + secs.reduce((n, p) => n + p.section.lines.length, 0) + ' 行)');
}

if (!apply) { console.log('\n（dry-run，未写入）'); process.exit(0); }

const refDir = path.join(dir, 'references');
fs.mkdirSync(refDir, { recursive: true });
if (backupDir) { fs.mkdirSync(backupDir, { recursive: true }); fs.copyFileSync(file, path.join(backupDir, 'SKILL.md')); }

// 写三册（逐字）
for (const b of BOOKS) {
  const secs = plan.filter(p => p.book === b);
  if (!secs.length) continue;
  const body = ['# ' + b.title, '', '> 本册是 `SKILL.md` 的逐字迁出，正文未改写。到此阶段时先读本册，再动手。', '']
    .concat(secs.flatMap(p => p.section.lines))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(path.join(refDir, b.file), body.trimEnd() + '\n', 'utf8');
}

// 重建正文：被搬的段换成指针；A0 前插入索引
const index = [
  '## 分段索引（A3–A12 已按主题分册）',
  '',
  '| 段 | 内容 | 在哪 |',
  '|---|---|---|',
  '| A0–A2 | 输入判定 / 输出语言与命名 / 全量节拍解析 | 本文件 |',
  '| A3–A5 | 分段与时长预算 / 资产与出镜状态 / 站位 | `references/runbook-plan.md` |',
  '| A6–A8 | 表演层 / 运镜与衔接 / 跨段连续性 | `references/runbook-shoot.md` |',
  '| A9–A12 | 提示词模板 / 输出结构 / 结构校验 / 交付前抛光 | `references/runbook-prompt.md` |',
  '',
  '动手前按上表读对应分册；只凭本文件的摘要动手视为没读。',
  ''
].join('\n');

const out = [];
let indexDone = false;
for (const s of sections) {
  const p = plan.find(x => x.section === s);
  if (!indexDone && s.title && s.title.startsWith('A0.')) { out.push(index); indexDone = true; }
  if (p) {
    out.push(s.lines[0]);
    out.push('');
    out.push('本节细节已移入 `references/' + p.book.file + '`：动手前先读该册对应段，按其中规则执行，不要凭记忆代替。');
    out.push('');
  } else {
    out.push(...s.lines);
  }
}
if (!indexDone) out.unshift(index);

const result = out.join('\n').replace(/\n{4,}/g, '\n\n\n');
fs.writeFileSync(file, result, 'utf8');

// 校验：搬走的内容必须原样出现在分册里
let missing = 0;
for (const p of plan) {
  const b = p.book;
  const ref = fs.readFileSync(path.join(refDir, b.file), 'utf8');
  const head = p.section.lines[0];
  if (!ref.includes(head)) missing++;
}
console.log('\n写出：SKILL.md → ' + result.split('\n').length + ' 行；分册 3 个；段落头校验缺失 ' + missing + ' 处');
