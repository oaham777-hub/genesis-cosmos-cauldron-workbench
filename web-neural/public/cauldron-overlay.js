// 造化乾坤鼎：星图看板叠加层 v0.12.0
// 新版水墨鼎（白底已键出透明）缩小放进中间圆球；烟雾改用独立素材图，循环上飘。
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
  if (document.getElementById('cw-host')) return;
  const core = document.querySelector('.core-star');
  if (!core) { setTimeout(boot, 300); return; }

  const style = document.createElement('style');
  style.textContent = `
    #cw-host { position:fixed; left:0; top:0; width:0; height:0; pointer-events:none; z-index:60; }
    #cw-host .cw-rotator { position:absolute; left:0; top:0; width:0; height:0; will-change:transform; }
    #cw-host .cw-smoke-wrap { position:absolute; left:0; overflow:hidden; pointer-events:none; }
    #cw-host .cw-smoke { position:absolute; left:50%; bottom:0; width:100%; transform-origin:50% 100%; will-change:transform,opacity; }
  `;
  document.head.appendChild(style);

  const host = el('div');
  host.id = 'cw-host';
  document.body.appendChild(host);

  const rotator = el('div', 'cw-rotator');
  host.appendChild(rotator);

  const body = el('img');
  body.src = './ding-v2-keyed.png';
  body.alt = '造化乾坤鼎';
  body.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 0 18px rgba(255,180,80,.35))';
  rotator.appendChild(body);

  const smokeWrap = el('div', 'cw-smoke-wrap');
  const smokes = [];
  for (let i = 0; i < 3; i += 1) {
    const node = el('img', 'cw-smoke');
    node.src = './smoke-v2-keyed.png';
    node.alt = '';
    smokeWrap.appendChild(node);
    smokes.push(node);
  }
  host.appendChild(smokeWrap);

  const title = el('div', 'cw-title', '造化乾坤鼎');
  title.style.cssText = 'position:absolute;left:0;transform:translateX(-50%);color:#f2e2b8;font-size:13px;letter-spacing:.4em;text-indent:.4em;text-shadow:0 0 22px rgba(255,205,120,.42),0 2px 10px rgba(0,0,0,.7);white-space:nowrap;pointer-events:none';
  host.appendChild(title);

  const beat = el('div');
  beat.style.cssText = 'position:absolute;width:5px;height:5px;border-radius:50%;background:#ffe1a0;box-shadow:0 0 8px rgba(255,220,140,.9);pointer-events:none';
  host.appendChild(beat);

  const bar = el('div');
  bar.style.cssText = 'position:absolute;left:0;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:12px;background:rgba(12,14,22,.78);border:1px solid rgba(214,178,106,.28);backdrop-filter:blur(10px);pointer-events:auto;white-space:nowrap';
  const hud = el('span');
  hud.textContent = '载入中';
  hud.style.cssText = 'color:#cbbf9f;font-size:11px;padding:0 4px';
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
    try { await navigator.clipboard.writeText(text); button.textContent = '已复制'; }
    catch { button.textContent = '复制失败'; }
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
    nodeEl.style.cssText = 'position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;pointer-events:auto;cursor:pointer;white-space:nowrap';
    const dot = el('span');
    dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:#ffe1a0;box-shadow:0 0 10px rgba(255,205,120,.85)';
    const label = el('span');
    label.textContent = zh;
    label.style.cssText = 'color:#e8d9b4;font-size:11px;letter-spacing:.14em;text-shadow:0 0 12px rgba(255,200,120,.35),0 1px 6px rgba(0,0,0,.8);opacity:.85';
    nodeEl.append(dot, label);
    nodeEl.title = `${zh} · ${id}`;
    nodeEl.addEventListener('click', (event) => { event.preventDefault(); select.value = id; nodes.forEach((n) => { n.dot.style.background = '#ffe1a0'; }); dot.style.background = '#fff6dc'; });
    nodeEl.addEventListener('dblclick', (event) => { event.preventDefault(); select.value = id; fire(); });
    host.appendChild(nodeEl);
    nodes.push({ el: nodeEl, dot });
  }

  let geom = { w: 0, bodyW: 0, bodyH: 0, radius: 0 };
  let errorText = '';

  const measure = () => {
    const rect = core.getBoundingClientRect();
    if (!rect.width) return null;
    host.style.transform = `translate(${rect.left + rect.width / 2}px, ${rect.top + rect.height / 2}px)`;
    return rect;
  };

  const layout = (rect) => {
    const w = rect.width || 460;
    // 鼎收进中间圆球：直径取星核宽度的 42%
    geom = { w, bodyW: Math.round(w * 0.42), bodyH: Math.round(w * 0.42), radius: w * 0.86 };
    body.style.width = `${geom.bodyW}px`;
    const smokeW = Math.round(w * 0.17);
    smokeWrap.style.width = `${smokeW}px`;
    smokeWrap.style.height = `${Math.round(geom.bodyH * 1.15)}px`;
    smokeWrap.style.top = `${Math.round(-geom.bodyH * 0.95)}px`;
    smokeWrap.style.transform = 'translateX(-50%)';
    smokes.forEach((node) => { node.style.height = `${Math.round(geom.bodyH * 1.15)}px`; });
    title.style.top = `${Math.round(geom.bodyH * 0.42)}px`;
    bar.style.top = `${Math.round(geom.bodyH * 0.68)}px`;
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
  };

  const t0 = performance.now();
  const frame = () => {
    try {
      const t = (performance.now() - t0) / 1000;
      const rect = measure();
      if (rect && Math.abs((rect.width || 0) - geom.w) > 1) layout(rect);
      beat.style.opacity = Math.abs(t % 1.2) < 0.3 ? '1' : '.2';
      beat.style.left = `${Math.round(geom.radius * 0.5)}px`;
      beat.style.top = `${Math.round(geom.bodyH * 0.7)}px`;
      const bob = Math.sin(t * 0.9) * 4;
      const rot = Math.sin(t * 0.5) * 0.9;
      rotator.style.transform = `translate3d(0, ${bob.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;
      smokes.forEach((node, index) => {
        const dur = 4.6 + index * 1.5;
        const phase = ((t / dur) + index / 3) % 1;
        node.style.opacity = String(Math.max(0, 0.75 * (1 - phase)));
        node.style.transform = `translate(-50%, ${(28 - phase * 78).toFixed(1)}%) scale(${(0.82 + phase * 0.3).toFixed(3)})`;
      });
      if (errorText && title.textContent !== errorText) title.textContent = errorText;
    } catch (error) {
      errorText = `动效异常：${String(error.message || error).slice(0, 60)}`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  fetch('./snapshot.json', { cache: 'no-store' })
    .then((res) => res.json())
    .then((data) => {
      const product = data.products?.[0];
      const parts = [];
      if (data.engine?.version) parts.push(`引擎 ${data.engine.version}`);
      if (product) parts.push(`${product.name} ${product.version ?? ''}`.trim());
      if (product) parts.push(`技能 ${product.skills?.length ?? 0}`);
      if (product) parts.push(`挂载 ${product.mounts?.length ?? 0}`);
      hud.textContent = parts.join(' · ') || '快照为空';
    })
    .catch(() => { hud.textContent = '快照不可用'; });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
