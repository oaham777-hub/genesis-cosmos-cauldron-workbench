// 造化乾坤鼎：星图看板叠加层（纯 DOM，不改 React 主体）
// 只做三件事：中心大鼎、引擎/产品数字 HUD、按层开工的提示词。
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

const CAULDRON = `
<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="cwGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6e3b8"/><stop offset=".55" stop-color="#d8b26a"/><stop offset="1" stop-color="#8c6a2f"/>
    </linearGradient>
    <radialGradient id="cwGlow" cx="50%" cy="40%" r="55%">
      <stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="100" cy="78" rx="86" ry="52" fill="url(#cwGlow)"/>
  <g fill="none" stroke="url(#cwGold)" stroke-width="2.2" stroke-linecap="round">
    <path d="M52 62h96"/>
    <path d="M58 62c0 26 16 44 42 44s42-18 42-44"/>
    <path d="M58 62c4-16 22-26 42-26s38 10 42 26"/>
    <path d="M42 58c-12-2-16-14-6-20 8-5 16 0 16 8"/>
    <path d="M158 58c12-2 16-14 6-20-8-5-16 0-16 8"/>
    <path d="M74 106l-6 26"/>
    <path d="M126 106l6 26"/>
    <path d="M100 108v26"/>
    <path d="M64 132h20M116 132h20M92 134h16"/>
  </g>
  <ellipse cx="100" cy="60" rx="40" ry="9" fill="none" stroke="#f6e3b8" stroke-opacity=".35"/>
</svg>`;

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

async function boot() {
  if (document.getElementById('cw-overlay')) return;
  const root = el('div');
  root.id = 'cw-overlay';
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:inherit';

  const sigil = el('div', 'cw-sigil', CAULDRON);
  sigil.style.cssText = 'position:absolute;left:50%;top:38%;width:min(34vmin,300px);transform:translate(-50%,-50%);opacity:.5;filter:drop-shadow(0 0 26px rgba(255,205,120,.35));animation:cwBreath 6s ease-in-out infinite';
  root.appendChild(sigil);

  const hud = el('div', 'cw-hud');
  hud.style.cssText = 'position:absolute;left:50%;top:calc(38% + min(18vmin,160px));transform:translateX(-50%);display:flex;gap:14px;align-items:center;padding:8px 16px;border-radius:999px;background:rgba(12,14,22,.62);border:1px solid rgba(214,178,106,.35);backdrop-filter:blur(8px);color:#f1e4c6;font-size:12px;letter-spacing:.06em;pointer-events:auto';
  hud.textContent = '造化乾坤鼎 · 载入中';
  root.appendChild(hud);

  const bar = el('div');
  bar.style.cssText = 'position:absolute;left:50%;bottom:76px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:14px;background:rgba(12,14,22,.78);border:1px solid rgba(214,178,106,.35);backdrop-filter:blur(10px);pointer-events:auto';
  const select = el('select');
  select.id = 'cw-layer';
  select.style.cssText = 'background:#12141d;color:#f1e4c6;border:1px solid rgba(214,178,106,.3);border-radius:8px;padding:6px 8px;font-size:12px';
  for (const [id, zh] of LAYERS) {
    const opt = el('option');
    opt.value = id;
    opt.textContent = `${zh} · ${id}`;
    select.appendChild(opt);
  }
  const preview = el('div');
  preview.style.cssText = 'max-width:46vw;color:#cfc4ab;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
  const button = el('button');
  button.textContent = '按此层开工';
  button.style.cssText = 'cursor:pointer;background:linear-gradient(180deg,#f6e3b8,#d8b26a);color:#241d10;border:0;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600';

  const promptOf = (layer) => `从 ${layer} 层开工：先读乾坤鼎 skills/${layer}/SKILL.md，按它的规矩执行当前任务；需要引用的素材在 03-assets，分镜在 04-shotlist。`;
  const refresh = () => { preview.textContent = promptOf(select.value); };
  select.addEventListener('change', refresh);
  button.addEventListener('click', async () => {
    const text = promptOf(select.value);
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = '已复制，粘贴发送';
    } catch {
      preview.textContent = text;
      button.textContent = '复制失败，请手动复制';
    }
    setTimeout(() => { button.textContent = '按此层开工'; }, 2400);
  });
  bar.append(select, preview, button);
  root.appendChild(bar);
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.textContent = '@keyframes cwBreath{0%,100%{opacity:.38;transform:translate(-50%,-50%) scale(1)}50%{opacity:.62;transform:translate(-50%,-50%) scale(1.035)}}';
  document.head.appendChild(style);
  refresh();

  try {
    const res = await fetch('./snapshot.json', { cache: 'no-store' });
    const data = await res.json();
    const p = data.products?.[0];
    const parts = [`引擎 ${data.engine ?? '—'}`, p ? `${p.name} ${p.version}` : '无产品'];
    if (p) parts.push(`技能 ${p.skills?.length ?? 0}`, `挂载 ${p.mounts?.length ?? 0}`);
    hud.textContent = parts.join('  ·  ');
    select.value = p?.skills?.[0]?.id?.split('/')[0] ?? '00-router';
    refresh();
  } catch (error) {
    hud.textContent = `快照不可用：${error?.message ?? error}`;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
