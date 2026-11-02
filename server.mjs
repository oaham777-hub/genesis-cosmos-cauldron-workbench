import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = join(import.meta.dirname, 'web');
const PORT = Number(process.env.PORT ?? 5199);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, `http://localhost:${PORT}`).pathname);
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  if (!file.startsWith(ROOT)) {
    response.statusCode = 403;
    response.end('forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    response.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
    response.end(body);
  } catch {
    response.statusCode = 404;
    response.end('not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`workbench: http://127.0.0.1:${PORT}`);
});
