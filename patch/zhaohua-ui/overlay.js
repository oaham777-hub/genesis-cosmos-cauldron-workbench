/* 造化乾坤鼎 · 启动覆盖层（外链版，由 patch\tools\build-overlay.mjs 生成，勿手改）
   幂等：已存在 #cauldron-launcher 则不再插入
   行为：乾坤鼎→移除本层露出欢迎页；造化鼎→同源跳转 /zhaohua/index.html；1/2/Esc 快捷键 */
(function () {
  if (document.getElementById('cauldron-launcher')) return;
  if (!document.body) { document.addEventListener('DOMContentLoaded', arguments.callee); return; }

  var CSS = "#cauldron-launcher {\n      position: fixed; inset: 0; z-index: 2147483000;\n      display: flex; align-items: center; justify-content: center;\n      background: radial-gradient(120% 120% at 50% 0%, #12232b 0%, #0a0d10 60%, #06080a 100%);\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif;\n      color: #e8eef2;\n      animation: cl-fade .35s ease both;\n    }\n    #cauldron-launcher .cl-card { width: min(560px, 86vw); text-align: center; }\n    #cauldron-launcher .cl-kicker {\n      font-size: 12px; letter-spacing: .22em; text-transform: uppercase;\n      color: #6f8794; margin-bottom: 18px;\n    }\n    #cauldron-launcher h1 {\n      font-size: 30px; line-height: 1.3; font-weight: 600; margin: 0 0 10px;\n      letter-spacing: .02em;\n    }\n    #cauldron-launcher p.cl-sub { font-size: 13px; color: #8a9ba6; margin: 0 0 34px; }\n    #cauldron-launcher .cl-actions { display: flex; gap: 14px; justify-content: center; }\n    #cauldron-launcher button {\n      flex: 1 1 0; min-width: 168px; cursor: pointer;\n      padding: 16px 20px; border-radius: 12px;\n      border: 1px solid rgba(255,255,255,.14);\n      background: rgba(255,255,255,.04); color: #e8eef2;\n      font-size: 15px; font-weight: 500; font-family: inherit;\n      transition: background .18s, border-color .18s, transform .12s;\n    }\n    #cauldron-launcher button:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.26); }\n    #cauldron-launcher button:active { transform: translateY(1px); }\n    #cauldron-launcher button.cl-primary {\n      background: #e8eef2; color: #0b1114; border-color: transparent;\n    }\n    #cauldron-launcher button.cl-primary:hover { background: #fff; }\n    #cauldron-launcher .cl-hint { margin-top: 22px; font-size: 12px; color: #5f7480; }\n    #cauldron-launcher .cl-hint kbd {\n      font-family: inherit; font-size: 11px; padding: 1px 5px; border-radius: 4px;\n      border: 1px solid rgba(255,255,255,.18); color: #8a9ba6;\n    }\n    #cauldron-launcher .cl-toast {\n      margin-top: 16px; min-height: 18px; font-size: 12px; color: #c9a227;\n      opacity: 0; transition: opacity .2s;\n    }\n    #cauldron-launcher .cl-toast.cl-show { opacity: 1; }\n    @keyframes cl-fade { from { opacity: 0 } to { opacity: 1 } }";
  var HTML = "<div id=\"cauldron-launcher\" role=\"dialog\" aria-modal=\"true\" aria-label=\"选择工作台\">\n  <style>\n    #cauldron-launcher {\n      position: fixed; inset: 0; z-index: 2147483000;\n      display: flex; align-items: center; justify-content: center;\n      background: radial-gradient(120% 120% at 50% 0%, #12232b 0%, #0a0d10 60%, #06080a 100%);\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif;\n      color: #e8eef2;\n      animation: cl-fade .35s ease both;\n    }\n    #cauldron-launcher .cl-card { width: min(560px, 86vw); text-align: center; }\n    #cauldron-launcher .cl-kicker {\n      font-size: 12px; letter-spacing: .22em; text-transform: uppercase;\n      color: #6f8794; margin-bottom: 18px;\n    }\n    #cauldron-launcher h1 {\n      font-size: 30px; line-height: 1.3; font-weight: 600; margin: 0 0 10px;\n      letter-spacing: .02em;\n    }\n    #cauldron-launcher p.cl-sub { font-size: 13px; color: #8a9ba6; margin: 0 0 34px; }\n    #cauldron-launcher .cl-actions { display: flex; gap: 14px; justify-content: center; }\n    #cauldron-launcher button {\n      flex: 1 1 0; min-width: 168px; cursor: pointer;\n      padding: 16px 20px; border-radius: 12px;\n      border: 1px solid rgba(255,255,255,.14);\n      background: rgba(255,255,255,.04); color: #e8eef2;\n      font-size: 15px; font-weight: 500; font-family: inherit;\n      transition: background .18s, border-color .18s, transform .12s;\n    }\n    #cauldron-launcher button:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.26); }\n    #cauldron-launcher button:active { transform: translateY(1px); }\n    #cauldron-launcher button.cl-primary {\n      background: #e8eef2; color: #0b1114; border-color: transparent;\n    }\n    #cauldron-launcher button.cl-primary:hover { background: #fff; }\n    #cauldron-launcher .cl-hint { margin-top: 22px; font-size: 12px; color: #5f7480; }\n    #cauldron-launcher .cl-hint kbd {\n      font-family: inherit; font-size: 11px; padding: 1px 5px; border-radius: 4px;\n      border: 1px solid rgba(255,255,255,.18); color: #8a9ba6;\n    }\n    #cauldron-launcher .cl-toast {\n      margin-top: 16px; min-height: 18px; font-size: 12px; color: #c9a227;\n      opacity: 0; transition: opacity .2s;\n    }\n    #cauldron-launcher .cl-toast.cl-show { opacity: 1; }\n    @keyframes cl-fade { from { opacity: 0 } to { opacity: 1 } }\n  </style>\n\n  <div class=\"cl-card\">\n    <div class=\"cl-kicker\">ZAOHUA CAULDRON</div>\n    <h1>造化乾坤鼎</h1>\n    <p class=\"cl-sub\">选一个入口开始。乾坤鼎与造化鼎共用同一套技能与资产。</p>\n\n    <div class=\"cl-actions\">\n      <button type=\"button\" class=\"cl-primary\" data-cl=\"studio\">乾坤鼎</button>\n      <button type=\"button\" data-cl=\"zhaohua\">造化鼎</button>\n    </div>\n\n    <div class=\"cl-toast\" id=\"cl-toast\" role=\"status\" aria-live=\"polite\"></div>\n    <div class=\"cl-hint\">按 <kbd>1</kbd> 进入乾坤鼎 · 按 <kbd>2</kbd> 打开造化鼎 · 按 <kbd>Esc</kbd> 关闭本层</div>\n  </div>\n\n  \n</div>";

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
