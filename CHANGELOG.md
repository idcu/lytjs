# Changelog

本项目的所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/)，
版本管理遵循 [Semantic Versioning](https://semver.org/)。

## [Unreleased]

## [5.0.0] - 2026-04-27

### Changed

- 统一文档命名规范，删除临时性开发文档
- 为 6 个插件包补充 README.md
- 更新文档索引和 VitePress 配置
- 修正 VitePress 中的仓库链接
- **Vapor Mode**: `bindIf()` 从 display:none 切换改为 DOM 插入/移除方式
- **Vapor Mode**: `bindEach()` 从全量重建改为真正的 keyed diff 算法
- **Vapor Mode**: `vaporPatch()` 支持绑定迁移和清理
- **Vapor Mode**: `vaporMount()` 修复内存泄漏，卸载时清理所有 Signal 绑定
- **Vapor Mode**: `renderVaporNode()` 追踪绑定清理函数
- **Vapor Mode**: `isSignal()` 检测逻辑优化，移除不可靠的 toString hack
- **Vapor Mode**: `defineVaporComponent()` 添加 `__vapor__` 标记
- **错误处理**: 统一错误码体系到 `@lytjs/common`，移除 `@lytjs/core` 中的旧枚举
- **错误处理**: `@lytjs/core/warn.ts` 改为从 `@lytjs/common` 重导出
- **错误处理**: `dev-error.ts` 的 `getFixSuggestion()` 改用 `getCategory()` 替代硬编码范围
- **TypeScript**: 所有子包 tsconfig.json 统一启用 `strict: true`
- **基准测试**: js-framework-benchmark keyed 实现从全量重建优化为 keyed diff 算法
- **基准测试**: Vapor 基准测试从模拟测试升级为基于真实 API 的完整基准

### Added

#### P2 生态扩展

- **组件库**: 新增 15 个 UI 组件，组件总数达到 50+
  - 基础组件：Menu（导航菜单）、DropdownMenu（下拉菜单）
  - 表单组件：InputNumber（数字输入框）、Cascader（级联选择器）、Rate（评分）、ColorPicker（颜色选择器）
  - 反馈组件：Drawer（抽屉）
  - 导航组件：Steps（步骤条）
  - 数据展示：Card（卡片）、Descriptions（描述列表）、Result（结果页）、ImagePreview（图片预览）、Skeleton（骨架屏）、Timeline（时间线）、Statistic（统计数值）
- **插件 SDK**: 新增 `@lytjs/plugin-sdk` 包，提供完整的插件开发工具链
  - PluginManager：插件管理器（注册/注销/安装/卸载/启用/禁用/搜索/更新）
  - PluginValidator：插件验证器（清单验证/配置验证/权限验证/兼容性验证）
  - PluginRegistry：插件注册中心（发布/搜索/下载/分类）
  - PluginScaffold：插件脚手架（项目创建/模板生成）
- **企业级模板**: 新增 `@lytjs/template-admin` Admin Dashboard 模板
  - 完整的后台管理系统布局（侧边栏 + 顶栏 + 内容区）
  - 登录页、仪表盘、用户管理、角色管理、系统设置、个人中心
  - 集成路由、状态管理、国际化、认证、日志、主题六大插件
- **MiniApp 渲染器增强**: 小程序渲染器新增 4 个核心模块
  - MiniAppCompiler：模板编译器（Lyt.js 模板 -> WXML/AXML/TTML）
  - MiniAppEventBridge：事件桥接层（跨平台事件标准化）
  - MiniAppLifecycleAdapter：生命周期适配器（Lyt.js -> 小程序生命周期映射）
  - MiniAppUtils：工具函数集（命名转换/样式处理/JSON 配置生成）
- **VSCode 扩展增强**: VSCode 扩展新增多项功能
  - 15 个代码片段（组件/Composition API/响应式/生命周期/模板语法等）
  - 调试支持（DAP 协议实现，支持 launch/attach 模式）
  - Emmet 支持（.lyt 文件 HTML 模式）
  - 4 个快捷命令（创建组件/创建页面/创建 Store/切换主题）
- **国际化文档**: 新增英文版核心文档（12 个文档文件）
  - API 文档：core、reactivity、component、router、store、components
  - 指南文档：quick-start、comparison、ssr、migration-from-vue3
  - 其他：首页、贡献指南

#### 其他新增

- **Vapor Mode**: 新增 `bindStyle()` API，支持 Signal 驱动的样式绑定（字符串和对象两种形式）
- **Vapor Mode**: 新增 `bindHTML()` API，支持 Signal 驱动的 innerHTML 绑定
- **Vapor Mode**: 模板编译器支持响应式 `v-if` 和 `v-each`（基于 Signal 自动更新 DOM）
- **Vapor Mode**: 模板编译器支持响应式文本插值和动态属性绑定
- **Vapor Mode**: `renderVaporComponent()` 新增 `props` 参数支持
- **错误处理**: 新增 `callWithErrorHandlingAsync()` 异步错误处理包装器
- **错误码**: 新增 Vapor 渲染器错误码（LYT_RENDERER_VAPOR_ERROR 等）
- **错误码**: 新增响应式循环依赖错误码（LYT_REACTIVITY_CIRCULAR_DEPENDENCY）
- **类型系统**: 新增 `@lytjs/common/vnode-types` 统一 VNode 类型定义
- **测试**: 新增 `@lytjs/common` 包完整单元测试
- **示例**: 新增 SSR 渲染示例（examples/ssr-app/）

### Fixed
- **Vapor Mode**: 修复 `vaporPatch()` 不处理 bindings 迁移导致响应式绑定断裂的问题
- **Vapor Mode**: 修复 `vaporMount()` 卸载时不清理 Signal 绑定导致的内存泄漏
- **错误处理**: 修复 `dev-error.ts` 中错误码范围与实际不匹配导致修复建议错误的问题
- **错误处理**: 修复 `warn.ts` 重复实现导致的状态不一致问题
- **测试框架**: 修复 113 个项目核查问题（安全、类型、逻辑、内存、配置等）
- **发布准备**: 修复 17 个发布前检查问题（依赖声明、导出链、构建配置等）
- **测试通过率**: 测试通过率提升到 98.5%

## [4.2.0] - 2026-04-27

### Added

- **AI 集成包 (@lytjs/ai)** - 完整的 AI 代码生成和辅助开发功能
  - AI 代码生成、组件生成、代码补全
  - CLI 工具集成 (`lyt-ai`)
  - 配置管理和模板引擎
  - 支持多种 AI 模型配置

- **Vue 3 兼容层 (@lytjs/compat)** - Vue 3 到 Lyt.js 的无缝迁移
  - Vue 3 API 兼容层
  - SFC 单文件组件转换器
  - Vue-to-Lyt 迁移工具 (`vue-to-lyt`)
  - 内置组件兼容

- **CHANGELOG 管理工具** - 完整的自动化 CHANGELOG 管理
  - `scripts/changelog.js` - CHANGELOG 管理脚本
  - 支持添加变更、发布版本、预览功能
  - 在 package.json 中添加了相关脚本命令

- **社区基础设施完善** - 提升项目可维护性
  - Issue 模板（Bug 报告、功能请求、问题咨询）
  - 贡献指南 (CONTRIBUTING.md)
  - 行为准则 (CODE_OF_CONDUCT.md)

### Fixed

- **CLI 语法错误修复** - 修复 generate.ts 中的语法错误
  - `packages/cli/src/generate.ts` - 修复 missing } 语法错误

