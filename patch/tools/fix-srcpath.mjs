// 一次性修补：把 distill.mjs 的 srcPathOf 写成正确形式（含反斜杠转义），并清掉遗留注释行。
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'D:\\造化乾坤鼎-工作台\\patch\\tools\\distill.mjs';
let src = readFileSync(FILE, 'utf8');

const good = [
  'function srcPathOf(srcId) {',
  '  const root = process.env.QKD_SRC_ROOT || SRC_ROOT;',
  '  // qkd:skills/04-shotlist/SKILL.md -> <root>\\skills\\04-shotlist\\SKILL.md',
  "  return join(root, srcId.replace(/^qkd:/, '').replace(/\\\\/g, '\\\\'));",
  '}',
].join('\r\n');

src = src.replace(/function srcPathOf\(srcId\) \{[\s\S]*?\r?\n\}/, good);
// 清掉旧的遗留注释行
src = src.split(/\r?\n/).filter((l) => !l.startsWith('  // qkd:skills/04-shotlist/SKILL.md → D:')).join('\r\n');

writeFileSync(FILE, src, 'utf8');
console.log('ok');
