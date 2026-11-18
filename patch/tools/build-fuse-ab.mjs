// 生成 A/B 两个对比版（不改动线上 index.html）：
//   fuse-a.html：窄栏内"核心 + 我们的 HUD"（盖住它的标题条与按钮，底下加实时事件条）
//   fuse-b.html：观象台抽成通栏（宽 1100+、高 420），三栏留在下面
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const DEST = join(ROOT, '_work', 'stable', 'app', 'Resources', 'app', 'views', 'mainview', 'zhaohua');
const base = readFileSync(join(UI, 'index.html'), 'utf8');

/* 从 base 里按 div 配平取出 fl-obs 块 */
function sliceObs(h) {
  const s = h.indexOf('<div id="fl-obs"');
  if (s < 0) throw new Error('no fl-obs');
  let i = s + 4, d = 1;
  while (i < h.length && d > 0) {
    const o = h.indexOf('<div', i), c = h.indexOf('</div>', i);
    if (c < 0) break;
    if (o >= 0 && o < c) { d++; i = o + 4; } else { d--; i = c + 6; }
  }
  return { s, e: i, block: h.slice(s, i) };
}
const { s, e, block } = sliceObs(base);

/* ---------------- A：窄栏 + HUD 叠层 ---------------- */
let a = base.slice(0, s) + block + base.slice(e);
const hud = (boxId) => `
      <div id="fl-obs-hud" style="position:absolute;inset:0;pointer-events:none;z-index:5">
        <div style="position:absolute;left:0;right:0;top:0;height:64px;background:linear-gradient(#07090c 78%,rgba(7,9,12,0))"></div>
        <div style="position:absolute;left:14px;top:12px;pointer-events:auto">
          <div style="font-size:11px;letter-spacing:.22em;color:#7f8a99">ZAOHUA CAULDRON</div>
          <div style="font-size:15px;color:#e8dcc2;letter-spacing:.04em;margin-top:2px">观象台 · 技能熔炉</div>
        </div>
        <div style="position:absolute;right:14px;top:14px;font-size:11px;color:#6c7684">
          <span id="fl-hud-live" style="color:#8fe3b9">● 桥已连接</span>
        </div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:34px;background:linear-gradient(rgba(7,9,12,0),#07090c 55%)"></div>
        <div id="fl-hud-tick" style="position:absolute;left:14px;right:14px;bottom:9px;font-size:11px;color:#8b94a3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center">
          <div id="fl-hud-pct" style="font-size:34px;line-height:1;color:#f0e2c2;text-shadow:0 0 18px rgba(216,178,106,.35)">16/16</div>
          <div style="font-size:10px;letter-spacing:.18em;color:#8b7f66;margin-top:6px">体检通过</div>
        </div>
      </div>`;
a = a.replace('<div id="fl-obs-hint"', hud('box') + '\n          <div id="fl-obs-hint"');
a = a.replace('</body>', `<script>
(function(){
  var pct = document.getElementById('fl-hud-pct');
  var tick = document.getElementById('fl-hud-tick');
  var live = document.getElementById('fl-hud-live');
  function setPct(){ fetch('http://127.0.0.1:8791/distill').then(function(r){return r.json();}).then(function(d){
    var t=0,i=0;(d.skills||[]).forEach(function(s){ t++; if((s.total||0)>0 && (s.in||0)>0) i++; });
    if(t){ pct.textContent = i + '/' + t; } }).catch(function(){});
  }
  function ticker(){
    try {
      var es = new EventSource('http://127.0.0.1:8791/events');
      es.onmessage = function(ev){
        try { var d = JSON.parse(ev.data); if(d && d.kind){
          live.style.color = '#8fe3b9';
          tick.textContent = '· ' + new Date().toLocaleTimeString() + '  ' + d.kind + (d.skill ? ' · ' + d.skill : '') + (d.summary ? ' · ' + d.summary : '');
        } } catch(e){}
      };
      es.onerror = function(){ live.style.color = '#c2553f'; live.textContent = '● 桥未连接'; };
    } catch(e){}
  }
  setPct(); setInterval(setPct, 10000); ticker();
})();
</script>
</body>`);
writeFileSync(join(UI, 'fuse-a.html'), a, 'utf8');

/* ---------------- B：观象台抽成通栏 ---------------- */
const bandBlock = `
      <div id="fl-obs" style="grid-column:1 / -1;grid-row:1;display:flex;flex-direction:column;margin-bottom:10px">
        <div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">
          <span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">观象台</span>
          <span style="font-size:11px;color:#6c7684">视界熔炉（forge）· 通栏版（三扇区完整）</span>
          <a href="/zhaohua/obs-forge.html?theme=forge" target="_blank" style="margin-left:auto;font-size:11px;color:#8b94a3;text-decoration:none">全屏 ↗</a>
        </div>
        <div id="fl-obs-box" style="position:relative;height:420px;border:1px solid #1d2229;border-radius:12px;overflow:hidden;background:#07090c">
          <div id="fl-obs-hint" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#6c7684;font-size:12px">观象台载入中…</div>
        </div>
      </div>`;
let b = base.slice(0, s) + base.slice(e);
b = b.replace('<div id="fl-grid"', bandBlock + '\n      <div id="fl-grid"');
b = b.replace('</body>', `<script>
(function(){
  var box = document.getElementById('fl-obs-box'); if(!box) return;
  var fr = document.createElement('iframe');
  fr.src = '/zhaohua/obs-forge.html?theme=forge';
  fr.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block';
  setTimeout(function(){ box.appendChild(fr); var h=document.getElementById('fl-obs-hint'); if(h) h.style.display='none'; }, 700);
})();
</script>
</body>`);
writeFileSync(join(UI, 'fuse-b.html'), b, 'utf8');

for (const f of ['fuse-a.html', 'fuse-b.html']) copyFileSync(join(UI, f), join(DEST, f));
console.log('A/B 对比页就绪：fuse-a.html / fuse-b.html');
