# Lyt.js v4.2.0 发展建议与详细开发文档

> **版本**：4.2.0 | **更新日期**：2026-04-27
>
> **项目定位**：轻写轻跑，所见即代码 -- 纯原生、零运行时依赖、超轻量前端框架

---

## 目录

- [一、项目概况](#一项目概况)
- [二、v4.2.0 新增特性](#二v420-新增特性)
  - [2.1 AI 集成 (@lytjs/ai)](#21-ai-集成-lytjsai)
  - [2.2 Vue 3 兼容层 (@lytjs/compat)](#22-vue-3-兼容层-lytjscompat)
  - [2.3 社区基础设施](#23-社区基础设施)
  - [2.4 工程化改进](#24-工程化改进)
- [三、竞品对比分析](#三竞品对比分析)
  - [3.1 综合评分表](#31-综合评分表)
  - [3.2 核心优势](#32-核心优势)
  - [3.3 差距分析](#33-差距分析)
- [四、发展建议 (P0-P3)](#四发展建议-p0-p3)
  - [P0 - 生态破冰（1-3 个月）](#p0---生态破冰1-3-个月)
  - [P1 - 核心完善（3-6 个月）](#p1---核心完善3-6-个月)
  - [P2 - 生态扩展（6-12 个月）](#p2---生态扩展6-12-个月)
  - [P3 - 长远规划（12 个月+）](#p3---长远规划12-个月)
- [五、详细开发文档](#五详细开发文档)
  - [5.1 代码推送流程](#51-代码推送流程)
  - [5.2 版本发布流程](#52-版本发布流程)
  - [5.3 文档同步更新](#53-文档同步更新)
  - [5.4 清理临时文件](#54-清理临时文件)
  - [5.5 编码问题注意事项](#55-编码问题注意事项)
  - [5.6 测试指南](#56-测试指南)
  - [5.7 任务完成检验清单](#57-任务完成检验清单)
  - [5.8 包结构说明](#58-包结构说明)
  - [5.9 常见问题 FAQ](#59-常见问题-faq)

---

## 一、项目概况

| 项目属性 | 详情 |
|:---|:---|
| **项目名称** | Lyt.js -- 轻写轻跑，所见即代码 |
| **当前版本** | 4.2.0 |
| **许可证** | MIT License |
| **作者** | idcu |
| **子包数量** | 24 个 |
| **TypeScript 代码行数** | 101,113 行 |
| **测试用例** | 4,488 个 |
| **核心运行时体积** | 34.56 KB (ESM gzip, 8 个核心包) |
| **运行时依赖** | **0 个**（纯原生实现） |
| **构建工具** | esbuild（唯一构建依赖） |
| **Node.js 要求** | >= 18.0.0 |

### 核心特性概览

| 特性 | 状态 | 说明 |
|:---|:---:|:---|
| 响应式系统 | ✅ | Proxy + Signal 双模式 |
| 模板编译器 | ✅ | HTML 解析 / AST / 静态提升 / Patch Flags |
| 虚拟 DOM | ✅ | Block Tree + LIS 最长递增子序列算法 |
| 渲染器 | ✅ | DOM / SSR / Vapor 三种模式 |
| 组件系统 | ✅ | defineComponent / 生命周期 / 插槽 / KeepAlive / Suspense |
| 路由 | ✅ | History / Hash 双模式 + 导航守卫 |
| 状态管理 | ✅ | Pinia 风格 API |
| UI 组件库 | ✅ | 38+ 组件 + 主题系统 |
| CLI 工具 | ✅ | create / dev / build / generate |
| DevTools | ✅ | 性能采集 / 组件树 / 时间旅行调试 |
| AI 集成 | ✅ | lyt-ai CLI / OpenAI & Anthropic 支持 |
| Vue 3 兼容层 | ✅ | 完整 API 映射 + SFC 转换器 |
| 元框架 (LytX) | ✅ | SSR / SSG / SPA / API Routes |
| Web Component | ✅ | defineCustomElement + Shadow DOM |
| 小程序渲染器 | ⏳ | 规划中 |
| 原生移动端渲染器 | ⏳ | 规划中 |

### 架构总览

```
应用层 (App Layer)
├── @lytjs/core       — createApp, 插件系统, 全局 API
├── @lytjs/router     — 内置路由
├── @lytjs/store      — 状态管理
├── @lytjs/components — UI 组件库
├── @lytjs/lytx       — 元框架
├── @lytjs/ai         — AI 辅助开发
└── @lytjs/compat     — Vue 3 兼容层

核心引擎层 (Engine Layer)
├── @lytjs/reactivity — Proxy 响应式 + Signal
├── @lytjs/compiler   — 模板编译 (parse -> transform -> optimize -> generate)
├── @lytjs/vdom       — 虚拟 DOM (Block Tree + Patch Flag + LIS diff)
├── @lytjs/component  — 组件系统 (defineComponent, Composition API)
└── @lytjs/common     — 公共工具库

平台适配层 (Platform Adapter)
├── DOM Renderer      — 浏览器
├── SSR Renderer      — 服务端
├── Vapor Renderer    — 无虚拟 DOM 编译
├── Native Renderer   — 原生移动端（规划中）
└── MiniApp Renderer  — 小程序（规划中）
```

---

## 二、v4.2.0 新增特性

### 2.1 AI 集成 (@lytjs/ai)

v4.2.0 引入了完整的 AI 辅助开发能力，让开发者可以通过自然语言或 CLI 命令快速生成代码。

#### lyt-ai CLI 命令

```bash
# 初始化 AI 配置（创建 .lytrc.json）
lyt-ai init

# 使用 AI 生成组件
lytx generate component MyButton --type button --ai

# 使用 AI 生成 Store
lytx generate store counter --ai

# 使用 AI 生成页面
lytx generate page Home --ai

# 使用 AI 生成 API
lytx generate api users --ai
```

#### 支持 OpenAI / Anthropic API

在 `.lytrc.json` 中配置 AI 服务：

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key",
    "model": "gpt-4o",
    "baseUrl": "https://api.openai.com/v1"
  }
}
```

> **提示**：也支持 Anthropic Claude 等兼容 OpenAI API 格式的服务。AI 生成失败时会自动降级为模板生成，不会阻塞开发流程。

#### 组件 / 页面 / Store / API 生成

`AIGenerator` 类支持四种代码生成类型：

| 生成类型 | 说明 | 输出 |
|:---|:---|:---|
| `generateComponent` | 生成组件代码 | `.lyt` SFC 文件 |
| `generateStore` | 生成状态管理代码 | Store 模块 |
| `generatePage` | 生成页面代码 | 页面 SFC |
| `generateAPI` | 生成 API 路由 | API Handler |

#### .trae/ AI IDE 配置

为 Trae、Cursor 等 AI IDE 提供深度集成配置：

```
.trae/
├── README.md                    # AI IDE 集成说明
├── context.md                  # 项目上下文
├── api-reference.md            # API 快速参考
├── quick-start.md              # 快速入门
├── best-practices.md           # 最佳实践
├── ai-integration-examples.md  # AI 使用示例
└── prompts/
    ├── component.md            # 组件生成提示词
    ├── store.md                # Store 生成提示词
    ├── page.md                 # 页面生成提示词
    └── api.md                  # API 生成提示词
```

#### llms.txt / llms-full.txt

为 AI 助手提供结构化的项目文档：

- **`llms.txt`** -- 精简版摘要（~150 行），适合 AI 快速理解项目
- **`llms-full.txt`** -- 完整 API 参考文档，含类型签名和示例代码

---

### 2.2 Vue 3 兼容层 (@lytjs/compat)

提供与 Vue 3 完全兼容的 API，使 Vue 3 用户可以无缝迁移到 Lyt.js。

#### vue-to-lyt 迁移工具

```bash
# CLI 命令（自动转换 .vue 文件为 .lyt 文件）
vue-to-lyt src/components/
```

#### 完整 Vue 3 API 映射

**响应式 API（直接重新导出）：**

| Vue 3 API | Lyt.js 对应 | 兼容状态 |
|:---|:---|:---:|
| `ref` | `@lytjs/reactivity.ref` | ✅ 完全兼容 |
| `shallowRef` | `@lytjs/reactivity.shallowRef` | ✅ 完全兼容 |
| `reactive` | `@lytjs/reactivity.reactive` | ✅ 完全兼容 |
| `readonly` | `@lytjs/reactivity.readonly` | ✅ 完全兼容 |
| `computed` | `@lytjs/reactivity.computed` | ✅ 完全兼容 |
| `watch` | `@lytjs/reactivity.watch` | ✅ 完全兼容 |
| `watchEffect` | `@lytjs/reactivity.watchEffect` | ✅ 完全兼容 |
| `effect` | `@lytjs/reactivity.effect` | ✅ 完全兼容 |
| `nextTick` | `@lytjs/reactivity.nextTick` | ✅ 完全兼容 |
| `provide` / `inject` | `@lytjs/core.provide/inject` | ✅ 完全兼容 |
| `markRaw` | 兼容层实现 | ✅ 兼容 |
| `watchPostEffect` | 基于 watchEffect 封装 | ✅ 兼容 |
| `watchSyncEffect` | 基于 watchEffect 封装 | ✅ 兼容 |

**生命周期钩子：**

| Vue 3 API | 兼容状态 |
|:---|:---:|
| `onMounted` | ✅ 完全兼容 |
| `onUpdated` | ✅ 完全兼容 |
| `onUnmounted` | ✅ 完全兼容 |
| `onBeforeMount` | ✅ 完全兼容 |
| `onBeforeUpdate` | ✅ 完全兼容 |
| `onBeforeUnmount` | ✅ 完全兼容 |
| `onErrorCaptured` | ⚠️ 占位符 |
| `onRenderTracked` | ⚠️ 占位符 |
| `onRenderTriggered` | ⚠️ 占位符 |
| `onActivated` | ⚠️ 占位符 |
| `onDeactivated` | ⚠️ 占位符 |
| `onServerPrefetch` | ⚠️ 占位符 |

#### SFC 转换器（.vue -> .lyt）

`VueSfcConverter` 类提供完整的 SFC 文件转换能力：

```typescript
import { convertVueSfcToLyt, VueSfcConverter } from '@lytjs/compat'

// 便捷函数
const lytCode = convertVueSfcToLyt(vueCode)

// 类实例方式
const converter = new VueSfcConverter(vueCode)
const parsed = converter.parse()      // 解析 SFC 结构
const converted = converter.convert() // 执行完整转换
```

**转换规则：**

- `v-for` -> `v-each`（列表渲染语法）
- `from 'vue'` -> `from '@lytjs/compat'`（导入路径替换）
- 样式块保持原样（`scoped` 属性兼容）

#### 内置组件兼容

| 组件 | 来源 | 兼容状态 |
|:---|:---|:---:|
| `KeepAlive` | `@lytjs/component` | ✅ 完全兼容 |
| `Teleport` | `@lytjs/component` | ✅ 完全兼容 |
| `Transition` | `@lytjs/component` | ✅ 完全兼容 |
| `TransitionGroup` | `@lytjs/component` | ✅ 完全兼容 |
| `Suspense` | `@lytjs/component` | ✅ 完全兼容 |

---

### 2.3 社区基础设施

v4.2.0 完善了社区协作的基础设施：

#### Issue 模板

| 模板 | 文件 | 用途 |
|:---|:---|:---|
| Bug 报告 | `.github/ISSUE_TEMPLATE/bug_report.md` | 报告问题或 Bug |
| 功能请求 | `.github/ISSUE_TEMPLATE/feature_request.md` | 提出新功能建议 |
| 问答 | `.github/ISSUE_TEMPLATE/question.md` | 提问和讨论 |

#### CODE_OF_CONDUCT.md

- 定义社区行为准则
- 明确可接受和不可接受的行为
- 提供问题报告渠道

#### 贡献指南更新

- 更新仓库地址
- 更新 Node.js 要求为 >= 18
- 完善代码规范说明

---

### 2.4 工程化改进

#### CHANGELOG 自动化管理

通过 `scripts/changelog.js` 实现 CHANGELOG 的自动化管理：

```bash
# 添加变更条目
npm run changelog:add

# 发布新版本
npm run changelog:release 4.2.1

# 预览当前变更
npm run changelog:preview
```

> **格式规范**：遵循 [Keep a Changelog](https://keepachangelog.com/) 格式，版本管理遵循 [Semantic Versioning](https://semver.org/)。

#### 文档编码检查脚本

```bash
# 检查所有 Markdown 文件的编码
npm run docs:check-encoding
```

自动检测 UTF-8 BOM 问题，确保中文文档无乱码。

#### 24 个包版本统一管理

```bash
# 查看当前版本
npm run version:check

# 设置所有包版本
npm run version:set

# 版本号递增
npm run version:bump:patch   # 4.2.0 -> 4.2.1
npm run version:bump:minor   # 4.2.0 -> 4.3.0
npm run version:bump:major   # 4.2.0 -> 5.0.0
```

---

## 三、竞品对比分析

### 3.1 综合评分表

以下从 10 个维度对 7 个主流前端框架进行评分（满分 10 分）：

| 维度 | Lyt.js 4.2 | Vue 3.5 | React 19 | Svelte 5 | Solid 1.9 | Angular 21 | Preact 10 |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **包体积** | **10** | 7 | 6 | 8 | 9 | 3 | 9 |
| **运行时性能** | 8 | 8 | 8 | 9 | **10** | 7 | 8 |
| **TypeScript 支持** | 7 | 9 | 9 | 8 | 8 | **10** | 7 |
| **生态丰富度** | 3 | **10** | **10** | 6 | 4 | 8 | 7 |
| **学习曲线** | 8 | 8 | 6 | 8 | 7 | 4 | 8 |
| **SSR 支持** | 7 | 9 | 9 | 8 | 6 | 8 | 6 |
| **开发者工具** | 6 | 9 | 9 | 6 | 5 | 9 | 5 |
| **文档质量** | 6 | **10** | 9 | 8 | 6 | 8 | 7 |
| **零依赖纯净度** | **10** | 5 | 4 | 7 | 8 | 2 | 6 |
| **创新性** | 8 | 7 | 6 | 8 | 8 | 5 | 5 |
| **综合得分** | **7.3** | **8.8** | **8.4** | **7.6** | **7.6** | **7.0** | **6.8** |

> **评分说明**：Lyt.js 在包体积、零依赖纯净度和创新性方面领先，但在生态丰富度和文档质量方面仍有较大提升空间。

### 3.2 核心优势

1. **极致轻量** -- 核心 8 包 ESM gzip 仅 34.56 KB，reactivity 包仅 2.86 KB，是所有对比框架中最小的
2. **零运行时依赖** -- 所有能力用原生 JavaScript 实现，无任何第三方运行时依赖
3. **Vue 3 兼容 API** -- 完整的 Composition API + Options API 双模式，Vue 用户迁移成本极低
4. **所见即代码** -- 去掉 `v-` 前缀的模板语法，更接近原生 HTML，降低心智负担
5. **全栈能力** -- 内置路由、状态管理、CLI、DevTools、38+ 组件，开箱即用
6. **AI 原生集成** -- 从 v4.2.0 开始提供 AI 辅助开发，支持 OpenAI / Anthropic API
7. **渐进式架构** -- 为 SSR / 移动端 / 小程序预留 Renderer 接口，架构前瞻性强

### 3.3 差距分析

| 差距领域 | 现状 | 目标 |
|:---|:---|:---|
| **社区规模** | 早期阶段，贡献者少 | 建立活跃社区，吸引外部贡献者 |
| **npm 下载量** | 起步阶段 | 通过技术博客和 Playground 推广 |
| **第三方生态** | 仅有官方插件 | 建立插件市场，吸引社区插件 |
| **生产案例** | 缺少公开的生产使用案例 | 寻找早期采用者，积累案例 |
| **文档完整性** | 基础文档齐全，但缺少深度教程 | 建立完整的文档体系（教程/最佳实践/视频） |
| **TypeScript 类型** | 基础类型覆盖，部分包缺少完整声明 | 所有包提供完整的 .d.ts |
| **测试覆盖率** | 核心模块 >95%，部分功能包覆盖不足 | 全包覆盖率 >90% |

---

## 四、发展建议 (P0-P3)

### P0 - 生态破冰（1-3 个月）

> **目标**：让更多开发者知道并尝试 Lyt.js

| 任务 | 优先级 | 状态 | 说明 |
|:---|:---:|:---:|:---|
| 发布技术博客 | 高 | ✅ 已完成 | 掘金/知乎平台已发布系列文章 |
| 完善 npm 包文档 | 高 | ✅ 已完成 | 已为所有 24 个包创建完整的 README.md，含 API 说明和示例 |
| 添加 Playground 在线体验 | 高 | ✅ 已完成 | 已创建完整的 Playground 系统，包括 index.html、package.json、vite.config.js、README.md、stackblitz.json |
| Vue 3 兼容层推广 | 高 | ✅ 已完成 | 已撰写完整的 Vue 3 → Lyt.js 迁移指南 |
| 发布到 Gitee / npm | 中 | 待开始 | 确保 24 个包全部可正常安装 |

**关键行动项：**

- [x] 每个包补充完整的 README.md（API 文档 + 使用示例） - 所有包已完成
- [x] 在 StackBlitz 上部署可交互的在线示例 - 已配置 stackblitz.json
- [x] 撰写 "从 Vue 3 迁移到 Lyt.js" 系列教程 - 已创建 VUE3_MIGRATION_GUIDE.md
- [ ] 在掘金/知乎发布 AI 集成和 Vue 兼容层相关文章

---

### P1 - 核心完善（3-6 个月）

> **目标**：让 Lyt.js 达到生产可用级别

| 任务 | 优先级 | 说明 |
|:---|:---:|:---|
| Vapor Mode 稳定化 | 高 | 从实验性升级为稳定 API |
| 性能基准测试 | 高 | 与 Vue/React/Svelte 进行标准化的性能对比 |
| TypeScript 类型完善 | 高 | 所有包提供完整的 .d.ts 类型声明 |
| 错误处理优化 | 中 | 完善错误码体系，提供友好的错误提示 |
| 测试覆盖率提升 | 中 | 所有包测试覆盖率 > 90% |
| SSR 生产验证 | 中 | 在真实项目中验证 SSR/SSG 功能 |

**关键行动项：**

- [ ] Vapor Mode API 冻结，编写迁移指南
- [ ] 使用 js-framework-benchmark 标准化测试流程
- [ ] 为所有公共 API 补充 JSDoc 注释
- [ ] 建立错误处理最佳实践文档

---

### P2 - 生态扩展（6-12 个月）

> **目标**：建立 Lyt.js 生态体系

| 任务 | 优先级 | 说明 |
|:---|:---:|:---|
| UI 组件库完善 | 高 | 补充缺失组件，提升视觉质量 |
| 插件市场 | 中 | 建立官方插件市场，支持社区插件 |
| 企业级模板 | 中 | 提供 Admin/Dashboard/E-commerce 模板 |
| MiniApp 渲染器 | 中 | 实现微信/支付宝小程序适配 |
| VSCode 扩展增强 | 中 | 添加调试支持、代码片段、Emmet |
| 国际化文档 | 低 | 提供英文版官方文档 |

**关键行动项：**

- [ ] 组件库达到 50+ 组件，覆盖常见业务场景
- [ ] 设计插件规范，发布插件开发 SDK
- [ ] 与 2-3 家企业合作，积累生产案例
- [ ] MiniApp 渲染器支持微信小程序

---

### P3 - 长远规划（12 个月+）

> **目标**：成为主流前端框架选项之一

| 任务 | 说明 |
|:---|:---|
| Native 渲染器 | 支持 React Native 风格的原生移动端开发 |
| 国际化社区 | 建立英文社区，吸引海外贡献者 |
| 企业支持 | 提供付费技术咨询和企业级支持服务 |
| 核心运行时优化 | 目标核心 8 包 gzip < 15KB |
| 框架级 Benchmarks | 在官方 benchmark 网站上展示性能数据 |

---

## 五、详细开发文档

### 5.1 代码推送流程

```bash
# 1. 确认当前分支
git branch

# 2. 拉取最新代码
git pull origin develop

# 3. 创建功能分支
git checkout -b feat/your-feature

# 4. 开发、测试
npm run build && npm run test

# 5. 提交代码（遵循 Conventional Commits 规范）
git add .
git commit -m "feat: 添加xxx功能"

# 6. 推送到远程
git push origin feat/your-feature

# 7. 创建 Pull Request
```

> **Conventional Commits 规范**：
>
> - `feat:` 新功能
> - `fix:` Bug 修复
> - `docs:` 文档更新
> - `style:` 代码格式调整
> - `refactor:` 代码重构
> - `perf:` 性能优化
> - `test:` 测试相关
> - `chore:` 构建/工具链变更

### 5.2 版本发布流程

```bash
# 1. 更新版本号（所有 24 个包统一更新）
npm run version:bump:patch   # 4.2.0 -> 4.2.1
# 或
npm run version:bump:minor   # 4.2.0 -> 4.3.0
# 或
npm run version:bump:major   # 4.2.0 -> 5.0.0

# 2. 更新 CHANGELOG
npm run changelog:release 4.2.1

# 3. 构建所有包
npm run build

# 4. 运行测试
npm run test

# 5. 发布到 npm（先 dry-run 确认）
npm run publish:dry-run
npm run publish:all

# 6. 推送标签
git push origin --tags
```

> **注意**：发布前请确保所有测试通过，CHANGELOG 已更新，且版本号已正确递增。

### 5.3 文档同步更新

修改代码时，请同步更新对应文档：

| 文档类型 | 位置 | 更新时机 |
|:---|:---|:---|
| VitePress 文档站 | `docs/` 目录 | 功能变更时 |
| API 文档 | `docs/api/` 目录 | API 变更时 |
| 开发者文档 | `docs/developer/` 目录 | 架构变更时 |
| 指南文档 | `docs/guide/` 目录 | 新功能/最佳实践 |
| AI 文档 | `llms.txt` / `llms-full.txt` | API 变更时 |
| AI IDE 配置 | `.trae/` 目录 | API 变更时 |
| CHANGELOG | `CHANGELOG.md` | 每次发布 |

```bash
# 检查文档编码
npm run docs:check-encoding
```

### 5.4 清理临时文件

```bash
# 清理构建产物
npm run clean

# 清理临时测试文件
npm run clean:temp

# 手动清理常见临时文件
rm -f check-import*.ts
rm -f unified-test-runner.ts
rm -f test-scaffold.mjs
rm -rf test-projects/
rm -rf node_modules/.cache/
```

> **提示**：`.gitignore` 已配置忽略 `dist/`、`node_modules/` 等目录，以及常见的临时文件模式。

### 5.5 编码问题注意事项

- **所有源码文件使用 UTF-8 编码**，不要使用其他编码格式
- 使用 `npm run docs:check-encoding` 检查 Markdown 文件编码
- **注意中文标点符号**：使用全角标点（，。！？）而非半角（,.!?）
- **Git 提交时确保无 BOM**：BOM 会导致文件头部出现不可见字符
- **编辑器配置**：建议在 VSCode 中设置 `"files.encoding": "utf8"` 和 `"files.insertFinalNewline": true`

### 5.6 测试指南

```bash
# 运行所有测试
npm run test

# 运行测试覆盖率
npm run test:coverage

# 运行基准测试
npm run benchmark:all

# 单独运行各类基准测试
npm run benchmark           # 响应式系统
npm run benchmark:vdom      # 虚拟 DOM
npm run benchmark:vapor     # Vapor Mode

# Lint 检查
npm run lint

# Lint 自动修复
npm run lint:fix
```

**测试框架**：使用项目自研的轻量测试框架（`@lytjs/test-utils`），支持 describe/it/expect 语法。

**覆盖率工具**：使用 `c8` 生成覆盖率报告（text / html / lcov 格式）。

### 5.7 任务完成检验清单

每次完成开发任务后，请逐项确认：

- [ ] 所有测试通过（`npm run test`）
- [ ] Lint 无错误（`npm run lint`）
- [ ] 文档已更新（API 文档 / 指南 / CHANGELOG）
- [ ] CHANGELOG 已添加条目（`npm run changelog:add`）
- [ ] 编码检查通过（`npm run docs:check-encoding`）
- [ ] 构建成功（`npm run build`）
- [ ] 无临时文件残留（`npm run clean:temp`）
- [ ] Git 提交信息符合 Conventional Commits 规范

### 5.8 包结构说明

Lyt.js 包含 24 个精心设计的子包，按功能分为四类：

#### 核心引擎包（8 个）

| 包名 | 说明 | ESM gzip |
|:---|:---|:---|
| `@lytjs/reactivity` | 响应式系统（reactive / ref / computed / watch / Signal） | 2.86 KB |
| `@lytjs/compiler` | 模板编译器（HTML 解析 / AST / 代码生成 / 静态提升） | 4.97 KB |
| `@lytjs/vdom` | 虚拟 DOM（VNode / Diff / Block Tree / Patch Flag / LIS） | 3.57 KB |
| `@lytjs/renderer` | 渲染器主入口（DOM / SSR / Vapor / MiniApp / Native） | 5.00 KB |
| `@lytjs/component` | 组件系统（defineComponent / 生命周期 / 插槽 / KeepAlive） | 3.55 KB |
| `@lytjs/core` | 核心入口（createApp / h / 插件系统 / Web Component） | 2.13 KB |
| `@lytjs/common` | 公共工具库（类型检查 / 对象操作 / 事件发射器 / 缓存） | - |
| `@lytjs/lytjs` | 聚合包（一键安装全部核心运行时） | - |

#### 功能包（8 个）

| 包名 | 说明 |
|:---|:---|
| `@lytjs/router` | 内置路由（History / Hash / 导航守卫 / 动态路由） |
| `@lytjs/store` | 内置状态管理（Pinia 风格 API / 模块化 / actions / getters） |
| `@lytjs/components` | UI 组件库（38+ 组件 / 主题系统 / 亮色 / 暗色） |
| `@lytjs/cli` | 命令行工具（create / dev / build / generate / scaffold） |
| `@lytjs/devtools` | 浏览器开发者工具（组件树 / 状态查看 / 性能分析） |
| `@lytjs/lytx` | 元框架（SSR / SSG / SPA / API Routes / 全栈渲染） |
| `@lytjs/ai` | AI 辅助开发工具（组件 / Store / 页面 / API 生成） |
| `@lytjs/test-utils` | 测试工具库 |

#### 插件包（6 个）

| 包名 | 说明 |
|:---|:---|
| `@lytjs/plugin-i18n` | 国际化插件 |
| `@lytjs/plugin-auth` | 认证插件 |
| `@lytjs/plugin-logger` | 日志插件 |
| `@lytjs/plugin-storage` | 存储插件 |
| `@lytjs/plugin-theme` | 主题插件 |
| `@lytjs/plugins` | 插件聚合包（统一导出所有官方插件） |

#### 兼容层（1 个）

| 包名 | 说明 |
|:---|:---|
| `@lytjs/compat` | Vue 3 兼容层（API 映射 / SFC 转换器 / 迁移工具） |

> **包间依赖关系**：核心引擎包之间可以互相引用，功能包依赖核心引擎包，插件包依赖核心引擎包。所有包的运行时依赖为 0。

### 5.9 常见问题 FAQ

**Q1: Lyt.js 和 Vue 3 有什么区别？**

Lyt.js 的 API 高度兼容 Vue 3，主要区别在于：
- 零运行时依赖（Vue 3 有运行时依赖）
- 更轻量的体积（核心 8 包仅 34.56KB gzip）
- 去掉 `v-` 前缀的模板语法（`v-if` -> `if`，`v-for` -> `each`）
- 内置路由和状态管理（无需额外安装 vue-router / pinia）

---

**Q2: 如何从 Vue 3 迁移到 Lyt.js？**

使用 `@lytjs/compat` 兼容层可以实现渐进式迁移：

```bash
# 安装兼容层
npm install @lytjs/compat

# 使用 vue-to-lyt 工具批量转换
vue-to-lyt src/components/
```

模板语法只需去掉 `v-` 前缀，导入路径从 `'vue'` 改为 `'@lytjs/compat'`。

---

**Q3: Lyt.js 支持哪些浏览器？**

Lyt.js 基于 Proxy API，支持所有现代浏览器：
- Chrome 64+ / Edge 79+ / Firefox 63+ / Safari 12+
- 不支持 IE 11

---

**Q4: 如何使用 AI 生成代码？**

```bash
# 1. 初始化 AI 配置
lyt-ai init

# 2. 编辑 .lytrc.json，填入 API Key

# 3. 使用 AI 生成
lytx generate component MyButton --type button --ai
```

AI 生成失败时会自动降级为模板生成，不影响开发流程。

---

**Q5: Vapor Mode 是什么？**

Vapor Mode 是 Lyt.js 的无虚拟 DOM 编译优化模式。它通过编译时分析，直接生成 DOM 操作代码，绕过虚拟 DOM 的创建和 Diff 过程，性能接近原生 JavaScript。

```javascript
import { createVaporApp, defineVaporComponent } from '@lytjs/renderer/vapor'

const app = createVaporApp(defineVaporComponent({
  setup() {
    const count = signal(0)
    return { count }
  },
  template: `<div><span bind:text="count"></span></div>`
}))
```

---

**Q6: 如何贡献代码？**

1. Fork 仓库
2. 创建功能分支（`git checkout -b feat/your-feature`）
3. 开发并测试（`npm run build && npm run test`）
4. 提交 PR，遵循 Conventional Commits 规范
5. 等待代码审查

详见 [CONTRIBUTING.md](https://gitee.com/lytjs/lytjs/blob/main/CONTRIBUTING.md)。

---

**Q7: 如何安装和使用 Lyt.js？**

```bash
# 使用 CLI 创建项目（推荐）
npx @lytjs/cli create my-app
cd my-app
npm install
npm run dev

# 或直接安装核心包
npm install @lytjs/core
```

也可以通过 CDN 直接使用，无需构建工具。

---

**Q8: Lyt.js 的测试覆盖率如何？**

- 总测试用例：4,488 个
- 核心模块覆盖率：> 95%
- 使用 `c8` 工具生成覆盖率报告

```bash
npm run test:coverage
```

---

**Q9: 如何参与 Lyt.js 社区？**

- **讨论问题**：使用 [Gitee Issues](https://gitee.com/lytjs/lytjs/issues)
- **贡献代码**：查看 [贡献指南](https://gitee.com/lytjs/lytjs/blob/main/CONTRIBUTING.md)
- **行为准则**：遵守 [社区准则](https://gitee.com/lytjs/lytjs/blob/main/CODE_OF_CONDUCT.md)

---

**Q10: Lyt.js 的版本策略是什么？**

从 v4.0.0 开始，Lyt.js 遵循严格的语义化版本控制（Semantic Versioning）：

- **主版本号**：破坏性 API 变更
- **次版本号**：向后兼容的新功能
- **修订号**：向后兼容的 Bug 修复

所有 24 个子包版本号保持统一。

---

> **文档维护**：本文档应随项目版本更新同步维护。如有任何问题或建议，欢迎提交 Issue。
