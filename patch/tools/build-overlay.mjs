/**
 * 由 patch\overlay\launcher.html 生成 patch\zhaohua-ui\overlay.js（外链版）
 * 目的：覆盖层不再整段内联进 index.html，而是同源外链 + 构建戳，避免 WebView2 缓存静态页
 * 产物自包含：自带 <style>、自建 DOM、自带行为（1 关 / 2 造化鼎 / Esc 关）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const SRC = ROOT + '\\patch\\overlay\\launcher.html';
const OUT = ROOT + '\\patch\\zhaohua-ui\\overlay.js';

const html = readFileSync(SRC, 'utf8');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error('launcher.html 里没找到 <style>');
const css = styleMatch[1].trim();

const divMatch = html.match(/<div id="cauldron-launcher"[\s\S]*?<\/div>\s*<script>[\s\S]*?<\/script>\s*<\/div>/);
if (!divMatch) throw new Error('launcher.html 结构不符合预期');
const markup = divMatch[0]
  .replace(/<script>[\s\S]*?<\/script>/, '')
  .replace(/<\/style>/, '</style>')
  .trim();

const js = `/* 造化乾坤鼎 · 启动覆盖层（外链版，由 patch\\tools\\build-overlay.mjs 生成，勿手改）
   幂等：已存在 #cauldron-launcher 则不再插入
   行为：乾坤鼎→移除本层露出欢迎页；造化鼎→同源跳转 /zhaohua/index.html；1/2/Esc 快捷键 */
(function () {
  if (document.getElementById('cauldron-launcher')) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', arguments.callee); return; }

  var CSS = ${JSON.stringify(css)};
  var HTML = ${JSON.stringify(markup)};

  var style = document.createElement('style');
  style.id = 'cauldron-launcher-style';
  style.textContent = CSS;
  document.head.appendChild(style);

  var host = document.createElement('div');
  host.innerHTML = HTML;
  var root = host.firstElementChild;
  if (!root) return;
  document.documentElement.appendChild(root);

  var toast = document.getElementById('cl-toast');
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('cl-show');
    setTimeout(function () { toast.classList.remove('cl-show'); }, 2400);
  }

  function dismiss() {
    root.style.transition = 'opacity .22s ease';
    root.style.opacity = '0';
    setTimeout(function () { root.remove(); }, 220);
  }

  function openZhaohua() {
    say('正在打开造化鼎…');
    location.href = '/zhaohua/index.html';
  }

  root.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-cl]') : null;
    if (!btn) return;
    if (btn.dataset.cl === 'studio') dismiss();
    else if (btn.dataset.cl === 'zhaohua') openZhaohua();
  });

  document.addEventListener('keydown', function (e) {
    if (!document.body.contains(root)) return;
    if (e.key === '1') { e.preventDefault(); dismiss(); }
    else if (e.key === '2') { e.preventDefault(); openZhaohua(); }
    else if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
  });
})();
`;

if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, js, 'utf8');

const hash = createHash('sha256').update(js).digest('hex').slice(0, 8);
console.log('已生成 ' + OUT);
console.log('  字节 ' + Buffer.byteLength(js, 'utf8') + ' · 构建戳 ' + hash);
console.log('  内联样式 ' + css.length + ' 字符 · 标记 ' + markup.length + ' 字符');
