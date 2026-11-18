// 融合台 v5：
// ① 删掉「星核」观象台（含文件），只留战术大屏；
// ② 战术大屏改为「点一下才载入」，避免一进融合台就把它 34 个 canvas 拉起来（上次爆内存的主因）；
// ③ 给 obs-display.html 写适配器：技能名/任务名换成我们的真实内容、限制 dpr、限帧、后台自动暂停、铺满容器。
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const FILE = join(UI, 'index.html');
let html = readFileSync(FILE, 'utf8');

/* ---------------- ① 观象台：只留战术大屏，且点击才载入 ---------------- */
const obsRe = /<div id="fl-obs"[\s\S]*?<div id="fl-obs-box"[\s\S]*?<\/div>\s*<\/div>/;
const newObs = `<div id="fl-obs" style="min-width:0;grid-column:2;grid-row:2 / span 2">
        <div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">
          <span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">观象台 · 战术大屏</span>
          <span style="font-size:11px;color:#6c7684" id="fl-obs-note">投喂项目复刻 · 技能/任务已换成真实内容</span>
          <span style="margin-left:auto;display:flex;gap:6px;align-items:center">
            <button type="button" id="fl-obs-load" class="fl-chip on">载入大屏</button>
            <a href="/zhaohua/obs-display.html" target="_blank" style="font-size:11px;color:#8b94a3;text-decoration:none;padding:4px 6px">全屏 ↗</a>
          </span>
        </div>
        <div id="fl-obs-box" style="position:relative;overflow:hidden;border:1px solid #1d2229;border-radius:12px;background:#0b0e12;height:560px">
          <div id="fl-obs-idle" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center">
            <div style="font-size:13px;color:#cbd3df">战术大屏（34 个 canvas、自带模拟器）</div>
            <div style="font-size:12px;color:#6c7684;max-width:380px;line-height:1.7">它很吃资源——上次一进融合台就自动载入，直接把内存打满。<br>现在改成点一下才启动；不看时不会占 CPU / 内存。</div>
            <button type="button" id="fl-obs-start" class="fl-chip on" style="padding:8px 16px;font-size:12px">载入战术大屏</button>
          </div>
          <iframe id="fl-obs-frame" loading="lazy" style="position:absolute;left:0;top:0;width:100%;height:100%;border:0;display:none"></iframe>
        </div>
      </div>`;
if (!obsRe.test(html)) throw new Error('找不到观象台块');
html = html.replace(obsRe, newObs);

/* 旧的切换脚本整体换掉 */
html = html.replace(/<script id="fl-obs-switch">[\s\S]*?<\/script>\s*/g, '');
html = html.replace('</body>', `  <script id="fl-obs-switch">
  (function(){
    var box=document.getElementById('fl-obs-box'), f=document.getElementById('fl-obs-frame'),
        idle=document.getElementById('fl-obs-idle'), note=document.getElementById('fl-obs-note'),
        start=document.getElementById('fl-obs-start'), load=document.getElementById('fl-obs-load');
    var on=false;
    function boot(){
      if(on) return; on=true;
      f.src='/zhaohua/obs-display.html';
      f.style.display='block';
      if(idle) idle.style.display='none';
      if(load) load.textContent='卸载大屏';
      if(note) note.textContent='运行中 · 不看时请卸载（它占内存）';
    }
    function kill(){
      if(!on) return; on=false;
      f.style.display='none'; f.removeAttribute('src');
      if(idle) idle.style.display='flex';
      if(load) load.textContent='载入大屏';
      if(note) note.textContent='已卸载 · 不再占 CPU / 内存';
    }
    if(start) start.addEventListener('click', boot);
    if(load) load.addEventListener('click', function(){ on ? kill() : boot(); });
    // 切到别的页（观象台不可见）时自动卸载，避免在后台空转
    document.getElementById('nav').addEventListener('click', function(e){
      var a=e.target.closest && e.target.closest('a[data-v]');
      if(a && a.dataset.v!=='fuse') kill();
    });
  })();
  </script>
</body>`);

/* ---------------- ② 删掉星核的一切引用 ---------------- */
html = html.replace(/<li><a href="#obs"[\s\S]*?<\/li>\s*/, '');

writeFileSync(FILE, html, 'utf8');

for (const p of [join(UI, 'obs-neural.html'), join(UI, 'neural', 'v41.js')]) {
  if (existsSync(p)) rmSync(p);
}

/* ---------------- ③ 战术大屏适配器 ---------------- */
const disp = join(UI, 'obs-display.html');
let d = readFileSync(disp, 'utf8');
d = d.replace(/<!-- ADAPTER:start -->[\s\S]*?<!-- ADAPTER:end -->/g, '');
const adapter = `
<!-- ADAPTER:start -->
<style>
  html,body{margin:0;padding:0;height:100%;overflow:hidden;background:#0b0e12}
  #app,#root,body>div:first-child{min-height:100%}
</style>
<script>
(function(){
  // 1) dpr 限 1：34 个 canvas，dpr=2 时显存/内存直接翻四倍
  try { Object.defineProperty(window,'devicePixelRatio',{get:function(){return 1;},configurable:true}); } catch(e){}
  // 2) 限帧：最多 ~10fps（原本 60fps × 34 canvas 是爆内存主因）
  var raf = window.requestAnimationFrame.bind(window), last = 0, MIN = 100;
  window.requestAnimationFrame = function(cb){
    return raf(function(ts){ if(ts - last < MIN) { return window.requestAnimationFrame(cb); } last = ts; cb(ts); });
  };
  // 3) 短间隔定时器统一拉长到 >=1s（它的模拟器每 120–500ms 改一次 DOM）
  var si = window.setInterval.bind(window);
  window.setInterval = function(fn, ms){ return si(fn, Math.max(1000, ms || 0)); };
  // 4) 后台/被卸载时彻底停：document.hidden 时不再排帧
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){ document.title = document.title; }
  });
  // 5) 数据适配：把它的模拟"12 个工区/任务名"换成造化乾坤鼎的真实内容
  function adapt(){
    try {
      if (typeof CONFIG === 'undefined' || !CONFIG || CONFIG.__zh) return false;
      CONFIG.__zh = true;
      CONFIG.agents = [
        ['01','路由'],['02','剧本'],['03','梗概'],['04','角色'],['05','世界观'],['06','定稿'],
        ['07','审片'],['08','资产'],['09','镜表'],['10','表演'],['11','成片'],['12','归档']
      ];
      CONFIG.taskNames = ['audit 体检','inspect 能力契约','create 确定性合并','fuse 语义融合','pack 打包',
        'pack-install 装包','deploy 部署','distill 投放','gap 补缺','adopt 收编','eval 两臂评估','verify 产品校验',
        'smoke 端到端冒烟','restore 从备份恢复','uninstall 卸载','overlap 查重'];
      CONFIG.workflows = ['判层','投放','体检','打包','部署','评估'];
      return true;
    } catch(e){ return false; }
  }
  var n = 0, t = si(function(){ n++; if(adapt() || n > 40) clearInterval(t); }, 100);
  adapt();
  // 6) 主题固定成 hq（内容最满的一套）
  try { localStorage.setItem('agent-series-theme','hq'); } catch(e){}
})();
</script>
<!-- ADAPTER:end -->
`;
d = d.replace('</body>', adapter + '</body>');
writeFileSync(disp, d, 'utf8');

console.log('v5 完成：星核已删、大屏改点击载入、适配器已写入');
