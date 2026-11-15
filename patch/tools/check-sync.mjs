// 漂移检查：唯一真相目录 vs 运行时目录逐文件比 sha256。
// 退出码 0 = 一致；3 = 有漂移（多/少/改）；2 = 参数错误。
// 用法: node check-sync.mjs <canonicalDir> <runtimeDir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [canon, runtime] = process.argv.slice(2);
if (!canon || !runtime) { console.error('用法: node check-sync.mjs <canonicalDir> <runtimeDir>'); process.exit(2); }

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function walk(root) {
  const out = new Map();
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) out.set(path.relative(root, p).split(path.sep).join('/'), p);
    }
  }
  return out;
}

const a = walk(canon), b = walk(runtime);
const onlyCanon = [], onlyRun = [], changed = [], same = [];

for (const [rel, p] of a) {
  if (!b.has(rel)) onlyCanon.push(rel);
  else if (sha(p) !== sha(b.get(rel))) changed.push(rel);
  else same.push(rel);
}
for (const rel of b.keys()) if (!a.has(rel)) onlyRun.push(rel);

const report = (label, arr, limit = 8) => {
  if (!arr.length) return;
  console.log(label + ' ' + arr.length + ' 个：');
  for (const x of arr.slice(0, limit)) console.log('  ' + x);
  if (arr.length > limit) console.log('  … 还有 ' + (arr.length - limit) + ' 个');
};

console.log('唯一真相 patch/skills : ' + a.size + ' 个文件');
console.log('运行时   data/skills  : ' + b.size + ' 个文件');
console.log('一致 ' + same.length + ' · 仅真相有 ' + onlyCanon.length + ' · 仅运行时有 ' + onlyRun.length + ' · 内容不同 ' + changed.length);
report('只在 patch\\skills 里（未同步到运行时）', onlyCanon);
report('只在 data\\skills 里（运行时多出来的）', onlyRun);
report('两边都有但内容不同', changed);

const drift = onlyCanon.length + onlyRun.length + changed.length;
if (drift === 0) { console.log('\n一致：没有漂移。'); process.exit(0); }
console.log('\n漂移合计 ' + drift + ' 处 —— 用 apply.ps1 -Skills 从 patch\\skills 重新同步。');
process.exit(3);
