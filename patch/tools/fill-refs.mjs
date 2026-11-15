// fill-refs.mjs —— 用审计自己的报告来补引用，直到 R06 不再变化
// 不猜文本格式，只做一件事：审计说缺哪个文件，就从全库找同名文件补进副本。
import { readdirSync, statSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const opt = (n, d = "") => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};
const SRC = opt("src");
const OUT = opt("out");
const CLI = opt("cli", "D:\\造化鼎\\core\\bin\\zhaohua.mjs");
const ROUNDS = Number(opt("rounds", "4"));

function walk(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// 全库索引：文件名 -> 绝对路径
const index = new Map();
for (const f of walk(SRC)) {
  const b = basename(f);
  if (!index.has(b)) index.set(b, []);
  index.get(b).push(f);
}

function audit(dir) {
  let text = "";
  let code = 0;
  try {
    text = execFileSync(process.execPath, [CLI, "audit", dir], { encoding: "utf8" });
  } catch (e) {
    text = String(e.stdout || "") + String(e.stderr || "");
    code = e.status ?? 1;
  }
  // 解析：技能行 + R06 行
  const out = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s{2}(\S.*?)FAIL\s*$/);
    if (m) {
      current = basename(m[1].replace(/[\\/]+$/, ""));
      out.push({ skill: current, missing: [] });
      continue;
    }
    const r = line.match(/R06 fail\s+引用文件不存在：(.*)$/);
    if (r && current) {
      const last = out[out.length - 1];
      for (const raw of r[1].split("、")) last.missing.push(raw.trim().replace(/#.*$/, ""));
    }
  }
  return { text, code, skills: out };
}

let filledTotal = 0;
let lastCount = -1;

for (let round = 1; round <= ROUNDS; round++) {
  const { skills } = audit(OUT);
  const missingTotal = skills.reduce((a, s) => a + s.missing.length, 0);
  console.log(`第 ${round} 轮：${skills.length} 个技能，缺引用 ${missingTotal} 处`);
  if (missingTotal === 0) break;
  if (missingTotal === lastCount) {
    console.log("  与上一轮相同，停止（有引用在全库找不到，需要人工补写）");
    break;
  }
  lastCount = missingTotal;

  let filled = 0;
  const seen = new Set();
  for (const s of skills) {
    for (const ref of s.missing) {
      const key = `${s.skill}|${ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cands = index.get(basename(ref)) || [];
      const pick = cands.find((c) => c.endsWith(ref.split("/").join("\\"))) || cands[0];
      if (!pick) {
        console.log(`  无法补：${s.skill} → ${ref}（全库无同名文件）`);
        continue;
      }
      const dst = join(OUT, s.skill, ref.split("/").join("\\"));
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(pick, dst);
      filled++;
    }
  }
  filledTotal += filled;
  console.log(`  补入 ${filled} 个文件`);
}

const final = audit(OUT);
const failCount = (final.text.match(/(\d+) 件未通过/)?.[1] ?? "0");
const ruleHits = {};
for (const r of ["R02", "R03", "R06", "R08", "R09", "R10"]) {
  ruleHits[r] = (final.text.match(new RegExp(`${r} fail`, "g")) || []).length;
}
console.log(`\n最终：补入 ${filledTotal} 个文件 · 未通过技能 ${failCount} 个`);
console.log("规则命中：" + Object.entries(ruleHits).map(([k, v]) => `${k}=${v}`).join(" "));
if (!existsSync(OUT)) console.log("（输出目录不存在）");
