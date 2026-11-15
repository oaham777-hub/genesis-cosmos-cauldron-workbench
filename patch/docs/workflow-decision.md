## 决策树与路由

进入本技能后，先按下面五步判定，再动任何文件或画布。每一步只允许一个出口。

- 用户只要文字讨论、不要画布产物 → 不操作画布，直接回答，结束（不进入 A0）。
- 有定稿剧本 / 时间轴 / 已确认片段，且目标是制作、生成、继续或修订视频 → **Seedance 路由锁存**，进入 PART A；不要求用户说出“Seedance”。
- 无定稿剧本，但有创意、小说或大纲 → 先走 `references/sourceAndScript.md` 与 `references/methods/storyDevelopment.md`，产出可执行剧本后再回本判定。
- 目标模型未指定 2.0 / 2.5 → 只用一次简短提问确认型号；提问不退出 Seedance 执行态，继续留在 PART A。
- 提示词已按 A11 / A12 定稿，且用户明确要求接线、写入生成节点或验收媒体 → 退出提示词隔离，进入 `references/canvasExecution.md` 与 `references/stateAndDelivery.md`。
- 执行层发现模型能力与已定稿提示词硬冲突 → 只报告冲突并回到 PART A 受影响项，不允许静默换模型或另造兼容提示词。
- 都不满足 → 回到 00 路由，重新确认阶段。
