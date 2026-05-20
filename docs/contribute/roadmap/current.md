# LytJS v6.4.0+ 开发路线图

> **本文档**：聚焦未完成开发任务和下一步行动项，已完成的历史记录请查看 [CHANGELOG.md](./CHANGELOG.md)  
> **当前版本**：v6.4.0  
> **重要更新**：
> - ✅ LytX（官方 Metaframework）已独立成独立项目
> - 🟡 UI 组件库准备迁出
> - 严格遵循项目 8 层架构设计初衷与运行时零第三方依赖原则

---

## 📊 任务完成概览

### ✅ 已完成（v6.1 - v6.4）

| 版本 | 目标 | 状态 |
|------|------|------|
| v6.1 | 性能与稳定性增强 | ✅ 全部完成 |
| v6.2 | 生态与开发体验 | ✅ 全部完成 |
| v6.3 | 生态繁荣 | ✅ 全部完成 |
| v6.4 | 性能极致 | ✅ 全部完成 |

### ⏸️ 待开发/调整中（v6.5+）

| 版本 | 目标 | 状态 |
|------|------|------|
| v6.5 | 核心聚焦与架构优化 | ✅ 已完成 |
| v6.6 | 生态系统模块化重构 | ⏸️ 待开发 |
| v7.0+ | 未来探索 | ⏸️ 探索中 |

### 🟡 调整项目

| 项目 | 状态 | 说明 |
|------|------|------|
| LytX | ✅ 已独立 | Metaframework 已独立成独立项目 |
| UI 组件库 | 🟡 准备迁出 | 计划从 LytJS 核心包中迁出 |

---

## 目录

