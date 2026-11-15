<!-- src: qkd:skills/06-prompt/references/h3-full-reference-six-block.md | epoch: 6 | sha: d759d7fd5a4217e399c2e9f38163448a63989536b9010e5cc981e30208c3d9d5 -->
<!-- 摘录：第 1,2 节 -->
## H3 全参考模式 · 六段式 JSON 规范（full-reference six-block）
> 落点：`skills/06-prompt/references/`（L6 提示词层）｜登记：**用户 2026-09-27 投喂规范**（非外部开源采纳，不引用第三方许可）
> 用途：把「用户用自己的话描述的视频」改写成 **MiniMax H3 全参考模式（full-reference）** 可直接投喂的规范输出
> 与 `specs/h3-profile.md` 的关系：**并存但互斥** —— 那份是 **七段语序 + 时间戳分镜**（中文正文），本份是 **六段式 JSON**（英文正文 + `<d>` 台词）；**两者冲突项见 §十二，待裁**

---

## 一、输出契约（**硬格式**）
严格**只输出一个 JSON 对象**：不要 markdown 围栏、不要解释、不要多余字段。

| 字段 | 内容 |
|---|---|
| `subject_definitions` | 数组，**每行一条参考内容的定义句** |
| `summary` | 一段英文，**以方括号任务类型前缀开头** |
| `retention_analysis` | 数组，**每行一条参考内容的保留关系** |
| `detailed_description` | 正文，**风格开场句 + `[Shot N]` 分镜**，换行分隔 |
| `overall_soundscape` | 全片环境音与物理音 |
| `non_diegetic_music` | 只有观众能听到的配乐；没有则写 `N/A` |
