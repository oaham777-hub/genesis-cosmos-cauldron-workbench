#!/usr/bin/env node
// 把 drafts\_all.json 里的描述写回 staging 副本的 SKILL.md（只改 frontmatter 的 description 一行）。
// 不碰 data\skills；写前整目录备份到 skills-before-desc\，可随时回滚。
import { readFileSync, writeFileSync, existsSync, cpSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = "D:\\造化乾坤鼎-工作台";
const SKILLS = join(ROOT, "patch", "staging", "skills");
const DRAFTS = join(ROOT, "patch", "staging", "drafts", "_all.json");
const BACKUP = join(ROOT, "patch", "staging", "skills-before-desc");
const ZHAOHUA = "D:\\造化鼎\\core\\bin\\zhaohua.mjs";

if (!existsSync(DRAFTS)) {
  console.error("没有草稿，先跑 draft-desc.mjs");
  process.exit(2);
}
const drafts = JSON.parse(readFileSync(DRAFTS, "utf8"));

// 1) 备份（只备份一次，避免覆盖原始备份）
if (!existsSync(BACKUP)) {
  cpSync(SKILLS, BACKUP, { recursive: true });
  console.log(`已备份原始副本 → ${BACKUP}`);
}

// 2) 写回 description 一行
let changed = 0;
for (const d of drafts) {
  const p = join(SKILLS, d.name, "SKILL.md");
  if (!existsSync(p)) {
    console.log(`- ${d.name}：跳过（无 SKILL.md）`);
    continue;
  }
  const raw = readFileSync(p, "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    console.log(`- ${d.name}：跳过（无 frontmatter）`);
    continue;
  }
  const fm = m[1];
  if (!/^description:/m.test(fm)) {
    console.log(`- ${d.name}：跳过（frontmatter 无 description）`);
    continue;
  }
  const text = d.after.replace(/\r?\n/g, " ").trim();
  const nextFm = fm.replace(/^description:[^\r\n]*(?:\r?\n(?![\w-]+:)[^\r\n]*)*/m, () => `description: ${text}`);
  const next = raw.replace(fm, nextFm);
  if (next === raw) {
    console.log(`- ${d.name}：无变化`);
    continue;
  }
  writeFileSync(p, next, "utf8");
  changed++;
  console.log(`- ${d.name}：description 已替换（${text.length} 字）`);
}

// 3) 复审
const r = spawnSync(process.execPath, [ZHAOHUA, "audit", SKILLS], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
const text = `${r.stdout || ""}\n${r.stderr || ""}`;
const tally = {};
for (const m of text.matchAll(/^\s{2}(R\d{2})\s+fail\b/gm)) tally[m[1]] = (tally[m[1]] || 0) + 1;
const fails = [...text.matchAll(/^\s{2}(\S.*?)FAIL\s*$/gm)].length;
console.log(`\n写回 ${changed} 个技能。复审：技能 FAIL ${fails} 个，规则命中 ${JSON.stringify(tally)}`);
