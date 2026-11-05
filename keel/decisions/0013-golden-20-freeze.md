---
scope: meta
status: active
last-verified: 2026-11-05
keywords: [ui, golden-20, component-status, experimental, D2, A14]
type: decision
created: 2026-11-05
superseded-by:
---

# 0013 组件 Golden 20 冻结与 experimental 标注

## 背景

`@lytjs/ui` 对外 61 个组件导出，2026-10-30 审计判定 **可用 20 / 半成品 37 / 空壳 4**。
此前 `component-status.ts` 只分 `stable`/`beta`，且 **Carousel / CarouselItem 被标成 stable**，
而组件源码自己写着「setup 里响应式原语 = 0、事件处理器 = 0」——自评体系已被绕过。
「56 个导出」被当成「56 个可用」，是竞品对比中组件层垫底的直接原因
（`evaluation/LYTJS_竞品对比分析_2026-11-05.md` §2）。

## 决定（owner / D2）

1. **Golden 20 冻结**（本周期确定，不再扩员）：

   Avatar、Badge、Button、Card、Checkbox、Container、Dialog、Divider、Drawer、Empty、
   Icon、InputNumber、Link、Modal、Pagination、Progress、Radio、Spin、Switch、Tag。

   - 基线：10-30 审计「可用」组件中未进 P0/P1 点名清单者（14 个）；
   - 加上本周期修复到可用且已补行为用例者（6 个）：
     Dialog（dialog-a11y / e2e-dialog）、Drawer（e2e-interaction-p0 v-model）、
     InputNumber（e2e-input-number）、Modal（e2e-interaction-p0）、
     Pagination（e2e-pagination / pagination-controlled）、Switch。

2. **其余 41 个导出保留**，统一标注 `experimental` 并写缺口 note
   （Carousel / CarouselItem / Transition / TransitionGroup 标注为审计判定空壳）。
   **不移出默认导出** —— 保证既有用户不被破坏，但文档/IDE 不再承诺生产可用。

3. 成熟度模型由 `stable`/`beta` 改为 `stable`/`experimental`（`beta` 语义并入 experimental）。

4. **硬门禁**：`node scripts/check-component-status.mjs` 与
   `tests/component-status.test.ts` 断言：
   - `stable` 集合**必须且只能**等于 `GOLDEN_COMPONENTS`（20）；
   - `mislabeled_stable = 0`（标了 stable 但不在 Golden 20 即红）；
   - `experimental` 必须带 note，数量 = 导出总数 - 20；
   - Golden 名单的判定证据文件必须存在。

## 判定证据

| 组件族 | 证据 |
| --- | --- |
| 全部 61 导出可渲染 | `tests/all-components-smoke.test.ts`（122 用例） |
| Dialog | `tests/dialog-a11y.test.ts`、`tests/e2e-dialog.test.ts` |
| Drawer / Modal | `tests/e2e-interaction-p0.test.ts`（点击内容区不关闭、v-model 回写） |
| Pagination | `tests/e2e-pagination.test.ts`、`tests/pagination-controlled.test.ts` |
| InputNumber | `tests/e2e-input-number.test.ts` |
| 其余 14 个 | 10-30 审计 §3.5 U1–U6 点名清单未包含（无 P0/P1）+ smoke |

## 影响面

- `isBetaComponent` / `listBetaComponents` → `isExperimentalComponent` /
  `listExperimentalComponents`；`GOLDEN_COMPONENTS` 新增导出。
- Alert、Calendar、Form、Input、Menu、Table、Tabs、Select、DatePicker 等常见组件
  从「stable/beta」变为 **experimental**：文档与 IDE 诚实地标注缺口。
  代码与导出不变，不影响既有构建。
- Dialog / Drawer / Modal / Pagination 源文件头的 `@beta` 标签移除（已修好并有证据）。

## 回退路径

1. 回退到旧模型：`git revert` 本决策对应的提交（component-status.ts、测试、门禁条目同进同退）；
2. 不得只回退 `mislabeled_stable` 检查而保留新标注 —— 那等于重新允许「导出数冒充可用数」，
   必须在 CHANGELOG + `keel/NOW.md` 写明理由（硬约束 5 留痕）。

## 判据

- `node scripts/check-component-status.mjs` → `mislabeled_stable = 0`，退出码 0；
- 注入验证：把 `Table` 改为 `stable` ⇒ `mislabeled_stable = 1`、退出码 1（已实测）；
- `@lytjs/ui` 的 component-status + smoke 测试 129/129 绿；
- fast 门禁含 `check-component-status`。
