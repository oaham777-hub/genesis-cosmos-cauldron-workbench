/**
 * 把观象台左下三张「程序生成的装饰画」换成真数据（幂等）
 * - 来料来源 #routes  ← /sources（乾坤鼎九层：份数 / 已投放 / 未投放）
 * - 断言校验缓冲      ← /eval-runs + /eval-run（12 断言 × 两臂命中）
 * - 方法索引          ← /distill（16 技能 × references 已投放/总数）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const FILE = join(ROOT, 'patch', 'zhaohua-ui', 'obs-console.html');
const MARK = '/* ==== console-real-data:start ==== */';

let html = readFileSync(FILE, 'utf8');

if (html.includes(MARK)) {
  console.log('已打过补丁（幂等跳过）');
  process.exit(0);
}

const BRIDGE = 'http://127.0.0.1:8791';

/* ---------- 1) routes ---------- */
const routesStart = html.indexOf('// --- routes ---');
const routesEnd = html.indexOf('renderRoutes();', routesStart);
if (routesStart < 0 || routesEnd < 0) throw new Error('找不到 routes 段');
const routesOld = html.slice(routesStart, routesEnd + 'renderRoutes();'.length);

const routesNew = `// --- routes：乾坤鼎九层来料（真数据，/sources） ---
const routesEl = document.getElementById('routes');
function renderRoutesReal(d) {
  if (!routesEl) return;
  const by = {};
  for (const s of (d.sources || [])) {
    const k = s.layer || '?';
    by[k] = by[k] || { n: 0, in: 0 };
    by[k].n += 1;
    if (s.stamped) by[k].in += 1;
  }
  const rows = Object.entries(by).sort(function (a, b) { return b[1].n - a[1].n; });
  let h = '<span class="h">九层</span><span class="h">份</span><span class="h">投放</span><span class="h">未投</span>';
  for (const r of rows) {
    h += '<span class="nm">' + r[0] + '</span>' +
      '<span>' + r[1].n + '</span>' +
      '<span class="' + (r[1].in ? 'done' : '') + '">' + r[1].in + '</span>' +
      '<span>' + (r[1].n - r[1].in) + '</span>';
  }
  routesEl.innerHTML = h;
  const cap = routesEl.parentElement && routesEl.parentElement.querySelector('.cap');
  if (cap) cap.textContent = '乾坤鼎九层 · ' + d.total + ' 份来料 · 已投放 ' + (d.total - d.unstamped) + ' · 未投放 ' + d.unstamped;
}
function pullRoutes() {
  fetch('${BRIDGE}/sources').then(function (r) { return r.json(); }).then(renderRoutesReal).catch(function () {});
}
pullRoutes();`;

/* ---------- 2) drawVal ---------- */
const valStart = html.indexOf('let valBuf = [[], [], []], valSpike = 0;');
const valEnd = html.indexOf('const IDX = Array.from');
if (valStart < 0 || valEnd < 0) throw new Error('找不到 drawVal 段');
const valOld = html.slice(valStart, valEnd);

