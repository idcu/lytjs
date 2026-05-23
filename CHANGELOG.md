# Changelog

本项目的所有重要变更将记录在此文件中。

## [6.8.0] - 2026-05-23

### 类型系统增强

- ✅ **通用类型工具库** - `@lytjs/shared-types` 大幅增强
  - 新增 80+ 实用类型工具（Parameters、ReturnType、ConstructorParameters 等）
  - 新增类型守卫类型定义和运行时工具
  - 新增字符串模板类型支持（Join、Split、CamelToSnake 等）
  - 增强类型安全和类型推断能力

### 类型安全的事件系统

- ✅ **新增类型安全的事件发射器** - `@lytjs/shared-types/src/event-emitter.ts`
  - 完整的泛型事件系统
  - 类型安全的事件监听和触发
  - 支持 on、off、emit、once、removeAllListeners 方法

### 开发体验优化

- ✅ **DevTools 调试增强** - `@lytjs/devtools/src/debugEnhancer.ts`
  - 新增结构化日志系统（debug、info、warn、error、trace）
  - 新增调试断点工具
  - 新增性能测量装饰器（measurePerformance、measureAsyncPerformance）
  - 新增状态检查点系统（createCheckpoint、compareCheckpoints）
  - 全局调试工具支持

### 版本升级

- 所有包版本统一升级至 v6.8.0
- 保持完全向后兼容

## [6.7.0] - 2026-05-23

### 核心功能增强

- ✅ **中间件系统** - 完整的洋葱圈模型中间件实现
  - @lytjs/middleware - 中间件核心系统
  - @lytjs/middleware-auth - 认证中间件
  - @lytjs/middleware-cors - CORS 中间件
  - @lytjs/middleware-rate-limit - 速率限制中间件

- ✅ **流式 SSR 增强** - 支持流式服务端渲染
  - 流式渲染器 renderToStream
  - Web Streams API 支持
  - Suspense 边界支持
  - 分块传输编码

- ✅ **Suspense 完善** - 完整的 Suspense 组件和异步状态管理
  - 服务端 Suspense 支持
  - useSuspense Hook
  - startTransition API
  - Suspense 错误边界
  - 超时处理

- ✅ **数据获取与缓存系统** - 统一的缓存接口
  - 多层缓存（Memory → Redis → HTTP）
  - 缓存标签失效
  - TTL 过期控制
  - 缓存统计信息

### 版本升级

- 所有包版本统一升级至 v6.7.0
- 将 .changeset 目录添加到 .gitignore
- 保持完全向后兼容

## [6.6.0] - 2026-05-21

### 核心功能增强

- ✅ **@lytjs/common-query 增强** - 支持数组查询参数解析
  - 新增 `parseQueryStringWithArrays` 函数，直接支持数组值
  - 增强 `stringifyQueryString`，支持数组、布尔值、数字等多种类型
  - 完整的 TypeScript 类型支持
- ✅ **@lytjs/common-http 增强** - 完善的 HTTP 客户端工具
  - 新增便捷方法：`get`, `post`, `put`, `patch`, `del`
  - 新增直接返回数据的 JSON 方法：`getJson`, `postJson`, `putJson`, `patchJson`, `deleteJson`, `requestJson`
  - 集成 `@lytjs/common-query`，支持数组查询参数
  - 新增完整的测试用例

### 包复用优化

- ✅ **@lytjs/http-server 重构** - 移除重复代码，直接使用 common-query
  - 移除了重复的 `parseQuery` 实现
  - 直接使用 `@lytjs/common-query` 中的 `parseQueryStringWithArrays`
  - 添加 `@lytjs/common-query` 依赖
  - 保持完全的功能完整性

### 文档完善

- ✅ **@lytjs/common-http** - 添加完整的 README 文档
- ✅ **@lytjs/api** - 添加完整的 README 文档

### 版本升级

- 所有相关包统一升级至 v6.6.0
- 保持完全向后兼容

## [6.5.0] - 2026-05-19

### 核心增强

- ✅ **新增验证插件** - @lytjs/plugin-validation 完整实现
  - 支持多种验证规则（required, email, phone, minLength 等）
  - 自定义验证规则支持
  - 完整的 TypeScript 类型定义

- ✅ **新增数据获取插件** - @lytjs/plugin-data
  - 乐观更新支持
  - 请求去重
  - TTL 和 LRU 缓存策略
  - 与 @lytjs/plugin-data-fetch 深度集成

- ✅ **新增文件系统路由引擎** - @lytjs/router-fs
  - 基于文件系统的自动路由生成
  - 动态路由参数支持
  - 嵌套路由支持
  - 零外部依赖

- ✅ **新增 API 路由引擎** - @lytjs/api
  - 文件系统驱动的 API 路由
  - RESTful API 规范支持
  - 中间件支持

