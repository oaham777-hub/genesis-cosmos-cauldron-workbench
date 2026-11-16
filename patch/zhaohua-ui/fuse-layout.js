// 融合台 v3 版面：把 v1 的全部卡片搬进三列网格，中间放星核观象台。
// 全部用行内 style 定位（不依赖外部 CSS），只搬 DOM，不动卡片内部结构与事件。
(function () {
  'use strict';

  var OBS_SRC = '/zhaohua/obs-neural.html';

  function heading(el) {
    var h = el.querySelector('h3, h2');
    return h ? (h.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  function place(el, col, row, spanRow) {
    el.style.minWidth = '0';
    el.style.gridColumn = col;
    el.style.gridRow = spanRow ? (row + ' / span ' + spanRow) : String(row);
  }

  function build() {
    var view = document.getElementById('v-fuse');
    if (!view || view.querySelector('.fl-grid')) return false;

    var cards = Array.prototype.slice.call(view.querySelectorAll(':scope > .card'));
    if (!cards.length) return false;

    var grid = document.createElement('div');
    grid.className = 'fl-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '300px minmax(0,1fr) 330px';
    grid.style.gap = '14px';
    grid.style.alignItems = 'start';

    var left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '14px';
    left.style.minWidth = '0';
    place(left, '1', 2, 2);

    // 观象台
    var obs = document.createElement('div');
    obs.style.minWidth = '0';
    place(obs, '2', 2, 2);
    obs.innerHTML =
      '<div style="display:flex;align-items:baseline;gap:10px;padding:0 2px 8px">' +
      '<span style="font-size:13px;color:#e6d3a6;letter-spacing:.06em">观象台 · 星核</span>' +
      '<span style="font-size:11px;color:#6c7684">环带宽度由真实数据生成 · 一次体检一圈涟漪</span>' +
      '<a role="button" tabindex="0" style="margin-left:auto;font-size:11px;color:#8b94a3;cursor:pointer">打开完整观象台 →</a>' +
      '</div>' +
      '<iframe loading="lazy" src="' + OBS_SRC + '" style="width:100%;height:520px;border:1px solid #1d2229;border-radius:12px;background:#07090c;display:block"></iframe>';

    var top = document.getElementById('zh-fuse-card');
    var info = { left: 0, right: 0, guard: 0, prev: 0, ingest: 0, top: 0 };

    cards.forEach(function (c) {
      var h = heading(c);
      if (c === top || h.indexOf('开始融合') === 0) { place(c, '1 / -1', 1); grid.appendChild(c); info.top++; return; }
      if (h.indexOf('只补缺') === 0) { place(c, '3', 2); grid.appendChild(c); info.right++; return; }
      if (h.indexOf('守卫检查') === 0) { place(c, '3', 3); grid.appendChild(c); info.guard++; return; }
      if (h.indexOf('外部投放') === 0) { place(c, '3', 4); grid.appendChild(c); info.ingest++; return; }
      if (h.indexOf('来料') === 0 || h.indexOf('宿主') === 0 || h.indexOf('配方') === 0) { left.appendChild(c); info.left++; return; }
      // 剩下的（融合预览 等）放中/左下侧
      place(c, '1 / span 2', 4); grid.appendChild(c); info.prev++;
    });

    if (info.left) grid.appendChild(left);
    grid.appendChild(obs);
    view.appendChild(grid);

    var a = obs.querySelector('a');
    if (a) a.addEventListener('click', function () { location.hash = '#obs'; });

    // 诊断数据挂到 section 上，便于排查
    view.setAttribute('data-fl', JSON.stringify(info));
    return true;
  }

  function boot() {
    if (build()) return;
    var n = 0;
    var timer = setInterval(function () {
      n++;
      if (build() || n > 25) clearInterval(timer);
    }, 120);
    var mo = new MutationObserver(function () { if (build()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
