import Schema from '@deepseek-ai/schemastery';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { emptySnapshot, mergeSnapshots, normalizeExport } from '../src/snapshot.mjs';

const run = promisify(execFile);

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
      const { stdout } = await run(engineBin, [config.engineScript, 'export', '--product', file, '--json'], {
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      });
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
