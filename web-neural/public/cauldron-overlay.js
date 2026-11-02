// 造化乾坤鼎：星图看板叠加层 v0.9.1
// 只保留：水墨鼎（微旋转）+ 口沿升腾雾（三层错峰、底部渐隐遮罩）+ 九层节点连线 + 操作条
// 性能：measure 走 rAF 节流；画布只画 9 条虚线；不再画粒子/光晕
const LAYERS = [
  ['00-router', '总控'],
  ['01-story', '故事'],
  ['02-script', '剧本'],
  ['03-assets', '资产'],
  ['04-shotlist', '分镜'],
  ['05-acting', '表演'],
  ['06-prompt', '提示词'],
  ['08-knowledge', '知识'],
  ['09-support', '支撑'],
];

const REDUCED = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
})();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function frameThrottle(fn) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  };
}

async function boot() {
  if (document.getElementById('cw-overlay')) return;
  const root = el('div');
  root.id = 'cw-overlay';
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:inherit;overflow:hidden;contain:layout style paint';
  document.body.appendChild(root);

  const anchor = el('div');
  anchor.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;will-change:transform';
  root.appendChild(anchor);

  const rotator = el('div');
  rotator.id = 'cw-rotator';
  rotator.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0';
  anchor.appendChild(rotator);

  const body = el('img');
  body.src = './ding-body.png';
  body.alt = '造化乾坤鼎';
  body.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;mix-blend-mode:screen;filter:drop-shadow(0 0 24px rgba(255,190,90,.28));transform:translate(-50%,-50%)';
  rotator.appendChild(body);

  const smoke = el('div');
  smoke.id = 'cw-smoke';
  smoke.style.cssText = 'position:absolute;left:0;bottom:0;transform:translateX(-50%);pointer-events:none;mix-blend-mode:screen;overflow:hidden';
  anchor.appendChild(smoke);
  for (let i = 0; i < 3; i += 1) {
    const puff = el('div', 'cw-puff');
    puff.style.backgroundImage = 'url(./ding-smoke.png)';
    smoke.appendChild(puff);
  }

  const title = el('div', 'cw-title', '造化乾坤鼎');
  title.style.cssText = 'position:absolute;left:0;transform:translateX(-50%);color:#f2e2b8;font-size:clamp(13px,1.4vmin,18px);letter-spacing:.4em;text-indent:.4em;text-shadow:0 0 22px rgba(255,205,120,.42),0 2px 10px rgba(0,0,0,.7);pointer-events:none;white-space:nowrap';
  anchor.appendChild(title);

  const bar = el('div');
  bar.style.cssText = 'position:absolute;left:0;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:12px;background:rgba(12,14,22,.72);border:1px solid rgba(214,178,106,.28);backdrop-filter:blur(10px);pointer-events:auto;white-space:nowrap';
  const hud = el('span');
  hud.textContent = '载入中';
  hud.style.cssText = 'color:#cbbf9f;font-size:11px;letter-spacing:.05em;padding:0 4px';
  const select = el('select');
  select.id = 'cw-layer';
  select.style.cssText = 'background:#12141d;color:#f1e4c6;border:1px solid rgba(214,178,106,.3);border-radius:8px;padding:5px 8px;font-size:12px';
  for (const [id, zh] of LAYERS) {
    const opt = el('option');
    opt.value = id;
    opt.textContent = `${zh} · ${id}`;
    select.appendChild(opt);
  }
  const button = el('button', '', '按此层开工');
  button.style.cssText = 'cursor:pointer;background:linear-gradient(180deg,#f6e3b8,#d8b26a);color:#241d10;border:0;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600';
  const fire = async () => {
    const text = `从 ${select.value} 层开工：先读乾坤鼎 skills/${select.value}/SKILL.md，按它的规矩执行当前任务。`;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = '已复制';
    } catch {
      button.textContent = '复制失败';
    }
    setTimeout(() => { button.textContent = '按此层开工'; }, 2000);
  };
  button.addEventListener('click', fire);
  bar.append(hud, select, button);
  anchor.appendChild(bar);

  const canvas = el('canvas');
  canvas.id = 'cw-fx';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  root.appendChild(canvas);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes cwRotate { 0%,100% { transform: rotate(-.8deg); } 50% { transform: rotate(.8deg); } }
    #cw-rotator { animation: cwRotate 13s ease-in-out infinite; transform-origin: 50% 50%; }
    @keyframes cwPuff { 0%   { opacity:.34; transform: translate(-50%, 8%)  scale(.92); }
                        55%  { opacity:.26; }
                        100% { opacity:0;   transform: translate(-50%, -42%) scale(1.12); } }
    .cw-puff { position:absolute; left:0; bottom:0; width:100%; height:180%; transform:translate(-50%,8%); background-repeat:no-repeat; background-position:50% 100%; background-size:100% auto; animation:cwPuff 7.5s linear infinite; }
    .cw-puff:nth-child(2) { animation-duration:10s; animation-delay:-2.6s; opacity:.5; filter:blur(.6px); }
    .cw-puff:nth-child(3) { animation-duration:12.5s; animation-delay:-5.2s; opacity:.36; filter:blur(1.4px); }
    #cw-smoke { -webkit-mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,.18) 8%, rgba(0,0,0,.7) 26%, #000 60%);
                mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,.18) 8%, rgba(0,0,0,.7) 26%, #000 60%); }
    @media (prefers-reduced-motion: reduce) { #cw-rotator, .cw-puff { animation: none; } }
  `;
  document.head.appendChild(style);

  const layout = { cx: 0, cy: 0, w: 0, nodes: [] };
  const updateNodes = () => {
    const radius = layout.w * 0.82;
    layout.nodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / layout.nodes.length) * Math.PI * 2;
      const nx = Math.round(layout.cx + Math.cos(angle) * radius);
      const ny = Math.round(layout.cy + Math.sin(angle) * radius * 0.9);
      if (node.x !== nx || node.y !== ny) {
        node.el.style.transform = `translate3d(${nx}px, ${ny}px, 0) translate(-50%, -50%)`;
        node.x = nx; node.y = ny;
      }
    });
  };
  const measure = () => {
    const core = document.querySelector('.core-star');
    if (!core) return;
    const rect = core.getBoundingClientRect();
    if (!rect.width) return;
    const cx = Math.round(rect.left + rect.width / 2);
    const cy = Math.round(rect.top + rect.height / 2);
    if (cx !== layout.cx || cy !== layout.cy || rect.width !== layout.w) {
      layout.cx = cx;
      layout.cy = cy;
      layout.w = rect.width;
      anchor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      const bodyW = Math.round(rect.width * 0.66);
      const bodyH = Math.round(bodyW * 0.70);
      body.style.width = `${bodyW}px`;
      const smokeW = Math.round(rect.width * 0.46);
      smoke.style.width = `${smokeW}px`;
      smoke.style.height = `${Math.round(bodyH * 1.05)}px`;
      smoke.style.bottom = `${Math.round(bodyH * 0.16)}px`;
      title.style.top = `${Math.round(-bodyH * 0.78)}px`;
      bar.style.top = `${Math.round(bodyH * 0.5)}px`;
    }
    updateNodes();
  };

  for (const [id, zh] of LAYERS) {
    const nodeEl = el('div');
    nodeEl.style.cssText = 'position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;pointer-events:auto;cursor:pointer;white-space:nowrap;will-change:transform';
    const dot = el('span');
    dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:#ffe1a0;box-shadow:0 0 10px rgba(255,205,120,.85)';
    const label = el('span');
    label.textContent = zh;
    label.style.cssText = 'color:#e8d9b4;font-size:11px;letter-spacing:.14em;text-shadow:0 0 12px rgba(255,200,120,.35),0 1px 6px rgba(0,0,0,.8);opacity:.85';
    nodeEl.append(dot, label);
    nodeEl.title = `${zh} · ${id}`;
    nodeEl.addEventListener('click', (event) => {
      event.preventDefault();
      select.value = id;
      layout.nodes.forEach((n) => { n.dot.style.background = '#ffe1a0'; });
      dot.style.background = '#fff6dc';
    });
    nodeEl.addEventListener('dblclick', (event) => { event.preventDefault(); select.value = id; fire(); });
    root.appendChild(nodeEl);
    layout.nodes.push({ id, el: nodeEl, dot, x: 0, y: 0 });
  }

  const ctx = canvas.getContext('2d');
  const state = { w: 0, h: 0, dpr: 1 };
  const resize = () => {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = root.clientWidth;
    state.h = root.clientHeight;
    canvas.width = Math.round(state.w * state.dpr);
    canvas.height = Math.round(state.h * state.dpr);
    layout.cx = 0; layout.cy = 0;
    measure();
  };
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', frameThrottle(measure), { passive: true, capture: true });
  resize();

  let tick = 0;
  const draw = () => {
    tick += 1;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, state.w, state.h);
    if (layout.cx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.setLineDash([3, 7]);
      ctx.lineDashOffset = -(tick * 0.5) % 10;
      for (const node of layout.nodes) {
        if (!node.x) continue;
        const g = ctx.createLinearGradient(layout.cx, layout.cy, node.x, node.y);
        g.addColorStop(0, 'rgba(255,214,150,.42)');
        g.addColorStop(1, 'rgba(214,178,106,.08)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(layout.cx, layout.cy);
        ctx.lineTo(node.x, node.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    setTimeout(() => requestAnimationFrame(draw), 42);
  };
  requestAnimationFrame(draw);

  const tidy = () => {
    const core = document.querySelector('.core-star');
    if (core && core.dataset.cwHidden !== '1') {
      core.dataset.cwHidden = '1';
      core.style.opacity = '0';
    }
    for (const name of ['组合', '知识', '交付']) {
      for (const node of document.querySelectorAll(`[aria-label^="${name}"]`)) {
        if (node.dataset.cwHidden !== '1') { node.dataset.cwHidden = '1'; node.style.display = 'none'; }
      }
    }
  };
  tidy();
  const tidyTimer = setInterval(tidy, 700);
  setTimeout(() => clearInterval(tidyTimer), 15000);

  try {
    const res = await fetch('./snapshot.json', { cache: 'no-store' });
    const data = await res.json();
    const product = data.products?.[0];
    const parts = [];
    if (data.engine?.version) parts.push(`引擎 ${data.engine.version}`);
    if (product) parts.push(`${product.name} ${product.version ?? ''}`.trim());
    if (product) parts.push(`技能 ${product.skills?.length ?? 0}`);
    if (product) parts.push(`挂载 ${product.mounts?.length ?? 0}`);
    hud.textContent = parts.length ? parts.join(' · ') : '快照为空';
  } catch (error) {
    hud.textContent = '快照不可用';
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
