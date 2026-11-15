// 外部来料：扫描 → 判层 → 确认投放
// 用法：
//   bun ingest.mjs scan   --path "<文件夹|zip|单个文件>" [--json]
//   bun ingest.mjs ingest --path "<...>" --name <包名> [--confirm]
//   bun ingest.mjs suggest --file "<解压/来源里的某个 md|txt>" [--json]
//   bun ingest.mjs kind   --file "<md|txt>" [--json]
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename, extname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const SOURCES = join(ROOT, 'patch', 'sources');
const SKILLS = join(ROOT, 'patch', 'skills');
const SRC_LEDGER = join(ROOT, 'patch', 'ledger', 'sources.jsonl');

const argv = process.argv.slice(2);
const cmd = argv[0];
const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const has = (n) => argv.includes(n);
const out = (o) => console.log(JSON.stringify(o, null, 2));
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const appendJsonl = (p, row) => { mkdirSync(dirname(p), { recursive: true }); const prev = existsSync(p) ? readFileSync(p, 'utf8') : ''; writeFileSync(p, prev + JSON.stringify(row) + '\n', 'utf8'); };

// —— 来料分级：method 方法 / ledger 台账 / spec 规范 / example 样例 / code 代码 ——
const LEDGER_RE = /(^|\/)(absorbed|index|merge-map|thickening-log|decision-registry|system-decisions|anomaly-report|external-adoption|STATE-CARD|RESUME|PROJECT-STATE|instruction-files|sources|imports-codex)\b/i;
const SPEC_RE = /(^|\/)(specs?)\//i;
const EXAMPLE_RE = /(example|template|样例|示例|sample)/i;
const CODE_EXT = new Set(['.js', '.ts', '.mjs', '.cjs', '.json', '.yaml', '.yml', '.py', '.sh', '.ps1', '.command', '.html', '.css']);
const TEXT_EXT = new Set(['.md', '.txt', '.markdown']);

function kindOf(rel, text) {
  const r = rel.replace(/\\/g, '/');
  if (LEDGER_RE.test(r)) return 'ledger';
  if (SPEC_RE.test(r)) return 'spec';
  if (text && /投喂来源吸收|逐字副本|台账/.test(text.slice(0, 1200))) return 'ledger';
  if (EXAMPLE_RE.test(r)) return 'example';
  if (CODE_EXT.has(extname(r).toLowerCase())) return 'code';
  return 'method';
}

// —— 判层：按阶段技能的关键词画像打分（确定性、可复核） ——
const PROFILES = [
  { skill: 'film-shotlist', stage: '07.5', kw: { 镜号: 6, 景别: 6, 机位: 6, 轴线: 5, 运镜: 5, 构图: 4, 视点: 4, 分镜: 6, 镜头表: 6, 镜表: 6, shotlist: 8, coverage: 3, 首帧: 3 } },
  { skill: 'film-acting', stage: '08', kw: { 表演: 8, 情绪: 5, 微表情: 5, 节拍: 4, 目标: 2, 障碍: 2, 动作: 3, 呼吸: 3, acting: 8, beat: 3, 表演块: 6 } },
  { skill: 'film-cinedance', stage: '09', kw: { 提示词: 6, H3: 10, MiniMax: 8, Seedance: 8, T2VA: 8, I2VA: 6, Ref2VA: 8, 画幅: 4, 提示词格式: 8, 生成单元: 5, 时间戳: 3, 音效: 3, prompt: 4 } },
  { skill: 'film-lira-assets', stage: '07', kw: { 资产: 6, 一致性: 5, 角色卡: 6, 参考图: 5, 图像提示词: 6, 资产简报: 6, 三视图: 4, lira: 8, asset: 4 } },
  { skill: 'film-screenplay', stage: '05', kw: { 剧本: 8, 对白: 6, 场次: 5, 台词: 6, screenplay: 8, 改写: 3, 定稿: 3 } },
  { skill: 'film-treatment', stage: '04', kw: { treatment: 8, 分场: 6, 逐场: 5, 大纲: 5, 场序: 4 } },
  { skill: 'film-synopsis', stage: '01', kw: { 梗概: 8, 概念锚: 6, logline: 6, 一句话: 4, synopsis: 8 } },
  { skill: 'film-characters', stage: '02', kw: { 角色: 6, 人物: 5, 人物小传: 6, 角色圣经: 8, characters: 6, 人设: 5 } },
  { skill: 'film-worldbuilding', stage: '03', kw: { 世界观: 8, 设定: 6, 派系: 4, 力量体系: 6, worldbuilding: 8, 规则体系: 5 } },
  { skill: 'film-stress-test', stage: '06', kw: { 体检: 8, 评审: 5, 压力测试: 8, 留存: 4, 断言: 4, stress: 6 } },
  { skill: 'film-expert-bridge', stage: '桥', kw: { 导演: 5, 风格: 4, 审片: 6, 镜头术语: 6, 工艺: 6, 库: 3, expert: 6, 返修: 4 } },
  { skill: 'film-knowledge-bridge', stage: '桥', kw: { 知识库: 8, 检索: 6, 引用: 4, knowledge: 6, md库: 5 } },
  { skill: 'canvas', stage: '桥', kw: { 画布: 8, 节点: 6, canvas: 8, 连线: 4, 视口: 3 } },
  { skill: 'workflow', stage: '桥', kw: { 工作流: 8, 制作流程: 6, workflow: 8, 绘世: 3 } },
  { skill: 'v118workflow', stage: '桥', kw: { v118: 8, 叙事: 5, 美术风格: 5 } },
];

