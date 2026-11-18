// 融合台中央「观象台」——自绘轻量版（无 iframe、无第三方大屏，几百 KB 内存）。
// 数据全部来自本地桥：/distill（技能与接入量）、/sources（来料）、/packs（包）、/events（SSE）。
(function () {
  'use strict';
  var BRIDGE = 'http://127.0.0.1:8791';
  var MAX_FPS = 30;

  var host = document.getElementById('fl-obs-canvas-wrap');
  var cv = document.getElementById('fl-obs-canvas');
  if (!host || !cv) return;
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, dpr = 1;

  var data = { skills: [], total: 16, inFiles: 0, sources: 0, packs: 0, pass: 0, fail: 0, unstamped: 0 };
  var ripples = [], lastEv = [], seq = 0, actRate = 0;
  var T0 = performance.now();
  var visible = true;

  function fit() {
    var r = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(280, Math.round(r.width));
    H = Math.max(240, Math.round(r.height));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
  }
  new ResizeObserver(fit).observe(host);

  function j(u) { return fetch(u).then(function (r) { return r.json(); }).catch(function () { return null; }); }

  function load() {
    Promise.all([j(BRIDGE + '/distill'), j(BRIDGE + '/sources'), j(BRIDGE + '/packs')]).then(function (a) {
      var dist = a[0], src = a[1], packs = a[2];
      var sk = (dist && dist.skills) || [];
      data.skills = sk.map(function (s) { return { name: s.skill, in: s.in || 0, total: s.total || 1 }; });
      data.total = sk.length || 16;
      data.inFiles = sk.reduce(function (n, s) { return n + (s.in || 0); }, 0);
      data.pass = sk.filter(function (s) { return (s.fail || 0) === 0; }).length;
      data.fail = data.total - data.pass;
      data.sources = (src && src.total) || 0;
      data.unstamped = (src && src.unstamped) || 0;
      data.packs = ((packs && packs.packs) || []).length;
      hud();
    });
  }

  function hud() {
    var el = document.getElementById('fl-obs-hud');
    if (!el) return;
    el.innerHTML =
      chip('技能', data.total) + chip('已接入文件', data.inFiles) + chip('来料', data.sources) +
      chip('未投放', data.unstamped) + chip('包', data.packs) + chip('体检通过', data.pass + '/' + data.total);
  }
  function chip(k, v) {
    return '<span style="display:inline-flex;align-items:baseline;gap:6px;margin-right:16px">' +
      '<b style="color:#e6d3a6;font-size:15px;font-weight:600">' + v + '</b>' +
      '<span style="color:#6c7684;font-size:11px">' + k + '</span></span>';
  }

  function connect() {
    try {
      var es = new EventSource(BRIDGE + '/events');
      es.addEventListener('message', function (m) {
        var d; try { d = JSON.parse(m.data); } catch (e) { return; }
        seq = d.seq || seq + 1;
        var ok = d.ok !== false && d.status !== 'fail';
        ripples.push({ t: performance.now(), ok: ok });
        if (ripples.length > 24) ripples.shift();
        actRate = Math.min(1, actRate + 0.5);
        lastEv.unshift({ k: d.kind || d.target || 'event', ok: ok, t: new Date() });
        if (lastEv.length > 5) lastEv.pop();
        var s = document.getElementById('fl-obs-seq');
        if (s) s.textContent = 'seq ' + seq;
        renderTicker();
      });
    } catch (e) { /* 不支持就算了 */ }
  }

  function renderTicker() {
    var el = document.getElementById('fl-obs-ticker');
    if (!el) return;
    el.innerHTML = lastEv.map(function (e) {
      var c = e.ok ? '#7fcf9b' : '#d6786e';
      return '<div style="color:#8b94a3"><i style="display:inline-block;width:5px;height:5px;border-radius:50%;background:' + c + ';margin-right:6px"></i>' + e.k + '</div>';
    }).join('');
  }

  var lastFrame = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    if (now - lastFrame < 1000 / MAX_FPS) return;
    lastFrame = now;
    draw(now);
  }

  function draw(now) {
    var t = (now - T0) / 1000;
    actRate *= 0.985;
    var cx = W / 2, cy = H * 0.46;
    var R = Math.min(W * 0.40, H * 0.40);
    var breathe = 1 + Math.sin(t * 0.55) * 0.012;
    R *= breathe;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 底光
    var g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.25);
    g.addColorStop(0, 'rgba(216,178,106,' + (0.05 + actRate * 0.07) + ')');
    g.addColorStop(1, 'rgba(216,178,106,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 外环
    ctx.strokeStyle = 'rgba(216,178,106,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(216,178,106,.10)';
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.16, 0, Math.PI * 2); ctx.stroke();

    // 16 个技能刻度 + 已接入比例
    var n = Math.max(1, data.skills.length || data.total);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      var s = data.skills[i] || { in: 0, total: 1 };
      var ratio = Math.min(1, s.in / Math.max(1, s.total));
      var x1 = cx + Math.cos(a) * R * 1.03, y1 = cy + Math.sin(a) * R * 1.03;
      var x2 = cx + Math.cos(a) * R * 1.11, y2 = cy + Math.sin(a) * R * 1.11;
      ctx.strokeStyle = ratio > 0 ? 'rgba(226,192,128,.75)' : 'rgba(120,128,140,.35)';
      ctx.lineWidth = ratio > 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      // 有接入的，在环内画一小段弧
      if (ratio > 0) {
        ctx.strokeStyle = 'rgba(226,192,128,' + (0.18 + ratio * 0.35) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.965, a - 0.10 * ratio, a + 0.10 * ratio);
        ctx.stroke();
      }
    }

    // 核
    var coreR = R * (0.20 + Math.sin(t * 0.9) * 0.006);
    var cg = ctx.createRadialGradient(cx, cy - coreR * 0.2, coreR * 0.2, cx, cy, coreR * 1.6);
    cg.addColorStop(0, 'rgba(255,235,197,.92)');
    cg.addColorStop(0.45, 'rgba(226,192,128,.42)');
    cg.addColorStop(1, 'rgba(226,192,128,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, coreR * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,210,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2); ctx.stroke();

    // 中心文字：体检通过数
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240,232,214,.92)';
    ctx.font = '600 ' + Math.max(13, Math.round(R * 0.10)) + 'px -apple-system,"Segoe UI","Microsoft YaHei",sans-serif';
    ctx.fillText(data.pass + '/' + data.total, cx, cy - R * 0.02);
    ctx.fillStyle = 'rgba(140,150,164,.85)';
    ctx.font = '400 ' + Math.max(9, Math.round(R * 0.048)) + 'px -apple-system,"Segoe UI","Microsoft YaHei",sans-serif';
    ctx.fillText('体检通过', cx, cy + R * 0.085);

    // 涟漪
    for (var k = ripples.length - 1; k >= 0; k--) {
      var r = ripples[k];
      var age = (now - r.t) / 2200;
      if (age > 1) { ripples.splice(k, 1); continue; }
      ctx.strokeStyle = (r.ok ? 'rgba(127,207,155,' : 'rgba(214,120,110,') + (0.30 * (1 - age)) + ')';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(cx, cy, R * (0.22 + age * 1.0), 0, Math.PI * 2); ctx.stroke();
    }
  }

  fit();
  requestAnimationFrame(frame);
  load();
  connect();
  setInterval(load, 60000);
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
  // 切到别的页就停画
  var nav = document.getElementById('nav');
  if (nav) nav.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-v]');
    if (a) visible = (a.dataset.v === 'fuse');
  });
})();
