// 造化乾坤鼎：星图看板叠加层 v0.10.0
// 不再做屏幕坐标测量——直接把叠加层挂进星核的父容器，用 offsetLeft/offsetTop 定位，
// 天然随星图一起平移/滚动，不会再出现错位。
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

const SVG_NS = 'http://www.w3.org/2000/svg';

function boot() {
  if (document.getElementById('cw-overlay')) return;
  const core = document.querySelector('.core-star');
  if (!core || !core.parentElement) return;
  const parent = core.parentElement;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes cwRotate { 0%,100% { transform: translate(-50%,-50%) rotate(-.8deg); } 50% { transform: translate(-50%,-50%) rotate(.8deg); } }
    @keyframes cwPuff { 0%   { opacity:.34; transform: translate(-50%, 8%) scale(.92); }
                        55%  { opacity:.26; }
                        100% { opacity:0;   transform: translate(-50%, -46%) scale(1.14); } }
    #cw-overlay .cw-puff { position:absolute; left:50%; bottom:0; width:100%; height:200%; transform:translate(-50%,8%); background-repeat:no-repeat; background-position:50% 100%; background-size:100% auto; animation:cwPuff 7.5s linear infinite; }
    #cw-overlay .cw-puff:nth-child(2) { animation-duration:10s; animation-delay:-2.6s; opacity:.5; filter:blur(.6px); }
    #cw-overlay .cw-puff:nth-child(3) { animation-duration:12.5s; animation-delay:-5.2s; opacity:.36; filter:blur(1.4px); }
    #cw-overlay .cw-smoke { -webkit-mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,.2) 8%, rgba(0,0,0,.75) 28%, #000 62%);
                            mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,.2) 8%, rgba(0,0,0,.75) 28%, #000 62%); }
    @media (prefers-reduced-motion: reduce) { #cw-overlay .cw-rotator, #cw-overlay .cw-puff { animation: none; } }
  `;
  document.head.appendChild(style);

  const host = el('div');
  host.id = 'cw-overlay';
  host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:5';
  parent.appendChild(host);

  const rotator = el('div', 'cw-rotator');
  rotator.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;animation:cwRotate 13s ease-in-out infinite';
  host.appendChild(rotator);

  const body = el('img');
  body.src = './ding-body.png';
  body.alt = '造化乾坤鼎';
  body.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;mix-blend-mode:screen;filter:drop-shadow(0 0 24px rgba(255,190,90,.28))';
  rotator.appendChild(body);

  const smoke = el('div', 'cw-smoke');
  smoke.style.cssText = 'position:absolute;left:0;pointer-events:none;mix-blend-mode:screen;overflow:hidden';
  for (let i = 0; i < 3; i += 1) {
    const puff = el('div', 'cw-puff');
    puff.style.backgroundImage = 'url(./ding-smoke.png)';
    smoke.appendChild(puff);
  }
  host.appendChild(smoke);

  const title = el('div', 'cw-title', '造化乾坤鼎');
  title.style.cssText = 'position:absolute;left:0;transform:translateX(-50%);color:#f2e2b8;font-size:13px;letter-spacing:.4em;text-indent:.4em;text-shadow:0 0 22px rgba(255,205,120,.42),0 2px 10px rgba(0,0,0,.7);pointer-events:none;white-space:nowrap';
  host.appendChild(title);

  const bar = el('div');
  bar.style.cssText = 'position:absolute;left:0;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:12px;background:rgba(12,14,22,.78);border:1px solid rgba(214,178,106,.28);backdrop-filter:blur(10px);pointer-events:auto;white-space:nowrap';
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
  host.appendChild(bar);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
  const lines = [];
  for (const [id] of LAYERS) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('stroke', 'rgba(255,214,150,.34)');
    line.setAttribute('stroke-width', '0.9');
    line.setAttribute('stroke-dasharray', '3 7');
    svg.appendChild(line);
    lines.push(line);
  }
  host.appendChild(svg);

  const nodes = [];
  for (const [id, zh] of LAYERS) {
    const nodeEl = el('div');
    nodeEl.style.cssText = 'position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;pointer-events:auto;cursor:pointer;white-space:nowrap;transform:translate(-50%,-50%)';
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
      nodes.forEach((n) => { n.dot.style.background = '#ffe1a0'; });
      dot.style.background = '#fff6dc';
    });
    nodeEl.addEventListener('dblclick', (event) => { event.preventDefault(); select.value = id; fire(); });
    host.appendChild(nodeEl);
    nodes.push({ id, el: nodeEl, dot });
  }

  const apply = () => {
    if (!host.isConnected) {
      if (parent.contains(core)) parent.appendChild(host);
      else return;
    }
    if (!core.isConnected) return;
    const w = core.offsetWidth || 460;
    const h = core.offsetHeight || 460;
    host.style.left = `${core.offsetLeft + w / 2}px`;
    host.style.top = `${core.offsetTop + h / 2}px`;
    // 藏掉原生星核视觉（保留尺寸供定位）
    if (core.style.opacity !== '0') core.style.opacity = '0';
    if (core.style.visibility !== 'hidden') core.style.visibility = 'hidden';

    const bodyW = Math.round(w * 0.66);
    const bodyH = Math.round(bodyW * 0.70);
    body.style.width = `${bodyW}px`;
    const smokeW = Math.round(w * 0.46);
    smoke.style.width = `${smokeW}px`;
    smoke.style.height = `${bodyH * 1.1}px`;
    smoke.style.bottom = `${Math.round(bodyH * 0.14)}px`;
    title.style.top = `${Math.round(-bodyH * 0.8)}px`;
    bar.style.top = `${Math.round(bodyH * 0.52)}px`;

    const radius = w * 0.86;
    const half = Math.ceil(radius) + 120;
    svg.setAttribute('width', String(half * 2));
    svg.setAttribute('height', String(half * 2));
    svg.setAttribute('viewBox', `${-half} ${-half} ${half * 2} ${half * 2}`);
    svg.style.left = `${-half}px`;
    svg.style.top = `${-half}px`;
    nodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / nodes.length) * Math.PI * 2;
      const nx = Math.cos(angle) * radius;
      const ny = Math.sin(angle) * radius * 0.9;
      node.el.style.transform = `translate(${Math.round(nx)}px, ${Math.round(ny)}px) translate(-50%, -50%)`;
      lines[index].setAttribute('x1', '0');
      lines[index].setAttribute('y1', '0');
      lines[index].setAttribute('x2', String(Math.round(nx)));
      lines[index].setAttribute('y2', String(Math.round(ny)));
    });

    // 三簇占位卡藏掉
    for (const name of ['组合', '知识', '交付']) {
      for (const node of document.querySelectorAll(`[aria-label^="${name}"]`)) {
        if (node.dataset.cwHidden !== '1') { node.dataset.cwHidden = '1'; node.style.display = 'none'; }
      }
    }
  };

  apply();
  const timer = setInterval(apply, 400);
  setTimeout(() => clearInterval(timer), 180000);

  fetch('./snapshot.json', { cache: 'no-store' })
    .then((res) => res.json())
    .then((data) => {
      const product = data.products?.[0];
      const parts = [];
      if (data.engine?.version) parts.push(`引擎 ${data.engine.version}`);
      if (product) parts.push(`${product.name} ${product.version ?? ''}`.trim());
      if (product) parts.push(`技能 ${product.skills?.length ?? 0}`);
      if (product) parts.push(`挂载 ${product.mounts?.length ?? 0}`);
      hud.textContent = parts.length ? parts.join(' · ') : '快照为空';
    })
    .catch(() => { hud.textContent = '快照不可用'; });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
