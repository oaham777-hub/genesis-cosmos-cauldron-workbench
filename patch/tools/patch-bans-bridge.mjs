// 给桥接上禁令核对：/bans 端点、runBans 辅助、BANS 字面路径（幂等）
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui\\server.mjs';
let t = readFileSync(F, 'utf8');
const log = [];

// 1) BANS 字面路径
const mBans = t.match(/const BANS = [^\n]*\n/);
if (mBans && mBans[0].includes('ROOT_PATCH')) {
  t = t.replace(mBans[0], "const BANS = 'D:\\\\造化乾坤鼎-工作台\\\\patch\\\\tools\\\\bans.mjs';\n");
  log.push('BANS 已改为字面路径');
}

// 2) runBans 辅助（挂在 runDistill 之后）
if (!t.includes('async function runBans(')) {
  const idx = t.indexOf('async function runDistill(args) {');
  if (idx < 0) { console.error('找不到 runDistill'); process.exit(1); }
  const end = t.indexOf('\n}', idx) + 2;
  const add = "\nasync function runBans(args) {\n  return runTool(BANS, args);\n}\nfunction banArgs(fromSkills, dir) {\n  return ['check', '--from', fromSkills.join(','), '--dir', dir];\n}\n";
  t = t.slice(0, end) + add + t.slice(end);
  log.push('runBans 已加');
}

// 3) /bans 端点
if (!t.includes("pathname === '/bans'")) {
  const marker = "if (url.pathname === '/distill')";
  const idx = t.indexOf(marker);
  if (idx < 0) { console.error('找不到 /distill'); process.exit(1); }
  const ep = `if (url.pathname === '/bans') {
        const from = (url.searchParams.get('from') || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (!from.length) return reply({ error: '要给 from（技能名，逗号分隔）' }, 400);
        const dir = url.searchParams.get('dir');
        if (dir) {
          if (!existsSync(dir)) return reply({ error: '目录不存在：' + dir }, 404);
          return reply(await runBans(banArgs(from, dir)));
        }
        const to = url.searchParams.get('to') || '';
        if (!/^[a-z0-9][a-z0-9._-]*$/i.test(to)) return reply({ error: '要给 to（技能名）或 dir' }, 400);
        return reply(await runBans(['check', '--from', from.join(','), '--to', to]));
      }
      `;
  t = t.slice(0, idx) + ep + t.slice(idx);
  log.push('/bans 已加');
}

writeFileSync(F, t, 'utf8');
console.log(log.join(' / ') || '已是目标态');
