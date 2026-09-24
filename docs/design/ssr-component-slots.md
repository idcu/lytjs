# SSR 组件 / 插槽渲染方案（立项）

> 状态：**待评审** · 2026-09-25
> 背景：SSR 审计（第 28–30 批）发现组件的 SSR 输出为 `<Child>` 非法标签、插槽 `<template #hd>` 原样输出。

## 1. 现状（实测，非推测）

| 输入 | 当前 SSR 产物 | 问题 |
|---|---|---|
| `<div><Child/></div>` | `<div><Child></Child></div>` | **把组件当普通标签输出**，非法 HTML |
| `<Card><template #hd>H</template>body</Card>` | `<Card><template>H</template>body</Card>` | 插槽未处理，`<template>` 非法 |
| `<slot name="h">` | 已由 `genSSRSlotOutlet` 处理 | ✅ 插槽**出口**已支持 |

`codegen-ssr.ts` 的 `genSSRElement` 中**只识别 `ElementTypes.SLOT`**，对 `COMPONENT` 无任何分支
⇒ 组件 SSR 属**功能缺失**（不是某个 bug）。

## 2. 目标

SSR 下：
1. 组件被**真正渲染**：`setup(props, ctx)` → render → vnode → 序列化 HTML
2. 插槽（默认 + 具名 + 作用域）被正确传入组件并渲染
3. 输出与客户端首次渲染**一致**（hydration 可比对）

## 3. 关键决策点

### 3.1 组件渲染函数放在哪
| 选项 | 说明 | 结论 |
|---|---|---|
| A. `dom-runtime` 提供 `renderComponentToString(comp, props, slots)`，**注入** SSR 产物 | 与 `sanitizeHTML` 同一套注入机制；单一真相源 | ✅ **推荐** |
| B. 在 SSR 产物里内联组件渲染逻辑 | 需复制 setup 调用 / vnode 序列化，会漂移 | ✗ |

### 3.2 组件的 `template` 谁来编译（**本方案最关键的取舍**）
SSR 产物由 `new Function` 执行、**不含编译器**。因此：

| 选项 | 说明 | 结论 |
|---|---|---|
| A. **只支持已编译的组件**（`setup` 返回 render 函数 / 组件有 `render`） | 零额外体积，语义清晰；有 `template` 的组件需预先经 `defineXxx` 编译 | ✅ **推荐（首期）** |
| B. 把编译器注入 SSR 产物 | 体积/启动成本明显上升，且 CSP 下受限 | 后续按需 |
| C. 组件带 `template` 时**运行时即时编译**（`compile` 在 dom-runtime 里） | 违背分层（dom-runtime 不该依赖 compiler） | ✗ |

> 首期对「带 `template` 且未预编译」的组件，**明确降级**：输出空内容并给出**开发期警告**（不静默输出 `<Child>` 非法标签）。

### 3.3 组件内响应式 / 生命周期的处理
SSR 无客户端生命周期。约定：
- `ref/computed` 正常求值（一次）
- `onMounted` 等**不执行**
- `setup` 返回值作为 render 的 `ctx`（与客户端一致）

## 4. 实施步骤

1. `dom-runtime` 新增并导出 `renderToString(vnode)` 的**组件分支**能力：
   `renderComponentToString(comp, props, slots)`（内部：调 setup → 取 render → 递归序列化）
2. `codegen-ssr.ts` 的 `genSSRElement` 增加 `tagType === COMPONENT` 分支：
   生成 `renderComponentToString(_ctx.Child, {…props}, {default:()=>[…], hd:()=>[…]})`
3. 插槽收集复用 Signal 版已有的 `buildComponentSlotsObject`（含具名 / 作用域）
4. `vapor-ssr.ts` 执行器注入该函数
5. 端到端测试（沿用 `ssr-e2e.test.ts` 的真实入口）：
   默认插槽 / 具名插槽 / 作用域插槽 / 嵌套组件 / props 传递 / 与客户端 HTML 一致性

## 5. 工作量与风险

- 工作量：**中等偏大**（运行时 ~120 行 + codegen ~80 行 + 测试）
- 主要风险：
  - `template` 组件的编译问题（见 3.2，已给出降级策略）
  - 组件的 `setup` 若依赖客户端 API（如 `onMounted`）需安全跳过
  - 插槽内容求值发生在组件渲染内部 ⇒ 注意 SSR 下无需「预热」（无响应式追踪），但需保证**只求值一次**
- 验收：packs/compiler + renderer 全绿 + 新增端到端用例；与客户端首次渲染 HTML 一致

## 6. 不做（本期）

- 流式 SSR（`VaporSSRStreamResult` 已存在但不在本期范围）
- hydration mismatch 的自动修复
- 异步组件 / Suspense 的 SSR
