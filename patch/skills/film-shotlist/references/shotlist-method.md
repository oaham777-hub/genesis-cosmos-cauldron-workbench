---
name: qkd-shotlist
description: 乾坤鼎分镜层（L4）。当总控选中阶段 08 时使用；用于以导演与摄影师视角把剧本拆成镜头表，并产出分镜、摄影、画面、光影四类资产。不要用于最终提示词编译（交给 06-prompt）。
---

# L4 · 分镜层

> 本层产出**四类资产**（缺一不可）：分镜资产、摄影资产、画面资产、光影资产。
> 细则来源：`specs/staging.md`（导演）、`specs/cinematography.md`（摄影）、`specs/color-logic.md`（色彩）、`specs/lighting.md`（光影）。
> **摄影参数可直接抄用**：`references/camera-exposure-combos.md`（曝光与运动组合表 · 12 组矩阵 + 互斥判据 + 升格禁令）。

## 一、触发

总控选中「08 镜头规划」，或用户说“拆分镜”“出镜头表”“画控制图”“定机位”“布光”。

## 二、最小输入

已确认的剧本与拆解（含条目切分）+ L3 已确认的基础资产（人物/场景/道具）。

## 三、标准输出（**2026-10-11 整合：四类资产 → 一件一表 ＋ 按需控制图**）

| # | 资产 | 文件 | 内容 |
|---|---|---|---|
| 1 | **分镜表（主件）** | `05_shots/epNN-shotlist.md` | **每镜一行**，列为：镜号 ｜ 对应条目 ｜ 时长 ｜ 景别 ｜ 机位 ｜ 轴线 ｜ 控制等级 ｜ **第 4 维「镜头语言」**（景别/机位意图/运镜节奏/构图/视点） |
| 2 | **摄影参数（同表列）** | `05_shots/epNN-shotlist.md` → 列 **`摄影`** | 三要素、焦段/画幅/白平衡、承托与运动、焦点控制方案 |
| 3 | **画面锚点（同表列）** | `05_shots/epNN-shotlist.md` → 列 **`画面`** | 每镜画框内容：主体占位、前后景、色彩逻辑、画面锚点 |
| 4 | **光影方案（同表列）** | `05_shots/epNN-shotlist.md` → 列 **`光影`** | 布光：主光/方向/光质/柔硬/色温/光比/补光与实用光/光变化 |
| 5 | **控制图（按需）** | `05-control-prompts/epNN-sXX-control.md` | 选型记录 + 直通登记 + 逐图登记（编号/谱系/活跃版本/生成提示词/防渗三件套/绑定语句块）；**只交几何与时序**。规则见 `references/control-image.md`，模板见 `templates/control-sheet.template.md` |
| 6 | **场次登记与连续性事实** | 每场 `05_shots/<场次ID>/scene-registry.md` | L4/L6 版本状态、逐镜 12 项连续性快照和需要的场间接缝；不另建独立 `07_continuity/ledger.md` |

> **整合理由（2026-10-11）**：原四件是**同一批镜头的四种属性**，每镜一一对应。拆四件导致：① 每镜改一处要动 4 件；② L6 编译每镜要读 4 个文件；③ 四件之间的镜号必须手工对齐（这是漂移源）。**合并为一件一表、属性升级为列**，内容零删减，且镜号天然对齐。
> **列宽提示**：列多时用窄表 —— 每镜可写成两行（第 1 行分镜与镜头语言，第 2 行摄影/画面/光影），**体例见 `templates/control-sheet.template.md` 的表头行**。


> **下游：L6** 读 `epNN-shotlist.md`（1 件一表，覆盖第 3/4/7/8/10 维）、当前场 `scene-registry.md`（连续性事实与版本状态）、`05-control-prompts/*`（按需，非必读）。

**跨层承接**：在镜头表既有行/列中按 `references/entry-gates.md` §五将有效要求映射至镜号及摄影、画面、光影、时间轴字段；改写、拆分、缺失和待决定均留状态与理由，不另建追踪文件。

## 四、硬性规则

