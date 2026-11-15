/* 造化鼎 · 观象台（v3：鼎纹 / 八卦 双形）
 * 两种造型共用同一套事件与呼吸：
 *   ding   —— 三足 / 圆腹 / 双耳 / 沿口 16 格回纹（16 个技能）
 *   bagua  —— 八卦外环（8 宫）+ 内环 64 刻（秒针感），活动点亮对应宫
 * 语义：
 *   audit/verify         → 沿口涟漪（PASS 金 / FAIL 暗红），从被点的技能那格起
 *   pack/install/deploy  → 落进腹中的水滴
 *   eval                 → 左右两束对冲
 *   create/fuse          → 从心口外扩
 *   呼吸周期跟最近活动量走：静 6.5s，忙 3.3s
 */
(function () {
  var BRIDGE = 'http://127.0.0.1:8791';
  var GOLD = '216,178,106';
  var OK = '127,207,163';
  var BAD = '194,85,80';

  var view = document.getElementById('v-obs');
  if (!view) return;
  var canvas = document.getElementById('obs-canvas');
  var ctx = canvas && canvas.getContext('2d');
  if (!canvas || !ctx) return;
  var feedEl = document.getElementById('obs-feed');
  var metaEl = document.getElementById('obs-meta');
  var stageEl = canvas.parentElement;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;

  var SKILLS = [
    'film-synopsis', 'film-characters', 'film-worldbuilding', 'film-treatment',
    'film-screenplay', 'film-stress-test', 'film-lira-assets', 'film-acting',
    'film-shotlist', 'film-cinedance', 'film-expert-bridge', 'film-knowledge-bridge',
    'ai-film-router', 'canvas', 'workflow', 'v118workflow'
  ];
  var TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

  var mode = 'ding';
  try { mode = localStorage.getItem('zh-obs-shape') || 'ding'; } catch (e) {}
  var shapeParam = (location.hash.match(/shape=([a-z]+)/) || [])[1];
  if (shapeParam === 'bagua' || shapeParam === 'ding') mode = shapeParam;

  var events = [], ripples = [], drops = [], vapors = [], beams = [], tickGlow = {};
  var palaceGlow = [0, 0, 0, 0, 0, 0, 0, 0];
  var lastAct = 0, actRate = 0;

  function resize() {
    var box = stageEl ? stageEl.getBoundingClientRect() : { width: 800, height: 620 };
    W = Math.max(420, Math.round(box.width || 800));
    H = Math.max(380, Math.round(box.height || 620));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  function geo() {
    var cx = W * 0.5;
    var cy = H * 0.47;
    var R = Math.min(W * 0.27, H * 0.28, 196);
    return { cx: cx, cy: cy, R: R, rimRy: R * 0.16, rimY: cy - R * 0.42 };
  }

  function tickPos(g, i, n) {
    if (mode !== 'bagua') {
      var span = g.R * 1.86;
      var x = g.cx - span / 2 + (i / (n - 1)) * span;
      return { x: x, y: g.rimY + g.R * 0.11, a: 0 };
    }
    var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: g.cx + Math.cos(a) * g.R, y: g.cy + Math.sin(a) * g.rimRy, a: a };
  }

  // 鼎：正视图（三足双耳圆鼎的立面），比透视椭圆更像鼎
  function drawDing(g, breathe, dt) {
    var a = 0.42 + 0.10 * breathe;
    var R = g.R, cx = g.cx, rimY = g.rimY;
    var bodyH = R * 1.02;
    var bottomY = rimY + bodyH;
    var baseHalf = R * 0.54;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 腹中云气
    drawVapor(g, breathe, dt);

    ctx.strokeStyle = 'rgba(' + GOLD + ',' + a.toFixed(3) + ')';
    ctx.lineWidth = 1.3;

    // 口沿：一条微弯的横线 + 上沿薄唇
    ctx.beginPath();
    ctx.moveTo(cx - R, rimY);
    ctx.quadraticCurveTo(cx, rimY + R * 0.045, cx + R, rimY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(' + GOLD + ',' + (a * 0.55).toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.985, rimY - R * 0.035);
    ctx.quadraticCurveTo(cx, rimY + R * 0.005, cx + R * 0.985, rimY - R * 0.035);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(' + GOLD + ',' + a.toFixed(3) + ')';

    // 腹壁：上段微外鼓，下段向内收到圆底
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(cx + s * R, rimY);
      ctx.bezierCurveTo(cx + s * R * 1.03, rimY + bodyH * 0.40, cx + s * R * 0.92, rimY + bodyH * 0.72, cx + s * baseHalf, bottomY);
      ctx.stroke();
    });
    // 圆底
    ctx.beginPath();
    ctx.moveTo(cx - baseHalf, bottomY);
    ctx.quadraticCurveTo(cx, bottomY + R * 0.10, cx + baseHalf, bottomY);
    ctx.stroke();

    // 三足：左右两只前足 + 中间一只后足（略短、略淡）
    function leg(xTop, dir, footY, alphaMul) {
      ctx.strokeStyle = 'rgba(' + GOLD + ',' + (a * alphaMul).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(xTop - R * 0.045, bottomY + R * 0.02);
      ctx.quadraticCurveTo(xTop - R * 0.02 + dir * R * 0.05, footY - R * 0.16, xTop + dir * R * 0.055, footY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(xTop + R * 0.045, bottomY + R * 0.02);
      ctx.quadraticCurveTo(xTop + R * 0.02 + dir * R * 0.05, footY - R * 0.16, xTop + dir * R * 0.055 + R * 0.03, footY);
      ctx.stroke();
      // 足底
      ctx.beginPath();
      ctx.moveTo(xTop + dir * R * 0.055 - R * 0.035, footY);
      ctx.lineTo(xTop + dir * R * 0.055 + R * 0.065, footY);
      ctx.stroke();
    }
    leg(cx - baseHalf * 0.62, -1, bottomY + R * 0.42, 1);
    leg(cx + baseHalf * 0.62, 1, bottomY + R * 0.42, 1);
    leg(cx + R * 0.01, 0.1, bottomY + R * 0.34, 0.5);
    ctx.strokeStyle = 'rgba(' + GOLD + ',' + a.toFixed(3) + ')';

    // 双耳：立在口沿两端的把手（外翻小卷）
    var earH = R * 0.19, earW = R * 0.058;
    [-1, 1].forEach(function (s) {
      var ex = cx + s * R * 0.60;
      ctx.beginPath();
      ctx.moveTo(ex - s * earW, rimY - R * 0.01);
      ctx.lineTo(ex - s * earW, rimY - earH * 0.72);
      ctx.quadraticCurveTo(ex - s * earW, rimY - earH, ex + s * earW * 0.6, rimY - earH);
      ctx.quadraticCurveTo(ex + s * earW * 2.0, rimY - earH * 0.98, ex + s * earW * 2.0, rimY - earH * 0.62);
      ctx.lineTo(ex + s * earW * 2.0, rimY - R * 0.01);
      ctx.stroke();
    });

    // 沿下饕餮纹带：两条横线 + 17 个竖刻（16 个间隔 = 16 个技能）
    var bandTop = rimY + R * 0.07, bandBot = rimY + R * 0.155;
    ctx.strokeStyle = 'rgba(' + GOLD + ',' + (a * 0.5).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.93, bandTop);
    ctx.quadraticCurveTo(cx, bandTop + R * 0.03, cx + R * 0.93, bandTop);
    ctx.moveTo(cx - R * 0.93, bandBot);
    ctx.quadraticCurveTo(cx, bandBot + R * 0.03, cx + R * 0.93, bandBot);
    ctx.stroke();

    var n = SKILLS.length;
    for (var i = 0; i < n; i++) {
      var p = tickPos(g, i, n);
      var glow = tickGlow[SKILLS[i]] || 0;
      var sag = R * 0.015 * (1 - Math.pow((p.x - cx) / R, 2));
      ctx.strokeStyle = 'rgba(' + GOLD + ',' + Math.min(0.95, 0.26 + glow * 0.85).toFixed(3) + ')';
      ctx.lineWidth = glow > 0.1 ? 1.6 : 0.9;
      ctx.beginPath();
      ctx.moveTo(p.x, bandTop + sag);
      ctx.lineTo(p.x, bandBot + sag - glow * R * 0.02);
      ctx.stroke();
      if (glow > 0.03) {
        ctx.fillStyle = 'rgba(' + GOLD + ',' + (glow * 0.55).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, (bandTop + bandBot) / 2 + sag, 1.6 + glow * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 侧光：让腹有体积
    ctx.strokeStyle = 'rgba(' + GOLD + ',' + (a * 0.22).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.72, rimY + R * 0.22);
    ctx.quadraticCurveTo(cx - R * 0.58, rimY + bodyH * 0.62, cx - R * 0.30, bottomY - R * 0.04);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(' + GOLD + ',' + a.toFixed(3) + ')';
  }

  // ---------- 八卦 ----------
  function drawBagua(g, breathe, dt) {
    var cx = g.cx, cy = g.cy, R = g.R * 1.06;
    var a = 0.34 + 0.10 * breathe;

    // 64 刻（内环，转得极慢，像秒针）
    var rot = (performance.now() / 1000) * 0.035;
    for (var k = 0; k < 64; k++) {
      var ang = -Math.PI / 2 + rot + (k / 64) * Math.PI * 2;
      var inner = R * 0.70, outer = R * (k % 8 === 0 ? 0.79 : 0.755);
      ctx.strokeStyle = 'rgba(' + GOLD + ',' + (k % 8 === 0 ? a * 0.75 : a * 0.34).toFixed(3) + ')';
      ctx.lineWidth = k % 8 === 0 ? 1.2 : 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
      ctx.lineTo(cx + Math.cos(ang) * outer, cy + Math.sin(ang) * outer);
      ctx.stroke();
    }

    // 八宫：每宫一个卦（三爻），爻线 + 宫名
    for (var i = 0; i < 8; i++) {
      var a0 = -Math.PI / 2 + (i / 8) * Math.PI * 2;
      var glow = palaceGlow[i] || 0;
      var r0 = R * 0.80, r1 = R * 1.0;
      var col = 'rgba(' + (glow > 0.05 ? GOLD : GOLD) + ',' + Math.min(0.95, a * (0.8 + glow * 1.1)).toFixed(3) + ')';

      // 宫格弧线
      ctx.strokeStyle = 'rgba(' + GOLD + ',' + (a * (0.28 + glow * 0.5)).toFixed(3) + ')';
      ctx.lineWidth = glow > 0.12 ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, a0 - Math.PI / 8 + 0.03, a0 + Math.PI / 8 - 0.03);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r0, a0 - Math.PI / 8 + 0.03, a0 + Math.PI / 8 - 0.03);
      ctx.stroke();

      // 卦的三爻（爻长沿切线方向）
      var ru = (r0 + r1) / 2;
      ctx.strokeStyle = col;
      for (var y = 0; y < 3; y++) {
        var rr = ru + (1 - y) * R * 0.045;
        var half = R * 0.055;
        var broken = (i === 1 || i === 2 || i === 4 || i === 6 || i === 7) && y === 1;
        var gap = R * 0.016;
        ctx.lineWidth = 1.1;
        if (broken) {
          lineAt(cx, cy, rr, a0, half - gap, -half, -gap);
          lineAt(cx, cy, rr, a0, gap, half, half);
        } else {
          lineAt(cx, cy, rr, a0, -half, half, 0);
        }
      }

      // 宫被点亮时给个柔光
      if (glow > 0.04) {
        var gg = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1 * 1.12);
        gg.addColorStop(0, 'rgba(' + GOLD + ',0)');
        gg.addColorStop(0.75, 'rgba(' + GOLD + ',' + (glow * 0.07).toFixed(3) + ')');
        gg.addColorStop(1, 'rgba(' + GOLD + ',0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(cx, cy, r1 * 1.12, a0 - Math.PI / 8, a0 + Math.PI / 8);
        ctx.arc(cx, cy, r0 * 0.96, a0 + Math.PI / 8, a0 - Math.PI / 8, true);
        ctx.fill();
      }
    }

    // 中心：太极
    ctx.strokeStyle = 'rgba(' + GOLD + ',' + (a * 0.85).toFixed(3) + ')';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy - R * 0.13, R * 0.13, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(cx, cy + R * 0.13, R * 0.13, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(' + GOLD + ',' + (0.35 + 0.25 * actRate).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy - R * 0.13, 2.2, 0, Math.PI * 2);
    ctx.arc(cx, cy + R * 0.13, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 事件层：涟漪/水滴/光束照旧，落点用极坐标
    drawEvents(g, dt);
  }

  function lineAt(cx, cy, r, a0, t0, t1, shift) {
    var x0 = cx + Math.cos(a0) * r - Math.sin(a0) * t0;
    var y0 = cy + Math.sin(a0) * r + Math.cos(a0) * t0;
    var x1 = cx + Math.cos(a0) * r - Math.sin(a0) * t1;
    var y1 = cy + Math.sin(a0) * r + Math.cos(a0) * t1;
    ctx.beginPath();
    ctx.moveTo(x0 + Math.cos(a0) * shift, y0 + Math.sin(a0) * shift);
    ctx.lineTo(x1 + Math.cos(a0) * shift, y1 + Math.sin(a0) * shift);
    ctx.stroke();
  }

  function drawVapor(g, breathe, dt) {
    var want = Math.min(36, 8 + Math.round(actRate * 28));
    var top = mode === 'bagua' ? g.cy - g.R * 0.5 : g.rimY + g.R * 0.10;
    var bottom = mode === 'bagua' ? g.cy + g.R * 0.45 : g.rimY + g.R * 0.92;
    while (vapors.length < want) {
      vapors.push({
        x: g.cx + (Math.random() - 0.5) * g.R * 1.0,
        y: top + Math.random() * (bottom - top),
        r: 1 + Math.random() * 1.7,
        vy: -(5 + Math.random() * 10),
        life: 0.4 + Math.random() * 0.5,
        seed: Math.random() * 6.28
      });
    }
    for (var i = vapors.length - 1; i >= 0; i--) {
      var v = vapors[i];
      v.y += v.vy * dt;
      v.x += Math.sin(v.seed + performance.now() / 1600) * 6 * dt;
      v.life -= dt * 0.13;
      if (v.life <= 0 || v.y < top - g.R * 0.14) {
        v.y = bottom - Math.random() * g.R * 0.28;
        v.x = g.cx + (Math.random() - 0.5) * g.R * 1.0;
        v.life = 0.4 + Math.random() * 0.5;
        continue;
      }
      ctx.fillStyle = 'rgba(' + GOLD + ',' + (0.19 * v.life * (0.75 + 0.25 * breathe)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (vapors.length > want) vapors.length = want;
  }

  function drawEvents(g, dt) {
    var i, e;
    for (i = ripples.length - 1; i >= 0; i--) {
      e = ripples[i];
      e.t += dt * 0.72;
      if (e.t >= 0 && e.t < 1) {
        var rad = e.r0 + e.t * e.spread;
        ctx.strokeStyle = 'rgba(' + e.color + ',' + Math.max(0, 0.5 * (1 - e.t)).toFixed(3) + ')';
        ctx.lineWidth = 1.2 * (1 - e.t * 0.6);
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, rad, rad * (mode === 'bagua' ? 1 : 0.4), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.t >= 1) ripples.splice(i, 1);
    }
    for (i = drops.length - 1; i >= 0; i--) {
      e = drops[i];
      e.t += dt * 1.4;
      var targetY = mode === 'bagua' ? g.cy : g.cy + g.R * 0.45;
      e.y += (targetY - e.y) * Math.min(1, dt * 5.5);
      ctx.fillStyle = 'rgba(' + (e.ok ? GOLD : BAD) + ',' + Math.max(0, 0.8 * (1 - e.t * 0.85)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      if (e.t >= 1) drops.splice(i, 1);
    }
    for (i = beams.length - 1; i >= 0; i--) {
      e = beams[i];
      e.t += dt * 0.8;
      e.len = Math.min(e.maxLen, e.len + dt * 480);
      ctx.strokeStyle = 'rgba(' + GOLD + ',' + Math.max(0, 0.5 * (1 - e.t)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      var by = g.cy;
      ctx.beginPath();
      ctx.moveTo(g.cx - g.R * 1.5, by);
      ctx.lineTo(g.cx - g.R * 1.5 + e.len, by);
      ctx.moveTo(g.cx + g.R * 1.5, by);
      ctx.lineTo(g.cx + g.R * 1.5 - e.len, by);
      ctx.stroke();
      if (e.t >= 1) beams.splice(i, 1);
    }
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
    frame.last = now;
    var g = geo();

    actRate *= (1 - dt * 0.30);
    if ((now - lastAct) / 1000 > 25) actRate *= (1 - dt * 0.6);
    var period = 6.5 - Math.min(3.2, actRate * 3.0);
    var breathe = 0.5 + 0.5 * Math.sin((now / 1000) * (Math.PI * 2) / period);

    ctx.clearRect(0, 0, W, H);
    var bg = ctx.createRadialGradient(g.cx, g.cy + g.R * 0.3, 10, g.cx, g.cy + g.R * 0.3, g.R * 2.0);
    bg.addColorStop(0, 'rgba(' + GOLD + ',' + (0.05 + 0.018 * breathe).toFixed(3) + ')');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (mode === 'bagua') {
      drawBagua(g, breathe, dt);
    } else {
      drawDing(g, breathe, dt);
      drawEvents(g, dt);
    }

    Object.keys(tickGlow).forEach(function (k) { tickGlow[k] = Math.max(0, tickGlow[k] - dt * 0.40); });
    for (var i = 0; i < 8; i++) palaceGlow[i] = Math.max(0, palaceGlow[i] - dt * 0.35);

    requestAnimationFrame(frame);
  }

  function skillIndex(target) {
    if (!target) return -1;
    for (var i = 0; i < SKILLS.length; i++) if (SKILLS[i] === target) return i;
    for (var j = 0; j < SKILLS.length; j++) if (String(target).indexOf(SKILLS[j]) >= 0) return j;
    return -1;
  }

  var KIND_PALACE = { audit: 7, verify: 7, inspect: 7, pack: 2, install: 2, deploy: 3, eval: 4, create: 6, fuse: 6 };

  function onEvent(ev) {
    var g = geo();
    lastAct = performance.now();
    actRate = Math.min(1, actRate + 0.45);

    var idx = skillIndex(ev.target);
    var pos = idx >= 0 ? tickPos(g, idx, SKILLS.length) : { x: g.cx, y: g.cy };
    if (idx >= 0) tickGlow[SKILLS[idx]] = 1;

    var p = KIND_PALACE[ev.kind];
    if (p != null) palaceGlow[p] = Math.min(1, palaceGlow[p] + 0.9);
    if (p === 0) palaceGlow[7] = Math.min(1, palaceGlow[7] + 0.4);

    var color = ev.ok === false ? BAD : OK;
    if (ev.kind === 'audit' || ev.kind === 'verify') {
      ripples.push({ x: pos.x, y: pos.y, r0: 3, spread: g.R * 0.55, t: 0, color: color });
      ripples.push({ x: pos.x, y: pos.y, r0: 3, spread: g.R * 0.55, t: -0.4, color: color });
    } else if (ev.kind === 'pack' || ev.kind === 'install' || ev.kind === 'deploy') {
      drops.push({ x: g.cx + (Math.random() - 0.5) * g.R * 0.7, y: g.cy - g.R * 1.0, r: 2.6, t: 0, ok: ev.ok !== false });
    } else if (ev.kind === 'eval') {
      beams.push({ len: 0, maxLen: g.R * 1.2, t: 0 });
    } else {
      ripples.push({ x: g.cx, y: g.cy, r0: 2, spread: g.R * 0.6, t: 0, color: GOLD });
    }

    events.unshift(ev);
    if (events.length > 60) events.length = 60;
    renderFeed();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function renderFeed() {
    if (!feedEl) return;
    var html = '';
    for (var i = 0; i < Math.min(events.length, 16); i++) {
      var e = events[i];
      var t = new Date(e.ts);
      var hh = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) + ':' + ('0' + t.getSeconds()).slice(-2);
      html += '<div class="obs-row"><span class="obs-t">' + hh + '</span>' +
        '<span class="obs-k' + (e.ok === false ? ' bad' : '') + '">' + esc(e.kind) + '</span>' +
        '<span class="obs-n">' + esc(e.target || '—') + '</span>' +
        '<span class="obs-b">' + esc(trunc(e.brief || '', 46)) + '</span></div>';
    }
    feedEl.innerHTML = html || '<div class="obs-empty">还没有活动。<br>跑一次技能体检，鼎就会亮起来。</div>';
  }

  // 造型切换
  (function buildToggle() {
    if (!stageEl) return;
    var box = document.createElement('div');
    box.style.cssText = 'position:absolute;top:12px;right:12px;display:flex;gap:6px;z-index:3';
    function btn(key, label) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'font:12px/1 inherit;padding:6px 10px;border-radius:999px;cursor:pointer;' +
        'border:1px solid rgba(216,178,106,.35);background:rgba(12,14,18,.7);color:#b9bcc4';
      b.onclick = function () {
        mode = key;
        try { localStorage.setItem('zh-obs-shape', key); } catch (e) {}
        paint();
      };
      return b;
    }
    var b1 = btn('ding', '鼎');
    var b2 = btn('bagua', '卦');
    box.appendChild(b1); box.appendChild(b2);
    stageEl.appendChild(box);
    function paint() {
      b1.style.background = mode === 'ding' ? 'rgba(216,178,106,.22)' : 'rgba(12,14,18,.7)';
      b1.style.color = mode === 'ding' ? '#e6c98d' : '#b9bcc4';
      b2.style.background = mode === 'bagua' ? 'rgba(216,178,106,.22)' : 'rgba(12,14,18,.7)';
      b2.style.color = mode === 'bagua' ? '#e6c98d' : '#b9bcc4';
    }
    paint();
    buildToggle.paint = paint;
  })();

  var since = 0;

  function setMeta(text, live) {
    if (!metaEl) return;
    metaEl.textContent = text;
    metaEl.className = 'obs-meta' + (live ? ' live' : '');
  }

  function connect() {
    if (typeof fetch !== 'function') return;
    fetch(BRIDGE + '/history')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var list = (d.events || []).slice().reverse();
        list.forEach(function (e) { since = Math.max(since, e.seq || 0); onEvent(e); });
        setMeta('桥已连接 · 历史 ' + list.length + ' 条', true);
      })
      .catch(function () { setMeta('桥没连上：先跑 patch\\start-app.ps1', false); });

    if (!window.EventSource) return;
    var es = new EventSource(BRIDGE + '/events?since=' + since);
    es.onmessage = function (m) {
      try {
        var ev = JSON.parse(m.data);
        if (ev.seq) since = Math.max(since, ev.seq);
        onEvent(ev);
        setMeta('实时 · seq ' + since, true);
      } catch (err) {}
    };
    es.onerror = function () { setMeta('事件流断开，正在重连…', false); };
  }

  resize();
  frame(performance.now());
  renderFeed();
  connect();
})();
