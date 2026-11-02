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

    function useBoardCanvas(ref) {
      React.useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        let raf = 0;
        let W = 0;
        let H = 0;
        let t = 0;
        const stars = Array.from({ length: 220 }, (_, i) => ({
          x: ((i * 9301) % 1000) / 1000,
          y: ((i * 49297) % 1000) / 1000,
          r: 0.4 + ((i * 37) % 100) / 130,
          v: 0.06 + ((i * 13) % 100) / 900,
          p: (((i * 7919) % 1000) / 1000) * Math.PI * 2,
        }));
        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          W = canvas.clientWidth;
          H = canvas.clientHeight;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        const cloud = (cx, cy, s, alpha) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(s, s);
          ctx.globalAlpha = alpha;
          const grad = ctx.createLinearGradient(-120, 0, 120, 0);
          grad.addColorStop(0, 'rgba(214, 176, 106, 0)');
          grad.addColorStop(0.5, 'rgba(214, 176, 106, 0.55)');
          grad.addColorStop(1, 'rgba(214, 176, 106, 0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.3;
          for (let i = 0; i < 4; i += 1) {
            ctx.beginPath();
            ctx.arc(0, i * 7, 46 + i * 18, Math.PI * 0.92, Math.PI * 2.08);
            ctx.stroke();
          }
          ctx.restore();
        };
        const draw = () => {
          t += 1;
          ctx.clearRect(0, 0, W, H);
          const bg = ctx.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, Math.max(W, H) * 0.8);
          bg.addColorStop(0, 'rgba(96, 66, 22, 0.5)');
          bg.addColorStop(0.36, 'rgba(34, 26, 15, 0.88)');
          bg.addColorStop(1, '#05070a');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, W, H);
          for (const s of stars) {
            const y = (s.y + t * s.v * 0.0009) % 1;
            const tw = 0.45 + 0.55 * Math.sin(t * 0.02 + s.p);
            ctx.globalAlpha = 0.22 + tw * 0.5;
            ctx.fillStyle = tw > 0.72 ? 'rgba(238, 216, 160, 1)' : 'rgba(190, 205, 220, 0.9)';
            ctx.beginPath();
            ctx.arc(s.x * W, y * H, s.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          cloud(W * 0.18 + Math.sin(t * 0.004) * 10, H * 0.24, 1.1, 0.5);
          cloud(W * 0.82 + Math.cos(t * 0.004) * 10, H * 0.32, 0.9, 0.42);
          cloud(W * 0.32, H * 0.82, 1.3, 0.34);
          cloud(W * 0.7, H * 0.78, 1.0, 0.3);
          const glow = ctx.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, W * 0.22);
          glow.addColorStop(0, `rgba(255, 214, 130, ${0.22 + Math.sin(t * 0.03) * 0.06})`);
          glow.addColorStop(0.45, 'rgba(198, 140, 54, 0.12)');
          glow.addColorStop(1, 'rgba(198, 140, 54, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, W, H);
          raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
        };
      }, []);
    }

    function CauldronMark() {
      return h('svg', { viewBox: '0 0 240 220', className: 'cwCauldronSvg', role: 'img', 'aria-label': '造化乾坤鼎' },
        h('defs', null,
          h('linearGradient', { id: 'cwBronze', x1: '0', y1: '0', x2: '0', y2: '1' },
            h('stop', { offset: '0%', stopColor: '#e8c98a' }),
            h('stop', { offset: '55%', stopColor: '#b3893f' }),
            h('stop', { offset: '100%', stopColor: '#6b4c1c' })),
          h('radialGradient', { id: 'cwFire', cx: '50%', cy: '50%', r: '50%' },
            h('stop', { offset: '0%', stopColor: '#ffe9b0', stopOpacity: '0.9' }),
            h('stop', { offset: '70%', stopColor: '#e0922f', stopOpacity: '0.22' }),
            h('stop', { offset: '100%', stopColor: '#e0922f', stopOpacity: '0' }))),
        h('ellipse', { cx: '120', cy: '112', rx: '104', ry: '96', fill: 'url(#cwFire)' }),
        h('path', { d: 'M60 96 h120 l-10 44 a50 44 0 0 1 -100 0 z', fill: 'url(#cwBronze)', stroke: '#f3dcae', strokeWidth: '1.4' }),
        h('path', { d: 'M56 96 h128', stroke: '#f3dcae', strokeWidth: '3', strokeLinecap: 'round' }),
        h('path', { d: 'M74 96 c0 -14 22 -22 46 -22 s46 8 46 22', fill: 'none', stroke: '#f3dcae', strokeWidth: '2' }),
        h('path', { d: 'M60 60 h120', stroke: '#f3dcae', strokeWidth: '2.4', strokeLinecap: 'round' }),
        h('path', { d: 'M78 46 v14 M162 46 v14', stroke: '#f3dcae', strokeWidth: '2.4', strokeLinecap: 'round' }),
        h('path', { d: 'M34 96 c-8 8 -8 20 2 26 M206 96 c8 8 8 20 -2 26', fill: 'none', stroke: '#e8c98a', strokeWidth: '3', strokeLinecap: 'round' }),
        h('path', { d: 'M92 142 l-6 30 M148 142 l6 30 M84 176 h72', stroke: '#e8c98a', strokeWidth: '4', strokeLinecap: 'round' }),
        h('path', { d: 'M104 110 h32 M112 124 h16', stroke: 'rgba(255, 240, 200, 0.6)', strokeWidth: '1.2' }));
    }

    function BoardPanel({ data }) {
      const canvasRef = React.useRef(null);
      useBoardCanvas(canvasRef);
      const [focus, setFocus] = React.useState('product');
      const [layer, setLayer] = React.useState(null);
      const [picked, setPicked] = React.useState(null);
      const [copied, setCopied] = React.useState('');
      const product = data?.products?.[0] ?? null;
      const groups = React.useMemo(() => {
        const map = new Map();
        for (const skill of product?.skills ?? []) {
          const key = skill.layer ?? '未分层';
          const row = map.get(key) ?? { layer: key, skills: [], bytes: 0 };
          row.skills.push(skill);
          row.bytes += skill.bytes ?? 0;
          map.set(key, row);
        }
        return [...map.values()].sort((a, b) => a.layer.localeCompare(b.layer));
      }, [data]);
      const branches = focus === 'engine'
        ? ENGINE_NODES.map((node) => ({ id: node.id, label: node.label, sub: node.desc, kind: 'engine' }))
        : groups.map((group) => ({ id: group.layer, label: group.layer, sub: `${group.skills.length} 件 · ${bytes(group.bytes)}`, kind: 'layer' }));
      const layerSkills = focus === 'product' && layer ? (groups.find((g) => g.layer === layer)?.skills ?? []) : [];
      const promptOf = (node) => {
        if (node.kind === 'engine') return `用造化鼎的「${node.label}」：${node.sub}。请按这一能力开工，并给我可复跑的验证结果。`;
        const names = layerSkills.map((skill) => skill.id ?? skill.name).slice(0, 6).join('、');
        return `用乾坤鼎-漫剧 的「${node.label}」层开工（本层技能：${names || '（本层为空）'}）。先读本层 SKILL.md 与引用，再给出这一层的产出，不要跳层。`;
      };
      const copy = (node) => {
        const text = promptOf(node);
        const done = () => {
          setCopied(node.id);
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
      const branchStyle = (index, total) => {
        const spread = Math.min(150, total * 17);
        const angle = -spread / 2 + (total === 1 ? 0 : (index * spread) / (total - 1));
        const rad = (angle * Math.PI) / 180;
        const left = focus === 'engine' ? 0.5 - Math.sin(rad) * 0.33 : 0.5 + Math.sin(rad) * 0.33;
        const top = 0.52 - Math.cos(rad) * 0.3;
        return { left: `${left * 100}%`, top: `${top * 100}%` };
      };
      return h('div', { className: 'cwBoardScene' },
        h('canvas', { ref: canvasRef, className: 'cwBoardCanvas' }),
        h('div', {
          className: 'cwOrb cwOrbEngine',
          role: 'button',
          tabIndex: 0,
          onClick: () => { setFocus('engine'); setLayer(null); setPicked(null); },
        }, h('span', { className: 'cwOrbName' }, '造化鼎'), h('span', { className: 'cwOrbSub' }, '引擎 · 造技能')),
        h('div', {
          className: 'cwOrb cwOrbProduct',
          role: 'button',
          tabIndex: 0,
          onClick: () => { setFocus('product'); setLayer(null); setPicked(null); },
        }, h('span', { className: 'cwOrbName' }, '乾坤鼎'), h('span', { className: 'cwOrbSub' }, '产品 · 漫剧')),
        h('div', { className: 'cwCore' },
          h(CauldronMark),
          h('div', { className: 'cwCoreName' }, '造化乾坤鼎'),
          h('div', { className: 'cwCoreSub' }, product ? `${product.name} · ${data?.totals?.skills ?? 0} 技能` : '等待产品接入')),
        branches.map((node, index) => h('button', {
          key: node.id,
          type: 'button',
          className: `cwBranch${picked && picked.id === node.id ? ' is-on' : ''}`,
          style: branchStyle(index, branches.length),
          onClick: () => {
            setPicked(node);
            if (node.kind === 'layer') setLayer(node.id);
          },
        }, h('b', null, node.label), h('small', null, node.sub))),
        layerSkills.length > 0
          ? h('div', { className: 'cwLeafs' }, layerSkills.map((skill) => h('button', {
              key: skill.id ?? skill.name,
              type: 'button',
              className: 'cwLeaf',
              onClick: () => setPicked({ id: skill.id ?? skill.name, label: skill.id ?? skill.name, sub: `${skill.layer ?? ''} · ${bytes(skill.bytes ?? 0)}`, kind: 'leaf' }),
            }, skill.id ?? skill.name)))
          : null,
        picked
          ? h('div', { className: 'cwDock' },
              h('div', { className: 'cwDockHead' }, h('b', null, picked.label), h('small', null, picked.sub)),
              h('p', { className: 'cwDockText' }, promptOf(picked)),
              h('div', { className: 'cwDockActs' },
                h('button', { className: 'cwBtn', type: 'button', onClick: () => copy(picked) }, copied === picked.id ? '已复制' : '复制开工提示'),
                h('button', { className: 'cwBtn', type: 'button', onClick: () => setPicked(null) }, '收起')))
          : h('div', { className: 'cwHint' }, '点造化鼎看能力，点乾坤鼎看层级；选中后复制开工提示，粘到左侧对话即可开工。'));
    }

    function WorkbenchPanel() {
      const { loading, data, error, reload } = useSnapshot();
      const [theme, setTheme] = React.useState(() => {
        try { return localStorage.getItem('cw-theme') ?? 'cauldron'; } catch { return 'cauldron'; }
      });
      const [view, setView] = React.useState('snapshot');
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
          ? h(BoardPanel, { data })
          : h('main', { className: 'cwTripod' }, h(EngineLeg, { data }), h(ProductLeg, { data }), h(ComboLeg, { data })),
        h('footer', { className: 'cwFoot' }, h('span', null, '只读快照 · 不写任何文件'), h('span', { className: 'cwMono' }, API)));
    }

    const boardCss = `
.cwBoardScene { position: relative; flex: 1 1 auto; min-height: 420px; overflow: hidden; background: #05070a; }
.cwBoardCanvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.cwCore { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); width: 236px; text-align: center; pointer-events: none; filter: drop-shadow(0 0 26px rgba(240, 190, 96, 0.35)); }
.cwCauldronSvg { width: 100%; height: auto; animation: cw-breathe 5.5s ease-in-out infinite; }
.cwCoreName { margin-top: -8px; font: 600 17px/1.4 "Noto Serif SC", "Songti SC", serif; letter-spacing: 0.18em; color: #f3dcae; text-shadow: 0 0 12px rgba(240, 190, 96, 0.5); }
.cwCoreSub { margin-top: 2px; font-size: 11px; color: rgba(243, 220, 174, 0.62); }
.cwOrb { position: absolute; top: 26%; width: 96px; height: 96px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border: 1px solid rgba(240, 190, 96, 0.55); background: radial-gradient(circle at 40% 35%, rgba(255, 226, 160, 0.28), rgba(60, 40, 14, 0.72) 65%); box-shadow: 0 0 28px rgba(240, 190, 96, 0.28), inset 0 0 18px rgba(255, 226, 160, 0.18); transition: transform 0.25s ease, box-shadow 0.25s ease; }
.cwOrb:hover { transform: scale(1.06); box-shadow: 0 0 40px rgba(240, 190, 96, 0.5), inset 0 0 22px rgba(255, 226, 160, 0.3); }
.cwOrbEngine { left: 8%; }
.cwOrbProduct { right: 8%; }
.cwOrbName { font: 600 15px/1.3 "Noto Serif SC", "Songti SC", serif; letter-spacing: 0.12em; color: #f8e6bd; }
.cwOrbSub { font-size: 10px; color: rgba(248, 230, 189, 0.6); }
.cwBranch { position: absolute; transform: translate(-50%, -50%); max-width: 190px; padding: 7px 11px; border-radius: 10px; border: 1px solid rgba(240, 190, 96, 0.32); background: linear-gradient(180deg, rgba(28, 22, 12, 0.9), rgba(14, 12, 9, 0.92)); color: #f1dfb8; text-align: left; cursor: pointer; backdrop-filter: blur(3px); transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.cwBranch b { display: block; font-size: 12px; letter-spacing: 0.06em; }
.cwBranch small { display: block; margin-top: 3px; font-size: 9px; color: rgba(241, 223, 184, 0.55); }
.cwBranch:hover, .cwBranch.is-on { border-color: rgba(255, 214, 130, 0.85); box-shadow: 0 0 20px rgba(240, 190, 96, 0.35); }
.cwLeafs { position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 78%; }
.cwLeaf { padding: 5px 9px; border-radius: 999px; border: 1px solid rgba(240, 190, 96, 0.3); background: rgba(20, 16, 10, 0.8); color: #e9d6ae; font-size: 10px; cursor: pointer; }
.cwLeaf:hover { border-color: rgba(255, 214, 130, 0.8); }
.cwDock { position: absolute; left: 16px; right: 16px; bottom: 14px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(240, 190, 96, 0.35); background: rgba(10, 9, 6, 0.88); backdrop-filter: blur(4px); color: #f1dfb8; }
.cwDockHead { display: flex; align-items: baseline; gap: 10px; }
.cwDockHead b { font-size: 13px; letter-spacing: 0.08em; }
.cwDockHead small { font-size: 10px; color: rgba(241, 223, 184, 0.55); }
.cwDockText { margin: 6px 0 8px; font-size: 11px; line-height: 1.6; color: rgba(241, 223, 184, 0.85); }
.cwDockActs { display: flex; gap: 8px; }
.cwHint { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); font-size: 10px; color: rgba(241, 223, 184, 0.45); letter-spacing: 0.04em; }
@keyframes cw-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
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
        version: '0.3.0',
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
