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

    const ENGINE_NODES = [
      { id: 'produce', label: '造技能', desc: '从投喂件产出技能包（produce）' },
      { id: 'generate', label: '生成装配', desc: '按产品定义装配与渲染（generate）' },
      { id: 'audit', label: '规则审计', desc: 'R01–R11 结构与内容审计（audit）' },
      { id: 'verify', label: '产品校验', desc: '产品全量校验（verify）' },
      { id: 'pack', label: '技能包', desc: '打包/安装/升级/回滚（pack）' },
      { id: 'evolve', label: '进化闭环', desc: '候选→复评→晋级或回滚（evolve）' },
      { id: 'eval', label: '条款评估', desc: '条款、金标与成对判读（eval）' },
      { id: 'library', label: '库体检', desc: '重复、冲突、闲置、过薄（library）' },
      { id: 'assemble', label: '联合装配', desc: '多技能按路由联合注入（assemble）' },
    ];

    const BOARD_STARS = ['242,246,255', '226,234,255', '255,250,238', '255,240,214', '255,226,186'];
    const BOARD_GOLD = { line: '232,200,140', flow: '255,242,205', node: '255,231,178' };

    function buildBoardModel(data) {
      const product = data?.products?.[0] ?? null;
      const groups = new Map();
      for (const skill of product?.skills ?? []) {
        const key = skill.layer ?? '未分层';
        const row = groups.get(key) ?? { id: `layer:${key}`, layer: key, skills: [], bytes: 0 };
        row.skills.push(skill);
        row.bytes += skill.bytes ?? 0;
        groups.set(key, row);
      }
      const layers = [...groups.values()].sort((a, b) => a.layer.localeCompare(b.layer));
      return {
        product,
        nodes: [
          { id: 'core', kind: 'core', label: '造化乾坤鼎', sub: product ? `${product.name}` : '未接入产品' },
          { id: 'engine', kind: 'engine', label: '造化鼎', sub: '引擎 · 造技能' },
          { id: 'product', kind: 'product', label: '乾坤鼎', sub: '产品 · 漫剧' },
          ...ENGINE_NODES.map((node) => ({ id: `func:${node.id}`, kind: 'func', label: node.label, sub: node.desc, side: 'engine' })),
          ...layers.map((group) => ({ id: group.id, kind: 'layer', label: group.layer, sub: `${group.skills.length} 件 · ${bytes(group.bytes)}`, side: 'product', skills: group.skills })),
        ],
        layers,
      };
    }

    function BoardCanvas({ model, layer, picked, onPick, onHover, palette }) {
      const canvasRef = React.useRef(null);
      const stateRef = React.useRef({ model, layer, picked, palette });
      stateRef.current = { model, layer, picked, palette };
      React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        let raf = 0;
        let W = 0;
        let H = 0;
        let t = 0;
        let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        const stars = Array.from({ length: 420 }, (_, i) => ({
          x: ((i * 9301) % 1000) / 1000,
          y: ((i * 49297) % 1000) / 1000,
          r: 0.35 + (((i * 37) % 100) / 100) * 1.1,
          tw: 0.4 + (((i * 13) % 100) / 100) * 1.6,
          ph: (((i * 7919) % 1000) / 1000) * Math.PI * 2,
          c: BOARD_STARS[i % BOARD_STARS.length],
        }));
        const dust = Array.from({ length: 90 }, (_, i) => ({
          a: (i / 90) * Math.PI * 2,
          r: 0.42 + (((i * 31) % 100) / 100) * 0.16,
          s: 0.5 + (((i * 17) % 100) / 100) * 1.6,
          sp: 0.05 + (((i * 23) % 100) / 100) * 0.12,
        }));
        const meteors = [];
        const pos = new Map();
        const alpha = new Map();
        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          W = canvas.clientWidth;
          H = canvas.clientHeight;
          canvas.width = Math.round(W * dpr);
          canvas.height = Math.round(H * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        const onMove = (event) => {
          const rect = canvas.getBoundingClientRect();
          mouse.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          mouse.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        };
        const onClick = (event) => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          let best = null;
          let bestD = 1e9;
          const { model: m, layer: activeLayer } = stateRef.current;
          for (const node of m.nodes) {
            const p = pos.get(node.id);
            if (!p) continue;
            const d = Math.hypot(p.x - x, p.y - y);
            if (d < p.r + 10 && d < bestD) { best = node; bestD = d; }
          }
          const active = m.layers.find((g) => g.id === activeLayer);
          if (active) {
            for (let i = 0; i < active.skills.length; i += 1) {
              const p = pos.get(`skill:${i}`);
              if (!p) continue;
              const d = Math.hypot(p.x - x, p.y - y);
              if (d < p.r + 10 && d < bestD) {
                const skill = active.skills[i];
                best = { id: `skill:${i}`, kind: 'skill', label: skill.id ?? skill.name, sub: active.layer, layer: active.layer, side: 'product' };
                bestD = d;
              }
            }
          }
          if (best) onPick(best);
        };
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('click', onClick);
        const targets = () => {
          const { model: m, layer: activeLayer, palette: pal } = stateRef.current;
          const cx = W / 2;
          const cy = H * 0.52;
          const R = Math.min(W, H) * 0.2;
          const out = [];
          out.push({ id: 'core', x: cx, y: cy, r: R * 0.62, text: 'center' });
          out.push({ id: 'engine', x: cx - R * 1.55, y: cy - R * 0.18, r: R * 0.3, side: 'engine' });
          out.push({ id: 'product', x: cx + R * 1.55, y: cy - R * 0.18, r: R * 0.3, side: 'product' });
          const funcs = m.nodes.filter((n) => n.kind === 'func');
          funcs.forEach((node, i) => {
            const spread = 128;
            const angle = 180 - spread / 2 + (funcs.length === 1 ? 0 : (i * spread) / (funcs.length - 1));
            const rad = (angle * Math.PI) / 180;
            out.push({ id: node.id, x: cx + Math.cos(rad) * R * 1.95, y: cy + Math.sin(rad) * R * 1.95, r: R * 0.155, side: 'engine' });
          });
          const layers = m.nodes.filter((n) => n.kind === 'layer');
          layers.forEach((node, i) => {
            const spread = 128;
            const angle = spread / 2 - (layers.length === 1 ? 0 : (i * spread) / (layers.length - 1));
            const rad = (angle * Math.PI) / 180;
            out.push({ id: node.id, x: cx + Math.cos(rad) * R * 1.95, y: cy + Math.sin(rad) * R * 1.95, r: R * 0.165, side: 'product' });
          });
          const active = layers.find((n) => n.id === activeLayer);
          if (active) {
            for (let i = 0; i < active.skills.length; i += 1) {
              const spread = 84;
              const angle = spread / 2 - (active.skills.length === 1 ? 0 : (i * spread) / (active.skills.length - 1));
              const rad = (angle * Math.PI) / 180;
              out.push({ id: `skill:${i}`, x: cx + Math.cos(rad) * R * 2.55, y: cy + Math.sin(rad) * R * 2.55, r: R * 0.1, side: 'product' });
            }
          }
          return out;
        };
        const drawSky = () => {
          const pal = stateRef.current.palette;
          const px = mouse.x * 14;
          const py = mouse.y * 10;
          ctx.fillStyle = '#05060d';
          ctx.fillRect(0, 0, W, H);
          ctx.save();
          ctx.translate(W / 2 + px * 0.4, H * 0.52 + py * 0.4);
          const g1 = ctx.createRadialGradient(-W * 0.22, -H * 0.1, 0, -W * 0.22, -H * 0.1, W * 0.62);
          g1.addColorStop(0, 'rgba(58,86,190,0.42)');
          g1.addColorStop(0.55, 'rgba(70,52,150,0.16)');
          g1.addColorStop(1, 'rgba(10,12,26,0)');
          ctx.fillStyle = g1;
          ctx.fillRect(-W, -H, W * 2, H * 2);
          const g2 = ctx.createRadialGradient(W * 0.28, -H * 0.04, 0, W * 0.28, -H * 0.04, W * 0.5);
          g2.addColorStop(0, 'rgba(38,120,180,0.3)');
          g2.addColorStop(1, 'rgba(20,40,90,0)');
          ctx.fillStyle = g2;
          ctx.fillRect(-W, -H, W * 2, H * 2);
          const g3 = ctx.createRadialGradient(0, H * 0.3, 0, 0, H * 0.3, W * 0.55);
          g3.addColorStop(0, 'rgba(190,146,66,0.22)');
          g3.addColorStop(0.7, 'rgba(150,90,60,0.06)');
          g3.addColorStop(1, 'rgba(10,10,20,0)');
          ctx.fillStyle = g3;
          ctx.fillRect(-W, -H, W * 2, H * 2);
          ctx.restore();
          ctx.save();
          ctx.translate(W / 2 + px * 0.55, H * 0.5 + py * 0.55);
          ctx.rotate(-0.42);
          const band = ctx.createLinearGradient(0, -H * 0.18, 0, H * 0.18);
          band.addColorStop(0, 'rgba(168,188,255,0)');
          band.addColorStop(0.45, 'rgba(200,212,255,0.12)');
          band.addColorStop(0.5, 'rgba(255,240,200,0.16)');
          band.addColorStop(0.55, 'rgba(200,212,255,0.12)');
          band.addColorStop(1, 'rgba(168,188,255,0)');
          ctx.fillStyle = band;
          ctx.fillRect(-W * 0.9, -H * 0.18, W * 1.8, H * 0.36);
          ctx.restore();
          for (const s of stars) {
            const tw = 0.45 + 0.55 * Math.sin(t * s.tw * 0.03 + s.ph);
            ctx.globalAlpha = 0.2 + tw * 0.75;
            ctx.fillStyle = `rgb(${s.c})`;
            ctx.beginPath();
            ctx.arc(s.x * W + px * (0.2 + s.r * 0.15), s.y * H + py * (0.2 + s.r * 0.15), s.r * (0.8 + tw * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          if (Math.random() < 0.004) meteors.push({ x: Math.random() * W * 0.7, y: Math.random() * H * 0.4, vx: 5 + Math.random() * 4, vy: 2.4 + Math.random() * 2, life: 1 });
          for (let i = meteors.length - 1; i >= 0; i -= 1) {
            const m = meteors[i];
            m.x += m.vx;
            m.y += m.vy;
            m.life -= 0.012;
            const tail = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14);
            tail.addColorStop(0, `rgba(255,253,246,${0.85 * m.life})`);
            tail.addColorStop(1, 'rgba(196,214,255,0)');
            ctx.strokeStyle = tail;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14);
            ctx.stroke();
            if (m.life <= 0) meteors.splice(i, 1);
          }
          const palGlow = stateRef.current.palette?.glow ?? '240,196,110';
          const glow = ctx.createRadialGradient(W / 2, H * 0.52, 0, W / 2, H * 0.52, Math.min(W, H) * 0.42);
          glow.addColorStop(0, `rgba(${palGlow},${0.16 + Math.sin(t * 0.02) * 0.04})`);
          glow.addColorStop(0.5, `rgba(${palGlow},0.05)`);
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, W, H);
        };
        const drawLinks = (layout) => {
          const { model: m } = stateRef.current;
          const byId = new Map(layout.map((p) => [p.id, p]));
          const core = byId.get('core');
          const lineFor = (a, b, width, alpha0) => {
            if (!a || !b) return;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2 - Math.min(60, Math.hypot(a.x - b.x, a.y - b.y) * 0.16);
            ctx.strokeStyle = `rgba(${BOARD_GOLD.line},${alpha0})`;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.quadraticCurveTo(mx, my, b.x, b.y);
            ctx.stroke();
          };
          lineFor(core, byId.get('engine'), 1.3, 0.6);
          lineFor(core, byId.get('product'), 1.3, 0.6);
          for (const node of m.nodes) {
            if (node.kind === 'func') lineFor(byId.get('engine'), byId.get(node.id), 0.7, 0.34);
            if (node.kind === 'layer') lineFor(byId.get('product'), byId.get(node.id), 0.7, 0.34);
          }
          const activeLayer = stateRef.current.layer;
          const active = m.nodes.find((n) => n.id === activeLayer);
          if (active) {
            for (let i = 0; i < active.skills.length; i += 1) lineFor(byId.get(active.id), byId.get(`skill:${i}`), 0.6, 0.3);
          }
          for (let i = 0; i < 4; i += 1) {
            const phase = (t * 0.006 + i * 0.25) % 1;
            const from = [core, byId.get('engine'), core, byId.get('product')][i];
            const to = [byId.get('engine'), core, byId.get('product'), core][i];
            if (!from || !to) continue;
            const x = from.x + (to.x - from.x) * phase;
            const y = from.y + (to.y - from.y) * phase - Math.sin(phase * Math.PI) * 14;
            const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
            g.addColorStop(0, `rgba(${BOARD_GOLD.flow},0.95)`);
            g.addColorStop(1, 'rgba(255,242,205,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        };
        const drawCore = (p) => {
          const { palette: pal } = stateRef.current;
          const glowC = pal?.glow ?? '240,196,110';
          const pulse = 1 + Math.sin(t * 0.03) * 0.02;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4 * pulse);
          g.addColorStop(0, 'rgba(255,253,244,0.98)');
          g.addColorStop(0.16, 'rgba(255,231,178,0.75)');
          g.addColorStop(0.38, `rgba(${glowC},0.25)`);
          g.addColorStop(0.7, `rgba(${glowC},0.07)`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.translate(p.x, p.y);
          for (let ring = 0; ring < 2; ring += 1) {
            ctx.save();
            ctx.rotate(t * (ring === 0 ? 0.0012 : -0.0018) + ring);
            ctx.strokeStyle = `rgba(${glowC},${0.32 - ring * 0.12})`;
            ctx.lineWidth = 1 + ring * 0.4;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.r * (1.45 + ring * 0.22), p.r * (0.62 + ring * 0.12), ring === 0 ? 0.34 : -0.28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          for (let i = 0; i < 36; i += 1) {
            const a = (i / 36) * Math.PI * 2 + t * 0.0006;
            const len = p.r * (1.12 + 0.18 * Math.sin(t * 0.02 + i));
            ctx.strokeStyle = `rgba(255,240,200,${0.05 + 0.05 * Math.abs(Math.sin(t * 0.03 + i * 1.7))})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * p.r * 0.9, Math.sin(a) * p.r * 0.9);
            ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
            ctx.stroke();
          }
          ctx.restore();
          for (const d of dust) {
            const a = d.a + t * 0.002 * d.sp;
            const x = p.x + Math.cos(a) * p.r * d.r * 2.1;
            const y = p.y + Math.sin(a) * p.r * d.r * 1.1;
            ctx.fillStyle = `rgba(255,242,205,${0.18 + 0.3 * Math.abs(Math.sin(a * 3 + t * 0.02))})`;
            ctx.beginPath();
            ctx.arc(x, y, d.s * 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#fffdf4';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.34, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '600 15px "Noto Serif SC", "Songti SC", serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(248,230,189,0.95)';
          ctx.shadowColor = 'rgba(255,214,130,0.8)';
          ctx.shadowBlur = 14;
          ctx.fillText('造化乾坤鼎', p.x, p.y + p.r * 1.34);
          ctx.shadowBlur = 0;
          const sub = stateRef.current.model.product?.name;
          if (sub) {
            ctx.font = '10px "Noto Sans SC", sans-serif';
            ctx.fillStyle = 'rgba(248,230,189,0.5)';
            ctx.fillText(sub, p.x, p.y + p.r * 1.34 + 16);
          }
        };
        const drawNode = (p, node) => {
          const isPicked = stateRef.current.picked?.id === node.id;
          const isSide = node.kind === 'engine' || node.kind === 'product';
          const color = node.kind === 'engine' ? '198,182,255' : node.kind === 'product' ? '255,214,150' : node.kind === 'layer' ? '255,231,178' : '236,226,255';
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.2);
          g.addColorStop(0, `rgba(${color},0.55)`);
          g.addColorStop(0.35, `rgba(${color},0.14)`);
          g.addColorStop(1, `rgba(${color},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = isPicked ? '#fff8e8' : `rgba(${color},0.96)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (isPicked ? 1.16 : 1), 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(${BOARD_GOLD.line},${isSide ? 0.75 : 0.45})`;
          ctx.lineWidth = isSide ? 1.4 : 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 1.75, 0, Math.PI * 2);
          ctx.stroke();
          ctx.textAlign = 'center';
          ctx.font = isSide ? '600 13px "Noto Serif SC", serif' : '600 10.5px "Noto Serif SC", serif';
          ctx.fillStyle = 'rgba(245,232,200,0.92)';
          ctx.fillText(node.label, p.x, p.y + p.r * 2.5);
          if (isSide) {
            ctx.font = '9px "Noto Sans SC", sans-serif';
            ctx.fillStyle = 'rgba(245,232,200,0.5)';
            ctx.fillText(node.sub, p.x, p.y + p.r * 2.5 + 13);
          }
        };
        const render = () => {
          t += 1;
          mouse.x += (mouse.tx - mouse.x) * 0.05;
          mouse.y += (mouse.ty - mouse.y) * 0.05;
          drawSky();
          const next = targets();
          const byId = new Map();
          for (const item of next) {
            const prev = pos.get(item.id);
            if (!prev) {
              pos.set(item.id, { ...item, a: 0 });
              alpha.set(item.id, 0);
            }
            const cur = pos.get(item.id);
            cur.x += (item.x - cur.x) * 0.16;
            cur.y += (item.y - cur.y) * 0.16;
            cur.r += (item.r - cur.r) * 0.16;
            byId.set(item.id, cur);
          }
          for (const id of [...pos.keys()]) {
            if (!byId.has(id)) pos.delete(id);
          }
          const layout = next.map((item) => {
            const cur = pos.get(item.id);
            alpha.set(item.id, Math.min(1, (alpha.get(item.id) ?? 0) + 0.05));
            const node = stateRef.current.model.nodes.find((n) => n.id === item.id);
            return { ...cur, node, alpha: alpha.get(item.id) ?? 0 };
          });
          drawLinks(layout);
          const order = { core: 0, engine: 1, product: 1, layer: 2, func: 2, skill: 3 };
          layout.sort((a, b) => (order[a.node?.kind] ?? 9) - (order[b.node?.kind] ?? 9));
          for (const p of layout) {
            if (!p.node) continue;
            ctx.globalAlpha = p.alpha ?? 1;
            if (p.node.kind === 'core') drawCore(p);
            else drawNode(p, p.node);
            ctx.globalAlpha = 1;
          }
          raf = requestAnimationFrame(render);
        };
        raf = requestAnimationFrame(render);
        return () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          canvas.removeEventListener('mousemove', onMove);
          canvas.removeEventListener('click', onClick);
        };
      }, []);
      return h('canvas', { ref: canvasRef, className: 'cwBoardCanvas' });
    }

    function BoardPanel({ data }) {
      const model = React.useMemo(() => buildBoardModel(data), [data]);
      const [layer, setLayer] = React.useState(null);
      const [picked, setPicked] = React.useState(null);
      const [copied, setCopied] = React.useState('');
      const palette = data?.palette ?? null;
      const layerSkills = React.useMemo(() => (layer ? (model.layers.find((g) => g.id === layer)?.skills ?? []) : []), [layer, model]);
      const promptOf = (node) => {
        if (!node) return '';
        if (node.kind === 'func') return `用造化鼎的「${node.label}」：${node.sub}。请按这一能力开工，并给我可复跑的验证结果。`;
        if (node.kind === 'skill') return `用乾坤鼎-漫剧 的「${node.layer ?? ''}」层的技能「${node.label}」开工：先读它的 SKILL.md 与引用，再产出。`;
        const names = layerSkills.map((skill) => skill.id ?? skill.name).slice(0, 6).join('、');
        return `用乾坤鼎-漫剧 的「${node.label}」层开工（本层技能：${names || '（本层为空）'}）。先读本层 SKILL.md 与引用，再给出这一层的产出，不要跳层。`;
      };
      const onPick = (node) => {
        if (node.kind === 'layer') {
          setLayer(node.id);
          setPicked(node);
          return;
        }
        if (node.kind === 'core') {
          setLayer(null);
          setPicked(null);
          return;
        }
        if (node.kind === 'product' || node.kind === 'engine') {
          setPicked(node);
          return;
        }
        setPicked(node);
        if (node.side === 'product' && node.kind === 'skill') {
          setPicked({ ...node, sub: `${node.label} · ${node.sub ?? ''}` });
        }
      };
      const copy = () => {
        const text = promptOf(picked);
        const done = () => {
          setCopied(picked.id);
          setTimeout(() => setCopied(''), 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(() => setCopied(''));
          return;
        }
        try {
          const area = document.createElement('textarea');
          area.value = text;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
          done();
        } catch {
          setCopied('');
        }
      };
      return h('div', { className: 'cwBoardScene' },
        h(BoardCanvas, { model, layer, picked, onPick, palette }),
        h('div', { className: 'cwBoardTitle' }, h('b', null, '造化乾坤鼎'), h('span', null, '左 · 造化鼎能力　右 · 乾坤鼎层级')),
        picked
          ? h('div', { className: 'cwDock' },
              h('div', { className: 'cwDockHead' }, h('b', null, picked.label), h('small', null, picked.sub)),
              h('p', { className: 'cwDockText' }, promptOf(picked)),
              h('div', { className: 'cwDockActs' },
                h('button', { className: 'cwBtn', type: 'button', onClick: copy }, copied === picked.id ? '已复制' : '复制开工提示'),
                h('button', { className: 'cwBtn', type: 'button', onClick: () => { setPicked(null); setLayer(null); } }, '收起')))
          : h('div', { className: 'cwHint' }, '点左侧能力或右侧层级节点；选中后复制开工提示，粘到对话里即可从该层开工。'));
    }


    function NeuralPanel() {
      const [url, setUrl] = React.useState('');
      const [error, setError] = React.useState('');
      const [diag, setDiag] = React.useState('加载中…');
      const frameRef = React.useRef(null);
      React.useEffect(() => {
        let revoked = '';
        let disposed = false;
        const onMessage = (event) => {
          const data = event.data;
          if (data && data.type === 'cw-error') setDiag(`子页面报错：${String(data.msg).slice(0, 160)}`);
        };
        window.addEventListener('message', onMessage);
        (async () => {
          const root = `${API}/fed/neural/index.html`;
          const res = await fetch(root, { credentials: 'include' });
          if (!res.ok) throw new Error(`看板资源 HTTP ${res.status}：${(await res.text()).slice(0, 120)}`);
          const html = await res.text();
          const jsMatch = html.match(/src="([^"]+\.js)"/);
          const cssMatch = html.match(/href="([^"]+\.css)"/);
          const [jsText, cssText] = await Promise.all([
            jsMatch ? fetch(jsMatch[1], { credentials: 'include' }).then((r) => r.text()) : Promise.resolve(''),
            cssMatch ? fetch(cssMatch[1], { credentials: 'include' }).then((r) => r.text()) : Promise.resolve(''),
          ]);
          if (disposed) return;
          let doc = html;
          if (jsMatch) {
            doc = doc.replace(/<script[^>]*src="[^"]*\.js"[^>]*><\/script>/, () => `<script type="module">${jsText.replace(/<\/script/gi, '<\\/script')}</script>`);
          }
          if (cssMatch) {
            doc = doc.replace(/<link[^>]*rel="stylesheet"[^>]*>/, () => `<style>${cssText.replace(/<\/style/gi, '<\\/style')}</style>`);
          }
          doc = doc.replace(/<link[^>]*rel="icon"[^>]*>/, '');
          doc = doc.replace('</head>', `<script>window.addEventListener('error',function(e){parent.postMessage({type:'cw-error',msg:(e.message||'')+' @'+(e.filename||'')},'*')});window.addEventListener('unhandledrejection',function(e){parent.postMessage({type:'cw-error',msg:'promise:'+(e.reason&&e.reason.message||e.reason)},'*')});</script></head>`);
          const blob = new Blob([doc], { type: 'text/html' });
          const blobUrl = URL.createObjectURL(blob);
          revoked = blobUrl;
          setUrl(blobUrl);
          setDiag('资源已内联（js ' + jsText.length + ' / css ' + cssText.length + '），等待子页面加载');
        })().catch((err) => {
          setError(err && err.message ? err.message : String(err));
        });
        return () => {
          disposed = true;
          window.removeEventListener('message', onMessage);
          if (revoked) URL.revokeObjectURL(revoked);
        };
      }, []);
      const onFrameLoad = () => {
        try {
          const doc = frameRef.current && frameRef.current.contentDocument;
          if (!doc) return setDiag('子页面已加载，但父页面拿不到 document');
          const nodes = doc.querySelectorAll('*').length;
          const text = (doc.body && doc.body.innerText ? doc.body.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 60);
          setDiag(`子页面已加载：节点 ${nodes} 个，可见文本「${text}」`);
        } catch (err) {
          setDiag('子页面读取失败：' + (err && err.message ? err.message : String(err)));
        }
      };
      if (error) return h('div', { className: 'cwWarn', style: { padding: 16 } }, `看板加载失败：${error}`);
      if (!url) return h('div', { className: 'cwHint', style: { position: 'static', padding: 24 } }, '星图加载中…');
      return h('div', { className: 'cwNeuralWrap' },
        h('iframe', {
          ref: frameRef,
          className: 'cwNeural',
          title: '星图看板',
          src: url,
          onLoad: onFrameLoad,
          sandbox: 'allow-scripts allow-same-origin allow-popups allow-downloads',
        }),
        h('div', { className: 'cwNeuralDiag' }, diag),
      );
    }

    function WorkbenchPanel() {
      const { loading, data, error, reload } = useSnapshot();
      const [theme, setTheme] = React.useState(() => {
        try { return localStorage.getItem('cw-theme') ?? 'cauldron'; } catch { return 'cauldron'; }
      });
      const [view, setView] = React.useState('board');
      const toggle = () => {
        const next = theme === 'rice-paper' ? 'cauldron' : 'rice-paper';
        setTheme(next);
        try { localStorage.setItem('cw-theme', next); } catch {}
      };
      return h('div', { className: 'cwRoot', 'data-theme': theme },
        h('header', { className: 'cwEars' },
          h('div', { className: 'cwBrand' }, h('h1', null, '造化乾坤鼎'), h('span', { className: 'cwSeal' }, view === 'board' ? '看板' : '工作台')),
          h('div', { className: 'cwStats' },
            h('button', { className: 'cwBtn', type: 'button', onClick: () => setView('snapshot'), 'data-on': view === 'snapshot' ? '1' : '0' }, '快照'),
            h('button', { className: 'cwBtn', type: 'button', onClick: () => setView('board'), 'data-on': view === 'board' ? '1' : '0' }, '创作看板'),
            h('span', null, '引擎 ', h('b', null, data?.engine?.version ?? '—')),
            h('span', null, '技能 ', h('b', null, String(data?.totals?.skills ?? 0))),
            h('button', { className: 'cwBtn', type: 'button', onClick: reload, disabled: loading }, loading ? '读取中' : '刷新'),
            h('button', { className: 'cwBtn', type: 'button', onClick: toggle }, theme === 'rice-paper' ? '玄色' : '宣纸'))),
        error ? h('div', { className: 'cwWarn' }, `读取失败：${error}`) : null,
        view === 'board'
          ? h(NeuralPanel, {})
          : h('main', { className: 'cwTripod' }, h(EngineLeg, { data }), h(ProductLeg, { data }), h(ComboLeg, { data })),
        h('footer', { className: 'cwFoot' }, h('span', null, '只读快照 · 不写任何文件'), h('span', { className: 'cwMono' }, API)));
    }

    const boardCss = `
.cwBoardScene { position: relative; flex: 1 1 auto; min-height: 480px; overflow: hidden; background: #05060d; }
.cwBoardCanvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: crosshair; }
.cwBoardTitle { position: absolute; left: 20px; top: 16px; display: flex; flex-direction: column; gap: 3px; pointer-events: none; }
.cwBoardTitle b { font: 600 16px/1.3 "Noto Serif SC", "Songti SC", serif; letter-spacing: 0.22em; color: #f3dcae; text-shadow: 0 0 18px rgba(240, 190, 96, 0.55); }
.cwBoardTitle span { font-size: 10px; letter-spacing: 0.14em; color: rgba(243, 220, 174, 0.45); }
.cwDock { position: absolute; left: 16px; right: 16px; bottom: 14px; padding: 11px 14px; border-radius: 12px; border: 1px solid rgba(240, 190, 96, 0.32); background: linear-gradient(180deg, rgba(16, 14, 10, 0.86), rgba(8, 7, 5, 0.92)); backdrop-filter: blur(6px); color: #f1dfb8; box-shadow: 0 0 34px rgba(0, 0, 0, 0.5); }
.cwDockHead { display: flex; align-items: baseline; gap: 10px; }
.cwDockHead b { font-size: 13px; letter-spacing: 0.1em; color: #fff3d2; }
.cwDockHead small { font-size: 10px; color: rgba(241, 223, 184, 0.55); }
.cwDockText { margin: 7px 0 9px; font-size: 11px; line-height: 1.7; color: rgba(241, 223, 184, 0.85); }
.cwDockActs { display: flex; gap: 8px; }
.cwNeural { width: 100%; flex: 1 1 auto; min-height: 480px; border: 0; display: block; background: #05060d; }
.cwHint { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); font-size: 10px; color: rgba(241, 223, 184, 0.42); letter-spacing: 0.05em; }
`;

    function activate(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.pluginCss = 'cauldron-workbench';
        style.textContent = css + boardCss;
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
      const register = (definition, component) => {
        try {
          ctx.effect(() => ctx.desktopWorkbenches.register(definition, component));
          return true;
        } catch (error) {
          console.warn('[cauldron-workbench] 工作台注册失败:', definition.title, error);
          return false;
        }
      };
      register({
        title: '造化乾坤鼎',
        repository: 'https://github.com/oaham777-hub/cauldron-qkd-workbench',
        version: '0.3.1',
        author: 'oaham777-hub',
        description: '只读查看造化鼎引擎、乾坤鼎产品与组合的三级生态快照。',
        panelTitle: '造化乾坤鼎',
        audience: '引擎维护者与技能作者',
        requirements: '只读快照；不做业务写入，改动仍回原生会话。',
        initialization: 'empty',
        layout: { businessSide: 'left', businessWidth: 0.62 },
      }, Panel);
    }

    function apply(ctx) {
      return ctx.inject(['desktopWorkbenches'], activate);
    }

    return { apply, inject: [] };
  },
});
