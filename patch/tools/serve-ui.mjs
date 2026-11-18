// 固定端口的静态服务：把 patch\zhaohua-ui 挂到 127.0.0.1:8799，方便浏览器直接看
import { join, extname, normalize } from 'node:path';
import { existsSync, statSync } from 'node:fs';

const ROOT = 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui';
const PORT = Number(process.env.UI_PORT || 8799);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

Bun.serve({
  hostname: '127.0.0.1',
  port: PORT,
  idleTimeout: 120,
  async fetch(req) {
    const url = new URL(req.url);
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/obs-picker.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
      return new Response('not found: ' + p, { status: 404, headers: { 'access-control-allow-origin': '*' } });
    }
    return new Response(Bun.file(file), {
      headers: {
        'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      },
    });
  },
});
console.log(`UI 静态服务：http://127.0.0.1:${PORT}/`);
