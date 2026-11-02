// 造化乾坤鼎：星图看板叠加层（纯 DOM，不改 React 主体）
// 只做两件事：中央题名、按层开工。
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
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:inherit';

  const title = el('div', 'cw-title', '造化乾坤鼎');
  title.style.cssText = 'position:absolute;left:50%;top:20%;transform:translateX(-50%);color:#f2e2b8;font-size:clamp(26px,3.6vmin,44px);letter-spacing:.42em;text-indent:.42em;text-shadow:0 0 28px rgba(255,205,120,.45),0 2px 12px rgba(0,0,0,.6);pointer-events:none;white-space:nowrap';
  root.appendChild(title);

  const hud = el('div', 'cw-hud');
  hud.style.cssText = 'position:absolute;left:50%;top:calc(20% + clamp(44px,5.4vmin,66px));transform:translateX(-50%);padding:6px 14px;border-radius:999px;background:rgba(12,14,22,.5);border:1px solid rgba(214,178,106,.28);color:#cbbf9f;font-size:12px;letter-spacing:.08em;pointer-events:none;white-space:nowrap';
  hud.textContent = '载入中';
  root.appendChild(hud);

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
  const button = el('button', '', '按此层开工');
  button.style.cssText = 'cursor:pointer;background:linear-gradient(180deg,#f6e3b8,#d8b26a);color:#241d10;border:0;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600';
  const promptOf = (layer) => `从 ${layer} 层开工：先读乾坤鼎 skills/${layer}/SKILL.md，按它的规矩执行当前任务。`;
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
  bar.append(select, button);
  root.appendChild(bar);
  document.body.appendChild(root);

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
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
