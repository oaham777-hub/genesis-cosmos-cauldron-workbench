# 推进路线（定版）· 造化乾坤鼎

> 状态：2026-11-15 定版。依据：m01582（对方的模式）、m01624（制表不丢信息）、m01633（整理一轮）。

## 0. 已建成的东西（不重复做）

| 块 | 状态 | 位置 |
|---|---|---|
| 改名（造化乾坤鼎 / 乾坤鼎 / 造化鼎） | 完成，可重放 | `patch\strings.rename.json` + `apply.ps1 -Strings` |
| 启动层 + 双向切换（药丸 / Alt+Z） | 完成 | `patch\overlay\{launcher,switch}.html` + `apply.ps1 -Pill` |
| 造化鼎桥 8791（audit / verify / inspect / packs / pack / install / deploy / deployed） | 常驻 | `patch\zhaohua-ui\server.mjs` |
| 造化鼎页面（六视图 + 反向对标首屏 + 实时数据） | 装进应用 | `views\mainview\zhaohua\index.html` |
| 造化鼎工具 + DeepSeek 工具 | 已部署 | `data\tools\{zhaohua,deepseek}.tool.js` |
| 三段闭环 pack → install → deploy | 实测通（canvas v0.1.1） | 桥 + 包管理页 |
| 尺子修复 4 次（R06 锚点/目录、R07 `.command`、R02 假通过、pack --json） | 提交 `885d971` `4055f92` `5b758e6`，1107/1107 | `D:\造化鼎` |
| 15 技能体检 + 修到可信 | 83 → 12 FAIL（R05=1、R10=11） | `patch\staging\skills` |
| 落位表 | 定版 | `patch\docs\PLACEMENT.md` |

## 1. 七层模型（唯一改动面：L4 / L5 / L1 外观）

| 层 | 是什么 | 可改 |
|---|---|---|
| L1 壳 | launcher.exe → Electrobun → bun\index.js → WebView2 | 只改外观/字符串 |
| L2 大脑 | `runtime\{codex,...}` + `yoko.executionMode` | 可换，未验证 |
| L3 上下文 | `<available_skills>` 清单拼接（bundle 内） | 不可改 |
| L4 技能 | `app\skills`(3) / `data\skills`(15) / 项目 `skill\` | 主战场（软） |
| L5 工具 | `data\tools\*.tool.js` → 工具表 | 主战场（硬） |
| L6 宿主能力 | canvas / assetOperator / mediaGeneration / ffmpeg / 文件 | 只能调用 |
| L7 产物与生成 | 项目文件 + 画布节点 + `data\providers`（无 text） | 加节点/供应商 |

**融合三法**：内容走投放（B）、流程走写入（A）、能力走调用（C）。B 默认，A 例外，C 兜底。

## 2. 阶段骨架（Toonflow 01–09 + 我们的 07.5）

| 阶段 | 技能 | 我们的增量 |
|---|---|---|
| 00 | `ai-film-router` | 只加一行菜单 |
| 01 | `film-synopsis` | 概念锚 + 情绪曲线 |
| 02 | `film-characters` | 角色圣经 |
| 03 | `film-worldbuilding` | 世界规则 / 信息不对称 |
| 04 | `film-treatment` | 分场大纲 |
| 05 | `film-screenplay` | 台词机检 + 结构机检 |
| 06 | `film-stress-test` | 生产拆解 + 机检清单 |
| 07 | `film-lira-assets` | 资产清单 + 一致性锁 |
| **07.5** | **`film-shotlist`（新建）** | **镜表：它缺的一格** |
| 08 | `film-acting` | 情绪谱 + 微表情 + 节拍（改为按镜） |
| 09 | `film-cinedance` | 十二维编译 + 门禁（不再负责拆分镜） |

## 3. 镜表规格（不丢信息版）

- **索引层**：`05_shots/epNN-shotlist.md`，每镜**两行**
  - 第 1 行：镜号 ｜ 对应条目 ｜ 时长 ｜ 景别 ｜ 机位/轴线 ｜ 镜头语言（机位意图/运镜节奏/构图策略/视点归属） ｜ 首帧与参考绑定 ｜ 状态
  - 第 2 行：摄影（焦段/画幅/白平衡/承托） ｜ 画面（主体占位/前后景/色彩） ｜ 光影（主光/光质/色温/光比）
- **状态机**：`已定 / 待定 / 待确认 / 废弃`，**必填 + 写理由**，禁止空白
- **展开层**：`05_shots/shots/epNN-Snn.md` 镜卡——意图、备选方案、摄影笔记、表演提示
- **门禁**：镜表未确认不得进 09 编译（照乾坤鼎硬规则）
- **两版**：粗分镜（允许大量待定）→ 锁定版（齐列才可编译）

## 4. 推进顺序

### P3 · 内容注入 + 镜表阶段（2 天）
1. `patch\tools\import-qkd.mjs`：取 10 个文件 → `patch\data-additions\skills\film-cinedance\references\`，逐文件记 sha256 到 `patch\ledger\imports.jsonl`
2. 新建 `film-shotlist`：SKILL.md + 7 份 references（`shotlist-spec.md` 自写 + 04 的 6 份）
3. 最小 diff：router 加 07.5 菜单；08 改"按镜表"；09 去掉拆分镜职责
4. `audit`（R06 必须仍为 0）→ `pack --manifest` → `install` → `deploy`
5. 冒烟：一场戏 → 镜表 → 表演 → H3 提示词

**验收**：21 个 references 文件落地；`imports.jsonl` 10 行 sha256；audit R06=0、FAIL 仍 12；冒烟里出现镜表再出现提示词。

### P4 · 造化鼎融合接桥（1 天）
- `/fuse?skill=`（`create --mode merge`）+ `/eval`（两臂对比）+ 页面按钮
- 首个试验：`film-cinedance` × 乾坤鼎 `06-prompt`（十二维）
- **验收**：融合产物落了 `patch\staging\skills\`，eval 出 `zhaohua-eval/v1` 证据

### P5 · 稳定性（1 天）
- 桥随应用自启；覆盖层缓存钉死（启动参数带版本）；ini/注册表重定向写进 `apply.ps1`
- **验收**：重启 5 次，覆盖层 5 次都在；桥自动在

### P6 · 铺开其余阶段（1 天）
- 08 情绪谱、07 资产锁、05 台词机检、01–04 四件
- 每个只改 import 配置，走同一条链

## 5. 本轮不做

- 不拆 `workflow` 1240 行（R05）
- 不追 R10（跨技能引用是它的设计）
- 不复活乾坤鼎 L0 / L9
- 不做 `ext-zhaohua` 画布节点
- 不新增"09 → 10"重排（用 07.5 插入，不动既有编号）

## 6. 回滚

| 改动 | 回滚 |
|---|---|
| `data\skills\<技能>` | `patch\_backup\skills\<stamp>\` 拷回，或 `pack-rollback` |
| 正文 diff（router/08/09） | `apply.ps1` 重放前备份在 `patch\_backup\<stamp>\` |
| 页面/覆盖层 | `apply.ps1 -Overlay -Pill` 幂等重注 |
| 技能包 | `packs\.history\` + `packs\registry.jsonl` |
