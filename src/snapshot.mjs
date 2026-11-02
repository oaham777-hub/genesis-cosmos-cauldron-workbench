/**
 * 快照归一化：把 `zhaohua export --product … --json` 的输出合并成工作台可渲染的形状。
 * 纯函数，不读盘、不起子进程——便于单测。
 */

export const SNAPSHOT_SCHEMA = 'cauldron-snapshot/v1';

function bytesOf(skill) {
  return Number.isFinite(skill?.bytes) ? skill.bytes : 0;
}

function normalizeProduct(product, file) {
  const skills = Array.isArray(product?.skills) ? product.skills : [];
  return {
    file: file ?? product?.file ?? null,
    id: product?.id ?? 'unknown',
    name: product?.name ?? product?.id ?? '未命名产品',
    version: product?.version ?? null,
    skills_root: product?.skills_root ?? null,
    skills: skills
      .map((skill) => ({
        id: skill?.id ?? 'unknown',
        layer: skill?.layer ?? null,
        path: skill?.path ?? null,
        bytes: bytesOf(skill),
      }))
      .sort((left, right) => String(left.id).localeCompare(String(right.id))),
    totals: {
      skills: skills.length,
      bytes: skills.reduce((sum, skill) => sum + bytesOf(skill), 0),
    },
  };
}

/** 单份 export 输出 → 产品条目；不合法时抛错，让调用方给出可读诊断。 */
export function normalizeExport(exported, { file } = {}) {
  if (!exported || typeof exported !== 'object' || !Array.isArray(exported.products)) {
    throw new Error('快照缺少 products 数组，无法归一化');
  }
  const products = exported.products.map((product) => normalizeProduct(product, file));
  if (products.length === 0) throw new Error('快照里没有任何产品');
  return { engineVersion: exported.engine?.version ?? null, generatedAt: exported.engine?.generated_at ?? null, products };
}

/** 合并多份 export 输出；引擎版本取第一份，产品按 id 去重（后者覆盖）。 */
export function mergeSnapshots(entries) {
  const merged = new Map();
  let engineVersion = null;
  let generatedAt = null;
  for (const entry of entries) {
    if (!entry) continue;
    engineVersion ??= entry.engineVersion;
    generatedAt ??= entry.generatedAt;
    for (const product of entry.products) merged.set(product.id, product);
  }
  const products = [...merged.values()];
  return {
    schema: SNAPSHOT_SCHEMA,
    engine: { version: engineVersion, generated_at: generatedAt },
    products,
    totals: {
      products: products.length,
      skills: products.reduce((sum, product) => sum + product.totals.skills, 0),
      bytes: products.reduce((sum, product) => sum + product.totals.bytes, 0),
    },
  };
}

/** 给客户端判空/降级用：无产品时返回空快照而不是抛错。 */
export function emptySnapshot(reason) {
  return {
    schema: SNAPSHOT_SCHEMA,
    engine: { version: null, generated_at: null },
    products: [],
    totals: { products: 0, skills: 0, bytes: 0 },
    warning: reason ?? '还没有产品快照',
  };
}