- **CI 部署工作流修复** - 修复 develop 分支的文档部署工作流
  - `.github/workflows/deploy-docs.yml` - 工作流配置修复

### Changed

- **AI 开发工具集成** - 添加 .trae 目录下的 AI 辅助开发资源
  - API 参考文档
  - 最佳实践指南
  - 上下文提示模板
  - 快速开始指南
  - AI 集成示例

- **LLM 友好文档更新** - 更新 llms.txt 和 llms-full.txt
  - 添加最新功能说明
  - 完善 API 参考文档
  - 优化 AI 上下文信息

---

## [4.1.0] - 2026-04-27

### Added

- **基准测试基础设施完善** - 添加 Vapor Mode 基准测试和完整测试套件
  - `benchmarks/vapor.bench.js` - Vapor Mode 性能基准测试
  - `benchmarks/vdom.bench.js` - Virtual DOM 性能基准测试
  - `npm run benchmark:all` - 一键运行所有基准测试

- **文档站基础设施完善** - 添加 VitePress 配置和 GitHub Pages 部署工作流
  - 完整的 VitePress 文档站配置
  - GitHub Actions 自动部署到 GitHub Pages
  - 文档结构优化

### Fixed

- **TypeScript 错误修复** - 解决所有 TypeScript 编译错误
  - `@lytjs/renderer` - 修复 vapor-compiler.ts 中 root.children 可选类型处理
  - `@lytjs/store` - 修复 create-store.ts 中 mergeObjects 类型断言
  - `@lytjs/test-utils` - 删除冗余测试文件 (index2.ts, index3.ts, simple-test.ts)

### Changed

- **文档编码检查和更新** - 完善文档编码管理和更新
  - 检查并验证所有 68 个 Markdown 文档文件编码
  - 确认所有文档使用 UTF-8 编码，无乱码问题，中文显示正常
  - 添加 `docs:check-encoding` 脚本命令用于检查文档编码
  - 更新 `docs/README.md` - 版本更新为 4.1.0，测试数更新为 2833+，添加文档验证信息
  - 更新 `docs/project/PROJECT_SUMMARY.md` - 版本更新为 4.1.0，测试数更新为 2833+，文档数更新为 68，所有包版本更新为 4.1.0，添加 v4.1.0 发布里程碑

---

## [4.0.5] - 2026-04-27

### Changed

- **文档编码验证**: 完整检查项目中所有 67 个 Markdown 文档文件，验证均使用 UTF-8 编码，无 BOM，无乱码问题，中文显示正常
- **README.md 全面更新**: 更新了完整的项目概述，完善了功能完成度表格，更新了包结构分类和组件列表
- **docs/README.md 更新**: 完善了文档分类说明，更新了包列表信息，添加了完整的组件列表分类
- **docs/project/PROJECT_SUMMARY.md 更新**: 完善了项目概述信息，新增了完整的包列表和组件分类列表
- **编码检查**: 检查并确认所有文档文件使用 UTF-8 编码，无乱码问题，中文显示正常
- **项目分析**: 完整分析了所有 23 个包的 package.json 和源代码结构

### Added

- **添加编码检查脚本**: 创建 `check-encoding.mjs` 脚本，用于验证项目中所有 Markdown 文档文件的编码格式，自动检测并修复 BOM 问题

---

## [4.0.0] - 2026-04-17

### Breaking Changes

- **统一版本号**: 所有子包版本号统一为 4.0.0，标记 API 稳定化的首个版本
- **API 冻结**: 公共 API 进入稳定期，后续变更将严格遵循语义化版本控制

### Added

- **API 稳定化**: 冻结所有核心包的公共 API，提供稳定的开发者契约
- **语义化版本控制**: 引入严格的 semver 版本管理策略
  - 主版本号：破坏性 API 变更
  - 次版本号：向后兼容的新功能
  - 修订号：向后兼容的 Bug 修复
- **版本一致性**: 统一所有 18 个子包的版本号，消除版本碎片化

### Changed

- **CONTRIBUTING.md**: 更新仓库地址为 Gitee，更新 Node.js 要求为 >=18
- **Issue/PR 模板**: 新增 GitHub Issue 和 Pull Request 模板
- **仓库优化**: 完善 Badge、README 结构优化

## [3.2.1] - 2026-04-17

### Fixed

- **fix(cli)**: 修复 `npx @lytjs/cli create my-app` 报 `Cannot find module 'esbuild'` 错误
  - 将 `esbuild` 添加为 `@lytjs/cli` 的运行时依赖
