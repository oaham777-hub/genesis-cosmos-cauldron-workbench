# 从零重建（BOOTSTRAP）

> 这份文档回答一件事：**换一台机器，怎么把现在这套东西一模一样地装回来。**
> 面向未来的自己——半年后你只会记得"那套在 Toonflow 上改的东西"。

## 0. 先搞清楚这个仓是什么

**是**：给 Toonflow 加的那一层——补丁脚本、16 个影视技能的真相、造化鼎的界面与本地桥、以及那套造化鼎引擎的对接工具。
**不是**：可直接运行的整体。它没有宿主程序（Toonflow 本体 ~2.66 GB 二进制不在仓里），也没有密钥。

所以重建 = **装宿主 + 把这一层打上去**。

## 1. 你需要准备好的三样东西

| 东西 | 从哪来 | 怎么确认对 |
|---|---|---|
| **Toonflow 0.1.42（洋子改版）安装包** | 外部留档。**必须自己存一份**（仓里没有，博主哪天撤了就没有了） | 装完读 `app\Resources\version.json`：`version` 必须是 `0.1.42`、`hash` `pv10fd296639afe0debd`、`identifier` `local.aiStudio.yoko` |
| **本仓** | `git clone https://github.com/oaham777-hub/genesis-cosmos-cauldron-workbench.git` | `git log --oneline -1` 能看到提交 |
| **DeepSeek API Key** | 自己的 | 35 字节、`sk-` 开头；放到 `patch\secrets\deepseek.key`（已在 .gitignore，不会进库） |

> 造化鼎引擎（`D:\造化鼎`，CLI `core\bin\zhaohua.mjs`）是**另一个仓**，也是外部依赖。桥靠它做体检/打包/评估。

## 2. 三代目录（照这个建，脚本里写死了）

```
<安装目录>                         ← 原件，只读封存，别在这上面改
└─ stable\                        ← Toonflow 装出来就是这层
   ├─ app\{bin,Resources}
   ├─ data\
   └─ toonflow.ini

<安装目录>\_pristine\stable-0.1.42\ ← 原件的完整副本（diff / 回滚用）
<本仓>\
├─ patch\                          ← 这一层唯一的源：技能真相、工具、界面、脚本
├─ _work\stable\                   ← 开发副本（apply 打在这上面），已在 .gitignore
└─ BOOTSTRAP.md                    ← 本文件
```

**三条铁律**：① 永远不手改 `_work\stable`（改了下次重放就丢）② 技能只改 `patch\skills`，再 `apply -Skills` 同步 ③ 原件（`_pristine`）只读，用来 diff。

## 3. 六步重建

```powershell
# ① 装宿主（图形安装），然后核对版本
Get-Content '<安装目录>\stable\app\Resources\version.json'

# ② 留一份 pristine（原件副本，只读）
robocopy '<安装目录>\stable' '<安装目录>\_pristine\stable-0.1.42' /E

# ③ 造开发副本
robocopy '<安装目录>\stable' 'D:\造化乾坤鼎-工作台\_work\stable' /E

# ④ 打补丁（先 dry-run 看它要做什么）
cd D:\造化乾坤鼎-工作台\patch
.\apply.ps1 -Target ..\_work\stable -All -DryRun
.\apply.ps1 -Target ..\_work\stable -All

# ⑤ 只读体检：跟基线逐文件比 sha256
.\verify.ps1 -Target ..\_work\stable -Baseline '<安装目录>\_pristine\manifest-baseline.jsonl'

# ⑥ 起桥 + 起应用
.\start-app.ps1
```

`-All` 包含：`-Strings` 改名 / `-Overlay` 启动层 / `-Pill` 常驻切换 / `-Skills` 16 技能 / `-Data` 工具与规范 / `-Stages` 三段正文切分。
**`-Redirect` 不在 `-All` 里**，它只给"开发副本 + 原件同时存在"时用（把 ini 与卸载注册表指到副本）；新机器单副本不需要。

## 4. 冒烟清单（打勾才算装好）

