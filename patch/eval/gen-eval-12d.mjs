// 生成"12 维并进正文"两臂评估配置（不调模型，纯读文件）
//
// 用法：node gen-eval-12d.mjs --a <旧技能目录> --b <新技能目录> --out <config.json> [--max-tokens 2600]
//
// 两臂 system 就是两份 SKILL.md 全文；任务、断言写死在这，好对比。
// 为什么不用 pipeline 而直接原地生成：这里要的是"同一套任务、同一个模型，只差技能正文"。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, def = null) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const a = arg('a');
const b = arg('b');
const out = arg('out', 'cinedance-12d-ab.json');
const maxTokens = Number(arg('max-tokens', '2600'));
if (!a || !b) {
  console.error('需要 --a <旧目录> --b <新目录>');
  process.exit(1);
}

const read = (p) => readFileSync(resolve(p), 'utf8');

const tasks = [
  {
    id: 't1-shotlist',
    prompt:
      '素材：一场雨夜戏。外卖员陈默（@C-01）抱着保温箱蹲在 6 楼走廊门外，隔着门缝跟门内的女儿小陈（@C-02，只露手）说话，想把餐盒塞进去，被门链挡住。' +
      '先按镜头表把这 30 秒拆成 6 个镜头（镜号、时长、景别、机位意图、运镜、画面内容、声音），再说明每镜交给下游做什么。',
  },
  {
    id: 't2-h3-prompt',
    prompt:
      '接上题，只写第 4 镜（门缝张开、手递餐盒、对白一句）的生成提示词：模型用 MiniMax H3 首帧模式（I2VA），时长 8 秒，竖屏 9:16。' +
      '要能直接投给视频模型，不要解释写作过程。',
  },
];

// 12 条断言，一条对一维；用能在成片文本里检出的字面特征
const assertions = [
  { id: 'd01-concept-purpose', pattern: '目的|本条要|观众要' },
  { id: 'd02-subject-binding', pattern: '@C-0\\d|@[A-Z]-\\d' },
  { id: 'd03-camera-params', pattern: 'f/\\d|1/\\d{2,3}|ISO\\s*\\d' },
  { id: 'd04-shot-language', pattern: '景别|近景|中景|全景|特写|运镜' },
  { id: 'd05-visual-direction', pattern: '风格|质感|写实|色调体系' },
  { id: 'd06-skin-or-material', pattern: '皮肤|材质|水膜|纹理' },
  { id: 'd07-color-ratio', pattern: '\\d{1,3}\\s*%' },
  { id: 'd08-lighting', pattern: '主光|光比|补光|实用光' },
  { id: 'd09-end-state', pattern: '终态|结束时|最后停在' },
  { id: 'd10-timeline', pattern: '第\\s*\\d+\\s*秒|\\d+\\s*[-–]\\s*\\d+\\s*秒|0[-–]8\\s*秒' },
  { id: 'd11-sound-tracks', pattern: '同期声|音效|人声|音乐' },
  { id: 'd12-boundary', pattern: 'A 段|B 段|边界|负向词' },
];

const cfg = {
  schema: 'zhaohua-eval-config/v1',
  model: 'deepseek-flash',
  max_tokens: maxTokens,
  temperature: 0.3,
  tasks,
  arms: [
    { id: 'A-current', system: read(`${a}/SKILL.md`) },
    { id: 'B-12d-inline', system: read(`${b}/SKILL.md`) },
  ],
  assertions,
};

mkdirSync(dirname(resolve(out)), { recursive: true });
writeFileSync(resolve(out), JSON.stringify(cfg, null, 2), 'utf8');
console.log(
  `写好了 ${out}\n  任务 ${tasks.length} 条 / 断言 ${assertions.length} 条 / 臂 ${cfg.arms.length} 个 / max_tokens ${maxTokens}\n` +
    `  A 臂 ${cfg.arms[0].system.length} 字 · B 臂 ${cfg.arms[1].system.length} 字`,
);
