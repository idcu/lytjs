---
scope: meta
status: active
last-verified: 2026-11-10
keywords: [战略, 拍板, Golden20, B01d, 发布, 公开口径, owner授权, 决策]
type: decision
created: 2026-11-10
superseded-by:
---

# ADR 0028 · 2026-11-10 战略拍板（owner 授权全权决策）

- 状态：**已批准**（owner 2026-11-10 明示「授权按你的分析决策拍板平全量推进」）。
- 输入：`evaluation/LYTJS_全维度评估竞品对比与开发计划_2026-11-09.md`。
- 原则：项目长期发展 + 更完美；先修可信度缺口，不做假修复、不扩范围。

## 背景

11-09 评估：治理 8.0、内核 6.5，生产可用度 3.4、采用度 0.1（满分 10）。
旧报告 P0 已由 S01–S32 修复大半，矛盾转为「产品缺环 + 可信度无法外证」。

## D1 · 产品边界：Golden 20 是唯一生产可用承诺

**收敛，本轮不做破坏性导出删除。**

- 生产可用面 = 20 个 stable（ADR 0013 已冻结）；其余 44 个如实标 experimental，
  README / docs / 组件页写明「不承诺生产可用」。
- 保留导出；移出默认导出排入 8.0.0（N26），届时须有 codemod / 迁移示例。
- 禁止扩组件数；进 stable 必须过六类行为契约（v-model / slots / events /
  controlled props / 样式命中 / 键盘路径）。

理由：当前 21 stable / 44 experimental，扩到 80 只会放大小半成品率；
最大失血点是「用户不知道哪些能用」，不是「少一个组件」。

## D2 · B01d / optimizeSignal：语义已收敛，公开开关 8.0.0 下线

**不删发射器、不重写；「双实现」改判为「单语义 + 双形态」，开关降为内部实验。**

- ADR 0015（owner 11-07 方向 2）已把语义真源下沉 `codegen-signal-shared.ts`，
  两发射器只注入前缀与文本兜底；对拍 100/100、快照 115×2、parity 115/115
  ⇒ ADR 0011 的单一权威在语义层已达成，剩余差异是有意保留的产物形态契约。
- 不整包删除：会一次性破坏 115×2 快照与 4 组 e2e 双 profile 判据，收益为负。
- 本轮：① 公开类型与入口标 `@deprecated`「仅内部实验」；② 新增
  `check-signal-authority` 门禁，断言默认路径永不走优化发射器、语义真源唯一、
  两发射器无各自独立 validator；③ 注入验证：默认分支改 `true` 必红。
- 8.0.0（N26）移除公开选项、删 `codegen-signal-optimized.ts` 与双 profile 测试；
  前置 = ADR 0015 标 superseded + changeset major。

理由：ADR 0015 的收敛条件由此可判定、有门禁、有排期；禁止写第三套 codegen。

## D3 · 首次真实发布：授权，但带四个硬前置

**授权发布，不授权跳过门禁。** N14 在以下全部满足后可执行，无需再逐次请示：

1. `node scripts/gate.mjs --tier slow` 全绿（build / type-check / lint / format / coverage）；
2. fast 57/57 绿，且本轮改动重建 dist 后复跑受影响测试；
3. `check-release-parity` 豁免更新为「待发布」且带 owner 签字与截止日；
4. changeset 覆盖自基线以来改过的所有包。

tag / npm publish 是不可逆外部动作，执行前逐条留痕；任一不满足则不发布并登记阻塞。
发布后用新版本回滚，不删 tag、不 `npm unpublish`。

理由：npm 6.9.6 与仓库 v7.0.0-dev 不同源是第一短板，发布一致性是其它结论的前提。

## D4 · 公开口径：12 个月内不追生态规模、不宣称高性能

- README 能力状态表显式声明：无官方 js-framework-benchmark 成绩前，
  不宣称「高性能 / 轻量 / 比 X 快」；体积数字必须带口径（包级 gzip / 首屏字节 / 含编译器）。
- 差异化限定在零第三方运行时依赖 + 可审计 + 单一语义权威 + 双模编译。
- 仓内自测数字须标注口径；竞品对比只用第三方可复跑来源。

## 执行顺序（对应 11-09 报告 §6 的 N01–N26）

| 批次 | 内容 |
|---|---|
| 0 | N01–N06 口径收口：覆盖率 / 版本 / 棘轮 / 卫生 / nightly / 旧报告标注 |
| 1 | N07–N13 单一权威门禁与对拍、Suspense 二选一、signal 路径补齐 |
| 2 | N14–N21 发布、CLI 首公里、Vite 插件、docs 站、3 个真实应用、Golden 20、i18n/a11y/主题 |
| 3 | N22–N26 AOT → ≤60 KB → 官方 benchmark → 安全白皮书 → 8.0.0 清理 |

关键路径：N02 → N14 → N15 → (N16/N17/N18)，与 N07 → N09 → N22 → N23 → N24 并行。
**N07 是最大单点依赖**；不做清单见 11-09 报告 §6.4。

## 治理容量

`budget.env` 的 `MAX_DIR_FILES` 20 → 24：decisions/ 自然增长，新增本 ADR 即撞顶；
**只调目录容量，质量判据（行数 / 字节 / frontmatter / 死链 / stale）全部不变**。
