# 落位表：我们的东西 → Toonflow 的哪个文件

按 m01582 的结论（对方是"清单常驻、正文按需、软编排 + 硬工具"）推出来的唯一正确落法。

## 三条原则

1. **跟阶段走，不跟原名走**。乾坤鼎叫 L4/L6，Toonflow 叫 08/09；落位以"哪个阶段用得上"为准，不以来源编号为准。
2. **一份规范只能有一个家**。copy 出去就分叉了。其他技能要引用，就写相对路径（跨技能也行，实测 `ai-film-router/references/*` 被 11 个技能引用）。
3. **台账不进技能目录**。`index.json` 489 KB、`merge-map.md` 75.8 KB、`absorbed-p2c.md` 158.6 KB 这类是"治理证据"，不是"给模型读的方法"，进技能只会撑爆上下文预算。

## 一、按阶段落位（Toonflow 01–09 为骨架）

| 阶段 | 技能 | 现有 | 并入什么 | 目标路径 |
|---|---|---|---|---|
| 00 | `ai-film-router` | 18 refs / 160 KB | 不改。只在 09 入口处补一句"先出镜表" | — |
| 01 | `film-synopsis` | SKILL + source.md | 乾坤鼎 `01-story` 概念锚 + 全片情绪曲线 | `references/concept-anchor.md` |
| 02 | `film-characters` | SKILL + source.md | `01-story` 角色圣经 | `references/character-bible.md` |
| 03 | `film-worldbuilding` | SKILL + source.md | `01-story` 世界观/信息不对称 | `references/world-rules.md` |
| 04 | `film-treatment` | SKILL + source.md | `01-story` 分场大纲 + 全片情绪曲线走向 | `references/scene-plan.md` |
| 05 | `film-screenplay` | SKILL + source.md + novel-adaptation | `02-script` 台词机检 + 结构机检 | `references/line-check.md` |
| 06 | `film-stress-test` | SKILL + source.md | `02-script` 生产拆解 + 机检清单 | `references/production-breakdown.md` |
| 07 | `film-lira-assets` | SKILL + 3 refs（已有 asset-strategy 等） | `03-assets` 资产清单核对 + 一致性锁 | `references/asset-lock.md` |
| 08 | `film-acting` | SKILL + source.md | `05-acting` 情绪谱 + 微表情 + 节拍 | `references/emotion-spectrum.md` |
| **09** | `film-cinedance` | 11 refs / 140 KB | **`04-shotlist` 镜表 5 份 + `06-prompt` 十二维/门禁 5 份** | 见下 |

### 09 是唯一真缺口，落法

乾坤鼎后半拆 4 格（06 资产 / 07 表演 / 08 分镜 / 09 提示词），Toonflow 只有 3 格（07 资产 / 08 表演 / 09 分镜+提示词）。所以**不新增阶段**，把镜表塞进 09 的引用层，并在 `SKILL.md` 正文加一步"先出镜表，再写提示词"。

