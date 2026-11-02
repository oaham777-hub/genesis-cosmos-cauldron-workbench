window.__ModuleLoader__.load({
  id: 'cauldron-workbench',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;
    const API = '/api/cauldron-workbench';

    const css = `
.cwRoot { display:flex; flex-direction:column; gap:0; height:100%; min-height:0; font-family:"Source Han Sans SC","Noto Sans SC","Microsoft YaHei",sans-serif; color:var(--cw-text); background:var(--cw-bg); }
.cwRoot[data-theme="rice-paper"] { --cw-bg:#f4eee1; --cw-surface:#fbf7ec; --cw-surface2:#efe6d2; --cw-line:#d8cbb2; --cw-text:#2b2318; --cw-dim:#7a6a52; --cw-accent:#a62b22; --cw-gold:#b07a2a; --cw-bronze:#6b6350; --cw-shadow:0 1px 0 rgba(0,0,0,.04); }
.cwRoot { --cw-bg:#14110e; --cw-surface:#1d1914; --cw-surface2:#26201a; --cw-line:#3a3128; --cw-text:#e8dcc8; --cw-dim:#8b8578; --cw-accent:#c8352b; --cw-gold:#d4a24c; --cw-bronze:#5e6b55; --cw-shadow:none; }
.cwEars { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:12px 18px; border-bottom:1px solid var(--cw-line); background:var(--cw-surface); }
.cwBrand { display:flex; align-items:baseline; gap:12px; }
.cwBrand h1 { margin:0; font-family:"Source Han Serif SC","Noto Serif SC",serif; font-size:19px; letter-spacing:.16em; font-weight:600; }
.cwSeal { border:1px solid var(--cw-accent); color:var(--cw-accent); font-size:11px; letter-spacing:.28em; padding:1px 6px; }
.cwStats { display:flex; gap:16px; font-size:12px; color:var(--cw-dim); }
.cwStats b { color:var(--cw-text); font-family:ui-monospace,Consolas,monospace; font-weight:600; }
.cwBtn { background:transparent; border:1px solid var(--cw-line); color:var(--cw-dim); border-radius:2px; padding:3px 9px; font-size:12px; cursor:pointer; }
.cwBtn:hover { color:var(--cw-gold); border-color:var(--cw-gold); }
.cwTripod { display:grid; grid-template-columns:1fr 1.5fr 1fr; gap:1px; background:var(--cw-line); flex:1; min-height:0; overflow:auto; }
.cwLeg { background:var(--cw-surface); padding:14px; min-width:0; }
.cwLegTitle { margin:0 0 10px; font-family:"Source Han Serif SC","Noto Serif SC",serif; font-size:13px; letter-spacing:.24em; color:var(--cw-gold); display:flex; justify-content:space-between; align-items:baseline; }
.cwLegTitle small { font-family:ui-monospace,Consolas,monospace; letter-spacing:0; color:var(--cw-dim); font-size:11px; }
.cwCard { background:var(--cw-surface2); border:1px solid var(--cw-line); border-radius:2px; padding:11px 12px; margin-bottom:10px; }
.cwCard h3 { margin:0 0 3px; font-size:14px; font-weight:600; }
.cwMono { font-family:ui-monospace,Consolas,monospace; font-size:11px; color:var(--cw-dim); }
.cwKv { display:grid; grid-template-columns:auto 1fr; gap:2px 12px; font-size:12px; margin:8px 0 0; }
.cwKv dt { color:var(--cw-dim); }
.cwKv dd { margin:0; font-family:ui-monospace,Consolas,monospace; }
.cwSkill { display:grid; grid-template-columns:88px 1fr 64px; gap:8px; align-items:center; font-size:11px; padding:2px 0; }
.cwSkill .n { font-family:ui-monospace,Consolas,monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cwBar { height:3px; background:var(--cw-line); border-radius:2px; overflow:hidden; }
.cwBar i { display:block; height:100%; background:linear-gradient(90deg,var(--cw-bronze),var(--cw-gold)); }
.cwSkill .s { text-align:right; font-family:ui-monospace,Consolas,monospace; color:var(--cw-dim); }
.cwEmpty { border:1px dashed var(--cw-line); border-radius:2px; padding:22px 14px; text-align:center; color:var(--cw-dim); font-size:12px; line-height:1.9; }
.cwWarn { color:var(--cw-accent); font-size:12px; margin-top:8px; }
.cwFoot { padding:6px 18px; border-top:1px solid var(--cw-line); font-size:11px; color:var(--cw-dim); display:flex; justify-content:space-between; }
.cwChips { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 10px; }
.cwChip { background:transparent; border:1px solid var(--cw-line); color:var(--cw-dim); border-radius:2px; padding:2px 8px; font-size:11px; cursor:pointer; font-family:ui-monospace,Consolas,monospace; }
.cwChip[data-on="1"] { color:var(--cw-gold); border-color:var(--cw-gold); }
.cwLayer { border:1px solid var(--cw-line); border-radius:2px; margin-bottom:6px; }
.cwLayerHead { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:5px 9px; font-size:12px; cursor:pointer; }
.cwLayerHead .t { font-family:ui-monospace,Consolas,monospace; }
.cwLayerBody { border-top:1px solid var(--cw-line); padding:6px 9px 2px; }
.cwCombo { display:grid; grid-template-columns:1fr 34px 56px; gap:2px 8px; font-size:11px; font-family:ui-monospace,Consolas,monospace; }
.cwCombo .h { color:var(--cw-dim); border-bottom:1px solid var(--cw-line); padding-bottom:2px; }
`;

    function useSnapshot() {
      const [state, setState] = React.useState({ loading: true, data: null, error: null });
      const load = React.useCallback(async () => {
        setState((current) => ({ ...current, loading: true, error: null }));
        try {
          const response = await fetch(`${API}/snapshot`, { cache: 'no-store' });
          const data = await response.json();
          setState({ loading: false, data, error: null });
        } catch (error) {
          setState({ loading: false, data: null, error: error instanceof Error ? error.message : String(error) });
        }
      }, []);
      React.useEffect(() => { void load(); }, [load]);
      return { ...state, reload: load };
    }

    function bytes(value) {
      if (!Number.isFinite(value)) return '—';
      return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`;
    }

    function EngineLeg({ data }) {
      const engine = data?.engine ?? {};
      return h('section', { className: 'cwLeg' },
        h('h2', { className: 'cwLegTitle' }, '造化鼎', h('small', null, 'ENGINE')),
        h('div', { className: 'cwCard' },
          h('h3', null, '引擎状态'),
          h('dl', { className: 'cwKv' },
            h('dt', null, '版本'), h('dd', null, engine.version ?? '—'),
            h('dt', null, '快照时间'), h('dd', null, engine.generated_at ?? '—'),
            h('dt', null, '快照格式'), h('dd', null, data?.schema ?? '—'),
            h('dt', null, '产品数'), h('dd', null, String(data?.totals?.products ?? 0)))),
        h('div', { className: 'cwCard' },
          h('h3', null, '只读约定'),
          h('p', { className: 'cwMono' }, '工作台只读快照；写操作回原生会话完成。'),
          data?.warning ? h('p', { className: 'cwWarn' }, data.warning) : null));
    }

    function layerOf(skill) {
      return skill.layer ?? '未分层';
    }

    function ProductLeg({ data }) {
      const products = data?.products ?? [];
      const [activeId, setActiveId] = React.useState(null);
      const [open, setOpen] = React.useState({});
      React.useEffect(() => {
        if (products.length === 0) return;
        if (!products.some((product) => product.id === activeId)) setActiveId(products[0].id);
      }, [data]);
      const active = products.find((product) => product.id === activeId) ?? products[0] ?? null;
      const toggle = (name) => setOpen((current) => ({ ...current, [name]: !current[name] }));
      const layers = new Map();
      for (const skill of active?.skills ?? []) {
        const key = layerOf(skill);
        if (!layers.has(key)) layers.set(key, []);
        layers.get(key).push(skill);
      }
      const maxBytes = Math.max(1, ...(active?.skills ?? []).map((skill) => skill.bytes));
      return h('section', { className: 'cwLeg' },
        h('h2', { className: 'cwLegTitle' }, '乾坤鼎', h('small', null, 'PRODUCTS')),
        products.length > 1
          ? h('div', { className: 'cwChips', key: 'chips' }, products.map((product) => h('button', {
              key: product.id, type: 'button', className: 'cwChip', 'data-on': product.id === active?.id ? '1' : '0',
              onClick: () => setActiveId(product.id),
            }, `${product.name} · v${product.version ?? '?'}`)))
          : null,
        !active
          ? h('div', { className: 'cwEmpty' }, '还没有产品快照。', h('br'), h('span', { className: 'cwMono' }, 'zhaohua export --product <product.json>'))
          : h('div', { key: 'card' },
              h('div', { className: 'cwCard' },
                h('h3', null, active.name),
                h('div', { className: 'cwMono', key: 'meta' }, `${active.id} · v${active.version ?? '?'} · ${active.totals.skills} 项 · ${bytes(active.totals.bytes)}`),
                h('div', { className: 'cwMono' }, `根目录 ${active.skills_root ?? '—'} · 来自 ${active.file ?? '—'}`)),
              [...layers.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, skills]) => {
                const sum = skills.reduce((total, skill) => total + skill.bytes, 0);
                const isOpen = Boolean(open[name]);
                return h('div', { className: 'cwLayer', key: name },
                  h('div', { className: 'cwLayerHead', onClick: () => toggle(name) },
                    h('span', { className: 't' }, `${isOpen ? '▾' : '▸'} ${name}`),
                    h('span', { className: 'cwMono' }, `${skills.length} 项 · ${bytes(sum)}`)),
                  isOpen
                    ? h('div', { className: 'cwLayerBody' }, skills.map((skill) => h('div', { className: 'cwSkill', key: skill.id },
                        h('span', { className: 'n' }, skill.id),
                        h('span', { className: 'cwBar' }, h('i', { style: { width: `${Math.max(3, Math.round((skill.bytes / maxBytes) * 100))}%` } })),
                        h('span', { className: 's' }, bytes(skill.bytes)))))
                    : null);
              })));
    }

    function ComboLeg({ data }) {
      const aggregates = new Map();
      for (const product of data?.products ?? []) {
        for (const skill of product.skills ?? []) {
          const key = layerOf(skill);
          const row = aggregates.get(key) ?? { products: new Set(), skills: 0, bytes: 0 };
          row.products.add(product.id);
          row.skills += 1;
          row.bytes += skill.bytes;
          aggregates.set(key, row);
        }
      }
      const rows = [...aggregates.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      return h('section', { className: 'cwLeg' },
        h('h2', { className: 'cwLegTitle' }, '组合', h('small', null, 'COMPOSE')),
        rows.length === 0
          ? h('div', { className: 'cwEmpty' }, '尚未装配', h('br'), h('span', { className: 'cwMono' }, '等第二级产品接入'))
          : h('div', { className: 'cwCard' },
              h('h3', null, '跨产品能力层'),
              h('div', { className: 'cwCombo' },
                h('span', { className: 'h' }, '层'), h('span', { className: 'h' }, '件'), h('span', { className: 'h' }, '体积'),
                rows.flatMap(([name, row]) => [
                  h('span', { key: `${name}-n` }, name),
                  h('span', { key: `${name}-c` }, String(row.skills)),
                  h('span', { key: `${name}-b` }, bytes(row.bytes)),
                ]))));
    }

    function WorkbenchPanel() {
      const { loading, data, error, reload } = useSnapshot();
      const [theme, setTheme] = React.useState(() => {
        try { return localStorage.getItem('cw-theme') ?? 'cauldron'; } catch { return 'cauldron'; }
      });
      const toggle = () => {
        const next = theme === 'rice-paper' ? 'cauldron' : 'rice-paper';
        setTheme(next);
        try { localStorage.setItem('cw-theme', next); } catch {}
      };
      return h('div', { className: 'cwRoot', 'data-theme': theme },
        h('header', { className: 'cwEars' },
          h('div', { className: 'cwBrand' }, h('h1', null, '造化乾坤鼎'), h('span', { className: 'cwSeal' }, '工作台')),
          h('div', { className: 'cwStats' },
            h('span', null, '引擎 ', h('b', null, data?.engine?.version ?? '—')),
            h('span', null, '技能 ', h('b', null, String(data?.totals?.skills ?? 0))),
            h('button', { className: 'cwBtn', type: 'button', onClick: reload, disabled: loading }, loading ? '读取中' : '刷新'),
            h('button', { className: 'cwBtn', type: 'button', onClick: toggle }, theme === 'rice-paper' ? '玄色' : '宣纸'))),
        error ? h('div', { className: 'cwWarn' }, `读取失败：${error}`) : null,
        h('main', { className: 'cwTripod' }, h(EngineLeg, { data }), h(ProductLeg, { data }), h(ComboLeg, { data })),
        h('footer', { className: 'cwFoot' }, h('span', null, '只读快照 · 不写任何文件'), h('span', { className: 'cwMono' }, API)));
    }

    function activate(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.pluginCss = 'cauldron-workbench';
        style.textContent = css;
        document.head.appendChild(style);
        return () => style.remove();
      });
      const Panel = (props) => {
        try {
          return h(WorkbenchPanel, props);
        } catch (error) {
          return h('div', { style: { padding: 16, color: '#c8352b', whiteSpace: 'pre-wrap', fontSize: 12 } },
            `面板渲染失败：${error && error.message ? error.message : String(error)}`);
        }
      };
      ctx.effect(() => ctx.desktopWorkbenches.register({
        title: '造化乾坤鼎',
        repository: 'https://github.com/oaham777-hub/cauldron-qkd-workbench',
        version: '0.1.5',
        author: 'oaham777-hub',
        description: '只读查看造化鼎引擎、乾坤鼎产品与组合的三级生态快照。',
        panelTitle: '造化乾坤鼎',
        audience: '引擎维护者与技能作者',
        requirements: '只读快照；不做业务写入，改动仍回原生会话。',
        initialization: 'empty',
        layout: { businessSide: 'left', businessWidth: 0.62 },
      }, Panel));
    }

    function apply(ctx) {
      return ctx.inject(['desktopWorkbenches'], activate);
    }

    return { apply, inject: [] };
  },
});
