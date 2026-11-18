// 干净重建 obs-forge.html：只做两件最小的事——读 ?theme=、把像素比压到 0.85。
// 其它一概不动（之前强改 reduced / 正则清理把页面自己的脚本弄坏过）。
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const REF = join(ROOT, 'patch', '_ref', 'agent-display-main', 'index.html');
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const DEST = join(ROOT, '_work', 'stable', 'app', 'Resources', 'app', 'views', 'mainview', 'zhaohua');

let app = readFileSync(REF, 'utf8');
const guard = `<script>
(function(){
  try{
    var q=new URLSearchParams(location.search);
    if(q.get('theme')) localStorage.setItem('agent-series-theme', q.get('theme'));
    Object.defineProperty(window,'devicePixelRatio',{get:function(){return 0.85;},configurable:true});
  }catch(e){}
})();
</script>`;
app = app.replace('<head>', '<head>\n' + guard);
writeFileSync(join(UI, 'obs-forge.html'), app, 'utf8');
copyFileSync(join(UI, 'obs-forge.html'), join(DEST, 'obs-forge.html'));
console.log('obs-forge.html 已干净重建（仅 ?theme= + dpr0.85）');