- **fix(cli)**: 修复脚手架模板中包名错误，`"lyt"` → `"@lytjs/lytjs"`
  - 影响文件: create.ts（基础版脚手架）、scaffold.ts（增强版脚手架）
  - 修复 `npm install` 报 `No matching version found for lyt@latest` 错误
- **fix(deps)**: 修复所有包的 `workspace:*` 未替换为实际版本号的问题
  - 影响包: core, store, agg (lytjs), plugins
- **fix(deps)**: 修复多个包缺少 `@lytjs/*` 跨包依赖声明的问题
  - renderer: 添加 @lytjs/reactivity, @lytjs/vdom
  - component: 添加 @lytjs/reactivity
  - router: 添加 @lytjs/reactivity
  - components: 添加 @lytjs/component
- **fix(test)**: 更新 cli-enhanced.test.ts 断言以匹配修复后的模板输出

### Changed

- **cli**: dev.ts 和 build.ts 添加 esbuild 缺失时的友好错误提示
- **build**: 构建脚本新增 Step 1.5 依赖一致性校验
- **publish**: 发布脚本改进 workspace:* 处理（备份+精确还原，避免 sed 误替换）
- **readme**: 重写 README.md（Badge、组合式 API 示例、架构图、迁移说明）

## [3.2.0] - 2026-04-17

### Added

- **npm 发布准备**
  - 所有 18 个子包 package.json 统一完善（version/description/exports/files/keywords/repository/homepage/publishConfig）
  - 版本号统一为 3.2.0
  - 仓库地址统一为 https://gitee.com/lytjs/lytjs
  - @lytjs/lytx 包 exports 配置完善（条件导出 types/import/require/default）

- **CI/CD 增强**
  - ci.yml：添加并发控制、pnpm v9、缓存策略、lint job、构建 artifact
  - release.yml：拆分为 build-and-test/publish-npm/sync-gitee/github-release 四个 job
  - 新增 scripts/build-all.sh：统一构建脚本（esbuild 打包 + 类型声明 + 体积报告）

- **文档站更新**
  - 仓库地址从 GitHub 改为 Gitee
  - 新增 API 文档：web-component.md、devtools.md、plugin.md
  - 新增指南文档：vapor-mode.md
  - 更新 SSR 指南：添加 Islands Architecture + Partial Hydration 章节
  - 首页 features 从 6 个扩展到 12 个

### Changed

- 仓库地址全局替换：gitee.com/idcu/lytjs → gitee.com/lytjs/lytjs（20 处）
- 文档站 editLink 指向 Gitee

## [3.1.0] - 2026-04-17

### Added

- **Web Component 适配器** (`@lytjs/core/web-component`)
  - `defineCustomElement` — 将 Lyt.js 组件注册为 Custom Element
  - `registerComponents` / `unregisterElement` — 批量注册/注销
  - Shadow DOM 渲染（open/closed 模式）
  - 属性观察与类型转换（string/number/boolean/JSON）
  - 事件转发（Lyt event → CustomEvent）
  - Slot 转发、生命周期管理
  - `defineCustomElementFromSFC` — 从 SFC 源码创建 Web Component
  - 42 个测试用例

- **WASM 浏览器端编译器模拟** (`@lytjs/compiler/wasm`)
  - `WasmCompiler` — 浏览器端模板编译器（tokenizer + AST + codegen）
  - `WasmParser` — 浏览器优化的 HTML tokenizer 和 AST builder
  - `WasmGenerator` — 浏览器优化的代码生成器（静态提升 + patch flags）
  - `WasmPlayground` — Playground 集成（compileToFunction + hotReload）
  - 25 个测试用例

- **插件系统增强** (`@lytjs/core/plugin`)
  - 插件去重安装（同一插件只安装一次）
  - `app.unuse(plugin)` 插件卸载支持
  - `app.isInstalled(plugin)` 插件状态查询
  - 异步插件支持（install 返回 Promise）
  - 插件生命周期钩子（onBeforeInstall / onInstalled）
  - 插件元数据（name 属性用于调试）
  - 46 个测试用例

- **错误码系统扩展** (`@lytjs/core/error-codes`)
  - CLI 模块错误码（8001-8005）
  - DevTools 模块错误码（9001-9004）
  - Plugin 模块错误码（10001-10004）
  - SSR 模块错误码（11001-11004）
  - 错误码总数：39 → 56（+17 个）
  - 16 个测试用例

- **DevTools 增强** (`@lytjs/devtools`)
  - `MemoryTracker` — 内存使用追踪器（快照/趋势/泄漏检测/报告）
  - `RenderTracker` — 组件渲染追踪器（慢渲染检测/统计/时间线）
  - `BatchAnalyzer` — 批量操作分析器（统计/异常检测）
  - 37 个测试用例

- **组件库测试完善** (`@lytjs/components`)
  - 7 个缺失测试的组件全部补充：Icon、Link、Container、Divider、Breadcrumb、Spin、Empty
  - 47 个测试用例

- **plugin-logger 测试** (`@lytjs/plugin-logger`)
  - 完整的日志插件单元测试（56 个测试用例）
  - 覆盖：日志级别、级别过滤、FIFO 限制、销毁、自定义格式、transport、持久化

- **plugin-auth 测试** (`@lytjs/plugin-auth`)
  - 完整的认证插件单元测试（70+ 个测试用例）
  - 覆盖：Token 管理、角色/权限检查、路由守卫、登录/登出/注册、回调函数

- **测试框架增强** (`@lytjs/test-utils`)
  - 新增 `toBeGreaterThanOrEqual` 断言方法
  - 新增 `toBeLessThanOrEqual` 断言方法

### Fixed

- 修复 benchmark 测试与 web-component 测试的 mock DOM 冲突（28 个测试失败 → 0）
- 修复 MemoryTracker 泄漏检测的时间戳精度问题

### Changed

- 测试用例：1241 → 1353（+112 个新测试）
- 错误码：39 → 56（+17 个）
- LytX 大小写修正：lytx → LytX（用户面向文本，包名/路径保持小写）

