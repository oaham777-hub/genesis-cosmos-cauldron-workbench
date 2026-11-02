import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dist = 'D:/造化乾坤鼎-工作台/web-neural/dist';
const htmlPath = path.join(dist, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

const assetsDir = path.join(dist, 'assets');
for (const file of readdirSync(assetsDir)) {
  const full = path.join(assetsDir, file);
  const content = readFileSync(full, 'utf8');
  if (file.endsWith('.js')) {
    const re = new RegExp(`<script[^>]*src="[^"]*${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></script>`);
    html = html.replace(re, `<script type="module">\n${content}\n</script>`);
  } else if (file.endsWith('.css')) {
    const re = new RegExp(`<link[^>]*href="[^"]*${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
    html = html.replace(re, `<style>\n${content}\n</style>`);
  }
}
writeFileSync(path.join(dist, 'index.html'), html, 'utf8');
console.log('inlined html bytes', Buffer.byteLength(html));
