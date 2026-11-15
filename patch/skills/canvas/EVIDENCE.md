# 证据：canvas

- 生成器：造化鼎 0.7.48
- 合成模式：adopt
- 生成时间：2026-11-15T09:13:03.559Z
- 包目录：canvas

## 来源

| 来源 | sha256 | 路径 |
|---|---|---|
| canvas | `f9d171e0c647421a…` | D:\造化乾坤鼎-工作台\patch\staging\skills\canvas |

## 产物

- SKILL.md sha256：`f749a4ffc29620d04f42b4808552b1e1238f07b41f2a5266f67a583cd76cb41c`
- references/assetGuide.md sha256：`0eb5bb35362d2baccfe3285976964ac0066eb494bfd7037418431c5f6a228c8b`
- references/productionGuide.md sha256：`2e4441613201bead8eadc39ada62a1a57f9085a94854a875c8a2256b7e362e70`
- references/videoProduction.md sha256：`6ba15077ed3617ef639f7dfe5fb11160d0c3fb00979b7524c07332f858cd543b`

## 审计

| 规则 | 结论 | 说明 |
|---|---|---|
| R01 | pass | name canvas |
| R02 | pass | description 含触发词且为第三人称 |
| R03 | pass | description 末尾有负边界 |
| R04 | pass | 未声明引号触发词 |
| R05 | pass | 正文 155 行 |
| R06 | pass | 4 处引用可解析 |
| R07 | pass | scripts/references 文件类型符合约定 |
| R08 | pass | 最长代码块 0 行 |
| R09 | pass | 有决策树章节 |
| R10 | pass | 未引用技能目录之外的文件 |
| R11 | manual | 示例数值需人工复算（机器子集未实现） |

结论：通过
