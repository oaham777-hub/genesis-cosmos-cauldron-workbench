// v10：给观象台加"尺寸三档"，并把左右两栏收窄一点，让中列更宽（不挤走功能）
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const IDX = join(UI, 'index.html');
const DEST = join(ROOT, '_work', 'stable', 'app', 'Resources', 'app', 'views', 'mainview', 'zhaohua');

let h = readFileSync(IDX, 'utf8');

/* 1) 三栏宽度：左 300→268、右 330→304，中列多出 ~58px */
h = h.replace('grid-template-columns:300px minmax(0,1fr) 330px', 'grid-template-columns:268px minmax(0,1fr) 304px');

/* 2) 观象台尺寸三档（默认 660），存 localStorage */
h = h.replace(
  '<span style="font-size:11px;color:#6c7684">视界熔炉（forge）· 投喂项目主题改造</span>',
  `<span style="font-size:11px;color:#6c7684">视界熔炉（forge）· 投喂项目主题改造</span>
          <span id="fl-obs-size" style="display:inline-flex;gap:6px;margin-left:8px">
            <button type="button" data-h="560" style="font-size:11px;color:#8b94a3;background:none;border:1px solid #242b34;border-radius:999px;padding:1px 8px;cursor:pointer">紧凑</button>
            <button type="button" data-h="660" style="font-size:11px;color:#8b94a3;background:none;border:1px solid #242b34;border-radius:999px;padding:1px 8px;cursor:pointer">标准</button>
            <button type="button" data-h="780" style="font-size:11px;color:#8b94a3;background:none;border:1px solid #242b34;border-radius:999px;padding:1px 8px;cursor:pointer">加高</button>
          </span>`
);

/* 3) 把原来的固定高度改成可调 */
h = h.replace(
  'id="fl-obs-box" style="position:relative;height:620px;',
  'id="fl-obs-box" style="position:relative;height:660px;transition:height .18s ease;'
);

/* 4) 高度切换脚本（并记忆选择） */
h = h.replace(
  '  if (off) off.addEventListener(\'click\', function(e){ e.stopPropagation(); unload(); });',
  `  var sizeBar = document.getElementById('fl-obs-size');
  var KEY = 'zh.obs.height';
  function applyH(v){
    v = String(v || '660');
    box.style.height = v + 'px';
    try { localStorage.setItem(KEY, v); } catch(e){}
    if (sizeBar) Array.prototype.forEach.call(sizeBar.querySelectorAll('button'), function(b){
      var on = b.dataset.h === v;
      b.style.color = on ? '#1a1408' : '#8b94a3';
      b.style.background = on ? '#d8b26a' : 'none';
      b.style.borderColor = on ? '#d8b26a' : '#242b34';
    });
  }
  if (sizeBar) Array.prototype.forEach.call(sizeBar.querySelectorAll('button'), function(b){
    b.addEventListener('click', function(e){ e.stopPropagation(); applyH(b.dataset.h); });
  });
  try { applyH(localStorage.getItem(KEY) || '660'); } catch(e){}
  if (off) off.addEventListener('click', function(e){ e.stopPropagation(); unload(); });`
);

writeFileSync(IDX, h, 'utf8');
copyFileSync(IDX, join(DEST, 'index.html'));
console.log('v10 完成：左268/右304，观象台 560/660/780 三档');