1. **镜头表未确认不得进入 L6 编译**（不可跳过的门）。
2. 四类镜头资产必须在**同一张表逐镜对齐**：同一镜号的分镜、摄影、画面和光影字段均可查到；连续性状态记在本场登记表。
3. 分镜必须回答：这场怎么拍、演员怎么演、摄影师走哪条线、场地与背景怎么设计。
4. 时间轴合计必须等于条目时长；时间轴不得闭合失败的条目不得下传。
5. 光影必须有**动机光**（画面里能找到光源来源）。
6. 色彩必须先写主体面积颜色、再写综合色调（两层缺一不可）。
7. 摄影参数必须写好「参数 → 画面结果」的因果，不做数字堆砌。
8. 一条一意：需要「并且」才说得全的镜头 = 切分失败。
9. 内部术语（库存解、潜台词等）不得进入本层产物之外的交付物。
10. **镜头语言必须独立成字段**（对应提示词第 4 维）：景别 / 机位意图 / 运镜节奏 / 构图策略 / 视点归属，缺一不得下传 L6。

## 五、审计标签

`[无镜头目的]`、`[一条多意]`、`[越轴]`、`[参数矛盾]`、`[无摄法]`、`[无焦点]`、`[无动机光]`、`[光比缺失]`、`[无占比]`、`[时间轴不闭合]`、`[四类资产不对齐]`

## 六、引用源

`乾坤鼎Agent/specs/{staging,cinematography,color-logic,lighting}.md`
`_incoming/分镜构建器_1_/deepwhite-shotlist-builder-zh-user`（CAMERA_EMOTION / SPATIAL_BLOCKING / PROMPT_DENSITY / MICRO_BEATS / STORYBOARD_ASSETS / DELIVERY_FORMAT）
`_incoming/cinematic-shot-design电影镜头/cinematic-shot-design-v2.0`（camera/framing/optics/lighting/focal-length-cases/director-matching）
`_incoming/Seedance-Director-4.0-master/.../.claude/skills/{jingtoubiao,kongzhitu,gongyi,lianxu}`（`gongyi` 兼用 · 主归 L6）
`_incoming/XiaoLuo-AI-Drama-Skill-main/`（小逻 分镜脚本 / 九宫格 / 场景俯视布局）
`_incoming/manju-laoli-skill-main/.../references/{camera-specs-15rules,camera-transitions-6types,spatial-reference-system-V3,spatial-topview-camera,action-previs-15grid}`
`乾坤鼎Agent/imports/novel-storyboard`（段→分镜→分镜图三层结构）
`乾坤鼎Agent/imports/xiaomo-storyboard`（小墨 6.0 §9 场景空间类型识别 / 6.3 短剧视感机位）
`乾坤鼎Agent/imports/seedance-storyboard-3.0`（`camera`、`shot-design`、`blocking`、`continuity`、`control-image`）

**本层补厚（v02）**

- `references/shot-language-system.md`——景别序列、焦段与光学、机位角度、运镜与频率上限、构图与视点五要素
- `references/space-blocking-and-axis.md`——空间类型识别与镜头适配、调度（主镜/覆盖/插入）、180° 轴线与 30° 规则、门与缝母题
- `references/continuity-ledger.md`——连续性记录 schema；实际项目记录写入每场 `scene-registry.md`，包括 12 项状态机、跨场落幅与接缝审计、回退与「已过期-禁止使用」标记
- `references/camera-exposure-combos.md`（**v04 新增**）——曝光与运动组合表：快门/快门角取景表、快门选档五判据、光圈场景判定与 ISO 决策树、ND 用法、三条互斥、承托与运动的三条曝光绑定、**升格禁令与三处例外**、12 组可直接抄用的组合矩阵、七条自检
- `templates/shot-table.template.md`（**含原 shot-assets 的摄影/画面/光影三表口径** · 2026-10-11 合并）、`templates/frame-sheet.template.md`

## 七、本层采纳与自写件（**只列件名 · 来源 / 许可 / 提炼内容一律见台账**）

- **外部采纳（MIT）**：`references/control-image.md` ＋ `templates/control-sheet.template.md`
- **自写 / 补厚**：`references/camera-exposure-combos.md` · `references/scene-coverage-and-first-frame.md` · `references/take-and-loop-design.md`
- 台账：`external-adoption.md` §二 / §三 · `thickening-log.md` §一（L4 行）＋ **§六「自写件 ↔ 文件名 对照」**（第 4–6 行）
- **专家资料库路线（2026-10-02 · 第 32 号源）**：`imports/yangzi-v331-heatfix/film-expert-bridge/references/library/{combat,ultimate,general}/`（**打戏 77 ＋ 大招 14 ＋ 镜头语言 57**）；核心模块 `imports/yangzi-v331-heatfix/film-expert-bridge/references/modules/{shot_grammar,director,combat,ultimate}.md`；索引见 `skills/00-router/references/expert-library-index.md` §二/§三/§4.1/§4.5