## [3.0.0] - 2026-04-17

### Added

- **Vapor Mode 实验性渲染器** (`@lytjs/renderer/vapor`)
  - 直接 DOM 操作，绕过 Virtual DOM
  - `createVaporApp` / `defineVaporComponent` 组件系统
  - `bindText` / `bindProp` / `bindAttr` / `bindClass` / `bindEvent` / `bindIf` / `bindEach` 响应式绑定
  - `compileToVapor(template)` 模板编译器
  - Signal 集成，细粒度更新

- **编译器优化** (`@lytjs/compiler`)
  - 静态节点提升（Static Hoisting）— 静态子树只创建一次
  - Patch Flags — 精确标记动态节点类型（TEXT/CLASS/STYLE/PROPS/EVENT 等 14 种）
  - Block Tree — 追踪动态子节点，跳过静态节点
  - Tree-shaking 友好输出 — 具名 import 辅助函数

- **js-framework-benchmark 接入** (`benchmarks/`)
  - Keyed 列表基准测试（1000 行 CRUD 操作）
  - Non-keyed 列表基准测试
  - 自包含 IIFE bundle（`window.LytBenchmark`）
  - MockElement 测试框架（Node.js 环境模拟 DOM）

- **Signal 作为可选响应式模式** (`@lytjs/component`)
  - `reactivityMode: 'signal'` 组件选项
  - `createSignalState` / `createSignalStateProxy` 自动解包/设置
  - Signal 模式 computed/watch 集成
  - 默认仍为 `'proxy'`，完全向后兼容

- **SSR 部分注水（Islands Architecture）** (`@lytjs/renderer`)
  - `hydrateIsland` / `hydrateAllIslands` 选择性注水
  - `createHydrationIsland` 服务端生成 island HTML
  - 懒注水策略：`visible`（视口）/ `idle`（空闲）/ `interaction`（交互）
  - Hydration Mismatch 检测（开发模式）
  - `registerIslandComponent` / `unmountIsland`

- **LytX API Routes + 中间件** (`@lytjs/lytx`)
  - 文件式 API 路由（`src/pages/api/*.ts`）
  - 动态参数 `[id]` 和 catch-all `[...path]`
  - 5 个内置中间件：CORS / Logger / BodyParser / Auth / RateLimit
  - 中间件链执行 + 路径特定配置
  - CLI dev/build 集成

- **组件库主题系统** (`@lytjs/components`)
  - `ThemeConfig` 接口（色彩/字体/间距/圆角/阴影）
  - 亮色/暗色默认主题 + `createTheme` 自定义
  - 28 个 CSS 变量（`--lyt-*` 前缀）
  - `ThemeProvider` 组件（localStorage 持久化 + 系统偏好检测）
  - `useTheme()` Hook
  - 20 个组件更新为 CSS 变量

- **CLI 项目脚手架 + HMR** (`@lytjs/cli`)
  - `lytx create <name>` 支持 SPA/SSR/SSG 模板
  - 可选功能：TypeScript / Router / Store / ESLint
  - HMR 服务器（WebSocket + fs.watch）
  - CSS 热交换 / 组件热更新 / 全量刷新
  - `lytx preview` 预览命令

### Changed

- 测试用例：736 → 1126（+390 个新测试）
- Vapor Mode 69 个测试
- 编译器优化 51 个测试
- Benchmark 34 个测试
- Signal 状态 40 个测试
- Hydration 33 个测试
- LytX API Routes 49 个测试
- 主题系统 62 个测试
- CLI 增强 45 个测试

## [2.0.0] - 2026-04-17

### Added

- **LytX 元框架** (`@lytjs/lytx`)
  - 文件路由系统（index/静态/嵌套/动态 `[slug]`/catch-all `[...slug]`）
  - 三种渲染模式：SSR（实时渲染）、SSG（静态预渲染）、SPA（客户端路由）
  - 布局系统（默认布局 + 自定义布局）
  - 页面模块加载器（组件/layout/title/head/loader）
  - CLI 命令：`lytx dev` / `lytx build` / `lytx preview`
  - 配置文件：`lytx.config.ts`

- **Signal 响应式实验** (`@lytjs/reactivity`)
  - `signal<T>(initialValue)` — 细粒度可写信号，Object.is 比较
  - `computedSignal<T>(fn)` — 惰性求值计算信号，自动依赖追踪
  - `signalEffect(fn)` — 自动追踪副作用，支持 cleanup
  - `batch(fn)` — 批量更新，嵌套支持
  - `untrack<T>(fn)` — 无订阅读取
  - 循环依赖检测
  - 组件集成：`useSignal` / `useSignalState`

- **错误处理系统** (`@lytjs/core`)
  - `LytErrorCodes` 枚举：7 大类 39 个错误码（COMPILER/RENDERER/COMPONENT/ROUTER/STORE/REACTIVITY/CORE）
  - `LytError` 类：code/category/details/loc
  - `createCompilerError` / `createRendererError` / `createComponentError` 工厂函数
  - `warn` / `warnOnce` / `error` 工具（开发模式切换）
  - `formatError` / `getComponentStack` / `createErrorOverlay` 开发模式增强
  - ErrorBoundary 增强：异步错误捕获、maxErrorCount 自动禁用、onReset 回调

- **DevTools 增强** (`@lytjs/devtools`)
  - `EventPanel` — 事件捕获面板（过滤/暂停/导出 JSON，200 条环形缓冲区）
  - `RouterPanel` — 路由检查面板（当前路由/导航历史/详情查看）
  - `VirtualComponentTree` — 虚拟滚动组件树（1000+ 节点不卡顿）

- **在线 Playground** (`playground/`)
  - 代码编辑器（行号/Tab/自动缩进/括号补全/Ctrl+Enter 运行）
  - 实时预览 iframe（沙箱隔离/console 拦截/错误捕获）
  - 5 个内置示例（Hello World/计数器/Todo/模板语法/响应式系统）
  - 自包含 Lyt.js 运行时 bundle
  - 暗色主题（Catppuccin Mocha 风格）

