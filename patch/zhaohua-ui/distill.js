// 蒸馏地图：融入度矩阵 + 来源流向 + 版本时间线 + 来料投放（数据全部来自桥 /distill* /sources）
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const B = 'http://127.0.0.1:8791';
  const LAYER_CN = { body: '正文', refs: '资料', caps: '能力' };
  const STATE_CN = { ok: '生效', orphan: '未引用', update: '可更新', branch: '已分叉', local: '本地已改' };
  const STATE_CLS = { ok: 'ok', orphan: 'mute', update: 'warn', branch: 'bad', local: 'warn' };
  let SRC_CACHE = [];
  let curSel = null;
  const DRILL = 'D:\\造化乾坤鼎-工作台\\patch\\sources\\_sim';
  let drillOn = new URLSearchParams(location.search).get('drill') === '1';
  const qs = (extra) => (drillOn ? extra + '&srcRoot=' + encodeURIComponent(DRILL) : extra);

  function heat(ratio) {
    const a = Math.min(0.92, 0.06 + ratio * 0.86);
    return 'background:rgba(216,178,106,' + a.toFixed(2) + ');color:' + (ratio > 0.55 ? '#1a1408' : 'inherit');
  }

  function renderMap(data) {
    const rows = data.skills || [];
    const body = $('dz-rows');
    if (!body) return;
    const count = (st) => rows.reduce((s, r) => s + r.entries.filter(e => e.state === st).length, 0);
    const totalIn = rows.reduce((s, r) => s + r.in, 0);
    const covered = rows.filter(r => r.in > 0).length;

    const kpi = $('dz-kpi');
    if (kpi) {
      const items = [
        ['已蒸馏文件', totalIn, '带来源戳的'],
        ['覆盖技能', covered + ' / ' + rows.length, '有外来件的'],
        ['可更新', count('update'), '来源变了'],
        ['已分叉', count('branch'), '两边都改'],
        ['本地已改', count('local'), '跟源不一样'],
        ['正文未引用', count('orphan'), '放进去没用上']
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
      let badge = '<span class="badge ok">原装</span>';
      if (r.in) {
        const parts = [];
        ['update', 'branch', 'local', 'orphan'].forEach(function (st) {
          const n = r.entries.filter(e => e.state === st).length;
          if (n) parts.push('<span class="badge ' + STATE_CLS[st] + '">' + STATE_CN[st] + ' ' + n + '</span>');
        });
        badge = parts.join(' ') || '<span class="badge ok">已引用</span>';
      }
      return '<tr data-skill="' + r.skill + '"><td><b>' + r.skill + '</b><div class="sub">' + r.total + ' 个文件</div></td>' + cells + '<td>' + badge + '</td></tr>';
    }).join('');

    body.querySelectorAll('tr').forEach(function (tr) {
      tr.addEventListener('click', function () {
        const r = rows.find(x => x.skill === tr.getAttribute('data-skill'));
        if (r) showDetail(r);
      });
    });
  }

  function showDetail(r) {
    const box = $('dz-detail');
    if (!box) return;
    const rows = r.entries.map(function (e) {
      const act = e.state === 'update'
        ? '<button class="dz-mini" data-act="diff" data-path="' + e.path + '">看差异</button><button class="dz-mini dz-strong" data-act="pull" data-path="' + e.path + '">拉新版</button>'
        : e.state === 'branch'
          ? '<button class="dz-mini" data-act="diff" data-path="' + e.path + '">看差异</button><button class="dz-mini dz-warn" data-act="keep" data-path="' + e.path + '">保留本地</button><button class="dz-mini" data-act="pull" data-path="' + e.path + '">强行覆盖</button>'
          : '<button class="dz-mini" data-act="diff" data-path="' + e.path + '">看差异</button>';
      return '<tr><td>' + e.path + '</td><td>' + (LAYER_CN[e.layer] || e.layer) + '</td><td class="mono">' + e.src.replace('qkd:', '') +
        '</td><td><span class="badge ' + (STATE_CLS[e.state] || 'mute') + '">' + (STATE_CN[e.state] || e.state) + '</span></td><td class="mono">' + e.shaNow.slice(0, 10) +
        '</td><td class="dz-act">' + act + '</td></tr>';
    }).join('');
    box.innerHTML = '<h3>' + r.skill + ' · 外来件明细</h3><div class="sub">每个文件头都有一条来源戳：戳在，就说明它从哪来、第几批进来的。可更新=拉新版；已分叉=先看差异，再决定保留本地还是强行覆盖</div>' +
      '<table><thead><tr><th>文件</th><th>层</th><th>来源</th><th>状态</th><th>当前 sha</th><th>处置</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="dz-diff" id="dz-diffbox"></div>' +
      '';
    curSel = r;
    const firstTrouble = r.entries.find(function (e) { return e.state === 'update' || e.state === 'branch'; });
    if (firstTrouble) setTimeout(function () { doDiff(r.skill, firstTrouble.path); }, 80);
    box.querySelectorAll('button[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const act = btn.getAttribute('data-act');
        const path = btn.getAttribute('data-path');
        if (act === 'diff') doDiff(r.skill, path);
        if (act === 'pull') doPull(r.skill, path, btn.textContent.indexOf('强行') >= 0);
        if (act === 'keep') doKeep(r.skill, path);
      });
    });
  }

  function maybeOpen(data) {
    const seg = (location.hash || '').split('&').find(function (x) { return x.indexOf('open=') === 0; });
    if (!seg) return;
    const name = seg.slice(5);
    const r = (data.skills || []).find(function (x) { return x.skill === name; });
    if (r) showDetail(r);
    const dseg = (location.hash || '').split('&').find(function (x) { return x.indexOf('diff=') === 0; });
    if (dseg) {
      const p = decodeURIComponent(dseg.slice(5));
      if (p) setTimeout(function () { doDiff(name, p); }, 120);
    }
  }

  function renderDiff(d) {
    const box = $('dz-diffbox');
    if (!box) return;
    box.style.display = 'block';
    const card = $('dz-diffcard');
    if (card) card.style.display = 'block';
    const head = '来源' + (d.srcChanged ? '已变' : '未变') + ' · 本地' + (d.localChanged ? '已改' : '未改') + ' · +' + d.added + ' / -' + d.removed;
    const lines = (d.diff || []).map(function (l) {
      return '<div class="dz-dl ' + (l.t === '+' ? 'add' : 'del') + '">' + l.t + ' ' + String(l.s).replace(/</g, '&lt;') + '</div>';
    }).join('');
    box.innerHTML = '<div class="sub">' + head + '</div>' + (lines || '<div class="sub">两边内容一样（只有戳不同）</div>');
  }

  function showDiffCard(on) {
    const card = $('dz-diffcard');
    if (card) card.style.display = on ? 'block' : 'none';
  }

  async function doDiff(skill, path) {
    showDiffCard(true);
    const box = $('dz-diffbox');
    if (box) box.innerHTML = '<div class="sub">正在取差异：' + skill + ' / ' + path + '</div>';
    try {
      const r = await fetch(B + '/distill-diff?' + qs('skill=' + encodeURIComponent(skill) + '&to=' + encodeURIComponent(path)));
      renderDiff(await r.json());
    } catch (err) { if (box) box.innerHTML = '<div class="sub">取差异失败：' + err.message + '</div>'; }
  }

  async function doPull(skill, path, force) {
    if (!confirm('拉新版会用来源的当前内容覆盖这一个文件，并记一条新 epoch。继续？')) return;
    const box = $('dz-diffbox');
    if (box) box.innerHTML = '<div class="sub">正在拉取…</div>';
    try {
      const u = B + '/distill-pull?' + qs('skill=' + encodeURIComponent(skill) + '&to=' + encodeURIComponent(path)) + '&confirm=yes' + (force ? '&force=yes' : '');
      const res = await fetch(u);
      const j = await res.json();
      if (j.needsForce) { doDiff(skill, path); return; }
      if (box) box.innerHTML = '<div class="sub">' + (j.ok ? '已拉新版：epoch ' + j.epoch + '，' + j.bytes + ' 字节' : '失败：' + (j.error || '')) + '</div>';
      load();
    } catch (err) { if (box) box.innerHTML = '<div class="sub">拉取失败：' + err.message + '</div>'; }
  }

  async function doKeep(skill, path) {
    if (!confirm('把当前内容登记为“我们的版本”，之后来源再变会重新提示可更新。继续？')) return;
    const box = $('dz-diffbox');
    try {
      const res = await fetch(B + '/distill-keep?' + qs('skill=' + encodeURIComponent(skill) + '&to=' + encodeURIComponent(path)) + '&confirm=yes');
      const j = await res.json();
      if (box) box.innerHTML = '<div class="sub">' + (j.ok ? '已登记为本地版本（sha ' + String(j.landedSha).slice(0, 10) + '）' : '失败：' + (j.error || '')) + '</div>';
      load();
    } catch (err) { if (box) box.innerHTML = '<div class="sub">登记失败：' + err.message + '</div>'; }
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
    const H = Math.max(240, Math.max(srcs.length, skills.length) * 34 + 50);
    svg.setAttribute('viewBox', '0 0 660 ' + H);
    const padT = 28, xL = 8, wBox = 170, xR = 470;
    const posL = new Map(), posR = new Map();
    srcs.forEach((s, i) => posL.set(s, padT + i * ((H - padT * 2) / Math.max(1, srcs.length - 1 || 1))));
    skills.forEach((s, i) => posR.set(s, padT + i * ((H - padT * 2) / Math.max(1, skills.length - 1 || 1))));
    let out = '';
    for (const [k, n] of pairs) {
      const [s, t] = k.split('|');
      const y1 = posL.get(s), y2 = posR.get(t);
      out += '<path d="M' + (xL + wBox) + ' ' + y1 + ' C' + (xL + wBox + 130) + ' ' + y1 + ',' + (xR - 130) + ' ' + y2 + ',' + xR + ' ' + y2 +
        '" fill="none" stroke="rgba(216,178,106,.5)" stroke-width="' + Math.min(9, 1.5 + n * 1.1).toFixed(1) + '"/>';
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
    let m = null, t = null;
    try {
      const res = await Promise.all([
        fetch(B + '/distill' + (drillOn ? '?srcRoot=' + encodeURIComponent(DRILL) : '')).then(r => r.json()),
        fetch(B + '/distill-timeline').then(r => r.json()).catch(() => ({ epochs: [] }))
      ]);
      m = res[0]; t = res[1];
    } catch (e) {
      const box = $('dz-rows');
      if (box) box.innerHTML = '<tr><td colspan="6" class="sub">桥没连上（' + (e && e.message ? e.message : '未知错误') + '）</td></tr>';
      return;
    }
    if (m && m.ok) {
      try { renderMap(m); } catch (e) { console.error('renderMap', e); }
      try { renderSankey(m); } catch (e) { console.error('renderSankey', e); }
      try { maybeOpen(m); } catch (e) { console.error('maybeOpen', e); }
    } else {
      const box = $('dz-rows');
      if (box) box.innerHTML = '<tr><td colspan="6" class="sub">桥返回不可用：' + JSON.stringify(m).slice(0, 200) + '</td></tr>';
    }
    try { renderTimeline(t); } catch (e) { console.error('renderTimeline', e); }
  }

  async function loadSources() {
    const sel = $('dz-src');
    if (!sel) return;
    try {
      const d = await fetch(B + '/sources').then(r => r.json());
      SRC_CACHE = d.sources || [];
      const groups = {};
      for (const s of SRC_CACHE) (groups[s.layer] = groups[s.layer] || []).push(s);
      sel.innerHTML = Object.keys(groups).sort().map(function (L) {
        return '<optgroup label="' + L + '">' + groups[L].map(function (s) {
          return '<option value="' + s.srcId + '">' + (s.stamped ? '✓ ' : '') + s.name + ' · ' + (s.bytes / 1024).toFixed(0) + 'KB</option>';
        }).join('') + '</optgroup>';
      }).join('');
      const info = $('dz-src-info');
      if (info) info.textContent = SRC_CACHE.length + ' 份来料，其中 ' + SRC_CACHE.filter(s => !s.stamped).length + ' 份还没投过';
    } catch (e) {
      sel.innerHTML = '<option>桥没连上</option>';
    }
  }

  async function doPlan() {
    const src = $('dz-src').value, skill = $('dz-skill').value;
    const to = ($('dz-to').value || '').trim() || ('references/' + src.split('/').pop());
    const box = $('dz-secs');
    box.innerHTML = '<div class="sub">拆件中…</div>';
    try {
      const p = await fetch(B + '/distill-plan?src=' + encodeURIComponent(src) + '&skill=' + encodeURIComponent(skill) + '&to=' + encodeURIComponent(to)).then(r => r.json());
      if (!p.ok) { box.innerHTML = '<div class="sub">' + (p.error || '拆件失败') + '</div>'; return; }
      box.innerHTML = '<div class="sub">' + p.sections.length + ' 节 · ' + (p.srcBytes / 1024).toFixed(0) + 'KB · ' +
        (p.collision ? '<b style="color:#e0876a">目标已存在，投放会覆盖</b>' : '目标是新的') + '（不勾=整份投）</div>' +
        '<div class="dz-secs">' + p.sections.map(function (s) {
          return '<label class="dz-sec"><input type="checkbox" value="' + s.n + '"><span>#' + s.n + ' ' + s.title + '</span><em>' + s.lines + ' 行</em></label>';
        }).join('') + '</div>';
    } catch (e) {
      box.innerHTML = '<div class="sub">拆件失败：' + e.message + '</div>';
    }
  }

  async function doLand() {
    const src = $('dz-src').value, skill = $('dz-skill').value;
    const to = ($('dz-to').value || '').trim() || ('references/' + src.split('/').pop());
    const secs = [...document.querySelectorAll('#dz-secs input:checked')].map(x => x.value);
    const out = $('dz-land-out');
    const url = B + '/distill-land?src=' + encodeURIComponent(src) + '&skill=' + encodeURIComponent(skill) +
      '&to=' + encodeURIComponent(to) + '&sections=' + encodeURIComponent(secs.join(',')) +
      '&label=' + encodeURIComponent('投放：' + (src.split('/')[2] || '') + ' → ' + skill);
    try {
      let r = await fetch(url).then(x => x.json());
      if (r.needsConfirm) {
        if (!confirm('确认写盘？\n' + skill + ' / ' + to + (secs.length ? '\n只投 ' + secs.length + ' 节' : '\n整份投'))) return;
        r = await fetch(url + '&confirm=yes').then(x => x.json());
      }
      if (r.ok) {
        out.innerHTML = '<span class="badge ok">epoch ' + r.epoch + ' 已写入</span> <span class="sub">' + r.to + ' · ' + r.bytes + ' B · ' + String(r.landedSha).slice(0, 10) + (r.wired ? ' · 已自动接线 ' + r.wired + ' 条' : '（正文里已有引用，没重接）') + '</span>';
        load(); loadSources();
      } else {
        out.innerHTML = '<span class="badge bad">失败</span> <span class="sub">' + (r.error || JSON.stringify(r).slice(0, 200)) + '</span>';
      }
    } catch (e) {
      out.innerHTML = '<span class="badge bad">失败</span> <span class="sub">' + e.message + '</span>';
    }
  }


  async function doWire() {
    const out = $('dz-land-out');
    const skill = $('dz-skill').value;
    const url = B + '/distill-wire?skill=' + encodeURIComponent(skill);
    try {
      let r = await fetch(url).then(x => x.json());
      if (r.needsConfirm) {
        if (!confirm('把没被正文引用的 references 接进 ' + skill + ' 的 SKILL.md？')) return;
        r = await fetch(url + '&confirm=yes').then(x => x.json());
      }
      if (r.ok) {
        out.innerHTML = '<span class="badge ok">接线完成</span> <span class="sub">共 ' + (r.totalAdded || 0) + ' 条</span>';
        load();
      } else {
        out.innerHTML = '<span class="badge bad">失败</span>';
      }
    } catch (e) {
      out.innerHTML = '<span class="badge bad">失败</span> <span class="sub">' + e.message + '</span>';
    }
  }
  document.addEventListener('click', function (e) {
    if (e.target.id === 'dz-plan') doPlan();
    if (e.target.id === 'dz-land') doLand();
    if (e.target.id === 'dz-reload-src') loadSources();
    if (e.target.id === 'dz-wire') doWire();
  });

  window.ZH_DISTILL_RELOAD = load;
  function boot() {
    const cb = $('dz-drill');
    if (cb) {
      cb.checked = drillOn;
      cb.addEventListener('change', function () { drillOn = cb.checked; load(); });
    }
    load(); loadSources();
  }
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 60);
})();
