# 造化乾坤鼎 · 工作台（DSH 原生插件）交接文档

- 状态：**已暂停，准备重开**（2026-11-03）
- 仓库：`D:\造化乾坤鼎-工作台`（保留，不再由 DSH 加载）
- 结论：产品形态没想清楚就开写，连续 15 个版本都在改美术 → 判定为"想法不成熟"，停在这里，重开。

---

## 1. 这个项目原本要做什么

把"造化鼎 / 乾坤鼎"的资产（引擎状态、产品、技能层级）做成一个 **DSH 原生工作台插件**：DSH 里点开就能看到双鼎结构与技能树，能从某一层"开工"，把提示词送进对话。

最终目标是"左对话、右侧栏看板"的分工，但形态一直没定死，这也是停下的主因。

## 2. 已经做出来、值得保留的东西

| 资产 | 位置 | 价值 |
|---|---|---|
| 快照契约 `cauldron-snapshot/v1` | 造化鼎 `zhaohua export`（0.7.47） | 工作台/任何前端都能消费的只读接口，与插件无关 |
| 插件宿主骨架 | `dsh/index.mjs` | 真契约：`main` 指 `dsh/index.mjs`，导出 `name/inject/Config/apply`；路由用 `ctx.connection.fetch.register({path, methods, requestBody, fetch})` |
| 客户端入口 | `lib/client.js` | `window.__ModuleLoader__.load({ id, factory })` → 返回 `{ apply, inject }`；`ctx.inject(['desktopWorkbenches'], …)` → `ctx.desktopWorkbenches.register({ title, repository, version, layout }, Panel)` |
| 本机静态服务 | `dsh/index.mjs` | 随机端口托管 `web-neural/dist`，快照里下发 `neural_url` |
| 前端 | `web-neural/`（fork 自 neural-creator-dashboard，MIT） | 星图看板骨架 |
| 叠加层 | `web-neural/public/cauldron-overlay.js` | 鼎/烟/云三条动效层（rAF 驱动、不依赖 CSS 动画） |
| 美术素材 | `web-neural/public/ding-v4.png`、`smoke-v4.png`、`cloud-v4.png` | **透明底 PNG**（alpha 0–255），可直接复用 |

## 3. 踩过的坑（重开必读）

1. **鉴权**：DSH 的 `/api/...` 路由默认需要凭据，`iframe` 和静态资源请求都不带 header → 页面一律 401。
   解法：插件自己起本机静态服务（随机端口）托管 dist，快照里下发该 URL；前端用相对 `base: './'`。
2. **宿主 Config 必须是真 schemastery**：`Config = Schema.object({...})`。用普通对象会在 cordis `resolveConfig` 抛 `Cannot read properties of undefined (reading 'validate')`，整个 DSH 启动失败。
3. **PowerShell 重定向写文件是 UTF-16**，会直接弄坏 `.mjs`（本次就因此把 `dsh/index.mjs` 写成 UTF-16，`node --check` 报 `Invalid or unexpected token`，插件整页空白）。
   **改代码只用 write/edit 工具或 `node -e "fs.writeFileSync(p, s, 'utf8')"`。**
4. **Windows 文件锁**：`vite build` 清空 `dist` 会 `EPERM`（被 DSH 静态服务占用）。
   解法：构建到新目录（`dist-v13`），宿主用 `dist-current.txt` 指针选择目录。
5. **CSS 动画会被吞**：系统开"减少动态效果"时，`prefers-reduced-motion` 相关的 CSS 动画/JS 分支会让动效全停。动效一律用 `requestAnimationFrame` 驱动。
6. **图片背景口径一次定死**：
   - 要用 `screen` 叠加 → 要**纯黑底**；
   - 要直接 alpha 叠加 → 要**透明底 PNG**；
   - **白底最差**：键白会吃掉细节、留灰框（本项目反复栽在这里）。
7. **插件没起来时面板只剩一行字**（"看板地址未就绪"）。宿主异常要先暴露出来（try/catch + 明确文案），否则只能猜。

## 4. 目录结构

```
D:\造化乾坤鼎-工作台\
├─ dsh\index.mjs          宿主：Config / apply / 静态服务 / 快照路由
├─ lib\client.js          客户端：Panel、快照页、看板入口
├─ src\snapshot.mjs       快照归一化（0.7.47 export 输出 → cauldron-snapshot/v1）
├─ web-neural\            Vite 前端（星图看板）
│  ├─ public\cauldron-overlay.js
│  ├─ public\ding-v4.png / smoke-v4.png / cloud-v4.png
│  └─ dist\ dist-v13\ …
└─ web\fed\               另一套前端静态资源
```

## 5. 怎么跑起来（若临时要看）

1. `pnpm pack` → 在 DSH profile（`%APPDATA%\dsh-desktop\harness\profiles\web`）里 `pnpm add file:D:/造化乾坤鼎-工作台/cauldron-workbench-<ver>.tgz`
2. 在 profile 的 `cordis.patch.yml` 追加：
   ```yaml
   - insert:
       - id: cauldron-workbench
         name: cauldron-workbench
         config:
           engineScript: D:/造化鼎/core/bin/zhaohua.mjs
           products:
             - D:/乾坤鼎/qiankunding.product.json
           cacheMs: 5000
   ```
3. **重启 DSH**（宿主改动不重启不生效）→ 工作台列表出现「造化乾坤鼎」。

## 6. 已经清理掉的东西

- profile 依赖已 `pnpm remove cauldron-workbench`（不再加载）
- `cordis.patch.yml` 已恢复到插入前的备份（`.bak-cauldron`）
- 仓库文件夹原样保留（含 `dist`、素材、历史版本）

## 7. 重开建议（比上一轮省一半时间的顺序）

1. **先定形态，再写一行代码**：工作台到底是"只读仪表盘"还是"可操作入口"？对话放哪一侧？用一张低保真线框图定稿（1 天，¥0）。
2. **先接数据，再做视觉**：拿 `zhaohua export` 的快照先把数字渲染成表格，确认信息架构，再谈星图/大鼎。
3. **hello-panel 验证链**：新建最小插件，只验证"注册 → 渲染 → 静态服务 → 重启生效"四步，跑通再加功能。
4. **视觉素材一次出齐**：透明底 PNG（鼎 / 烟 / 云各一张），口径写进 prompt，不要白底。
5. **不要 fork 别人的视觉**：直接引用它的布局思路即可，否则会欠下一堆样式债（本项目最大的时间黑洞）。

## 8. 版本速览（教训都在里面）

`0.1.x` 插件骨架 → `0.2.x` 双工作台/面板内页签 → `0.3.x` 反复黑屏（401/静态资源） → `0.4.x` 本机静态服务 → `0.5–0.7` 鼎的叠加层与烟雾 → `0.8–0.11` 镶嵌/滚动跟随/动效（rAF） → `0.12.x` 透明底素材与键白翻车 → `0.13.x` 云带环绕 + 宿主编码事故。

一句话总结：**引擎和数据层是成功的（快照契约、插件契约、静态服务都验证过）；失败的是产品形态，以及我在视觉与编码细节上的反复试错。**
