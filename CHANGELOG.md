# Changelog

All notable changes to this project will be documented in this file.

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
