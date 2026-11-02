const fs = require('node:fs');
const p = 'public/cauldron-overlay.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  "const host = el('div');\n  host.id = 'cw-overlay';\n  host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:5';\n  parent.appendChild(host);",
  "const host = el('div');\n  host.id = 'cw-overlay';\n  host.style.cssText = 'position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:5';\n  core.appendChild(host);"
);
s = s.replace(
  "if (!host.isConnected) {\n      if (parent.contains(core)) parent.appendChild(host);\n      else return;\n    }\n    if (!core.isConnected) return;\n    const w = core.offsetWidth || 460;\n    const h = core.offsetHeight || 460;\n    host.style.left = `${core.offsetLeft + w / 2}px`;\n    host.style.top = `${core.offsetTop + h / 2}px`;\n    // 藏掉原生星核视觉（保留尺寸供定位）\n    if (core.style.opacity !== '0') core.style.opacity = '0';\n    if (core.style.visibility !== 'hidden') core.style.visibility = 'hidden';",
  "if (!host.isConnected) {\n      if (core.isConnected) core.appendChild(host);\n      else return;\n    }\n    const w = core.offsetWidth || 460;\n    // 藏掉星核自己的发光图层（只藏子层，核心按钮/父级布局都保留）\n    for (const sel of ['.cs-halo', '.cs-flare', '.cs-v41', '.cs-dust', '.cs-corona', '.cs-nucleus', '.cs-rays']) {\n      for (const layer of core.querySelectorAll(sel)) {\n        if (layer.style.display !== 'none') layer.style.display = 'none';\n      }\n    }"
);
fs.writeFileSync(p, s, 'utf8');
console.log('patched', s.includes(\"core.appendChild(host)\"), s.includes('.cs-v41'));
