// 造化乾坤鼎：星图看板叠加层 v0.11.2
// 动效全部由 requestAnimationFrame 驱动（不依赖 CSS 动画，不受 reduced-motion 影响）。
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

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function boot() {
  if (document.getElementById('cw-overlay')) return;
  const core = document.querySelector('.core-star');
  if (!core || !core.parentElement) { setTimeout(boot, 300); return; }

  const style = document.createElement('style');
  style.textContent = `
    #cw-overlay .cw-puff { position:absolute; left:50%; bottom:0; width:80%; height:185%; background-repeat:no-repeat; background-position:50% 100%; background-size:100% auto; will-change:transform,opacity; }
    #cw-overlay .cw-smoke { -webkit-mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,.2) 8%, rgba(0,0,0,.78) 28%, #000 62%);
                            mask-image: linear-gradient(to top, transparent 0%, rgba(0,0,0,.2) 8%, rgba(0,0,0,.78) 28%, #000 62%); }
    #cw-overlay .cw-mist { position:absolute; left:0; top:0; pointer-events:none; mix-blend-mode:screen; will-change:transform; }
    #cw-overlay .cw-rotator { position:absolute; left:0; top:0; width:0; height:0; will-change:transform; }
  `;
  document.head.appendChild(style);

  const host = el('div');
  host.id = 'cw-overlay';
  host.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:5';
  core.appendChild(host);

  const rotator = el('div', 'cw-rotator');
  host.appendChild(rotator);

  const body = el('img');
  body.src = './ding-ink.png';
  body.alt = '造化乾坤鼎';
  body.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;mix-blend-mode:screen;filter:drop-shadow(0 0 24px rgba(255,190,90,.28))';
  rotator.appendChild(body);

  const mist = [];
  for (let i = 0; i < 3; i += 1) {
    const node = el('img', 'cw-mist');
    node.src = './ding-mist.png';
    node.alt = '';
    node.style.opacity = ['.16', '.11', '.15'][i];
    node.style.filter = 'blur(7px)';
    host.appendChild(node);
    mist.push(node);
  }

  const smoke = el('div', 'cw-smoke');
  smoke.style.cssText = 'position:absolute;left:0;pointer-events:none;mix-blend-mode:screen;overflow:hidden';
  const puffs = [];
  for (let i = 0; i < 3; i += 1) {
    const puff = el('div', 'cw-puff');
    puff.style.backgroundImage = 'url(./ding-plume.png)';
    smoke.appendChild(puff);
    puffs.push(puff);
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
  const lines = LAYERS.map(() => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('stroke', 'rgba(255,214,150,.34)');
    line.setAttribute('stroke-width', '0.9');
    line.setAttribute('stroke-dasharray', '3 7');
    svg.appendChild(line);
    return line;
  });
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

  const geom = { bodyW: 0, bodyH: 0, radius: 0 };

  const apply = () => {
    if (!host.isConnected) {
      if (core.isConnected) core.appendChild(host);
      else return;
    }
    for (const sel of ['.cs-v41', '.cs-nucleus']) {
      for (const layer of core.querySelectorAll(sel)) {
        if (layer.style.display !== 'none') layer.style.display = 'none';
      }
    }
    const w = core.offsetWidth || 460;
    geom.bodyW = Math.round(w * 0.66);
    geom.bodyH = geom.bodyW;
    geom.radius = w * 0.86;
    body.style.width = `${geom.bodyW}px`;
    smoke.style.width = `${Math.round(w * 0.42)}px`;
    smoke.style.height = `${Math.round(geom.bodyH * 0.62)}px`;
    smoke.style.bottom = `${Math.round(geom.bodyH * 0.12)}px`;
    mist[0].style.width = `${Math.round(geom.bodyW * 1.55)}px`;
    mist[1].style.width = `${Math.round(geom.bodyW * 1.25)}px`;
    mist[2].style.width = `${Math.round(geom.bodyW * 1.15)}px`;
    title.style.top = `${Math.round(-geom.bodyH * 0.62)}px`;
    bar.style.top = `${Math.round(geom.bodyH * 0.6)}px`;

    const half = Math.ceil(geom.radius) + 120;
    svg.setAttribute('width', String(half * 2));
    svg.setAttribute('height', String(half * 2));
    svg.setAttribute('viewBox', `${-half} ${-half} ${half * 2} ${half * 2}`);
    svg.style.left = `${-half}px`;
    svg.style.top = `${-half}px`;
    nodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / nodes.length) * Math.PI * 2;
      const nx = Math.round(Math.cos(angle) * geom.radius);
      const ny = Math.round(Math.sin(angle) * geom.radius * 0.9);
      node.el.style.transform = `translate(${nx}px, ${ny}px) translate(-50%, -50%)`;
      lines[index].setAttribute('x1', '0');
      lines[index].setAttribute('y1', '0');
      lines[index].setAttribute('x2', String(nx));
      lines[index].setAttribute('y2', String(ny));
    });

    for (const name of ['组合', '知识', '交付']) {
      for (const node of document.querySelectorAll(`[aria-label^="${name}"]`)) {
        if (node.dataset.cwHidden !== '1') { node.dataset.cwHidden = '1'; node.style.display = 'none'; }
      }
    }
  };

  apply();

  const t0 = performance.now();
  const animate = () => {
    const t = (performance.now() - t0) / 1000;
    // 鼎身：像星点一样微微沉浮 + 微旋转
    const bob = Math.sin(t * 0.7) * 5;
    const rot = Math.sin(t * 0.42) * 0.9;
    rotator.style.transform = `translate3d(0, ${bob.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;
    // 口沿烟柱：每层独立周期，匀速上浮并淡出
    puffs.forEach((puff, index) => {
      const dur = 6.5 + index * 2.2;
      const phase = ((t + index * 2.1) % dur) / dur;
      puff.style.opacity = String(Math.max(0, 0.36 * (1 - phase)));
      puff.style.transform = `translate(-50%, ${(6 - phase * 52).toFixed(2)}%) scale(${(0.9 + phase * 0.24).toFixed(3)})`;
    });
    // 绕鼎雾带：两顺一逆，缓慢旋转（鼎身上/中/下各一圈）
    const drift = [13, -9, 7];
    const cy = [(-geom.bodyH * 0.42), (geom.bodyH * 0.02), (geom.bodyH * 0.28)];
    mist.forEach((node, index) => {
      const deg = (t * drift[index]) % 360;
      node.style.transform = `translate(0px, ${cy[index]}px) translate(-50%,-50%) rotate(${deg.toFixed(1)}deg)`;
    });
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  const timer = setInterval(apply, 600);
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
