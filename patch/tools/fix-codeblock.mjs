#!/usr/bin/env node
// R08：正文里超过 10 行的代码块搬进 references/，正文留一行指引。
// 只动 staging 副本；备份在 skills-before-r08\。
import { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = "D:\\造化乾坤鼎-工作台";
const SKILLS = join(ROOT, "patch", "staging", "skills");
const BACKUP = join(ROOT, "patch", "staging", "skills-before-r08");
const ZHAOHUA = "D:\\造化鼎\\core\\bin\\zhaohua.mjs";
const MAX_LINES = 10;

const DRY = process.argv.includes("--dry-run");

function audit() {
  const r = spawnSync(process.execPath, [ZHAOHUA, "audit", SKILLS], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  const text = `${r.stdout || ""}\n${r.stderr || ""}`;
  const hits = new Map(); // skill -> [规则行]
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const s = line.match(/^\s{2}(\S.*?)FAIL\s*$/);
    if (s) { cur = basename(s[1].trim().replace(/["']/g, "")); hits.set(cur, []); continue; }
    const r8 = line.match(/^\s{2}(R08)\s+fail\s+(.*)$/);
    if (r8 && cur) hits.get(cur).push(r8[2].trim());
  }
  const tally = {};
  for (const m of text.matchAll(/^\s{2}(R\d{2})\s+fail\b/gm)) tally[m[1]] = (tally[m[1]] || 0) + 1;
  return { hits, tally };
}

// 找 fences 超过 MAX_LINES 行的块
function longBlocks(body) {
  const lines = body.split(/\r?\n/);
  const out = [];
  let open = -1;
  let fence = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (open < 0) {
      if (m) { open = i; fence = m[1]; }
    } else if (m && m[1].startsWith(fence[0])) {
      const inner = lines.slice(open + 1, i);
      if (inner.length > MAX_LINES) out.push({ start: open, end: i, inner, lang: (lines[open].match(/^\s*`{3,}\s*(\S*)/) || [])[1] || "" });
      open = -1;
    }
  }
  return out;
}

// 用块前面最近的标题取名字；标题全中文就退回 code-<lang>-<序号>
function slugFor(block, idx, lines) {
  let heading = "";
  for (let i = block.start - 1; i >= 0; i--) {
    const h = lines[i].match(/^#{1,6}\s+(.+)$/);
    if (h) { heading = h[1]; break; }
  }
  const ascii = (heading.match(/[A-Za-z][A-Za-z0-9_ .-]{2,}/g) || []).join("-").toLowerCase();
  const cleaned = ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  if (cleaned) return `${cleaned}-${block.inner.length}l`;
  return `code-${block.lang || "txt"}-${idx + 1}-${block.inner.length}l`;
}

if (!DRY && !existsSync(BACKUP)) {
  cpSync(SKILLS, BACKUP, { recursive: true });
  console.log(`已备份 → ${BACKUP}\n`);
}

const { hits, tally } = audit();
const targets = [...hits.entries()].filter(([, rules]) => rules.some((r) => r.startsWith("代码块")));

if (!targets.length) {
  console.log("没有 R08 失败项。");
  process.exit(0);
}

console.log(`R08 待处理：${targets.length} 个技能${DRY ? "（dry-run）" : ""}\n`);
let moved = 0;

for (const [name, rules] of targets) {
  const p = join(SKILLS, name, "SKILL.md");
  if (!existsSync(p)) continue;
  const raw = readFileSync(p, "utf8");
  const blocks = longBlocks(raw);
  if (!blocks.length) {
    console.log(`- ${name}：审计说超长，但没找到超过 ${MAX_LINES} 行的围栏块（可能是别的代码块形式）`);
    continue;
  }
  const refDir = join(SKILLS, name, "references");
  if (!DRY) mkdirSync(refDir, { recursive: true });

  // 从后往前替换，避免行号错位
  const ordered = [...blocks].sort((a, b) => b.start - a.start);
  const lines = raw.split(/\r?\n/);
  for (const b of ordered) {
    const slug = slugFor(b, blocks.indexOf(b), lines);
    const file = `${slug}.md`;
    const title = name + " · " + file;
    const content = [`# ${title}`, "", `> 由 R08 规整从 SKILL.md 搬出，原文 ${b.inner.length} 行。`, "", "```" + b.lang, ...b.inner, "```", ""].join("\n");
    const pointer = [
      `> 这段 ${b.inner.length} 行的${b.lang ? b.lang + " " : ""}代码已独立到 [references/${file}](references/${file})。`,
      `> 需要具体命令时先读该文件，不要在正文里复述。`,
    ];
    if (DRY) {
      console.log(`- ${name}：第 ${b.start + 1}–${b.end + 1} 行（${b.inner.length} 行）→ references/${file}`);
    } else {
      writeFileSync(join(refDir, file), content, "utf8");
      lines.splice(b.start, b.end - b.start + 1, ...pointer);
      moved++;
    }
  }
  if (!DRY) {
    writeFileSync(p, lines.join("\n"), "utf8");
    console.log(`- ${name}：搬出 ${blocks.length} 块`);
  }
}

if (!DRY) {
  const after = audit();
  console.log(`\n搬出 ${moved} 块。复审：规则命中 ${JSON.stringify(after.tally)}`);
}
