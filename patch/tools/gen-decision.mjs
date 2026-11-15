#!/usr/bin/env node
// 给缺"决策树/路由"章节的技能补一节（R09）。
// 依据：技能正文里真实存在的条件分支行，不凭空发明。
// 写入 staging 副本；备份在 skills-before-decision\。
import { readFileSync, writeFileSync, existsSync, cpSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = "D:\\造化乾坤鼎-工作台";
const SKILLS = join(ROOT, "patch", "staging", "skills");
const BACKUP = join(ROOT, "patch", "staging", "skills-before-decision");
const OUT = join(ROOT, "patch", "staging", "decisions");
const ZHAOHUA = "D:\\造化鼎\\core\\bin\\zhaohua.mjs";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const ONLY = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : "";

function key() {
  for (const n of ["QKD_MODEL_API_KEY", "DEEPSEEK_API_KEY"]) if (process.env[n]) return process.env[n].trim();
  const f = join(ROOT, "patch", "secrets", "deepseek.key");
  return existsSync(f) ? readFileSync(f, "utf8").trim() : "";
}

const DECISION_HEADING = /^#{1,6}[^\n]*(决策|Decision Tree|路由表|选择哪条)/mi;

function auditTally() {
  const r = spawnSync(process.execPath, [ZHAOHUA, "audit", SKILLS], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  const text = `${r.stdout || ""}\n${r.stderr || ""}`;
  const tally = {};
  for (const m of text.matchAll(/^\s{2}(R\d{2})\s+fail\b/gm)) tally[m[1]] = (tally[m[1]] || 0) + 1;
  const failed = new Set();
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const s = line.match(/^\s{2}(\S.*?)FAIL\s*$/);
    if (s) { cur = basename(s[1].trim().replace(/["']/g, "")); failed.add(cur); }
  }
  return { tally, failed };
}

// 抽取真实的条件分支行
function branches(body) {
  const lines = body.split(/\r?\n/);
  const picked = [];
  for (const l of lines) {
    const t = l.trim();
    if (!t || /^#{1,6}\s/.test(t)) continue;
    if (/(^\|\s*-+)|^```|^\|.*\|$/.test(t)) {
      if (/如果|若|当|则|否则|切换|退|进入/.test(t) && t.length < 200) picked.push(t.replace(/^\|/,"").replace(/\|$/,"").replace(/\s*\|\s*/g," → "));
      continue;
    }
    if (/如果|若是|若用户|当用户|当作者|当路由|则|否则|除非|切换|回退|进入|只要|一旦/i.test(t) && t.length < 220) {
      picked.push(t.replace(/^[-*\d.\s]+/, ""));
    }
  }
  return [...new Set(picked)].slice(0, 24);
}

async function ask(prompt) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}` },
    body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: prompt }], temperature: 0.2, max_tokens: 900 }),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${t.slice(0, 150)}`);
  return (JSON.parse(t)?.choices?.[0]?.message?.content || "").trim();
}

if (!DRY && !existsSync(BACKUP)) {
  cpSync(SKILLS, BACKUP, { recursive: true });
  console.log(`已备份 → ${BACKUP}\n`);
}

const { failed } = auditTally();
let done = 0;
for (const name of [...failed].sort()) {
  if (ONLY && name !== ONLY) continue;
  const p = join(SKILLS, name, "SKILL.md");
  if (!existsSync(p)) continue;
  const raw = readFileSync(p, "utf8");
  if (DECISION_HEADING.test(raw)) continue; // 已有决策树
  const br = branches(raw);
  if (br.length < 2) {
    console.log(`- ${name}：分支不足，跳过`);
    continue;
  }
  const prompt = [
    `下面是技能「${name}」正文里真实存在的条件分支（原样摘录）：`,
    br.map((b, i) => `${i + 1}. ${b}`).join("\n"),
    "",
    "请把上面的分支整理成一节 markdown「## 决策树（走哪条）」：",
    "- 用 3–8 个判断节点，每个写成 `- 如果 <条件> → <做什么，谁负责>`",
    "- 条件只能用摘录里出现过的，不要发明新条件、不要引入新阶段",
    "- 最后一行写 `- 都不满足 → 回到 00 路由，重新确认阶段`",
    "- 只输出这一节内容（以 ## 开头），不要前言、不要解释",
  ].join("\n");
  try {
    const section = await ask(prompt);
    if (!/^##/m.test(section)) throw new Error("返回不是章节");
    const next = `${raw.trimEnd()}\n\n${section.trim()}\n`;
    if (DRY) {
      console.log(`\n=== ${name}（${br.length} 条分支）===\n${section}\n`);
    } else {
      writeFileSync(p, next, "utf8");
      console.log(`- ${name}：插入决策树（${section.split(/\n/).length} 行，参考 ${br.length} 条分支）`);
      done++;
    }
  } catch (e) {
    console.log(`- ${name}：失败 ${e.message}`);
  }
}

if (!DRY) {
  const after = auditTally();
  console.log(`\n补入 ${done} 个技能。复审：规则命中 ${JSON.stringify(after.tally)}；仍有失败技能 ${after.failed.size} 个`);
}
