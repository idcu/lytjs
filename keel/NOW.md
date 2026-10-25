---
scope: now
status: active
last-verified: 2026-10-25
updated: 2026-10-25
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾（行为电池）+ 缺陷按 ADR 0010 二分 + 平行实现按 ADR 0011 收敛；只上不下。

## 覆盖率（10-25 三跑：326 文件 / 7720 用例）
行 **81.15%** / 分支 87.20% / 函数 85.81%（79.42% → +1.73pt；后又加 4 电池）。
⚠️ 全量报表对**同被 src 与 dist 引用**的文件会低估（`devtools/performance.ts` 55.66% vs
独测 89.29%）⇒ **定方向前先单包复核**。非 UI 现 Top：`codegen-signal-optimized` 176、
`codegen-signal` 147（均 >85%，收益递减）。

## 10-25 完成（9 电池 / 146 守卫）
- **component/lifecycle**（23）→ `handleError()` 无人处理时**静默 return false**，而全部调用点
  都忽略返回值 ⇒ setup / 生命周期 / data / computed / watch / render 抛的错**完全不留痕**。
- **component/error-boundary**（17）→ `fallback` prop 声明未读（只认插槽）；`ref` 把 Error
  深度包成代理（`error.value !== err`）⇒ 改 `shallowRef`。
- **router/RouterLink**（16）+ **RouterView**（15）→ 两个组件的 render **都返回非 vnode 的描述
  对象** ⇒ 路由的入口与出口**都渲染不出任何东西**；RouterLink 的 active 用裸 `startsWith`
  （`to="/"` 全站高亮）；RouterView 无层级概念（嵌套递归）、懒加载被直接调用拿到 Promise。
  补 `viewDepthKey` 协议；router 因此新增 `@lytjs/vdom`、`@lytjs/component` 依赖。
- 前五电池（45）：devtools 性能 · server-components-client · component-proxy · 前缀 · TransitionGroup。
- 删 `compiler/optimizations/treeShaking.ts`（459 行桩：选项未读、变换为空、0 引用 0 测试）。
- ADR 0011 第三例（`createApp`）**不合并**（依赖方向 + 类型已收窄 + 在发布清单），
  改为在 core-vnode 列能力矩阵。

## 下一步
1. 重跑覆盖率（含后 4 电池）→ 单包复核后定方向。
2. 非 UI 缺口普遍 >85% ⇒ 转「ADR 0010 判定 UI 剩余项」（需串行）。
3. 待办：`suspensible`（ADR 0011 已登记）；HMR `_preservation`/`mounted`。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发跑互清 .tmp | 单包独测复核 |
| `--coverage` 清 `coverage/` 被 safe-delete 拦 | `--coverage.reportsDirectory=/tmp/…` |
