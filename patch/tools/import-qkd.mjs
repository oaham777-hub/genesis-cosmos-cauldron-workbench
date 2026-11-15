#!/usr/bin/env node
/**
 * import-qkd.mjs —— 把乾坤鼎的成品文件"投放"到工作台技能目录。
 *
 * 设计原则（对应 PLACEMENT.md）：
 *  - 只投放，不改正文。目标目录是 patch\data-additions\skills\，永远不直接写 data\skills。
 *  - 每个文件记 sha256 到 ledger（imports.jsonl），可追溯到上游。
 *  - 幂等：内容相同则跳过；内容变了则覆盖并记 marked=changed。
 *  - 源文件缺失 -> 报错退出，不静默跳过（缺一个就是缺一个）。
 *
 * 用法：
 *   node import-qkd.mjs --config ..\import\qkd-cinedance.json [--dry-run] [--force]
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, appendFile, stat } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const getFlag = (n) => argv.includes(n);
const cfgPath = (() => {
  const i = argv.indexOf('--config');
  if (i >= 0) return argv[i + 1];
  return argv.find((a) => a.endsWith('.json'));
})();

if (!cfgPath) {
  console.error('缺少 --config <file.json>');
  process.exit(2);
}

const dryRun = getFlag('--dry-run');
const force = getFlag('--force');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const kb = (n) => (n / 1024).toFixed(1);

const cfg = JSON.parse(await readFile(cfgPath, 'utf8'));
const rows = [];
let failed = 0;

for (const t of cfg.targets) {
  const src = path.join(cfg.qkdRoot, t.from);
  const dst = path.join(cfg.outRoot, t.skill, t.to);
  let srcBuf;
  try {
    srcBuf = await readFile(src);
  } catch {
    rows.push({ ok: false, skill: t.skill, to: t.to, note: '源文件不存在: ' + src });
    failed++;
    continue;
  }
  const hash = sha256(srcBuf);
  let prev = null;
  try {
    prev = await readFile(dst);
  } catch {
    /* 目标还不存在 */
  }
  if (prev && sha256(prev) === hash && !force) {
    rows.push({ ok: true, skill: t.skill, to: t.to, bytes: srcBuf.length, hash, action: 'same' });
    continue;
  }
  if (!dryRun) {
    await mkdir(path.dirname(dst), { recursive: true });
    await writeFile(dst, srcBuf);
    const line = {
      ts: new Date().toISOString(),
      skill: t.skill,
      to: t.to,
      src: t.from,
      bytes: srcBuf.length,
      srcSha256: hash,
      ledgerAction: prev ? 'changed' : 'added',
    };
    await mkdir(path.dirname(cfg.ledger), { recursive: true });
    await appendFile(cfg.ledger, JSON.stringify(line) + '\n');
  }
  rows.push({
    ok: true,
    skill: t.skill,
    to: t.to,
    bytes: srcBuf.length,
    hash,
    action: prev ? 'changed' : 'added',
  });
}

console.log('导入清单: ' + cfgPath + (dryRun ? '  [DRY-RUN]' : ''));
console.log('');
console.log('  #  ' + '目标文件'.padEnd(44) + 'KB'.padStart(7) + '  sha256    结果');
console.log('  ' + '-'.repeat(78));
rows.forEach((r, i) => {
  const n = String(i + 1).padStart(2, '0');
  if (!r.ok) {
    console.log('  ' + n + '  ' + r.to.padEnd(44) + '      -  ' + r.note);
    return;
  }
  const short = r.hash.slice(0, 8);
  console.log(
    '  ' + n + '  ' + r.to.padEnd(44) + kb(r.bytes).padStart(7) + '  ' + short + '   ' + r.action
  );
});

const okCount = rows.filter((r) => r.ok).length;
const added = rows.filter((r) => r.action === 'added').length;
const changed = rows.filter((r) => r.action === 'changed').length;
const same = rows.filter((r) => r.action === 'same').length;
const totalBytes = rows.reduce((a, r) => a + (r.bytes || 0), 0);

console.log('');
console.log(
  '合计: ' + okCount + '/' + rows.length + ' 成功 · 新增 ' + added + ' · 变更 ' + changed +
    ' · 未变 ' + same + ' · 共 ' + kb(totalBytes) + ' KB'
);
console.log('账本: ' + cfg.ledger + (dryRun ? '（dry-run 不写）' : ''));
if (failed > 0) {
  console.log('失败 ' + failed + ' 项 —— 上游缺文件，必须先补齐再继续。');
  process.exit(1);
}