- **CI/CD 流水线**
  - GitHub Actions CI：test（Node 18/20/22 矩阵）/ type-check / build / size-check
  - GitHub Actions Release：tag 触发自动发布 npm
  - `CONTRIBUTING.md` 贡献指南
  - `SECURITY.md` 安全策略
  - `.github/CODEOWNERS`

- **npm 发布准备**
  - 17 个 package.json 标准化（@lytjs/ 作用域、ESM+CJS 双格式、条件导出）
  - `scripts/build.sh` — esbuild 构建（支持 --filter 单包）
  - `scripts/publish.sh` — 按依赖顺序发布（支持 --dry-run）
  - `.npmrc` / `.npmignore` 配置

### Changed

- 测试用例：488 → 736（+248 个新测试）
- 所有包版本统一升级至 2.0.0
- 根 package.json 版本升级至 2.0.0

## [1.5.0] - 2026-04-17

### Added

- **流式 SSR** (`@lytjs/renderer`)
  - `renderToStream(vnode, options?)` — 返回 ReadableStream，支持分块 HTML 输出
  - `renderToStreamGenerator(vnode, options?)` — 返回 AsyncGenerator，轻量级异步生成器
  - `renderToString(vnode)` — 独立函数形式导出
  - Suspense 集成：先输出 fallback，异步解析后替换为真实内容

- **Suspense 组件增强** (`@lytjs/component`)
  - 支持 `default` / `fallback` 插槽
  - 追踪待处理异步后代（`pendingDescendants`）
  - `onPending` / `onResolve` / `onFallback` 回调

- **defineAsyncComponent 增强** (`@lytjs/component`)
  - 支持 `loadingComponent`、`errorComponent`、`delay`、`timeout`、`onError`、`retryCount`
  - 暴露 `_isAsyncComponent` / `__asyncSetup` / `__suspense` 标记

- **性能监控** (`@lytjs/devtools`)
  - `PerformanceCollector` 类：FCP/INP/组件渲染时间/更新频率/内存使用/自定义计时/FPS 监控
  - `ComponentProfiler` 类：组件级性能分析，慢渲染自动检测（>16ms）
  - 环形缓冲区（RingBuffer）防止内存泄漏
  - `getReport()` / `exportJSON()` 报告导出
  - `PerfPanel` 增强：实时 FPS、组件渲染排名、录制控制

- **组件库 v2** (`@lytjs/components`) — 新增 12 个生产级组件
  - `DataTable` — 数据表格（排序、斑马纹、悬浮高亮、加载状态）
  - `Form` — 表单容器（验证规则、提交/重置）
  - `DatePicker` — 日期选择器（日历弹出、日期范围、格式配置）
  - `Dialog` — 对话框（插槽、遮罩关闭、ESC 关闭、动画）
  - `Notification` — 通知提示（自动消失、6 种位置、4 种类型、堆叠管理）
  - `Popover` — 弹出提示（4 种位置、延迟、hover/click/focus 触发）
  - `TabNav` — 标签导航（line/card/segment 类型、懒加载、可关闭）
  - `Collapse` — 折叠面板（手风琴模式、多项展开）
  - `Dropdown` — 下拉选择（搜索过滤、多选、禁用选项）
  - `Toggle` — 切换开关（加载状态、自定义值）
  - `CountBadge` — 计数徽标（状态点模式、maxCount）
  - `Pager` — 分页器（pageSize 选择器、maxPageButtons）

- **TypeScript 类型声明**
  - 8 个核心包生成 `.d.ts` 文件（`dist/types/`）
  - `npm run types` 一键生成所有声明文件
  - 聚合包 `lyt` 手动编写声明文件，引用各核心包声明

- **AI 友好文档**
  - `/llms.txt` — 精简版 AI 助手摘要（~150 行）
  - `/llms-full.txt` — 完整 API 参考文档（含类型签名和示例）

- **VitePress 文档站** (`docs-site/`)
  - 首页（Hero + Features）
  - 8 个指南页面（快速开始/模板语法/响应式/组件/路由/Store/SFC/SSR）
  - 6 个 API 参考页面
  - 3 个示例页面（计数器/Todo 应用/主题切换）
  - 本地搜索、蓝靛蓝主题

### Fixed

- **测试运行器** — `runAll()` 改用 `.then()` 确保 Promise 被等待
- **reactive.test.ts** — 汇总标题改为 `--- 响应式系统自测结果 ---` 避免与 `runAll()` 冲突
- **SSR 测试** — 修复 `defineAsyncComponent 重试机制` 测试中永不 resolve 的 Promise
- **test-runner.ts** — 移除 `reactive.test.ts` 重复导入

### Changed

- 测试用例：400 → 488（+88 个新测试）
- `@lytjs/devtools` 新增 30 个性能监控测试
- `@lytjs/components` 新增 48 个组件测试
- `@lytjs/renderer` 新增 22 个 SSR 增强测试

## [1.1.0] - 2026-04-17

### Fixed

- **测试基础设施** (`@lytjs/test-utils`)
  - 修复 Store 测试重复运行 14 次的问题（各测试文件不再自行调用 `runAll()`，由 `test-runner.ts` 统一调度）
  - 修复 Store 测试间状态污染（新增 `clearAllStores()` API，`afterEach` 自动清理注册表）
  - 测试结果：400 个用例全部通过，0 失败

- **create-store.ts** (`@lytjs/store`)
  - 删除模块 getters 中残留的 `console.log('[DEBUG]...')` 调试日志（第 246-248 行）
  - 修复 `$reset()` 不重置 modules 状态的缺陷（改用 `mergedInitialState` 替代 `initialState`）
  - 新增 `clearAllStores()` 导出（用于测试环境清理）

