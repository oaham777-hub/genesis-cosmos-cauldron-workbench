// 融合台 v6：中间观象台改成自绘轻量版（无 iframe），铺满中间那片空地；删掉战术大屏。
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const FILE = join(UI, 'index.html');
let html = readFileSync(FILE, 'utf8');

// 1) 替换观象台块（整块换掉 iframe + 载入/卸载按钮）
const re = /<div id="fl-obs"[\s\S]*?<div id="fl-obs-box"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const block = `<div id="fl-obs" style="min-width:0;grid-column:2;grid-row:2 / span 2;align-self:stretch;display:flex;flex-direction:column">
        <div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">
          <span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">观象台</span>
          <span style="font-size:11px;color:#6c7684">自绘 · 数据来自本地桥（无第三方大屏、无 iframe）</span>
          <span id="fl-obs-seq" style="margin-left:auto;font-size:11px;color:#6c7684">seq 0</span>
        </div>
        <div id="fl-obs-canvas-wrap" style="flex:1;min-height:520px;position:relative;border:1px solid #1d2229;border-radius:12px;background:radial-gradient(120% 90% at 50% 42%,#0d1117 0%,#080a0d 70%);overflow:hidden">
          <canvas id="fl-obs-canvas" style="display:block"></canvas>
          <div id="fl-obs-hud" style="position:absolute;left:16px;top:12px;font-size:12px;color:#cfd6e2"></div>
          <div id="fl-obs-ticker" style="position:absolute;left:16px;bottom:12px;font-size:11px;line-height:1.8"></div>
        </div>
      </div>`;
if (!re.test(html)) throw new Error('找不到观象台块');
html = html.replace(re, block);

// 2) 去掉点击载入脚本
html = html.replace(/<script id="fl-obs-switch">[\s\S]*?<\/script>\s*/g, '');

// 3) 挂自绘脚本（先删旧引用再挂）
html = html.replace(/<script src="fuse-obs\.js[^"]*"><\/script>\s*/g, '');
html = html.replace('</body>', '  <script src="fuse-obs.js?v=1"></script>\n</body>');

// 4) 融合预览与守卫检查排满：预览占 col1 row4，守卫占 col3 row4（原 row3 已由观象台跨到）
html = html.replace(/<div style="grid-column:3;grid-row:3;min-width:0">/, '<div style="grid-column:3;grid-row:4;min-width:0">');
html = html.replace(/<div style="grid-column:1 \/ span 2;grid-row:4;min-width:0">/, '<div style="grid-column:1;grid-row:4;min-width:0">');

writeFileSync(FILE, html, 'utf8');

// 5) 删掉战术大屏文件（1.5MB / 34 canvas，爆内存源头）
for (const p of [join(UI, 'obs-display.html')]) if (existsSync(p)) rmSync(p);

console.log('v6 完成：自绘观象台已挂上，战术大屏已删');