### 静态与构建

- ✅ **新增构建工具集成** - @lytjs/bundler
  - Vite 插件支持
  - Webpack 插件支持
  - SSG/SSR 预设配置

- ✅ **新增热模块替换** - @lytjs/hmr
  - WebSocket 连接管理
  - 模块更新处理
  - 自动重连

- ✅ **SSG/ISR 支持** - 已完整包含在 @lytjs/ssr
  - 静态站点生成
  - 增量静态再生成
  - 预渲染支持

### 生态完善

- ✅ **新增边缘运行时支持** - @lytjs/runtime-edge
  - 边缘函数支持
  - 边缘路由器
  - 内存缓存
  - 响应辅助工具

- ✅ **现有插件升级**
  - @lytjs/plugin-i18n - 国际化插件 v6.5.0
  - @lytjs/plugin-auth - 认证插件 v6.5.0
  - @lytjs/plugin-storage - 存储插件 v6.5.0
  - @lytjs/plugin-testing - 测试插件 v6.5.0
  - @lytjs/plugin-data-fetch - 数据获取基础插件 v6.5.0

- ✅ **核心包升级**
  - @lytjs/core - v6.4.0 → v6.5.0
  - @lytjs/reactivity - v6.4.0 → v6.5.0

### 性能优化

- ✅ **Tree-shaking 优化** - 所有包已添加 sideEffects: false
- ✅ **构建配置统一** - 完善所有包的 tsup 配置
- ✅ **版本统一** - 所有相关包统一为 v6.5.0

### 文档完善

- ✅ **完整的发布文档** - docs/community/RELEASE_v6.5.0.md
- ✅ **路线图更新** - docs/development/ROADMAP_NEXT_STEPS.md
- ✅ **新包 README** - 所有 6 个新包的完整文档

## [6.4.0] - 2026-05-18

### 完整 Monorepo 发布
- ✅ **所有官方包发布到 npm**
  - @lytjs/shared-types@6.4.0
  - @lytjs/reactivity@6.4.0
  - @lytjs/vdom@6.4.0
  - @lytjs/component@6.4.0
  - @lytjs/renderer@6.4.0
  - @lytjs/compiler@6.4.0
  - @lytjs/core@6.4.0
  - @lytjs/core-signal@6.4.0
  - @lytjs/core-vnode@6.4.0
  - @lytjs/dom@6.4.0
  - @lytjs/web@6.4.0
  - @lytjs/adapter-web@6.4.0
  - @lytjs/host-contract@6.4.0
  - @lytjs/dom-runtime@6.4.0
  - @lytjs/router@6.4.0
  - @lytjs/store@6.4.0
  - @lytjs/ssr@6.4.0
  - @lytjs/ui@6.4.0
  - @lytjs/devtools@6.4.0
  - @lytjs/compat@6.4.0
  - @lytjs/platform-adapter@6.4.0
  - @lytjs/plugin-vite@6.4.0
  - @lytjs/plugin-theme@6.4.0
  - @lytjs/plugin-logger@6.4.0
  - @lytjs/plugin-auth@6.4.0
  - @lytjs/plugin-storage@6.4.0
  - @lytjs/plugin-i18n@6.4.0
  - @lytjs/cli@6.4.0
  - @lytjs/devtools-extension@6.4.0
  - @lytjs/test-utils@6.4.0
  - 所有 common-* 工具包 @6.4.0

### 核心修复
- ✅ **类型系统修复**
  - 修复 ColorPicker 组件 const 赋值错误
  - 将 const 变量改为 let 以允许赋值
- ✅ **文档体系完善**
  - 全项目文档版本统一为 v6.4.0
  - 所有包的 CHANGELOG 更新
  - 文档站配置检查完成
- ✅ **构建与发布**
  - npm 令牌配置
  - Monorepo 包发布流程优化

---

## [6.0.1] - 2026-05-16

### 教程与实战案例体系
- ✅ **完整的 LytJS 学习资源体系**
  - Vue → LytJS 迁移指南
  - React → LytJS 迁移指南
  - 实战案例教程（Todo、用户管理系统、购物车、博客系统）
  - 官方插件使用指南（所有 11 个官方插件）

### TypeScript 类型系统增强
- ✅ **通用类型工具库** `packages/shared-types/src/type-utils.ts`
  - 80+ 个实用类型工具
  - 完整类型导出和文档
- ✅ **TypeScript 开发体验优化**
  - TypeScript 类型指南文档
  - 完整类型示例代码库
  - 类型系统导出完善

### 文档体系完善
- ✅ **全面的文档体系**
  - 综合文档索引 `docs/SUMMARY.md`
  - 快速入门指南
  - 常见问题 FAQ
  - SSR/SSG 使用指南
  - CLI 使用指南
  - 管理后台完整示例应用

