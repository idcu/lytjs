# LytJS 项目智能体规则

## 项目概述

LytJS 是一个从零构建的现代 JavaScript 框架项目，采用 Monorepo 结构管理多个包。

---

## ⚡ 快速开始

### 第一步：确定任务类型

| 任务           | 怎么做            |
| -------------- | ----------------- |
| 新功能/修复Bug | 直接开始写代码    |
| 复杂任务       | 用 /spec 或 /plan |
| 常用操作       | 调用对应 Skill    |

### 第二步：验证和提交

```
1. 类型检查 → 代码检查 → 测试 → 提交
```

### 第三步：查看完整指南

详细内容见下方「推荐工作流」

---

## 🎯 核心概念与定位

### 三者关系图

```
┌─────────────────────────────────────────────────────┐
│                    用户需求                           │
└────────────────────┬────────────────────────────────┘
                     ↓
         ┌───────────────────────────┐
         │   1. 任务分析与规划        │
         │   ├─ 使用 /spec 或 /plan  │
         │   └─ 生成规划文档          │
         └───────────┬───────────────┘
                     ↓
         ┌───────────────────────────┐
         │   2. 执行任务              │
         │   ├─ 按需调用 Skill       │
         │   ├─ 使用 TodoWrite       │
         │   └─ 执行具体操作          │
         └───────────┬───────────────┘
                     ↓
         ┌───────────────────────────┐
         │   3. 验证与提交            │
         │   └─ 调用相关 Skill        │
         └───────────────────────────┘
```

---

## 📋 明确定位

### 1. Spec & Plan：任务规划工具

**职责**：为具体任务生成规划文档

| 类型     | 使用场景                                           | 输出内容                          | 输出位置                |
| -------- | -------------------------------------------------- | --------------------------------- | ----------------------- |
| **Spec** | 复杂系统级任务（创建新包、性能优化、架构改造）     | spec.md + tasks.md + checklist.md | `.trae/specs/<任务名>/` |
| **Plan** | 中小型任务（新功能、Bug 修复、代码重构、添加测试） | plan.md                           | `.trae/documents/`      |

**何时选择：**

- 任务涉及多个阶段、需要详细规范 → Spec
- 单模块、快速迭代的改进 → Plan

---

### 2. Skill：可复用工具库

**职责**：提供可复用的知识和工具

Skill 分为三类：

| Skill 类型 | 说明             | 示例                                                                                                                             |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **工具类** | 可直接执行的操作 | [create-ecosystem-package](.trae/skills/create-ecosystem-package/SKILL.md), [create-branch](.trae/skills/create-branch/SKILL.md) |
| **参考类** | 规范与指南文档   | [code-style](.trae/skills/code-style/SKILL.md), [zero-dependency](.trae/skills/zero-dependency/SKILL.md)                         |
| **验证类** | 检查与测试工具   | [type-check](.trae/skills/type-check/SKILL.md), [run-tests](.trae/skills/run-tests/SKILL.md)                                     |

**核心原则：Agent 自动按需调用 Skill，无需用户显式指定！**

---

## 🚀 推荐工作流

### 完整流程示例

```
1. 用户说："创建一个新的 UI 组件包"
   ↓
2. Agent 分析：复杂任务 → 使用 /spec
   ↓
3. 生成规划文档到 .trae/specs/create-ui-package/
   ↓
4. 执行阶段：
   - 调用 [create-ecosystem-package](.trae/skills/create-ecosystem-package/SKILL.md) 初始化
   - 调用 [create-branch](.trae/skills/create-branch/SKILL.md) 创建分支
   - 使用 TodoWrite 管理步骤
   - 遵循 [code-style](.trae/skills/code-style/SKILL.md) 编写代码
   ↓
5. 验证阶段：
   - 调用 [type-check](.trae/skills/type-check/SKILL.md)
   - 调用 [lint-code](.trae/skills/lint-code/SKILL.md)
   - 调用 [run-tests](.trae/skills/run-tests/SKILL.md)
   ↓
6. 提交阶段：
   - 调用 [git-commit](.trae/skills/git-commit/SKILL.md)
   ↓
7. 复盘阶段（可选但推荐）：
   - 调用 [task-retrospective](.trae/skills/task-retrospective/SKILL.md) 进行任务复盘
```

---

## 📊 任务类型映射表

| 优先级 | 任务类型   | 规划方式 | 常用 Skill                                                                                                                                                                               |
| ------ | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 P0  | Bug 修复   | `/plan`  | [quick-reference](.trae/skills/quick-reference/SKILL.md), [create-branch](.trae/skills/create-branch/SKILL.md), [fix-test-failures](.trae/skills/fix-test-failures/SKILL.md)             |
| 🟡 P1  | 新功能开发 | `/plan`  | [quick-reference](.trae/skills/quick-reference/SKILL.md), [create-branch](.trae/skills/create-branch/SKILL.md), [write-tests](.trae/skills/write-tests/SKILL.md)                         |
| 🟡 P1  | 添加测试   | `/plan`  | [write-tests](.trae/skills/write-tests/SKILL.md), [add-test-cases](.trae/skills/add-test-cases/SKILL.md), [run-tests](.trae/skills/run-tests/SKILL.md)                                   |
| 🟢 P2  | 代码重构   | `/plan`  | [refactoring](.trae/skills/refactoring/SKILL.md), [code-review](.trae/skills/code-review/SKILL.md)                                                                                       |
| 🟢 P2  | 创建新包   | `/spec`  | [architecture](.trae/skills/architecture/SKILL.md), [create-ecosystem-package](.trae/skills/create-ecosystem-package/SKILL.md), [zero-dependency](.trae/skills/zero-dependency/SKILL.md) |
| 🟢 P2  | 性能优化   | `/spec`  | [performance-analysis](.trae/skills/performance-analysis/SKILL.md), [performance-optimization](.trae/skills/performance-optimization/SKILL.md)                                           |

