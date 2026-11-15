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

  /* 切到评估页时才拉，避免每次启动都读文件 */
  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest && e.target.closest('#nav a[data-v]');
    if (a && a.getAttribute('data-v') === 'eval') setTimeout(load, 60);
  });
  if ((location.hash || '').indexOf('eval') >= 0) setTimeout(load, 200);
  window.ZH_EVAL_RELOAD = function () { CACHE = null; load(true); };
})();
