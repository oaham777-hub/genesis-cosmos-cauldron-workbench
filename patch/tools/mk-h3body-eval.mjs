/**
 * 把 gen-eval 生成的配置换成「H3 生产任务 + H3 契约断言」，
 * 用来测「正文补硬门」到底有没有用（任务要求像真生产那样整场编译）。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const SRC = ROOT + '\\patch\\eval\\cinedance-gate12.json';
const OUT = ROOT + '\\patch\\eval\\cinedance-h3body.json';

const cfg = JSON.parse(readFileSync(SRC, 'utf8'));
cfg.schema = 'zhaohua-eval-config/v1';
cfg.max_tokens = 2600;
cfg.tasks = [
  {
    id: 't-h3-whole',
    prompt: [
      '场景：雨夜巷口，阿砚与老周争一只怀表。镜表已经确认，共 3 镜：',
      'S12-01 大远景 4 秒；S12-02 中景 3 秒（阿砚伸手）；S12-03 特写 2 秒（怀表落地）。',
      '画幅 9:16，雨夜，冷调，手持。',
      '请按 09 CINEDANCE 的交付要求，**直接产出可生产的 MiniMax H3 提示词**：整场一次编译、逐镜成段，',
      '全局设定只在开头写一次，每镜写清景别/机位/动作/时间推进/声音，最后给连续性约束。',
      '不要解释方法，不要复述我的要求，只给成品。',
    ].join('\n'),
  },
];

cfg.assertions = [
  { id: 'a1-shot-ids', pattern: 'S12-0[123]' },
  { id: 'a2-duration', pattern: '\\d+\\s*秒' },
  { id: 'a3-shot-size', pattern: '大远景|中景|特写' },
  { id: 'a4-aspect', pattern: '9:16' },
  { id: 'a5-sound', pattern: '声音|音效|环境声|雨声|对白' },
  { id: 'a6-continuity', pattern: '连续性|一致|不得|禁止|保持' },
  { id: 'a7-global-once', pattern: '全局' },
  { id: 'a8-action', pattern: '伸手|抓|落|夺|推|拽' },
];

writeFileSync(OUT, JSON.stringify(cfg, null, 2), 'utf8');
console.log('已生成 ' + OUT + ' · 任务 ' + cfg.tasks.length + ' · 断言 ' + cfg.assertions.length);
console.log('臂：' + cfg.arms.map((a) => a.id).join(' / '));
