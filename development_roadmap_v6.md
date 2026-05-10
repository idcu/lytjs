# Lyt.js v6.0.0 开发路线图
## 基于现状夯实基础 + 补齐竞品功能缺口

**文档版本**: v2.1 (修复版)
**制定日期**: 2026年5月10日
**适用版本**: Lyt.js v6.0.0（版本号固定）

---

## 目录

1. [现状盘点](#1-现状盘点)
2. [功能缺口分析](#2-功能缺口分析)
3. [开发路线图总览](#3-开发路线图总览)
4. [Phase 0: 夯实基础](#4-phase-0-夯实基础)
5. [Phase 1: 核心补齐](#5-phase-1-核心补齐)
6. [Phase 2: 生态完善](#6-phase-2-生态完善)
7. [Phase 3: 差异化领先](#7-phase-3-差异化领先)
8. [优先级矩阵](#8-优先级矩阵)
9. [风险与应对](#9-风险与应对)

---

## 1. 现状盘点

### 1.1 v6.0.0 已具备能力

#### ✅ 核心架构 (已夯实)
| 层级 | 包名 | 状态 | 说明 |
|------|------|------|------|
| L0 | 30+ common-* 子包 | ✅ 稳定 | 基础工具函数，按需引入 |
| L1 | reactivity (12KB) | ✅ 稳定 | Signal + Proxy 双响应式系统 |
| L1 | vdom (10KB) | ✅ 稳定 | PatchFlags + Block Tree 优化 |
| L1 | compiler (15KB) | ✅ 稳定 | LRU编译缓存，SSR/Signal/VNode三模式 |
| L2 | component (12KB) | ✅ 稳定 | KeepAlive/Suspense/Teleport/Transition |
| L2 | dom-runtime (4KB) | ✅ 稳定 | DOM操作运行时 |
| L3 | adapter-web (5KB) | ✅ 稳定 | Web平台适配器 |
| L4 | core (35KB) | ✅ 稳定 | 完整双模式核心 |
| L4 | core-vnode (20KB) | ✅ 稳定 | VNode专用模式 |
| L4 | core-signal (18KB) | ✅ 稳定 | Signal专用模式 |
| L4 | renderer (8KB) | ✅ 稳定 | DOM/SSR/Signal/Vapor渲染器 |
| L5 | web | ✅ 稳定 | CSS变量/ResizeObserver/Web Components |

#### ✅ 响应式系统 (已夯实)
- [x] ref / reactive / computed / watch / watchEffect
- [x] Signal 细粒度响应式 (独立订阅机制)
- [x] effectScope / onScopeDispose
- [x] asyncComputed / useAsyncState
- [x] 计算属性循环依赖检测 (v6.0新增)

#### ✅ 组件系统 (已夯实)
- [x] 组合式API (setup, lifecycle hooks)
- [x] Props/Emit/Slots/Provide/Inject
- [x] 内置组件: KeepAlive, Suspense, Teleport, Transition, TransitionGroup
- [x] ErrorBoundary (含异步错误捕获)
- [x] 异步组件 (defineAsyncComponent + preload)
- [x] Web Components (defineCustomElement)

#### ✅ 编译器 (已夯实)
- [x] 模板编译 (parse/transform/codegen)
- [x] PatchFlags 编译时标记
- [x] Block Tree 静态提升
- [x] LRU编译缓存 (100条)
- [x] 三模式代码生成: VNode / Signal / SSR
- [x] Source Map 支持

#### ✅ 渲染器 (已夯实)
- [x] DOM渲染器
- [x] SSR渲染器 (renderToString/renderToStream)
- [x] Signal渲染器
- [x] Vapor模式 (defineVaporComponent/createVaporApp)
- [x] Islands架构 (hydrateIsland)

#### ✅ 安全特性 (行业领先)
- [x] XSS防护 (v-html自动转义)
- [x] CSP严格模式检测+优雅降级
- [x] 动态属性名/事件名/组件名验证
- [x] 组件递归深度限制 (100层)
- [x] 计算属性循环依赖检测
- [x] watch回调错误捕获

#### ✅ 生态工具 (已有基础)
- [x] Router (@lytjs/router) - 基础实现
- [x] Store (@lytjs/store) - Signal-based，Pinia兼容
- [x] DevTools - 组件树/状态/事件调试
- [x] Vite Plugin - 基础支持
- [x] CLI - 基础命令 (create/dev/build/test)

---

## 2. 功能缺口分析

### 2.1 对比 React 19.1 缺失的功能

| 功能 | React 19.1 | Lyt.js v6.0.0 | 优先级 | 难度 |
|------|------------|---------------|--------|------|
| **Server Components (RSC)** | ✅ 正式版 | ⚠️ 基础SSR，无RSC | **P0** | 高 |
| **React Compiler** | ✅ 自动优化 | ❌ 无自动优化器 | P1 | 高 |
| **useOptimistic** | ✅ 乐观更新 | ❌ 无内置乐观更新 | P2 | 中 |
| **use()** | ✅ 读取Promise/Context | ❌ 无此API | P2 | 低 |
| **Actions** | ✅ 表单动作 | ❌ 无内置表单动作 | P2 | 中 |
| **useFormStatus** | ✅ 表单状态 | ❌ 无 | P3 | 低 |
| **Document Metadata** | ✅ 原生支持 | ⚠️ 需手动操作head | P2 | 低 |

### 2.2 对比 Vue 3.5 缺失的功能

| 功能 | Vue 3.5 | Lyt.js v6.0.0 | 优先级 | 难度 |
|------|---------|---------------|--------|------|
| **Vapor模式 (生产级)** | ✅ 稳定 | ⚠️ 实验性 | **P0** | 高 |
| **AlienSignals** | ✅ 性能提升40% | ⚠️ 基础Signal | P1 | 中 |
| **shallowRef优化** | ✅ 性能优化 | ⚠️ 基础实现 | P2 | 低 |
| **toValue** | ✅ 工具函数 | ❌ 无 | P2 | 低 |
| **toRaw优化** | ✅ 性能优化 | ⚠️ 基础实现 | P2 | 低 |

### 2.3 对比 Angular 缺失的功能

| 功能 | Angular | Lyt.js v6.0.0 | 优先级 | 难度 |
|------|---------|---------------|--------|------|
| **依赖注入 (DI)** | ✅ 完整DI系统 | ⚠️ provide/inject基础 | P1 | 中 |
| **Hydration (完整)** | ✅ 全应用水合 | ⚠️ Islands局部水合 | P1 | 高 |
| **CLI 完整工具链** | ✅ 完整 | ⚠️ 基础CLI | P1 | 中 |
| **Deferrable Views** | ✅ @defer | ❌ 无 | P2 | 中 |
| **i18n** | ✅ 内置国际化 | ❌ 无 | P2 | 高 |

### 2.4 对比 Svelte 缺失的功能

| 功能 | Svelte 5 | Lyt.js v6.0.0 | 优先级 | 难度 |
|------|----------|---------------|--------|------|
| **Runes ($state/$derived)** | ✅ 编译时响应式 | ⚠️ Signal运行时 | P2 | 中 |
| **$props** | ✅ Props解构 | ❌ 无 | P2 | 低 |
| **Snippets** | ✅ 模板片段复用 | ❌ 无 | P2 | 中 |
| **SvelteKit (元框架)** | ✅ 完整元框架 | ❌ 无 | **P0** | 高 |

### 2.5 生态/工具链缺口

| 功能 | 竞品状态 | Lyt.js v6.0.0 | 优先级 |
|------|----------|---------------|--------|
| **元框架** | Next.js/Nuxt/SvelteKit | ❌ 无 | **P0** |
| **UI组件库** | MUI/Element/PrimeVue | ❌ 无 | P1 |
| **表单方案** | React Hook Form/VeeValidate | ❌ 无 | P1 |
| **测试工具** | Vitest深度集成 | ⚠️ 基础支持 | P1 |
| **文档站点** | 完善文档 | ⚠️ VitePress基础 | P1 |
| **ESLint/Prettier** | 官方配置 | ⚠️ 基础 | P2 |

---

## 3. 开发路线图总览

```
Phase 0          Phase 1          Phase 2          Phase 3
夯实基础    →    核心补齐    →    生态完善    →    差异化领先
(4-6周)         (8-10周)         (10-12周)        (持续)
```

> **版本策略**: 全程固定 v6.0.0 版本号，通过迭代补齐功能和优化质量。
> **Phase 1调整说明**: 根据评审报告优化，部分P1任务移至Phase 2，Server Components分两阶段交付

---

## 4. Phase 0: 夯实基础

**目标**: 确保 v6.0.0 架构稳定可靠，建立质量基线

**时间**: 4-6周

### 4.1 架构稳定性 (P0)

| # | 任务 | 描述 | 验收标准 | 工期 |
|---|------|------|----------|------|
| 0.1 | 分层依赖检查 | 确保 L0-L5 无循环依赖 | `pnpm check-deps` 零警告 | 3天 |
| 0.2 | 包体积监控 | CI 集成 size-limit，每个 PR 自动检查 | PR 自动拦截超限提交 | 2天 |
| 0.3 | 性能基准建立 | 接入 js-framework-benchmark | 基准数据可追踪、可对比 | 5天 |
| 0.4 | 内存泄漏检测 | 集成 Memlab，覆盖核心场景 | 无内存泄漏报告 | 5天 |

### 4.2 错误提示优化 (P0)

| # | 任务 | 描述 | 验收标准 | 工期 |
|---|------|------|----------|------|
| 0.5 | 编译时错误友好化 | 模板编译错误包含位置+原因+修复建议 | 错误信息可直接指导修复 | 5天 |
| 0.6 | 运行时错误友好化 | 响应式/渲染/生命周期错误标准化 | 错误信息包含组件栈 | 5天 |
| 0.7 | 警告系统分级 | warn / error / fatal 三级，可配置过滤 | 支持自定义警告处理器 | 3天 |

### 4.3 测试覆盖 (P0)

| # | 任务 | 描述 | 目标 | 工期 |
|---|------|------|------|------|
| 0.8 | 单元测试补充 | reactivity / vdom / compiler / renderer | 覆盖率 >90% | 2周 |
| 0.9 | E2E 测试场景 | 真实应用场景覆盖 | 10个核心场景通过 | 1周 |
| 0.10 | 视觉回归测试 | 关键组件渲染一致性 | 快照测试覆盖 | 3天 |

### 4.4 DevTools 增强 (P1)

| # | 任务 | 描述 | 验收标准 | 工期 |
|---|------|------|----------|------|
| 0.11 | 组件状态编辑 | DevTools 中直接修改响应式状态 | 修改即时反映到视图 | 1周 |
| 0.12 | 时间旅行调试 | 状态变更历史回放 | 支持前进/后退/跳转 | 1周 |
| 0.13 | 性能面板 | 组件渲染耗时、重渲染次数可视化 | 可定位性能瓶颈 | 5天 |

### 4.5 文档站点 (P1)

| # | 任务 | 描述 | 验收标准 | 工期 |
|---|------|------|----------|------|
| 0.14 | API 文档 | 所有 public API 自动生成文档 | 覆盖率 100% | 1周 |
| 0.15 | 快速上手教程 | 5分钟创建第一个 Lyt.js 应用 | 新手可独立完成 | 3天 |
| 0.16 | 示例项目 | 官方示例集 (TodoMVC / Counter / Dashboard) | 可在线运行 | 1周 |

### Phase 0 里程碑

- [ ] 0.1 ~ 0.4: 架构质量基线建立（CI 绿灯）
- [ ] 0.5 ~ 0.7: 错误提示全面友好化
- [ ] 0.8 ~ 0.10: 测试覆盖率 >90%
- [ ] 0.11 ~ 0.13: DevTools 支持状态编辑+时间旅行
- [ ] 0.14 ~ 0.16: 文档站点上线，覆盖所有 public API

---

## 5. Phase 1: 核心补齐

**目标**: 补齐与主流竞品的核心功能差距

**时间**: 8-10周

**执行策略**: 并行开发，优先保障P0任务；部分P1任务延期至Phase 2；Server Components分两阶段交付

### 5.0 Phase 1前置工作 (P0) - 1周

在Phase 1开始前完成性能基准建立，确保优化效果可量化。

| # | 子任务 | 描述 | 验收标准 | 工期 |
|---|--------|------|----------|------|
| 1.0 | 性能基准建立 | 建立Vapor模式和Server Components性能基准 | js-framework-benchmark集成，基准数据可追踪 | 1周 |

### 5.1 Vapor 模式生产化 (P0) - 3周

将实验性 Vapor 模式打磨为生产可用，对标 Vue Vapor。

| # | 子任务 | 描述 | 验收标准 | 工期 |
|---|--------|------|----------|------|
| 1.1 | Vapor 编译器优化 | 生成更高效的 Signal 代码 | 生成代码体积减少 30%+，性能提升20%+ | 1周 |
| 1.2 | Vapor 组件 HMR | 热更新支持 | 修改组件状态不丢失 | 1周 |
| 1.3 | Vapor + SSR 集成 | 服务端渲染 Vapor 组件 | SSR 输出与客户端一致 | 3天 |
| 1.4 | Vapor 测试覆盖 | 补充Vapor模式测试 | 单元测试覆盖率>90% | 4天 |

### 5.2 Server Components (P0) - 5周 (分两阶段)

对标 React RSC，实现服务端组件支持，**分两阶段交付**。

**阶段一 (MVP)**: 前3周交付最小可用版本
**阶段二 (完善)**: 后2周补充高级特性

| # | 子任务 | 描述 | 验收标准 | 工期 | 阶段 |
|---|--------|------|----------|------|------|
| 1.5 | Server Component 编译 | `'use server'` 标记与编译 | 服务端组件不打包到客户端 | 1周 | 一 |
| 1.6 | Streaming SSR 优化 | 流式渲染，逐步输出 | TTFB 降低 50%+ | 1周 | 一 |
| 1.7 | Client/Server 边界 | 明确组件运行环境，自动分割 | 混用服务端/客户端组件无报错 | 1周 | 一 |
| 1.8 | 数据获取集成 | 服务端数据预取 + 序列化 | 零客户端请求即可渲染 | 1周 | 二 |
| 1.9 | Server Actions | 表单动作支持 | `use server` 函数可直接作为表单action | 3天 | 二 |
| 1.10 | 数据缓存策略 | 服务端数据缓存机制 | 支持时间缓存、失效策略 | 2天 | 二 |
| 1.11 | lytx 衔接设计 | 与Phase 2元框架的接口设计 | API文档完成，与Phase 2兼容 | 2天 | 二 |

```typescript
// 目标 API - Server Components
'use server';

const ServerComponent = defineComponent({
  async setup() {
    const data = await fetchData(); // 仅服务端执行
    return { data };
  },
  template: '<div>{{ data }}</div>',
});

// 目标 API - Server Actions
'use server';
export async function submitForm(formData: FormData) {
  const result = await saveToDatabase(formData);
  return result;
}
```

### 5.3 依赖注入增强 (P1) - 2周 (并行开发)

对标 Angular DI，增强 provide/inject。可与Vapor模式/Server Components并行开发。

| # | 子任务 | 描述 | 验收标准 | 工期 |
|---|--------|------|----------|------|
| 1.12 | 多级 Provider | 子组件可覆盖父级注入 | 覆盖链路正确解析 | 3天 |
| 1.13 | 可选注入 | 注入不存在时不报错 | `inject(key, { optional: true })` | 2天 |
| 1.14 | InjectionToken | 类型安全的注入令牌 | 支持接口类型注入 | 2天 |
| 1.15 | 生命周期管理 | 单例 / 作用域 / 临时 | Provider 可配置作用域 | 3天 |

### 5.4 编译器自动优化 (P1) - 延期至Phase 2

对标 React Compiler，实现自动 memo 优化。**移至Phase 2**以缓解工期压力。

### 5.5 Hydration 完善 (P1) - 延期至Phase 2

对标 Angular 全应用水合，完善当前 Islands 局部水合。**移至Phase 2**以与Server Components更好协同。

### Phase 1 里程碑

- [x] 前置工作: 性能基准建立
- [ ] Vapor 模式生产就绪（HMR + SSR + 测试覆盖>90%）
- [ ] Server Components MVP 发布（阶段一完成）
- [ ] Server Components 完善版发布（阶段二完成，含Actions+缓存）
- [ ] DI 系统增强完成

---

## 6. Phase 2: 生态完善

**目标**: 建立完整生态，发布元框架和组件库

**时间**: 10-12周

### 6.1 编译器自动优化 (P1) - 2周 (从Phase 1移入)

对标 React Compiler，实现自动 memo 优化。

| # | 子任务 | 描述 | 验收标准 | 工期 |
|---|--------|------|----------|------|
| 2.0 | 自动 memo 检测 | 编译时分析依赖，自动跳过不变更新 | 冗余渲染减少 30%+ | 1周 |
| 2.0.1 | 死代码消除 | 更激进的 Tree Shaking | 未使用 API 不出现在产物中 | 3天 |
| 2.0.2 | AOT 预编译 | 构建时完全编译模板 | 运行时无编译开销 | 4天 |

### 6.2 Hydration 完善 (P1) - 2周 (从Phase 1移入)

对标 Angular 全应用水合，完善当前 Islands 局部水合。与Server Components协同开发。

| # | 子任务 | 描述 | 验收标准 | 工期 |
|---|--------|------|----------|------|
| 2.0.3 | 全应用 Hydration | SSR 页面整体水合 | 水合后事件绑定完整 | 1周 |
| 2.0.4 | 选择性 Hydration | 基于 IntersectionObserver 懒水合 | 不可见区域延迟水合 | 3天 |
| 2.0.5 | 水合错误恢复 | mismatch 时优雅降级 | 不白屏，可部分恢复 | 4天 |

### 6.3 元框架: lytx (P0) - 6周

对标 Next.js / Nuxt.js / SvelteKit。

| # | 模块 | 功能 | 验收标准 | 工期 |
|---|------|------|----------|------|
| 2.1 | 文件系统路由 | pages/ 目录自动路由 | 动态路由 / 嵌套布局 | 2周 |
| 2.2 | 数据加载 | loader / action 模式 | 表单提交 + 数据预取 | 2周 |
| 2.3 | 渲染策略 | SSR / SSG / ISR / CSR | 按页面配置渲染模式 | 1周 |
| 2.4 | 部署适配 | Vercel / Netlify / Node / Deno | 一键部署 | 1周 |

```typescript
// 目标 API: pages/index.ts
export const loader = async () => {
  const data = await fetchData();
  return { data };
};

export const action = async ({ request }) => {
  const form = await request.formData();
  await saveData(form);
  return { success: true };
};

export default definePage({
  template: '<div>{{ loader.data }}</div>',
});
```

### 6.4 UI 组件库: LytUI (P1) - 4周

| # | 模块 | 组件 | 验收标准 | 工期 |
|---|------|------|----------|------|
| 2.5 | 基础组件 | Button / Input / Select / Modal / Checkbox / Radio | 可访问性 AA 级 | 2周 |
| 2.6 | 布局组件 | Grid / Flex / Container / Space | 响应式适配 | 1周 |
| 2.7 | 反馈组件 | Toast / Dialog / Loading / Progress | 动画流畅 | 1周 |

### 6.5 表单方案: LytForm (P1) - 3周

| # | 功能 | 描述 | 验收标准 | 工期 |
|---|------|------|----------|------|
| 2.8 | 表单验证 | 类似 VeeValidate + Zod 集成 | 声明式验证规则 | 1周 |
| 2.9 | 表单组件 | Form / Field / ErrorMessage | 表单状态自动管理 | 1周 |
| 2.10 | 动态表单 | FieldArray / 条件字段 | 运行时增减表单项 | 3天 |
| 2.11 | 联动验证 | 字段间依赖验证 | A 变化触发 B 重新校验 | 4天 |

### 6.6 测试工具 (P1) - 2周

| # | 功能 | 描述 | 验收标准 | 工期 |
|---|------|------|----------|------|
| 2.12 | 测试工具库 | @lytjs/test-utils | mount / find / click / trigger | 1周 |
| 2.13 | 响应式测试 | 测试 Signal / computed 变化 | 自动追踪依赖变化 | 2天 |
| 2.14 | SSR 测试 | 服务端渲染测试工具 | renderToString 断言 | 2天 |
| 2.15 | 快照测试 | 组件渲染快照 | diff 可读性优化 | 1天 |

### 6.7 官方示例与案例 (P1) - 3周

| # | 示例 | 描述 | 工期 |
|---|------|------|------|
| 2.16 | TodoMVC | 经典待办事项 | 2天 |
| 2.17 | 电商首页 | 商品列表 + 购物车 | 3天 |
| 2.18 | 管理后台 | 表格 + 表单 + 权限 | 5天 |
| 2.19 | 实时聊天 | WebSocket + 状态同步 | 3天 |
| 2.20 | 数据大屏 | 图表 + 实时数据 | 3天 |

### Phase 2 里程碑

- [ ] 编译器自动优化完成（从Phase 1移入）
- [ ] Hydration 完善完成（从Phase 1移入）
- [ ] lytx 1.0 发布（文件路由 + SSR/SSG）
- [ ] LytUI 基础组件库发布（20+ 组件）
- [ ] LytForm 表单方案发布
- [ ] @lytjs/test-utils 发布
- [ ] 5个官方示例项目上线

---

## 7. Phase 3: 差异化领先

**目标**: 在安全、性能、模块化方向建立不可替代的优势

**时间**: 持续推进

### 7.1 安全增强

| # | 功能 | 描述 | 预期效果 |
|---|------|------|----------|
| 3.1 | 安全审计模式 | 运行时安全检测开关 | 自动发现潜在 XSS/注入 |
| 3.2 | CSP 策略生成器 | 根据代码自动生成最优 CSP | 一键配置，零手动 |
| 3.3 | 依赖安全检查 | 集成 OSV 数据库扫描 | CI 自动拦截有漏洞的依赖 |
| 3.4 | 运行时沙箱 | 组件级沙箱隔离 | XSS 影响范围限制在单组件内 |

### 7.2 性能极致

| # | 功能 | 描述 | 目标 |
|---|------|------|------|
| 3.5 | WebAssembly 编译器 | 模板编译 WASM 化 | 编译速度提升 10x |
| 3.6 | 边缘渲染优化 | Cloudflare Workers 适配 | 冷启动 <50ms |
| 3.7 | 智能预加载 | 基于用户行为预测 | 路由命中率达 80% |
| 3.8 | 内存池优化 | 更激进的 VNode 对象复用 | 内存占用降低 50% |

### 7.3 模块化生态

| # | 功能 | 描述 | 目标 |
|---|------|------|------|
| 3.9 | 插件市场 | 官方插件注册中心 | 100+ 社区插件 |
| 3.10 | 微前端支持 | Module Federation 集成 | 多框架共存 |
| 3.11 | 跨平台渲染 | Host Contract 扩展 | 一套代码多端渲染 |

---

## 8. 优先级矩阵

### 8.1 全局优先级

```
影响范围
    高 │  lytx元框架    安全审计模式
       │  Server Comp     WASM编译器
       │  Vapor生产化     边缘渲染
       │
       │  LytUI组件库     智能预加载
       │  LytForm表单     微前端支持
       │  DI增强          插件市场
       │
       │  测试工具        运行时沙箱
       │  文档站点        依赖安全检查
       │  DevTools        CSP生成器
       │
    低 │  错误提示优化    视觉回归测试
       │  性能基准建立    E2E测试
       └───────────────────────────→
         低          中          高   紧迫度
```

### 8.2 按阶段任务汇总

| 阶段 | P0 任务 | P1 任务 | P2 任务 |
|------|---------|---------|---------|
| **Phase 0** | 架构稳定、测试覆盖、错误提示优化 | DevTools增强、文档站点 | - |
| **Phase 1** | Vapor生产化、Server Components | DI增强 | - (原编译器优化、Hydration移至Phase 2) |
| **Phase 2** | lytx元框架 | LytUI、LytForm、测试工具、示例项目、编译器优化、Hydration | 示例完善 |
| **Phase 3** | 安全审计、WASM编译器 | 边缘渲染、微前端 | 插件市场 |

---

## 9. 风险与应对

### 9.1 技术风险

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|----------|
| Server Components 复杂度超预期 | Phase 1 延期 | 中 | 已分两阶段交付，MVP版本优先 |
| WASM 编译器兼容性 | 部分平台不支持 | 中 | 提供 JS fallback |
| 元框架生态追赶难 | 用户增长慢 | 高 | 专注差异化（安全+性能+模块化） |
| 工期紧张，任务过多 | 质量下降 | 中 | 已将部分P1任务移至Phase 2 |

### 9.2 资源风险

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|----------|
| 核心贡献者不足 | 延期 | 中 | 文档化、降低贡献门槛 |
| 资金不足 | 功能削减 | 中 | 寻求企业赞助 |

### 9.3 市场风险

| 风险 | 影响 | 概率 | 应对策略 |
|------|------|------|----------|
| React/Vue 快速迭代 | 差距拉大 | 中 | 专注安全+模块化差异化赛道 |
| 企业采用意愿低 | 生态难建 | 中 | 先切入安全敏感行业（金融/政务） |

---

## 附录

### A. 全量任务清单

#### Phase 0 - 夯实基础
- [ ] 0.1 分层依赖检查
- [ ] 0.2 包体积监控 CI
- [ ] 0.3 性能基准建立
- [ ] 0.4 内存泄漏检测
- [ ] 0.5 编译时错误友好化
- [ ] 0.6 运行时错误友好化
- [ ] 0.7 警告系统分级
- [ ] 0.8 单元测试 >90%
- [ ] 0.9 E2E 测试 10 场景
- [ ] 0.10 视觉回归测试
- [ ] 0.11 DevTools 状态编辑
- [ ] 0.12 DevTools 时间旅行
- [ ] 0.13 DevTools 性能面板
- [ ] 0.14 API 文档
- [ ] 0.15 快速上手教程
- [ ] 0.16 示例项目

#### Phase 1 - 核心补齐
- [ ] 1.0 性能基准建立（前置工作）
- [ ] 1.1 Vapor 编译器优化
- [ ] 1.2 Vapor HMR
- [ ] 1.3 Vapor + SSR
- [ ] 1.4 Vapor 测试覆盖
- [ ] 1.5 Server Component 编译
- [ ] 1.6 Streaming SSR
- [ ] 1.7 Client/Server 边界
- [ ] 1.8 数据获取集成
- [ ] 1.9 Server Actions
- [ ] 1.10 数据缓存策略
- [ ] 1.11 lytx 衔接设计
- [ ] 1.12 多级 Provider
- [ ] 1.13 可选注入
- [ ] 1.14 InjectionToken
- [ ] 1.15 生命周期管理

#### Phase 2 - 生态完善
- [ ] 2.0 自动 memo 检测 (从Phase 1移入)
- [ ] 2.0.1 死代码消除 (从Phase 1移入)
- [ ] 2.0.2 AOT 预编译 (从Phase 1移入)
- [ ] 2.0.3 全应用 Hydration (从Phase 1移入)
- [ ] 2.0.4 选择性 Hydration (从Phase 1移入)
- [ ] 2.0.5 水合错误恢复 (从Phase 1移入)
- [ ] 2.1 文件系统路由
- [ ] 2.2 数据加载 (loader/action)
- [ ] 2.3 渲染策略 (SSR/SSG/ISR/CSR)
- [ ] 2.4 部署适配
- [ ] 2.5 基础组件 (20+)
- [ ] 2.6 布局组件
- [ ] 2.7 反馈组件
- [ ] 2.8 表单验证
- [ ] 2.9 表单组件
- [ ] 2.10 动态表单
- [ ] 2.11 联动验证
- [ ] 2.12 测试工具库
- [ ] 2.13 响应式测试
- [ ] 2.14 SSR 测试
- [ ] 2.15 快照测试
- [ ] 2.16 ~ 2.20 官方示例 (5个)

#### Phase 3 - 差异化领先
- [ ] 3.1 安全审计模式
- [ ] 3.2 CSP 策略生成器
- [ ] 3.3 依赖安全检查
- [ ] 3.4 运行时沙箱
- [ ] 3.5 WebAssembly 编译器
- [ ] 3.6 边缘渲染优化
- [ ] 3.7 智能预加载
- [ ] 3.8 内存池优化
- [ ] 3.9 插件市场
- [ ] 3.10 微前端支持
- [ ] 3.11 跨平台渲染

### B. 竞品功能追踪表

| 功能 | React | Vue | Angular | Svelte | Lyt.js v6.0.0 |
|------|-------|-----|---------|--------|---------------|
| Server Components | ✅ 19 | ❌ | ❌ | ❌ | Phase 1 (分两阶段) |
| Vapor 模式 | ❌ | ✅ 3.5 | ❌ | ✅ 5 | Phase 1 (含测试覆盖) |
| Signals | ✅ 19 | ✅ 3.5 | ✅ 20 | ✅ 5 | ✅ 已有 |
| 元框架 | ✅ Next | ✅ Nuxt | ✅ Universal | ✅ Kit | Phase 2 |
| 自动编译优化 | ✅ Compiler | ⚠️ Vapor | ✅ Ivy | ✅ 编译时 | Phase 2 (从Phase 1移入) |
| 安全内置 | ❌ | ❌ | ⚠️ | ❌ | ✅ **行业领先** |
| 模块化架构 | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ **行业领先** |

---

**文档维护**: 每月更新进度
**下次评审**: 2026年6月10日
**变更记录**: v2.1 - 修复Phase 1工期问题，补充测试覆盖、性能基准、Server Actions、缓存策略，部分P1任务移至Phase 2

---

*本路线图基于 Lyt.js v6.0.0 现状和竞品分析制定，版本号固定 v6.0.0，具体执行可根据实际情况调整优先级。*
