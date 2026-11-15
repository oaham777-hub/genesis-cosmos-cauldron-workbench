// 把"指向别的技能目录"的引用改写成本技能内的同副本引用。
// 只在本地已经存在同名文件时才改，改完正文语义不变（内容来自 fill-refs 复制进来的同一份）。
// 用法: node relink-refs.mjs <skillsDir> [--apply] [--backup <dir>]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const root = args[0];
if (!root) {
  console.error('用法: node relink-refs.mjs <skillsDir> [--apply] [--backup <dir>]');
  process.exit(2);
}
const apply = args.includes('--apply');
const bi = args.indexOf('--backup');
const backupDir = bi >= 0 ? args[bi + 1] : '';

// ](../other/references/x.md) 或 ](skills/other/references/x.md)，以及反引号里的 `../other/.../x.md`
const LINK = /\]\((?:\.\.\/|skills\/)([A-Za-z0-9_.\-]+)\/((?:[A-Za-z0-9_.\-\u4e00-\u9fa5]+\/)*)([A-Za-z0-9_.\-\u4e00-\u9fa5]+)\)/g;
const CODE = /`(?:\.\.\/|skills\/)([A-Za-z0-9_.\-]+)\/((?:[A-Za-z0-9_.\-\u4e00-\u9fa5]+\/)*)([A-Za-z0-9_.\-\u4e00-\u9fa5]+)`/g;

const skills = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
let totalChanged = 0, totalUnresolved = 0;

for (const name of skills) {
  const file = path.join(root, name, 'SKILL.md');
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const local = path.join(root, name, 'references');
  let changed = 0, unresolved = [];

  const next = text.replace(LINK, (whole, other, sub, base) => {
    const subPath = sub.replace(/^references\//, '');
    const candidates = [path.join(local, base), path.join(local, subPath + base), path.join(local, sub + base)];
    const hit = candidates.find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!hit) { unresolved.push(other + '/' + sub + base); return whole; }
    const rel = path.relative(path.join(root, name), hit).split(path.sep).join('/');
    changed++;
    return '](' + rel + ')';
  }).replace(CODE, (whole, other, sub, base) => {
    const subPath = sub.replace(/^references\//, '');
    const candidates = [path.join(local, base), path.join(local, subPath + base), path.join(local, sub + base)];
    const hit = candidates.find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!hit) { unresolved.push(other + '/' + sub + base); return whole; }
    const rel = path.relative(path.join(root, name), hit).split(path.sep).join('/');
    changed++;
    return '`' + rel + '`';
  });

  if (changed || unresolved.length) {
    console.log(name.padEnd(24) + ' 改写 ' + String(changed).padStart(2) + ' 处' + (unresolved.length ? '  未解析 ' + unresolved.length + ' 处: ' + unresolved.join(', ') : ''));
  }
  totalChanged += changed;
  totalUnresolved += unresolved.length;
  if (apply && changed) {
    if (backupDir) {
      const b = path.join(backupDir, name);
      fs.mkdirSync(b, { recursive: true });
      fs.copyFileSync(file, path.join(b, 'SKILL.md'));
    }
    fs.writeFileSync(file, next, 'utf8');
  }
}

console.log('\n合计改写 ' + totalChanged + ' 处，未解析 ' + totalUnresolved + ' 处' + (apply ? '（已写入）' : '（dry-run，未写入）'));
