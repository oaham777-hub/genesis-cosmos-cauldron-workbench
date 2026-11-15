// 端到端冒烟：一场戏 → 07.5 镜表 → 08 表演 → 09 H3 提示词
// 用法：bun smoke.mjs [--scene <文本文件>] [--out <目录>] [--max-tokens 2200]
// 模拟运行时的行为：读 SKILL.md（+ 该阶段需要的 references），逐阶段产出并落盘，最后做机械检查。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const SKILLS = 'D:\\造化乾坤鼎-工作台\\patch\\skills';
const KEY_FILE = 'D:\\造化乾坤鼎-工作台\\patch\\secrets\\deepseek.key';
const argv = process.argv.slice(2);
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const MAXTOK = Number(val('--max-tokens', '2200'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = val('--out', `D:\\造化乾坤鼎-工作台\\patch\\smoke\\${stamp}`);
mkdirSync(OUT, { recursive: true });

const KEY = readFileSync(KEY_FILE, 'utf8').trim();
const rd = (p) => { const f = `${SKILLS}\\${p}`; return existsSync(f) ? readFileSync(f, 'utf8') : `[缺文件 ${p}]`; };

const SCENE = val('--scene') && existsSync(val('--scene'))
  ? readFileSync(val('--scene'), 'utf8')
  : `场 12 · 雨夜巷口 · 内／外
人物：阿砚（30 岁，修表匠，寡言）、老周（55 岁，债主的手下）
时间：凌晨两点。雨。
动作：阿砚被堵在巷子里，手里攥着一只坏掉的怀表。老周要他把表交出来。阿砚把表攥得更紧，说这只表不值钱。老周不信，伸手来夺。阿砚后退一步，背贴到湿墙上。两人对峙。远处有车灯扫过巷口。
对白：
老周：别装了，东西给我。
阿砚：表停了。（停顿）修不好。
老周：那你留着干什么？
阿砚：（沉默，把表塞进内袋）
结尾：老周笑了一下，转身走了。阿砚没动，雨水顺着他下巴滴到表链上。`;

async function chat(system, user, tag) {
  const t0 = Date.now();
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: MAXTOK,
      temperature: 0.3,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(tag + ' HTTP ' + res.status + ' ' + (await res.text()).slice(0, 300));
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content || '';
  writeFileSync(`${OUT}\\${tag}.md`, text, 'utf8');
  return { text, usage: j.usage, ms: Date.now() - t0, finish: j.choices?.[0]?.finish_reason };
}

const sysShotlist = [
  rd('film-shotlist\\SKILL.md'),
  '## 参考资料：镜头方法', rd('film-shotlist\\references\\shotlist-method.md'),
  '## 参考资料：镜头语言系统', rd('film-shotlist\\references\\shot-language-system.md'),
  '## 参考资料：连续性台账', rd('film-shotlist\\references\\continuity-ledger.md'),
].join('\n\n');

const sysActing = [
  rd('film-acting\\SKILL.md'),
  '## 参考资料：对白与表演', rd('film-acting\\references\\dialogue-performance.md'),
].join('\n\n');

const sysPrompt = [
  rd('film-cinedance\\SKILL.md'),
  '## 参考资料：H3 提示词格式', rd('film-cinedance\\references\\h3-prompt-format.md'),
  '## 参考资料：提示词十二维', rd('film-cinedance\\references\\prompt-12d.md'),
  '## 参考资料：编译门', rd('film-cinedance\\references\\compile-gate.md'),
  '## 参考资料：失败模式', rd('film-cinedance\\references\\failure-modes.md'),
].join('\n\n');

const results = [];
const log = (o) => { results.push(o); console.log(JSON.stringify(o)); };

// ① 07.5 镜表
const r1 = await chat(sysShotlist,
  `下面是一场戏的定稿内容。请按你负责的 07.5 SHOTLIST 阶段规范，把它拆成镜表：\n\n${SCENE}\n\n只输出镜表（表头 8 列 + 每镜两行 + 状态），不要写提示词，不要解释。`,
  '01-shotlist');
log({ stage: '07.5 镜表', ms: r1.ms, tokens: r1.usage, chars: r1.text.length, finish: r1.finish });

// ② 08 表演（取第一镜）
const firstShotNo = (r1.text.match(/S\d{2}-\d{2}/) || ['S12-01'])[0];
const r2 = await chat(sysActing,
  `这是已经确认的镜表节选：\n\n${r1.text.slice(0, 4500)}\n\n请只为【${firstShotNo}】这一个镜头写表演与演出块（不改镜头、不切镜、不写提示词）。`,
  '02-acting');
log({ stage: '08 表演', ms: r2.ms, tokens: r2.usage, chars: r2.text.length, finish: r2.finish });

// ③ 09 H3 提示词（按新规则：整场一次编译、逐镜成段）
const r3 = await chat(sysPrompt,
  `镜表：\n${r1.text.slice(0, 4500)}\n\n${firstShotNo} 的表演块：\n${r2.text.slice(0, 2000)}\n\n请按你的默认粒度【整场一次编译、逐镜成段】为整张镜表编译 MiniMax H3 提示词：开头写一次全局设定（模式/画幅/色调/光比/环境），之后每镜只写该镜的画面、动作、声音与连续性约束。镜号用镜表原号。只输出提示词正文。`,
  '03-h3prompt');
log({ stage: '09 H3 提示词', ms: r3.ms, tokens: r3.usage, chars: r3.text.length, finish: r3.finish });

// ④ 机械检查
const checks = [];
const add = (id, name, ok, detail) => checks.push({ id, name, ok: !!ok, detail });

const sl = r1.text;
add('C1', '镜号用 S<场>-<镜> 两级格式', /S\d{2}-\d{2}/.test(sl) && !/(^|\|)\s*S0?1\s*(\||$)/m.test(sl));
add('C2', '镜表有 8 列表头', (sl.match(/\|/g) || []).length > 16);
add('C3', '镜表每镜带状态', /(已定|待定|待确认|废弃)/.test(sl));
add('C4', '镜表含镜头语言五项', ['景别', '机位', '运镜', '构图', '视点'].every((k) => sl.includes(k)), ['景别', '机位', '运镜', '构图', '视点'].filter((k) => !sl.includes(k)).join('/'));
add('C5', '镜表没写提示词', !/(`|提示词正文|At 00:0)/.test(sl.slice(0, 800)));
add('C5b', '镜表给了镜号清单行', /镜号[:：]/.test(sl));

const ac = r2.text;
add('C6', '表演块有三段结构 目标/障碍/动作', ['目标', '障碍', '动作'].every((k) => ac.includes(k)), ['目标', '障碍', '动作'].filter((k) => !ac.includes(k)).join('/'));
add('C7', '表演块用镜表原号且不切镜', ac.includes(firstShotNo) && !/(再切|新增镜头|拆成两个镜)/.test(ac), firstShotNo);

const pr = r3.text;
const nos = [...new Set(pr.match(/S\d{2}-\d{2}/g) || [])];
add('C8', '提示词声明了模式', /(T2VA|I2VA|FL2VA|L2VA|Ref2VA)/.test(pr));
add('C9', '提示词含时长/画幅', /(\d+\s*[秒s]|16:9|9:16|2\.35:1)/.test(pr));
add('C10', '提示词含声音段', /(环境声|动作声|配乐|音效|声音)/.test(pr));
add('C11', '提示词含连续性限制', /(连续|一致|不得|禁止)/.test(pr));
add('C12', '没有"同上/继续"这类指代', !/(同上|继续上一|上一镜头)/.test(pr));
const ascii = (pr.match(/[\x00-\x7F]/g) || []).length / Math.max(1, pr.length);
add('C13', '以中文为主（ASCII 占比 <35%）', ascii < 0.35, 'ascii=' + ascii.toFixed(2));
add('C14', '三段产物都没被截断', [r1, r2, r3].every((r) => r.finish !== 'length'), [r1, r2, r3].map((r) => r.finish).join('/'));
add('C15', '整场编译按镜号逐段（≥2 个镜号）', nos.length >= 2, '镜号数=' + nos.length);
add('C16', '全局设定只写一次（画幅 出现 ≤3 次）', (pr.match(/画幅/g) || []).length <= 3, '画幅出现=' + (pr.match(/画幅/g) || []).length);

const passed = checks.filter((c) => c.ok).length;
writeFileSync(`${OUT}\\_report.json`, JSON.stringify({ at: stamp, sceneChars: SCENE.length, stages: results, checks, passed, total: checks.length }, null, 2), 'utf8');
console.log(`\n=== ${passed}/${checks.length} 通过 · 产物在 ${OUT} ===`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.id} ${c.name}${c.detail ? '  [' + c.detail + ']' : ''}`);
