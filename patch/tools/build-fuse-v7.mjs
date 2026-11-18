// v7：在 v3 静态版面上，把中间 iframe 换成自绘 canvas（固定高度，铺满中列两行）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join('D:\\造化乾坤鼎-工作台', 'patch', 'zhaohua-ui', 'index.html');
let html = readFileSync(FILE, 'utf8');

const re = /<div style="min-width:0;grid-column:2;grid-row:2 \/ span 2">[\s\S]*?<iframe[^>]*><\/iframe>\s*<\/div>/;
if (!re.test(html)) throw new Error('找不到观象台格（先跑 build-fuse-v3 生成静态版面）');

const block = `<div id="fl-obs" style="min-width:0;grid-column:2;grid-row:2 / span 2">
        <div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">
          <span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">观象台</span>
          <span style="font-size:11px;color:#6c7684">自绘 · 真数据 · 无第三方大屏</span>
          <span id="fl-obs-seq" style="margin-left:auto;font-size:11px;color:#6c7684">seq 0</span>
        </div>
        <div id="fl-obs-canvas-wrap" style="position:relative;height:620px;border:1px solid #1d2229;border-radius:12px;background:radial-gradient(120% 90% at 50% 42%,#0d1117 0%,#080a0d 72%);overflow:hidden">
          <canvas id="fl-obs-canvas" style="display:block"></canvas>
          <div id="fl-obs-hud" style="position:absolute;left:16px;top:12px;font-size:12px;color:#cfd6e2"></div>
          <div id="fl-obs-ticker" style="position:absolute;left:16px;bottom:12px;font-size:11px;line-height:1.8"></div>
        </div>
      </div>`;

html = html.replace(re, block);
html = html.replace(/<script src="fuse-obs\.js[^"]*"><\/script>\s*/g, '');
html = html.replace('</body>', '  <script src="fuse-obs.js?v=7"></script>\n</body>');

writeFileSync(FILE, html, 'utf8');
console.log('v7 完成：中列改为自绘 canvas 观象台');
