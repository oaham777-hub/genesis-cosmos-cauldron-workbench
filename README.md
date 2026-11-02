# 造化乾坤鼎工作台（DSH 插件）

DSH Desktop 原生工作台插件：在 DSH 里查看造化鼎 / 多个乾坤鼎 / 组合的三级结构，读取只读快照，生成任务卡并转成原生会话草稿。

## 状态

- 仓库刚建，正在做 P0 空壳；施工方案见主仓 `genesis-cauldron` 的 `项目策划/造化乾坤鼎_双工作台完整方案_V0.2.md`。
- 第一版只读：不改仓库、不提交、不发版。

## 数据来源

只读引擎导出的快照 `snapshot.json`（`cauldron-snapshot/v1`），由 `zhaohua export` 生成；本仓不直接调用引擎、不读 Git、不读密钥。

## 目录

```
投喂文件/     本地产出物与外部投喂包，不入库（.gitkeep 占位）
docs/         设计与验收记录
src/          插件源码（P0 起）
```

## 投喂文件约定

主题包与特效包放在 `投喂文件/` 下，接入时只新增文件并在 `src/themes/index.ts`、`src/effects/index.ts` 注册，不改页面结构。

## P0 静态工作台（0.1.0，2026-11-02）

- `web/index.html` + `web/theme.css` + `web/app.js`：双耳三足阅读页，纯静态、零依赖。
- `web/snapshot.example.json`：从真实产品导出的脱敏快照（引擎 0.7.47 / 乾坤鼎-漫剧 0.4.8）。
- 本地预览：`node server.mjs`，浏览器打开 http://127.0.0.1:5199 。
- 插件骨架：`package.json`（dsh.bundle/client 声明）、`cordis.patch.yml`、`src/index.js`（apply 只注册只读日志）。
- 主题：玄色（默认）/ 宣纸两套设计令牌，定义在 `theme.css`；字体走系统衬线栈，不引外部字体。

## 插件形态（0.2.0 骨架）

目标是作为 DSH 原生工作台插件运行（契约照 `dsh-bid-workbench` 0.1.0）：

- 宿主侧 `dsh/index.mjs`：`apply(ctx, config)` 注册只读路由 `GET /api/cauldron-workbench/snapshot`。
  配置项：`engineBin`（留空用当前进程的 node）、`engineScript`（默认 `core/bin/zhaohua.mjs`）、`products`（产品定义文件列表）、`cacheMs`。
  `products` 建议指向 `D:\乾坤鼎\qiankunding.product.json`；为空时面板显示“还没有配置产品路径”。
- 客户端 `lib/client.js`：ModuleLoader 工厂，返回 `{ apply, inject: [] }`，
  `apply` → `ctx.inject(['desktopWorkbenches'], activate)` → `ctx.desktopWorkbenches.register({…}, Panel)`，
  面板用 `fetch('/api/cauldron-workbench/snapshot')` 拉快照，渲染双耳三足 + 玄色/宣纸切换。
- `package.json` 的 `dsh.client.inject` 与参考插件一致：`dsh-desktop-workbenches` + api/workspace 控制器。

安装（示例，pnpm link 到本仓后由 DSH 插件管理启用）：

```
cd D:\造化乾坤鼎-工作台
pnpm install --ignore-scripts   # 仅补 peer 声明时需要，插件本身零运行时依赖
```

本地验证：`node --check dsh/index.mjs lib/client.js src/snapshot.mjs`，`node --test test/*.test.mjs`，
以及 `.tmp/check-host.mjs` 风格的端到端脚本（真实调用 `zhaohua export` 再归一化）。
