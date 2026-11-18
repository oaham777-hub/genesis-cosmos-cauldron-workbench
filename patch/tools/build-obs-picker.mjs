// 观象台主题挑选：把投喂项目 agent-display 的 10 套主题摆出来，用户自选
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const REF = join(ROOT, 'patch', '_ref', 'agent-display-main', 'index.html');
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const DISP = join(UI, 'obs-display.html');

const THEMES = [
  ['hq', 'hq · 战术大屏（粉）'],
  ['forge', 'forge · 视界熔炉'],
  ['factory', 'factory · 工厂'],
  ['works', 'works · 织造'],
  ['nebula', 'nebula · 星云'],
  ['ion', 'ion · 离子'],
  ['park', 'park · 园区'],
  ['spider', 'spider · 蛛网'],
  ['neural', 'neural · 神经星环'],
  ['ops', 'ops · 调度中心（纸白）'],
];

/* 1) 副本：把 ?theme= 变成启动前写入 localStorage；加轻护栏防爆内存 */
let app = readFileSync(REF, 'utf8');
const inject = `<script>
(function(){
  try{
    var q=new URLSearchParams(location.search), th=q.get('theme');
    if(th) localStorage.setItem('agent-series-theme', th);
    Object.defineProperty(window,'devicePixelRatio',{get:function(){return 1;},configurable:true});
    var raf=window.requestAnimationFrame.bind(window), last=0, MIN=50;
    window.requestAnimationFrame=function(cb){return raf(function(ts){ if(ts-last<MIN){return window.requestAnimationFrame(cb);} last=ts; cb(ts); });};
    var si=window.setInterval.bind(window);
    window.setInterval=function(fn,ms){return si(fn, Math.max(1500, ms||0));};
  }catch(e){}
})();
</script>`;
app = app.replace('<head>', '<head>\n' + inject);
writeFileSync(DISP, app, 'utf8');

/* 2) 挑选页：一个主题一个链接 + 一次只挂一个 iframe */
const links = THEMES.map(([k, label], i) =>
  `<a class="t" data-k="${k}" href="?theme=${k}">${i + 1}. ${label}</a>`).join('\n      ');
const picker = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>造化鼎 · 观象台主题挑选</title>
<style>
  html,body{margin:0;height:100%;background:#07090c;color:#cfd6df;font:13px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  #bar{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid #1b2027;align-items:center}
  #bar b{color:#e6d3a6;font-weight:600;letter-spacing:.06em;margin-right:6px}
  #bar span.h{color:#6c7684;font-size:12px;margin-left:auto}
  .t{padding:5px 10px;border:1px solid #242b34;border-radius:999px;color:#9aa4b2;text-decoration:none;white-space:nowrap}
  .t:hover{color:#e8eef6;border-color:#3a4450}
  .t.on{color:#1a1408;background:#d8b26a;border-color:#d8b26a}
  #wrap{position:absolute;inset:46px 0 0 0}
  iframe{width:100%;height:100%;border:0;display:block;background:#000}
</style></head><body>
<div id="bar">
  <b>观象台 · 挑主题</b>
  ${links}
  <span class="h">点一个看看；选好了告诉我编号（或名字），我把它抽成我们的观象台</span>
</div>
<div id="wrap"><iframe id="fr" src="obs-display.html?theme=hq"></iframe></div>
<script>
  var cur = new URLSearchParams(location.search).get('theme') || 'hq';
  function mark(){ document.querySelectorAll('.t').forEach(function(a){ a.classList.toggle('on', a.dataset.k === cur); }); }
  document.querySelectorAll('.t').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault(); cur = a.dataset.k; mark();
      document.getElementById('fr').src = 'obs-display.html?theme=' + cur;
      history.replaceState(null,'','?theme='+cur);
    });
  });
  mark();
</script>
</body></html>`;
writeFileSync(join(UI, 'obs-picker.html'), picker, 'utf8');

const DEST = join(ROOT, '_work', 'stable', 'app', 'Resources', 'app', 'views', 'mainview', 'zhaohua');
for (const f of ['obs-display.html', 'obs-picker.html']) copyFileSync(join(UI, f), join(DEST, f));
console.log('挑选页就绪：obs-picker.html（10 个主题）');