---

## 📁 规范参考

### Spec 模板

- [create-package-template](.trae/specs/create-package-template/)

### Plan 模板

- [feature-dev-plan.md](.trae/documents/feature-dev-plan.md)
- [bug-fix-plan.md](.trae/documents/bug-fix-plan.md)
- [refactor-plan.md](.trae/documents/refactor-plan.md)
- [add-tests-plan.md](.trae/documents/add-tests-plan.md)

---

## 📚 项目 Skill 索引

### 工具类

| Skill                                                                      | 说明         |
| -------------------------------------------------------------------------- | ------------ |
| [create-ecosystem-package](.trae/skills/create-ecosystem-package/SKILL.md) | 创建生态包   |
| [create-plugin](.trae/skills/create-plugin/SKILL.md)                       | 创建插件     |
| [create-tool-script](.trae/skills/create-tool-script/SKILL.md)             | 创建工具脚本 |
| [create-branch](.trae/skills/create-branch/SKILL.md)                       | 创建分支     |
| [git-commit](.trae/skills/git-commit/SKILL.md)                             | 提交代码     |
| [git-push](.trae/skills/git-push/SKILL.md)                                 | 推送代码     |
| [template-provider](.trae/skills/template-provider/SKILL.md)               | 模板提供     |

### 参考类

| Skill                                                          | 说明         |
| -------------------------------------------------------------- | ------------ |
| [dev-guide](.trae/skills/dev-guide/SKILL.md)                   | 开发指南     |
| [quick-reference](.trae/skills/quick-reference/SKILL.md)       | 快速参考     |
| [command-reference](.trae/skills/command-reference/SKILL.md)   | 命令参考     |
| [code-style](.trae/skills/code-style/SKILL.md)                 | 代码风格     |
| [zero-dependency](.trae/skills/zero-dependency/SKILL.md)       | 零依赖规范   |
| [architecture](.trae/skills/architecture/SKILL.md)             | 架构指南     |
| [chinese-docs-guide](.trae/skills/chinese-docs-guide/SKILL.md) | 中文文档规范 |
| [git-workflow](.trae/skills/git-workflow/SKILL.md)             | Git 工作流   |
| [build-guide](.trae/skills/build-guide/SKILL.md)               | 构建指南     |
| [testing](.trae/skills/testing/SKILL.md)                       | 测试指南     |

### 验证类

| Skill                                                                      | 说明         |
| -------------------------------------------------------------------------- | ------------ |
| [type-check](.trae/skills/type-check/SKILL.md)                             | 类型检查     |
| [lint-code](.trae/skills/lint-code/SKILL.md)                               | 代码检查     |
| [run-tests](.trae/skills/run-tests/SKILL.md)                               | 运行测试     |
| [write-tests](.trae/skills/write-tests/SKILL.md)                           | 编写测试     |
| [add-test-cases](.trae/skills/add-test-cases/SKILL.md)                     | 添加测试用例 |
| [fix-test-failures](.trae/skills/fix-test-failures/SKILL.md)               | 修复测试失败 |
| [fix-type-safety](.trae/skills/fix-type-safety/SKILL.md)                   | 修复类型安全 |
| [test-commands](.trae/skills/test-commands/SKILL.md)                       | 测试命令     |
| [test-memory-optimization](.trae/skills/test-memory-optimization/SKILL.md) | 测试内存优化 |
| [code-review](.trae/skills/code-review/SKILL.md)                           | 代码审查     |
| [security-scan](.trae/skills/security-scan/SKILL.md)                       | 安全扫描     |

### 问题排查类

| Skill                                                        | 说明         |
| ------------------------------------------------------------ | ------------ |
| [common-errors](.trae/skills/common-errors/SKILL.md)         | 常见错误     |
| [type-check-errors](.trae/skills/type-check-errors/SKILL.md) | 类型检查错误 |

### 性能类

| Skill                                                                      | 说明         |
| -------------------------------------------------------------------------- | ------------ |
| [performance-analysis](.trae/skills/performance-analysis/SKILL.md)         | 性能分析     |
| [performance-optimization](.trae/skills/performance-optimization/SKILL.md) | 性能优化     |
| [ssr-stress-test](.trae/skills/ssr-stress-test/SKILL.md)                   | SSR 压力测试 |

### 辅助类

| Skill                                                            | 说明            |
| ---------------------------------------------------------------- | --------------- |
| [refactoring](.trae/skills/refactoring/SKILL.md)                 | 重构指南        |
| [task-checklist](.trae/skills/task-checklist/SKILL.md)           | 任务清单        |
| [task-retrospective](.trae/skills/task-retrospective/SKILL.md)   | 任务复盘        |
| [roadmap-performance](.trae/skills/roadmap-performance/SKILL.md) | 路线图维护      |
| [documentation](.trae/skills/documentation/SKILL.md)             | 文档指南        |
| [devtools](.trae/skills/devtools/SKILL.md)                       | DevTools 开发   |
| [devtools-workflow](.trae/skills/devtools-workflow/SKILL.md)     | DevTools 工作流 |
| [migrate-package](.trae/skills/migrate-package/SKILL.md)         | 迁移包          |

---

## 🔧 快速命令

```bash
pnpm install          # 安装依赖
pnpm build            # 构建
pnpm test             # 测试
pnpm lint:check       # 代码检查
pnpm lint:batch       # 分包 lint（避免内存溢出）
pnpm type-check       # 类型检查
pnpm check-scripts    # 检查 package.json scripts
```
