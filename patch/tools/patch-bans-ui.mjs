// 融合台展示禁令核对结果；收编被拦时显示丢了哪几条（幂等）
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui\\index.html';
let t = readFileSync(F, 'utf8');
if (t.includes('禁令核对：保留')) { console.log('已是目标态'); process.exit(0); }
const log = [];

const bansLine =
  "\n          + (r.bans ? '<div class=\"sub\" style=\"color:' + (r.bans.missingCount ? '#e08c8c' : '#7fcf9f') + '\">禁令核对：保留 ' + r.bans.kept + '/' + r.bans.total + ' 条（覆盖 ' + r.bans.coverage + '%）' + (r.bans.missingCount ? ' · <b>丢 ' + r.bans.missingCount + ' 条</b>' : '') + '</div>' : '')";

// 1) create 结果：记账行之后
const a1 = "          + (r.recorded && r.recorded.ok\n";
const i1 = t.indexOf(a1);
if (i1 < 0) { console.error('create 锚点未命中'); process.exit(1); }
// 找该表达式的结束（下一个 "          + (r.text ?"）
const end1 = t.indexOf('          + (r.text ?', i1);
if (end1 < 0) { console.error('create 结束锚点未命中'); process.exit(1); }
t = t.slice(0, end1) + bansLine.trimStart() + '\n' + t.slice(end1);
log.push('create 结果带禁令');

// 2) fuse 结果：退出码行之后
const a2 = "          + '<pre style=\"white-space:pre-wrap;font-size:12px;line-height:1.7;color:#c8d2dc;background:#0c1116;border:1px solid #222b35;border-radius:10px;padding:12px\">'";
const i2 = t.indexOf(a2);
if (i2 < 0) { console.error('fuse 锚点未命中'); process.exit(1); }
t = t.slice(0, i2) + bansLine.trimStart() + '\n' + t.slice(i2);
log.push('fuse 结果带禁令');

// 3) 收编被拦时的提示
const a3 = "            .then(function (x) {\n              if (x.error) { ab.textContent = '收编失败：' + x.error; return; }";
if (!t.includes(a3)) { console.error('adopt then 锚点未命中'); process.exit(1); }
const a3new = `            .then(function (x) {
              if (x.blocked) {
                ab.textContent = '被拦：禁令核对没过';
                var miss = (x.bans && x.bans.missing ? x.bans.missing : []).slice(0, 6)
                  .map(function (m) { return '<li>' + m.skill + ' · ' + m.text.slice(0, 60) + '</li>'; }).join('');
                fout.insertAdjacentHTML('beforeend', '<div class="sub" style="color:#e08c8c">' + (x.reason || '被禁令门拦住') + '<br>' + (x.hint || '') + '</div>'
                  + (miss ? '<ul style="margin:6px 0 0 18px;font-size:12px;color:#c8d2dc;line-height:1.8">' + miss + '</ul>' : ''));
                return;
              }
              if (x.error) { ab.textContent = '收编失败：' + x.error; return; }`;
t = t.replace(a3, a3new);
log.push('收编被拦显示丢失清单');

writeFileSync(F, t, 'utf8');
console.log(log.join(' / '));