- [一、项目概述](#一项目概述)
- [二、现状与差距分析](#二现状与差距分析)
- [三、核心发展战略](#三核心发展战略)
- [四、基础层完整架构](#四基础层完整架构)
- [五、开发阶段规划](#五开发阶段规划)
- [六、每个包的详细开发计划](#六每个包的详细开发计划)
- [七、资源分配与优先级](#七资源分配与优先级)
- [八、成功指标](#八成功指标)
- [九、暂缓任务](#九暂缓任务)
- [十、核心约束](#十核心约束)
- [十一、开发经验教训](#十一开发经验教训)

---

## 一、项目概述

### 1.1 LytJS 定位调整

**下一代轻量级前端框架（核心层聚焦）**

- **核心**：极致性能 + 零依赖 + 双模式
- **目标**：成为轻量级/高性能场景的首选框架
- **差异化**：零依赖 + Vapor 模式 + 优秀的核心层设计
- **职责调整**：
  - LytJS：提供核心能力（响应式、渲染、路由、状态管理、SSR）
  - LytX：独立项目，提供 Metaframework 能力
  - UI 组件库：计划独立成独立包

### 1.2 项目结构调整

```
LytJS 生态系统
├── LytJS (核心框架)
│   ├── core
│   ├── reactivity
│   ├── vdom
│   ├── router
│   ├── store
│   ├── ssr
│   ├── common（工具层）
│   ├── shared-types（类型层）
│   └── 官方插件
│
├── LytX（独立项目）
│   └── Metaframework 能力
│
└── LytJS-UI（计划独立）
    └── UI 组件库
```

---

## 二、现状与差距分析

### 2.1 当前优势确认

✅ **已建立的核心优势**

1. 运行时零第三方依赖 - 独特卖点
2. 8 层分层架构 - 清晰可维护
3. 双渲染模式（Vapor + VDOM）- 灵活选择
4. 完整的插件生态 - 11 个官方插件
5. 良好的测试覆盖 - reactivity 90%+，vdom 85%+
6. 完善的 CI/CD - 自动化测试 + 基准测试
7. SSR/SSG 支持 - 含流式渲染基础
8. DevTools 增强 - 信号追踪、时间旅行、性能分析
9. 基准测试框架运行成功 - 已收集基线性能数据

### 2.2 与竞品的差距分析

| 维度 | 主要差距 | 影响 |
|------|----------|------|
| **生态成熟度** | 第三方插件/组件少 | ⭐⭐⭐ 高 |
| **企业采用** | 缺乏大型案例验证 | ⭐⭐⭐ 高 |
| **学习资源** | 教程、案例相对少 | ⭐⭐ 中 |
| **性能基准** | 缺乏 js-framework-benchmark 公开数据 | ⭐⭐ 中 |
| **SSR完善度** | 服务端组件、流式 SSR 稳定性待提升 | ⭐⭐⭐ 高 |

### 2.3 SWOT 分析

| 优势（Strengths） | 劣势（Weaknesses） |
|------------------|------------------|
| 零依赖、体积小 | 生态系统尚小 |
| 双渲染模式 | 企业案例少 |
| 架构清晰 | 学习资源有限 |
| 性能优秀 | |

| 机会（Opportunities） | 威胁（Threats） |
|---------------------|----------------|
| 轻量级框架需求增长 | Vue/React 持续优化 |
| 微前端架构兴起 | SolidJS/Svelte 竞争 |
| 嵌入式/IoT 场景 | Preact 已有先发 |

---

## 三、核心发展战略

### 3.1 总体定位调整

**下一代轻量级前端框架（核心聚焦）**

- **核心**：极致性能 + 零依赖 + 双模式
- **目标**：成为轻量级/高性能场景的首选框架
- **差异化**：零依赖 + Vapor 模式 + 稳定的核心层

### 3.2 三大战略支柱

#### 支柱 1：强化核心优势 ⭐⭐⭐

- 持续优化性能（Vapor 模式优先）
- 保持零依赖原则
- 完善 SSR/服务端组件
- **核心聚焦**：只保留核心功能，UI 和 Metaframework 独立

#### 支柱 2：完善生态系统 ⭐⭐⭐

- 增强官方插件
- 建立第三方生态
- 支持 UI 组件库独立发展

#### 支柱 3：提升开发体验 ⭐⭐

- 完善 DevTools
- 增强教程文档
- 优化开发工具

---

## 四、基础层完整架构

### 4.1 完整包架构（核心聚焦版）

```
@lytjs/
├── 核心层
│   ├── core (已有)
│   ├── reactivity (已有)
│   ├── vdom (已有)
│   ├── component (已有)
│   ├── renderer (已有)
│   ├── adapter-web (已有)
│   ├── dom (已有)
│   ├── web (已有)
│   ├── compiler (已有)
│   └── [UI 组件库计划迁出]
│
├── 工具层 (@lytjs/common-monorepo)
│   ├── common-is (已有)
│   ├── common-object (已有)
│   ├── common-constants (已有)
│   ├── common-env (已有)
│   ├── common-string (已有)
│   ├── common-path (已有)
│   ├── common-events (已有)
│   ├── common-cache (已有)
│   ├── common-timing (已有)
│   ├── common-algorithm (已有)
│   ├── common-vnode (已有)
│   ├── common-error (已有)
│   ├── common-scheduler (已有)
│   ├── common-dom (已有)
│   ├── common-query (已有)
│   ├── common-dom-helpers (已有)
│   ├── common-a11y (已有)
│   ├── common-keyboard (已有)
│   ├── common-storage (已有)
│   ├── common-validate (已有)
│   ├── common-http (已有)
│   ├── common-raf (已有)
│   ├── common-render-queue (已有)
│   ├── common-event-normalizer (已有)
│   ├── common-node-cache (已有)
│   ├── common-async-scheduler (已有)
│   ├── common-transition-engine (已有)
│   ├── common-assertions (已有)
│   ├── common-memory (已有)
│   ├── common-warn (已有)
│   └── common-performance (已有)
│
├── 生态系统层（v6.6 模块化重构）
│   ├── web-framework 🆕
│   │   ├── packages/
│   │   │   ├── router (已有)
│   │   │   ├── router-fs (已有)
│   │   │   ├── api (已有)
│   │   │   ├── middleware 🆕
│   │   │   ├── middleware-cors 🆕
│   │   │   ├── middleware-auth 🆕
│   │   │   ├── middleware-rate-limit 🆕
│   │   │   ├── http-server 🆕
│   │   │   └── metadata 🆕
│   │   └── package.json (管理用)
│   │
│   ├── ssr-kit 🆕
│   │   ├── packages/
│   │   │   ├── ssr (已有)
│   │   │   ├── ssg 🆕 (独立包)
│   │   │   ├── cache-isr 🆕 (独立包)
│   │   │   ├── html-renderer 🆕 (独立包)
│   │   │   └── hmr (已有)
│   │   └── package.json (管理用)
│   │
│   ├── store (已有)
│   ├── devtools (已有)
│   ├── bundler (已有)
│   ├── runtime-edge (已有)
│   ├── compat (已有)
│   └── platform-adapter (已有)
│
├── 插件层
│   ├── plugin-form (已有)
│   ├── plugin-chart (已有)
│   ├── plugin-data-fetch (已有)
│   ├── plugin-data (已有)
│   ├── plugin-validation (已有)
│   ├── plugin-animation (已有)
│   ├── plugin-auth (已有)
│   ├── plugin-i18n (已有)
│   ├── plugin-storage (已有)
│   ├── plugin-logger (已有)
│   ├── plugin-theme (已有)
│   └── plugin-perf (已有)
│
└── 工具层
    ├── cli (已有)
    ├── test-utils (已有)
    └── devtools-extension (已有)
```

### 4.2 包统计

| 类型 | 数量 | 说明 |
|------|------|------|
| **已有核心包** | 4 | core, router, store, ssr（UI 计划迁出） |
| **已有工具包** | 30+ | @lytjs/common 及其所有子包 |
| **已有插件** | 5 | plugin-form, plugin-chart, plugin-data-fetch, plugin-animation |
| **新包** | 8 | router-fs, ssg, isr, ssr-enhanced, api, bundler, hmr, runtime-edge, testing |
| **新插件** | 3 | plugin-data, plugin-validation, plugin-perf |
| **完善包** | 5 | plugin-auth, plugin-i18n, plugin-storage, plugin-logger, plugin-theme |

**总计**：需要新建/完善 16 个包

### 4.3 @lytjs/common 架构说明

现有 `@lytjs/common` 采用 monorepo 架构，包含以下特性：

- **聚合包模式**：`@lytjs/common` 作为统一入口，重新导出所有子包
- **功能细分**：每个功能模块独立成包，命名为 `@lytjs/common-*`
- **零依赖原则**：所有工具包都是自包含的原生实现

**现有工具包概览**：

| 包名 | 功能 |
|------|------|
| `@lytjs/common-is` | 类型判断工具 |
| `@lytjs/common-object` | 对象操作工具 |
| `@lytjs/common-string` | 字符串处理工具 |
| `@lytjs/common-validate` | 验证规则工具 |
| `@lytjs/common-http` | HTTP 客户端工具 |
| `@lytjs/common-cache` | 缓存相关工具 |
| `@lytjs/common-storage` | 存储相关工具 |
| ... | 更多 20+ 个工具包 |

**开发建议**：
- 新功能优先考虑是否可归入现有工具包
- 如需新增通用工具，应在 `@lytjs/common-monorepo` 下按细分原则添加
- 新包开发应充分利用现有工具，避免重复造轮子

### 4.4 common-utils 与 shared-types 架构评估

#### 关于 common-utils 的改造建议

**现状分析**：
- 原计划中的 `common-utils` 命名与现有架构不符
- 现有 `@lytjs/common` 已经采用了功能细分的 monorepo 模式
- 已有 30+ 个细分功能包覆盖各类工具需求

**改造方案**：

**方案 1：取消独立 common-utils 包（强烈推荐）✨**

**重要发现**：现有架构已经有非常优雅的解决方案！

**现有架构分析**：
- [`@lytjs/core`](file:///f:/trae/lytjs/packages/core) 包中已有 [`common-integration.ts`](file:///f:/trae/lytjs/packages/core/src/common-integration.ts) 模块
- 该模块采用**接口 + 注册模式**，完美避免循环依赖

**架构设计亮点**：

```
├── @lytjs/core/
│   └── common-integration.ts  # 集成点（仅类型，无运行时依赖）
│       ├── HttpClientLike 接口
│       ├── QueryUtilsLike 接口  
│       ├── SecurityUtilsLike 接口
│       ├── CacheUtilsLike 接口
│       ├── registerIntegrations()  # 注册点
│       └── safeEscapeHtml(), safeParseQueryString()  # 回退实现
│
└── @lytjs/common-*/  # 具体工具实现（无 core 依赖）
    ├── common-http/
    ├── common-query/
    ├── common-security/
    └── common-cache/
```

**依赖方向**：
- ✅ `@lytjs/core` 依赖 `@lytjs/common-*`（单向依赖，无循环）
- ✅ `@lytjs/common-*` 不依赖 core（纯工具）

**改造建议**：
1. **删除"common-utils"计划**
2. **工具层完全保持在 `@lytjs/common` monorepo 中**
3. **core 与 common 的交互通过集成点模式**：

```typescript
// 使用方（LytX 或其他）
import { registerIntegrations } from '@lytjs/core';
import * as http from '@lytjs/common-http';
import * as query from '@lytjs/common-query';

// 注册集成
registerIntegrations({
  http,
  query,
  security,
  cache
});
```

**方案 2：如有全新通用工具集合，新增细分包**
- 如果确实有一类新的通用工具，按细分原则在 `packages/common/packages/` 下新建对应子包
- 命名规范：`@lytjs/common-xxx`（xxx 为功能类别）

---

#### 关于 shared-types 的架构评估

**现状分析**：
- 项目中**已经存在** [`@lytjs/shared-types`](file:///f:/trae/lytjs/packages/shared-types) 包
- 这是一个**经过精心设计**的架构方案！
- 包的作用：提取多个子包之间共享的类型定义，避免循环依赖

**现有 shared-types 的组成**：

| 类型类别 | 包含内容 | 用途说明 |
|----------|----------|----------|
| **类型工具** | `Prettify`, `PartialExcept`, `RequiredExcept`, `Mutable`, `DeepMutable`, `Nullable`, `Optional`, `Maybe`, `MaybeArray`, `PromiseOrValue` 等 70+ 个类型工具 | 全局通用的类型帮助工具，避免重复定义 |
| **RefLike** | 最小化的 Ref 接口 | 用于类型保护，避免从 `@lytjs/reactivity` 导入产生循环依赖 |
| **AppContext** | `BaseAppConfig`, `BaseAppContext`, `Plugin` | 应用上下文基础类型，被 core、component、renderer 等包共享 |
| **VNode** | `Props` | VNode 属性基础类型 |
| **Debug** | `ReactiveEffectRef`, `DebuggerEvent` | 调试系统共享类型 |
| **Renderer** | `Renderer`, `Directive`, `DirectiveBinding`, `DirectiveArguments` | 渲染器和指令共享接口 |
| **Component** | `SlotFunction`, `InternalSlots`, `ComponentPublicInstance`, `ComponentInternalInstance`, `ComponentOptionsBase` | 组件系统核心类型，被多个包共享使用 |

**评估结论**：**保留现有架构！**

**保留 shared-types 包的理由**：

1. **✅ 解决循环依赖问题**
   - `@lytjs/reactivity`、`@lytjs/vdom`、`@lytjs/component`、`@lytjs/renderer` 等包之间存在相互依赖
   - 通过 shared-types 作为"中间人"，避免循环导入

2. **✅ 统一维护成本**
   - 共享类型定义在一个地方，修改时只需要改一处
   - 避免各包之间类型不一致导致的类型错误

3. **✅ 与现有 common 包分工明确**
   - `@lytjs/common`：运行时工具（有实际代码）
   - `@lytjs/shared-types`：纯类型定义（仅 `export type`，无运行时代码）

4. **✅ 已投入实际使用**
   - 从 grep 结果看，多个核心包已经依赖 `@lytjs/shared-types`
   - 例如：[`@lytjs/component`](file:///f:/trae/lytjs/packages/component/src/types.ts#L5-L11) 正在使用这些共享类型

**架构最佳实践建议**：

```
├── @lytjs/common/            # 运行时工具包（有代码）
│   ├── common-is/
│   ├── common-object/
│   ├── common-string/
│   └── ... (更多 30+ 个包)
│
└── @lytjs/shared-types/      # 纯类型包（仅类型，无代码）
    ├── type-utils/           # 通用类型工具
    ├── ref.ts
    ├── vnode.ts
    ├── component.ts
    ├── renderer.ts
    └── ... (其他共享类型)
```

**类型组织原则**：

- **纯类型工具** → `@lytjs/shared-types/type-utils`
- **跨包共享的核心接口** → `@lytjs/shared-types`
- **单包专用类型** → 放在该包的 `src/types.ts` 中
- **工具相关类型** → 随功能放在 `@lytjs/common-*` 包中

---

## 五、开发阶段规划

### 5.1 历史版本回顾（已完成）

#### v6.1：性能与稳定性增强 ✅ 已完成

**核心目标**：js-framework-benchmark 集成、Vapor 模式增强、UI 组件库优化

**关键任务**：
- 性能基准测试集成（✅ 已完成）
- Vapor 模式增强（✅ 已完成）
- UI 组件库增强（✅ 已完成）
- DevTools 持续增强（✅ 已完成）
- 教程体系完善（✅ 已完成）

#### v6.2：生态与开发体验 ✅ 已完成

**核心目标**：SSR 增强与生态完善

**关键任务**：
- 流式 SSR 稳定化（✅ 已完成）
- 服务端组件完善（✅ 已完成）
- 官方插件增强（✅ 已完成）
- CLI 工具增强（✅ 已完成）
- TypeScript 类型系统增强（✅ 已完成）
- 文档站点优化（✅ 已完成）

#### v6.3：生态繁荣 ✅ 已完成

**核心目标**：第三方生态建设、企业级特性增强

**关键任务**：
- 错误边界增强（✅ 已完成）
- 第三方生态建设（✅ 已完成）
- 社区治理文档（✅ 已完成）
- 贡献者指南完善（✅ 已完成）
- CI/CD 增强（✅ 已完成）

#### v6.4：性能极致 ✅ 已完成

**核心目标**：编译时优化、内存优化、测试体系完善

**关键任务**：
- 编译时优化（✅ 已完成）
- 内存优化（✅ 已完成）
- 测试体系完善（✅ 已完成）

---

### 5.2 v6.5：核心聚焦与架构优化（⏸️ 待开发）

目标：完成核心层能力建设，为独立项目做好准备

#### 阶段一：核心增强（优先级：🔴 高，预计 3-4 周）

目标：完善 LytJS 基础层的核心能力

| 任务 | 包名 | 类型 | 预计时间 | 依赖 | 说明 |
|------|------|------|----------|------|------|
| 1.1 | @lytjs/plugin-validation | 新增 | 5 天 | @lytjs/core, @lytjs/plugin-form | 验证插件，表单验证是高频需求 |
| 1.2 | @lytjs/plugin-data | 新增 | 6 天 | @lytjs/core, @lytjs/store | 增强版数据获取插件，替代 plugin-data-fetch |
| 1.3 | @lytjs/ssr-enhanced | 新增 | 7 天 | @lytjs/core, @lytjs/ssr | 增强版 SSR，流式 SSR、组件级缓存等 |
| 1.4 | @lytjs/router-fs | 新增 | 5 天 | @lytjs/core, @lytjs/router | 从 LytX 提取，文件系统路由引擎 |
| 1.5 | @lytjs/api | 新增 | 5 天 | @lytjs/core | 从 LytX 提取，API 路由引擎 |

**阶段一交付物**：
- 5 个新包
- 完善的类型定义
- 基础测试用例
- 使用文档

---

#### 阶段二：静态与构建（优先级：🔴 高，预计 2-3 周）

目标：提供静态生成和构建工具的基础能力

| 任务 | 包名 | 类型 | 预计时间 | 依赖 | 说明 |
|------|------|------|----------|------|------|
| 2.1 | @lytjs/ssg | 新增 | 5 天 | @lytjs/core, @lytjs/ssr | 从 LytX 提取，静态站点生成 |
| 2.2 | @lytjs/isr | 新增 | 4 天 | @lytjs/core, @lytjs/ssg | 从 LytX 提取，增量静态再生成 |
| 2.3 | @lytjs/bundler | 新增 | 5 天 | @lytjs/core | 从 LytX 提取，Vite/Webpack 基础集成 |
| 2.4 | @lytjs/hmr | 新增 | 4 天 | @lytjs/core, @lytjs/bundler | 从 LytX 提取，热模块替换 |

**阶段二交付物**：
- 4 个新包
- 完善的类型定义
- 基础测试用例
- 使用文档

---

#### 阶段三：生态完善（优先级：🟡 中，预计 4-5 周）

目标：完善 LytJS 基础层的生态包

| 任务 | 包名 | 类型 | 预计时间 | 依赖 | 说明 |
|------|------|------|----------|------|------|
| 3.1 | @lytjs/plugin-i18n | 完善 | 4 天 | @lytjs/core, @lytjs/router | 完善国际化插件 |
| 3.2 | @lytjs/plugin-auth | 完善 | 5 天 | @lytjs/core, @lytjs/store, @lytjs/router | 完善认证插件 |
| 3.3 | @lytjs/plugin-storage | 完善 | 4 天 | @lytjs/core, @lytjs/store | 完善存储插件 |
| 3.4 | @lytjs/runtime-edge | 新增 | 5 天 | @lytjs/core | Edge 运行时适配 |
| 3.5 | @lytjs/testing | 新增 | 5 天 | @lytjs/core, @lytjs/router, @lytjs/store | 测试工具库 |

**阶段三交付物**：
- 2 个新包，3 个完善包
- 完善的类型定义
- 完整测试用例
- 使用文档

---

#### 阶段四：锦上添花（优先级：🟢 低，预计 2-3 周）

目标：提供可选的增强功能

| 任务 | 包名 | 类型 | 预计时间 | 依赖 | 说明 |
|------|------|------|----------|------|------|
| 4.1 | @lytjs/plugin-logger | 完善 | 3 天 | @lytjs/core | 完善日志插件 |
| 4.2 | @lytjs/plugin-theme | 完善 | 3 天 | @lytjs/core, @lytjs/store | 完善主题插件 |
| 4.3 | @lytjs/plugin-perf | 新增 | 4 天 | @lytjs/core | 性能监控插件 |

**阶段四交付物**：
- 1 个新包，2 个完善包
- 完善的类型定义
- 完整测试用例
- 使用文档

---

### 5.3 v7.0+：未来探索 ⏸️ 探索中

**革命性升级**：
- 更智能的编译器
- AI 辅助开发
- 多语言支持（Rust/WebAssembly）
- 全新的开发体验

---

## 六、每个包的详细开发计划

### 6.1 @lytjs/plugin-validation - 验证插件（阶段一）

**目标**：提供类型安全的表单验证能力

**功能需求**：
- ✅ 声明式验证规则
- ✅ 类型安全的验证
- ✅ 同步/异步验证
- ✅ 自定义验证器
- ✅ 错误消息国际化支持
- ✅ 与 @lytjs/plugin-form 深度集成

**验收标准**：
- 覆盖常见验证场景（必填、邮箱、手机号、长度、范围等）
- 支持自定义验证规则
- 完善的 TypeScript 类型定义
- 单元测试覆盖率 >= 85%

**文件结构**：
```
@lytjs/plugin-validation/
├── src/
│   ├── index.ts
│   ├── rules/
│   │   ├── required.ts
│   │   ├── email.ts
│   │   ├── phone.ts
│   │   ├── length.ts
│   │   └── ...
│   ├── types.ts
│   └── utils.ts
├── __tests__/
│   └── validation.test.ts
├── package.json
└── README.md
```

---

### 6.2 @lytjs/plugin-data - 增强版数据获取插件（阶段一）

**目标**：提供强大的数据获取和状态管理能力

**功能需求**：
- ✅ 请求/响应拦截器
- ✅ 数据缓存策略（TTL、LRU 等）
- ✅ 乐观更新
- ✅ 数据预取
- ✅ 请求去重
- ✅ 错误重试
- ✅ 离线支持
- ✅ 与 @lytjs/store 深度集成

**验收标准**：
- 支持常见的 HTTP 方法
- 提供灵活的缓存策略
- 与 store 无缝集成
- 单元测试覆盖率 >= 80%

**文件结构**：
```
@lytjs/plugin-data/
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── cache/
│   │   ├── index.ts
│   │   ├── ttl.ts
│   │   └── lru.ts
│   ├── interceptors/
│   │   ├── request.ts
│   │   └── response.ts
│   ├── types.ts
│   └── utils.ts
├── __tests__/
│   └── data.test.ts
├── package.json
└── README.md
```

---

### 6.3 @lytjs/ssr-enhanced - 增强版 SSR（阶段一）

**目标**：提供企业级 SSR 能力

**功能需求**：
- ✅ 流式 SSR
- ✅ 组件级缓存
- ✅ 代码分割
- ✅ 预加载支持
- ✅ 与部署平台的基础适配接口

**验收标准**：
- 流式渲染性能提升 >= 30%
- 组件级缓存正常工作
- 完善的 TypeScript 类型定义
- 单元测试覆盖率 >= 75%

---

### 6.4 @lytjs/router-fs - 文件系统路由引擎（阶段一）

**目标**：提供基于文件系统的路由生成能力（从 LytX 提取）

**功能需求**：
- ✅ 基于文件系统自动生成路由
- ✅ 不绑定具体目录约定（用户自己指定目录）
- ✅ 支持动态路由
- ✅ 支持嵌套路由
- ✅ 可独立使用，不依赖 LytX

**验收标准**：
- 灵活的目录配置
- 支持各种路由模式
- 与 @lytjs/router 无缝集成
- 单元测试覆盖率 >= 85%

---

### 6.5 @lytjs/api - API 路由引擎（阶段一）

**目标**：提供 API 路由的基础能力（从 LytX 提取）

**功能需求**：
- ✅ 基于文件系统的 API 路由
- ✅ 不绑定具体目录约定
- ✅ 不绑定具体服务器框架
- ✅ 中间件支持
- ✅ 可独立使用，不依赖 LytX

**验收标准**：
- 灵活的目录配置
- 支持 RESTful API 风格
- 中间件机制完善
- 单元测试覆盖率 >= 80%

---

### 6.6 @lytjs/ssg - 静态站点生成（阶段二）

**目标**：提供静态站点生成的核心能力（从 LytX 提取）

**功能需求**：
- ✅ 静态页面生成
- ✅ 不绑定具体渲染函数
- ✅ 不绑定具体部署平台
- ✅ 增量构建
- ✅ 可独立使用，不依赖 LytX

**验收标准**：
- 支持各种渲染方式
- 构建性能优化
- 与 @lytjs/ssr 无缝集成
- 单元测试覆盖率 >= 75%

---

### 6.7 @lytjs/isr - 增量静态再生成（阶段二）

**目标**：提供增量静态再生成的能力（从 LytX 提取）

**功能需求**：
- ✅ 增量更新页面
- ✅ 基于时间或事件触发
- ✅ 与 @lytjs/ssg 深度集成
- ✅ 可独立使用，不依赖 LytX

**验收标准**：
- ISR 功能正常工作
- 与 SSG 无缝集成
- 单元测试覆盖率 >= 75%

---

### 6.8 @lytjs/bundler - 构建工具集成（阶段二）

**目标**：提供 Vite/Webpack 的基础集成（从 LytX 提取）

**功能需求**：
- ✅ Vite 集成
- ✅ Webpack 集成（可选）
- ✅ 配置预设
- ✅ 可独立使用，不依赖 LytX

**验收标准**：
- Vite 集成完善
- 配置简单易用
- 单元测试覆盖率 >= 70%

---

### 6.9 @lytjs/hmr - 热模块替换（阶段二）

**目标**：提供热模块替换的核心能力（从 LytX 提取）

**功能需求**：
- ✅ 组件热更新
- ✅ 状态保持
- ✅ 与 @lytjs/bundler 集成
- ✅ 可独立使用，不依赖 LytX

**验收标准**：
- HMR 功能正常工作
- 状态保持正常
- 单元测试覆盖率 >= 70%

---

## 七、资源分配与优先级

### 7.1 优先级框架

| 优先级 | 标准 | 资源占比 |
|------|------|----------|
| 🔴 P0 | 核心优势、用户痛点 | 50% |
| 🟡 P1 | 生态建设、体验优化 | 30% |
| 🟢 P2 | 长期探索、创新 | 20% |

### 7.2 里程碑时间线

```
现在（2026-05-19，v6.4.0）
  │
  ├─ 阶段一：核心增强（3-4 周）→ v6.5-alpha
  │
  ├─ 阶段二：静态与构建（2-3 周）→ v6.5-beta
  │
  ├─ 阶段三：生态完善（4-5 周）
  │
  ├─ 阶段四：锦上添花（2-3 周）
  │
  └─ 总计：11-15 周完成核心层
```

### 7.3 v6.5 已完成（阶段一核心增强 + 阶段二静态与构建 + 阶段三生态完善 + 阶段四性能优化）

✅ **@lytjs/plugin-validation** - 验证插件已完成  
✅ **@lytjs/plugin-data** - 增强版数据获取插件已完成  
✅ **@lytjs/router-fs** - 文件系统路由引擎已完成  
✅ **@lytjs/api** - API 路由引擎已完成  
✅ **@lytjs/ssg** - 静态站点生成已包含在 @lytjs/ssr 中  
✅ **@lytjs/isr** - 增量静态再生成已包含在 @lytjs/ssr 中  
✅ **@lytjs/bundler** - 构建工具集成已完成  
✅ **@lytjs/hmr** - 热模块替换已完成  
✅ **@lytjs/plugin-i18n** - 国际化插件已完成  
✅ **@lytjs/plugin-auth** - 认证插件已完成  
✅ **@lytjs/plugin-storage** - 存储插件已完成  
✅ **@lytjs/runtime-edge** - 边缘运行时支持已完成  
✅ **@lytjs/plugin-testing** - 测试插件已完成  
✅ **Tree-shaking 优化** - 所有包已添加 sideEffects: false 和 treeshake 优化  
✅ **版本升级** - 所有相关包已升级至 v6.5.0  

### LytJS v6.5 开发已完成！

### 下一步行动（v6.6）

1. 开始 v6.6 生态系统模块化重构  
2. 创建 web-framework 和 ssr-kit 功能域  
3. 添加中间件生态、HTTP 服务器、元数据管理等新包

---

### 5.4 v6.6：生态系统模块化重构（⏸️ 待开发）

**目标**：对 L6 生态系统层进行模块化重构，参考 `@lytjs/common` 的 monorepo 架构，提升可维护性和扩展性。

**核心原则**：
- ✅ **不破坏 8 层架构**：所有改动都在 L6 生态系统层内部
- ✅ **完全向后兼容**：现有包的导入路径和 API 保持不变
- ✅ **统一模块化架构**：web-framework 和 ssr-kit 采用相同的组织模式
- ✅ **零依赖原则保持**：L0-L6 运行时继续保持零第三方依赖

---

#### 阶段一：web-framework 模块化（优先级：🔴 高，预计 2-3 周）

**目标**：创建 web-framework 功能域，整合路由、API、中间件等包

| 任务 | 包名 | 类型 | 预计时间 | 依赖 | 说明 |
|------|------|------|----------|------|------|
| 1.1 | web-framework 结构 | 重构 | 3 天 | - | 创建 web-framework monorepo 目录结构 |
| 1.2 | @lytjs/middleware | 新增 | 5 天 | @lytjs/core | 中间件核心系统（洋葱圈模型） |
| 1.3 | @lytjs/middleware-cors | 新增 | 3 天 | @lytjs/middleware | CORS 中间件 |
| 1.4 | @lytjs/middleware-auth | 新增 | 4 天 | @lytjs/middleware | 认证中间件 |
| 1.5 | @lytjs/middleware-rate-limit | 新增 | 4 天 | @lytjs/middleware | 限流中间件 |
| 1.6 | @lytjs/http-server | 新增 | 6 天 | @lytjs/middleware | HTTP 服务器（基于 Fetch API） |
| 1.7 | @lytjs/metadata | 新增 | 4 天 | - | 元数据管理（SEO、OpenGraph 等） |
| 1.8 | 迁移现有包 | 迁移 | 2 天 | - | 将 router、router-fs、api 迁移到 web-framework |

**阶段一交付物**：
- web-framework 功能域完整结构
- 7 个新包（middleware 系列 + http-server + metadata）
- 3 个现有包迁移
- 完整的类型定义和测试
- 向后兼容的导入路径

---

#### 阶段二：ssr-kit 模块化（优先级：🔴 高，预计 2-3 周）

**目标**：创建 ssr-kit 功能域，将 SSR 相关包进行模块化组织

| 任务 | 包名 | 类型 | 预计时间 | 依赖 | 说明 |
|------|------|------|----------|------|------|
| 2.1 | ssr-kit 结构 | 重构 | 3 天 | - | 创建 ssr-kit monorepo 目录结构 |
| 2.2 | @lytjs/ssg | 拆分 | 4 天 | @lytjs/ssr | 从现有 ssr 包中拆分为独立包 |
| 2.3 | @lytjs/cache-isr | 新增 | 5 天 | @lytjs/common-cache | ISR 缓存系统（从 LytX 提取） |
| 2.4 | @lytjs/html-renderer | 新增 | 5 天 | @lytjs/metadata | HTML 渲染器（从 LytX 提取） |
| 2.5 | 迁移现有包 | 迁移 | 2 天 | - | 将 ssr、hmr 迁移到 ssr-kit |
| 2.6 | 增强 @lytjs/ssr | 增强 | 3 天 | - | 保持现有 API，内部结构优化 |

**阶段二交付物**：
- ssr-kit 功能域完整结构
- 3 个新包（ssg、cache-isr、html-renderer）
- 2 个现有包迁移
- 完整的类型定义和测试
- 向后兼容的导入路径

---

#### 阶段三：工具链与文档更新（优先级：🟡 中，预计 1-2 周）

**目标**：更新构建工具、文档和 workspace 配置

| 任务 | 范围 | 类型 | 预计时间 | 说明 |
|------|------|------|----------|------|
| 3.1 | pnpm-workspace.yaml | 更新 | 2 天 | 更新 workspace 配置 |
| 3.2 | package.json scripts | 更新 | 2 天 | 更新构建脚本 |
| 3.3 | 文档更新 | 更新 | 5 天 | 更新架构文档、API 文档 |
| 3.4 | 迁移指南 | 新增 | 3 天 | 为用户提供迁移指南（如需要） |

**阶段三交付物**：
- 更新的构建工具配置
- 完整的架构文档
- 迁移指南（如有必要）

---

### 5.5 v6.6 架构设计详情

#### 统一模块化架构模式

参考 `@lytjs/common` 的成功经验，所有功能域采用相同的 monorepo 模式：

```
packages/ecosystem/packages/{domain}/
├── package.json                    # 管理用主包（不发布）
├── tsconfig.json
├── packages/
│   ├── {package-1}/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── ...
│   │   ├── tests/
│   │   ├── package.json            # 独立发布的包
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── README.md
│   ├── {package-2}/
│   └── ...
└── src/
    └── index.ts                    # 可选：统一导出入口
```

#### web-framework 功能域详解

**包含包**：
- `@lytjs/router` - 核心路由（已有）
- `@lytjs/router-fs` - 文件系统路由（已有）
- `@lytjs/api` - API 路由（已有）
- `@lytjs/middleware` - 中间件核心系统
- `@lytjs/middleware-cors` - CORS 中间件
- `@lytjs/middleware-auth` - 认证中间件
- `@lytjs/middleware-rate-limit` - 限流中间件
- `@lytjs/http-server` - HTTP 服务器
- `@lytjs/metadata` - 元数据管理

**职责划分**：
- 路由系统（router、router-fs、api）
- 中间件生态（middleware、middleware-*）
- 服务器层（http-server）
- 元数据层（metadata）

#### ssr-kit 功能域详解

**包含包**：
- `@lytjs/ssr` - SSR 核心（已有）
- `@lytjs/ssg` - 静态站点生成
- `@lytjs/cache-isr` - ISR 缓存
- `@lytjs/html-renderer` - HTML 渲染器
- `@lytjs/hmr` - 热模块替换（已有）

**职责划分**：
- 渲染核心（ssr）
- 静态生成（ssg、html-renderer）
- 缓存层（cache-isr）
- 开发工具（hmr）

#### 向后兼容性策略

**关键原则**：用户代码无需修改！

**技术方案**：
1. **保持包名不变**：`@lytjs/router` 等包名继续使用
2. **保持导出 API 不变**：现有导入语句继续工作
3. **双轨运行**：同时保留旧位置和新位置（过渡期）
4. **软弃用**：v6.6 标记旧位置为 deprecated，v7.0 移除
5. **重定向**：通过 package.json 的 exports 字段保持兼容性

**示例**：
```typescript
// 现有代码无需修改
import { createRouter } from '@lytjs/router';

// 内部实现已经迁移到 web-framework 下
```

---

### 5.6 v7.0+：未来探索 ⏸️ 探索中

**革命性升级**：
- 更智能的编译器
- AI 辅助开发
- 多语言支持（Rust/WebAssembly）
- 全新的开发体验

---

## 八、成功指标

### 8.1 技术指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| **性能排名** | js-framework-benchmark 前 3 | 官方排名 |
| **包体积** | 核心 < 8KB（gzip） | size-limit |
| **测试覆盖率** | 核心包 > 95% | vitest coverage |
| **内存占用** | 比 v6.0 降低 40% | 基准测试 |
| **编译速度** | 比 v6.0 提升 50% | 基准测试 |
| **核心层新包数** | 16 个包全部完成 | 包统计 |

### 8.2 生态指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| **官方插件** | 11+ | 插件列表 |
| **第三方插件** | 20+ | 社区统计 |
| **实战案例** | 20+ | 案例展示 |
| **企业用户** | 5+ | 案例展示 |

### 8.3 社区指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| **GitHub Stars** | 5000+ | GitHub |
| **贡献者** | 50+ | GitHub |
| **月活跃用户** | 1000+ | npm 统计 |
| **下载量** | 50K+/月 | npm 统计 |
| **社区活跃度** | 高 | 问题响应速度 |

### 8.4 质量指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| **Bug 修复速度** | 24小时内响应 | 问题追踪 |
| **文档完整性** | 100% API 覆盖 | 文档检查 |
| **向后兼容** | 95% 兼容性 | 测试验证 |
| **CI/CD 通过率** | 99%+ | CI 统计 |

### 8.5 v6.6 专项成功指标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| **架构一致性** | web-framework 和 ssr-kit 采用相同模式 | 代码审查 |
| **向后兼容性** | 100% API 兼容 | 自动化测试验证 |
| **新增包数** | 10+ 个新生态包 | 包统计 |
| **模块化覆盖率** | 所有生态包按功能域组织 | 目录结构检查 |
| **文档完整性** | 100% 新包有完整文档 | 文档检查 |
| **测试覆盖率** | 新包测试覆盖率 > 80% | vitest coverage |

### 8.6 关键成功因素

✅ 保持零依赖原则不动摇  
✅ 保持 8 层架构完整，不破坏现有分层  
✅ 持续优化性能（Vapor 模式优先）  
✅ 完成 v6.6 生态系统模块化重构  
✅ 充分利用现有的 @lytjs/common 工具库  
✅ 建立健康的生态系统  
✅ 提供优秀的开发体验  
✅ 保持 100% 向后兼容性  
✅ 建立企业用户案例  
✅ 成功完成 UI 组件库迁出（如有）  

---

## 九、暂缓任务

### 构建器多适配

| 任务 | 优先级 | 说明 |
|------|------|------|
| **Webpack 适配** | 🟡 中 | 探索 Webpack 适配方案 |
| **Rollup 适配** | 🟡 中 | 探索 Rollup 适配方案 |

**暂缓原因**：当前 Vite 适配方案已足够满足需求，暂不投入资源。

### 跨平台支持

| 任务 | 优先级 | 说明 |
|------|------|------|
| **微信小程序适配器** | 🟢 低 | 扩展到更多平台 |
| **React Native 适配器** | 🟢 低 | React Native 适配器（概念验证） |
| **跨平台抽象层完善** | 🟢 低 | 跨平台抽象层完善 |

**暂缓原因**：当前专注于 Web 平台深耕，跨平台支持暂不投入资源。

### 全新渲染模式

| 任务 | 优先级 | 说明 |
|------|------|------|
| **WebGPU 渲染探索** | 🟢 低 | 探索 WebGPU 渲染 |
| **VR/AR 支持** | 🟢 低 | VR/AR 支持 |
| **3D 场景优化** | 🟢 低 | 3D 场景优化 |

**暂缓原因**：技术成熟度和市场需求暂不明确，暂不投入资源。

### 视频教程

| 任务 | 优先级 | 说明 |
|------|------|------|
| **视频教程制作** | 🟢 低 | 视频教程（5-10 个） |

**暂缓原因**：当前资源优先投入到核心功能开发，视频教程暂不投入资源。

### UI 组件库迁出

| 任务 | 优先级 | 说明 |
|------|------|------|
| **UI 组件库独立** | 🟡 中 | UI 组件库从 LytJS 核心包中迁出 |

**状态**：准备中，待 v6.5 核心层完成后再评估

---

## 十、核心约束

### 10.1 运行时零第三方依赖

- **所有组件、插件、核心层均采用原生 JS/DOM 实现**
- **不引入任何第三方 runtime 依赖**
- 工具类全部自研实现
- 例外情况：仅开发/构建阶段的依赖允许

### 10.2 8 层架构约束

- **严格遵循分层职责**
- **L0 基础工具层开放**：L0 基础工具层（common-*）可被所有上层直接依赖
- **核心层合理依赖**：核心层（L1-L4）尽量减少跨层依赖，但允许必要的跨层访问
- **不循环依赖**
- **底层为上层提供支撑**
- 使用 `pnpm run check-circular` 定期检查

### 10.3 API 统一约束

- **所有组件、插件 API 命名统一**
- **遵循文档规范**
- **降低学习与开发成本**
- 保持向后兼容性

### 10.4 性能约束

- **所有组件、渲染逻辑需适配 Vapor 模式**
- **提升运行性能**
- **降低渲染开销**
- 持续进行性能基准测试与优化

---

## 十一、开发经验教训

### 11.1 基准测试开发流程

**经验 1：先收集基线数据，再进行优化**

- ✅ 正确做法：在优化前先运行基准测试，记录当前性能数据
- ❌ 错误做法：直接开始优化，没有对比基准
- 原因：没有基线数据无法判断优化效果

**经验 2：使用相对性能对比而非绝对值**

- ✅ 正确做法：记录操作间的相对速度（如 "A 比 B 快 2x"）
- ❌ 错误做法：只关注绝对数值（ms）
- 原因：测试环境差异大，相对对比更稳定

**经验 3：关注 P99 和 P995 指标**

- ✅ 正确做法：重点关注 P99/P995（最坏情况性能）
- ❌ 错误做法：只关注平均值（mean）
- 原因：用户体验受最坏情况影响更大

### 11.2 Git 协作流程

**经验 4：遇到远程分叉时使用 rebase 而非 merge**

- ✅ 正确做法：`git pull --rebase` 保持线性历史
- ❌ 错误做法：`git pull`（默认 merge）产生额外 merge commit
- 原因：rebase 保持提交历史整洁

### 11.3 文档维护

**经验 5：同步更新多个相关文档**

- 每次完成里程碑任务时，同时更新：
  - ROADMAP_NEXT_STEPS.md（任务进度）
  - CHANGELOG.md（版本历史）
  - 性能文档（如 BASELINE_PERFORMANCE_v6.0.0.md）
- 原因：保持文档一致性，避免信息孤岛

### 11.4 项目拆分经验

**经验 6：清晰的职责划分**

- LytJS 提供通用、可独立使用的基础能力
- LytX 提供约定和整合，专注于开发体验
- UI 组件库独立发展
- 避免功能重复，各司其职

**经验 7：提取时机**

- 先在整合项目中验证功能
- 功能稳定后再提取到独立项目
- 确保提取的包可以独立使用，不依赖约定

---

## 附录：快速开始

### 5分钟检查项目状态

```bash
# 1. Git 状态检查
git status
git branch

# 2. 类型检查（最快速验证代码健康状态）
pnpm type-check

# 3. 核心包测试验证
cd packages/reactivity && pnpm test
cd packages/vdom && pnpm test

# 4. 完整构建（可选）
pnpm build
```

---

**文档版本**：v12.0.0  
**最后更新**：2026-05-20  
**维护者**：LytJS Team  
**重要更新**：LytX 已独立，UI 准备迁出，核心聚焦，v6.6 生态系统模块化重构
