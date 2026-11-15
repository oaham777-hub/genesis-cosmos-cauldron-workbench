// 融合台 ·「只补缺」：选目标技能 + 来料 → 列出目标没有的节 → 勾选补进去（存成资料 / 并进正文）
(function () {
  const $ = (id) => document.getElementById(id);
  const B = 'http://127.0.0.1:8791';
  let SRC = [];

  function chips(o) {
    return '<span class="badge ' + (o.present ? 'ok' : 'warn') + '">' + (o.present ? '已有' : '缺') + '</span>';
  }

  async function loadSources() {
    // 多选：默认不选；Ctrl+点击 可多选，对比时按选中项合并
    const sel = $('gp-src');
    if (!sel) return;
    try {
      const d = await fetch(B + '/sources').then((r) => r.json());
      SRC = d.sources || [];
      const label = (s) => s.srcId.replace('qkd:skills/', '').replace('/references/', '::') + ' · ' + Math.round(s.bytes / 1024) + 'KB' + (s.kind === 'ledger' ? ' · 台账' : '');
      const opt = (s) => '<option value="' + s.srcId + '">' + label(s) + '</option>';
      const method = SRC.filter((s) => s.kind !== 'ledger');
      const ledger = SRC.filter((s) => s.kind === 'ledger');
      sel.innerHTML = method.map(opt).join('') + (ledger.length ? '<optgroup label="台账类（逐字副本/台账，默认不投）">' + ledger.map(opt).join('') + '</optgroup>' : '');
    } catch (e) {
      sel.innerHTML = '<option value="">桥没连上</option>';
    }
  }

  async function doPlan() {
    const target = $('gp-target').value;
    const from = Array.from($('gp-src').selectedOptions || []).map(function (o) { return o.value; }).filter(Boolean).join(',');
    const box = $('gp-plan');
    if (!target || !from) return;
    box.innerHTML = '<div class="sub">正在对比…</div>';
    try {
      const p = await fetch(B + '/gap?target=' + encodeURIComponent(target) + '&from=' + encodeURIComponent(from)).then((r) => r.json());
      if (!p.ok) { box.innerHTML = '<div class="sub">对比失败：' + (p.error || '') + '</div>'; return; }
      const rows = p.sections.map((s) =>
        '<tr><td><input type="checkbox" class="gp-ck" value="' + s.no + '"' + (s.present ? ' disabled' : (s.chars >= 120 ? ' checked' : '')) + '></td>' +
        '<td>' + s.no + '</td><td>' + s.title + '</td><td class="mono">' + s.chars + '</td><td>' + chips(s) + '</td></tr>').join('');
      box.innerHTML = '<div class="gp-head">覆盖率 <b>' + Math.round(p.coverage * 100) + '%</b> · 缺 <b>' + p.missingCount + '</b> 节 / 共 ' + p.total + ' 节 · 来料 <b>' + (p.multi ? p.from.length + ' 份' : '1 份') + '</b>' + (p.multi ? '（' + Object.keys(p.bySrc).map(function (k) { return String(k).replace('qkd:skills/', '').replace('/references/', '::') + ' 缺 ' + p.bySrc[k].missing + '/' + p.bySrc[k].total; }).join('；') + '）' : '') + '</div>' +
        '<table class="dz-map"><thead><tr><th></th><th>#</th><th>来源</th><th>节</th><th>字数</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="gp-actions"><button class="dz-mini dz-strong" data-gp="file">存成资料（推荐）</button>' +
        '<button class="dz-mini" data-gp="body">并进正文</button>' +
        '<input id="gp-as" class="gp-in" placeholder="存成资料时的文件名（默认按来源命名）">' +
        '<button class="dz-mini" data-gp="all">全选缺的</button></div>';
    } catch (e) {
      box.innerHTML = '<div class="sub">对比失败：' + e.message + '</div>';
    }
  }

  function pickedItems() {
    return Array.from(document.querySelectorAll('.gp-ck'))
      .filter((c) => c.checked && !c.disabled)
      .map((c) => ({ from: c.getAttribute('data-from') || '', no: c.value }));
  }

  async function doGraft(mode) {
    const target = $('gp-target').value;
    const items = pickedItems();
    const asName = ($('gp-as') && $('gp-as').value.trim()) || '';
    const box = $('gp-plan');
    if (!items.length) { alert('先勾选要补的节'); return; }
    if (!confirm('会写 patch\\skills\\' + target + '，并记一条新 epoch。继续？')) return;
    // 按来源分组，每个来源一次 graft
    const groups = {};
    for (const it of items) { (groups[it.from] = groups[it.from] || []).push(it.no); }
    const froms = Object.keys(groups);
    box.insertAdjacentHTML('afterbegin', '<div class="sub" id="gp-run">正在补…（' + froms.length + ' 份来料）</div>');
    const notes = [];
    try {
      for (const f of froms) {
        const u = B + '/gap-graft?target=' + encodeURIComponent(target) + '&from=' + encodeURIComponent(f) +
          '&sections=' + encodeURIComponent(groups[f].join(',')) + '&mode=' + mode +
          (asName && froms.length === 1 ? '&as=' + encodeURIComponent(asName) : '') + '&confirm=yes';
        const j = await fetch(u).then((r) => r.json());
        notes.push(j.ok
          ? String(f).replace('qkd:skills/', '').replace('/references/', '::') + ' → ' + j.sections.join(',') + ' 节 · epoch ' + j.epoch + (j.wrote ? ' · ' + j.wrote : ' · 正文 +' + j.added + ' 字')
          : String(f).replace('qkd:skills/', '').replace('/references/', '::') + ' 失败：' + (j.error || ''));
      }
      const note = $('gp-run');
      if (note) note.innerHTML = '已补入 ' + froms.length + ' 份：<br>' + notes.join('<br>');
      doPlan();
      if (window.ZH_DISTILL_RELOAD) window.ZH_DISTILL_RELOAD();
    } catch (e) {
      const note = $('gp-run');
      if (note) note.innerHTML = '失败：' + e.message;
    }
  }

  document.addEventListener('click', function (e) {
    const a = e.target.getAttribute && e.target.getAttribute('data-gp');
    if (a === 'file') doGraft('file');
    if (a === 'body') doGraft('body');
    if (a === 'all') {
      document.querySelectorAll('.gp-ck').forEach((c) => { if (!c.disabled) c.checked = true; });
    }
  });

  function boot() {
    loadSources().then(function () {
      if (/auto=1/.test(location.hash)) {
        var opts = Array.from(document.querySelectorAll('#gp-src option')).slice(0, 2);
        opts.forEach(function (o) { o.selected = true; });
        setTimeout(doPlan, 300);
      }
    });
  }
  document.getElementById('gp-do');
  document.addEventListener('click', function (e) { if (e.target && e.target.id === 'gp-do') doPlan(); });
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 80);
})();