function scoreText(text) {
  const t = text.toLowerCase();
  const res = [];
  for (const p of PROFILES) {
    let score = 0; const ev = [];
    for (const [k, w] of Object.entries(p.kw)) {
      const kk = k.toLowerCase();
      let n = 0, i = 0;
      while ((i = t.indexOf(kk, i)) >= 0 && n < 6) { n++; i += kk.length; }
      if (n) { score += w * Math.min(n, 4); if (ev.length < 3) ev.push(k + '×' + n); }
    }
    if (score > 0) res.push({ skill: p.skill, stage: p.stage, score, evidence: ev });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, 3);
}

function walk(dir, base = dir, acc = []) {
  for (const f of readdirSync(dir)) {
    if (f.startsWith('.')) continue;
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, base, acc);
    else acc.push({ p, rel: relative(base, p), bytes: st.size });
  }
  return acc;
}

function expand(pathArg) {
  const abs = pathArg;
  if (!existsSync(abs)) return { ok: false, error: '路径不存在：' + abs };
  const st = statSync(abs);
  if (st.isDirectory()) return { ok: true, type: 'dir', files: walk(abs).map((f) => ({ ...f, abs: f.p })) };
  if (extname(abs).toLowerCase() === '.zip') {
    const tmp = join(ROOT, 'patch', '_unzip', basename(abs, '.zip'));
    mkdirSync(tmp, { recursive: true });
    try { execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${abs}' -DestinationPath '${tmp}' -Force`], { stdio: 'ignore' }); } catch (e) { return { ok: false, error: '解压失败：' + e.message }; }
    return { ok: true, type: 'zip', unzipped: tmp, files: walk(tmp).map((f) => ({ ...f, abs: f.p })) };
  }
  return { ok: true, type: 'file', files: [{ p: abs, rel: basename(abs), bytes: st.size, abs }] };
}

function inspectFiles(files) {
  const items = [];
  for (const f of files) {
    if (!TEXT_EXT.has(extname(f.rel).toLowerCase())) continue;
    const text = readFileSync(f.abs, 'utf8');
    const sections = (text.match(/^#{1,3}\s+/gm) || []).length;
    const kind = kindOf(f.rel, text);
    const sug = scoreText(text);
    items.push({ rel: f.rel.replace(/\\/g, '/'), abs: f.abs, bytes: f.bytes, kind, sections, chars: text.length, suggest: sug, top: sug[0] || null, head: text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 3).join(' / ').slice(0, 120) });
  }
  items.sort((a, b) => b.bytes - a.bytes);
  const byKind = {};
  const bySkill = {};
  for (const it of items) {
    byKind[it.kind] = (byKind[it.kind] || 0) + 1;
    if (it.top) bySkill[it.top.skill] = (bySkill[it.top.skill] || 0) + 1;
  }
  return { items, byKind, bySkill };
}

if (cmd === 'scan') {
  const e = expand(val('--path'));
  if (!e.ok) out(e);
  else {
    const r = inspectFiles(e.files);
    out({ ok: true, type: e.type, unzipped: e.unzipped || null, files: e.files.length, texts: r.items.length, byKind: r.byKind, bySkill: r.bySkill, items: r.items.map(({ abs, ...rest }) => rest) });
  }
} else if (cmd === 'ingest') {
  const e = expand(val('--path'));
  if (!e.ok) out(e);
  else if (!has('--confirm')) {
    const r = inspectFiles(e.files);
    out({ ok: false, needsConfirm: true, wouldCopy: e.files.length, texts: r.items.length, byKind: r.byKind, hint: '加 --confirm 才真的复制进 patch\\sources\\<包名>\\' });
  } else {
    const name = val('--name') || basename(val('--path')).replace(/\.[^.]+$/, '');
    const dest = join(SOURCES, name);
    mkdirSync(dest, { recursive: true });
    let copied = 0;
    const srcRoot = e.type === 'file' ? dirname(val('--path')) : (e.unzipped || val('--path'));
    for (const f of e.files) {
      const rel = e.type === 'file' ? basename(f.p) : relative(srcRoot, f.p);
      const to = join(dest, rel);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(f.p, to);
      copied++;
    }
    const r = inspectFiles(e.files);
    appendJsonl(SRC_LEDGER, { ts: new Date().toISOString(), name, from: val('--path'), type: e.type, copied, texts: r.items.length, byKind: r.byKind, bySkill: r.bySkill });
    out({ ok: true, name, dir: dest, copied, texts: r.items.length, byKind: r.byKind, bySkill: r.bySkill, items: r.items.map(({ abs, ...rest }) => rest) });
  }
} else if (cmd === 'suggest' || cmd === 'kind') {
  const f = val('--file');
  if (!f || !existsSync(f)) out({ ok: false, error: '文件不存在：' + f });
  else {
    const text = readFileSync(f, 'utf8');
    const kind = kindOf(f, text);
    if (cmd === 'kind') out({ ok: true, kind });
    else out({ ok: true, file: f, kind, chars: text.length, sections: (text.match(/^#{1,3}\s+/gm) || []).length, suggest: scoreText(text) });
  }
} else out({ ok: false, error: '用法: scan|ingest|suggest|kind' });
