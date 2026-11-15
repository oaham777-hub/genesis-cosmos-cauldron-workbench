// stage-skills.mjs —— 把外部技能补成"自足"副本，再交给造化鼎审计
// 只做一件事：把 SKILL.md 里引用、但本技能目录里没有的 references 文件，
// 从同级其它技能里找回来，按相同相对路径复制进副本。不改一个字。
//
// 用法：
//   node stage-skills.mjs --src <技能父目录> --out <暂存目录> [--only a,b] [--dry-run]
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";
import { createHash } from "node:crypto";

const argv = process.argv.slice(2);
const opt = (name, def = "") => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def;
};
const SRC = opt("src");
const OUT = opt("out");
const ONLY = opt("only").split(",").map((s) => s.trim()).filter(Boolean);
const DRY = argv.includes("--dry-run");

if (!SRC || !OUT) {
  console.error("需要 --src 与 --out");
  process.exit(2);
}

function walk(dir, base = dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, base, acc);
    else acc.push(p);
  }
  return acc;
}

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 12);

// 收集源技能
const skills = readdirSync(SRC)
  .map((n) => join(SRC, n))
  .filter((p) => statSync(p).isDirectory() && existsSync(join(p, "SKILL.md")))
  .filter((p) => ONLY.length === 0 || ONLY.includes(basename(p)));

if (skills.length === 0) {
  console.error(`在 ${SRC} 没找到带 SKILL.md 的技能目录`);
  process.exit(2);
}

// 建立"文件名 → 候选绝对路径"的索引（供跨技能回填）
const byRel = new Map(); // "references/modules/x.md" -> [abs]
const byName = new Map(); // "x.md" -> [abs]
for (const s of skills) {
  for (const f of walk(s)) {
    const rel = relative(s, f).split("\\").join("/");
    if (!rel.startsWith("references/")) continue;
    if (!byRel.has(rel)) byRel.set(rel, []);
    byRel.get(rel).push(f);
    const n = basename(f);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(f);
  }
}

const scopedRe = /(?<![\w\/])([A-Za-z0-9][A-Za-z0-9._\-]*)\/references\/([A-Za-z0-9._\-\/]+\.(?:md|txt|json|ya?ml|svg|png|jpg))/g;
const refRe = /(?:^|[\s(`"'[])((?:\.{1,2}\/)?references\/[A-Za-z0-9._\-\/]+\.(?:md|txt|json|ya?ml|svg|png|jpg))/gm;

const report = [];

for (const skill of skills) {
  const name = basename(skill);
  const staged = join(OUT, name);
  const all = walk(skill);
  const mdFiles = all.filter((f) => f.endsWith(".md"));

  // 1. 复制原样
  if (!DRY) {
    for (const f of all) {
      const rel = relative(skill, f);
      const dst = join(staged, rel);
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(f, dst);
    }
  }

  // 2. 找缺失引用
  //    两种写法都要认：
  //      a) references/x.md                      —— 本技能内
  //      b) 别的技能/references/x.md              —— 跨技能限定路径（审计会把它当成本技能的 references/x.md）
  const missing = new Map(); // rel -> {from, candidates}
  const scoped = new Map(); // "references/x.md" -> {from, abs}
  for (const f of mdFiles) {
    const text = readFileSync(f, "utf8");
    let m;
    refRe.lastIndex = 0;
    while ((m = refRe.exec(text)) !== null) {
      const raw = m[1].replace(/^\.\//, "").split("#")[0];
      if (raw.startsWith("../")) continue; // 越界引用交给 R10，另行处理
      const local = join(skill, raw);
      if (existsSync(local)) continue;
      if (!missing.has(raw)) missing.set(raw, { from: new Set(), candidates: [] });
      missing.get(raw).from.add(relative(skill, f).split("\\").join("/"));
      const cand = byRel.get(raw) || byName.get(basename(raw)) || [];
      missing.get(raw).candidates = cand.filter((c) => !c.startsWith(skill));
    }
    scopedRe.lastIndex = 0;
    while ((m = scopedRe.exec(text)) !== null) {
      const owner = m[1];
      const tail = m[2];
      if (owner === name) continue;
      const ref = `references/${tail}`;
      const srcFile = join(SRC, owner, "references", tail);
      if (!existsSync(srcFile)) continue;
      if (!scoped.has(ref)) scoped.set(ref, { from: new Set(), abs: srcFile, owner });
      scoped.get(ref).from.add(relative(skill, f).split("\\").join("/"));
    }
  }

  const filled = [];
  const conflicts = [];
  const unresolved = [];

  for (const [raw, info] of missing) {
    if (info.candidates.length === 0) {
      unresolved.push({ ref: raw, citedBy: [...info.from] });
      continue;
    }
    // 优先取相对路径完全一致的候选；多处冲突时取哈希一致的那份，否则记冲突
    const exact = info.candidates.filter((c) => {
      const owner = skills.find((s) => c.startsWith(s));
      return owner && relative(owner, c).split("\\").join("/") === raw;
    });
    const pool = exact.length ? exact : info.candidates;
    const hashes = new Map(pool.map((p) => [sha(p), p]));
    const picked = pool[0];
    const dst = join(staged, raw);
    if (!DRY) {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(picked, dst);
    }
    const owner = skills.find((s) => picked.startsWith(s));
    filled.push({
      ref: raw,
      from: owner ? basename(owner) : "?",
      match: exact.length ? "same-path" : "same-name",
      hash: sha(picked),
      variants: hashes.size,
    });
    if (hashes.size > 1) conflicts.push({ ref: raw, variants: [...hashes.keys()] });
  }

  // 跨技能限定路径：别的技能/references/x.md → 本地 references/x.md
  for (const [ref, info] of scoped) {
    const dst = join(staged, ref);
    if (!DRY) {
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(info.abs, dst);
    }
    filled.push({ ref, from: info.owner, match: "scoped", hash: sha(info.abs), variants: 1 });
  }

  report.push({ skill: name, files: all.length, filled, conflicts, unresolved });
}

// 输出
let totalFilled = 0;
let totalUnresolved = 0;
let totalConflicts = 0;
for (const r of report) {
  const mark = r.unresolved.length ? "!" : " ";
  console.log(`\n${mark} ${r.skill}  (${r.files} 个文件)`);
  for (const f of r.filled) console.log(`    补 ${f.ref.padEnd(46)} ← ${f.from} [${f.match}]`);
  for (const c of r.conflicts) console.log(`    冲突 ${c.ref} 有 ${c.variants.length} 个不同版本`);
  for (const u of r.unresolved) console.log(`    缺 ${u.ref}  (引用于 ${u.citedBy.join(", ")})`);
  totalFilled += r.filled.length;
  totalUnresolved += r.unresolved.length;
  totalConflicts += r.conflicts.length;
}

console.log(`\n合计：补回 ${totalFilled} 处引用 · 无法解析 ${totalUnresolved} 处 · 版本冲突 ${totalConflicts} 处`);
console.log(DRY ? `（dry-run，没有写入 ${OUT}）` : `已写入 ${OUT}`);
