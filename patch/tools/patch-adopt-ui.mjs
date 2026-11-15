// 给融合台的 create 结果加"已记账 + 收编进鼎"按钮（幂等，按唯一子串定位）
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui\\index.html';
let t = readFileSync(F, 'utf8');
if (t.includes('adopt-btn')) { console.log('already'); process.exit(0); }

const marker = "+ (r.text ? '<pre style=\"white-space:pre-wrap;font-size:12px;color:#c8d2dc\">' + r.text + '</pre>' : '');";
const parts = t.split(marker);
console.log('marker 命中次数:', parts.length - 1);
if (parts.length !== 2) { console.error('命中次数不是 1，放弃'); process.exit(1); }

const inject =
  "+ (r.recorded && r.recorded.ok\n"
  + "            ? '<div class=\"sub\" style=\"color:#7fcf9f\">已记进账本：epoch ' + r.recorded.epoch + ' · ' + r.recorded.files + ' 个文件 · ' + r.recorded.bytes + ' B（会出现在蒸馏地图的版本时间线里）</div>'\n"
  + "              + '<div class=\"row\" style=\"margin-top:8px\"><button class=\"btn\" id=\"adopt-btn\">收编进鼎（写入 patch\\\\skills\\\\' + r.name + '）</button></div>'\n"
  + "            : '')\n"
  + "          " + marker + "\n"
  + "        var ab = document.getElementById('adopt-btn');\n"
  + "        if (ab) ab.onclick = function () {\n"
  + "          if (!confirm('确认把沙盒产物收编进 patch\\\\skills\\\\' + r.name + '？会先备份目标目录，再逐文件打来源戳并记账。')) return;\n"
  + "          ab.disabled = true; ab.textContent = '收编中…';\n"
  + "          api('/adopt?name=' + encodeURIComponent(r.name) + '&skill=' + encodeURIComponent(r.name) + '&confirm=yes')\n"
  + "            .then(function (x) {\n"
  + "              if (x.error) { ab.textContent = '收编失败：' + x.error; return; }\n"
  + "              ab.textContent = '已收编 · epoch ' + (x.epoch || '?');\n"
  + "              fout.insertAdjacentHTML('beforeend', '<div class=\"sub\" style=\"color:#7fcf9f\">收编完成：' + (x.files || 0) + ' 个文件 → ' + (x.targetDir || '') + ' · 自动接线 ' + (x.wired || 0) + ' 条</div>');\n"
  + "            })\n"
  + "            .catch(function (e) { ab.textContent = '收编失败：' + e.message; });\n"
  + "        };";

t = parts[0] + inject + parts[1];
writeFileSync(F, t, 'utf8');
console.log('已注入收编按钮，长度', t.length);
