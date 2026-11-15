// 外部投放：上传/路径 → 扫描 → 判层 → 确认投放 → 拿去对比
(function () {
  const $ = (id) => document.getElementById(id);
  const B = 'http://127.0.0.1:8791';
  let LAST = null;
  let INGESTED = null;

  const badge = (k) => {
    const cls = k === 'method' ? 'gp-k-method' : k === 'ledger' ? 'gp-k-ledger' : k === 'spec' ? 'gp-k-spec' : k === 'code' ? 'gp-k-code' : 'gp-k-example';
    return '<span class="gp-k ' + cls + '">' + k + '</span>';
  };

  const ACT = {
    gap: { text: '补资料', cls: 'gp-k-method' },
    'install-skill': { text: '装成技能', cls: 'gp-k-spec' },
    skip: { text: '不收', cls: 'gp-k-ledger' },
  };

  function render(d, note) {
    LAST = d;
    const box = $('ig-list');
    const kinds = Object.keys(d.byKind || {}).map((k) => k + ' ' + d.byKind[k]).join(' · ');
    const acts = Object.keys(d.byAction || {}).map((k) => (ACT[k] ? ACT[k].text : k) + ' ' + d.byAction[k]).join(' · ');
    const rows = (d.items || []).map((it, i) => {
      const top = (it.suggest || [])[0];
      const a = ACT[it.action] || { text: it.action, cls: 'gp-k-method' };
      const conf = it.confidence === 'high' ? '' : it.confidence === 'low' ? ' <span class="sub">（低）</span>' : ' <span class="sub">（判不出）</span>';
      const where = it.action === 'gap'
        ? (top ? '<b>' + top.skill + '</b> <span class="sub">' + top.score + ' 分 · ' + (top.evidence || []).join(' ') + '</span>' : '<span class="sub">—</span>')
        : '<span class="sub">' + it.judgeWhy + '</span>';
      return '<tr><td class="mono" title="' + it.rel + '">' + it.rel.split('/').pop() + '</td>' +
        '<td><span class="gp-k ' + (it.kind === 'method' ? 'gp-k-method' : it.kind === 'skill' ? 'gp-k-spec' : it.kind === 'spec' ? 'gp-k-spec' : it.kind === 'ledger' ? 'gp-k-ledger' : it.kind === 'code' ? 'gp-k-code' : 'gp-k-example') + '" title="' + (it.kindWhy || '') + '">' + it.kind + '</span></td>' +
        '<td><span class="gp-k ' + a.cls + '">' + a.text + '</span>' + conf + '</td>' +
        '<td class="mono">' + Math.round(it.bytes / 1024) + 'KB</td>' +
        '<td class="mono">' + (it.sections || 0) + '</td>' +
        '<td>' + where + (it.skillName ? '<div class="sub mono">name: ' + it.skillName + '</div>' : '') + '<div class="sub" data-out="' + i + '"></div></td>' +
        '<td>' + (it.action === 'gap'
          ? '<button class="dz-mini" data-ig="pick" data-i="' + i + '">用这条判层</button>'
          : it.action === 'install-skill'
            ? '<button class="dz-mini dz-strong" data-ig="inst" data-i="' + i + '">装成技能</button>'
            : '') + '</td></tr>';
    }).join('');
    box.innerHTML = (note ? '<div class="gp-head">' + note + '</div>' : '') +
      '<div class="gp-head">' + d.files + ' 个文件 · ' + d.texts + ' 份可读文本 · 类型：' + (kinds || '—') + (acts ? ' · 动作：' + acts : '') + (d.unzipped ? ' · 已解压' : '') + '</div>' +
      '<table class="dz-map"><thead><tr><th>文件</th><th>类型</th><th>动作</th><th>大小</th><th>节数</th><th>该去哪（确定性判层 / 不收的理由）</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="gp-actions">' + (INGESTED
        ? '<span class="sub">已投放，可用来料 id：<b>src:' + INGESTED + '/…</b></span>'
        : '<button class="dz-mini dz-strong" data-ig="ingest">投放进来（复制到 patch\\sources）</button><span class="sub">整包投放后，单份文件也能用 <b>src:&lt;包名&gt;/&lt;文件&gt;</b> 参与只补缺</span>') + '</div>';
  }

  async function doScan() {
    const path = ($('ig-path').value || '').trim();
    if (!path) { alert('先填路径，或用上面的「上传」按钮'); return; }
    $('ig-list').innerHTML = '<div class="sub">正在扫描…</div>';
    try {
      const d = await fetch(B + '/ingest-scan?path=' + encodeURIComponent(path)).then((r) => r.json());
      if (!d.ok) { $('ig-list').innerHTML = '<div class="sub">扫描失败：' + (d.error || '') + '</div>'; return; }
      INGESTED = null;
      const name = ($('ig-name').value || '').trim() || (path.split(/[\\/]/).pop() || '').replace(/\.[^.]+$/, '');
      $('ig-name').value = name;
      render(d, '扫描结果（未写盘）');
    } catch (e) {
      $('ig-list').innerHTML = '<div class="sub">扫描失败：' + e.message + '</div>';
    }
  }

  async function upload(fileList, hintName) {
    if (!fileList || !fileList.length) return;
    const box = $('ig-list');
    const name = ($('ig-name').value || '').trim() || hintName || ('上传-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, ''));
    $('ig-name').value = name;
    box.innerHTML = '<div class="sub">正在上传 ' + fileList.length + ' 个文件…</div>';
    const fd = new FormData();
    fd.append('name', name);
    for (const f of fileList) {
      const rel = f.webkitRelativePath || f.name;
      fd.append('files', f, rel);
    }
    try {
      const d = await fetch(B + '/ingest-upload', { method: 'POST', body: fd }).then((r) => r.json());
      if (!d.ok) { box.innerHTML = '<div class="sub">上传失败：' + (d.error || '') + '</div>'; return; }
      INGESTED = d.name;
      render(d, '已上传并投放：' + d.uploaded + ' 个文件 → <span class="mono">' + d.dir + '</span>');
    } catch (e) {
      box.innerHTML = '<div class="sub">上传失败：' + e.message + '</div>';
    }
  }

  async function doIngest() {
    const path = ($('ig-path').value || '').trim();
    const name = ($('ig-name').value || '').trim();
    if (!path || !name) { alert('需要路径和包名'); return; }
    if (!confirm('会复制进 patch\\sources\\' + name + '\\ 并记一条来源账本。继续？')) return;
    $('ig-list').insertAdjacentHTML('afterbegin', '<div class="sub" id="ig-run">正在投放…</div>');
    try {
      const d = await fetch(B + '/ingest-do?path=' + encodeURIComponent(path) + '&name=' + encodeURIComponent(name) + '&confirm=yes').then((r) => r.json());
      const note = $('ig-run');
      note.innerHTML = d.ok ? '已投放 <b>' + d.name + '</b>：' + d.copied + ' 个文件 / ' + d.texts + ' 份文本' : '投放失败：' + (d.error || '');
      if (d.ok) { INGESTED = d.name; render(d, '已投放'); }
    } catch (e) {
      $('ig-run').innerHTML = '投放失败：' + e.message;
    }
  }

  async function usePick(i) {
    const it = (LAST && LAST.items || [])[i];
    if (!it) return;
    const top = (it.suggest || [])[0];
    const name = ($('ig-name').value || '').trim();
    const target = top && top.score >= 25 ? top.skill : (($('gp-target') || {}).value || 'film-cinedance');
    const srcId = 'src:' + name + '/' + it.rel;
    const t = $('gp-target');
    if (t) t.value = target;
    const box = $('gp-plan');
    if (!box) return;
    box.innerHTML = '<div class="sub">正在对比（' + srcId + ' → ' + target + '）…</div>';
    try {
      const p = await fetch(B + '/gap?target=' + encodeURIComponent(target) + '&from=' + encodeURIComponent(srcId)).then((r) => r.json());
      if (!p.ok) { box.innerHTML = '<div class="sub">对比失败：' + (p.error || '') + '（先把包投放进来，才有 src: 路径）</div>'; return; }
      box.innerHTML = '<div class="gp-head">' + target + ' ← <span class="mono">' + srcId + '</span> · 覆盖率 <b>' + Math.round(p.coverage * 100) + '%</b> · 缺 <b>' + p.missingCount + '</b> / ' + p.total + ' 节</div>' +
        '<div class="sub">来源已记下，点下面按钮回「只补缺」勾节投放。</div>' +
        '<div class="gp-actions"><button class="dz-mini dz-strong" data-ig="goto">去只补缺那张卡</button></div>';
      window.__IG_SRC = srcId;
    } catch (e) {
      box.innerHTML = '<div class="sub">对比失败：' + e.message + '</div>';
    }
  }

  async function doInstallSkill(i) {
    const it = (LAST && LAST.items || [])[i];
    if (!it) return;
    const pkg = ($('ig-name').value || '').trim();
    if (!INGESTED && !pkg) { alert('先把包投放进来（整包落 patch\\sources），才有可装的路径'); return; }
    const out = document.querySelector('[data-out="' + i + '"]');
    if (!confirm('会复制进 patch\\skills\\' + (it.skillName || '') + '（唯一真相），再体检、再同步到运行区。继续？')) return;
    if (out) out.innerHTML = '正在装…';
    try {
      const q = 'pkg=' + encodeURIComponent(INGESTED || pkg) + '&rel=' + encodeURIComponent(it.rel) + '&confirm=yes';
      const d = await fetch(B + '/install-skill?' + q).then((r) => r.json());
      if (!d.ok) { if (out) out.innerHTML = '<span style="color:#c85550">装失败：' + (d.error || '') + '</span>'; return; }
      const ok = d.audit && d.audit.pass;
      if (out) {
        out.innerHTML = '<span style="color:' + (ok ? '#7fcfa3' : '#d8b26a') + '">已装 ' + d.name + '（' + d.files + ' 文件）· 体检 ' + (ok ? 'PASS' : 'FAIL exit ' + (d.audit && d.audit.exitCode)) + '</span>' +
          '<div class="sub">同步运行区：' + (d.synced ? '已同步' : '未同步（跑 apply.ps1 -Skills）') + (d.backed ? ' · 旧版备份 ' + d.backed : '') + '</div>' +
          (d.audit && d.audit.fails && d.audit.fails.length ? '<div class="sub">' + d.audit.fails.join('；') + '</div>' : '');
      }
    } catch (e) {
      if (out) out.innerHTML = '<span style="color:#c85550">装失败：' + e.message + '</span>';
    }
  }

  async function loadTruth() {
    const tb = $('zh-truth');
    if (!tb) return;
    try {
      const d = await fetch(B + '/skills-truth').then((r) => r.json());
      const rows = (d.skills || []).map((s) => '<tr><td class="mono">' + s.name + '</td>' +
        '<td>' + (s.hasSkillMd ? '✓' : '<span style="color:#c85550">✗</span>') + '</td>' +
        '<td>' + (s.hasPack ? '✓' : '—') + '</td>' +
        '<td>' + (s.runtime ? '✓' : '<span class="sub">未同步</span>') + '</td>' +
        '<td class="mono">' + s.files + '</td>' +
        '<td><button class="dz-mini" data-ig="un" data-name="' + s.name + '">卸掉</button></td></tr>').join('');
      tb.innerHTML = rows || '<tr><td colspan="6" class="sub">patch\\skills 里没有技能</td></tr>';
      if (d.dir) tb.setAttribute('title', d.dir + ' → ' + d.runtimeDir);
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="6" class="sub">读取失败：' + e.message + '</td></tr>';
    }
  }

  async function doUninstall(name) {
    if (!name) return;
    if (!confirm('卸掉 ' + name + '？\n会从 patch\\skills 与运行区一起移除，并先备份到 patch\\_backup\\skills。')) return;
    const tb = $('zh-truth');
    if (tb) tb.insertAdjacentHTML('afterbegin', '<tr id="un-run"><td colspan="6" class="sub">正在卸 ' + name + '…</td></tr>');
    try {
      const d = await fetch(B + '/uninstall-skill?name=' + encodeURIComponent(name) + '&confirm=yes').then((r) => r.json());
      const run = $('un-run');
      if (run) run.remove();
      if (!d.ok) { alert('卸失败：' + (d.error || '')); return; }
      if (tb) tb.insertAdjacentHTML('afterbegin', '<tr><td colspan="6" class="sub">已卸 ' + d.name + '：真相 ' + (d.removedTruth ? '已移除' : '未找到') + ' · 运行区 ' + (d.removedRuntime ? '已移除' : '未找到') + (d.backed ? ' · 备份 ' + d.backed : '') + '</td></tr>');
      loadTruth();
    } catch (e) {
      alert('卸失败：' + e.message);
    }
  }

  function syncToGap() {
    const sel = $('gp-src');
    if (!sel || !window.__IG_SRC) return;
    const opt = Array.from(sel.options).find((o) => o.value === window.__IG_SRC);
    if (opt) opt.selected = true;
    else {
      const o = document.createElement('option');
      o.value = window.__IG_SRC; o.text = window.__IG_SRC; o.selected = true;
      sel.appendChild(o);
    }
    sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function wire() {
    const dir = $('ig-dir'), files = $('ig-files'), zip = $('ig-zip');
    if (dir) dir.addEventListener('change', () => upload(dir.files, ((dir.files[0] && dir.files[0].webkitRelativePath) || '').split('/')[0]));
    if (files) files.addEventListener('change', () => upload(files.files));
    if (zip) zip.addEventListener('change', () => upload(zip.files));
  }

  document.addEventListener('click', function (e) {
    const a = e.target.getAttribute && e.target.getAttribute('data-ig');
    if (a === 'scan') doScan();
    if (a === 'ingest') doIngest();
    if (a === 'pick') usePick(Number(e.target.getAttribute('data-i')));
    if (a === 'goto') syncToGap();
    if (a === 'inst') doInstallSkill(Number(e.target.getAttribute('data-i')));
    if (a === 'un') doUninstall(e.target.getAttribute('data-name'));
    if (e.target && e.target.id === 'ig-scan') doScan();
  });

  (function auto() {
    const q = new URLSearchParams(location.search);
    const ig = q.get('ig');
    if (ig) { const el = $('ig-path'); if (el) { el.value = ig; setTimeout(doScan, 600); } }
  })();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { wire(); loadTruth(); });
  else { wire(); loadTruth(); }
})();
