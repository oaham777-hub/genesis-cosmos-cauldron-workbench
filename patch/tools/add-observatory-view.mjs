// 把"观象台"装进造化鼎页面（幂等）
// 只加一个视图 + 一个导航项 + 一段样式 + 一个 script 标签，不动现有结构。
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2] || 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui\\index.html';
let src = readFileSync(file, 'utf8');

if (src.includes('v-obs')) {
  console.log('已有观象台，跳过。');
  process.exit(0);
}

// 1) 导航项：放在最上面，观象台是"看的地方"不是"干活的地方"
src = src.replace(
  '      <a data-v="overview" class="on"><span class="dot"></span>概览</a>',
  '      <a data-v="obs"><span class="dot"></span>观象台</a>\n      <a data-v="overview"><span class="dot"></span>概览</a>',
);

// 2) 视图：画布 + 右侧事件流 + 底部说明
const view = `
    <section class="view" id="v-obs">
      <div class="obs-wrap">
        <div class="obs-stage">
          <canvas id="obs-canvas"></canvas>
          <div class="obs-legend">
            <span class="obs-lg"><i class="sw gold"></i>audit / verify · 沿口涟漪</span>
            <span class="obs-lg"><i class="sw teal"></i>pack / install / deploy · 落进腹中</span>
            <span class="obs-lg"><i class="sw gold"></i>eval · 两束对冲</span>
            <span class="obs-meta" id="obs-meta">正在连桥…</span>
          </div>
        </div>
        <aside class="obs-side">
          <h3>活动流 <span class="hstat">按时间倒序，真实事件</span></h3>
          <div class="obs-feed" id="obs-feed"></div>
          <div class="note">
            呼吸节奏跟活动量走：静时约 6.5 秒一轮，忙时压到 3.3 秒。沿口 16 个回纹刻度对应 16 个技能，被点到的那一格会亮一下。
          </div>
        </aside>
      </div>
    </section>
`;
src = src.replace('    <section class="view on" id="v-overview">', view + '    <section class="view on" id="v-overview">');

// 3) 样式
const css = `
    /* 观象台 */
    .obs-wrap{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:18px;align-items:stretch}
    .obs-stage{position:relative;border:1px solid var(--line);border-radius:10px;background:radial-gradient(60% 60% at 43% 56%,#0d1016 0%,#0a0c10 70%,#080a0d 100%);min-height:560px;overflow:hidden}
    #obs-canvas{display:block;width:100%;height:100%}
    .obs-legend{position:absolute;left:14px;bottom:12px;right:14px;display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--dim);font-family:'JetBrains Mono',ui-monospace,monospace}
    .obs-lg{display:inline-flex;align-items:center;gap:6px}
    .obs-lg .sw{width:8px;height:8px;border-radius:50%;display:inline-block;background:rgba(216,178,106,.7)}
    .obs-lg .sw.teal{background:rgba(127,207,163,.7)}
    .obs-meta{color:var(--dim)}
    .obs-meta.live{color:#7fcfa3}
    .obs-side{display:flex;flex-direction:column;gap:12px;min-width:0}
    .obs-feed{flex:1;overflow:auto;max-height:520px;border:1px solid var(--line);border-radius:10px;padding:8px;background:#0b0d11}
    .obs-row{display:grid;grid-template-columns:56px 66px minmax(0,1fr);gap:8px;padding:5px 6px;border-radius:6px;font-size:12px;line-height:1.45}
    .obs-row:nth-child(odd){background:rgba(255,255,255,.018)}
    .obs-t{color:var(--dim);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px}
    .obs-k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#d8b26a}
    .obs-k.bad{color:#c25550}
    .obs-n{color:#cfd2d8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .obs-b{color:var(--dim);grid-column:1 / -1;font-size:11px;padding-left:62px;margin-top:-2px}
    .obs-empty{color:var(--dim);font-size:12px;padding:10px}
`;
src = src.replace('    /* 页脚 */', css + '\n    /* 页脚 */');

// 4) 脚本标签：放在主干脚本之后（它自带 IIFE，不会污染全局）
src = src.replace('</body>', '  <script src="obs.js"></script>\n</body>');

writeFileSync(file, src, 'utf8');
console.log('已注入观象台：视图/导航/样式/脚本');
console.log('含 v-obs:', src.includes('id="v-obs"'), '| 含 obs.js:', src.includes('src="obs.js"'));