- **define-component.ts** (`@lytjs/component`)
  - computed 改用 `@lytjs/reactivity` 的 `computed()` 替代手动脏标记机制，实现自动依赖追踪和精确缓存失效
  - watch 改用 `@lytjs/reactivity` 的 `watch()` 实现自动触发，`immediate`/`deep` 选项现在真正生效
  - state 使用 `shallowReactive()` 包装，使 computed/watch 能自动追踪顶层属性变化
  - `$setState()` 现在触发组件更新通知
  - `$forceUpdate()` 委托给渲染器的 update 回调
  - 同步更新 keep-alive.ts 的 `SavedComponentState` 接口和 save/restore 逻辑

### Changed

- **create-app.ts** (`@lytjs/core`) — 架构重构（评分 4.8→8.0+）
  - 删除与 `@lytjs/component` 重复的 `createComponentInstance`/`renderComponent`/`renderVNode`
  - 委托给 `@lytjs/component` 的 `defineComponent`/`setupComponent`/`mountComponent`
  - 委托给 `@lytjs/renderer` 的 `createRenderer` 工厂函数
  - 新增响应式更新机制（`effect` 包装渲染逻辑，state 变化自动触发重新渲染）
  - 新增 `adaptComponentOptions()` 适配器兼容旧式组件选项
  - 新增 `createMinimalDOMRenderer()` 最小 DOM 操作适配器
  - 消除所有直接 DOM 操作（`document.createElement`/`el.innerHTML` 等）

- **renderer.ts** (`@lytjs/renderer`) — 文件拆分（1059 行→7 个聚焦模块）
  - `vnode.ts` — VNode 接口、ShapeFlags/PatchFlags 枚举、辅助函数
  - `renderer-interfaces.ts` — LytRenderer/RendererInstance 接口
  - `patch.ts` — patch 主函数及子节点更新逻辑
  - `mount.ts` — 挂载相关逻辑
  - `unmount.ts` — 卸载相关逻辑
  - `props.ts` — 属性处理逻辑
  - `create-renderer.ts` — createRenderer 工厂函数

### Added

- **codegen.ts** (`@lytjs/compiler`)
  - `wrapExpression` 修复字符串字面量中标识符被错误替换的边界问题（引入占位符机制）
  - 新增 `$event`/`$refs`/`$el` 等特殊标识符保护（不会被加 `_ctx.` 前缀）
  - `capitalize` 支持 kebab-case → camelCase 转换（`key-down` → `KeyDown`）

### Changed

- 所有 17 个子包版本统一升级至 1.1.0
- 根 package.json 版本升级至 1.1.0
- 聚合包 `lyt` 新增 `repository`/`keywords`/`homepage` 元数据

## [1.0.0] - 2026-04-16

### Added

- **Composition API** (`@lytjs/component`)
  - `setup()` 函数 — 在 defineComponent 中使用组合式 API
  - `onMounted()` / `onUnmounted()` / `onUpdated()` / `onBeforeMount()` / `onBeforeUnmount()` — 生命周期钩子
  - `provide()` / `inject()` — 跨组件状态共享（支持多层嵌套）
  - `getCurrentInstance()` — 获取当前组件实例
  - `runSetup()` — setup 执行器
  - 与 Options API 完全兼容（setup + init/state/methods 可共存）
  - 34 个测试用例

- **NativeRenderer 完善** (`@lytjs/renderer/native`)
  - `LytRendererPlatform` 标准接口定义
  - `createNativeRenderer()` 工厂函数
  - 标签到原生组件映射（div→View, span→Text, img→Image 等）
  - CSS 样式到原生样式转换（flexbox/color/fontSize/px）
  - 事件映射（onClick→onPress）
  - 36 个测试用例

- **MiniApp Renderer 完善** (`@lytjs/renderer/miniapp`)
  - `createMiniAppRenderer()` 工厂函数
  - 三端支持：微信 WXML / 支付宝 AXML / 字节 TTML
  - 平台特定语法：列表渲染/条件渲染/事件绑定
  - 事件存储修复（平台中性名称 + 序列化时加前缀）
  - 37 个测试用例

### Changed

- **迁移指南** (`docs/migration-guide.md`) — v0.x → v1.0 破坏性变更和升级步骤
- **API 稳定性声明** (`docs/api-stability.md`) — 稳定 API 和实验性 API 清单
- **响应式架构评估** (`docs/reactivity-evaluation.md`) — VDOM vs Signals 决策分析
- **CONTRIBUTING.md 更新** — Composition API/SFC/插件贡献指南

### Changed

- **20/20 测试文件 100% 通过**
- 新增测试：Composition API(34) + NativeRenderer(36) + MiniApp(37) = **107 个新测试用例**
- 总测试用例数：**590+**

---

## [0.4.0] - 2026-04-16

### Added

- **聚合包 `lyt`** (`packages/agg/`)
  - 一键安装所有运行时能力：`npm install lyt`
  - 聚合导出 core/reactivity/compiler/renderer/component/router/store 全部公共 API

- **组件主题系统** (`@lytjs/components`)
  - `applyTheme()` / `getTheme()` / `resetTheme()` — CSS 自定义属性主题切换
  - `createDarkTheme()` — 暗色主题预设
  - `generateThemeCSS()` — 生成 `:root` CSS 字符串
  - `mergeThemes()` — 合并多个主题覆盖
  - 20 个 CSS 变量覆盖品牌色/功能色/中性色/圆角/阴影/字体

- **组件预览页** (`playground/components-preview.html`)
  - 22 个组件可视化展示，按分类导航
  - 亮色/暗色主题切换
  - 响应式布局

- **DevTools 路由面板** (`@lytjs/devtools`)
  - `RoutePanel` — 显示当前路由路径/参数/查询字符串
  - 导航历史记录（最多 50 条，含时间戳）

- **DevTools 性能面板** (`@lytjs/devtools`)
  - `PerfPanel` — 组件渲染耗时统计
  - 支持按总耗时排序、颜色编码（绿/黄/橙/红）
  - 汇总统计：总渲染次数/总耗时/组件数

