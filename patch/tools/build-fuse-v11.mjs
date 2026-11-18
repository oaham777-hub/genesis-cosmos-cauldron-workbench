// v11：A 版彻底收住内存与宽窄
//  1) 观象台页面强制 reduced-motion（该项目 RM=true 时只渲染静态帧）+ dpr=0.85 + rAF 12fps
//  2) A 版 iframe 固定 760×640 视口，再 scale 填满中列 → 无论窗口多宽，永远只渲染这一块
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const DEST = join(ROOT, '_work', 'stable', 'app', 'Resources', 'app', 'views', 'mainview', 'zhaohua');

/* ---------- 1) 观象台页：强 reduced + 低 dpr + 低帧率 ---------- */
const SRC = join(UI, 'obs-display.html');
let app = readFileSync(SRC, 'utf8');

// 去掉旧注入，重新插一段更狠的护栏
app = app.replace(/<script>\s*\(function\(\)\{\s*try\{\s*var q=new URLSearchParams[\s\S]*?<\/script>/, '');

const hard = `<script>
(function(){
  try{
    var q=new URLSearchParams(location.search);
    if(q.get('theme')) localStorage.setItem('agent-series-theme', q.get('theme'));
    // 砍内存：像素比 0.8
    Object.defineProperty(window,'devicePixelRatio',{get:function(){return 0.8;},configurable:true});
    // 强制 reduced：该项目在 RM=true 时只画静态帧，CPU/内存大降
    var mq=window.matchMedia;
    window.matchMedia=function(qs){
      if(String(qs).indexOf('prefers-reduced-motion')>=0){
        return {matches:true, addEventListener:function(){}, removeEventListener:function(){}, addListener:function(){}, removeListener:function(){}};
      }
      return mq.call(window, qs);
    };
    // 即使它仍用 rAF，也压到 12fps
    var raf=window.requestAnimationFrame.bind(window), last=0, MIN=83;
    window.requestAnimationFrame=function(cb){return raf(function(ts){ if(ts-last<MIN){return window.requestAnimationFrame(cb);} last=ts; cb(ts); });};
    var si=window.setInterval.bind(window);
    window.setInterval=function(fn,ms){return si(fn, Math.max(3000, ms||0));};
    // 藏掉顶部主题/全屏按钮
    setTimeout(function(){
      document.querySelectorAll('button').forEach(function(b){
        var t=(b.textContent||'').trim();
        if(['主调','全黑','全屏','视角','环视'].indexOf(t)>=0) b.style.display='none';
      });
    }, 800);
  }catch(e){}
})();
</script>`;
app = app.replace('<head>', '<head>\n' + hard);
writeFileSync(join(UI, 'obs-forge.html'), app, 'utf8');
copyFileSync(join(UI, 'obs-forge.html'), join(DEST, 'obs-forge.html'));

/* ---------- 2) A 版：固定 760×640 视口 + scale 填满 ---------- */
let a = readFileSync(join(UI, 'fuse-a.html'), 'utf8');

// 2a 容器
a = a.replace(
  '<div id="fl-obs-box" style="position:relative;height:660px;transition:height .18s ease;border:1px solid #1d2229;border-radius:12px;overflow:hidden;background:#07090c">',
  '<div id="fl-obs-box" style="position:relative;height:660px;transition:height .18s ease;border:1px solid #1d2229;border-radius:12px;overflow:hidden;background:#07090c;display:flex;align-items:center;justify-content:center">'
);

// 2b iframe 固定视口 + transform scale（比例按容器算）
a = a.replace(
  `    frame = document.createElement('iframe');
    frame.src = '/zhaohua/obs-forge.html?theme=forge';
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block';`,
  `    frame = document.createElement('iframe');
    frame.src = '/zhaohua/obs-forge.html?theme=forge';
    frame.setAttribute('scrolling','no');
    frame.style.cssText = 'position:absolute;left:50%;top:50%;width:760px;height:640px;border:0;display:block;transform-origin:center center;';
    function fit(){
      var w = box.clientWidth || 760, h = box.clientHeight || 640;
      var s = Math.max(w / 760, h / 640);            // 覆盖式缩放，填满不裁边
      frame.style.transform = 'translate(-50%,-50%) scale(' + s.toFixed(3) + ')';
    }
    setTimeout(fit, 60);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(box);`
);

// 2c 页面隐藏时自动卸载（省内存）
a = a.replace(
  `  window.addEventListener('beforeunload', unload);`,
  `  document.addEventListener('visibilitychange', function(){ if (document.hidden) unload(); });
  window.addEventListener('beforeunload', unload);`
);

writeFileSync(join(UI, 'fuse-a.html'), a, 'utf8');
copyFileSync(join(UI, 'fuse-a.html'), join(DEST, 'fuse-a.html'));
console.log('v11 完成：观象台强 reduced + dpr0.8 + 12fps；A 版固定 760×640 视口缩放');
