/**
 * 用 smoke.mjs 的机械检查当尺子：把「合格性」写成可判定的断言，
 * 再对 正文补硬门（before/after）两臂跑一次。
 * 需要 eval 支持 (pattern) 正则断言；计数类指标在结果里额外打印。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const SRC = ROOT + '\\patch\\eval\\cinedance-gate12.json';
const OUT = ROOT + '\\patch\\eval\\cinedance-mech.json';

const cfg = JSON.parse(readFileSync(SRC, 'utf8'));
cfg.schema = 'zhaohua-eval-config/v1';
cfg.max_tokens = 2600;

cfg.tasks = [
  {
    id: 'h3-whole-scene',
    prompt: [
      '镜表已确认（3 镜，全部 已定）：',
      '| 镜号 | 景别 | 时长 | 内容 |',
      '| S12-01 | 大远景 | 4 秒 | 雨夜巷口，阿砚与老周隔着积水对峙，怀表在老周手里 |',
      '| S12-02 | 中景 | 3 秒 | 阿砚伸手去夺，老周侧身挡住 |',
      '| S12-03 | 特写 | 2 秒 | 怀表脱手，砸进积水，水花溅起 |',
      '画幅 9:16，深夜暴雨，冷调，手持。',
      '请按 09 CINEDANCE 的交付要求产出可生产的 MiniMax H3 提示词：整场一次编译、逐镜成段，全局设定只写一次。',
      '只给成品，不要解释方法。',
    ].join('\n'),
  },
];

cfg.assertions = [
  // C8 模式声明（上两轮两臂都不写，这条会区分）
  { id: 'C8-mode', pattern: '(T2VA|I2VA|FL2VA|L2VA|Ref2VA)' },
  // C9 时长/画幅
  { id: 'C9-duration-aspect', pattern: '(\\d+\\s*[秒s]|9:16)' },
  // C10 声音段
  { id: 'C10-sound', pattern: '(环境声|动作声|配乐|音效|声音)' },
  // C11 连续性
  { id: 'C11-continuity', pattern: '(连续|一致|不得|禁止)' },
  // C12 禁止指代（负向）
  { id: 'C12-no-ditto', pattern: '^(?![\\s\\S]*(同上|继续上一|上一镜头))' },
  // C15 至少两个镜号（计数近似）
  { id: 'C15-two-shots', pattern: 'S12-0\\d[\\s\\S]*S12-0\\d' },
  // 首镜与末镜都在
  { id: 'C15b-first-last', pattern: 'S12-01[\\s\\S]*S12-03' },
  // 逐镜给时长（每镜段内出现秒数）
  { id: 'C17-per-shot-duration', pattern: 'S12-0\\d[^\\n]*\\d+\\s*秒' },
  // 全局设定只声明一次（≤3 次画幅，用负向前瞻近似）
  { id: 'C16-aspect-once', pattern: '^(?![\\s\\S]*(?:画幅[\\s\\S]*){4})' },
  // 不许把否定词写进 A 段（A 段出现"不要/禁止"即失败）—— 近似：整篇不以"不要"开头描述主体
  { id: 'C18-no-neg-as-A', pattern: '^(?![\\s\\S]*(画面主体不要|不要出现))' },
];

writeFileSync(OUT, JSON.stringify(cfg, null, 2), 'utf8');
console.log('已生成 ' + OUT + ' · 任务 ' + cfg.tasks.length + ' · 断言 ' + cfg.assertions.length);
