/* 评估对比页：读最近一份真实证据（zhaohua-eval/v1），不再放示意数字 */
(function () {
  'use strict';

  const B = 'http://127.0.0.1:8791';
  const $ = (id) => document.getElementById(id);
  let CACHE = null;

  const fmt = (n) => (n === null || n === undefined ? '–' : String(n));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  async function load(force) {
    if (CACHE && !force) { render(CACHE); return; }
    const meta = $('ev-meta');
    if (meta) meta.textContent = '正在读取最近一份证据…';
    try {
      const runs = await fetch(B + '/eval-runs').then((r) => r.json());
      if (!runs.ok || !runs.runs || !runs.runs.length) {
        if (meta) meta.textContent = '还没有证据文件。先在上面「跑一次两臂评估」里真跑一次，这里就有数了。';
        const t = $('ev-asserts'); if (t) t.innerHTML = '<tr><td colspan="3" class="sub">没有证据</td></tr>';
        return;
      }
      const file = runs.runs[0].file;
      const d = await fetch(B + '/eval-run?file=' + encodeURIComponent(file)).then((r) => r.json());
      if (!d.ok) { if (meta) meta.textContent = '读取失败：' + (d.error || ''); return; }
      CACHE = { file, runs: runs.runs, ev: d.evidence };
      render(CACHE);
    } catch (e) {
      if (meta) meta.textContent = '桥没连上：' + e.message;
    }
  }

  function render(c) {
    const ev = c.ev || {};
    const sum = ev.summary || {};
    const arms = Object.keys(sum);
    const a = arms[0], b = arms[1];
    const sa = sum[a] || {}, sb = sum[b] || {};
    const meta = $('ev-meta');
    if (meta) {
      const ts = (c.file.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/) || [])[1] || '';
      meta.textContent = '证据 ' + c.file + (ts ? ' · ' + ts.replace('T', ' ') : '') + ' · 模型 ' + (ev.model || '?') +
        ' · 任务 ' + ((ev.config || {}).tasks || []).length + ' 条 · 断言 ' + (ev.assertions || []).length + ' 条 · 共 ' + c.runs.length + ' 份，只显示最新一份';
    }

    const box = $('ev-arms');
    if (box && a && b) {
      box.innerHTML =
        '<div class="arm a"><div class="t">A 臂 · ' + esc(a) + '</div><div class="v">' + fmt(sa.hit) + ' / ' + fmt(sa.total) + '</div>' +
        '<div class="d">命中 ' + pct(sa.hit, sa.total) + '% · 截断 ' + fmt(sa.truncated) + ' 次 · ' + fmt(sa.chars) + ' 字</div></div>' +
        '<div class="arm b"><div class="t">B 臂 · ' + esc(b) + '</div><div class="v" style="color:var(--gold)">' + fmt(sb.hit) + ' / ' + fmt(sb.total) + '</div>' +
        '<div class="d">命中 ' + pct(sb.hit, sb.total) + '% · 截断 ' + fmt(sb.truncated) + ' 次 · ' + fmt(sb.chars) + ' 字</div></div>';
    }

    const tk = ev.tokens || {};
    const chart = $('ev-chart');
    if (chart) {
      const rateA = pct(sa.hit, sa.total), rateB = pct(sb.hit, sb.total);
      const trA = sa.runs ? Math.round((sa.truncated / sa.runs) * 100) : 0;
      const trB = sb.runs ? Math.round((sb.truncated / sb.runs) * 100) : 0;
      const col = (label, x, y) =>
        '<div class="col"><div class="bar2"><i style="height:' + Math.max(2, x) + '%;background:#3a4353"></i>' +
        '<i style="height:' + Math.max(2, y) + '%;background:linear-gradient(180deg,var(--gold),var(--gold-dim))"></i></div><b>' + label + '</b></div>';
      chart.innerHTML = col('命中率', rateA, rateB) + col('截断率', trA, trB);
    }

    const note = $('ev-note');
    if (note) {
      note.innerHTML = '本次用量：输入 ' + fmt(tk.input) + ' / 输出 ' + fmt(tk.output) + ' tokens' +
        (tk.input ? '（约 ' + (tk.input / 1000).toFixed(1) + 'k + ' + (tk.output / 1000).toFixed(1) + 'k）' : '') +
        '。证据在 <code>patch\\eval\\runs\\' + esc(c.file) + '</code>。';
    }

    const thA = $('ev-th-a'), thB = $('ev-th-b');
    if (thA) thA.textContent = a || 'A';
    if (thB) thB.textContent = b || 'B';

    const asserts = ev.assertions || [];
    const rows = ev.rows || [];
    const tasks = ((ev.config || {}).tasks || []).map((t) => t.id);
    const hits = {};
    for (const r of rows) hits[r.task + '|' + r.arm] = new Set(r.hits || []);

    const tb = $('ev-asserts');
    if (tb) {
      const out = [];
      for (const t of tasks) {
        const ha = hits[t + '|' + a] || new Set(), hb = hits[t + '|' + b] || new Set();
        const order = asserts.filter((x) => ha.has(x) || hb.has(x)).concat(asserts.filter((x) => !ha.has(x) && !hb.has(x)));
        let win = 0, lose = 0;
        for (const x of asserts) {
          const p = ha.has(x), q = hb.has(x);
          if (q && !p) win++; else if (p && !q) lose++;
        }
        out.push('<tr><td colspan="3" style="padding-top:14px"><b>' + esc(t) + '</b> <span class="tag ' +
          (win > lose ? 't-ok' : (win < lose ? 't-bad' : 't-warn')) + '">B ' + (win > lose ? '+' + (win - lose) : (win === lose ? '持平' : (win - lose))) + '</span></td></tr>');
        for (const x of order) {
          const p = ha.has(x), q = hb.has(x);
          out.push('<tr><td style="padding-left:18px">' + esc(x) + '</td>' +
            '<td style="text-align:center">' + (p ? '<span class="tag t-ok">✓</span>' : '<span class="sub">–</span>') + '</td>' +
            '<td style="text-align:center">' + (q ? '<span class="tag t-ok">✓</span>' : '<span class="sub">–</span>') + '</td></tr>');
        }
      }
      const sub = $('ev-assert-sub');
      if (sub) {
        let win = 0, lose = 0;
        for (const t of tasks) {
          const ha = hits[t + '|' + a] || new Set(), hb = hits[t + '|' + b] || new Set();
          for (const x of asserts) { const p = ha.has(x), q = hb.has(x); if (q && !p) win++; else if (p && !q) lose++; }
        }
        sub.textContent = '按「任务 × 断言」比对两臂 · 逐条 B 胜 ' + win + ' · B 落后 ' + lose + ' · 断言 ' + asserts.length + ' 条';
      }
      tb.innerHTML = out.join('') || '<tr><td colspan="3" class="sub">这份证据没有 rows</td></tr>';
    }
  }

  /* ---------- 一键跑：预设配置按钮组 ---------- */
  function mk(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }

  function cardShell() {
    const host = $('ev-quick');
    if (host) return host;
    const view = $('v-eval');
    if (!view) return null;
    const c = mk('div', 'card');
    const h = mk('h3', null, '一键跑（按配置）');
    c.appendChild(h);
    c.appendChild(mk('div', 'sub', '点一个就跑：真调模型、按 token 计费。跑完自动刷新下方证据。'));
    const row = mk('div', 'ev-quick');
    row.id = 'ev-quick';
    c.appendChild(row);
    const out = mk('div', 'ev-runout');
    out.id = 'ev-runout';
    c.appendChild(out);
    const anchor = $('zh-eval-card');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(c, anchor); else view.appendChild(c);
    return row;
  }

  let RUNNING = false;

  async function quickInit() {
    const row = cardShell();
    if (!row) return;
    row.innerHTML = '<div class="sub">正在读 patch\\eval 下的配置…</div>';
    let cfgList = [];
    try {
      const r = await fetch(B + '/eval-configs').then((x) => x.json());
      cfgList = (r.configs || []).map((x) => x.name);
    } catch (e) {
      row.innerHTML = '<div class="sub">桥没连上：' + esc(e.message) + '</div>';
      return;
    }
    if (!cfgList.length) { row.innerHTML = '<div class="sub">patch\\eval 下没有 .json 配置</div>'; return; }
    const infos = [];
    for (const name of cfgList) {
      try {
        const d = await fetch(B + '/eval-config?name=' + encodeURIComponent(name)).then((x) => x.json());
        if (d && d.ok) infos.push(d);
      } catch (e) { /* 单个读不到就跳过 */ }
    }
    row.innerHTML = '';
    infos.forEach((info) => {
      const b = mk('button', 'btn qk');
      b.dataset.cfg = info.name;
      b.appendChild(mk('span', 'qk-n', info.name));
      b.appendChild(mk('span', 'qk-m', info.tasks.length + ' 任务 × ' + info.arms.length + ' 臂 · ' + info.assertions + ' 断言'));
      b.addEventListener('click', () => runQuick(info));
      row.appendChild(b);
    });
    if (!infos.length) row.innerHTML = '<div class="sub">配置都读不出来（看 /eval-config 是否正常）</div>';
    const pick = new URLSearchParams(location.search).get('pick');
    if (pick) { const b = row.querySelector('button[data-cfg="' + pick + '"]'); if (b) setTimeout(function () { b.click(); }, 400); }
  }

  async function runQuick(info) {
    if (RUNNING) return;
    const head = info.name + '\n任务 ' + info.tasks.length + ' 个 × 臂 ' + info.arms.length + ' 个，断言 ' + info.assertions + ' 条\n模型 ' + (info.model || '–') + '，max_tokens ' + (info.max_tokens || '–') + '\n\n会调用模型并计费，开始？';
    const AUTO = /autoran|autorun=1/.test(location.search);
    if (!AUTO && !confirm(head)) return;
    RUNNING = true;
    document.querySelectorAll('#ev-quick .qk').forEach((x) => { x.disabled = true; x.classList.add('busy'); });
    const out = $('ev-runout');
    const t0 = Date.now();
    const paint = () => {
      if (!out) return;
      out.innerHTML = '<div class="sub">跑中：' + esc(info.name) + ' · 已 ' + Math.round((Date.now() - t0) / 1000) + 's（可以切页，别关窗口）</div>';
    };
    paint();
    const tick = setInterval(paint, 1000);
    try {
      const r = await fetch(B + '/eval?config=' + encodeURIComponent(info.name)).then((x) => x.json());
      clearInterval(tick);
      const secs = ((r.durationMs || (Date.now() - t0)) / 1000).toFixed(1);
      if (!r.ok) {
        if (out) out.innerHTML = '<div class="bad">失败（' + esc(r.exitCode) + ' · ' + secs + 's）：' + esc((r.text || r.error || '').slice(-600)) + '</div>';
        return;
      }
      const rows = (r.summary || []).map((s) => {
        return '<tr><td class="mono">' + esc(s.arm) + '</td><td>' + esc(s.hit) + ' / ' + esc(s.total) + '</td><td>' + esc(s.rate) + '%</td><td>' + esc(s.truncated) + '</td><td>' + esc(s.chars) + '</td></tr>';
      }).join('');
      const tk = r.tokens || {};
      if (out) {
        out.innerHTML =
          '<div class="ok-line">跑完：' + esc(info.name) + ' · ' + secs + 's · 输入 ' + esc(tk.input) + ' / 输出 ' + esc(tk.output) + ' tokens</div>' +
          '<table><thead><tr><th>臂</th><th>命中</th><th>命中率</th><th>截断</th><th>字符</th></tr></thead><tbody>' + rows + '</tbody></table>';
      }
      window.ZH_EVAL_RELOAD();
    } catch (e) {
      clearInterval(tick);
      if (out) out.innerHTML = '<div class="bad">出错：' + esc(e.message) + '</div>';
    } finally {
      RUNNING = false;
      document.querySelectorAll('#ev-quick .qk').forEach((x) => { x.disabled = false; x.classList.remove('busy'); });
    }
  }

  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest && e.target.closest('#nav a[data-v]');
    if (a && a.getAttribute('data-v') === 'eval') setTimeout(quickInit, 120);
  });
  if ((location.hash || '').indexOf('eval') >= 0) setTimeout(quickInit, 300);
  /* 切到评估页时才拉，避免每次启动都读文件 */
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest && e.target.closest('#nav a[data-v]');
    if (a && a.getAttribute('data-v') === 'eval') setTimeout(load, 60);
  });
  if ((location.hash || '').indexOf('eval') >= 0) setTimeout(load, 200);
  window.ZH_EVAL_RELOAD = function () { CACHE = null; load(true); };
})();
