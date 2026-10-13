---
scope: meta
status: active
last-verified: 2026-10-12
keywords: [砍包, 包合并, 收敛规模, common, 架构决策, 依赖闭包]
type: decision
created: 2026-10-12
superseded-by:
---

# 0007 砍包范围：不全量合并 common 子包

## 背景

评估报告 §8.2 第三步建议「把 76 个包压到 15~20 个（34 个 common 子包合并为 4~5 个）」。
2026-10-11 已交付**基于真实 `dependencies` 闭包**的分阶段路线图
（`evaluation/LYTJS_砍包路线图_2026-10-11.md`），owner 授权「按分析拍板并全量推进」。

实测关键事实：common 子包入度分化极大——`common-is` **30**、`common-error` 14、`common-string` 13（枢纽），
叶子多为 0~3；且**各包是不同关注点**（`dom-helpers`/`keyboard`/`a11y`/`transition-engine` 互不相关；
`common-cache` 同步底层策略 vs `@lytjs/cache` 高层异步系统）。

## 决定

**不全量合并 common 子包。**「收敛规模」只做「消除同名不同实现」——
安全（P2-4，已收敛 `common-security` 单一真相源）、事件（2026-10-11，删 `shared-types` 死导出 `EventEmitter`）。
包数维持 76。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 34 common → 4~5 全量合并 | 各包关注点不同，**按簇合并造 grab-bag 包**（如把 a11y/keyboard/transition-engine 塞进 dom），损害模块边界；爆炸半径覆盖全 monorepo（改 `common-is` = 同时动 30 个包） |
| 「先叶子后枢纽」全量执行 | 即便叶包，合并也要改 `build-order.ts` + umbrella + 消费者 + 删包；且经核查**无"真冗余"可合**（缓存同步/异步不同层、事件已收敛）⇒ 纯增风险、无实质收益 |
| 只删"零引用"孤儿包（如 `common-memory` 入度 0、不在 umbrella） | 是**独立**的清理项（属死代码清理），与"合并"无关；是否删取决于它是否属对外公开面，须单独评估，不在本决策内 |

## 后果

- 好处：不引入 grab-bag 耦合；不冒全仓构建 / 测试崩坏风险；把精力留给**单模块深度**（报告给出的砍包真实意图）。
- 代价：包数保持 76，**维护面**（package.json / tsup / CI 条目）不减少；若将来确需物理收敛，仍要重新评估
  （届时优先考虑「发布侧聚合」而非「源码侧合并」）。
- 授权：owner（huyu）于 2026-10-12 在「按分析拍板并全量推进」授权下批准本决策。
