#!/usr/bin/env node
// 用 DeepSeek 起草技能 description 的三段骨架（做什么 / 当…时使用 / 不要用于）。
// 不改造化鼎、不改技能：只读 SKILL.md + audit 结果，把草稿写到 patch\staging\drafts\。
//
// 用法：
//   node draft-desc.mjs --dry-run            只打印提示词，不调模型
//   node draft-desc.mjs                      调 DeepSeek（key 取 QKD_MODEL_API_KEY 或 DEEPSEEK_API_KEY）
//   node draft-desc.mjs --only film-cinedance 只处理一个
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = "D:\\造化乾坤鼎-工作台";
const SKILLS = join(ROOT, "patch", "staging", "skills");
const OUT = join(ROOT, "patch", "staging", "drafts");
const ZHAOHUA = "D:\\造化鼎\\core\\bin\\zhaohua.mjs";
const NODE = process.execPath;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const DRY = flag("--dry-run");
const ONLY = opt("--only", "");
const MODEL = opt("--model", "deepseek-chat");
const BASE = opt("--base", "https://api.deepseek.com");
const KEY = resolveKey(opt("--key", ""));

// key 优先级：--key > 环境变量 > patch\secrets\deepseek.key（本地私有，已 gitignore）
function resolveKey(fromArg) {
  if (fromArg) return fromArg.trim();
  for (const n of ["QKD_MODEL_API_KEY", "DEEPSEEK_API_KEY"]) {
    if (process.env[n]) return process.env[n].trim();
  }
  const f = join(ROOT, "patch", "secrets", "deepseek.key");
  if (existsSync(f)) return readFileSync(f, "utf8").trim();
  return "";
}

// 1) 跑 audit，找出 R02 失败的技能
function auditFailures(dir) {
  const r = spawnSync(NODE, [ZHAOHUA, "audit", dir], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  const text = `${r.stdout || ""}\n${r.stderr || ""}`;
  const out = new Map();
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const skill = line.match(/^\s{2}(\S.*?)FAIL\s*$/);
    if (skill) {
      cur = basename(skill[1].trim().replace(/["']/g, ""));
      out.set(cur, []);
      continue;
    }
    const rule = line.match(/^\s{2}(R\d{2})\s+fail\s+(.*)$/);
    if (rule && cur) out.get(cur).push({ id: rule[1], msg: rule[2].trim() });
  }
  return out;
}

// 2) 读 SKILL.md，取 frontmatter 与正文摘要
function readSkill(dir) {
  const p = join(dir, "SKILL.md");
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fmText = fm ? fm[1] : "";
  const desc = (fmText.match(/^description:\s*(.*)$/m) || [])[1] || "";
  const body = raw.replace(/^---[\s\S]*?---/, "").trim();
  const headings = body
    .split(/\r?\n/)
    .filter((l) => /^#{1,3}\s/.test(l))
    .slice(0, 14)
    .join("\n");
  const stage = stageOf(dir, body);
  return { desc: desc.trim(), body: headings || body.slice(0, 900), stage };
}

const STAGE_MAP = {
  "film-synopsis": "01",
  "film-characters": "02",
  "film-worldbuilding": "03",
  "film-treatment": "04",
  "film-screenplay": "05",
  "film-stress-test": "06",
  "film-lira-assets": "07",
  "film-acting": "08",
  "film-cinedance": "09",
  "ai-film-router": "00",
};

function stageOf(dir, body) {
  const hit = String(body).match(/(?:^|\n)#{1,3}\s*(\d{2})\s/);
  if (hit) return hit[1];
  const fromName = basename(dir).match(/(\d{2})-/);
  if (fromName) return fromName[1];
  return STAGE_MAP[basename(dir)] || "";
}

// 3) 提示词
function buildPrompt(name, skill) {
  return [
    `你在为 AI 影视工作台的技能写 description。技能名：${name}；它在流程里的阶段：${skill.stage || "（跨阶段支撑，没有编号）"}。`,
    `它的现有 description：${skill.desc || "（空）"}`,
    `它的正文小标题：`,
    skill.body,
    "",
    "这个工作台的阶段表（只能引用下面这些编号，不要发明阶段）：",
    "01 SYNOPSIS 梗概与概念锚 / 02 CHARACTERS 角色圣经 / 03 WORLDBUILDING 世界观（可选）/",
    "04 TREATMENT 逐场分场 / 05 SCREENPLAY 剧本 / 06 STRESS-TEST 剧本压力测试 /",
    "07 LIRA-ASSETS 图像提示词与资产简报 / 08 ACTING 表演块 / 09 CINEDANCE 分镜与视频提示词",
    "",
    "请按三段骨架写一条中文 description：",
    "1) 做什么（≤40 字，动词开头，只说产出物）",
    "2) 当…时使用（必须带上面的阶段编号或明确输入条件）",
    "3) 不要用于：至少两条，每条写明「改用 0X」并说明那个阶段真正产出的东西",
    "只输出 description 本身，不要加前缀、不要加引号、不要解释。总长 ≤260 字。",
  ].join("\n");
}

async function askDeepSeek(prompt) {
  const res = await fetch(`${BASE.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      stream: false,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  return (data?.choices?.[0]?.message?.content || "").trim();
}

const failures = auditFailures(SKILLS);
const targets = [...failures.entries()].filter(([name, rules]) => {
  if (ONLY && name !== ONLY) return false;
  return rules.some((r) => r.id === "R02");
});

if (!targets.length) {
  console.log("没有 R02 失败的技能，无需起草。");
  process.exit(0);
}

console.log(`R02 待起草：${targets.length} 个${DRY ? "（dry-run）" : ""}`);
if (!DRY && !KEY) {
  console.error("缺少 key：设置 QKD_MODEL_API_KEY 或 DEEPSEEK_API_KEY，或加 --dry-run。");
  process.exit(2);
}

mkdirSync(OUT, { recursive: true });
const report = [];
for (const [name, rules] of targets) {
  const dir = join(SKILLS, name);
  const skill = readSkill(dir);
  if (!skill) {
    console.log(`- ${name}：跳过（没有 SKILL.md）`);
    continue;
  }
  const prompt = buildPrompt(name, skill);
  if (DRY) {
    console.log(`\n=== ${name} ===\n${prompt}\n`);
    continue;
  }
  try {
    const after = await askDeepSeek(prompt);
    report.push({ name, stage: skill.stage, before: skill.desc, after, rules: rules.map((r) => r.id) });
    writeFileSync(join(OUT, `${name}.json`), JSON.stringify(report[report.length - 1], null, 2), "utf8");
    console.log(`- ${name}：${after.length} 字`);
  } catch (e) {
    console.log(`- ${name}：失败 ${e.message}`);
  }
}

if (!DRY) {
  writeFileSync(join(OUT, "_all.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`\n草稿写入 ${OUT}（${report.length} 份）。审完再决定是否写回 SKILL.md。`);
}
