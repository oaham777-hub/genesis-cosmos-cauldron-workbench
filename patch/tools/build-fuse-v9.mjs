// v9：融合台中列换成 forge（视界熔炉）主题观象台，尺寸按用户截图（中列约 620px 高），
//     自动载入但延迟到首屏之后；提供「卸载」以释放内存；不再有主题切换。 
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const IDX = join(UI, 'index.html');
const DEST = join(ROOT, '_work', 'stable', 'app', 'Resources', 'app', 'views', 'mainview', 'zhaohua');

/* 1) 观象台页面：直接复用 obs-display.html（它已支持 ?theme=） */
const SRC = join(UI, 'obs-display.html');
if (!existsSync(SRC)) throw new Error('缺 obs-display.html');
copyFileSync(SRC, join(UI, 'obs-forge.html'));

/* 2) 换掉融合台中列的观象台块（用 div 配平定位，不靠正则猜结尾） */
let h = readFileSync(IDX, 'utf8');
const start = h.indexOf('<div id="fl-obs"');
if (start < 0) throw new Error('找不到 fl-obs 块');
let i = start + 4, depth = 1;
while (i < h.length && depth > 0) {
  const nextOpen = h.indexOf('<div', i);
  const nextClose = h.indexOf('</div>', i);
  if (nextClose < 0) break;
  if (nextOpen >= 0 && nextOpen < nextClose) { depth++; i = nextOpen + 4; }
  else { depth--; i = nextClose + 6; }
}
const end = i;
const oldLen = end - start;

const block = `<div id="fl-obs" style="min-width:0;grid-column:2;grid-row:2 / span 2;display:flex;flex-direction:column">
        <div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">
          <span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">观象台</span>
          <span style="font-size:11px;color:#6c7684">视界熔炉（forge）· 投喂项目主题改造</span>
          <button id="fl-obs-off" type="button" style="margin-left:auto;font-size:11px;color:#8b94a3;background:none;border:0;cursor:pointer">卸载</button>
          <a href="/zhaohua/obs-forge.html?theme=forge" target="_blank" style="font-size:11px;color:#8b94a3;text-decoration:none">全屏 ↗</a>
        </div>
        <div id="fl-obs-box" style="position:relative;height:620px;border:1px solid #1d2229;border-radius:12px;overflow:hidden;background:#07090c">
          <div id="fl-obs-hint" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6c7684;font-size:12px">观象台载入中…</div>
        </div>
      </div>`;
h = h.slice(0, start) + block + h.slice(end);

/* 3) 载入/卸载脚本（首屏之后 700ms 再挂 iframe，避免和首屏抢内存） */
const script = `
<script>
(function(){
  var box = document.getElementById('fl-obs-box');
  var hint = document.getElementById('fl-obs-hint');
  var off = document.getElementById('fl-obs-off');
  if (!box) return;
  var frame = null;
  function load(){
    if (frame) return;
    frame = document.createElement('iframe');
    frame.src = '/zhaohua/obs-forge.html?theme=forge';
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block';
    box.appendChild(frame);
    if (hint) hint.style.display = 'none';
  }
  function unload(){
    if (frame) { frame.remove(); frame = null; }
    if (hint) { hint.textContent = '已卸载（点这里重新载入）'; hint.style.display = 'flex'; hint.style.cursor = 'pointer'; }
  }
  if (off) off.addEventListener('click', function(e){ e.stopPropagation(); unload(); });
  if (hint) hint.addEventListener('click', load);
  setTimeout(load, 700);
  window.addEventListener('beforeunload', unload);
})();
</script>`;
h = h.replace('</body>', script + '\n</body>');
writeFileSync(IDX, h, 'utf8');

copyFileSync(join(UI, 'obs-forge.html'), join(DEST, 'obs-forge.html'));
copyFileSync(IDX, join(DEST, 'index.html'));
console.log(`v9 完成：替换 ${oldLen} 字符的中列块 → forge 观象台（620px）`);
