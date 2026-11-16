// 注入融合台 v2 的样式（幂等：含 FUSE_V2_CSS 标记则跳过）
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui\\index.html';
let html = readFileSync(FILE, 'utf8');
const MARK = '/* FUSE_V2_CSS */';
if (html.includes(MARK)) { console.log('样式已在，跳过'); process.exit(0); }

const css = `${MARK}
    /* ---------- 融合台 v2 ---------- */
    .fz-strip{position:relative;margin:0 0 14px;border:1px solid #1d222a;border-radius:14px;overflow:hidden;
      background:radial-gradient(120% 160% at 12% -20%,rgba(216,178,106,.10),transparent 55%),#0f1216;height:104px}
    #fz-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .fz-hud{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:space-between;padding:10px 14px;pointer-events:none}
    .fz-hud-l,.fz-hud-r{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#8b94a3;pointer-events:auto}
    .fz-hud-r{gap:10px}
    .fz-dot{width:7px;height:7px;border-radius:50%;background:#7b4b3a;box-shadow:0 0 0 0 rgba(216,178,106,0)}
    .fz-dot.ok{background:#6fbf94}
    .fz-dot.pulse{animation:fzpulse .42s ease-out}
    @keyframes fzpulse{0%{box-shadow:0 0 0 0 rgba(216,178,106,.55)}100%{box-shadow:0 0 0 12px rgba(216,178,106,0)}}
    .fz-sep{color:#39404b}
    .fz-mini{font-size:11px;color:#8b94a3;border:1px solid #1d222a;border-radius:999px;padding:2px 8px;background:#0c0f13}
    .fz-open{font-size:11px;color:#d8b26a;background:none;border:1px solid #3a3324;border-radius:999px;padding:3px 10px;cursor:pointer}
    .fz-open:hover{background:#191510}

    .fz-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}
    .fz-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid #1d222a;background:#12151a;color:#aab2bf;
      border-radius:9px;padding:5px 9px;font-size:11.5px;cursor:pointer;transition:.12s}
    .fz-chip:hover{border-color:#3a4038;color:#dfe4ec}
    .fz-chip.on{border-color:#6b5326;background:#191408;color:#f0e2c4;box-shadow:0 0 0 1px rgba(216,178,106,.12) inset}
    .fz-chip-n{font-family:ui-monospace,Consolas,monospace}
    .fz-chip-bar{width:34px;height:3px;border-radius:2px;background:#20252d;overflow:hidden}
    .fz-chip-bar i{display:block;height:100%;background:linear-gradient(90deg,#8d6f34,#d8b26a)}
    .fz-chip b{color:#d8b26a;font-weight:600}
    .fz-chip i{color:#5c6472;font-style:normal}

    .fz-grid{display:grid;grid-template-columns:266px minmax(0,1fr) 300px;gap:14px;align-items:start}
    @media (max-width:1180px){.fz-grid{grid-template-columns:1fr}}
    .fz-col{border:1px solid #1d222a;border-radius:14px;background:#12151a;padding:12px}
    .fz-col-h{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px}
    .fz-col-h h4{margin:0;font-size:12.5px;letter-spacing:.04em;color:#cfd6e2;font-weight:600}
    .fz-count{font-size:11px;color:#7d8697}
    .fz-q{width:100%;box-sizing:border-box;background:#0c0f13;border:1px solid #1d222a;border-radius:8px;color:#cfd6e2;
      font-size:12px;padding:7px 9px;margin:0 0 8px;outline:none}
    .fz-q:focus{border-color:#4a3d22}
    .fz-list{max-height:420px;overflow:auto;padding-right:2px}
    .fz-layer{display:flex;justify-content:space-between;font-size:10.5px;color:#6c7684;letter-spacing:.06em;
      padding:7px 2px 3px;border-bottom:1px dashed #1a1f26;margin-bottom:3px}
    .fz-src{display:flex;align-items:center;gap:7px;padding:4px 5px;border-radius:7px;cursor:pointer;font-size:11.5px;color:#a8b0bd}
    .fz-src:hover{background:#171b21}
    .fz-src.on{background:#191408;color:#efe2c6}
    .fz-src input{accent-color:#d8b26a;margin:0}
    .fz-src-n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .fz-src-m{color:#6c7684;font-size:10.5px;white-space:nowrap}
    .fz-src-m em{color:#8d6f34;font-style:normal}

    .fz-add{margin-top:10px;border-top:1px dashed #1a1f26;padding-top:8px}
    .fz-add summary{cursor:pointer;font-size:11.5px;color:#8b94a3}
    .fz-add-body{display:flex;flex-direction:column;gap:6px;margin-top:8px}
    .fz-add-body input{background:#0c0f13;border:1px solid #1d222a;border-radius:7px;color:#cfd6e2;font-size:11.5px;padding:6px 8px;outline:none}
    .fz-row{display:flex;gap:6px}
    .fz-row input{flex:1}
    .fz-up{display:flex;gap:6px;flex-wrap:wrap}
    .fz-fake{font-size:11px;color:#9aa3b1;border:1px dashed #2a3038;border-radius:7px;padding:4px 8px;cursor:pointer}
    .fz-fake:hover{border-color:#4a3d22;color:#d8b26a}
    .fz-scanout{margin-top:8px;font-size:11px;color:#8b94a3}
    .fz-mini-table{width:100%;border-collapse:collapse;margin-top:6px;font-size:10.5px}
    .fz-mini-table th{color:#6c7684;font-weight:500;text-align:left;border-bottom:1px solid #1a1f26;padding:3px 4px}
    .fz-mini-table td{border-bottom:1px solid #151a20;padding:3px 4px;color:#a8b0bd}
    .fz-mini-table td.mono{font-family:ui-monospace,Consolas,monospace;color:#c3cad6}

    .fz-tabs{display:flex;gap:6px;margin:0 0 10px;border-bottom:1px solid #1a1f26;padding-bottom:8px}
    .fz-tabs button{background:none;border:1px solid transparent;color:#8b94a3;font-size:12px;padding:5px 10px;border-radius:8px;cursor:pointer}
    .fz-tabs button:hover{color:#dfe4ec}
    .fz-tabs button.on{color:#f0e2c4;background:#191408;border-color:#3d3421}
    .fz-pane{display:none}
    .fz-pane.on{display:block}
    .fz-note{font-size:11.5px;color:#8b94a3;line-height:1.7;margin:0 0 10px}
    .fz-note b{color:#c9b58a;font-weight:600}
    .fz-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;margin:0 0 10px}
    .fz-form label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:#7d8697}
    .fz-form select,.fz-form input{background:#0c0f13;border:1px solid #1d222a;border-radius:8px;color:#cfd6e2;font-size:12px;padding:7px 8px;outline:none}
    .fz-form select:focus,.fz-form input:focus{border-color:#4a3d22}
    .fz-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
    .fz-pick{font-size:11px;color:#7d8697}
    .fz-outbox{border:1px solid #1a1f26;border-radius:10px;background:#0e1115;padding:10px;font-size:11.5px;color:#a8b0bd;min-height:52px}
    .fz-outbox.tall{min-height:180px;max-height:340px;overflow:auto}
    .fz-kv{display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px dotted #171c23}
    .fz-kv span{color:#6c7684}
    .fz-kv b{color:#cfd6e2;font-weight:500;text-align:right;word-break:break-all}
    .fz-ok{color:#8fd8b0}
    .fz-warn{color:#e2c07a}
    .fz-bad{color:#e08a8a}
    .fz-warn-t{color:#e2c07a!important}
    .fz-ok-t{color:#8fd8b0!important}
    .fz-tip{margin-top:8px;font-size:11px;color:#7d8697;line-height:1.6}
    .fz-load{color:#8b94a3}
    .fz-empty{color:#5f6875;font-size:11.5px;line-height:1.7}
    .fz-hint{color:#5f6875;font-size:11.5px}
    .fz-gapbar{margin:6px 0;font-size:11.5px;color:#a8b0bd}
    .fz-pill{display:inline-block;border:1px solid #1d222a;border-radius:999px;padding:1px 7px;margin-right:5px;font-size:10.5px;color:#8b94a3}
    .fz-gaptable{max-height:380px;overflow:auto;border:1px solid #1a1f26;border-radius:10px}
    .fz-gaptable table{width:100%;border-collapse:collapse;font-size:11px}
    .fz-gaptable th{position:sticky;top:0;background:#12151a;color:#6c7684;font-weight:500;text-align:left;padding:5px 7px;border-bottom:1px solid #1d222a}
    .fz-gaptable td{padding:4px 7px;border-bottom:1px solid #151a20;color:#a8b0bd}
    .fz-gaptable td.mono{font-family:ui-monospace,Consolas,monospace;color:#c3cad6}
    .fz-gaptable td.num{text-align:right;color:#7d8697}
    .fz-gaptable tr.fz-has td{color:#5f6875}
    .fz-gaptable input{accent-color:#d8b26a}
    .fz-bans{margin:6px 0;padding:8px 10px;border:1px solid #3a2a26;border-radius:9px;background:#17100f;color:#d8a0a0;font-size:11px;line-height:1.7}
`;

const at = html.indexOf('</style>');
if (at < 0) throw new Error('找不到 </style>');
html = html.slice(0, at) + css + html.slice(at);
writeFileSync(FILE, html, 'utf8');
console.log('融合台 v2 样式已注入');