### 开发工具增强
- ✅ **CLI 工具功能增强**
  - 新增 5 种代码生成类型：directive, composable, hook, util, middleware
  - 完善插件创建和管理流程
- ✅ **Vapor 模式性能优化**
  - DOM 操作批量处理优化
  - 事件委托机制
  - 增量更新优化

### 测试体系增强
- ✅ **完整测试体系**
  - 管理后台 E2E 测试（Playwright）
  - 完整测试指南文档
  - 模糊测试和性能回归测试功能

### 文档站点优化
- ✅ **美观且功能完善的文档站点**
  - 交互式组件示例
  - VitePress 主题优化（渐变色彩、代码块美化）
  - 完整导航结构
  - VitePress 本地搜索功能

### SSR/SSG 增强
- ✅ **完整的服务端渲染能力**
  - ISR（Incremental Static Regeneration）增量静态再生成
  - 服务端组件架构
  - Server Actions 服务端函数调用
  - 特殊类型数据序列化支持

### DevTools 完善
- ✅ **强大的调试能力**
  - 信号检查器与时间旅行调试
  - 性能监控与告警
  - 基准测试与回归检测
  - 完整的 API 参考文档

### 插件类型问题修复
- ✅ **所有官方插件类型安全**
  - plugin-animation：修复 signal API 使用和导出问题
  - plugin-data-fetch：修复命名冲突和类型问题
  - plugin-form：使用 signalComputed 替代 computed
  - shared-types：简化复杂类型定义
  - 所有包通过完整类型检查

### 官方插件测试覆盖增强
- ✅ **11 个官方插件测试完全通过**
  - plugin-testing：修复信号跟踪问题
  - plugin-vite：优化测试配置
  - 所有插件通过完整测试套件

### 开发体验增强
- ✅ **Trae 可调用的 skill 支持**
  - LytJS ROADMAP 维护与性能优化 skill
  - 完整的项目状态检查流程
  - 类型安全问题修复流程
  - 性能优化完整指南

### 性能基准测试完善
- ✅ **完整的性能基准测试体系**
  - 修复基准测试文件以适配 LytJS signal API
  - 涵盖 signal 读写、signalComputed、effect、深度计算链、VNode 树创建
  - 完整的测试环境构建

### 官方插件扩展
- ✅ **新增 4 个官方插件（共 11 个）**
  - plugin-form：表单管理与验证
  - plugin-animation：动画库
  - plugin-data-fetch：数据获取与缓存
  - plugin-testing：测试工具集成
  - 所有插件零第三方运行时依赖

---

## [6.0.0] - 2026-05-15

### 核心功能完善

- ✅ **8层架构设计** 已完整实现
  - L0 基础工具层：common-* 系列工具包
  - L1 核心原语层：响应式系统、虚拟 DOM、编译器
  - L2 渲染引擎层：Vapor + VDOM 双渲染模式
  - L3 核心运行时层：应用实例、生命周期、插件机制
  - L4 插件与适配层：官方插件、Web 适配器
  - L5 组件基础层：组件通用逻辑
  - L6 生态系统层：UI 组件库、路由、状态管理
  - L7 工程化工具层：构建工具、CLI、DevTools

- ✅ **运行时零第三方依赖** 严格执行
  - 所有 L0-L6 层运行时代码无第三方依赖
  - 仅开发/构建工具允许引入第三方依赖

### 核心包修复与优化

- ✅ **核心包依赖修复**
  - @lytjs/core: 添加 common-error、common-object
  - @lytjs/reactivity: 添加 common-error、common-constants、common-assertions
  - @lytjs/component: 添加 common-error、common-string
  - @lytjs/vdom: 添加 common-assertions、common-error、common-object、common-constants
  - @lytjs/renderer: 添加 common-error
  - @lytjs/compiler: 添加 common-string、common-constants

- ✅ **性能优化**
  - VNode 对象池优化：将最大大小从 200 扩大到 500，减少 GC 压力
  - Signal 通知机制优化：使用迭代器替代 for...of 循环遍历 subscribers，提升性能

### 测试与质量保障

- ✅ **基准测试配置修复**
  - benchmarks/vitest.config.ts: 修改别名指向 dist 而非 src
  - 基准测试现已全部通过（render/update/memory）

- ✅ **E2E 测试增强**
  - 修复 e2e/playwright.config.ts 中的 filter 名称
  - 新增 e2e/tests/scenarios.test.ts，覆盖 7 个典型场景
    - 计数器组件测试
    - 待办事项组件测试
    - 颜色选择器组件测试
    - 计时器组件测试
    - 购物车组件测试
    - 井字棋组件测试
    - 天气仪表盘组件测试

