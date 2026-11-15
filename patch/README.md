# 造化乾坤鼎 · 补丁源（patch）

这是**唯一真源**。工作台目录里的一切改动都必须由本目录的脚本重放产生，禁止手改 `_work\stable\` 或 `D:\洋子工作台\stable\`。

## 三代目录

| 代 | 路径 | 角色 | 谁可写 |
|---|---|---|---|
| 原件 | `D:\洋子工作台\_pristine\stable-0.1.42\` | 0.1.42 只读封存，diff / 回滚基准 | 谁也不写 |
| 开发 | `D:\造化乾坤鼎-工作台\_work\stable\` | 我们的开发副本，改动都落这里 | 只由 `apply.ps1` 写 |
| 补丁 | `D:\造化乾坤鼎-工作台\patch\`（本目录） | 字符串表 / 覆盖层 / data 增量 / 脚本 | 我们改这里 |

基线清单：`D:\洋子工作台\_pristine\manifest-baseline.jsonl`（12,474 个文件的 size + mtime + sha256）。

## 本目录结构

```
patch\
  manifest.json          基线与补丁清单（版本、路径、计划中的补丁）
  strings.rename.json    改名映射表（to 为空 = 未定名，会跳过）
  apply.ps1              重放器：改名 / 覆盖层 / data 增量
  verify.ps1             基线比对：找出被改、新增、丢失的文件
  overlay\launcher.html  启动覆盖层片段（两入口）
  data-additions\        要同步进 data\ 的增量
    skills\  tools\  providers\  ext\
  _backup\<时间戳>\       每次 apply 的备份 + report.json（不入库）
  _reports\verify-*.json  每次 verify 的报告（不入库）
```

## 用法

```powershell
# 看着要做什么，但不动文件
pwsh -File patch\apply.ps1 -Target "_work\stable" -All -DryRun

# 真跑（三件都做）
pwsh -File patch\apply.ps1 -Target "_work\stable" -All

# 只注入启动覆盖层
pwsh -File patch\apply.ps1 -Target "_work\stable" -Overlay

# 比对开发副本与原件基线
pwsh -File patch\verify.ps1 -Target "_work\stable"
```

## 升级后怎么恢复

上游发新包 → 装到新目录 → 把新目录当 `-Target` 重跑一次 `apply.ps1 -Strings -Overlay`。
`data\` 里的技能/工具/供应商不受升级影响（安装器写"升级保留原数据"），所以 `-Data` 通常不用重跑。

## 三条纪律

1. **不手改**：改就改 `patch\` 里的源，然后重放。手改的文件下次 `verify.ps1` 会报出来。
2. **改名条目必须显式**：`strings.rename.json` 里 `to` 为空就不会生效——这是防止在没想好名字时误替换。
3. **覆盖层用标记位**：`id="cauldron-launcher"` 已存在则跳过，所以 `apply.ps1` 可以反复跑。

## 当前状态

- [x] 原件封存 + 基线清单（12,474 文件 / 2.66 GB）
- [x] 开发副本
- [x] 补丁骨架（apply / verify / manifest / 覆盖层 / data-additions）
- [ ] 改名待定：**等新名字**（中文 / 英文大写 / 英文小写）
- [ ] P0 探针：读清技能目录发现、工具注册、ext 注册、provider 注册、settings 结构、MCP 白名单
- [ ] P2 造化鼎工具 `data-additions\tools\zhaohua.tool.js`
- [ ] P3 技能蒸馏（workbench.product.json → 体检 → 融合 → 打包 → 装）

## 已知注意

- 单实例：同时开原件和开发副本会撞 identifier（`local.aiStudio.yoko`），调试时先关掉另一个。
- `data\settings.json` 里存着项目的绝对路径，副本里指向的仍是原项目位置。

## 造化鼎桥（把 CLI 变成页面能点的接口）

    powershell -ExecutionPolicy Bypass -File patch\start-bridge.ps1        # 启动（幂等）
    powershell -ExecutionPolicy Bypass -File patch\start-bridge.ps1 -Stop  # 停止

- 地址 `127.0.0.1:8791`，只回环，不出网；用封存副本里的 bun.exe 启动，重启乾坤鼎不会带掉它。
- 接口：`/health` `/audit` `/verify` `/inspect?skill=` `/packs` `/pack?skill=`
- 页面：`views\mainview\zhaohua\index.html`，从启动层「造化鼎」或乾坤鼎右下角药丸进入。
- 已接真跑：技能体检（audit）、verify、打包（pack，不调模型，产物落 `patch\staging\packs\<技能>\`）。
- 未接：融合 create、评估 eval（要模型 key）、pack-install。

## 造化鼎引擎的两处改动（D:\造化鼎，已提交/待提交）

- `core/src/authoring.mjs`：R06 剥锚点、R06 无扩展名按目录、R07 允许 `.command`（提交 4055f92）。
- `core/bin/zhaohua.mjs`：`pack --json` 的 legacy 会覆盖顶层契约字段导致 `ERR_REPORT_INVALID`，改为剔除保留键后再展开。

## 三段闭环（pack → install → deploy）

| 段 | 命令 | 产物 |
|---|---|---|
| 打包 | `zhaohua pack <技能> --adopt --out ... --manifest --version x.y.z` | `patch\staging\packs\<技能>\`（SKILL.md + references + EVIDENCE.md + skill.pack.json） |
| 安装 | `zhaohua pack-install / pack-upgrade --into patch\staging\product` | `patch\staging\product\packs\<技能>\<版本>\`，旧版进 `.history` |
| 部署 | 桥的 `/deploy`（需 `confirm=yes`） | `_work\stable\data\skills\<技能>\`，旧目录先备份到 `patch\_backup\skills\<时间>\<技能>` |

注意：`--adopt` 不加 `--manifest` 就不会产出 `skill.pack.json`，后面 pack-install 会直接报「下没有 skill.pack.json」。
