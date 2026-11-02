import Schema from '@deepseek-ai/schemastery';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
    ctx.connection.fetch.register({
      path: `${API}/fed/agent-display`,
      methods: ['GET'],
      requestBody: 'buffered',
      async fetch() {
        const html = readFileSync(path.join(fedDir, 'agent-display.html'), 'utf8');
        return new Response(html, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        });
      },
    });
  } catch (error) {
    console.warn('[cauldron-workbench] 看板静态路由注册失败:', error);
  }

  try {
    ctx.connection.fetch.register({
      path: `${API}/snapshot`,
      methods: ['GET'],
      requestBody: 'buffered',
      async fetch() {
        const value = await snapshot();
        return Response.json(value, { status: 200, headers: { 'cache-control': 'no-store' } });
      },
    });
  } catch (error) {
    console.warn('[cauldron-workbench] 路由注册失败（面板仍可打开，仅无法拉快照）:', error);
  }

  return {
    snapshot,
    dispose() {
      cache = { at: 0, value: null };
    },
  };
}