- ✅ **E2E 测试环境完善**
  - 将 playground 加入 pnpm workspace
  - 重构 playground/package.json，使用 workspace 依赖
  - 更新 e2e/playwright.config.ts 使用正确的包名
  - 添加 e2e/README.md 使用指南

- ✅ **UI 包类型修复**
  - 修复 ui 包中类型错误
  - 清理重复类型定义

- ✅ **测试覆盖率提升**
  - UI 组件测试重构，提升测试质量
  - reactivity 包测试覆盖率 > 90%
  - vdom 包测试覆盖率 > 85%

### CI/CD 集成完善

- ✅ **CI/CD 配置**
  - 项目已有完整的 GitHub Actions CI/CD 配置
  - 在 .github/workflows/ci.yml 中新增基准测试 job
  - 基准测试结果会自动上传并保留 14 天
  - 简化 E2E 测试矩阵（仅保留 chromium）以提升 CI 速度

### 生态系统建设

- ✅ **官方插件**（6个）
  - plugin-theme：主题管理
  - plugin-logger：日志记录
  - plugin-auth：权限控制
  - plugin-storage：本地存储
  - plugin-i18n：国际化
  - plugin-chart：图表渲染

- ✅ **UI 组件库**（60+ 组件）
  - 完整的 UI 组件体系
  - 支持主题定制
  - 支持 Vapor 渲染模式

- ✅ **生态包**（7个）
  - router：路由
  - store：状态管理
  - ui：UI 组件库
  - devtools：开发者工具
  - ssr：服务端渲染
  - platform-adapter：平台适配器

### 架构整改

#### BREAKING CHANGES

- 删除 `@lytjs/shared` 包，功能合并到 `@lytjs/common-*` 子包
- 删除 `@lytjs/host` 包，功能合并到 `@lytjs/adapter-web`
- 删除 `@lytjs/runtime-convergence` 包，拆分为 6 个独立子包

#### 新增包

- `@lytjs/common-render-queue` - 渲染队列，批量合并渲染操作
- `@lytjs/common-event-normalizer` - 事件归一化工具
- `@lytjs/common-node-cache` - 节点缓存，管理容器-VNode 映射
- `@lytjs/common-async-scheduler` - 异步调度器，支持优先级
- `@lytjs/common-transition-engine` - 过渡引擎，支持 FLIP 动画
- `@lytjs/common-performance` - 性能监控 API
- `@lytjs/common-constants` - 全局常量

### 安全修复

- 修复 v-html SSR 模式下未转义输出导致的 XSS 漏洞
- 修复 v-html Signal 模式下直接设置 innerHTML 的安全问题
- 修复 Island hydration 使用 innerHTML 创建 DOM 的安全问题
- 添加 CSP 严格模式检测和优雅降级
- 修复 Source Map encodeMappings 始终使用 sources[0] 的问题

### Bug 修复

- 添加 v-bind 动态属性名验证
- 添加 v-on 事件名验证
- 添加组件名验证
- 添加 v-for 无 key 警告完善
- 添加 v-if 空条件报错
- 添加模板多根节点检测
- 添加组件递归深度限制（100层）
- 完善响应式数组方法处理
- 添加计算属性循环依赖检测
- 添加 watch 回调错误捕获

### 性能优化

- 添加 VNode 对象池，减少 GC 压力
- 添加编译缓存，避免重复编译
- 添加 DOM 批量操作队列
- 添加正则表达式预编译缓存
- 添加懒加载渲染器支持
- 优化首次渲染性能

### 代码质量改进

- 添加全局常量包 `@lytjs/common-constants`
- 完善 JSDoc 注释
- 添加类型守卫函数
- 添加错误恢复机制
- 统一代码风格

---

## 迁移指南

### 从 5.x 升级到 6.0

#### 包名变更

| 旧包名 | 新包名/替代方案 |
| --- | --- |
| `@lytjs/shared` | 使用 `@lytjs/common-*` 系列包 |
| `@lytjs/host` | 使用 `@lytjs/adapter-web` |
| `@lytjs/runtime-convergence` | 使用拆分后的 `@lytjs/common-*` 包 |

#### 导入路径更新

```typescript
// 旧版本
import { xxx } from '@lytjs/shared';

// 新版本
import { xxx } from '@lytjs/common-xxx';
```

#### 架构分层

6.0 版本引入了严格的分层架构：

- **L0 基础层**: 无外部依赖的基础工具包
- **L1 核心原语层**: 框架核心功能实现
- **L2 平台/组件层**: 平台适配和组件系统
- **L3 应用层**: 用户面向的应用 API

请确保您的代码遵循分层依赖规则，避免跨层依赖。