## 专家增强（可选 · 本层**专属** · 2026-10-02 吸收洋子 V3.3.1）

**本层专属项共 21 项 ＋ 08-Q**：`00-A~00-G` 镜头语言工具箱（7）· `08-A~08-G` 常规分镜（7）· `08-H~08-M` 战斗（6）· `08-N~08-P` 玄幻大招（3）；`08-Q` 由 L6 负责，本层只登记是否启用。

**边界**：不是新阶段、不替换本层正式成果；**选定前不读任何正文**；每层只弹一次菜单；`00-A~00-G` **不是第 00 阶段**，与本层 08 菜单**同屏显示、共同推荐**，不另弹一次。

**展示格式（强制）**：先列 1–3 项智能推荐（**写明推荐理由，引用当前项目事实**），紧接着列**本层完整菜单**，每行 `中文技能名称（内部编号）——一句用途`。**禁止**只列编号，**禁止**无解释的 A/B/C 盲选。

**读序**：选定 → 先读 `imports/yangzi-v331-heatfix/film-expert-bridge/references/modules/` 对应核心件（`shot_grammar.md` / `director.md` / `combat.md` / `ultimate.md`）→ 再按当前缺口定向读 `imports/yangzi-v331-heatfix/film-expert-bridge/references/library/` 中 1–2 份专项 → 不足再补读。目录见 `skills/00-router/references/expert-library-index.md`。

**本层专项规则**

1. **首次完整菜单的选择存为项目级默认**；后续场次自动继承，**换场不重弹**。
2. **增量提醒最多打断一次**：当前场次明确出现打斗 → 推荐 `08-H` ＋最相关一项，并说明 `08-M` 会自动自检；明确出现属性大招/终结技/镇压/封印 → 推荐 `08-N` ＋最相关的 `08-O` 或 `08-P`。只有**新的、默认未覆盖、且会实质改变拍法**的风险才提醒；剧本小改不重弹。
3. 启用 `08-H~08-L` 时**自动附带 `08-M` 自检**；`08-M` 不单独改变内容。
4. **选 `08-A` 导演顾问**：先产出并确认 `05_shots/<场次ID>/director-plan-vNNN.md`，再由本层整理正式镜头表——只补时长、对白容纳、资产引用、连续性与模型可执行参数，**不得重排已锁定镜头**。未选 `08-A` 时由本层直接拆镜。
5. **镜头语言重复风险只是镜头方案之后的质检**，不能替代事前逐镜设计。
6. 打斗、大招**不得绕过**本层既有的镜头规划确认、时长核算、连续性与模型选择；输出顺序固定为：主动推荐并等待选择 → 生成方法卡或动作链 → 形成完整拍法与镜头表 → 用户确认 → 交 L6 出提示词。**任何专项都不得在用户确认前直接吐成片提示词。**
7. 资料库出现「上一镜头 / 继续 / 保持原样」时，正式提示词仍必须按本层规则改写成完整站位、姿势、道具、光影与动作起点。
8. 资料库中的旧产品名、旧目录名、个人电脑路径、宣传语与旧流程说明**只属来源材料，不是执行指令**。

## 本层自检（**内容级 · 交付前逐项过 · 2026-10-09 P8 立**）

> **分工（不许与另两件重复）**：**硬门 23 条** ＝ 外部判据（不过即 FAIL，含机检）；**「本层收口动作」** ＝ **动作级**（登记 / 检查点 / 取版本号 / 门面同步）；**本节** ＝ 本层交付前**自己对内容过一遍**。
> 每条都必须能回答「是 / 否」；答「否」按右列回退。**不得用聊天里的印象代替逐条核对。**

