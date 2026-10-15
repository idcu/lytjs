---
scope: meta
status: active
last-verified: 2026-10-15
keywords: [登记缺陷, 缺陷 vs 取舍, UI 电池, 修复纪律, 硬约束9]
type: decision
created: 2026-10-15
superseded-by:
---

# 0010 登记缺陷的处置：缺陷按 ADR 修复，取舍交 owner

## 背景

UI 行为电池连做七轮后，`keel/NOW.md` 累积了一批「登记缺陷待决策修复（**勿顺手改**）」：
Cascader 4 怪癖、Tabs 非受控重置、`VaporListRenderer updateItem` 死代码、`serializeData` Date 分支死代码。
保守策略（只写电池、不改源码）避免了顺手改坏，但也让**已确认的缺陷长期留在发布代码里**。

实测（2026-10-15 探针）：`Tabs` 在**两种模式下都不可用** ——
① 非受控点击第 3 个标签后激活态回到 **0**；② 从不发 `update:modelValue`（v-model 完全失效）；
③ 页面里出现 **2 个嵌套 `role=tablist`**；④ 受控模式下在标签项上按方向键**前进 2 格**（冒泡双触发）。

## 决定

「登记缺陷」**必须二分**，不得一律搁置：

- **缺陷**（行为违背组件自身契约 / ARIA 规范 / 用户可感知不可用）⇒ **按 ADR 逐项修复**，
  并补「翻转 ⇒ 变红」守卫（硬约束 9）；修完更新 NOW。
- **设计取舍**（两种做法都合理，取决于产品口味）⇒ **交 owner**，在 NOW 阻塞表登记待决，不自行改。

判定口径：**能否指出它违背了哪条已声明的契约**（props 语义 / v-model 契约 / ARIA 规范 /
组件 JSDoc 的承诺）。指不出 ⇒ 是取舍，不是缺陷。

## 本次执行（Tabs，首个按本 ADR 处理的项）

按上口径，Tabs 四条**全部是缺陷**（② 违背 v-model 契约、③ 违背 ARIA、①④ 使组件不可用）⇒ 已修：

- 非受控 / 受控同步改为「**仅 `modelValue` 变化时**同步」，激活判定交回 `activeIndex`；
- `handleTabClick` 补 `emit('update:modelValue', name)`；
- `role="tablist"` 只保留 header 一处（根 div 去掉）；
- `handleKeydown` 只挂在 tablist 容器（原先根与每个标签项各挂一份 ⇒ 冒泡双触发）。

守卫：`e2e-tabs.test.ts` 新增 4 条（修复前**全红**），并把两条「缺陷登记」式特征测试改为
断言修复后行为。

## 被否掉的选项

- **继续一律搁置**：等于把「已确认不可用」固化为发布行为；
- **顺手改（无 ADR、无守卫）**：违反硬约束 9，且变更无法被复核。

## 代价 / 风险

修复改变已发布组件的运行时行为（非受控用法从"不可用"变为"可用"）⇒ 属**修 bug** 而非破坏性变更；
若下游依赖了旧的（错误的）非受控行为，需在 CHANGELOG 记一笔。
