// 造化乾坤鼎：星图看板叠加层（纯 DOM + Canvas 2D，无第三方依赖）
// 中央鼎图（三版可切，默认水墨）+ 呼吸光、鼎口升烟、余烬粒子、按层开工。
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

const DINGS = [
  ['line', '线框金光'],
  ['bronze', '写实青铜'],
  ['ink', '水墨光晕'],
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

  // 压暗中央星核，让鼎成为视觉核心（不破坏外层星图）
  const vignette = el('div');
  vignette.style.cssText = 'position:absolute;left:50%;top:47%;width:min(64vmin,620px);height:min(64vmin,620px);transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 50% 50%, rgba(4,5,12,.86) 0%, rgba(4,5,12,.55) 42%, rgba(4,5,12,0) 72%);pointer-events:none';
  root.appendChild(vignette);

  // 鼎后光晕
  const halo = el('div');
  halo.style.cssText = 'position:absolute;left:50%;top:47%;width:min(58vmin,560px);height:min(58vmin,560px);transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 50% 55%, rgba(255,198,110,.30) 0%, rgba(255,170,60,.12) 38%, rgba(255,150,40,0) 68%);pointer-events:none;filter:blur(2px)';
  halo.id = 'cw-halo';
  root.appendChild(halo);

  const ding = el('img');
  ding.alt = '造化乾坤鼎';
  ding.id = 'cw-ding';
  ding.style.cssText = 'position:absolute;left:50%;top:47%;width:min(42vmin,400px);transform:translate(-50%,-50%);opacity:.96;pointer-events:none;mix-blend-mode:screen;filter:drop-shadow(0 0 30px rgba(255,190,90,.35));transition:filter .4s ease';
  root.appendChild(ding);

  const title = el('div', 'cw-title', '造化乾坤鼎');
  title.style.cssText = 'position:absolute;left:50%;top:64%;transform:translateX(-50%);color:#f2e2b8;font-size:clamp(18px,2.2vmin,28px);letter-spacing:.42em;text-indent:.42em;text-shadow:0 0 24px rgba(255,205,120,.4),0 2px 10px rgba(0,0,0,.65);pointer-events:none;white-space:nowrap';
  root.appendChild(title);

  const hud = el('div', 'cw-hud');
  hud.style.cssText = 'position:absolute;left:50%;top:calc(64% + clamp(34px,4vmin,48px));transform:translateX(-50%);padding:5px 13px;border-radius:999px;background:rgba(12,14,22,.5);border:1px solid rgba(214,178,106,.28);color:#cbbf9f;font-size:12px;letter-spacing:.08em;pointer-events:none;white-space:nowrap';
  hud.textContent = '载入中';
  root.appendChild(hud);

  // 粒子画布（余烬 + 烟岚）
  const canvas = el('canvas');
  canvas.id = 'cw-fx';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  root.appendChild(canvas);

  const bar = el('div');
  bar.style.cssText = 'position:absolute;left:50%;bottom:72px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:12px;background:rgba(12,14,22,.7);border:1px solid rgba(214,178,106,.28);backdrop-filter:blur(10px);pointer-events:auto';
  const select = el('select');
  select.id = 'cw-layer';
  select.style.cssText = 'background:#12141d;color:#f1e4c6;border:1px solid rgba(214,178,106,.3);border-radius:8px;padding:5px 8px;font-size:12px';
  for (const [id, zh] of LAYERS) {
    const opt = el('option');
    opt.value = id;
    opt.textContent = `${zh} · ${id}`;
    select.appendChild(opt);
  }
  const dingToggle = el('button', '', '鼎 3/3');
  dingToggle.title = '切换鼎的版本';
  dingToggle.style.cssText = 'cursor:pointer;background:rgba(18,20,29,.9);color:#e6d7b2;border:1px solid rgba(214,178,106,.35);border-radius:8px;padding:6px 10px;font-size:12px';
  const button = el('button', '', '按此层开工');
  button.style.cssText = 'cursor:pointer;background:linear-gradient(180deg,#f6e3b8,#d8b26a);color:#241d10;border:0;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600';
  const promptOf = (layer) => `从 ${layer} 层开工：先读乾坤鼎 skills/${layer}/SKILL.md，按它的规矩执行当前任务。`;

  let dingIndex = 2;
  const readDing = () => {
    try {
      const raw = Number(localStorage.getItem('cw-ding'));
      if (Number.isInteger(raw) && raw >= 0 && raw < DINGS.length) dingIndex = raw;
    } catch { /* ignore */ }
  };
  const applyDing = () => {
    const [name, label] = DINGS[dingIndex];
    ding.src = `./ding-${name}.png`;
    dingToggle.textContent = `鼎 ${dingIndex + 1}/3 · ${label}`;
    try { localStorage.setItem('cw-ding', String(dingIndex)); } catch { /* ignore */ }
  };
  dingToggle.addEventListener('click', () => {
    dingIndex = (dingIndex + 1) % DINGS.length;
    applyDing();
  });
  readDing();
  applyDing();

  button.addEventListener('click', async () => {
    const text = promptOf(select.value);
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = '已复制';
    } catch {
      button.textContent = '复制失败';
    }
    setTimeout(() => { button.textContent = '按此层开工'; }, 2000);
  });
  bar.append(select, dingToggle, button);
  root.appendChild(bar);
  document.body.appendChild(root);

  // 呼吸 + 悬停增亮
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cwBreath { 0%,100% { transform: translate(-50%,-50%) scale(1); } 50% { transform: translate(-50%,-50%) scale(1.018); } }
    @keyframes cwHalo { 0%,100% { opacity:.55; } 50% { opacity:.9; } }
    #cw-ding { animation: cwBreath 7s ease-in-out infinite; }
    #cw-halo { animation: cwHalo 7s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { #cw-ding, #cw-halo { animation: none; } }
  `;
  document.head.appendChild(style);

  // 粒子系统：鼎口向上飘的余烬与烟岚
  const ctx = canvas.getContext('2d');
  const state = { w: 0, h: 0, dpr: 1, embers: [], wisps: [], dingRect: null, hover: 0 };
  const resize = () => {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = canvas.clientWidth = root.clientWidth;
    state.h = canvas.clientHeight = root.clientHeight;
    canvas.width = Math.round(state.w * state.dpr);
    canvas.height = Math.round(state.h * state.dpr);
    const rect = ding.getBoundingClientRect();
    state.dingRect = { cx: rect.left + rect.width / 2, top: rect.top + rect.height * 0.30, halfW: rect.width * 0.34 };
  };
  window.addEventListener('resize', resize);
  resize();
  const timer = setInterval(resize, 1500);

  const spawnEmber = () => {
    const r = state.dingRect;
    if (!r) return;
    for (let i = 0; i < 2; i += 1) {
      state.embers.push({
        x: r.cx + (Math.random() - 0.5) * r.halfW * 2,
        y: r.top + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.35 + Math.random() * 1.05),
        life: 1,
        decay: 0.0035 + Math.random() * 0.005,
        size: 0.8 + Math.random() * 1.8,
        hue: 34 + Math.random() * 16,
        glow: 0.5 + Math.random() * 0.5,
      });
    }
    if (state.wisps.length < 8 && Math.random() < 0.25) {
      state.wisps.push({
        x: r.cx + (Math.random() - 0.5) * r.halfW * 1.5,
        y: r.top - 6,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -(0.12 + Math.random() * 0.2),
        life: 1,
        decay: 0.0018 + Math.random() * 0.002,
        r: 18 + Math.random() * 34,
      });
    }
  };

  let raf = 0;
  const frame = () => {
    if (!state.w) { raf = requestAnimationFrame(frame); return; }
    const dpr = state.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, state.w, state.h);
    ctx.globalCompositeOperation = 'lighter';

    if (!REDUCED) spawnEmber();

    for (let i = state.embers.length - 1; i >= 0; i -= 1) {
      const p = state.embers[i];
      p.x += p.vx; p.y += p.vy; p.vy *= 0.998; p.vx += (Math.random() - 0.5) * 0.02; p.life -= p.decay;
      if (p.life <= 0) { state.embers.splice(i, 1); continue; }
      const a = Math.max(0, p.life) * 0.9 * p.glow;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 92%, 66%, ${a})`;
      ctx.shadowColor = `hsla(${p.hue}, 95%, 60%, ${a})`;
      ctx.shadowBlur = 8 * p.glow;
      ctx.arc(p.x, p.y, p.size * (0.6 + p.life * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    for (let i = state.wisps.length - 1; i >= 0; i -= 1) {
      const w = state.wisps[i];
      w.x += w.vx; w.y += w.vy; w.life -= w.decay;
      if (w.life <= 0) { state.wisps.splice(i, 1); continue; }
      const a = Math.max(0, w.life) * 0.10;
      const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.r);
      g.addColorStop(0, `rgba(255,232,190,${a})`);
      g.addColorStop(0.5, `rgba(214,178,106,${a * 0.45})`);
      g.addColorStop(1, 'rgba(214,178,106,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  };
  if (!REDUCED) raf = requestAnimationFrame(frame);

  window.addEventListener('mousemove', (event) => {
    const r = state.dingRect;
    if (!r) return;
    const d = Math.hypot(event.clientX - r.cx, event.clientY - (r.top + 40));
    const near = d < 220;
    state.hover = near ? 1 : 0;
    ding.style.filter = near
      ? 'drop-shadow(0 0 46px rgba(255,205,120,.62)) brightness(1.08)'
      : 'drop-shadow(0 0 30px rgba(255,190,90,.35))';
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!REDUCED && !raf) raf = requestAnimationFrame(frame);
  });

  try {
    const res = await fetch('./snapshot.json', { cache: 'no-store' });
    const data = await res.json();
    const product = data.products?.[0];
    const version = data.engine?.version;
    const parts = [];
    if (version) parts.push(`引擎 ${version}`);
    if (product) parts.push(`${product.name} ${product.version ?? ''}`.trim());
    if (product) parts.push(`技能 ${product.skills?.length ?? 0}`);
    if (product) parts.push(`挂载 ${product.mounts?.length ?? 0}`);
    hud.textContent = parts.length ? parts.join(' · ') : '快照为空';
  } catch (error) {
    hud.textContent = `快照不可用：${error?.message ?? error}`;
  }

  // 三个占位簇：保留星空造型，但灰化、降透明，明确“暂未启用”
  const dimPlaceholders = () => {
    let hit = 0;
    for (const name of ['组合', '知识', '交付']) {
      for (const node of document.querySelectorAll(`[aria-label^="${name}"]`)) {
        if (node.dataset.cwDim === '1') { hit += 1; continue; }
        node.dataset.cwDim = '1';
        node.style.filter = 'grayscale(1) brightness(.5)';
        node.style.opacity = '.34';
        hit += 1;
      }
    }
    return hit;
  };
  const dimTimer = setInterval(() => { if (dimPlaceholders() >= 3) clearInterval(dimTimer); }, 700);
  setTimeout(() => clearInterval(dimTimer), 12000);
  setTimeout(() => clearInterval(timer), 60000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