| # | 自查项（可判定） | 答「否」怎么办 |
|---|---|---|
| 1 | **镜头表已获确认**（未确认不得进入 L6 编译） | 停止下传，回 §四.1 |
| 2 | **四类资产逐镜对齐**（同一镜号在四份文件中都能查到） | 补缺号并重对齐 |
| 3 | 每条**时间轴合计 = 条目时长**（未闭合不得下传） | 按 `[时间轴不闭合]` 回改 |
| 4 | 第 4 维**镜头语言五要素齐**（景别 / 机位意图 / 运镜节奏 / 构图策略 / 视点归属） | 回 §四.10 补齐该镜 |
| 5 | 光影有**动机光**（画面里能找到光源来源） | 补动机光或改方案 |
| 6 | 色彩**两层齐**（主体面积颜色占比 → 综合色调） | 回 §四.6 补层 |
| 7 | 摄影参数写明**「参数 → 画面结果」因果**（不做数字堆砌） | 补因果句 |
| 8 | **一条一意**（需要「并且」才说得全的镜头 ＝ 切分失败） | 切分该镜 |
| 9 | 分镜回答了四问（这场怎么拍 / 演员怎么演 / 摄影师走哪条线 / 场地与背景怎么设计） | 回 §四.3 重写该场 |
| 10 | **内部术语未进本层之外的交付物**；控制图**只交几何与时序**（选型记录 ＋ 直通登记 ＋ 逐图登记齐） | 删术语；补登记项 |
| 11 | **审计标签已逐条核对**（`[无镜头目的]`…`[四类资产不对齐]` 无遗留） | 按标签回改并复检 |

## 本层收口动作（**每层都执行 · 2026-10-02 立**）

> 本节是**硬门 21（登记门）/ 22（检查点门）**与 S-28 在各层的落点。此前这些规则只写在 L0，
> 导致"产出后不登记、切层不写检查点、版本号靠猜"在**各层都没有审计点**（实测：本轮吸收即因此漏掉项目骨架同步 → `STATE-CARD` A14）。

1. **产出后必须登记**：落盘 → 在项目 `00_project/artifact-registry.md` 记一行（当前草稿 / 最新已确认 / 状态 / **直接依据** / 下游影响）；用户在聊天里确认后才升级为 `已确认-当前`。**登记只写这一件**（原 `artifact-state.json` 机读副本已于 2026-10-11 删除 · 见 S-28）。
2. **阶段边界检查点**：只在 L2、L4、L6 收口时，将已确认决定、未确认想法、待用户决定与停止点更新到 `00_project/project-status.md` 的检查点节；不另建独立检查点文件。普通轮次不重复写控制记录。
3. **版本号一律 `vNNN`**：**扫描同目录取最大编号 ＋1**，不得靠聊天猜；写文件用「临时文件写完再替换」。
4. **门面同步**：本层若发生**口径变更**（交付口径 / 维度数 / 层职责范围），**必须回头核**本层 `SKILL.md` 的 `frontmatter.description`，再重算索引 `desc`，并跑 `node tools/index-check.mjs` 验证规则 F。
5. **不得跳项交付**：产物已落盘但未登记 ⇒ **不得作为下一层输入**；登记路径不可读 ⇒ 标 `缺文件-阻断`，先修再走。


## 八、下游

四类资产（+ 按需的控制图）→ L6 编译（12 维中第 3、4、6、7、9 维来自本层；控制图的绑定语句块交编译层翻译为平台参考位）。

## 十二、投喂来源吸收（v0.4.1 · P2c，全文见 references）

本层曾把 15 件投喂技能按“吸收 · <包> · <技能>”标题整段并入正文；为控制注入体量，
整段原文已移至 `references/absorbed-p2c.md`（按包名/技能名检索）。
0.7.0 新增的规则级吸收仍在本文末尾 `<!-- absorb:… -->` 区块内，逐条可追溯，勿删标记。

| 文件 | 何时读 |
|---|---|
| `references/absorbed-p2c.md` | 需要查旧吸收段的原文措辞、参数表或流程细节时 |

<!-- absorb:废才_Seedance分镜师3.0_9.6号:begin -->
## 吸收：废才_Seedance分镜师3.0_9.6号（只读来源，逐条可追溯）

来源：投喂原件（sha256 8ee682373b61…，路径见 merge-log.jsonl）

- 镜头表：场头空间地图块——由 shot-design 装载本卡实例化，有正反打、多人或走位的场全七行，单人场两行版；每镜的空间行——画面左/右 + 地标 + 躯干朝向 + 视线。
- 动态提示词：总述段的空间两行——从场头块压出来，压法见 scene-design 的 spatial-map-template.md [进条]；分段剧情里的站位句、首帧一句、切镜后的重述一句。
- retake 诊断：瞬移、左右互换、越轴、首帧空场、视线反向类症状按本卡归因。
- 要"人物走入画面"必须显式设计为动作
- 单人场或双人固定位无正反打的场两行版：地标绑定 / 排布
- 约 1 秒的固定广角，全员入画静态站位，无台词无实质动作，让模型把排布拍照存档
<!-- absorb:废才_Seedance分镜师3.0_9.6号:end -->