- [ ] 启动 → 出现「造化乾坤鼎」两入口层（乾坤鼎 / 造化鼎）
- [ ] 点「乾坤鼎」→ 露出欢迎页 → 能进主界面
- [ ] 技能列表能看到 **16 个**（`ai-film-router` + 9 阶段 + `film-shotlist` + 两个桥 + `canvas`/`workflow`/`v118workflow`）
- [ ] 右下角「造化鼎」药丸 / `Alt+Z` 能切过去；造化鼎首屏「← 返回乾坤鼎」能切回来
- [ ] 造化鼎「技能体检」→ 状态灯显示「桥已连接」，表格 **16 通过 / 0 未通过**
- [ ] 造化鼎「包管理」→ 打一个包 → 安装 → 部署，三步都出结果
- [ ] 造化鼎「蒸馏地图」→ 矩阵/桑基/时间线有数
- [ ] 造化鼎「观象台」→ 主舞台画出来、右侧是真实事件（跑一次 audit，事件流会多一行）

## 5. 密钥与不入库的东西

| 路径 | 是什么 | 为什么不入库 |
|---|---|---|
| `patch\secrets\deepseek.key` | DeepSeek key | 密钥 |
| `_work\` | 2.66 GB 开发副本 | 二进制 |
| `_pristine\` | 原件基线 | 二进制 |
| `patch\_backup\` | 每次写入前的自动备份 | 可再生成 |
| `patch\_reports\` | 截图与报告 | 可再生成 |
| `patch\staging\` | 沙盒（打包/融合产物） | 可再生成 |
| `patch\smoke\` | 端到端冒烟产物 | 可再生成 |

## 6. 已知的坑（都踩过）

1. **PowerShell 5.1 读 .ps1 按 GBK**：写脚本必须存成 **UTF-8 带 BOM**（`[IO.File]::WriteAllText($f,$t,(New-Object Text.UTF8Encoding($true)))`），否则中文全乱、报"字符串缺少终止符"。
2. **页面端口每次启动随机**：造化鼎页面是应用自带静态服务提供的，重启后端口变（如 63723 → 60333）。别写死。
3. **抓图必须带不同的 `?v=`**：Edge 会缓存 HTML；而且换页时 `?v` 也要不同，否则只是 fragment 跳转，抓到的还是上一页。
4. **`Get-NetTCPConnection` 对 bun 不可靠**：桥的 8791 端口常查不到但服务是好的——探活一律用 HTTP `/health`。
5. **WebView2 缓存**：启动层/prettier 改了但界面没变 → `start-app.ps1 -ClearCache`；再不行整个改名 `%LOCALAPPDATA%\local.aiStudio.yoko`（项目数据在 `data\`，不受影响）。
6. **杀进程别只按 CommandLine 通配**：要加 `Name='bun.exe'`，否则会误杀自己的宿主（曾把 DSH 一起杀掉）。
7. **`verify.ps1` 的 `-Baseline` 默认写死** `D:\洋子工作台\...`：新机器必须显式传。

## 7. 版本标签

- `v0.1.42-cauldron.1` —— 本仓第一个"可重建"基线（宿主 0.1.42 + 这一层全部补丁）
- 升级到上游 2.0.10 是另一件事，看 `patch\docs\UPGRADE-2.0.10.md`：那次演练证明**上游没有影视技能线**，迁移是"换宿主 + 重标 3 处"，不是版本升级。

## 8. 速查

```powershell
# 改了技能 → 同步到运行时 → 体检
.\apply.ps1 -Target ..\_work\stable -Skills
.\apply.ps1 -Target ..\_work\stable -Check
node 'D:\造化鼎\core\bin\zhaohua.mjs' audit .\skills

# 改了启动层 → 重建外链脚本 → 再注入
node .\tools\build-overlay.mjs
.\apply.ps1 -Target ..\_work\stable -Overlay

# 桥
.\start-bridge.ps1            # 起
.\start-bridge.ps1 -Stop      # 停
.\start-app.ps1 -Status       # 看桥/副本/缓存状态

# 打 tag
git tag -a v0.1.42-cauldron.1 -m "可重建基线：宿主 0.1.42 + patch 全套"
git push origin v0.1.42-cauldron.1
```
