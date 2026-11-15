// 外部来料：扫描 → 判层 → 确认投放
// 用法：
//   bun ingest.mjs scan   --path "<文件夹|zip|单个文件>" [--json]
//   bun ingest.mjs ingest --path "<...>" --name <包名> [--confirm]
//   bun ingest.mjs suggest --file "<解压/来源里的某个 md|txt>" [--json]
//   bun ingest.mjs kind   --file "<md|txt>" [--json]
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, copyFileSync, cpSync, rmSync, appendFileSync} from 'node:fs';
import { join, dirname, basename, extname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

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

const SKILL_FILE_RE = /(^|\/)SKILL\.md$/i;
const SPEC_NAME_RE = /(规范|规格|契约|标准|schema|contract|convention|rules?\.md|guide)/i;

// —— 查重：新技能与 patch\skills 现有技能的行重合率 ——
const normLine = (s) => s.replace(/[`]+/g, '').replace(/[*_>#-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
function lineSet(dir) {
  const set = new Set();
  for (const f of walk(dir)) {
    if (!TEXT_EXT.has(extname(f.rel).toLowerCase())) continue;
    let txt = '';
    try { txt = readFileSync(f.p, 'utf8'); } catch { continue; }
    for (const l of txt.split(/\r?\n/)) {
      const n = normLine(l);
      if (n.length >= 12) set.add(n);
    }
  }
  return set;
}
function overlapOf(dir) {
  const mine = lineSet(dir);
  if (!mine.size) return { ratio: 0, with: null, shared: 0, mine: 0 };
  let best = { ratio: 0, with: null, shared: 0, mine: mine.size };
  let names = [];
  try { names = readdirSync(SKILLS).filter((d) => { try { return statSync(join(SKILLS, d)).isDirectory(); } catch { return false; } }); } catch {}
  for (const n of names) {
    const other = lineSet(join(SKILLS, n));
    if (!other.size) continue;
    let shared = 0;
    for (const l of mine) if (other.has(l)) shared++;
    const ratio = shared / mine.size;
    if (ratio > best.ratio) best = { ratio, with: n, shared, mine: mine.size };
  }
  return best;
}
// —— 第一段：认「这是什么件」（结构判据优先，内容判据兜底） ——
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text.slice(0, 4000));
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return fm;
}

function kindOf(rel, text) {
  const r = rel.replace(/\\/g, '/');
  const ext = extname(r).toLowerCase();
  if (SKILL_FILE_RE.test(r)) return { kind: 'skill', why: '文件名 SKILL.md' };
  if (LEDGER_RE.test(r)) return { kind: 'ledger', why: '文件名命中台账清单' };
  if (text && /投喂来源吸收|逐字副本|台账/.test(text.slice(0, 1200))) return { kind: 'ledger', why: '正文自称台账/逐字副本' };
  if (ext === '.md' || ext === '.markdown') {
    const fm = frontmatter(text);
    if (fm && fm.name && fm.description) return { kind: 'skill', why: 'frontmatter 有 name+description（技能件）' };
  }
  if (SPEC_RE.test(r)) return { kind: 'spec', why: '在 specs/ 目录下' };
  if (SPEC_NAME_RE.test(basename(r))) return { kind: 'spec', why: '文件名像规范/契约' };
  if (EXAMPLE_RE.test(r)) return { kind: 'example', why: '文件名像样例/模板' };
  if (CODE_EXT.has(ext)) return { kind: 'code', why: '代码/配置扩展名' };
  return { kind: 'method', why: '默认（普通资料）' };
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

// —— 第二段：认「它该去哪」 ——
const GATE_OK = 25;   // 只补缺的建议阈值
const GATE_WEAK = 12; // 低于此不猜

function judge(rel, text, kindObj) {
  const kind = kindObj.kind;
  if (kind === 'ledger') return { action: 'skip', confidence: 'high', why: '台账/逐字副本，不该进任何阶段正文', suggest: [] };
  if (kind === 'example') return { action: 'skip', confidence: 'mid', why: '样例/模板，先看清是格式示意还是真资料', suggest: [] };
  if (kind === 'code') return { action: 'skip', confidence: 'high', why: '代码/配置，不是给模型读的散文', suggest: [] };
  const sug = scoreText(text);
  const top = sug[0] || null;
  if (kind === 'skill') {
    const fm = frontmatter(text) || {};
    return {
      action: 'install-skill',
      confidence: 'high',
      why: '这是一整份技能（' + (fm.name || '无名') + '），该走 skillOperator 装成技能，拆成资料会丢它的编排',
      skillName: fm.name || null,
      description: (fm.description || '').slice(0, 160),
      suggest: sug.slice(0, 2),
    };
  }
  if (!top) return { action: 'gap', confidence: 'none', why: '关键词一个都没命中，只能手选目标技能', suggest: [] };
  if (top.score >= GATE_OK) return { action: 'gap', confidence: 'high', why: '判层 ' + top.skill + '（' + top.score + ' 分）', suggest: sug };
  if (top.score >= GATE_WEAK) return { action: 'gap', confidence: 'low', why: '分数偏低（' + top.score + '），建议先看内容再手选', suggest: sug };
  return { action: 'gap', confidence: 'none', why: '判不准（最高 ' + top.score + ' 分），请手选', suggest: sug };
}

function inspectFiles(files) {
  const items = [];
  for (const f of files) {
    if (!TEXT_EXT.has(extname(f.rel).toLowerCase())) continue;
    const text = readFileSync(f.abs, 'utf8');
    const sections = (text.match(/^#{1,3}\s+/gm) || []).length;
    const k = kindOf(f.rel, text);
    const j = judge(f.rel, text, k);
    items.push({
      rel: f.rel.replace(/\\/g, '/'), abs: f.abs, bytes: f.bytes,
      kind: k.kind, kindWhy: k.why,
      action: j.action, confidence: j.confidence, judgeWhy: j.why,
      skillName: j.skillName || null, description: j.description || null,
      sections, chars: text.length,
      suggest: j.suggest || [], top: (j.suggest || [])[0] || null,
      head: text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 3).join(' / ').slice(0, 120),
    });
  }
  items.sort((a, b) => b.bytes - a.bytes);
  const byKind = {};
  const byAction = {};
  const bySkill = {};
  for (const it of items) {
    byKind[it.kind] = (byKind[it.kind] || 0) + 1;
    byAction[it.action] = (byAction[it.action] || 0) + 1;
    if (it.top) bySkill[it.top.skill] = (bySkill[it.top.skill] || 0) + 1;
  }
  return { items, byKind, byAction, bySkill };
}

if (cmd === 'scan') {
  const e = expand(val('--path'));
  if (!e.ok) out(e);
  else {
    const r = inspectFiles(e.files);
    out({ ok: true, type: e.type, unzipped: e.unzipped || null, files: e.files.length, texts: r.items.length, byKind: r.byKind, byAction: r.byAction, bySkill: r.bySkill, items: r.items.map(({ abs, ...rest }) => rest) });
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
    out({ ok: true, name, dir: dest, copied, texts: r.items.length, byKind: r.byKind, byAction: r.byAction, bySkill: r.bySkill, items: r.items.map(({ abs, ...rest }) => rest) });
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
} else if (cmd === 'install') {
  // 把一份「技能件」装进唯一真相 patch\skills\<name>，体检后由调用方同步运行区
  let from = val('--from');
  const pkg = val('--pkg');
  const rel = val('--rel');
  if (!from && pkg && rel) from = join(SOURCES, pkg, rel);
  if (!from) out({ ok: false, error: '需要 --from <技能目录> 或 --pkg + --rel' });
  else if (!existsSync(from)) out({ ok: false, error: '路径不存在：' + from });
  else {
    const dir = statSync(from).isDirectory() ? from : dirname(from);
    const sk = join(dir, 'SKILL.md');
    if (!existsSync(sk)) out({ ok: false, error: '这个目录里没有 SKILL.md：' + dir });
    else {
      const text = readFileSync(sk, 'utf8');
      const fm = frontmatter(text) || {};
      const name = (val('--name') || fm.name || basename(dir)).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      if (!fm.description) out({ ok: false, error: 'SKILL.md 缺 description，先补齐再装（造化鼎 R03 会拦）', name });
      else if (!has('--confirm') && !has('--dry-run')) out({ ok: false, needsConfirm: true, name, dir, hint: '加 --confirm 才会复制进 patch\\skills\\' + name });
      else {
        const dest = join(SKILLS, name);
        const dup = overlapOf(dir);
        if (dup.ratio >= 0.8 && dup.with !== name && !has('--force')) {
          out({ ok: false, blocked: true, name, dup, error: '和已有技能 ' + dup.with + ' 重合 ' + Math.round(dup.ratio * 100) + '%，先确认是不是同一套东西（要装就加 --force）' });
        } else {
        const files = walk(dir);
        const texts = files.filter((f) => TEXT_EXT.has(extname(f.rel).toLowerCase())).length;
        if (has('--dry-run')) {
          out({ ok: true, dryRun: true, name, from: dir, dest, files: files.length, texts, exists: existsSync(dest), dup });
        } else {
          let backed = null;
          if (existsSync(dest)) {
            backed = join(ROOT, 'patch', '_backup', 'skills', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), name);
            mkdirSync(dirname(backed), { recursive: true });
            cpSync(dest, backed, { recursive: true });
            rmSync(dest, { recursive: true, force: true });
          }
          mkdirSync(dest, { recursive: true });
          for (const f of files) {
            const to = join(dest, f.rel);
            mkdirSync(dirname(to), { recursive: true });
            copyFileSync(f.p, to);
          }
          let audit = { ok: false, note: '未跑' };
          const CLI = join('D:\\造化鼎', 'core', 'bin', 'zhaohua.mjs');
          if (existsSync(CLI)) {
            const r = spawnSync(process.execPath, [CLI, 'audit', dest], { encoding: 'utf8' });
            const txt = (r.stdout || '') + (r.stderr || '');
            audit = {
              exitCode: r.status, pass: r.status === 0,
              fails: (txt.match(/R\d\d fail[^\n]*/g) || []).slice(0, 8),
              tail: txt.split(/\r?\n/).filter(Boolean).slice(-4),
            };
          }
          appendJsonl(join(ROOT, 'patch', 'ledger', 'installs.jsonl'), {
            ts: new Date().toISOString(), name, from: dir, files: files.length, texts,
            backed: backed ? relative(ROOT, backed) : null, auditPass: audit.pass, exitCode: audit.exitCode,
          });
          out({ ok: true, name, dest, files: files.length, texts, backed, dup, audit });
        }
        }
      }
    }
  }
} else if (cmd === 'uninstall') {
  const name = val('--name');
  const truth = name ? join(SKILLS, name) : null;
  const runtime = name ? join(ROOT, '_work', 'stable', 'data', 'skills', name) : null;
  if (!name) out({ ok: false, error: '需要 --name' });
  else if (!existsSync(truth) && !existsSync(runtime)) out({ ok: false, error: '没找到这份技能：' + name });
  else if (!has('--confirm')) out({ ok: false, needsConfirm: true, name, truth, runtime, hint: '会从 patch\\skills 与运行区一起移除（先备份到 patch\\_backup\\skills）。确认请加 --confirm' });
  else {
    let backed = null;
    if (existsSync(truth)) {
      backed = join(ROOT, 'patch', '_backup', 'skills', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), name);
      mkdirSync(dirname(backed), { recursive: true });
      cpSync(truth, backed, { recursive: true });
      rmSync(truth, { recursive: true, force: true });
    }
    let removedRuntime = false;
    if (existsSync(runtime)) { rmSync(runtime, { recursive: true, force: true }); removedRuntime = true; }
    appendJsonl(join(ROOT, 'patch', 'ledger', 'installs.jsonl'), {
      ts: new Date().toISOString(), action: 'uninstall', name,
      removedTruth: !existsSync(truth), removedRuntime, backed: backed ? relative(ROOT, backed) : null,
    });
    out({ ok: true, name, removedTruth: !existsSync(truth), removedRuntime, backed, hint: '要恢复就把备份目录拷回 patch\\skills\\<' + name + '> 再跑 apply.ps1 -Skills' });
  }
} else if (cmd === 'backups') {
  const root = join(ROOT, 'patch', '_backup', 'skills');
  const outList = [];
  if (existsSync(root)) {
    for (const stamp of readdirSync(root).sort().reverse()) {
      const sp = join(root, stamp);
      let names = [];
      try { names = readdirSync(sp).filter((n) => { try { return statSync(join(sp, n)).isDirectory(); } catch { return false; } }); } catch {}
      if (names.length) outList.push({ stamp, path: sp, skills: names });
    }
  }
  out({ ok: true, root, backups: outList.slice(0, 40) });
} else if (cmd === 'restore') {
  const stamp = val('--backup');
  const name = val('--name');
  if (!stamp || !name) out({ ok: false, error: '需要 --backup <时间戳> 与 --name <技能名>' });
  else {
    const src = join(ROOT, 'patch', '_backup', 'skills', stamp, name);
    if (!existsSync(src)) out({ ok: false, error: '备份不存在：' + src });
    else if (!has('--confirm')) out({ ok: false, needsConfirm: true, name, from: src, hint: '会把备份拷回 patch\\skills\\' + name + '（若已有先再备份一次）' });
    else {
      const dest = join(SKILLS, name);
      let before = null;
      if (existsSync(dest)) {
        before = join(ROOT, 'patch', '_backup', 'skills', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '-pre-restore', name);
        mkdirSync(dirname(before), { recursive: true });
        cpSync(dest, before, { recursive: true });
        rmSync(dest, { recursive: true, force: true });
      }
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
      appendJsonl(join(ROOT, 'patch', 'ledger', 'installs.jsonl'), { ts: new Date().toISOString(), action: 'restore', name, from: relative(ROOT, src), before: before ? relative(ROOT, before) : null });
      out({ ok: true, name, dest, from: src, before });
    }
  }
} else if (cmd === 'overlap') {
  const f = val('--from');
  if (!f || !existsSync(f)) out({ ok: false, error: '需要 --from <技能目录>' });
  else out({ ok: true, from: f, dup: overlapOf(statSync(f).isDirectory() ? f : dirname(f)) });
} else out({ ok: false, error: '用法: scan|ingest|suggest|kind|install|uninstall|backups|restore|overlap' });
