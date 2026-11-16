// 融合台 v3（静态重排版）：把 v1 的全部卡片原样切出来，按 3 列网格重排，中间放星核观象台。
// 卡片内部 HTML 一字不改（gap.js / ingest-ui.js 的 id 全保留），只是换了容器与顺序。
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const FILE = join(UI, 'index.html');
const MARK = '<!-- FUSE_V3 -->';
const START = '<section class="view" id="v-fuse">';

const html0 = readFileSync(FILE, 'utf8');
const bakDir = join(ROOT, 'patch', '_backup');
const v1 = readdirSync(bakDir).filter((f) => f.startsWith('fuse-v1-')).sort().pop();
const sec = readFileSync(join(bakDir, v1), 'utf8'); // 原始 section（含 <section ...> 与 </section>）

// ---- 用深度配平把 top-level 的 .card 块切出来 ----
function splitCards(sectionHtml) {
  const out = [];
  let i = 0;
  while (true) {
    const s = sectionHtml.indexOf('<div class="card', i);
    if (s < 0) break;
    const gt = sectionHtml.indexOf('>', s);
    let depth = 0;
    let k = s;
    while (k < sectionHtml.length) {
      const open = sectionHtml.indexOf('<div', k);
      const close = sectionHtml.indexOf('</div>', k);
      if (close < 0) break;
      if (open >= 0 && open < close) { depth++; k = open + 4; continue; }
      depth--; k = close + 6;
      if (depth === 0) break;
    }
    const block = sectionHtml.slice(s, k);
    out.push({ start: s, end: k, block });
    i = k;
  }
  return out;
}

const cards = splitCards(sec);
if (!cards.length) throw new Error('切不出卡片');

// ---- 分类（按块内第一个 h3） ----
const textOf = (b) => {
  const m = b.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
};
const buckets = { top: [], left: [], right: [], guard: [], prev: [], ingest: [] };
for (const c of cards) {
  const t = textOf(c.block);
  if (t.startsWith('只补缺')) buckets.right.push(c.block);
  else if (t.startsWith('守卫检查')) buckets.guard.push(c.block);
  else if (t.startsWith('外部投放')) buckets.ingest.push(c.block);
  else if (t.startsWith('来料') || t.startsWith('宿主') || t.startsWith('配方')) buckets.left.push(c.block);
  else buckets.prev.push(c.block);
}

const obs = `
      <div style="min-width:0;grid-column:2;grid-row:2 / span 2">
        <div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">
          <span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">观象台 · 星核</span>
          <span style="font-size:11px;color:#6c7684">环带宽度由真实数据生成 · 一次体检一圈涟漪</span>
          <a href="#obs" style="margin-left:auto;font-size:11px;color:#8b94a3;text-decoration:none">打开完整观象台 →</a>
        </div>
        <iframe src="/zhaohua/obs-neural.html" loading="lazy" style="width:100%;height:520px;border:1px solid #1d2229;border-radius:12px;background:#07090c;display:block"></iframe>
      </div>`;

const grid = `
      <div id="fl-grid" style="display:grid;grid-template-columns:300px minmax(0,1fr) 330px;gap:14px;align-items:start">
        <div id="zh-fuse-card" style="grid-column:1 / -1;grid-row:1"></div>
${obs}
        <div style="grid-column:1;grid-row:2 / span 2;display:flex;flex-direction:column;gap:14px;min-width:0">
${buckets.left.join('\n')}
        </div>
        <div style="grid-column:3;grid-row:2;min-width:0">${buckets.right.join('\n')}</div>
        <div style="grid-column:3;grid-row:3;min-width:0">${buckets.guard.join('\n')}</div>
        <div style="grid-column:3;grid-row:4;min-width:0">${buckets.ingest.join('\n')}</div>
        <div style="grid-column:1 / span 2;grid-row:4;min-width:0">${buckets.prev.join('\n')}</div>
      </div>`;

// 保留 section 的标题/说明（第一个 card 之前的头部）
const headHtml = sec.slice(0, cards[0].start);
const newSec = headHtml + grid + '\n    </section>';

// ---- 写回 index.html ----
const i = html0.indexOf(START);
const j = html0.indexOf('</section>', i);
let html = html0.slice(0, i) + MARK + newSec + html0.slice(j + '</section>'.length);

// 脚本：旧的「开始融合」注入逻辑改为渲染进 #zh-fuse-card（不再 append 到 section）
html = html.replace(
  "fuseView.appendChild(card);",
  "var holder = document.getElementById('zh-fuse-card'); (holder || fuseView).appendChild(card);"
);

// 脚本引用：去掉 fuse-ui / fuse-layout，保留 gap.js / ingest-ui.js
html = html.replace(/<script src="fuse-ui\.js[^"]*"><\/script>\s*/g, '');
html = html.replace(/<script src="fuse-layout\.js[^"]*"><\/script>\s*/g, '');
if (!html.includes('gap.js')) html = html.replace('</body>', '  <script src="gap.js?v=6"></script>\n</body>');
if (!html.includes('ingest-ui.js')) html = html.replace('</body>', '  <script src="ingest-ui.js?v=6"></script>\n</body>');

writeFileSync(FILE, html, 'utf8');

// v41.js
mkdirSync(join(UI, 'neural'), { recursive: true });
copyFileSync(join(ROOT, 'patch', '_ref', 'neural-creator-dashboard-main', 'src', 'neural', 'v41.js'), join(UI, 'neural', 'v41.js'));

console.log('v3 静态重排完成；卡片分组：', JSON.stringify(Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]))));
