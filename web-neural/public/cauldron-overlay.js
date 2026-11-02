// 造化乾坤鼎：星图看板叠加层 v0.9.0
// - 水墨鼎锚定 .core-star（随滚动一起走），鼎身微旋转
// - 鼎口烟雾：两张错峰升腾（位移小、不折返），从口沿下方升起
// - 九层节点：环置星点 + 星核连线，点节点选层，双击开工
// - 操作条嵌在鼎正下方；隐藏三簇占位卡
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

async function boot() {
  if (document.getElementById('cw-overlay')) return;
  const root = el('div');
  root.id = 'cw-overlay';
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:inherit;overflow:hidden';
  document.body.appendChild(root);

  const wrap = el('div');
  wrap.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none';
  root.appendChild(wrap);

  const halo = el('div');
  halo.id = 'cw-halo';
  halo.style.cssText = 'position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 50% 58%, rgba(255,198,110,.26) 0%, rgba(255,170,60,.10) 40%, rgba(255,150,40,0) 70%);pointer-events:none;filter:blur(2px)';
  wrap.appendChild(halo);

  const smokeBack = el('img');
  smokeBack.src = './ding-smoke.png';
  smokeBack.alt = '';
  smokeBack.style.cssText = 'position:absolute;left:50%;transform:translate(-50%,-100%);transform-origin:50% 100%;pointer-events:none;mix-blend-mode:screen;opacity:.7;filter:drop-shadow(0 0 16px rgba(255,200,120,.22));will-change:transform,opacity';
  wrap.appendChild(smokeBack);

  const body = el('img');
  body.src = './ding-body.png';
  body.alt = '造化乾坤鼎';
  body.id = 'cw-ding';
  body.style.cssText = 'position:absolute;left:50%;transform:translate(-50%,-50%);pointer-events:none;mix-blend-mode:screen;filter:drop-shadow(0 0 26px rgba(255,190,90,.32))';
  wrap.appendChild(body);

  const smokeFront = el('img');
  smokeFront.src = './ding-smoke.png';
  smokeFront.alt = '';
  smokeFront.style.cssText = 'position:absolute;left:50%;transform:translate(-50%,-100%);transform-origin:50% 100%;pointer-events:none;mix-blend-mode:screen;opacity:.5;filter:blur(1.5px);will-change:transform,opacity';
  wrap.appendChild(smokeFront);

  const title = el('div', 'cw-title', '造化乾坤鼎');
  title.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);color:#f2e2b8;font-size:clamp(13px,1.4vmin,18px);letter-spacing:.4em;text-indent:.4em;text-shadow:0 0 22px rgba(255,205,120,.42),0 2px 10px rgba(0,0,0,.7);pointer-events:none;white-space:nowrap';
  wrap.appendChild(title);

  const bar = el('div');
  bar.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:12px;background:rgba(12,14,22,.72);border:1px solid rgba(214,178,106,.28);backdrop-filter:blur(10px);pointer-events:auto;white-space:nowrap';
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
  wrap.appendChild(bar);

  const canvas = el('canvas');
  canvas.id = 'cw-fx';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  root.appendChild(canvas);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes cwRiseA {
      0%   { opacity:.30; transform: translate(-50%,-98%) scale(.96); }
      50%  { opacity:.34; }
      100% { opacity:0;   transform: translate(-50%,-116%) scale(1.04); }
    }
    @keyframes cwRiseB {
      0%   { opacity:.20; transform: translate(-50%,-94%) scale(1.02); }
      50%  { opacity:.24; }
      100% { opacity:0;   transform: translate(-50%,-112%) scale(.94); }
    }
    @keyframes cwRotate {
      0%,100% { transform: translate(-50%,-50%) rotate(-.9deg) scale(1); }
      50%     { transform: translate(-50%,-50%) rotate(.9deg) scale(1.008); }
    }
    @keyframes cwHaloPulse { 0%,100% { opacity:.55; } 50% { opacity:.92; } }
    #cw-ding { animation: cwRotate 14s ease-in-out infinite; }
    #cw-halo { animation: cwHaloPulse 7s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      #cw-ding, #cw-halo { animation: none; }
    }
  `;
  document.head.appendChild(style);

  const layout = { cx: 0, cy: 0, w: 0, mouthY: 0, halfW: 0, nodes: [] };
  const measure = () => {
    const core = document.querySelector('.core-star');
    if (!core) return false;
    const rect = core.getBoundingClientRect();
    if (!rect.width) return false;
    layout.cx = rect.left + rect.width / 2;
    layout.cy = rect.top + rect.height / 2;
    layout.w = rect.width;
    wrap.style.transform = `translate(${layout.cx}px, ${layout.cy}px)`;
    const bodyW = Math.round(rect.width * 0.88);
    const bodyH = Math.round(bodyW * 0.70);
    body.style.width = `${bodyW}px`;
    body.style.top = '0px';
    const smokeW = Math.round(rect.width * 0.6);
    const smokeBottom = Math.round(bodyH * 0.18);
    for (const node of [smokeBack, smokeFront]) {
      node.style.width = `${smokeW}px`;
      node.style.bottom = `${smokeBottom}px`;
    }
    halo.style.width = `${Math.round(rect.width * 1.1)}px`;
    halo.style.height = `${Math.round(rect.width * 1.1)}px`;
    title.style.top = `${Math.round(-bodyH * 0.72)}px`;
    bar.style.top = `${Math.round(bodyH * 0.52)}px`;
    layout.mouthY = layout.cy - bodyH * 0.18;
    layout.halfW = bodyW * 0.30;

    const radius = rect.width * 0.86;
    layout.nodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / layout.nodes.length) * Math.PI * 2;
      const nx = layout.cx + Math.cos(angle) * radius;
      const ny = layout.cy + Math.sin(angle) * radius * 0.92;
      node.el.style.left = `${nx}px`;
      node.el.style.top = `${ny}px`;
      node.x = nx;
      node.y = ny;
    });
    return true;
  };

  for (const [id, zh] of LAYERS) {
    const nodeEl = el('div');
    nodeEl.style.cssText = 'position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;pointer-events:auto;cursor:pointer;white-space:nowrap';
    const dot = el('span');
    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#ffe1a0;box-shadow:0 0 10px rgba(255,205,120,.9),0 0 22px rgba(255,180,80,.5)';
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
      dot.style.boxShadow = '0 0 16px #fff2c4,0 0 34px rgba(255,210,130,.85)';
    });
    nodeEl.addEventListener('dblclick', (event) => {
      event.preventDefault();
      select.value = id;
      fire();
    });
    root.appendChild(nodeEl);
    layout.nodes.push({ id, el: nodeEl, dot, x: 0, y: 0 });
  }

  const ctx = canvas.getContext('2d');
  const state = { w: 0, h: 0, dpr: 1, embers: [], wisps: [] };
  const resize = () => {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = root.clientWidth;
    state.h = root.clientHeight;
    canvas.width = Math.round(state.w * state.dpr);
    canvas.height = Math.round(state.h * state.dpr);
    measure();
  };
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', measure, { passive: true, capture: true });
  resize();
  const follow = setInterval(measure, 400);

  const spawn = () => {
    if (!layout.mouthY) return;
    for (let i = 0; i < 2; i += 1) {
      state.embers.push({
        x: layout.cx + (Math.random() - 0.5) * layout.halfW * 2,
        y: layout.mouthY,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.3 + Math.random() * 0.9),
        life: 1,
        decay: 0.004 + Math.random() * 0.005,
        size: 0.7 + Math.random() * 1.5,
        hue: 34 + Math.random() * 14,
      });
    }
    if (state.wisps.length < 6 && Math.random() < 0.22) {
      state.wisps.push({
        x: layout.cx + (Math.random() - 0.5) * layout.halfW * 1.4,
        y: layout.mouthY - 4,
        vx: (Math.random() - 0.5) * 0.14,
        vy: -(0.1 + Math.random() * 0.16),
        life: 1,
        decay: 0.002 + Math.random() * 0.0018,
        r: 16 + Math.random() * 26,
      });
    }
  };

  let raf = 0;
  let tick = 0;
  const frame = () => {
    tick += 1;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, state.w, state.h);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const node of layout.nodes) {
      if (!layout.cx || !node.x) continue;
      const g = ctx.createLinearGradient(layout.cx, layout.cy, node.x, node.y);
      g.addColorStop(0, 'rgba(255,214,150,.55)');
      g.addColorStop(1, 'rgba(214,178,106,.10)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 0.9;
      ctx.setLineDash([3, 6]);
      ctx.lineDashOffset = -(tick * 0.6) % 9;
      ctx.beginPath();
      ctx.moveTo(layout.cx, layout.cy);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (!REDUCED) spawn();
    for (let i = state.embers.length - 1; i >= 0; i -= 1) {
      const p = state.embers[i];
      p.x += p.vx; p.y += p.vy; p.vx += (Math.random() - 0.5) * 0.02; p.life -= p.decay;
      if (p.life <= 0) { state.embers.splice(i, 1); continue; }
      const a = p.life * 0.85;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 92%, 66%, ${a})`;
      ctx.shadowColor = `hsla(${p.hue}, 95%, 58%, ${a})`;
      ctx.shadowBlur = 7;
      ctx.arc(p.x, p.y, p.size * (0.6 + p.life * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (let i = state.wisps.length - 1; i >= 0; i -= 1) {
      const w = state.wisps[i];
      w.x += w.vx; w.y += w.vy; w.life -= w.decay;
      if (w.life <= 0) { state.wisps.splice(i, 1); continue; }
      const a = w.life * 0.09;
      const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
      g.addColorStop(0, `rgba(255,236,200,${a})`);
      g.addColorStop(1, 'rgba(214,178,106,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    raf = requestAnimationFrame(frame);
  };
  if (!REDUCED) raf = requestAnimationFrame(frame);

  window.addEventListener('mousemove', (event) => {
    if (!layout.cx) return;
    const near = Math.hypot(event.clientX - layout.cx, event.clientY - layout.cy) < 200;
    body.style.filter = near
      ? 'drop-shadow(0 0 42px rgba(255,205,120,.6)) brightness(1.06)'
      : 'drop-shadow(0 0 26px rgba(255,190,90,.32))';
  });

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

  const hidePlaceholders = () => {
    let hit = 0;
    for (const name of ['组合', '知识', '交付']) {
      for (const node of document.querySelectorAll(`[aria-label^="${name}"]`)) {
        if (node.dataset.cwHidden === '1') { hit += 1; continue; }
        node.dataset.cwHidden = '1';
        node.style.display = 'none';
        hit += 1;
      }
    }
    return hit;
  };
  const hideTimer = setInterval(() => { if (hidePlaceholders() >= 3) clearInterval(hideTimer); }, 700);
  setTimeout(() => clearInterval(hideTimer), 15000);
  setTimeout(() => clearInterval(follow), 120000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
