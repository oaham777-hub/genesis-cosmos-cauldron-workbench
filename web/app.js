const state = { snapshot: null, theme: 'cauldron' };

const $ = (id) => document.getElementById(id);

function fmtBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString('zh-CN', { hour12: false });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderEngine(snapshot) {
  const engine = snapshot.engine ?? {};
  $('engine-version').textContent = engine.version ?? '—';
  $('k-engine-version').textContent = engine.version ?? '—';
  $('k-generated-at').textContent = fmtTime(engine.generated_at);
  $('k-schema').textContent = snapshot.schema ?? '—';
  $('snapshot-at').textContent = fmtTime(engine.generated_at);
}

function renderProducts(snapshot) {
  const products = Array.isArray(snapshot.products) ? snapshot.products : [];
  const list = $('product-list');
  list.replaceChildren();
  $('product-count').textContent = String(products.length);
  $('product-empty').hidden = products.length > 0;

  const maxBytes = Math.max(
    1,
    ...products.flatMap((product) => (product.skills ?? []).map((skill) => skill.bytes ?? 0)),
  );

  for (const product of products) {
    const card = el('div', 'card');
    const head = el('h3', null, product.name ?? product.id ?? '未命名产品');
    const meta = el('div', 'mono', `${product.id ?? '—'} · v${product.version ?? '?'} · ${(product.skills ?? []).length} 项技能`);
    card.append(head, meta);

    const skills = el('div');
    for (const skill of product.skills ?? []) {
      const row = el('div', 'skill');
      row.append(
        el('span', 'name', skill.id ?? '—'),
        (() => {
          const bar = el('span', 'bar');
          const fill = el('i');
          fill.style.width = `${Math.max(4, Math.round(((skill.bytes ?? 0) / maxBytes) * 100))}%`;
          bar.append(fill);
          return bar;
        })(),
        el('span', 'size', fmtBytes(skill.bytes)),
      );
      skills.append(row);
    }
    card.append(skills);
    list.append(card);
  }
}

function render(snapshot) {
  state.snapshot = snapshot;
  renderEngine(snapshot);
  renderProducts(snapshot);
  $('ember-text').textContent = `只读快照 · ${snapshot.engine?.version ?? ''} · 不会改动任何文件`;
}

async function loadSnapshot() {
  for (const url of ['./snapshot.json', './snapshot.example.json']) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      return await response.json();
    } catch {
      // 继续尝试下一个来源
    }
  }
  return { schema: 'cauldron-snapshot/v1', engine: {}, products: [] };
}

function setupTheme() {
  const button = $('theme-toggle');
  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'rice-paper' ? 'cauldron' : 'rice-paper';
    document.documentElement.dataset.theme = next;
    button.textContent = next === 'rice-paper' ? '玄色' : '宣纸';
    try {
      localStorage.setItem('cauldron-theme', next);
    } catch {
      // 忽略隐私模式下的存储失败
    }
  });
  try {
    const saved = localStorage.getItem('cauldron-theme');
    if (saved === 'rice-paper' || saved === 'cauldron') {
      document.documentElement.dataset.theme = saved;
      button.textContent = saved === 'rice-paper' ? '玄色' : '宣纸';
    }
  } catch {
    // 忽略
  }
}

setupTheme();
render(await loadSnapshot());
