// /fuse 结果附禁令核对；/adopt 加禁令门（漏禁令要 force=yes 才放行）
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui\\server.mjs';
let t = readFileSync(F, 'utf8');
const log = [];

// 1) /fuse 返回里带 bans
if (!t.includes('bans: fuseBans')) {
  const anchor = "const rec = existsSync(out + '\\\\SKILL.md') ? await runDistill(['fuse-record', '--dir', out, '--name', base, '--kind', 'fuse', '--inputs', base + ',' + other]) : null;";
  if (!t.includes(anchor)) { console.error('/fuse rec 锚点未命中'); process.exit(1); }
  t = t.replace(anchor, anchor + "\n        const fuseBans = existsSync(out + '\\\\SKILL.md') ? await runBans(banArgs([base, other], out)) : null;");
  t = t.replace("          recorded: rec,\n          adoptHint:", "          recorded: rec,\n          bans: fuseBans,\n          adoptHint:");
  log.push('/fuse 附禁令核对');
}

// 2) /adopt 禁令门：从账本取该产物的来料，逐条核对；漏了要 force=yes
if (!t.includes('bansGate')) {
  const anchor = "        const r = await runDistill(['adopt', '--dir', dir, '--skill', skill]);";
  if (!t.includes(anchor)) { console.error('/adopt 锚点未命中'); process.exit(1); }
  const gate = `        // 禁令门：用账本里这笔产物的来料做基线
        const ledgerPath = 'D:\\\\造化乾坤鼎-工作台\\\\patch\\\\ledger\\\\distill.jsonl';
        let inputs = [];
        try {
          for (const line of readFileSync(ledgerPath, 'utf8').split(/\\r?\\n/)) {
            if (!line.trim()) continue;
            const row = JSON.parse(line);
            if (row.by === 'fuse' && row.skill === name && row.inputs) inputs = String(row.inputs).split(',').filter(Boolean);
          }
        } catch {}
        let bansGate = null;
        if (inputs.length) {
          bansGate = await runBans(banArgs(inputs, dir));
          const force = url.searchParams.get('force') === 'yes';
          if (bansGate && bansGate.missingCount > 0 && !force) {
            return reply({
              blocked: true,
              reason: '禁令核对没过：模型融合把 ' + bansGate.missingCount + '/' + bansGate.total + ' 条「禁止/不得」弄丢了',
              bans: bansGate,
              hint: '确认要收编就带 force=yes 再调一次（不建议；先回去补正文更稳）',
            }, 409);
          }
        }
`;
  t = t.replace(anchor, gate + anchor);
  t = t.replace("        const r = await runDistill(['adopt', '--dir', dir, '--skill', skill]);\n        return reply(r);", "        const r = await runDistill(['adopt', '--dir', dir, '--skill', skill]);\n        return reply({ ...r, bans: bansGate });");
  log.push('/adopt 加禁令门');
}

writeFileSync(F, t, 'utf8');
console.log(log.join(' / ') || '已是目标态');
