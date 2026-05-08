# LytJS Phase 1 开发计划文档

> **版本**: v6.0.0  
> **层级**: L4 (生态基础层) + L5 (工具层)  
> **目标**: 实现核心生态基础设施，使框架具备完整应用开发能力

---

## 目录

1. [总体概述](#一总体概述)
2. [开发原则与约束](#二开发原则与约束)
3. [L4 层: 生态基础层](#三l4层-生态基础层)
   - 3.1 [@lytjs/router](#31-lytjsrouter)
   - 3.2 [@lytjs/store](#32-lytjsstore)
   - 3.3 [@lytjs/compat](#33-lytjscompat)
4. [L5 层: 工具层](#四l5层-工具层)
   - 4.1 [@lytjs/cli](#41-lytjscli)
   - 4.2 [@lytjs/plugin-vite](#42-lytjsplugin-vite)
   - 4.3 [@lytjs/devtools](#43-lytjsdevtools)
5. [开发里程碑](#五开发里程碑)
6. [附录: 类型定义参考](#六附录-类型定义参考)

---

## 一、总体概述

### 1.1 Phase 1 目标

Phase 1 的核心目标是让 LytJS 从"框架核心"升级为"可生产使用的完整解决方案"。具体包括：

| 能力       | 当前状态      | Phase 1 目标          |
| ---------- | ------------- | --------------------- |
| 路由       | ❌ 缺失       | ✅ 完整路由系统       |
| 状态管理   | ❌ 缺失       | ✅ Signal-based Store |
| 项目脚手架 | ❌ 缺失       | ✅ CLI + 模板         |
| 构建工具   | ⚠️ 需手动配置 | ✅ Vite 插件          |
| 调试工具   | ❌ 缺失       | ✅ 浏览器 DevTools    |

### 1.2 架构层级关系

```
L5: @lytjs/cli, @lytjs/plugin-vite, @lytjs/devtools
        ↓ 依赖
L4: @lytjs/router, @lytjs/store, @lytjs/compat
        ↓ 依赖
L3: @lytjs/core (@lytjs/reactivity + @lytjs/vdom)
        ↓ 依赖
L2/L1/L0: 基础层 (已完成)
```

### 1.3 目录结构规划

```
packages/
├── ecosystem/              # L4 层包
│   └── packages/
│       ├── router/         # @lytjs/router
│       ├── store/          # @lytjs/store
│       └── compat/         # @lytjs/compat
├── tools/                  # L5 层包
│   └── packages/
│       ├── cli/            # @lytjs/cli
│       ├── devtools/       # @lytjs/devtools
│       ├── lytx/           # @lytjs/lytx (构建工具)
│       └── test-utils/     # @lytjs/test-utils
└── plugins/                # L6 层包 (Phase 1 先实现 Vite 插件)
    └── packages/
        └── plugin-vite/    # @lytjs/plugin-vite
```

---

## 二、开发原则与约束

### 2.1 设计原则

1. **Vue 生态兼容**: API 设计参考 Vue Router 4 和 Pinia，降低迁移成本
2. **Signal 优先**: Store 基于 `@lytjs/reactivity` 的 Signal 系统，而非 Redux/Vuex 模式
3. **按需引入**: 每个包独立发布，支持 Tree-shaking
4. **TypeScript 优先**: 所有公共 API 必须有完整类型定义
5. **测试驱动**: 核心功能覆盖率 ≥ 90%

### 2.2 技术约束

| 约束项     | 要求                                |
| ---------- | ----------------------------------- |
| 包体积     | router ≤ 15KB, store ≤ 12KB (gzip)  |
| 运行时依赖 | 仅允许依赖 L0-L3 层包               |
| 浏览器支持 | Chrome 80+, Firefox 75+, Safari 13+ |
| Node 版本  | CLI 要求 Node ≥ 18                  |

### 2.3 命名规范

```typescript
// 包名: @lytjs/{name}
// 入口: packages/ecosystem/packages/router/src/index.ts
// 类型: packages/ecosystem/packages/router/src/types.ts
// 测试: packages/ecosystem/packages/router/tests/*.test.ts
```

---

## 三、L4 层: 生态基础层

---

### 3.1 @lytjs/router

#### 3.1.1 概述

提供声明式路由管理，支持 Web History 和 Hash History 模式。

#### 3.1.2 核心功能

| 功能           | 优先级 | 说明                                   |
| -------------- | ------ | -------------------------------------- |
| 声明式路由配置 | P0     | 支持嵌套路由、动态路由                 |
| History 模式   | P0     | createWebHistory, createWebHashHistory |
| 路由守卫       | P0     | beforeEach, afterEach, beforeEnter     |
| 路由过渡       | P1     | 与 `<Transition>` 组件集成             |
| 滚动行为       | P1     | scrollBehavior 配置                    |
| 路由元信息     | P1     | meta 字段支持                          |
| 懒加载         | P2     | 动态导入组件                           |

#### 3.1.3 公共 API

```typescript
// ===== 核心函数 =====
export function createRouter(options: RouterOptions): Router;
export function createWebHistory(base?: string): RouterHistory;
export function createWebHashHistory(base?: string): RouterHistory;
export function createMemoryHistory(initial?: string): RouterHistory;

// ===== 组合式函数 =====
export function useRouter(): Router;
export function useRoute(): RouteLocationNormalized;

// ===== 组件 =====
export const RouterView: Component;
export const RouterLink: Component;

// ===== 类型 =====
export interface RouterOptions {
  history: RouterHistory;
  routes: RouteRecordRaw[];
  scrollBehavior?: RouterScrollBehavior;
}

export interface RouteRecordRaw {
  path: string;
  name?: string | symbol;
  component?: Component | LazyComponent;
  children?: RouteRecordRaw[];
  redirect?: string | RouteLocationRaw | RedirectFunction;
  alias?: string | string[];
  meta?: RouteMeta;
  beforeEnter?: NavigationGuard;
}

export interface Router {
  currentRoute: Signal<RouteLocationNormalized>;
  push(to: RouteLocationRaw): Promise<NavigationFailure | void>;
  replace(to: RouteLocationRaw): Promise<NavigationFailure | void>;
  go(delta: number): void;
  back(): void;
  forward(): void;
  beforeEach(guard: NavigationGuard): () => void;
  afterEach(hook: NavigationHook): () => void;
  install(app: App): void;
}
```

#### 3.1.4 实现任务清单

**Task 1: 基础类型定义** (预估 1 天)

- [ ] 创建 `src/types.ts` 定义所有路由类型
- [ ] 创建 `src/location.ts` 实现 URL 解析
- [ ] 创建 `src/matcher.ts` 实现路径匹配器

**Task 2: History 实现** (预估 2 天)

- [ ] 实现 `createWebHistory` (基于 History API)
- [ ] 实现 `createWebHashHistory` (基于 hashchange)
- [ ] 实现 `createMemoryHistory` (用于 SSR/测试)

**Task 3: Router 核心** (预估 3 天)

- [ ] 实现 `createRouter` 工厂函数
- [ ] 实现路由匹配逻辑
- [ ] 实现导航守卫队列
- [ ] 实现组件生命周期集成

**Task 4: 组件实现** (预估 2 天)

- [ ] 实现 `RouterView` 组件
- [ ] 实现 `RouterLink` 组件
- [ ] 实现 `keep-alive` 集成

**Task 5: 组合式函数** (预估 1 天)

- [ ] 实现 `useRouter`
- [ ] 实现 `useRoute`
- [ ] 实现 `useLink`

**Task 6: 测试与文档** (预估 2 天)

- [ ] 单元测试 (覆盖率 ≥ 90%)
- [ ] E2E 测试
- [ ] API 文档

#### 3.1.5 依赖关系

```yaml
# package.yaml
dependencies:
  - '@lytjs/common-is'
  - '@lytjs/common-env'
  - '@lytjs/reactivity'
  - '@lytjs/component'
  - '@lytjs/vdom'

devDependencies:
  - '@lytjs/core'
```

---

### 3.2 @lytjs/store

#### 3.2.1 概述

基于 Signal 的轻量级状态管理，支持 Option Store 和 Setup Store 两种风格。

#### 3.2.2 核心功能

| 功能          | 优先级 | 说明                      |
| ------------- | ------ | ------------------------- |
| Option Store  | P0     | 类似 Pinia 的 options API |
| Setup Store   | P0     | 组合式函数风格            |
| 模块化        | P0     | 多 store 实例管理         |
| 严格模式      | P1     | 开发时检测状态修改        |
| 插件系统      | P1     | 持久化、日志等扩展        |
| DevTools 集成 | P1     | 时间旅行、状态检查        |
| SSR 支持      | P2     | hydration 处理            |

#### 3.2.3 公共 API

```typescript
// ===== 核心函数 =====
export function defineStore<Id extends string, S, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
): StoreDefinition<Id, S, G, A>;

export function defineStore<Id extends string, SS>(id: Id, setup: () => SS): () => SS;

export function createPinia(): Pinia;

// ===== 组合式函数 =====
export function useStore<Id extends string>(storeDefinition: StoreDefinition<Id>): Store<Id>;

export function storeToRefs<SS>(store: SS): StoreToRefs<SS>;

// ===== 类型 =====
export interface DefineStoreOptions<Id, S, G, A> {
  state?: () => S;
  getters?: G & ThisType<S & StoreGetters<G> & StoreActions<A>>;
  actions?: A & ThisType<S & StoreGetters<G> & StoreActions<A>>;
}

export interface Pinia {
  install(app: App): void;
  state: Signal<Record<string, StateTree>>;
  use(plugin: PiniaPlugin): void;
}

export type StateTree = Record<string | number | symbol, unknown>;

export interface Store<Id = string, S = StateTree, G = {}, A = {}> {
  $id: Id;
  $state: S;
  $patch(partialState: DeepPartial<S>): void;
  $patch(stateMutator: (state: S) => void): void;
  $reset(): void;
  $subscribe(callback: SubscriptionCallback<S>): () => void;
  $onAction(callback: ActionCallback): () => void;
  $dispose(): void;
}
```

#### 3.2.4 实现任务清单

**Task 1: 核心类型定义** (预估 1 天)

- [ ] 创建 `src/types.ts` 定义 Store 类型体系
- [ ] 创建 `src/mapHelpers.ts` 实现辅助函数类型

**Task 2: Store 工厂** (预估 2 天)

- [ ] 实现 `defineStore` (options 版本)
- [ ] 实现 `defineStore` (setup 版本)
- [ ] 实现 store 实例缓存

**Task 3: Pinia 核心** (预估 2 天)

- [ ] 实现 `createPinia`
- [ ] 实现全局状态管理
- [ ] 实现插件系统

**Task 4: 响应式集成** (预估 2 天)

- [ ] 基于 `@lytjs/reactivity` 实现 state
- [ ] 实现 getters (computed)
- [ ] 实现 actions 包装
- [ ] 实现 `storeToRefs`

**Task 5: 开发工具** (预估 1 天)

- [ ] 实现 `$subscribe` API
- [ ] 实现 `$onAction` API
- [ ] 准备 DevTools 集成接口

**Task 6: 测试与文档** (预估 2 天)

- [ ] 单元测试
- [ ] SSR 场景测试
- [ ] API 文档

#### 3.2.5 依赖关系

```yaml
dependencies:
  - '@lytjs/common-is'
  - '@lytjs/common-object'
  - '@lytjs/reactivity'
  - '@lytjs/component'

devDependencies:
  - '@lytjs/core'
```

---

### 3.3 @lytjs/compat

#### 3.3.1 概述

Vue 2/3 兼容性层，帮助现有 Vue 项目迁移到 LytJS。

#### 3.3.2 核心功能

| 功能               | 优先级 | 说明                               |
| ------------------ | ------ | ---------------------------------- |
| 选项式 API         | P2     | data, computed, methods, lifecycle |
| Vue 2 生命周期映射 | P2     | beforeDestroy → beforeUnmount      |
| Vuex 兼容层        | P2     | mapState, mapGetters, mapActions   |
| Vue Router 兼容    | P2     | 路由守卫命名兼容                   |

#### 3.3.3 实现策略

**暂不实现**，待 Phase 2 根据社区反馈决定。

---

## 四、L5 层: 工具层

---

### 4.1 @lytjs/cli

#### 4.1.1 概述

项目脚手架和开发工具，提供 `create-lytjs` 命令快速创建项目。

#### 4.1.2 核心功能

| 功能       | 优先级 | 说明                      |
| ---------- | ------ | ------------------------- |
| 项目脚手架 | P0     | `npm create lytjs@latest` |
| 模板系统   | P0     | 官方模板 + 社区模板       |
| 开发服务器 | P1     | 基于 Vite 的 dev server   |
| 代码生成   | P2     | 组件、页面、store 生成器  |
| 更新检查   | P2     | 版本更新提醒              |

#### 4.1.3 命令设计

```bash
# 创建项目
npm create lytjs@latest my-app
cd my-app

# 开发
npm run dev

# 构建
npm run build

# 预览
npm run preview

# CLI 命令 (全局安装后)
lytjs add component Button
lytjs add page /about
lytjs add store user
```

#### 4.1.4 实现任务清单

**Task 1: CLI 框架** (预估 2 天)

- [ ] 选择 CLI 框架 (commander.js / citty)
- [ ] 实现命令解析
- [ ] 实现帮助信息

**Task 2: 项目脚手架** (预估 3 天)

- [ ] 实现 `create-lytjs` 命令
- [ ] 设计官方模板结构
- [ ] 实现模板下载 (git / npm)
- [ ] 实现模板渲染 (ejs / handlebars)

**Task 3: 模板设计** (预估 3 天)

- [ ] 基础模板 (vanilla)
- [ ] TypeScript 模板
- [ ] SSR 模板
- [ ] 完整功能模板 (router + store)

**Task 4: 代码生成器** (预估 2 天)

- [ ] 实现 `lytjs add component`
- [ ] 实现 `lytjs add page`
- [ ] 实现 `lytjs add store`

**Task 5: 测试与发布** (预估 2 天)

- [ ] CLI 命令测试
- [ ] 模板集成测试
- [ ] npm 发布配置

#### 4.1.5 目录结构

```
packages/tools/packages/cli/
├── src/
│   ├── index.ts           # 入口
│   ├── commands/
│   │   ├── create.ts      # create 命令
│   │   ├── add.ts         # add 命令
│   │   └── dev.ts         # dev 命令
│   ├── utils/
│   │   ├── download.ts    # 模板下载
│   │   ├── render.ts      # 模板渲染
│   │   └── config.ts      # 配置管理
│   └── templates/         # 内置模板
├── templates/             # 官方模板 (git submodules)
│   ├── template-vanilla/
│   ├── template-typescript/
│   └── template-full/
└── package.json
```

---

### 4.2 @lytjs/plugin-vite

#### 4.2.1 概述

Vite 官方插件，提供 SFC 编译、HMR、优化等功能。

#### 4.2.2 核心功能

| 功能       | 优先级 | 说明                    |
| ---------- | ------ | ----------------------- |
| SFC 编译   | P0     | 单文件组件编译          |
| 热更新 HMR | P0     | 组件级热替换            |
| 模板优化   | P1     | 编译时优化 (PatchFlags) |
| TypeScript | P1     | TS 支持                 |
| 资源处理   | P2     | 图片、样式等            |

#### 4.2.3 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [
    lytjs({
      // 选项
      include: [/\.lyt$/], // 文件匹配
      exclude: [/node_modules/], // 排除
      ssr: false, // SSR 模式
      signalMode: false, // Signal 模式
    }),
  ],
});
```

#### 4.2.4 实现任务清单

**Task 1: Vite 插件基础** (预估 2 天)

- [ ] 学习 Vite 插件 API
- [ ] 实现 `transform` hook
- [ ] 实现 `handleHotUpdate` hook

**Task 2: SFC 编译集成** (预估 2 天)

- [ ] 调用 `@lytjs/compiler` 编译 SFC
- [ ] 处理 `<template>`, `<script>`, `<style>`
- [ ] 处理 `<route>` 自定义块

**Task 3: HMR 实现** (预估 2 天)

- [ ] 实现组件热替换
- [ ] 实现状态保持
- [ ] 处理边界情况

**Task 4: 优化功能** (预估 2 天)

- [ ] 实现编译时优化
- [ ] 实现 Tree-shaking 优化
- [ ] 实现代码分割

---

### 4.3 @lytjs/devtools

#### 4.3.1 概述

浏览器开发者工具扩展，用于调试 LytJS 应用。

#### 4.3.2 核心功能

| 功能     | 优先级 | 说明                         |
| -------- | ------ | ---------------------------- |
| 组件树   | P1     | 查看组件层级                 |
| 状态检查 | P1     | 查看 ref/reactive/store 状态 |
| 时间旅行 | P2     | 状态快照与回放               |
| 性能分析 | P2     | 渲染性能监控                 |
| 路由调试 | P2     | 路由历史与状态               |

#### 4.3.3 架构设计

```
┌─────────────────────────────────────────┐
│         Chrome DevTools Panel           │
├─────────────────────────────────────────┤
│  @lytjs/devtools (浏览器扩展)            │
│  - 组件树渲染                            │
│  - 状态编辑器                            │
│  - 时间旅行控制                          │
└─────────────────────────────────────────┘
                    ↑
              Chrome Extension API
                    ↓
┌─────────────────────────────────────────┐
│  Backend (注入到页面)                    │
│  - 组件实例遍历                            │
│  - Signal 状态读取                         │
│  - 事件记录                               │
└─────────────────────────────────────────┘
                    ↑
              window.__LYTJS_DEVTOOLS__
                    ↓
┌─────────────────────────────────────────┐
│  LytJS App                              │
│  - 组件系统                              │
│  - 响应式系统                            │
│  - Store                                 │
└─────────────────────────────────────────┘
```

#### 4.3.4 实现任务清单

**Task 1: Backend 实现** (预估 3 天)

- [ ] 实现组件树遍历
- [ ] 实现状态读取接口
- [ ] 实现事件记录器

**Task 2: DevTools Panel** (预估 4 天)

- [ ] 创建 Chrome 扩展结构
- [ ] 实现组件树 UI
- [ ] 实现状态编辑器
- [ ] 实现时间旅行

**Task 3: 集成** (预估 2 天)

- [ ] 与 `@lytjs/store` 集成
- [ ] 与 `@lytjs/router` 集成
- [ ] 发布到 Chrome Web Store

---

## 五、开发里程碑

### 5.1 时间线 (预估 10-12 周)

```
Week 1-2: 基础设施
  ├── 创建 packages/ecosystem/ 目录结构
  ├── 创建 packages/tools/ 目录结构
  ├── 创建 packages/plugins/ 目录结构
  └── 配置 pnpm-workspace.yaml

Week 3-5: @lytjs/router
  ├── Week 3: 类型定义 + History 实现
  ├── Week 4: Router 核心 + 匹配器
  └── Week 5: 组件 + 测试

Week 6-8: @lytjs/store
  ├── Week 6: 类型定义 + Store 工厂
  ├── Week 7: Pinia 核心 + 响应式集成
  └── Week 8: 插件 + 测试

Week 9-10: @lytjs/plugin-vite
  ├── Week 9: Vite 插件基础 + SFC 编译
  └── Week 10: HMR + 优化

Week 11-12: @lytjs/cli
  ├── Week 11: CLI 框架 + 脚手架
  └── Week 12: 模板 + 发布

(DevTools 延后到 Phase 1.5 或 Phase 2)
```

### 5.2 依赖关系图

```
@lytjs/plugin-vite
       ↓
@lytjs/cli ←──────┐
       ↓          │
@lytjs/router ────┤
       ↓          │
@lytjs/store ─────┘
       ↓
@lytjs/core
       ↓
   L2/L1/L0
```

### 5.3 发布计划

| 阶段        | 内容                | 版本   |
| ----------- | ------------------- | ------ |
| Milestone 1 | router + store 发布 | v6.1.0 |
| Milestone 2 | plugin-vite 发布    | v6.2.0 |
| Milestone 3 | cli 发布            | v6.3.0 |
| Milestone 4 | devtools 发布       | v6.4.0 |

---

## 六、附录: 类型定义参考

### 6.1 Router 完整类型

```typescript
// types.ts
export type RouteRecordName = string | symbol;

export interface RouteLocationNormalized {
  name: RouteRecordName | null;
  path: string;
  fullPath: string;
  query: LocationQuery;
  hash: string;
  params: RouteParams;
  matched: RouteRecordNormalized[];
  meta: RouteMeta;
  redirectedFrom?: RouteLocationNormalized;
}

export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => NavigationGuardReturn;

export type RouteParams = Record<string, string | string[]>;
export type LocationQuery = Record<string, string | null | (string | null)[]>;
export type RouteMeta = Record<string | number | symbol, unknown>;
```

### 6.2 Store 完整类型

```typescript
// types.ts
export type _Method = (...args: unknown[]) => unknown;

export type _StoreWithGetters<G> = {
  readonly [k in keyof G]: G[k] extends (...args: unknown[]) => infer R ? R : never;
};

export type _StoreWithActions<A> = {
  [k in keyof A]: A[k] extends _Method ? A[k] : never;
};

export type StoreDefinition<
  Id extends string = string,
  S extends StateTree = {},
  G = {},
  A = {},
> = (pinia?: Pinia | null) => Store<Id, S, G, A>;

export type StoreToRefs<SS> = {
  [K in keyof SS]: SS[K] extends Signal<infer T> ? Ref<T> : SS[K];
};
```

---

## 文档信息

- **创建日期**: 2026-05-08
- **版本**: v1.0
- **作者**: LytJS Team
- **状态**: Draft

---

_本文档基于 LytJS v6.0.0 架构设计，具体实现细节可能随开发进展调整。_
