# Lyt.js v6.0.0 开发路线图

> 本文档聚焦 **未完成开发任务** 和 **下一步行动项**，已完成的历史记录请查看 [CHANGELOG.md](./CHANGELOG.md)。
> 严格遵循项目8层架构设计初衷与运行时零第三方依赖原则。

---

## 📋 目录

- [一、剩余开发任务（按优先级）](#一剩余开发任务按优先级)
- [二、下一步行动项](#二下一步行动项)
- [三、暂缓任务](#三暂缓任务)
- [四、核心约束](#四核心约束)

---

## 一、剩余开发任务（按优先级）

### 🔴 高优先级（影响生产稳定性）

| 任务 | 描述 | 状态 |
| ---- | ---- | ---- |
| **UI 包类型修复** | 修复 ui 包中类型错误，清理重复类型定义 | ✅ 已完成 |
| **M7 测试覆盖率** | UI 组件测试重构，提升测试质量 | ✅ 已完成 |

### 🟡 中优先级（提升用户体验）

| 任务 | 描述 | 状态 |
| ---- | ---- | ---- |
| **M8 官网重构** | 全新设计的官方网站、完整的 API 文档、交互式示例 | ✅ 已完成 |
| **M8 教程体系** | 从入门到精通的完整教程、最佳实践指南 | ✅ 已完成 |

### 🟢 低优先级（生态建设）

| 任务 | 描述 | 状态 |
| ---- | ---- | ---- |
| **M8 生态鼓励** | 建立第三方组件/插件审核机制、优秀项目展示 | ✅ 已完成 |
| **M8 问题解答** | 建立 FAQ、问题排查手册、社区 Discord/GitHub Discussions | ✅ 已完成 |

---

## 二、下一步行动项

### 已完成

#### 1. 核心包依赖修复

**问题分析**：
- 多个核心包（core、reactivity、component、vdom、renderer、compiler）使用了 `@lytjs/common-*` 工具包
- 但 package.json dependencies 中未声明这些依赖
- 导致基准测试无法正常运行

**修复内容**：
- @lytjs/core: 添加 common-error、common-object
- @lytjs/reactivity: 添加 common-error、common-constants、common-assertions
- @lytjs/component: 添加 common-error、common-string
- @lytjs/vdom: 添加 common-assertions、common-error、common-object、common-constants
- @lytjs/renderer: 添加 common-error
- @lytjs/compiler: 添加 common-string、common-constants

#### 2. 基准测试配置修复

**修复内容**：
- benchmarks/vitest.config.ts: 修改别名指向 dist 而非 src
- 基准测试现已全部通过（render/update/memory）

#### 3. E2E 测试增强

**修复内容**：
- e2e/playwright.config.ts: 修复 filter 名称（playground → lytjs-playground）
- 新增 e2e/tests/scenarios.test.ts，覆盖：
  - 计数器组件测试
  - 待办事项组件测试
  - 颜色选择器组件测试
  - 计时器组件测试
  - 购物车组件测试
  - 井字棋组件测试
  - 天气仪表盘组件测试

#### 4. E2E 测试环境完善

**修复内容**：
- 将 playground 加入 pnpm workspace（修改 pnpm-workspace.yaml）
- 重构 playground/package.json，使用 workspace 依赖而非 file 路径
- 更新 e2e/playwright.config.ts 使用正确的 @lytjs/playground 包名
- 添加 e2e/README.md 使用指南

---

## 三、下一步待执行任务

### 🟡 中优先级

| 任务 | 描述 | 状态 |
| ---- | ---- | ---- |
| **CI/CD 集成** | 完善 GitHub/Gitee Actions CI/CD 配置 | ⏸️ 待启动 |

### 🟢 低优先级

| 任务 | 描述 | 状态 |
| ---- | ---- | ---- |
| **性能优化** | 基于基准测试数据进行性能优化 | ⏸️ 待启动 |

---

## 四、暂缓任务

### 构建器多适配

| 任务 | 优先级 | 说明 |
| ---- | ------ | ---- |
| **Webpack 适配** | 🟡 中 | 探索 Webpack 适配方案 |
| **Rollup 适配** | 🟡 中 | 探索 Rollup 适配方案 |

**暂缓原因**：当前 Vite 适配方案已足够满足需求，暂不投入资源。

---

## 四、核心约束

### 4.1 运行时零第三方依赖

- **所有组件、插件、核心层均采用原生 JS/DOM 实现**
- **不引入任何第三方 runtime 依赖**
- 工具类全部自研实现
- 例外情况：仅开发/构建阶段的依赖允许

### 4.2 8层架构约束

- **严格遵循分层职责**
- **L0 基础工具层开放**：L0 基础工具层（common-*）可被所有上层直接依赖
- **核心层合理依赖**：核心层（L1-L4）尽量减少跨层依赖，但允许必要的跨层访问
- **不循环依赖**
- **底层为上层提供支撑**
- 使用 `pnpm run check-circular` 定期检查

### 4.3 API统一约束

- **所有组件、插件 API 命名统一**
- **遵循文档规范**
- **降低学习与开发成本**
- 保持向后兼容性

### 4.4 性能约束

- **所有组件、渲染逻辑需适配 Vapor 模式**
- **提升运行性能**
- **降低渲染开销**
- 持续进行性能基准测试与优化

---

## 五、快速开始

### 5 分钟检查项目状态

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

### 开发任务优先级

1. **UI 包类型修复** - 高优先级，影响生产稳定性
2. **测试覆盖率提升** - 高优先级，确保代码质量
3. **官网重构** - 中优先级，提升用户体验
4. **教程体系** - 中优先级，降低学习门槛

---

**文档版本**: v7.2
**最后更新**: 2026-05-15
**维护者**: LytJS Team

---

## 更新日志

### v7.2 (2026-05-15)

- ✅ **E2E 测试环境完善**
  - 将 playground 加入 pnpm workspace
  - 重构 playground/package.json 使用 workspace 依赖
  - 更新 e2e/playwright.config.ts 配置
  - 添加 e2e/README.md 使用指南

### v7.1 (2026-05-14)

- ✅ **核心包依赖修复**
  - 修复 6 个核心包的 package.json dependencies 声明问题
  - @lytjs/core、@lytjs/reactivity、@lytjs/component、@lytjs/vdom、@lytjs/renderer、@lytjs/compiler

- ✅ **基准测试配置修复**
  - benchmarks/vitest.config.ts: 修改别名指向 dist
  - 基准测试现已全部通过（render/update/memory）

- ✅ **E2E 测试增强**
  - 修复 e2e/playwright.config.ts filter 名称
  - 新增 scenarios.test.ts 覆盖 7 个组件场景

### v7.0 (2026-05-14)

- ✅ **ROADMAP 重构**
  - 将已完成的历史记录拆分到 CHANGELOG.md
  - 保留清晰的未完成任务清单
  - 新增下一步行动项和快速开始指南
  - 明确任务优先级

- ✅ **识别剩余任务**
  - UI 包类型修复（高优先级）✅ 已完成
  - 测试覆盖率提升（高优先级）✅ 已完成
  - 官网重构 ✅ 已完成
  - 教程体系 ✅ 已完成
  - 生态鼓励 ✅ 已完成
  - 问题解答 ✅ 已完成
  - 构建器多适配（暂缓）
