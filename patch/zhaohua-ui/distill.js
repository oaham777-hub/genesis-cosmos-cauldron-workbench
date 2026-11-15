// 蒸馏地图：融入度矩阵 + 来源流向 + 版本时间线（数据全部来自桥 /distill*）
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const B = 'http://127.0.0.1:8791';
  const LAYER_CN = { body: '正文', refs: '资料', caps: '能力' };

  function heat(ratio) {
    const a = Math.min(0.92, 0.06 + ratio * 0.86);
    return 'background:rgba(216,178,106,' + a.toFixed(2) + ');color:' + (ratio > 0.55 ? '#1a1408' : 'inherit');
  }

  function renderMap(data) {
    const rows = data.skills || [];
    const body = $('dz-rows');
    if (!body) return;
    const totalIn = rows.reduce((s, r) => s + r.in, 0);
    const upd = rows.reduce((s, r) => s + r.entries.filter(e => e.state === 'update').length, 0);
    const br = rows.reduce((s, r) => s + r.entries.filter(e => e.state === 'branch').length, 0);
    const orph = rows.reduce((s, r) => s + r.entries.filter(e => e.state === 'orphan').length, 0);
    const covered = rows.filter(r => r.in > 0).length;

    const kpi = $('dz-kpi');
    if (kpi) {
      const items = [
        ['已蒸馏文件', totalIn, '带来源戳的'],
        ['覆盖技能', covered + ' / ' + rows.length, '有外来件的'],
        ['可更新', upd, '来源变了'],
        ['已分叉', br, '我们改过'],
        ['正文未引用', orph, '放进去没用上']
      ];
      kpi.innerHTML = items.map(function (it) {
        return '<div class="kpi"><b>' + it[1] + '</b><span>' + it[0] + '</span><em>' + it[2] + '</em></div>';
      }).join('');
    }

    body.innerHTML = rows.map(function (r) {
      const cells = ['body', 'refs', 'caps'].map(function (L) {
        const g = r.layers[L];
        const ratio = g.total ? g.in / g.total : 0;
        const txt = g.total ? (g.in + ' / ' + g.total) : '—';
        return '<td class="dz-cell" style="' + (g.in ? heat(ratio) : '') + '">' + txt + '</td>';
      }).join('');
      const states = r.entries.map(e => e.state);
      let badge = '<span class="badge ok">原装</span>';
      if (r.in) {
        const parts = [];
        if (states.includes('update')) parts.push('<span class="badge warn">可更新 ' + states.filter(s => s === 'update').length + '</span>');
        if (states.includes('branch')) parts.push('<span class="badge bad">已分叉 ' + states.filter(s => s === 'branch').length + '</span>');
        if (states.includes('orphan')) parts.push('<span class="badge mute">未引用 ' + states.filter(s => s === 'orphan').length + '</span>');
        badge = parts.join(' ') || '<span class="badge ok">已引用</span>';
      }
      return '<tr data-skill="' + r.skill + '"><td><b>' + r.skill + '</b><div class="sub">' + r.total + ' 个文件</div></td>' + cells + '<td>' + badge + '</td></tr>';
    }).join('');

    body.querySelectorAll('tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        const s = tr.getAttribute('data-skill');
        const r = rows.find(x => x.skill === s);
        if (!r) return;
        showDetail(r);
      });
    });
  }

  function showDetail(r) {
    const box = $('dz-detail');
    if (!box) return;
    const rows = r.entries.map(function (e) {
      const cls = e.state === 'ok' ? 'ok' : e.state === 'orphan' ? 'mute' : e.state === 'branch' ? 'bad' : 'warn';
      const label = e.state === 'ok' ? '生效' : e.state === 'orphan' ? '未引用' : e.state === 'branch' ? '已分叉' : '可更新';
      return '<tr><td>' + e.path + '</td><td>' + (LAYER_CN[e.layer] || e.layer) + '</td><td class="mono">' + e.src.replace('qkd:', '') + '</td><td><span class="badge ' + cls + '">' + label + '</span></td><td class="mono">' + e.shaNow.slice(0, 10) + '</td></tr>';
    }).join('');
    box.innerHTML = '<h3>' + r.skill + ' · 外来件明细</h3><div class="sub">每个文件头都有一条来源戳，戳在就说明它从哪来、什么时候进来的</div>' +
      '<table><thead><tr><th>文件</th><th>层</th><th>来源</th><th>状态</th><th>当前 sha</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderSankey(data) {
    const svg = $('dz-sankey');
    if (!svg) return;
    const pairs = new Map();
    for (const r of data.skills || []) {
      for (const e of r.entries) {
        const src = e.src.replace('qkd:skills/', '').split('/')[0];
        const k = src + '|' + r.skill;
        pairs.set(k, (pairs.get(k) || 0) + 1);
      }
    }
    const srcs = [...new Set([...pairs.keys()].map(k => k.split('|')[0]))].sort();
    const skills = [...new Set([...pairs.keys()].map(k => k.split('|')[1]))].sort();
    const H = Math.max(220, Math.max(srcs.length, skills.length) * 30 + 40);
    svg.setAttribute('viewBox', '0 0 640 ' + H);
    const padT = 24, xL = 8, xR = 452, wBox = 180;
    const posL = new Map(), posR = new Map();
    srcs.forEach((s, i) => posL.set(s, padT + i * ((H - padT * 2) / Math.max(1, srcs.length - 1 || 1))));
    skills.forEach((s, i) => posR.set(s, padT + i * ((H - padT * 2) / Math.max(1, skills.length - 1 || 1))));
    let out = '';
    for (const [k, n] of pairs) {
      const [s, t] = k.split('|');
      const y1 = posL.get(s), y2 = posR.get(t);
      out += '<path d="M' + (xL + wBox) + ' ' + y1 + ' C' + (xL + wBox + 120) + ' ' + y1 + ',' + (xR - 120) + ' ' + y2 + ',' + xR + ' ' + y2 + '" fill="none" stroke="rgba(216,178,106,.45)" stroke-width="' + Math.min(9, 1.5 + n * 1.1).toFixed(1) + '"/>';
    }
    for (const [s, y] of posL) out += '<text x="' + xL + '" y="' + (y + 3) + '" class="dzL">' + s + '</text>';
    for (const [s, y] of posR) out += '<text x="' + xR + '" y="' + (y + 3) + '" class="dzR">' + s + '</text>';
    svg.innerHTML = out;
  }

  function renderTimeline(t) {
    const box = $('dz-line');
    if (!box) return;
    const eps = (t.epochs || []).slice().reverse();
    if (!eps.length) { box.innerHTML = '<div class="sub">还没有融合记录</div>'; return; }
    box.innerHTML = eps.map(function (e) {
      const chips = Object.entries(e.skills || {}).map(([k, v]) => '<span class="badge ok">' + k + ' +' + v + '</span>').join(' ');
      return '<div class="dz-ep"><div class="dz-ep-h"><b>epoch ' + e.epoch + '</b><span>' + (e.label || '') + '</span></div>' +
        '<div class="sub">' + e.files + ' 个文件' + (e.ts ? ' · ' + new Date(e.ts).toLocaleString('zh-CN') : '') + '</div>' +
        '<div>' + chips + '</div></div>';
    }).join('');
  }

  async function load() {
    try {
      const [m, t] = await Promise.all([
        fetch(B + '/distill').then(r => r.json()),
        fetch(B + '/distill-timeline').then(r => r.json()).catch(() => ({ epochs: [] }))
      ]);
      if (m && m.ok) { renderMap(m); renderSankey(m); }
      renderTimeline(t);
    } catch (e) {
      const box = $('dz-rows');
      if (box) box.innerHTML = '<tr><td colspan="5" class="sub">桥没连上，看不到真数据</td></tr>';
    }
  }

  window.ZH_DISTILL_RELOAD = load;
  document.addEventListener('DOMContentLoaded', load);
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(load, 60);
})();
