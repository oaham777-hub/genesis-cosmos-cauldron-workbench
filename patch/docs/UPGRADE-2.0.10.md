# 升级演练：Toonflow 2.0.10（2026-11-16）

> 目的：回答"我们这套补丁能不能跟着上游走、升级会丢什么"。
> 结论先写在这：**这不是"升级"，是"换宿主"**。上游 2.0.10 没有影视技能线，我们那 16 个 `film-*` 技能全是我们这一层的东西。

## 一、演练怎么做的

| 步骤 | 做了什么 | 结果 |
|---|---|---|
| 1 | 下载 `stable-win-x64-toonflow.tar.zst`（73.88 MB） | sha256 与 release 页一致 `737af106…a6221a1` |
| 2 | `tar -xf` 解到 `_work\upgrade-test\upstream-2.0.10\toonflow` | 顶层 `bin\` + `Resources\`，1706 文件 / 233.6 MB |
| 3 | 拼装"模拟安装树" `_work\upgrade-test\stable-sim\app\{bin,Resources}` | 与我们将 `app\` 前缀对齐，这样 apply.ps1 的路径假设可用 |
| 4 | 跑 `apply.ps1 -Target stable-sim -All -DryRun` | 见第三节：3 类补丁的表现各不相同 |
| 5 | 真跑 `launcher.exe`（15 秒） | 起 `bun`+`launcher`，窗口标题 `Toonflow`；自动在**安装根**建 `data\`（不是 AppData） |

## 二、两代的东西差在哪（实测，不是估计）

| 维度 | 我们现在（洋子 fork 0.1.42） | 上游 2.0.10 | 影响 |
|---|---|---|---|
| identifier | `local.aiStudio.yoko` | `local.toonflow.desktop` | 注册表键、ini、单实例锁全不同 |
| 包体布局 | `stable\app\{bin,Resources}` | 解压包是 `toonflow\{bin,Resources}` | 安装后是否加 `app\` 前缀取决于安装器 |
| `views` | 140.8 MB | **32.2 MB** | 差的 108 MB 是 93 MB 片头 + 字幕字体等，全是洋子加的品牌素材 |
| `bun/index.js` | 25.17 MB | **20.32 MB** | 标题硬编码偏移不同 → 我们的 `25,163,272` 那一刀**必失效** |
| 内置 `skills` | 3 个（canvas / workflow / v118workflow） | 3 个，**同名同文件数** | 完全一致；**上游没有任何 `film-*`**（bundle 里 grep `film-` = 0） |
| `yokoSkills` | 2.2 MB（13 个 film-* 的旧副本） | 不存在 | 可整袋丢弃 |
| `runtime` | 1,057 MB 内置（codex / agy / node / python） | **无此目录**，靠 `runtimeDownloader.exe` 首次运行下载 | 升级后首次启动要联网拉运行时 |
| `data\tools` | 10 个 | **12 个**（多 `pluginDeveloper`、`sandbox`） | 上游多了插件开发与沙箱工具 |
| `data\providers` 种子 | 7 个（含 yoko*） | 3 个（apiMart / compshare / metaso） | H3 供应商上游 bundle 里也有（`H3` 命中 77 次），不靠我们补 |
| `data\settings.json` | 有 `yoko.executionMode: "codex"` | 无该键；新增 `multiTenantEnabled` / `privacy` / `mediaProviderConfigs` / `toonflowProvider` | agent 执行模式的配置方式变了 |
| 品牌字符串 | 19 个 chunk + bundle 里 68 处"洋子" | **0 处** | 我们的改名补丁在上游是空转（0 命中，脚本不会报错） |

## 三、`apply.ps1 -All` 在上游模拟树上的表现

| 补丁 | 结果 | 判断 |
|---|---|---|
| `-Strings` 改名 | 21 条配置、**0 处命中**（dry-run 没有一行"命中"输出） | 无害但无用；上游本来就没有洋子 |
| `-Overlay` 启动层 | ✅ 外链注入成功（上游 index.html 只有 2,244 B，`<body>` 结构简单，更好注入） | 可重放 |
| `-Pill` 常驻切换 | ✅ 注入成功 | 可重放 |
| `-Skills` 技能真相 → `data\skills` | ✅ 16 个目录全同步 | 可重放（这是我们最值钱的可迁移资产） |
| `-Data` 工具/供应商/扩展 | ✅ 2 个工具（deepseek / zhaohua）同步 | 可重放 |
| `-Stages` 阶段切分 | ❌ **0 成功 / 7 失败** | 必重做：7 条 find 串是 0.1.42 的正文原句，上游没有那些技能 |
| `-Redirect` ini + 注册表 | ⚠️ 无 `toonflow.ini`；注册表 key 不存在 | 必重做：上游 identifier 不同，要改 `local.toonflow.desktop` |

## 四、真要迁到 2.0.10，清单是这样的

**搬过去就有用的（不改一行）**
1. `patch\skills\` 16 个技能 → `data\skills\`（唯一真相不动）
2. `patch\zhaohua-ui\overlay.js` + `/zhaohua/` 整套页面（造化鼎 UI 与桥不受宿主影响）
3. `data\tools\{deepseek,zhaohua}.tool.js`
4. `patch\staging\product\packs`（已打的包）

**必须重标定的（3 处）**
1. **品牌**：标题在 `bun/index.js` 里硬编码 → 上游 20.32 MB 的新 bundle 要重新定位；`app.ico`、Lottie、片头全部重来（上游本来就没这些素材）
2. **阶段切分 7 条**：改成针对上游正文重新生成（或者干脆不切：上游没有 07.5 这一格，我们得把 `film-shotlist` 从"插入阶段"改成"独立技能"）
3. **路径重定向**：`toonflow.ini` 与注册表键换成 `local.toonflow.desktop`

**会冲突的（1 处）**
- `data\skills` 里 `canvas` / `workflow` / `v118workflow` 与上游种子**同名**。上游启动会种它自己的版本；我们要决定"以谁为准"（我们现在这三个是打过补丁的：workflow 三册拆分、canvas 两份规范）

**会消失的能力**
- 内置 runtime（上游首次运行要联网下载 codex/node）
- 洋子那套欢迎页/片头（这算好事）
- `yoko.executionMode` 的 codex 绑定语义

## 五、建议

1. **不要现在迁**。当前副本能跑、16 个技能与造化鼎都在上面；上游首次运行还要下 1 GB runtime，且 `pluginDeveloper`/`sandbox` 这些新工具会改工具面。
2. **要迁就一次性迁干净**：新建 `_work\upgrade-test\stable-2010\`，装 2.0.10 → 跑 `apply.ps1 -Skills -Data -Overlay -Pill`（这四条已验证可重放）→ 手工重标 3 处 → 冒烟（启动/技能列表/造化鼎/一次 audit）。
3. **保留这个模拟树**（`_work\upgrade-test\`），下次上游发新版直接换 tar 重跑本清单即可；它已被 `.gitignore` 排除，不占仓库。

## 六、演练留下的东西

- `_work\upgrade-test\_dl\win-x64-2.0.10.tar.zst`（73.88 MB，可复用到下次）
- `_work\upgrade-test\upstream-2.0.10\toonflow\`（上游原样）
- `_work\upgrade-test\stable-sim\`（`app\` 前缀后的模拟安装树，已被上游自己初始化出 `data\`）
- 截图：无（上游窗口是 WebView2，`PrintWindow` 抓不到内容，只确认了标题 `Toonflow`）
