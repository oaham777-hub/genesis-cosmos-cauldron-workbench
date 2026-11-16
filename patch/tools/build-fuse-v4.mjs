// 融合台 v4：① 观象台换成投喂项目 agent-display 的「战术大屏」（可切回星核）
//            ② 把「外部投放」并进顶部「开始融合」同一条入口带（外部件也能直接进鼎）
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const FILE = join(ROOT, 'patch', 'zhaohua-ui', 'index.html');
let html = readFileSync(FILE, 'utf8');

// ---------- ① 观象台：默认战术大屏，可切星核 ----------
const oldObs = /<div style="min-width:0;grid-column:2;grid-row:2 \/ span 2">[\s\S]*?<\/iframe>\s*<\/div>/;
const newObs = `
      <div id="fl-obs" style="min-width:0;grid-column:2;grid-row:2 / span 2">
        <div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">
          <span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">观象台</span>
          <span style="font-size:11px;color:#6c7684" id="fl-obs-note">投喂项目复刻 · 战术大屏</span>
          <span style="margin-left:auto;display:flex;gap:6px">
            <button type="button" data-obs="display" class="fl-chip on">战术大屏</button>
            <button type="button" data-obs="core" class="fl-chip">星核</button>
            <a href="/zhaohua/obs-display.html" target="_blank" style="font-size:11px;color:#8b94a3;text-decoration:none;padding:4px 6px">全屏打开 ↗</a>
          </span>
        </div>
        <div id="fl-obs-box" style="position:relative;overflow:hidden;border:1px solid #1d2229;border-radius:12px;background:#07090c;height:560px">
          <iframe id="fl-obs-frame" src="/zhaohua/obs-display.html" loading="lazy"
            style="position:absolute;left:0;top:0;width:178%;height:178%;border:0;transform:scale(.562);transform-origin:0 0"></iframe>
        </div>
      </div>`;
if (!oldObs.test(html)) throw new Error('找不到旧观象台块');
html = html.replace(oldObs, newObs.trim());

// 切页脚本（一次性注入在 </body> 前）
html = html.replace(/<script id="fl-obs-switch">[\s\S]*?<\/script>\s*/g, '');
html = html.replace('</body>', `  <script id="fl-obs-switch">
  (function(){
    var box=document.getElementById('fl-obs-box'), f=document.getElementById('fl-obs-frame'), note=document.getElementById('fl-obs-note');
    var btns=document.querySelectorAll('#fl-obs [data-obs]');
    function use(kind){
      btns.forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-obs')===kind); });
      if(kind==='core'){
        f.style.transform='none'; f.style.width='100%'; f.style.height='100%';
        f.src='/zhaohua/obs-neural.html'; note.textContent='自绘 · 星核（v41 渲染器）';
      } else {
        f.style.transform='scale(.562)'; f.style.transformOrigin='0 0';
        f.style.width='178%'; f.style.height='178%';
        f.src='/zhaohua/obs-display.html'; note.textContent='投喂项目复刻 · 战术大屏';
      }
    }
    btns.forEach(function(b){ b.addEventListener('click', function(){ use(b.getAttribute('data-obs')); }); });
  })();
  </script>
</body>`);

// ---------- ② 入口带：把「外部投放」搬进顶部，与「开始融合」同一块 ----------
// 当前结构：row1 = 占位 #zh-fuse-card；row4 右 = 外部投放卡
const igRe = /<div style="grid-column:3;grid-row:4;min-width:0">([\s\S]*?)<\/div>\s*(?=<div style="grid-column:1 \/ span 2;grid-row:4)/;
const igMatch = html.match(igRe);
if (!igMatch) throw new Error('找不到外部投放格');
const igCard = igMatch[1];

// 顶部改成"容器 + 小标题 + 外部件区"
html = html.replace(
  /<div id="zh-fuse-card" style="grid-column:1 \/ -1;grid-row:1"><\/div>/,
  `<div style="grid-column:1 / -1;grid-row:1;min-width:0;display:flex;flex-direction:column;gap:12px">
          <div id="zh-fuse-card"></div>
          <div id="fl-ingest" style="min-width:0">
            <div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">
              <span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">外部件直接进鼎</span>
              <span style="font-size:11px;color:#6c7684">不必先过乾坤鼎：判层 → 投放资料 / 装成技能 / 并进现有技能</span>
            </div>
            ${igCard}
          </div>
        </div>`
);

// 原来 row4 右侧那格现在空着，交给融合预览收尾（保持网格不留洞）
html = html.replace(/<div style="grid-column:3;grid-row:4;min-width:0">\s*<\/div>\s*/, '');
html = html.replace(
  /<div style="grid-column:1 \/ span 2;grid-row:4;min-width:0">/,
  '<div style="grid-column:1 / -1;grid-row:4;min-width:0">'
);

// 切换按钮样式
const css = `
    #fl-obs .fl-chip{background:#12161c;border:1px solid #232a33;color:#8b94a3;font-size:11px;padding:4px 9px;border-radius:999px;cursor:pointer}
    #fl-obs .fl-chip.on{background:rgba(216,178,106,.14);border-color:#5a4a2c;color:#e6d3a6}
`;
const k = html.lastIndexOf('</style>');
html = html.slice(0, k) + css + html.slice(k);

writeFileSync(FILE, html, 'utf8');
console.log('融合台 v4 已写入');
