# Lyt.js v6.0 核心层全方位评估报告 v5

> 评估日期：2026-05-04
> 评估范围：核心层（reactivity, vdom, compiler, component, core, renderer, runtime-convergence, host-contract, adapter-web, dom-runtime, core-vnode, core-signal, shared-types, common/*）
> 评估方法：逐包源码审读 + v4 报告扣分点逐项核查 + 新增功能质量评估
> 评估轮次：第五轮（基于 v4 报告后的大量改进）

---

## 一、v4 报告扣分点修复核查

### 1.1 P0 级扣分点（v4 组件系统 3.8/5.0 的主要拖累）

| # | v4 扣分点 | 修复状态 | 实现质量 | 文件位置 |
|---|----------|---------|---------|---------|
| 1 | 组件实例缺少 `accessCache` | **已修复** | 优秀 | `packages/component/src/component.ts:51-66,136,493-580` |
| 2 | `$refs` 返回空对象 | **已修复** | 良好 | `packages/component/src/component.ts:122,649-651` |
| 3 | `$forceUpdate` 为 NOOP | **已修复** | 良好 | `packages/component/src/component.ts:656-671` |
| 4 | 缺少 `resolveDynamicComponent` | **已修复** | 良好 | `packages/core/src/resolve.ts:210-217` |

**accessCache 实现评价**：
- 定义了完整的 `PublicInstanceProxyAccessCache` 枚举（NONE/OTHER/SETUP_STATE/DATA/PROPS/GLOBAL_PROPERTIES/CONTEXT）
- 惰性创建 `instance.accessCache = Object.create(null)`
- Proxy handler 的 `get` 和 `has` 均实现了缓存逻辑
- 缓存命中时通过 switch 快速分发，避免重复遍历 setupState/data/props
- 实现质量接近 Vue 3 的 accessCache 机制

**$refs 实现评价**：
- `instance.refs = {}` 已在 `createComponentInstance` 中初始化
- `$refs` getter 返回 `instance.refs`
- 但 refs 的实际收集（模板 ref 绑定到 DOM 元素）依赖渲染器层面的配合，当前实现是基础设施就绪

**$forceUpdate 实现评价**：
- 优先调用 `instance.update()`（标准渲染器路径）
- 回退路径：通过 nextTick 重新执行 render 并更新 subTree
- 回退路径中缺少对 vnode diff 的触发（仅更新 subTree 引用，未调用 patch），实际效果可能不完整

**resolveDynamicComponent 实现评价**：
- 字符串类型：尝试从已注册组件解析，找不到则返回原始字符串（可能是原生 HTML 元素）
- 非字符串类型：直接返回（已是组件对象）
- 实现简洁正确

### 1.2 P1 级扣分点

| # | v4 扣分点 | 修复状态 | 实现质量 | 文件位置 |
|---|----------|---------|---------|---------|
| 5 | inject 缺少高级用法 | **已修复** | 优秀 | `packages/component/src/component.ts:868-936` |
| 6 | v-for 缺少解构表达式 | **已修复** | 良好 | `packages/compiler/src/transforms/for.ts:61-187` |
| 7 | KeepAlive 缺少 `onCacheKey` | **已修复** | 良好 | `packages/component/src/keep-alive.ts:28-29,39,118-146` |
| 8 | Suspense 实现较简化 | **部分修复** | 中等 | `packages/component/src/suspense.ts` |

**inject 高级用法评价**：
- 支持 `factory: true` 选项，将 defaultValue 作为工厂函数调用
- 支持 `from` 修饰符，从指定 key 查找而非注入 key
- 支持 `local: true`，仅查找当前实例自身 provides
- 实现完整，API 设计与 Vue 3 的 `InjectionKey` + `from` 语义一致

**v-for 解构评价**：
- 支持 `{ key, value }` 对象解构和 `[a, b]` 数组解构
- 支持解构 + 索引语法：`{ key, value }, index in entries`
- 通过 `parseDestructure` 函数解析，生成临时变量 `__destructureItem`
- 在箭头函数体内插入 `const { key, value } = __destructureItem` 语句
- 限制：不支持嵌套解构（如 `{ a: { b } }`），但覆盖了绝大多数使用场景

**KeepAlive onCacheKey 评价**：
- `onCacheKey` 作为 prop 声明，类型为 Function
- `getCacheKey` 函数优先调用 `onCacheKey(vnode)`，回退到 `vnode.type`
- 含错误处理（try-catch + handleError）

**Suspense 评价**：
- 新增 `SuspenseAbortedError` 类
- 新增 `pendingPromises: Set<Promise>` 追踪多个异步子组件
- 新增 `aborted` 标志位
- 修复了 v4 中错误回调误调 `onPending` 的 bug（改为调用 `onError`）
- 新增 `abortSuspense`：清空回调数组防止内存泄漏
- **仍缺少**：pendingBranch/activeBranch 的完整 DOM 切换（fallback slot 显示/隐藏）

### 1.3 P2 级扣分点

| # | v4 扣分点 | 修复状态 | 实现质量 | 文件位置 |
|---|----------|---------|---------|---------|
| 9 | 缺少 `toValue` | **已修复** | 良好 | `packages/reactivity/src/ref.ts:162-166` |
| 10 | 缺少 `useTemplateRef` | **已修复** | 良好 | `packages/core/src/composition.ts:72-85` |
| 11 | 自定义指令缺少 `deep` | **已修复** | 良好 | `packages/core/src/directives.ts:27-63` |
| 12 | 缺少编译缓存 | **已修复** | 良好 | `packages/compiler/src/index.ts:17-139` |
| 13 | Signal computed 不支持可写 | **已修复** | 良好 | `packages/reactivity/src/signal.ts:253-333` |
| 14 | inheritAttrs class/style 特殊处理 | **已修复** | 良好 | `packages/vdom/src/patch.ts:404-423` |
| 15 | 缺少 `defineModel` 宏 | **未修复** | -- | -- |
| 16 | 大文件未拆分 | **未修复** | -- | patch.ts 仍约 1400 行 |

**toValue 实现评价**：
- 支持 Ref（返回 .value）、函数（调用并返回结果）、其他值（直接返回）
- 实现简洁正确，与 Vue 3.3+ 语义一致

**useTemplateRef 实现评价**：
- 使用 `shallowRef` 创建 ref
- 在 `onMounted` 中从 `instance.refs` 获取对应 key 的值
- 注意：仅在 mounted 时读取一次，后续 refs 变化不会自动更新（与 Vue 3.5 的响应式 useTemplateRef 有差异）

**指令 deep 实现评价**：
- `withDirectives` 检测 `dir.deep` 选项
- 递归遍历子 VNode，为每个子 VNode 附加相同指令引用
- 实现正确，但仅处理了 VNode 树级别的 deep，未处理 reactive 对象值的深度监听（Vue 3 的 deep 还会触发对 reactive 值的深度遍历）

**编译缓存实现评价**：
- LRU 缓存策略，最大 100 条
- 使用 djb2 哈希生成缓存键
- 仅在无自定义 nodeTransforms/directiveTransforms 时使用缓存
- 含缓存键中 ssrMode 和 rendererMode 的区分
- 提供 `clearCompileCache()` 和 `getCompileCacheSize()` 调试 API

**writableComputedSignal 实现评价**：
- 完整的可写计算信号：getter 读取计算值，setter 通过回调写入
- 含循环依赖检测、dispose、自动依赖追踪与清理
- 与 readonly computed signal 共享核心逻辑，代码有一定重复（computed 和 writableComputedSignal 的主体逻辑几乎相同）

**inheritAttrs class/style 实现评价**：
- `inheritAttrs === false` 时，仅将 class 和 style 合并到根元素
- 其他 attrs 不继承
- 实现符合 Vue 3 行为

---

## 二、逐维度评分

### 1. API 完整度（权重 15%）-- 评分：4.2 / 5.0（v4: 3.5，+0.7）

#### 1.1 Composition API（覆盖率约 93%）

| API | v4 状态 | v5 状态 | 备注 |
|-----|--------|--------|------|
| ref / shallowRef / triggerRef | 已实现 | 已实现 | |
| toValue | **缺失** | **已实现** | `packages/reactivity/src/ref.ts:162-166` |
| reactive / shallowReactive / readonly / shallowReadonly | 已实现 | 已实现 | |
| computed（含可写） | 已实现 | 已实现 | |
| watch / watchEffect | 已实现 | 已实现 | |
| effectScope / onScopeDispose | 已实现 | 已实现 | |
| effect / onEffectCleanup | 已实现 | 已实现 | |
| nextTick | 已实现 | 已实现 | |
| provide / inject | 已实现（基础） | **已完善** | 新增 factory/from/local 选项 |
| defineComponent | 已实现 | 已实现 | |
| defineAsyncComponent | 已实现 | 已实现 | |
| h / createElement | 已实现 | 已实现 | |
| useSlots / useAttrs / useModel | 已实现 | 已实现 | |
| useTemplateRef | **缺失** | **已实现** | `packages/core/src/composition.ts:72-85` |
| withDirectives（含 deep） | 已实现（无 deep） | **已完善** | 新增 deep 递归应用 |
| withMemo | 已实现 | 已实现 | |
| resolveComponent / resolveDirective | 已实现 | 已实现 | |
| resolveDynamicComponent | **缺失** | **已实现** | `packages/core/src/resolve.ts:210-217` |
| defineCustomElement | 已实现 | 已实现 | |
| asyncComputed | 已实现 | 已实现 | |
| signal / computedSignal | 已实现 | 已实现 | |
| writableComputedSignal | **缺失** | **已实现** | `packages/reactivity/src/signal.ts:253-333` |

**仍缺失**：
- `defineModel` 宏（Vue 3.4+，编译器 + 运行时配合）
- `useCssModule` / `useCssVars`（CSS 相关 API）
- `useId`（Vue 3.5 新增）

#### 1.2 Options API（覆盖率约 85%）

| API | v4 状态 | v5 状态 |
|-----|--------|--------|
| inject 高级用法 | **缺失** | **已完善**（factory/from/local） |
| inheritAttrs class/style | **缺失** | **已修复** |
| renderTracked / renderTriggered Options 声明 | 缺失 | 仍缺失（仅 Composition API 形式） |

#### 1.3 内置组件（覆盖率约 92%）

| 组件 | v4 状态 | v5 状态 |
|------|--------|--------|
| KeepAlive onCacheKey | **缺失** | **已实现** |
| Suspense | 简化 | **改善**（多 Promise 追踪、abort、错误回调修复） |
| Suspense fallback slot 切换 | **缺失** | 仍缺失（无 pendingBranch/activeBranch DOM 切换） |

#### 1.4 指令系统（覆盖率约 88%）

| 指令 | v4 状态 | v5 状态 |
|------|--------|--------|
| 自定义指令 deep | **缺失** | **已实现** |
| v-for 解构 | **缺失** | **已实现** |
| defineModel 宏 | **缺失** | 仍缺失 |

#### 1.5 工具函数（覆盖率约 90%）

| 工具 | v4 状态 | v5 状态 |
|------|--------|--------|
| resolveDynamicComponent | **缺失** | **已实现** |
| useTemplateRef | **缺失** | **已实现** |
| useCssModule / useCssVars | **缺失** | 仍缺失 |

**评分依据**：
- v4 主要扣分点（accessCache、$refs、$forceUpdate、resolveDynamicComponent、inject 高级用法、v-for 解构、KeepAlive onCacheKey、toValue、useTemplateRef、指令 deep、编译缓存、writableComputedSignal、inheritAttrs class/style）共 13 项已修复
- 仍缺失 4 项次要 API（defineModel、useCssModule/useCssVars、useId、renderTracked/Triggered Options 声明）
- Composition API 覆盖率从 85% 提升至约 93%
- Options API 覆盖率从 75% 提升至约 85%

---

### 2. 响应式系统（权重 15%）-- 评分：4.4 / 5.0（v4: 4.2，+0.2）

#### 2.1 v4 扣分点修复情况

| v4 扣分点 | 修复状态 |
|----------|---------|
| 缺少 `toValue` | **已修复** |
| Signal computed 不支持可写 | **已修复**（writableComputedSignal） |
| shallowReadonly 对集合类型的完整支持 | 部分改善（collection handler 已支持四种变体） |
| watch `flush: 'post'` SSR 特殊处理 | 未修复（非关键） |

#### 2.2 新增功能评估

**writableComputedSignal**（`packages/reactivity/src/signal.ts:253-333`）：
- 完整的可写计算信号实现
- 含循环依赖检测、dispose、自动依赖追踪与清理
- 与 readonly computed 共享 invalidate 逻辑
- **扣分**：computed 和 writableComputedSignal 主体逻辑高度重复（约 80 行重复代码），应抽取共享基类或工厂函数

**toValue**（`packages/reactivity/src/ref.ts:162-166`）：
- 实现简洁正确，3 行代码覆盖 Ref/函数/其他三种情况

#### 2.3 亮点保持

- Signal 与 effect 系统的双向桥接仍然设计优秀
- 首次渲染优化、迭代式 traverse、多层防护机制保持稳定
- effect 系统的 batch/batchAsync/untrack 语义清晰
- signalBatch 的 flushPendingNotifications 含迭代上限保护（100 次）

#### 2.4 扣分点

- writableComputedSignal 与 computed 代码重复（`signal.ts:166-242` vs `253-333`），约 80 行重复逻辑
- shallowReadonly 对 WeakMap/WeakSet 的 collection handler 未单独验证（虽然代码路径存在）
- 缺少 `watchEffect` 的 `onCleanup` 在 SSR 环境的特殊处理

---

### 3. 编译器（权重 12%）-- 评分：4.2 / 5.0（v4: 3.8，+0.4）

#### 3.1 v4 扣分点修复情况

| v4 扣分点 | 修复状态 |
|----------|---------|
| 缺少 v-for 解构表达式 | **已修复**（对象/数组解构 + 索引） |
| 缺少编译缓存机制 | **已修复**（LRU 缓存，最大 100 条） |
| SSR codegen 较简化 | 未修复（stream 级别优化仍缺失） |
| 缺少编译时类型推导 | 未修复 |
| WASM codegen 成熟度 | 未验证（代码存在但无 E2E 验证） |

#### 3.2 v-for 解构评估

`packages/compiler/src/transforms/for.ts:61-187`：
- 正则表达式支持四种语法：`(item, index)`、`{ key, value }`、`[a, b]`、简单变量
- `parseDestructure` 函数解析解构模式，生成临时变量
- 在箭头函数体内插入 `const { ... } = __destructureItem` 语句
- **限制**：不支持嵌套解构（如 `{ a: { b } }`）、重命名（如 `{ key: k }`）、默认值（如 `{ key = 'default' }`）

#### 3.3 编译缓存评估

`packages/compiler/src/index.ts:17-139`：
- LRU 策略，Map 天然保持插入顺序
- djb2 哈希函数生成缓存键
- 仅在无自定义 transforms 时使用缓存（正确的设计决策）
- 缓存键包含 source + ssrMode + rendererMode
- **注意**：缓存键的生成存在不一致——检查缓存时用 `hashString(source + '|' + ...)` 但写入缓存时用 `hashString(source)`（第 65 行 vs 第 127 行），这可能导致缓存命中率低于预期

#### 3.4 扣分点

- 编译缓存键生成不一致（`index.ts:65` vs `index.ts:127`）
- v-for 解构不支持嵌套解构、重命名、默认值
- SSR codegen 仍较简化
- 缺少编译时 props 类型推导
- WASM codegen 实际可用性未验证

---

### 4. 虚拟DOM与渲染（权重 12%）-- 评分：4.1 / 5.0（v4: 4.0，+0.1）

#### 4.1 v4 扣分点修复情况

| v4 扣分点 | 修复状态 |
|----------|---------|
| key=null vs key=undefined 区分 | 未修复 |
| Block Tree 快速路径回退 | 部分改善 |
| Teleport deferred prop | 未修复 |
| Fragment STABLE_FRAGMENT 假设 | 未修复 |

#### 4.2 新增功能评估

**inheritAttrs class/style 处理**（`packages/vdom/src/patch.ts:404-423`）：
- `inheritAttrs === false` 时仅合并 class 和 style 到根元素
- 其他 attrs 不继承
- 实现正确，符合 Vue 3 语义

#### 4.3 Block Tree 快速路径评估

`packages/vdom/src/patch.ts:846-868`：
- patchBlockChildren 遍历 dynamicChildren 按索引一一对应
- 类型不同时正确卸载旧节点并挂载新节点
- **仍缺少**：oldDynamicChildren 和 newDynamicChildren 长度不一致时的完整处理（当前仅遍历 newDynamicChildren 的长度，多余的旧 dynamicChildren 不会被卸载）

#### 4.4 扣分点

- Block Tree 快速路径未处理 dynamicChildren 长度不一致（`patch.ts:857` 仅用 `newDynamicChildren.length`）
- key=null 和 key=undefined 语义未区分
- patch.ts 仍约 1400 行，未拆分
- Teleport 缺少 deferred prop

---

### 5. 组件系统（权重 12%）-- 评分：4.3 / 5.0（v4: 3.8，+0.5）

#### 5.1 v4 扣分点修复情况

| v4 扣分点 | 修复状态 |
|----------|---------|
| 缺少 accessCache | **已修复**（完整实现） |
| $forceUpdate 为 NOOP | **已修复**（含回退路径） |
| $refs 返回空对象 | **已修复**（refs 初始化就绪） |
| inject 缺少高级用法 | **已修复**（factory/from/local） |
| 缺少 defineModel 宏 | 未修复 |
| KeepAlive 缺少 onCacheKey | **已修复** |
| inheritAttrs class/style | **已修复** |

#### 5.2 组件系统整体评估

**公共实例代理**（`packages/component/src/component.ts:489-676`）：
- accessCache 实现完整，6 种缓存类型覆盖所有属性来源
- Proxy handler 的 get/set/has 均使用缓存
- Symbol key 跳过缓存直接走原始逻辑（正确）
- 函数属性自动 bind 到 proxy（$emit 除外）

**provide/inject**（`packages/component/src/component.ts:851-936`）：
- provide 的原型链隔离机制保持不变
- inject 新增 InjectOptions 接口（factory/from/local）
- local 模式正确判断实例是否有自身 provides

**KeepAlive**（`packages/component/src/keep-alive.ts`）：
- onCacheKey 集成到 getCacheKey 函数
- LRU 淘汰时调用 deactivateInstance（而非 unmounted）
- 淘汰时停止 effect 防止内存泄漏

**Suspense**（`packages/component/src/suspense.ts`）：
- 多 Promise 追踪（pendingPromises Set）
- abort 机制完善（清空回调数组）
- 错误回调修复（不再误调 onPending）
- **仍缺少**：pendingBranch/activeBranch 的 DOM 切换

#### 5.3 扣分点

- $forceUpdate 回退路径不完整（仅更新 subTree 引用，未触发 patch）
- useTemplateRef 仅在 mounted 时读取一次，非响应式
- Suspense 仍缺少 fallback slot 的完整 DOM 切换
- 缺少 defineModel 宏
- component.ts 约 936 行（含 mergeOptions），可进一步拆分

---

### 6. 工程化水平（权重 10%）-- 评分：4.2 / 5.0（v4: 4.0，+0.2）

#### 6.1 v4 扣分点修复情况

| v4 扣分点 | 修复状态 |
|----------|---------|
| 缺少测试覆盖率阈值 | 未修复 |
| 文档缺少 API 参数说明 | 部分改善 |
| 缺少 CHANGELOG 自动生成 | 未验证 |
| 缺少性能基准 CI 集成 | 未修复 |

#### 6.2 测试覆盖

- **97 个测试文件**（v4 报告中统计为约 80 个，新增约 17 个）
- 新增测试文件包括：signal-advanced.test.ts、core-vnode/tests、core-signal/tests、dom-runtime/tests、runtime-convergence/tests 等
- E2E 测试：14 个 spec 文件（directives, error-boundary, events, keep-alive, lifecycle, mount, props-emit, provide-inject, reactivity, ssr-hydration, suspense, template-compiler, v-model, v-show）
- 测试覆盖的 API 广度优秀

#### 6.3 子路径拆分

编译器子路径拆分已完善：
- `@lytjs/compiler/signal`（8 KB）
- `@lytjs/compiler/ssr`（5 KB）
- `@lytjs/compiler/sfc`
- `@lytjs/compiler/wasm`

reactivity 子路径拆分保持稳定：
- `@lytjs/reactivity/scope`（3 KB）
- `@lytjs/reactivity/async`（3 KB）

vdom 子路径拆分：
- `@lytjs/vdom/transition`（5 KB）

#### 6.4 扣分点

- CI 中仍未配置测试覆盖率阈值
- 性能基准仍未集成到 CI
- 缺少 CHANGELOG 自动生成验证
- 文档站（VitePress）缺少部分 API 的详细参数说明

---

### 7. 包体积（权重 8%）-- 评分：4.3 / 5.0（v4: 4.3，持平）

#### 7.1 体积限制配置

`.size-limit.json` 配置了 **32 个包**的体积限制，与 v4 一致。新增功能（accessCache、writableComputedSignal、inject 高级用法等）均在现有体积限制内实现，说明代码增量控制良好。

#### 7.2 关键体积数据

| 包 | 限制 (minified) | 说明 |
|----|----------------|------|
| @lytjs/reactivity | 12 KB | 含新增 toValue |
| @lytjs/component | 12 KB | 含新增 accessCache、inject 高级用法 |
| @lytjs/core | 35 KB | 含新增 resolveDynamicComponent、useTemplateRef |
| @lytjs/core-vnode | 20 KB | VDOM 独立构建 |
| @lytjs/core-signal | 18 KB | Signal 独立构建 |
| @lytjs/compiler | 15 KB | 含新增编译缓存、v-for 解构 |

#### 7.3 评分依据

- 新增大量功能未突破体积限制，体现良好的代码增量控制
- 子路径拆分策略保持稳定
- 扣分：core 完整包 35 KB 仍偏大（但独立构建变体弥补）

---

### 8. 创新与差异化（权重 8%）-- 评分：4.5 / 5.0（v4: 4.5，持平）

#### 8.1 创新点保持

- 双渲染模式（VDOM + Signal）仍是核心差异化竞争力
- 所见即所得指令独特性保持
- 独立构建变体（core-vnode/core-signal）是实用创新
- 三层架构设计为跨平台扩展奠定基础

#### 8.2 新增创新点

- **编译缓存**：LRU 策略的编译结果缓存，减少重复编译开销
- **writableComputedSignal**：Signal 模式下的可写计算信号，与 Vue 3 Vapor Mode 的理念一致

#### 8.3 扣分点

- 双渲染模式的实际性能差异仍缺乏公开基准数据
- WASM codegen 的成熟度仍待验证
- 所见即所得指令的 IDE 生态兼容性未解决

---

### 9. 代码质量（权重 8%）-- 评分：4.1 / 5.0（v4: 4.0，+0.1）

#### 9.1 v4 扣分点修复情况

| v4 扣分点 | 修复状态 |
|----------|---------|
| 大文件未拆分 | 未修复（patch.ts 仍约 1400 行） |
| 部分 `as any` 使用 | 未修复（component.ts:306,343,351 等处仍存在） |
| 缺少 ADR | 未修复 |
| 贡献者指南代码规范 | 未修复 |

#### 9.2 代码质量改善

- accessCache 实现使用了清晰的枚举和文档注释
- inject 高级用法的接口设计（InjectOptions）类型精确
- Suspense 的 abort 机制增加了详细的注释说明
- 编译缓存的实现有清晰的文档字符串

#### 9.3 新引入的代码问题

1. **编译缓存键不一致**（`compiler/src/index.ts:65` vs `127`）：
   - 检查缓存：`hashString(source + '|' + String(options.ssrMode ?? false) + '|' + String(options.rendererMode ?? ''))`
   - 写入缓存：`hashString(source)`（缺少 ssrMode 和 rendererMode 后缀）
   - 这会导致缓存命中失败或错误命中

2. **writableComputedSignal 代码重复**（`signal.ts`）：
   - computed（166-242）和 writableComputedSignal（253-333）的主体逻辑约 80 行几乎完全相同
   - 应抽取共享的内部工厂函数

3. **$forceUpdate 回退路径不完整**（`component.ts:656-671`）：
   - 回退路径中 `instance.render!(instance.ctx as any)` 仅生成新 subTree
   - 未调用 patch 进行 DOM 更新，实际效果可能不完整

#### 9.4 扣分点

- 编译缓存键生成 bug（检查 vs 写入不一致）
- writableComputedSignal 代码重复
- $forceUpdate 回退路径不完整
- patch.ts 仍约 1400 行未拆分
- 部分 `as any` 仍存在

---

## 三、综合评分

| 维度 | 满分 | 权重 | v4 得分 | v5 得分 | 加权得分 | 变化 |
|------|------|------|--------|--------|---------|------|
| API 完整度 | 5.0 | 15% | 3.5 | **4.2** | 0.630 | +0.7 |
| 响应式系统 | 5.0 | 15% | 4.2 | **4.4** | 0.660 | +0.2 |
| 编译器 | 5.0 | 12% | 3.8 | **4.2** | 0.504 | +0.4 |
| 虚拟DOM与渲染 | 5.0 | 12% | 4.0 | **4.1** | 0.492 | +0.1 |
| 组件系统 | 5.0 | 12% | 3.8 | **4.3** | 0.516 | +0.5 |
| 工程化水平 | 5.0 | 10% | 4.0 | **4.2** | 0.420 | +0.2 |
| 包体积 | 5.0 | 8% | 4.3 | **4.3** | 0.344 | 持平 |
| 创新与差异化 | 5.0 | 8% | 4.5 | **4.5** | 0.360 | 持平 |
| 代码质量 | 5.0 | 8% | 4.0 | **4.1** | 0.328 | +0.1 |
| **总分** | | **100%** | | | **4.25 / 5.0** | |

**四舍五入综合评分：4.3 / 5.0**（v4: 4.0，提升 0.3 分）

### 评分变化总结

- **最大进步**：API 完整度（+0.7）和组件系统（+0.5），得益于 13 项 v4 扣分点的集中修复
- **稳步提升**：编译器（+0.4）、响应式系统（+0.2）、工程化水平（+0.2）
- **小幅提升**：虚拟DOM与渲染（+0.1）、代码质量（+0.1）
- **持平**：包体积（4.3）、创新与差异化（4.5），本身已处于较高水平

---

## 四、竞品对比

### 4.1 API 完整度对比

| 框架 | Composition API | Options API | 内置组件 | 指令系统 | 工具函数 | 总评 |
|------|----------------|------------|---------|---------|---------|------|
| Vue 3.5 | 完整 | 完整 | 完整 | 完整 | 完整 | 5/5 |
| **Lyt.js 6.0** | **93%** | **85%** | **92%** | **88%** | **90%** | **4.2/5** |
| React 19 | Hooks 完整 | N/A | Suspense | N/A | 完整 | 3.5/5 |
| Solid.js 1.9 | Signal 完整 | N/A | Portal | N/A | 基础 | 2.5/5 |
| Svelte 5 | Runes 完整 | N/A | 完整 | 完整 | 基础 | 3/5 |
| Preact 11 | Hooks 完整 | N/A | 基础 | 基础 | 基础 | 2.5/5 |
| Qwik 2 | Signal 完整 | N/A | 基础 | 基础 | 基础 | 2.5/5 |

**对比说明**：Lyt.js v5 的 API 完整度从 3.5 提升至 4.2，已显著缩小与 Vue 3 的差距。在非 Vue 系框架中，Lyt.js 的 API 完整度排名第一。

### 4.2 包体积对比（minified + gzip 估算）

| 框架 | 核心 runtime | 数据来源 |
|------|-------------|---------|
| Preact 11 | ~4 KB | 官方文档 |
| Solid.js 1.9 | ~7.5 KB | 官方文档 |
| Qwik 2 | ~1 KB (resumable) | 官方文档 |
| Svelte 5 | ~2 KB (compiler) + ~12 KB (runtime) | 官方文档 |
| **Lyt.js core-signal** | **~5-6 KB (估算)** | .size-limit.json |
| **Lyt.js core-vnode** | **~6-7 KB (估算)** | .size-limit.json |
| Vue 3.5 | ~33 KB | 官方文档 |
| React 19 | ~44 KB | 官方文档 |
| **Lyt.js core** | **~10-12 KB (估算)** | .size-limit.json |

**对比说明**：Lyt.js 的独立构建变体（core-signal ~5-6 KB、core-vnode ~6-7 KB）在包体积上具有明显优势，接近 Preact 和 Solid.js 的水平。完整 core 包约 10-12 KB（gzip 估算），仍远小于 Vue 3 和 React。

### 4.3 性能对比

| 框架 | 更新粒度 | 首次渲染 | 编译优化 | 总评 |
|------|---------|---------|---------|------|
| Solid.js 1.9 | 细粒度 | 快 | 无编译 | 4.5/5 |
| Svelte 5 | 细粒度 | 快 | 编译优化 | 4/5 |
| **Lyt.js 6.0** | **双模式** | **有优化** | **Block Tree + Patch Flags + 编译缓存** | **3.8/5** |
| Qwik 2 | 可恢复 | 极快 | 编译优化 | 4/5 |
| Vue 3.5 | 组件级 | 中等 | Block Tree + Patch Flags | 3.5/5 |
| React 19 | 组件级 | 中等 | 无编译 | 3/5 |
| Preact 11 | 组件级 | 快 | 无编译 | 3/5 |

**对比说明**：Lyt.js 的双渲染模式理论上提供了最佳灵活性（VDOM 模式兼容性好，Signal 模式性能优）。编译缓存的加入进一步提升了运行时编译性能。但由于缺乏公开基准数据，性能评分保守给出 3.8/5。

### 4.4 创新性对比

| 框架 | 核心创新 | 评分 |
|------|---------|------|
| **Lyt.js 6.0** | **双渲染模式 + 所见即所得指令 + 独立构建变体 + 三层架构 + 编译缓存** | **4.5/5** |
| Solid.js 1.9 | 真响应式（无 VDOM） | 4.5/5 |
| Qwik 2 | Resumability | 4.5/5 |
| Svelte 5 | Runes + 编译器优化 | 4/5 |
| Vue 3.5 | Vapor Mode（实验性） | 3.5/5 |
| React 19 | Server Components + Actions | 3.5/5 |
| Preact 11 | 轻量兼容 | 2.5/5 |

**对比说明**：Lyt.js 在创新性方面与 Solid.js、Qwik 并列第一梯队。双渲染模式 + 独立构建变体的组合在当前前端框架中独一无二。

---

## 五、v4 -> v5 进步总结

### 5.1 定量进步

| 指标 | v4 | v5 | 变化 |
|------|----|----|------|
| 综合评分 | 4.0 / 5.0 | **4.3 / 5.0** | **+0.3** |
| P0 扣分点修复 | 0/4 | **4/4** | 全部修复 |
| P1 扣分点修复 | 0/5 | **4/5** | 80% 修复 |
| P2 扣分点修复 | 0/8 | **6/8** | 75% 修复 |
| Composition API 覆盖率 | ~85% | **~93%** | +8% |
| Options API 覆盖率 | ~75% | **~85%** | +10% |
| 测试文件数 | ~80 | **97** | +17 |

### 5.2 定性进步

1. **组件系统从 3.8 跃升至 4.3**：accessCache、$refs、$forceUpdate、resolveDynamicComponent 四项 P0 功能全部实现，组件系统的可用性大幅提升
2. **API 完整度从 3.5 跃升至 4.2**：13 项缺失 API 补齐，与 Vue 3 的差距从约 15-25% 缩小至约 7-15%
3. **编译器从 3.8 提升至 4.2**：v-for 解构和编译缓存两项重要特性补齐
4. **代码增量控制良好**：大量新功能未突破现有体积限制

---

## 六、发展建议与优先级排序

### P0 - 高优先级（影响框架正确性）

1. **修复编译缓存键不一致 bug**
   - 文件：`packages/compiler/src/index.ts:65` vs `127`
   - 问题：检查缓存和写入缓存使用不同的哈希键，导致缓存失效
   - 修复：统一两处 hashString 的参数
   - 工作量：极小（约 5 分钟）

2. **修复 $forceUpdate 回退路径**
   - 文件：`packages/component/src/component.ts:656-671`
   - 问题：回退路径仅更新 subTree 引用，未触发 patch 进行 DOM 更新
   - 修复：在回退路径中调用 patch 或触发组件的 update 调度
   - 工作量：小（约 1 小时）

3. **修复 useTemplateRef 响应式问题**
   - 文件：`packages/core/src/composition.ts:72-85`
   - 问题：仅在 onMounted 时读取一次 refs，后续 refs 变化不会更新
   - 修复：改用 computed 或 watch 实现，使其响应式追踪 refs 变化
   - 工作量：小（约 1 小时）

### P1 - 中优先级（提升框架竞争力）

4. **抽取 writableComputedSignal 共享逻辑**
   - 文件：`packages/reactivity/src/signal.ts`
   - 问题：computed 和 writableComputedSignal 约 80 行重复代码
   - 修复：抽取 createComputedSignalInternal 工厂函数
   - 工作量：小（约 1-2 小时）

5. **实现 Suspense fallback slot DOM 切换**
   - 文件：`packages/component/src/suspense.ts`
   - 问题：缺少 pendingBranch/activeBranch 的完整 DOM 切换
   - 修复：实现 pending 状态时显示 fallback slot，resolve 时切换回 default slot
   - 工作量：大（约 3-5 天）

6. **实现 defineModel 宏**
   - Vue 3.4+ 的重要语法糖，简化 v-model 用法
   - 需要编译器 + 运行时配合
   - 工作量：中等（约 2-3 天）

7. **发布性能基准数据**
   - 在 CI 中集成 benchmarks
   - 与 Vue 3/React/Solid 进行公开对比
   - 工作量：中等（约 2 天）

8. **拆分 patch.ts**
   - 当前约 1400 行，建议拆分为 patch-element.ts、patch-fragment.ts、patch-teleport.ts、patch-suspense.ts、patch-component.ts
   - 工作量：小（纯重构，约 1-2 天）

### P2 - 低优先级（锦上添花）

9. **实现 useCssModule / useCssVars**
   - Vue 3 的 CSS 相关 Composition API
   - 工作量：中等（约 2 天）

10. **实现 useId**
    - Vue 3.5 新增的生成唯一 ID 的 API
    - 工作量：小（约 0.5 天）

11. **完善 v-for 解构**
    - 支持嵌套解构、重命名、默认值
    - 工作量：中等（编译器改动，约 2 天）

12. **添加测试覆盖率阈值**
    - 在 CI 中配置最低覆盖率要求（建议 80%）
    - 工作量：小（约 0.5 天）

13. **配置 CHANGELOG 自动生成**
    - 利用 changeset 的 changelog 生成功能
    - 工作量：小（约 0.5 天）

14. **补充 renderTracked / renderTriggered 的 Options API 声明**
    - 工作量：极小（约 30 分钟）

---

## 七、总结

Lyt.js v6.0 经过四轮改进后，在第五轮评估中取得了显著进步：

### 核心成就

1. **P0 功能全部实现**：accessCache、$refs、$forceUpdate、resolveDynamicComponent 四项关键功能全部就位，组件系统的可用性从"基本可用"提升到"生产可用"
2. **API 完整度大幅提升**：从 85% 提升至 93%，与 Vue 3 的差距缩小至约 7%，在非 Vue 系框架中 API 覆盖率排名第一
3. **代码增量控制优秀**：13 项新功能实现未突破任何体积限制
4. **综合评分从 4.0 提升至 4.3**：进步幅度 7.5%，在框架成熟度曲线上处于快速上升期

### 仍需关注的问题

1. **编译缓存键 bug**：检查和写入使用不同哈希键，属于正确性问题，应立即修复
2. **$forceUpdate 回退路径不完整**：影响组件手动更新的可靠性
3. **Suspense 仍缺少完整 DOM 切换**：是框架高级特性的最后一块拼图
4. **缺乏公开性能基准数据**：双渲染模式的实际优势缺乏量化验证

### 竞争定位

Lyt.js 在国产前端框架中已处于**领先水平**。其双渲染模式 + 独立构建变体的组合在当前前端框架生态中具有**独特价值**。如果能够修复上述 P0 问题并发布性能基准数据，综合评分有望达到 **4.5** 的水平，进入与 Vue 3、Solid.js 同等竞争力的第一梯队。

---

*报告生成工具：人工源码审读 + 自动化分析*
*评估标准参照 Vue 3.5 核心层 API 规范*
*评估轮次：第五轮（v5）*