const valNew = `let VAL = null;
function loadVal() {
  fetch('${BRIDGE}/eval-runs').then(function (r) { return r.json(); }).then(function (d) {
    const first = (d.runs || [])[0];
    if (!first) return null;
    return fetch('${BRIDGE}/eval-run?file=' + encodeURIComponent(first.file)).then(function (r) { return r.json(); });
  }).then(function (j) {
    if (!j || !j.ok) return;
    const ev = j.evidence || {};
    const sum = ev.summary || {};
    const arms = Object.keys(sum);
    const a = arms[0], b = arms[1];
    const setOf = function (arm) {
      const s = new Set();
      for (const row of (ev.rows || [])) {
        if (row.arm !== arm) continue;
        for (const h of (row.hits || [])) s.add(h);
      }
      return s;
    };
    VAL = {
      assertions: (ev.assertions || []),
      a: setOf(a),
      b: setOf(b),
      sa: (sum[a] || {}).hit + '/' + (sum[a] || {}).total,
      sb: (sum[b] || {}).hit + '/' + (sum[b] || {}).total,
      na: a, nb: b,
    };
  }).catch(function () {});
}
function drawVal() {
  const x = cVal.x, w = cVal.w, h = cVal.h;
  x.clearRect(0, 0, w, h);
  x.font = '800 7px ' + FONT; x.textBaseline = 'middle';
  if (!VAL) { x.fillStyle = '#6b6f78'; x.fillText('读取最新证据…', 4, h / 2); return; }
  const A = VAL.assertions, n = Math.max(1, A.length);
  const left = 14, right = 40;
  const cell = (w - left - right) / n;
  [['A', VAL.a, VAL.sa], ['B', VAL.b, VAL.sb]].forEach(function (arm, r) {
    const yc = h * (r === 0 ? 0.32 : 0.68);
    x.fillStyle = '#9a9ea7';
    x.fillText(arm[0], 0, yc);
    for (let i = 0; i < n; i++) {
      x.fillStyle = arm[1].has(A[i]) ? '#e6e8ec' : '#1c1e23';
      x.fillRect(left + i * cell, yc - 7, Math.max(2, cell - 2), 14);
    }
    x.fillStyle = '#9a9ea7';
    x.fillText(arm[2], w - right + 2, yc);
  });
  x.fillStyle = '#4a4e56'; x.font = '600 6px ' + FONT;
  x.fillText(n + ' 条断言 × 两臂 · 最新证据', left, h - 4);
}
loadVal();

`;

/* ---------- 3) drawIdx ---------- */
const idxStart = html.indexOf('const IDX = Array.from');
const idxEnd = html.indexOf('/* =========================================================', idxStart);
if (idxStart < 0 || idxEnd < 0) throw new Error('找不到 drawIdx 段');
const idxOld = html.slice(idxStart, idxEnd);

const idxNew = `let IDXD = null;
function loadIdx() {
  fetch('${BRIDGE}/distill').then(function (r) { return r.json(); }).then(function (d) {
    IDXD = (d.skills || []).map(function (s) {
      const short = String(s.skill || '').replace(/^film-/, '').replace(/^ai-/, '').slice(0, 9);
      return { short: short, total: (s.layers.refs || {}).total || 0, got: (s.layers.refs || {}).in || 0 };
    }).sort(function (a, b) { return b.total - a.total; });
  }).catch(function () {});
}
function drawIdx() {
  const x = cIdx.x, w = cIdx.w, h = cIdx.h;
  x.clearRect(0, 0, w, h);
  x.textBaseline = 'middle';
  if (!IDXD) { x.font = '800 7px ' + FONT; x.fillStyle = '#6b6f78'; x.fillText('读取蒸馏地图…', 4, h / 2); return; }
  const rows = IDXD.slice(0, 16);
  const rh = h / Math.max(1, rows.length);
  const lx = 58, right = 30;
  const maxw = Math.max(20, w - lx - right);
  x.font = '700 6.5px ' + FONT;
  rows.forEach(function (s, i) {
    const y = i * rh + rh / 2;
    x.fillStyle = '#6b6f78';
    x.fillText(s.short, 0, y);
    x.fillStyle = '#1c1e23';
    x.fillRect(lx, i * rh + 1, maxw, Math.max(1, rh - 2));
    if (s.got) {
      x.fillStyle = '#e6e8ec';
      x.fillRect(lx, i * rh + 1, Math.max(1, maxw * (s.got / Math.max(1, s.total))), Math.max(1, rh - 2));
    }
    x.fillStyle = s.got ? '#e6e8ec' : '#6b6f78';
    x.fillText(s.got + '/' + s.total, w - right + 2, y);
  });
}
loadIdx();

`;

html = html.replace(routesOld, routesNew).replace(valOld, valNew).replace(idxOld, idxNew);
html = html.replace('</body>', MARK + '\n<!-- console-real-data:end -->\n</body>');

writeFileSync(FILE, html, 'utf8');
console.log('已改写：routes / drawVal / drawIdx → 真数据');
