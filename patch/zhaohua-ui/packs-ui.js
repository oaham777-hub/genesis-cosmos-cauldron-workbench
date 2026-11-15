/* 包管理：已安装包表 + 证据链卡，全部读真目录，不再放示意数字 */
(function () {
  'use strict';

  const B = 'http://127.0.0.1:8791';
  const $ = (id) => document.getElementById(id);

  const esc = (s) => String(s === null || s === undefined ? '–' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function loadPacks() {
    const tb = $('zh-pi');
    if (!tb) return;
    try {
      const d = await fetch(B + '/packs-installed').then((r) => r.json());
      if (!d.ok) throw new Error(d.error || '读取失败');
      if (!d.packs.length) {
        tb.innerHTML = '<tr><td colspan="6" class="sub">还没有装进引擎的包。上面「② 安装到产品目录」装一个试试。</td></tr>';
      } else {
        tb.innerHTML = d.packs.map((p) =>
          '<tr><td class="nm">' + esc(p.name) + '</td><td>' + esc(p.version) + '</td>' +
          '<td class="mono">' + esc(p.source) + '</td><td>' + esc(p.license) + '</td>' +
          '<td><code class="hash">' + esc(p.sha256) + '</code></td>' +
          '<td>' + esc(p.refs) + ' / ' + esc(p.caps) + '</td></tr>'
        ).join('');
      }
      const note = $('zh-pi-note');
      if (note) {
        note.textContent = '真目录：' + d.dir + ' · 已装 ' + d.packs.length + ' 个' +
          (d.history ? ' · 历史版本 ' + d.history + ' 个（回滚从这里取）' : '') +
          '。重叠率超过 80% 会拒装，并报「和谁重、重多少」。';
      }
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="6" class="sub">桥没连上：' + esc(e.message) + '</td></tr>';
    }
  }

  async function loadEvidence() {
    const box = $('zh-ev-body');
    if (!box) return;
    try {
      const d = await fetch(B + '/packs-installed').then((r) => r.json());
      const first = (d.packs || [])[0];
      if (!first) { box.innerHTML = '<div class="sub">还没有装好的包，装一个就会有证据。</div>'; return; }
      const e = await fetch(B + '/pack-evidence?name=' + encodeURIComponent(first.name) + '&version=' + encodeURIComponent(first.version)).then((r) => r.json());
      const title = $('zh-ev-title');
      if (title) title.textContent = 'EVIDENCE.md · ' + first.name + ' ' + first.version;
      const sub = $('zh-ev-sub');
      if (sub) sub.textContent = '由 pack 生成，全程不调用模型 · ' + e.bytes + ' 字节';
      box.innerHTML = '<pre class="ev-pre">' + esc(e.text) + '</pre>';
    } catch (err) {
      box.innerHTML = '<div class="sub">读取失败：' + esc(err.message) + '</div>';
    }
  }

  function kick() { loadPacks(); loadEvidence(); }

  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest && e.target.closest('#nav a[data-v]');
    if (a && a.getAttribute('data-v') === 'packs') setTimeout(kick, 60);
    if (a && a.getAttribute('data-v') === 'evidence') setTimeout(loadEvidence, 60);
  });
  const hash = (location.hash || '').split('&')[0];
  if (hash.indexOf('packs') >= 0 || hash.indexOf('evidence') >= 0) setTimeout(kick, 250);
  window.ZH_PACKS_RELOAD = kick;
})();
