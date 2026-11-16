/* 融合台 v2：小观象台 + 来源 / 动作 / 结果 三栏。所有数字来自本地桥，不再有示意卡。 */
(function () {
  'use strict';

  const B = 'http://127.0.0.1:8791';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kb = (n) => (n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B');

  const S = {
    skills: [],       // [{name, files, hasSkillMd, runtime}]
    dist: {},         // name -> {in, total}
    sources: [],      // [{srcId, layer, name, bytes, stamped, targets}]
    picked: new Set(),// 选中的 srcId
    plan: null,       // /gap 结果
    sandbox: [],      // /fused dirs
    target: '',       // 当前目标技能
  };

  /* ---------------- 数据 ---------------- */
  async function j(u, opt) {
    const r = await fetch(u, opt);
    const t = await r.text();
    try { return JSON.parse(t); } catch (e) { return { ok: false, error: t.slice(0, 300) }; }
  }

  async function loadAll() {
    const [truth, dist, src] = await Promise.all([
      j(B + '/skills-truth').catch(() => ({ skills: [] })),
      j(B + '/distill').catch(() => ({ skills: [] })),
      j(B + '/sources').catch(() => ({ sources: [] })),
    ]);
    S.skills = (truth.skills || []).map((x) => (typeof x === 'string' ? { name: x } : x));
    if (!S.skills.length) S.skills = (dist.skills || []).map((x) => ({ name: x.skill }));
    (dist.skills || []).forEach((x) => { S.dist[x.skill] = { in: x.in || 0, total: x.total || 0 }; });
    S.sources = src.sources || [];
    if (!S.target) S.target = (S.skills[0] && S.skills[0].name) || '';
    renderChips();
    renderSources();
    fillSelects();
    const ins = Object.values(S.dist).reduce((a, b) => a + (b.in || 0), 0);
    if ($('fz-mini-in')) $('fz-mini-in').textContent = '已接入 ' + ins;
    if ($('fz-mini-src')) $('fz-mini-src').textContent = '来料 ' + S.sources.length;
  }

  /* ---------------- 技能带 ---------------- */
  function renderChips() {
    const host = $('fz-chips');
    if (!host) return;
    if (!S.skills.length) { host.innerHTML = '<span class="fz-hint">读不到技能（桥没连上？）</span>'; return; }
    host.innerHTML = S.skills.map((s) => {
      const d = S.dist[s.name] || { in: 0, total: 0 };
      const p = d.total ? Math.round((d.in / d.total) * 100) : 0;
      const on = s.name === S.target ? ' on' : '';
      const badge = d.in ? '<b>' + d.in + '/' + d.total + '</b>' : '<i>原装</i>';
      return '<button class="fz-chip' + on + '" data-skill="' + esc(s.name) + '" title="点一下设为当前目标技能">' +
        '<span class="fz-chip-n">' + esc(s.name) + '</span>' +
        '<span class="fz-chip-bar"><i style="width:' + p + '%"></i></span>' +
        badge + '</button>';
    }).join('');
  }

  /* ---------------- 来源 ---------------- */
  function renderSources() {
    const host = $('fz-sources');
    if (!host) return;
    const q = (($('fz-q') && $('fz-q').value) || '').trim().toLowerCase();
    const list = S.sources.filter((x) => !q || (x.layer + '/' + x.name).toLowerCase().includes(q));
    if ($('fz-src-count')) $('fz-src-count').textContent = list.length + ' / ' + S.sources.length + ' 份';
    if (!list.length) { host.innerHTML = '<div class="fz-empty">没有匹配的来料</div>'; return; }
    const byLayer = {};
    list.forEach((x) => { (byLayer[x.layer] = byLayer[x.layer] || []).push(x); });
    let out = '';
    Object.keys(byLayer).sort().forEach((layer) => {
      out += '<div class="fz-layer">' + esc(layer) + ' <span>' + byLayer[layer].length + '</span></div>';
      byLayer[layer].forEach((x) => {
        const on = S.picked.has(x.srcId) ? ' on' : '';
        const used = (x.targets && x.targets.length) ? '<em>已投 ' + x.targets.length + '</em>' : '';
        out += '<label class="fz-src' + on + '" data-src="' + esc(x.srcId) + '">' +
          '<input type="checkbox"' + (on ? ' checked' : '') + ' />' +
          '<span class="fz-src-n">' + esc(x.name) + '</span>' +
          '<span class="fz-src-m">' + kb(x.bytes) + (used ? ' · ' + used : '') + '</span>' +
          '</label>';
      });
    });
    host.innerHTML = out;
    if ($('fz-pick-info')) $('fz-pick-info').textContent = S.picked.size ? '已选 ' + S.picked.size + ' 份来料' : '未选来料';
    if ($('fz-land')) $('fz-land').disabled = !(S.picked.size && S.plan);
  }

  /* ---------------- 下拉 ---------------- */
  function fillSelects() {
    const names = S.skills.map((s) => s.name);
    const opts = (sel, cur) => {
      const e = $(sel); if (!e) return;
      e.innerHTML = names.map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('');
      if (cur && names.includes(cur)) e.value = cur;
    };
    opts('fz-a', 'film-cinedance');
    opts('fz-b', 'film-shotlist');
    opts('fz-target', S.target);
    opts('fz-adopt-to', S.target);
  }

  /* ---------------- 结果面板 ---------------- */
  function out(html) { if ($('fz-out')) $('fz-out').innerHTML = html; if ($('fz-out-count')) $('fz-out-count').textContent = '刚更新'; }
  function ev(html) { if ($('fz-ev')) $('fz-ev').innerHTML = html; }

  function busy(btn, txt) {
    if (!btn) return () => {};
    const old = btn.textContent; const was = btn.disabled;
    btn.disabled = true; btn.textContent = txt;
    return () => { btn.disabled = was; btn.textContent = old; };
  }

  /* ---------------- 合并 ---------------- */
  async function doCreate() {
    const a = $('fz-a').value, b = $('fz-b').value, mode = $('fz-mode').value;
    const name = ($('fz-name').value || '').trim();
    if (a === b) { out('<div class="fz-bad">基准和并入不能是同一个技能</div>'); return; }
    if (!confirm('合并（不调模型）：\n\n' + a + ' + ' + b + '\nmode=' + mode + (name ? '\n新名字 ' + name : '') + '\n\n产物落 patch\\staging\\fused\\，不动现有技能。继续？')) return;
    const done = busy($('fz-create'), '合并中…');
    out('<div class="fz-load">合并中…</div>');
    try {
      const q = new URLSearchParams({ skill: a, sources: b, mode, name: name || a, confirm: 'yes' });
      const d = await j(B + '/create?' + q.toString());
      done();
      if (!d.ok) { out('<div class="fz-bad">失败：' + esc(d.error || JSON.stringify(d).slice(0, 300)) + '</div>'); return; }
      const rec = d.recorded || {};
      out('<div class="fz-ok">合并完成：' + esc(a) + ' + ' + esc(b) + '</div>' +
        '<div class="fz-kv"><span>产物</span><b>' + esc(d.out || d.dir || '—') + '</b></div>' +
        (rec.epoch ? '<div class="fz-kv"><span>账本</span><b>epoch ' + esc(rec.epoch) + ' · ' + esc(rec.files) + ' 文件</b></div>' : '') +
        (d.bans ? bansLine(d.bans) : ''));
      ev('<div class="fz-kv"><span>模式</span><b>create / ' + esc(mode) + '</b></div><div class="fz-kv"><span>耗时</span><b>' + esc(d.durationMs) + ' ms</b></div>');
      loadSandbox();
    } catch (e) { done(); out('<div class="fz-bad">出错：' + esc(e.message) + '</div>'); }
  }

  async function doFuse() {
    const a = $('fz-a').value, b = $('fz-b').value;
    if (a === b) { out('<div class="fz-bad">基准和并入不能是同一个技能</div>'); return; }
    if (!confirm('语义融合（调模型，约 1 分钟，会计费）：\n\n' + a + ' ← ' + b + '\n\n模型合成会重写正文，可能丢「禁止/不得」条目（会被禁令核对拦）。继续？')) return;
    const done = busy($('fz-fuse'), '融合中…');
    out('<div class="fz-load">调用模型中，约 1 分钟…</div>');
    try {
      const q = new URLSearchParams({ base: a, other: b, confirm: 'yes' });
      const d = await j(B + '/fuse?' + q.toString());
      done();
      if (!d.ok && !d.recorded) { out('<div class="fz-bad">失败（' + esc(d.exitCode || '') + '）：' + esc((d.error || d.text || '').slice(-400)) + '</div>'); return; }
      out('<div class="' + (d.ok ? 'fz-ok' : 'fz-warn') + '">融合' + (d.ok ? '完成' : '出草稿（体检没过，需收口）') + '：' + esc(a) + ' ← ' + esc(b) + '</div>' +
        '<div class="fz-kv"><span>产物</span><b>' + esc(d.out || d.dir || '—') + '</b></div>' +
        (d.recorded && d.recorded.epoch ? '<div class="fz-kv"><span>账本</span><b>epoch ' + esc(d.recorded.epoch) + '</b></div>' : '') +
        (d.bans ? bansLine(d.bans) : '') +
        '<div class="fz-tip">下一步：到「收编沙盒」把它收进技能，或先看证据再决定。</div>');
      ev('<div class="fz-kv"><span>方式</span><b>fuse-skill（模型）</b></div><div class="fz-kv"><span>耗时</span><b>' + esc(((d.durationMs || 0) / 1000).toFixed(1)) + ' s</b></div>');
      loadSandbox();
    } catch (e) { done(); out('<div class="fz-bad">出错：' + esc(e.message) + '</div>'); }
  }

  function bansLine(b) {
    const miss = b.missingCount || 0;
    const total = b.total || 0;
    const p = total ? Math.round(((total - miss) / total) * 100) : 0;
    return '<div class="fz-kv"><span>禁令核对</span><b class="' + (miss ? 'fz-warn-t' : 'fz-ok-t') + '">保留 ' +
      (total - miss) + '/' + total + '（' + p + '%）' + (miss ? ' · 丢 ' + miss : '') + '</b></div>';
  }

  /* ---------------- 只补缺 ---------------- */
  async function doCompare() {
    if (!S.picked.size) { out('<div class="fz-bad">先在左栏勾来料</div>'); return; }
    const target = $('fz-target').value;
    const done = busy($('fz-compare'), '对比中…');
    const bar = $('fz-gapbar'); if (bar) bar.innerHTML = '<div class="fz-load">对比中…</div>';
    try {
      const q = new URLSearchParams({ target, from: Array.from(S.picked).join(',') });
      const d = await j(B + '/gap?' + q.toString());
      done();
      if (!d.ok) { if (bar) bar.innerHTML = '<div class="fz-bad">失败：' + esc(d.error || '') + '</div>'; return; }
      S.plan = d;
      renderPlan(d, target);
      if ($('fz-land')) $('fz-land').disabled = false;
      out('<div class="fz-ok">对比完成：' + esc(target) + '</div>' +
        '<div class="fz-kv"><span>缺</span><b>' + esc(d.missingCount) + ' / ' + esc(d.total) + ' 节（覆盖 ' + esc(d.coverage) + '%）</b></div>' +
        '<div class="fz-kv"><span>来料</span><b>' + esc((d.from || []).length) + ' 份</b></div>');
    } catch (e) { done(); if (bar) bar.innerHTML = '<div class="fz-bad">出错：' + esc(e.message) + '</div>'; }
  }

  function renderPlan(d, target) {
    const bar = $('fz-gapbar');
    const table = $('fz-gaptable');
    if (!bar || !table) return;
    const per = d.bySrc || {};
    bar.innerHTML = '<div class="fz-ok">覆盖 ' + esc(d.coverage) + '% · 缺 ' + esc(d.missingCount) + ' / 共 ' + esc(d.total) + ' 节</div>' +
      Object.keys(per).map((k) => '<span class="fz-pill">' + esc(k.split('::')[1] || k) + ' 缺 ' + esc(per[k].missing) + '/' + esc(per[k].total) + '</span>').join(' ');
    const rows = (d.sections || []).map((s, i) => {
      const miss = (s.present === undefined ? s.missing : !s.present);
      const state = miss ? '缺' : '已有';
      return '<tr class="' + (miss ? '' : 'fz-has') + '"><td><input type="checkbox" class="fz-sec" data-i="' + i + '" data-from="' + esc(s.from) + '" data-no="' + esc(s.no) + '"' + (miss ? ' checked' : '') + ' /></td>' +
        '<td class="mono">' + esc(s.no) + '</td><td>' + esc(s.title) + '</td><td class="num">' + esc(s.chars) + '</td><td>' + state + '</td></tr>';
    }).join('');
    table.innerHTML = '<table><thead><tr><th></th><th>节</th><th>标题</th><th>字</th><th>状态</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="fz-empty">没有可补的节</td></tr>') + '</tbody></table>';
  }

  async function doLand() {
    if (!S.plan) { out('<div class="fz-bad">先点对比</div>'); return; }
    const boxes = Array.from(document.querySelectorAll('.fz-sec')).filter((x) => x.checked && !x.closest('tr').classList.contains('fz-has'));
    if (!boxes.length) { out('<div class="fz-bad">没有勾选要投的节</div>'); return; }
    const byFrom = {};
    boxes.forEach((b) => { const f = b.dataset.from; (byFrom[f] = byFrom[f] || []).push(b.dataset.no); });
    const target = $('fz-target').value;
    const as = ($('fz-as').value || '').trim();
    const msg = '投放 ' + boxes.length + ' 节到 ' + target + '？\n\n' + Object.keys(byFrom).map((k) => '· ' + (k.split('::')[1] || k) + '：' + byFrom[k].length + ' 节').join('\n') + (as ? '\n落文件：' + as : '') + '\n\n会写 patch\\skills（唯一真相）并记账本。';
    if (!confirm(msg)) return;
    const done = busy($('fz-land'), '投放中…');
    let okCount = 0, wired = 0, epoch = 0, lastErr = '';
    try {
      for (const from of Object.keys(byFrom)) {
        const q = new URLSearchParams({ target, from, sections: byFrom[from].join(','), mode: 'file', confirm: 'yes' });
        if (as && Object.keys(byFrom).length === 1) q.set('as', as);
        const d = await j(B + '/gap-graft?' + q.toString());
        if (d && d.ok) { okCount += byFrom[from].length; wired += (d.wired || 0); epoch = Math.max(epoch, d.epoch || 0); }
        else lastErr = (d && (d.error || JSON.stringify(d))) || '未知错误';
      }
      done();
      out('<div class="fz-ok">投放完成：' + okCount + ' 节</div>' +
        '<div class="fz-kv"><span>接线</span><b>' + wired + ' 条</b></div>' +
        (epoch ? '<div class="fz-kv"><span>账本</span><b>epoch ' + epoch + '</b></div>' : '') +
        (lastErr ? '<div class="fz-bad">部分失败：' + esc(lastErr.slice(0, 200)) + '</div>' : ''));
      ev('<div class="fz-tip">提示：这里是唯一真相 patch\\skills；要生效到运行区，跑一次 <b>apply.ps1 -Skills</b>（或 start-app.ps1）。</div>');
      loadAll();
    } catch (e) { done(); out('<div class="fz-bad">出错：' + esc(e.message) + '</div>'); }
  }

  /* ---------------- 收编 ---------------- */
  async function loadSandbox() {
    const d = await j(B + '/fused').catch(() => ({ dirs: [] }));
    S.sandbox = (d.dirs || []).filter((x) => x.hasSkill);
    const sel = $('fz-sandbox');
    if (sel) {
      sel.innerHTML = S.sandbox.length
        ? S.sandbox.map((x) => '<option value="' + esc(x.name) + '">' + esc(x.name) + '</option>').join('')
        : '<option value="">（沙盒里没有带 SKILL.md 的产物）</option>';
    }
    if ($('fz-adopt')) $('fz-adopt').disabled = !S.sandbox.length;
  }

  async function doAdopt() {
    const name = $('fz-sandbox').value;
    const skill = $('fz-adopt-to').value;
    if (!name) { out('<div class="fz-bad">沙盒里没有产物</div>'); return; }
    if (!confirm('收编：' + name + ' → 技能 ' + skill + '？\n\n会写进 patch\\skills（先备份）、逐文件打戳、记 epoch，然后过禁令核对（丢得多会被拦）。')) return;
    const done = busy($('fz-adopt'), '收编中…');
    out('<div class="fz-load">收编中…</div>');
    try {
      const q = new URLSearchParams({ name, skill, confirm: 'yes' });
      const d = await j(B + '/adopt?' + q.toString());
      done();
      if (d.blocked) {
        out('<div class="fz-warn">收编被拦：' + esc(d.reason || '禁令核对没过') + '</div>' +
          (d.bans && d.bans.items ? '<div class="fz-bans">' + d.bans.items.slice(0, 6).map((x) => '<div>· ' + esc(x) + '</div>').join('') + '</div>' : '') +
          '<div class="fz-tip">先回去补正文更稳；确认要收就带 force（命令行）。</div>');
        return;
      }
      if (!d.ok) { out('<div class="fz-bad">失败：' + esc(d.error || JSON.stringify(d).slice(0, 300)) + '</div>'); return; }
      out('<div class="fz-ok">收编完成：' + esc(name) + ' → ' + esc(skill) + '</div>' +
        '<div class="fz-kv"><span>文件</span><b>' + esc(d.files || '—') + '</b></div>' +
        '<div class="fz-kv"><span>接线</span><b>' + esc(d.wired || 0) + ' 条</b></div>' +
        (d.epoch ? '<div class="fz-kv"><span>账本</span><b>epoch ' + d.epoch + '</b></div>' : '') +
        (d.bans ? bansLine(d.bans) : ''));
      ev('<div class="fz-tip">收编只写了真相 <b>patch\\skills</b>；要进运行区还需 apply.ps1 -Skills。</div>');
      loadAll(); loadSandbox();
    } catch (e) { done(); out('<div class="fz-bad">出错：' + esc(e.message) + '</div>'); }
  }

  /* ---------------- 从本机添加（扫描 / 上传） ---------------- */
  async function doScan() {
    const path = ($('fz-path').value || '').trim();
    const box = $('fz-scanout');
    if (!path) { if (box) box.innerHTML = '<div class="fz-bad">先填路径</div>'; return; }
    if (box) box.innerHTML = '<div class="fz-load">扫描中（只读，不搬文件）…</div>';
    try {
      const d = await j(B + '/ingest-scan?path=' + encodeURIComponent(path));
      if (!d.ok) { if (box) box.innerHTML = '<div class="fz-bad">失败：' + esc(d.error || '') + '</div>'; return; }
      const by = d.byAction || {};
      const rows = (d.items || []).slice(0, 40).map((it) => {
        const act = it.action === 'gap' ? '补资料' : it.action === 'install-skill' ? '装成技能' : '不收';
        return '<tr><td class="mono" title="' + esc(it.rel) + '">' + esc(String(it.rel).split('/').pop()) + '</td><td>' + esc(it.kind) + '</td><td>' + esc(act) + '</td><td class="num">' + esc(it.chars || 0) + '</td></tr>';
      }).join('');
      if (box) box.innerHTML = '<div class="fz-ok">' + esc(d.files) + ' 个文件 · ' + esc(d.texts) + ' 份可读文本 · 补资料 ' + (by.gap || 0) + ' · 装成技能 ' + (by['install-skill'] || 0) + '</div>' +
        '<table class="fz-mini-table"><thead><tr><th>文件</th><th>类型</th><th>动作</th><th>字</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<button class="btn" id="fz-ingest-do">搬进来（写 patch\\sources）</button>';
      const btn = $('fz-ingest-do');
      if (btn) btn.addEventListener('click', () => doIngest(path));
    } catch (e) { if (box) box.innerHTML = '<div class="fz-bad">出错：' + esc(e.message) + '</div>'; }
  }

  async function doIngest(path) {
    const name = ($('fz-pkg').value || '').trim();
    if (!confirm('把 ' + path + ' 复制进 patch\\sources' + (name ? '\\' + name : '') + '？')) return;
    const box = $('fz-scanout');
    if (box) box.innerHTML = '<div class="fz-load">搬运中…</div>';
    try {
      const q = new URLSearchParams({ path, confirm: 'yes' });
      if (name) q.set('name', name);
      const d = await j(B + '/ingest-do?' + q.toString());
      if (box) box.innerHTML = d.ok ? '<div class="fz-ok">已入库：' + esc(d.dir || '') + '</div>' : '<div class="fz-bad">失败：' + esc(d.error || '') + '</div>';
      loadAll();
    } catch (e) { if (box) box.innerHTML = '<div class="fz-bad">出错：' + esc(e.message) + '</div>'; }
  }

  async function upload(fileList, hint) {
    if (!fileList || !fileList.length) return;
    const fd = new FormData();
    fd.append('name', ($('fz-pkg').value || '').trim() || hint || ('upload-' + Date.now()));
    for (const f of fileList) fd.append('files', f, f.webkitRelativePath || f.name);
    const box = $('fz-scanout');
    if (box) box.innerHTML = '<div class="fz-load">上传中（只到本机 127.0.0.1）…</div>';
    try {
      const d = await j(B + '/ingest-upload', { method: 'POST', body: fd });
      if (box) box.innerHTML = d.ok
        ? '<div class="fz-ok">上传并入库：' + esc(d.dir || '') + ' · 文本 ' + esc(d.texts || 0) + ' 份</div>'
        : '<div class="fz-bad">失败：' + esc(d.error || '') + '</div>';
      loadAll();
    } catch (e) { if (box) box.innerHTML = '<div class="fz-bad">出错：' + esc(e.message) + '</div>'; }
  }

  /* ---------------- 小观象台 ---------------- */
  const CV = { ctx: null, dpr: 1, w: 0, h: 0, ripples: [], pulsing: 0, seq: 0, last: 0 };

  function fitCanvas() {
    const c = $('fz-canvas');
    if (!c) return;
    const r = c.getBoundingClientRect();
    CV.dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * CV.dpr));
    c.height = Math.max(1, Math.round(r.height * CV.dpr));
    CV.w = r.width; CV.h = r.height;
    CV.ctx = c.getContext('2d');
    CV.ctx.setTransform(CV.dpr, 0, 0, CV.dpr, 0, 0);
  }

  function drawStrip(t) {
    const g = CV.ctx;
    if (!g) return;
    const w = CV.w, h = CV.h;
    g.clearRect(0, 0, w, h);
    const breathe = 0.5 + 0.5 * Math.sin(t / 2600);
    const glow = 0.18 + 0.22 * breathe;
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(216,178,106,0.05)');
    grad.addColorStop(1, 'rgba(216,178,106,0.00)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, w * 0.40);
    rg.addColorStop(0, 'rgba(216,178,106,' + (glow * 0.55).toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(216,178,106,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, w, h);

    const pad = 26, y = h * 0.66, n = 16;
    const gap = (w - pad * 2) / (n - 1);
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(216,178,106,' + (0.10 + 0.14 * breathe) + ')';
    g.beginPath(); g.moveTo(pad - 10, y); g.lineTo(w - pad + 10, y); g.stroke();

    const active = new Set(S.skills.map((s) => s.name));
    for (let i = 0; i < n; i++) {
      const x = pad + i * gap;
      const h2 = 6 + 10 * (0.4 + 0.6 * Math.abs(Math.sin(t / 1400 + i * 0.7)));
      g.strokeStyle = 'rgba(226,192,128,' + (0.40 + 0.35 * breathe).toFixed(3) + ')';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h2); g.stroke();
      g.fillStyle = 'rgba(226,192,128,0.70)';
      g.fillRect(x - 0.6, y + 2, 1.2, 3);
    }
    // 事件涟漪
    for (let k = CV.ripples.length - 1; k >= 0; k--) {
      const r = CV.ripples[k];
      const age = (t - r.t0) / 1200;
      if (age > 1) { CV.ripples.splice(k, 1); continue; }
      const x = pad + (r.i % n) * gap;
      const rad = 6 + age * 46;
      g.strokeStyle = 'rgba(' + r.c + ',' + (0.55 * (1 - age)) + ')';
      g.lineWidth = 1.2;
      g.beginPath(); g.arc(x, y - 6, rad, Math.PI, Math.PI * 2); g.stroke();
    }
    // 呼吸光点
    const cx = pad + ((CV.seq % n + n) % n) * gap;
    g.fillStyle = 'rgba(216,178,106,' + (0.35 + 0.45 * breathe) + ')';
    g.beginPath(); g.arc(cx, y - 12, 2.2 + 1.4 * breathe, 0, Math.PI * 2); g.fill();
  }

  function loop(t) {
    drawStrip(t);
    requestAnimationFrame(loop);
  }

  function onEvent(ev) {
    const kind = ev.kind || ev.type || 'event';
    const i = (hashStr(ev.skill || ev.target || kind)) % 16;
    const ok = ev.ok !== false;
    CV.ripples.push({ i, t0: performance.now(), c: ok ? '127,207,163' : '194,85,80' });
    CV.seq = (ev.seq || CV.seq + 1);
    if ($('fz-seq')) $('fz-seq').textContent = 'seq ' + CV.seq;
    if ($('fz-dot')) $('fz-dot').classList.add('pulse');
    setTimeout(() => { if ($('fz-dot')) $('fz-dot').classList.remove('pulse'); }, 420);
  }

  function hashStr(s) { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0; return Math.abs(h); }

  function connect() {
    const live = $('fz-live');
    fetch(B + '/health').then((r) => r.json()).then((d) => {
      if (live) { live.textContent = '桥已连接'; const dot = $('fz-dot'); if (dot) dot.classList.add('ok'); }
    }).catch(() => { if (live) live.textContent = '桥没连上（看门狗 2 分钟内自愈）'; });
    try {
      const es = new EventSource(B + '/events');
      es.addEventListener('message', (m) => {
        try { const d = JSON.parse(m.data); onEvent(d); } catch (e) { /* 忽略坏事件 */ }
      });
      es.onerror = () => { if (live) live.textContent = '事件流断开，重连中…'; };
    } catch (e) { /* 不支持就算了 */ }
  }

  /* ---------------- 事件绑定 ---------------- */
  function bind() {
    const tabs = $('fz-tabs');
    if (tabs) tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]'); if (!b) return;
      tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      ['merge', 'gap', 'adopt'].forEach((k) => {
        const pane = $('fz-pane-' + k); if (pane) pane.classList.toggle('on', k === b.dataset.tab);
      });
    });

    const chips = $('fz-chips');
    if (chips) chips.addEventListener('click', (e) => {
      const b = e.target.closest('.fz-chip'); if (!b) return;
      S.target = b.dataset.skill;
      renderChips();
      if ($('fz-target')) $('fz-target').value = S.target;
      if ($('fz-adopt-to')) $('fz-adopt-to').value = S.target;
    });

    const list = $('fz-sources');
    if (list) list.addEventListener('click', (e) => {
      const row = e.target.closest('.fz-src'); if (!row) return;
      const id = row.dataset.src;
      const cb = row.querySelector('input');
      const on = cb ? cb.checked : !S.picked.has(id);
      if (on) S.picked.add(id); else S.picked.delete(id);
      row.classList.toggle('on', on);
      S.plan = null;
      if ($('fz-gaptable')) $('fz-gaptable').innerHTML = '';
      if ($('fz-gapbar')) $('fz-gapbar').innerHTML = '';
      renderSources();
    });

    if ($('fz-q')) $('fz-q').addEventListener('input', renderSources);
    if ($('fz-create')) $('fz-create').addEventListener('click', doCreate);
    if ($('fz-fuse')) $('fz-fuse').addEventListener('click', doFuse);
    if ($('fz-compare')) $('fz-compare').addEventListener('click', doCompare);
    if ($('fz-land')) $('fz-land').addEventListener('click', doLand);
    if ($('fz-adopt')) $('fz-adopt').addEventListener('click', doAdopt);
    if ($('fz-sandbox-refresh')) $('fz-sandbox-refresh').addEventListener('click', loadSandbox);
    if ($('fz-scan')) $('fz-scan').addEventListener('click', doScan);
    if ($('fz-up-dir')) $('fz-up-dir').addEventListener('change', (e) => upload(e.target.files, e.target.value.split('\\').pop()));
    if ($('fz-up-files')) $('fz-up-files').addEventListener('change', (e) => upload(e.target.files, 'files'));
    if ($('fz-up-zip')) $('fz-up-zip').addEventListener('change', (e) => upload(e.target.files, (e.target.files[0] || {}).name));
    if ($('fz-open')) $('fz-open').addEventListener('click', () => { location.hash = 'obs'; });
  }

  async function loadTimeline() {
    try {
      const d = await j(B + '/distill-timeline').catch(() => ({ epochs: [] }));
      const eps = (d.epochs || []).slice(-4).reverse();
      if (!eps.length) return;
      ev('<div class="fz-tl">' + eps.map((e) =>
        '<div class="fz-tl-row"><b>epoch ' + esc(e.epoch) + '</b><span>' + esc(e.label || '') + '</span></div>'
      ).join('') + '</div>');
    } catch (e) { /* 忽略 */ }
  }

  // 清掉旧版融合台留下的卡片（旧脚本会往 #v-fuse 里补卡，v2 只留自己的三段）
  function purgeLegacy() {
    const sec = $('v-fuse');
    if (!sec) return;
    Array.from(sec.children).forEach((c) => {
      if (c.classList.contains('fz-strip') || c.classList.contains('fz-chips') || c.classList.contains('fz-grid')) return;
      if (c.tagName === 'H2' || c.id === 'zh-fuse-card' || c.classList.contains('card')) c.remove();
    });
  }

  function boot() {
    if (!$('v-fuse')) return;
    purgeLegacy();
    setTimeout(purgeLegacy, 400);
    setTimeout(purgeLegacy, 1200);
    try { new MutationObserver(purgeLegacy).observe($('v-fuse'), { childList: true }); } catch (e) { /* 忽略 */ }
    bind();
    fitCanvas();
    window.addEventListener('resize', () => { fitCanvas(); });
    requestAnimationFrame(loop);
    connect();
    loadAll();
    loadSandbox();
    loadTimeline();
    // 自检钩子：?demo=gap 自动勾第一份来料、切到"只补缺"并对比
    if (/demo=gap/.test(location.search)) {
      setTimeout(() => {
        const first = S.sources[0];
        if (!first) return;
        S.picked.add(first.srcId);
        renderSources();
        if ($('fz-target')) $('fz-target').value = 'film-cinedance';
        const tab = document.querySelector('#fz-tabs button[data-tab="gap"]');
        if (tab) tab.click();
        doCompare();
      }, 1500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