`data\skills\film-cinedance\references\` 新增：

| 文件 | 来源 | 大小 | 作用 |
|---|---|---|---|
| `shotlist/shot-language-system.md` | 乾坤鼎 04 | 4.7 KB | 景别/焦段/机位/构图术语 |
| `shotlist/camera-exposure-combos.md` | 乾坤鼎 04 | 9.3 KB | 摄影参数组合 |
| `shotlist/scene-coverage-and-first-frame.md` | 乾坤鼎 04 | 11.5 KB | 场次覆盖与首帧 |
| `shotlist/space-blocking-and-axis.md` | 乾坤鼎 04 | 3.7 KB | 走位与轴线 |
| `shotlist/continuity-ledger.md` | 乾坤鼎 04 | 3.3 KB | 连续性台账 |
| `prompt-12d.md` | 乾坤鼎 06 | 4 KB | **十二维编译框架（用户最初要的东西）** |
| `compile-gate.md` | 乾坤鼎 06 | 6.5 KB | 编译门禁（写完必过） |
| `failure-modes.md` | 乾坤鼎 06 | 10.5 KB | 常见失败模式 |
| `model-adapters.md` | 乾坤鼎 06 | 5.2 KB | 多模型适配（H3/Seedance 差异） |
| `h3-dialect.md` | 乾坤鼎 06 | 10.7 KB | H3 方言规则，作为 `h3-prompt-format.md` 的补充 |

**不带**：`04-shotlist/absorbed-p2c.md`（158.6 KB）、`06-prompt/absorbed-p2c.md`（44.8 KB）、`h3-full-reference-six-block.md`（25.1 KB，与已有 `h3ReferenceGuide.txt` 23 KB 重复）。

## 二、工艺库 → 并入 `film-expert-bridge`

它是"九个阶段任一阶段都能挂的工艺分支"，正好接乾坤鼎的 `specs/` 和镜头术语库。

| 来源 | 目标 |
|---|---|
| `specs/cinematography.md` / `color-logic.md` / `lighting.md` / `staging.md`（各 2.1–2.4 KB） | `references/catalog/specs/` |
| `specs/prompt-framework.md`（11 KB）/ `h3-profile.md`（13 KB）/ `framework-audit.md`（6.4 KB） | `references/catalog/specs/` |
| `04-shotlist/references/expert-library-index.md`（12.7 KB）/ `deconstruction-schema.md`（2.5 KB） | `references/catalog/modules/` |
| `06-prompt/references/{anti-slop,prompt-lexicon,music-and-style-prompting,sound-and-dialogue,long-form-segmentation}.md` | `references/catalog/modules/` |
| `06-prompt/catalog/08-视频提示词/选项.md` + `h3-official/` 9 个品类（15+13+8+8+32+14+21+23+2 KB） | `references/catalog/h3-official/` |

它现有 178 个 refs / 1,663 KB，是全库最大的技能——再加 ~180 KB 仍是"按需读"，可接受。

## 三、不进技能目录的东西

| 东西 | 现在 | 去哪 | 理由 |
|---|---|---|---|
| `registry.jsonl`（44 条来源登记） | `D:\乾坤鼎\mounts\` | `patch\ledger\registry.jsonl` | 是造化鼎 EVIDENCE 的输入，不是模型读物 |
| `index.json` 489 KB / `merge-map.md` 75.8 KB / `thickening-log.md` 31.8 KB | `乾坤鼎Agent\` 顶层 | 原地不动 | 治理台账，工作台不拷 |
| `absorbed-p2c.md` × 3（33/159/45 KB） | 各层 references | 原地不动 | 与"修 R08 挪代码块"同性质，属原始副本 |
| `specs/` 7 份原件 | `乾坤鼎Agent\specs\` | 原地不动，只往工作台拷一份 | 集中规范是它的家 |
| `sources.md` / `imports-codex.md` / `STATE-CARD.md` / `RESUME.md` / `PROJECT-STATE.md` / `decision-registry.md` / `anomaly-report.md` | 同上 | 原地不动 | 历史记录 |

## 四、造化鼎侧的落位

| 东西 | 位置 |
|---|---|
| 体检规则 R01–R10 | `D:\造化鼎\core\src\authoring.mjs`（已含 4 次修复） |
| 工作台作为"第三个受管产品" | `patch\product\workbench.product.json`（待写） |
| 技能包 / 证据 / 回滚 | `patch\staging\`（可再生，已 gitignore）+ `patch\_backup\skills\` |
| 桥 | `patch\zhaohua-ui\server.mjs`（8791，封存 bun 启动） |
| 页内 UI | `_work\stable\app\Resources\app\views\mainview\zhaohua\index.html` |
| 工具 | `data\tools\{zhaohua,deepseek}.tool.js` |
| 种子资产（我们的改动） | `patch\data-additions\skills\...`，`apply.ps1 -Data` 同步 |

## 五、体积预算

| | 现在 | 落位后 |
|---|---|---|
| 15 技能 references | 255 个 / 2,333 KB | 约 272 个 / 2,510 KB |
| 常驻 system prompt | 只有 name+description+location（15 条） | 不变（新增文件不影响常驻） |
| 09 单技能 references | 140 KB | 约 210 KB |

关键点：**新增的这些都只在被读时才花 token**，所以体积预算的风险在"agent 一次读太多"，不在磁盘。

## 六、执行顺序

1. `patch\tools\import-qkd.mjs`：从 `D:\乾坤鼎\乾坤鼎Agent\{skills,specs}` 取指定文件 → 写到 `patch\data-additions\skills\<技能>\references\...`，逐文件记 sha256 到 `patch\ledger\imports.jsonl`（不碰 `data\skills`）。
2. `apply.ps1 -Data`：同步进 `_work\stable\data\skills\`（幂等，带备份）。
3. `zhaohua audit` 复审：确认新增引用都存在、没把 R06 带回来。
4. `pack --manifest` + `install` + `deploy` 单技能试点（建议先 `film-cinedance`）。
5. 冒烟：在乾坤鼎里跑一次"从一场戏到 H3 提示词"，看它有没有先出镜表再写提示词。

## 七、待拍板

1. **09 是否够用**（不新增阶段）——我建议够用，因为 09 本来就是"拆生成镜头"。
2. **`h3-official/` 9 个品类要不要全带**（176 KB）——建议先带 3 个（minimalist-product-ad 32、mv-subtitle 14、papercraft 23），其余按需再加。
3. **registry.jsonl 是否作为 EVIDENCE 的"来源"字段**——加上它，每个技能包就能回答"这段话从哪个上游来的"。
