import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySnapshot, mergeSnapshots, normalizeExport, SNAPSHOT_SCHEMA } from '../src/snapshot.mjs';

const exported = (overrides = {}) => ({
  schema: 'cauldron-snapshot/v1',
  engine: { version: '0.7.47', generated_at: '2026-11-02T11:00:00.000Z' },
  products: [
    {
      id: 'demo',
      name: '示例产品',
      version: '0.1.0',
      skills: [
        { id: 'b-layer', bytes: 2048 },
        { id: 'a-layer', bytes: 1024 },
      ],
    },
  ],
  ...overrides,
});

test('normalizeExport 按 id 排序并汇总字节', () => {
  const entry = normalizeExport(exported(), { file: 'demo.product.json' });
  assert.equal(entry.engineVersion, '0.7.47');
  assert.deepEqual(entry.products[0].skills.map((skill) => skill.id), ['a-layer', 'b-layer']);
  assert.equal(entry.products[0].totals.bytes, 3072);
  assert.equal(entry.products[0].file, 'demo.product.json');
});

test('normalizeExport 拒绝缺 products 的快照', () => {
  assert.throws(() => normalizeExport({ engine: {} }), /products/);
  assert.throws(() => normalizeExport({ products: [] }), /没有任何产品/);
});

test('mergeSnapshots 去重且引擎版本取首份', () => {
  const first = normalizeExport(exported());
  const second = normalizeExport(
    exported({
      engine: { version: '9.9.9', generated_at: '2026-12-01T00:00:00.000Z' },
      products: [
        { id: 'demo', name: '示例产品改名', version: '0.2.0', skills: [{ id: 'a-layer', bytes: 4096 }] },
        { id: 'other', name: '第二产品', version: '0.0.1', skills: [] },
      ],
    }),
  );
  const merged = mergeSnapshots([first, second]);
  assert.equal(merged.schema, SNAPSHOT_SCHEMA);
  assert.equal(merged.engine.version, '0.7.47');
  assert.equal(merged.products.length, 2);
  assert.equal(merged.products.find((product) => product.id === 'demo').version, '0.2.0');
  assert.equal(merged.totals.products, 2);
  assert.equal(merged.totals.bytes, 4096);
});

test('emptySnapshot 带 warning 且 totals 全 0', () => {
  const snapshot = emptySnapshot('没有配置产品');
  assert.equal(snapshot.products.length, 0);
  assert.equal(snapshot.totals.skills, 0);
  assert.match(snapshot.warning, /没有配置产品/);
});