- **ErrorBoundary 组件** (`@lytjs/component`)
  - 捕获子组件渲染错误，显示降级 UI
  - 支持 fallback slot/prop 和 onError 回调
  - `captureError()` / `resetError()` / `getErrors()` 方法

- **错误码体系扩展** (`@lytjs/core`)
  - 26 个错误码覆盖所有模块（核心/组件/响应式/编译器/渲染器/路由/Store）
  - `createLytError()` 工厂函数
  - `warnOnce()` 去重警告
  - `resetWarnedMessages()` 重置去重集合

- **i18n 增强** (`@lytjs/plugin-i18n`)
  - `loadLocaleMessages()` — 懒加载翻译包
  - `mergeLocaleMessages()` — 合并翻译
  - `onLocaleChange()` — 语言变更监听器

- **auth 增强** (`@lytjs/plugin-auth`)
  - `refreshToken()` — Token 刷新（支持回调配置）
  - `hasRole()` / `hasPermission()` — 权限检查

### Changed

- **统一 16 个包的 package.json** — 标准化 name/version/main/module/types/exports/sideEffects/files
- **版本号统一为 0.3.0** → 现更新为 0.4.0

### Changed

- **18/18 测试文件 100% 通过**
- 新增测试：error-handling(26) + i18n(30) + auth(24) + components(50) = **130 个新测试用例**
- 总测试用例数：~480+

---

## [0.3.0] - 2026-04-16

### Added

- **SFC 单文件组件** (`@lytjs/compiler`)
  - `parseSFC()` — 解析 `.lyt` 文件为描述符（template/script/style 块提取）
  - `compileSFC()` — 编译 SFC 为 JS 模块（template 编译 + script 合并 + scoped CSS）
  - `scopeCSS()` — CSS 选择器改写（支持嵌套/媒体查询/伪元素/@keyframes 跳过）
  - 支持 `<style scoped>` 样式隔离（data-v-xxx 属性）
  - 24 个 SFC 测试用例

- **SSR 渲染增强** (`@lytjs/renderer`)
  - `renderToString()` 完整支持所有 VNode 类型（Element/Text/Comment/Fragment/Component/Slot）
  - `renderSlotsToString()` — 插槽内容服务端渲染
  - `hydrate()` 增强：组件注水、注释节点注水、注水统计
  - `getHydrateStats()` / `resetHydrateStats()` — 注水统计 API
  - 39 个新 SSR 测试用例（总计 69 个）

- **KeepAlive 状态保存/恢复** (`@lytjs/component`)
  - `saveComponentState()` / `restoreComponentState()` — 组件状态快照
  - `registerKeepAliveInstance()` / `attachCacheRef()` — 渲染器集成 API
  - 支持 include/exclude/max LRU 配置
  - 31 个 KeepAlive 测试用例

- **Router 响应式集成** (`@lytjs/router`)
  - `currentRoute` 改为 `Ref<Route>` 类型，自动响应式
  - `params`/`query`/`meta` 深层响应式
  - 5 个响应式集成测试用例

### Fixed

- **computed 链式依赖** — 修复嵌套 computed 级联更新不触发的问题（deps 集合未正确填充）
- **Router 导航守卫** — 暴露内部守卫数组，修复 beforeEach/afterEach/beforeResolve 不执行的问题
- **Router redirect** — 清理类型断言，使用公共属性访问守卫

### Changed

- **CLI esbuild 集成** (`@lytjs/cli`)
  - `dev.ts`: 用 esbuild `transformSync` 替换 ~90 行正则 TS 编译
  - `build.ts`: 用 esbuild `build()` 替换 ~400 行手动打包器（含依赖图/压缩/SourceMap）
  - HMR WebSocket / HTTP 服务器 / 文件监听功能保持不变

### Changed

- **全部 15 个测试文件 100% 通过**
- 新增测试：SFC(24) + SSR(39) + KeepAlive(31) + Router 响应式(5) = **99 个新测试用例**
- 总测试用例数：~350+

---

## [0.2.0] - 2026-04-16

### Fixed

- **消除 `new Function` + `with` 安全风险** (`@lytjs/core`, `@lytjs/compiler`)
  - 编译器 codegen 改为生成 `_ctx.xxx` 形式的代码，不再依赖 `with` 作用域
  - 运行时使用安全的 `new Function('h', '_ctx', 'return ' + code)` 替代 `with(ctx){ return code }`
  - 添加 `compileToFunction` 缓存机制，避免重复编译
  - 修复 codegen 中 props/children 位置错误的 bug

### Changed

- **Store 消除重复代码** (`@lytjs/store`)
  - 删除 ~280 行内置响应式系统，改为使用 `@lytjs/reactivity` 包
  - `$subscribe` 改为基于 `watch` + 快照对比实现
  - `use()` 方法重命名为 `$expose()` 避免与插件 `use()` 冲突
  - Store 行数从 775 行减少到 ~596 行

### Added

- **esbuild 打包系统** (`scripts/esbuild-bundle.js`)
  - 引入 esbuild 作为构建工具（唯一允许的构建依赖）
  - 支持 ESM (.mjs) + CJS (.cjs) 双格式输出
  - 启用 tree-shaking + minification
  - 核心 8 包独立打包，`@lytjs/*` 内部包标记为 external
  - 核心 8 包 ESM gzip 总计 **34.56 KB**（reactivity 2.86 KB 最小）
- **CI/CD 流水线** (`.github/workflows/`)
  - CI: push/PR 自动触发 lint + build + test + bundle + size-check
  - Release: tag 推送自动发布 npm + 创建 GitHub Release
  - 支持 Node.js 18/20/22 矩阵测试
- **安全策略** (`SECURITY.md`)
  - 漏洞报告渠道和支持版本信息
- **reactive 数组方法拦截** (`@lytjs/reactivity`)
  - 搜索方法（includes/indexOf/lastIndexOf）正确追踪每个元素的依赖
  - 变异方法（push/pop/shift/unshift/splice/sort/reverse）暂停追踪避免内部重复收集
  - 新增 `pauseTracking()` / `resetTracking()` 工具函数
