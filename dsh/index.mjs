import Schema from '@deepseek-ai/schemastery';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptySnapshot, mergeSnapshots, normalizeExport } from '../src/snapshot.mjs';

function runEngine(bin, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.stderr.on('data', (chunk) => {
      err += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout: out, stderr: err }));
  });
}

export const name = 'cauldron-workbench';
export const inject = ['connection'];

export const Config = Schema.object({
  engineBin: Schema.string()
    .default('')
    .description('引擎入口：留空用当前进程的 node（Electron 下走 ELECTRON_RUN_AS_NODE）；也可填绝对路径。'),
  engineScript: Schema.string()
    .default('core/bin/zhaohua.mjs')
    .description('zhaohua 脚本路径（相对工作区或绝对路径）。'),
  products: Schema.array(Schema.string())
    .default([])
    .description('要纳入工作台的产品定义文件路径（qiankunding.product.json 等）。'),
  cacheMs: Schema.number().default(5000).description('快照缓存时间（毫秒），避免每次刷新都起子进程。'),
});

const API = '/api/cauldron-workbench';

export function apply(ctx, config) {
  let cache = { at: 0, value: null };
  let neuralUrl = '';
  let neuralReady = Promise.resolve();
  let neuralServer = null;

  async function buildSnapshot() {
    const products = Array.isArray(config.products) ? config.products.filter(Boolean) : [];
    if (products.length === 0) return emptySnapshot('还没有配置产品路径（config.products 为空）');
    const engineBin = config.engineBin?.trim() || process.execPath;
    const entries = [];
    for (const file of products) {
      const result = await runEngine(engineBin, [config.engineScript, 'export', '--product', file, '--json'], {
        cwd: process.cwd(),
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      });
      const stdout = typeof result?.stdout === 'string' ? result.stdout : '';
      if (result?.code !== 0 || stdout.trim() === '') {
        const detail = (result?.stderr || '').trim().slice(0, 400) || `退出码 ${result?.code}，stdout ${stdout.length} 字节`;
        throw new Error(`引擎没有输出 JSON（${detail}）`);
      }
      entries.push(normalizeExport(JSON.parse(stdout), { file }));
    }
    return mergeSnapshots(entries);
  }

  async function snapshot() {
    const now = Date.now();
    if (cache.value && now - cache.at < config.cacheMs) return cache.value;
    try {
      const value = await buildSnapshot();
      cache = { at: now, value };
      return value;
    } catch (error) {
      return emptySnapshot(`快照生成失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const fedDir = path.join(here, '..', 'web', 'fed');
    const distCandidate = path.join(here, '..', 'web-neural', 'dist-actual');
    const neuralDir = fs.existsSync(distCandidate) ? distCandidate : path.join(here, '..', 'web-neural', 'dist');
    const MIME = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
    };
    const serve = (filePath) => async () => {
      const body = readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return new Response(body, {
        status: 200,
        headers: { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': 'no-store' },
      });
    };
    const walk = (dir, prefix) => {
      const out = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) out.push(...walk(full, rel));
        else out.push({ rel, full });
      }
      return out;
    };
    const startNeuralServer = (dir) => {
    const MIME2 = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
    };
    const server = createServer((req, res) => {
      try {
        const clean = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
        if (rel === 'snapshot.json') {
          snapshot()
            .then((value) => {
              res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
              res.end(Buffer.from(JSON.stringify(value), 'utf8'));
            })
            .catch((error) => {
              res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
              res.end(Buffer.from(JSON.stringify({ error: error?.message ?? String(error) }), 'utf8'));
            });
          return;
        }
        const file = path.join(dir, rel);
        if (!file.startsWith(dir)) {
          res.writeHead(403).end('forbidden');
          return;
        }
        const body = readFileSync(file);
        res.writeHead(200, {
          'content-type': MIME2[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    neuralReady = new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        neuralUrl = `http://127.0.0.1:${server.address().port}/`;
        resolve();
      });
    });
    return server;
  };
  const registerStatic = (routePath, filePath) => {
      try {
        ctx.connection.fetch.register({
          path: routePath,
          methods: ['GET'],
          requestBody: 'buffered',
          async fetch() {
            return serve(filePath)();
          },
        });
      } catch (error) {
        console.warn('[cauldron-workbench] 静态路由注册失败:', routePath, error?.message ?? error);
      }
    };
    neuralServer = startNeuralServer(neuralDir);
    registerStatic(`${API}/fed/neural`, path.join(neuralDir, 'index.html'));
    for (const file of walk(neuralDir, '')) registerStatic(`${API}/fed/neural/${file.rel}`, file.full);
    registerStatic(`${API}/fed/agent-display`, path.join(fedDir, 'agent-display.html'));
  } catch (error) {
    console.warn('[cauldron-workbench] 看板静态资源准备失败:', error);
  }

  try {
    ctx.connection.fetch.register({
      path: `${API}/neural-url`,
      methods: ['GET'],
      requestBody: 'buffered',
      async fetch() {
        await Promise.race([neuralReady, new Promise((resolve) => setTimeout(resolve, 2000))]);
        if (!neuralUrl) return Response.json({ ok: false, error: 'neural server not ready' }, { status: 503 });
        return Response.json({ ok: true, url: neuralUrl }, { status: 200, headers: { 'cache-control': 'no-store' } });
      },
    });
  } catch (error) {
    console.warn('[cauldron-workbench] 看板地址路由注册失败:', error);
  }

  try {
    ctx.connection.fetch.register({
      path: `${API}/snapshot`,
      methods: ['GET'],
      requestBody: 'buffered',
      async fetch() {
        const value = await snapshot();
        await Promise.race([neuralReady, new Promise((resolve) => setTimeout(resolve, 1500))]);
        return Response.json({ ...value, neural_url: neuralUrl || '' }, { status: 200, headers: { 'cache-control': 'no-store' } });
      },
    });
  } catch (error) {
    console.warn('[cauldron-workbench] 路由注册失败（面板仍可打开，仅无法拉快照）:', error);
  }

  return {
    snapshot,
    dispose() {
      cache = { at: 0, value: null };
      try { neuralServer?.close(); } catch {}
    },
  };
}
