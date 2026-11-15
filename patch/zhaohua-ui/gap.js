// 融合台 ·「只补缺」：选目标技能 + 来料 → 列出目标没有的节 → 勾选补进去（存成资料 / 并进正文）
(function () {
  const $ = (id) => document.getElementById(id);
  const B = 'http://127.0.0.1:8791';
  let SRC = [];

  function chips(o) {
    return '<span class="badge ' + (o.present ? 'ok' : 'warn') + '">' + (o.present ? '已有' : '缺') + '</span>';
  }

  async function loadSources() {
    const sel = $('gp-src');
    if (!sel) return;
    try {
      const d = await fetch(B + '/sources').then((r) => r.json());
      SRC = d.sources || [];
      sel.innerHTML = SRC.map((s) => '<option value="' + s.srcId + '">' + s.srcId.replace('qkd:skills/', '').replace('/references/', '::') + ' · ' + Math.round(s.bytes / 1024) + 'KB</option>').join('');
    } catch (e) {
      sel.innerHTML = '<option value="">桥没连上</option>';
    }
  }

  async function doPlan() {
    const target = $('gp-target').value;
    const from = $('gp-src').value;
    const box = $('gp-plan');
    if (!target || !from) return;
    box.innerHTML = '<div class="sub">正在对比…</div>';
    try {
      const p = await fetch(B + '/gap?target=' + encodeURIComponent(target) + '&from=' + encodeURIComponent(from)).then((r) => r.json());
      if (!p.ok) { box.innerHTML = '<div class="sub">对比失败：' + (p.error || '') + '</div>'; return; }
      const rows = p.sections.map((s) =>
        '<tr><td><input type="checkbox" class="gp-ck" value="' + s.no + '"' + (s.present ? ' disabled' : ' checked') + '></td>' +
        '<td>' + s.no + '</td><td>' + s.title + '</td><td class="mono">' + s.chars + '</td><td>' + chips(s) + '</td></tr>').join('');
      box.innerHTML = '<div class="gp-head">覆盖率 <b>' + Math.round(p.coverage * 100) + '%</b> · 缺 <b>' + p.missing.length + '</b> 节 · 来料 ' + Math.round(p.srcBytes / 1024) + ' KB</div>' +
        '<table class="dz-map"><thead><tr><th></th><th>#</th><th>节</th><th>字数</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="gp-actions"><button class="dz-mini dz-strong" data-gp="file">存成资料（推荐）</button>' +
        '<button class="dz-mini" data-gp="body">并进正文</button>' +
        '<input id="gp-as" class="gp-in" placeholder="存成资料时的文件名（默认按来源命名）">' +
        '<button class="dz-mini" data-gp="all">全选缺的</button></div>';
    } catch (e) {
      box.innerHTML = '<div class="sub">对比失败：' + e.message + '</div>';
    }
  }

  function picked() {
    return Array.from(document.querySelectorAll('.gp-ck')).filter((c) => c.checked && !c.disabled).map((c) => c.value).join(',');
  }

  async function doGraft(mode) {
    const target = $('gp-target').value;
    const from = $('gp-src').value;
    const secs = picked();
    const asName = ($('gp-as') && $('gp-as').value.trim()) || '';
    const box = $('gp-plan');
    if (!secs) { alert('先勾选要补的节'); return; }
    if (!confirm('会写 patch\\skills\\' + target + '，并记一条新 epoch。继续？')) return;
    box.insertAdjacentHTML('afterbegin', '<div class="sub" id="gp-run">正在补…</div>');
    try {
      const u = B + '/gap-graft?target=' + encodeURIComponent(target) + '&from=' + encodeURIComponent(from) +
        '&sections=' + encodeURIComponent(secs) + '&mode=' + mode + (asName ? '&as=' + encodeURIComponent(asName) : '') + '&confirm=yes';
      const j = await fetch(u).then((r) => r.json());
      const note = $('gp-run');
      if (note) note.innerHTML = j.ok
        ? '已补入：' + j.sections.join(',') + ' 节 · epoch ' + j.epoch + (j.wrote ? ' · 写了 ' + j.wrote : ' · 正文 +' + j.added + ' 字')
        : '失败：' + (j.error || '');
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
    loadSources();
    if (/auto=1/.test(location.hash)) setTimeout(doPlan, 900);
  }
  document.getElementById('gp-do');
  document.addEventListener('click', function (e) { if (e.target && e.target.id === 'gp-do') doPlan(); });
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 80);
})();