- **reactive API 补全**
  - 修复 `triggerRef` 使用错误 target 的问题
  - 新增 20 个测试用例覆盖数组方法/shallowReactive/toRaw/isReactive/triggerRef

### Fixed

- **defineComponent computed 支持** — 支持 `{ get, set }` 对象和函数简写两种格式
- **slots normalizeSlotValue** — 简单值（字符串/数字）不再包装为数组
- **devtools 重复导出** — 移除 `DevTools` 类的重复 export
- **components 包缺失 import** — 为 22 个组件文件添加 `import { defineComponent }` 导入
- **camelizeToHyphen 测试断言** — 修正错误的期望值
- **测试框架 runAll** — 执行后清空 suites，支持多次调用
- **包间导入** — 所有 `@lytjs/*` 导入改为相对路径，解决 tsx 运行时解析问题

#### 体积报告（esbuild + minify + gzip）

| 包 | ESM gzip | CJS gzip |
|----|----------|----------|
| @lytjs/reactivity | 2.86 KB | 3.06 KB |
| @lytjs/vdom | 3.57 KB | 3.81 KB |
| @lytjs/compiler | 4.60 KB | 4.82 KB |
| @lytjs/renderer | 9.56 KB | 9.77 KB |
| @lytjs/component | 5.96 KB | 6.15 KB |
| @lytjs/core | 4.12 KB | 4.33 KB |
| @lytjs/router | 2.62 KB | 2.84 KB |
| @lytjs/store | 1.27 KB | 1.46 KB |
| **总计** | **34.56 KB** | **36.25 KB** |

---

## [0.1.0] - 2025-01-01

### Added

#### 核心引擎
- **响应式系统** (`@lytjs/reactivity`)
  - `reactive` / `readonly` / `shallowReactive` — 深层/只读/浅层响应式代理
  - `ref` / `shallowRef` — 引用类型响应式
  - `computed` — 计算属性（支持只读和可写）
  - `watch` / `watchEffect` — 侦听器
  - `effect` / `stop` — 副作用系统
  - `nextTick` — 微任务调度
  - `toRaw` / `isReactive` / `isReadonly` / `isRef` / `unref` / `toRef` / `toRefs` — 工具函数
- **模板编译器** (`@lytjs/compiler`)
  - `compile` — 完整编译流程（parse -> transform -> optimize -> generate）
  - `parseHTML` — HTML 模板解析器
  - `transform` — AST 语义转换
  - `optimize` / `isStatic` — 静态分析与优化
  - `generate` — 渲染函数代码生成
  - 编译器指令：`if` / `each` / `bind` / `on` / `ref` / `slot`
- **虚拟 DOM** (`@lytjs/vdom`)
  - `createVNode` / `createTextVNode` / `createCommentVNode` — VNode 创建
  - `patch` — Diff 主流程
  - `patchKeyedChildren` / `patchUnkeyedChildren` — 列表 Diff（含 LIS 算法）
  - `openBlock` / `closeBlock` / `createBlock` — Block Tree 优化
  - `PatchFlags` / `ShapeFlags` — 位标记系统

#### 渲染器
- **渲染器抽象层** (`@lytjs/renderer`)
  - `createRenderer` — 渲染器工厂函数
  - `LytRenderer` 接口 — 平台无关的渲染操作抽象
  - `DOMRenderer` — DOM 平台实现
  - DOM 操作辅助：`setDOMProp` / `patchClass` / `patchStyle` / `patchEvent` 等
  - 事件系统：`normalizeEventName` / `createInvoker` / `patchEvent` 等
- **SSR 渲染器** — 服务端渲染支持（hydration / ssr-renderer）

#### 应用层
- **组件系统** (`@lytjs/component`)
  - `defineComponent` — 选项式组件定义
  - 组件实例管理：`createComponentInstance` / `setupComponent` / `mountComponent` / `updateComponent` / `unmountComponent`
  - Props 系统：`normalizePropsOptions` / `validateProp` / `initProps`
  - 事件发射：`emit` / `normalizeEmits`
  - 生命周期：`onInit` / `onMounted` / `onBeforeUpdate` / `onUpdated` / `onBeforeUnmount` / `onUnmounted`
  - 插槽系统：`initSlots` / `renderSlot` / `hasSlot`
- **路由系统** (`@lytjs/router`)
  - `createRouter` — 路由实例创建（支持 history / hash 模式）
  - `createWebHistory` / `createHashHistory` — History 管理
  - `createRouteMatcher` — 路径匹配引擎（支持动态参数和通配符）
  - 导航守卫：`beforeEach` / `afterEach` / `beforeResolve`
  - 编程式导航：`push` / `replace` / `go` / `back` / `forward`
- **状态管理** (`@lytjs/store`)
  - `createStore` — 创建 Store（响应式状态 + 计算属性 + 操作方法）
  - `getStore` / `getStoreIds` — Store 注册表查询
  - Store API：`$reset` / `$subscribe` / `$dispose` / `$patch`
- **核心入口** (`@lytjs/core`)
  - `createApp` — 应用创建与挂载
  - `h` — 渲染函数
  - `Fragment` — 多根节点支持
  - 插件系统：`installPlugin` / `createProvidesContext`
  - 依赖注入：`provide` / `inject`
  - 全局 API：`component` / `directive`

#### 开发工具
- **CLI 工具** (`@lytjs/cli`)
  - `lyt create <name>` — 创建新项目
  - `lyt dev` — 启动开发服务器（HMR / TypeScript 即时编译）
  - `lyt build` — 构建生产版本（压缩 / Source Map / 静态资源复制）
- **DevTools** (`@lytjs/devtools`)
  - 组件树检查器
  - 状态检查器
  - 事件追踪器
  - 时间旅行调试器
  - 可拖拽浮动面板

#### 其他
- **基准测试** — 响应式系统和虚拟 DOM 的性能基准测试
- **演示示例** — 基础示例和 TodoMVC 应用
- **构建脚本** — TypeScript 编译与包构建