<!-- absorb:Seedance-Director-4.0-master:begin -->
## 吸收：Seedance-Director-4.0-master（只读来源，逐条可追溯）

来源：投喂原件（sha256 3ac4ff3c82ca…，路径见 merge-log.jsonl）

- 不可转让候选在案或展示轨标无
- 不对称：片种、时代锚、一致性、P0、核心场意图、风格轴必须确定度 1/2 级
- 禁止按题库从头审
- 从未达「过」的卡里挑最多 3 个会害重生成的，其余标 [假设]
- 开场必须上下文无关：「这故事最早是怎么冒出来的？哪个画面最先出现在你脑子里？给我就好
- 叙事轨把情绪终点、母题、那件物件、破格处收进那句话和最终影像，最终影像必须可画
- 钉死：非目标 ≥3、雷区过问、P0 与弃场顺序、成功标准 1–3、默认拒的偷懒拍法一类、不可转让候选一件
- 本站不改稿，但必须让他看见弱点并拍板
- 叙事高光点名库存解与不可转让
- 只有梗概：立骨架（目标 / 障碍 / 战术方向 / 至少一处反转 / 判词粗线）
- 1 原话 2 读回点头 3 [假设] 必须带依据与错了会怎样 4 [待补充] 不阻塞 5 [待确认 · 阻塞] 不拍板不放行
- 禁止无锚夸「很棒」
- 禁止把内部档位、步骤名说给用户
- 禁止形容词直接入库
- 禁止把参考片名当规格照抄
- 禁止替用户拍创作板
- 禁止引导性问题
- 禁止捆绑提问
- 禁止本站改剧本、拆条、写提示词
- 禁止跳过 ★拷问确认
- 禁止凭记忆断言参考片视觉事实
- 禁止展示轨硬套欲望障碍
- 禁止通用基准段召唤具体陈设物件
- 禁止把强调色、烤入项写进层 1
- 禁止空脑按题库从头审
- 禁止只写情绪词、无可见证据就落盘
- 禁止把十栏读戏表、人名风格库、DIRECTOR-8 字母链写进蓝图
<!-- absorb:Seedance-Director-4.0-master:end -->

<!-- absorb:分镜构建器_1_:begin -->
## 吸收：分镜构建器_1_（只读来源，逐条可追溯）

来源：投喂原件（sha256 3ebf27d459d6…，路径见 merge-log.jsonl）

- User's explicit style direction.
<!-- absorb:分镜构建器_1_:end -->

<!-- absorb:giant-scale-scene-skill-main:begin -->
## 吸收：giant-scale-scene-skill-main（只读来源，逐条可追溯）

来源：投喂原件（sha256 a6981ca4278d…，路径见 merge-log.jsonl）

- > 禁止只依赖“万米、百万米”等数字
- 巨物画面必须存在明确尺度参照
<!-- absorb:giant-scale-scene-skill-main:end -->

<!-- absorb:MiniMax-h3-视频复刻skill:begin -->
## 吸收：MiniMax-h3-视频复刻skill（只读来源，逐条可追溯）

来源：投喂原件（sha256 91b3b2edab9e…，路径见 merge-log.jsonl）

- Input combination：H3 mode：Output format
- Only a first-frame image：I2VA：Instruction line + integrated_multimodal_description + overall_soundscape + non_diegetic_music
- First + last frame images：FL2VA：Alignment line + three core fields
- Only a last-frame image：L2VA：Alignment line + three core fields
- No images, text only：T2VA：Three core fields directly
- Layer：visual_remix_locked：selective_remix (user-specified)
- Timeline / shot order / beat timing：preserve：per user
- Camera (shot size, angle, movement)：preserve：per user
- Composition (subject position, framing)：preserve：per user
- Actions (body movement, gestures, turns)：preserve：per user
- Transitions：preserve：per user
- Audio timing (beat hits, SFX triggers)：preserve：per user
- Character appearance (face, hair, costume)：replace with user image：per user
- Environment / background / lighting：replace or adapt：per user
- Props / product appearance：adapt (function preserved, look replaced)：per user
- Music style / audio texture：replace or adapt：per user
- File：When to read
- references/deconstruction-schema.md：When producing a structured JSON deconstruction. Defines the shot table format, required fields, and confidence levels.
- references/eval-cases.json：Edge cases and expected behaviors for tricky requests (prop replacement, prompt-only evidence, free rebuild, etc.).
<!-- absorb:MiniMax-h3-视频复刻skill:end -->
