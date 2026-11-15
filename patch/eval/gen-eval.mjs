#!/usr/bin/env node
// 生成两臂评估配置（zhaohua-eval-config/v1）
// 用法：
//   node gen-eval.mjs --a <旧技能目录> --b <新技能目录> --id cinedance-12d [--out <文件>] [--max-tokens 900]
//   不传 --out 时写到同目录 <id>.json
// 设计要点：
//   - 两臂的 system 就是两份 SKILL.md 全文（同一套任务、同一个模型），差别只在技能正文
//   - 断言只写"能从产出里数出来的东西"，不写主观判断
//   - 不调用模型；真跑由 zhaohua eval 负责（需要 QKD_MODEL_API_KEY）

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const A = arg('a');
const B = arg('b');
const id = arg('id', 'eval');
const maxTokens = Number(arg('max-tokens', '900'));
const out = arg('out', path.resolve(process.argv[1], '..', `${id}.json`));

if (!A || !B) {
  console.error('用法：node gen-eval.mjs --a <旧技能目录> --b <新技能目录> --id <名字> [--out <文件>]');
  process.exit(1);
}
for (const [label, dir] of [['--a', A], ['--b', B]]) {
  if (!existsSync(path.join(dir, 'SKILL.md'))) {
    console.error(`eval: ${label} 指向的目录里没有 SKILL.md：${dir}`);
    process.exit(1);
  }
}

const readSkill = (dir) => readFileSync(path.join(dir, 'SKILL.md'), 'utf8').trim();

// 任务：都是"照着技能干活"，不额外加方法提示，差别只来自技能正文
const tasks = [
  {
    id: 't1-shotlist',
    prompt:
      '一场戏：雨夜，女儿在巷口等母亲回家，手里攥着被打湿的试卷。' +
      '请按你的技能，把这场戏拆成可用于生产的镜头，并标出每一镜的镜号、景别、机位意图、运镜节奏与时长。' +
      '只输出表与必要说明。',
  },
  {
    id: 't2-prompt',
    prompt:
      '接着上一步：请为上面第 2 个镜头写一条可直接投喂 MiniMax H3 的视频提示词。' +
      '要包含时长与画幅、首帧构图、时间推进中的动作与摄影机、声音，以及连续性限制。只输出提示词本体。',
  },
];

// 断言：可被正则数出来，且能区分"有结构"与"随口说"
const assertions = [
  { id: 'has-shot-number', pattern: '镜\\s*\\d+|镜号|S\\d+\\s*/\\s*\\d+' },
  { id: 'has-shot-size', pattern: '特写|近景|中景|全景|远景|大远景' },
  { id: 'has-camera-intent', pattern: '机位|视点|轴线|越轴|正反打|主观' },
  { id: 'has-movement', pattern: '推|拉|摇|移|跟|升降|手持|固定' },
  { id: 'has-duration', pattern: '\\d+(\\.\\d+)?\\s*(s|秒)' },
  { id: 'has-aspect', pattern: '16\\s*[:：]\\s*9|9\\s*[:：]\\s*16|画幅' },
  { id: 'has-sound', pattern: '声音|环境声|音效|对白|配乐' },
  { id: 'has-continuity', pattern: '连续性|一致|衔接|不跳轴|同光源' },
];

const config = {
  schema: 'zhaohua-eval-config/v1',
  model: 'deepseek-chat',
  max_tokens: maxTokens,
  temperature: 0.2,
  tasks,
  arms: [
    { id: 'before', system: readSkill(A) },
    { id: 'after', system: readSkill(B) },
  ],
  assertions,
};

writeFileSync(out, JSON.stringify(config, null, 2), 'utf8');

const kb = (s) => (Buffer.byteLength(s, 'utf8') / 1024).toFixed(1) + ' KB';
console.log(`已生成：${out}`);
console.log(`  臂 before = ${A}  (${kb(config.arms[0].system)})`);
console.log(`  臂 after  = ${B}  (${kb(config.arms[1].system)})`);
console.log(`  任务 ${tasks.length} 条 · 断言 ${assertions.length} 条 · max_tokens ${maxTokens}`);
console.log(`  粗算成本：${tasks.length * 2} 次调用 × ↑${Math.round((config.arms[0].system.length + config.arms[1].system.length) / 2 / 3.5)} tokens`);
