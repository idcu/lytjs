# LytJS 开发流程指南

> 本文档详细说明了 LytJS 项目的完整开发工作流程，包括 Skill Chain 和 Skill 的使用方法

---

## 目录

- [核心工作流总览](#核心工作流总览)
- [阶段 1: 任务分析](#阶段-1-任务分析)
- [阶段 2: 任务规划](#阶段-2-任务规划)
- [阶段 3: 任务执行](#阶段-3-任务执行)
- [阶段 4: 验证与提交](#阶段-4-验证与提交)
- [阶段 5: 任务复盘](#阶段-5-任务复盘)
- [Skill Chain 场景映射表](#skill-chain-场景映射表)
- [Skill 原子技能索引](#skill-原子技能索引)
- [实战流程示例](#实战流程示例)
- [记忆口诀](#记忆口诀)

---

## 核心工作流总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. 任务接收与分析                                                        │
│  └─ 阅读 AGENTS.md → 理解需求 → 调用 analyze-task 分析复杂度             │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  2. 选择入口路径                                                        │
│  ├─ 简单任务：直接开发 → 匹配 skill-chains 中的简单链                      │
│  ├─ 中等任务：/plan → 生成 plan.md → 按中等 skill chain 执行            │
│  └─ 复杂任务：/spec → 生成 spec.md + tasks.md + checklist.md → 按复杂链执行  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  3. 任务执行                                                            │
│  ├─ 创建分支（git-workflow）                                            │
│  ├─ 调用对应 Skill（按 skill-usage 原则，原子级、按需、链式）            │
│  ├─ 编写代码（遵循 code-style、function-standards 等规范）               │
│  └─ 本地验证                                                            │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  4. 验证与提交                                                          │
│  ├─ pnpm type-check（类型检查）                                          │
│  ├─ pnpm lint:check / pnpm lint:batch（代码检查）                       │
│  ├─ pnpm test（运行测试）                                               │
│  ├─ Git 提交（遵循 git-workflow 规范）                                  │
│  └─ 推送                                                                │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  5. 任务复盘（必做！）                                                  │
│  └─ 调用 retrospective → 回顾结果 → 提取经验 → 评估 Skill 变更          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 阶段 1: 任务分析

**核心 Skill**: [analyze-task](../.trae/skills/workflow/analyze-task/SKILL.md)

**分析要点**:

1. **任务复杂度判断**:

| 复杂度 | 特征 | 示例 |
|--------|------|------|
| 简单 | 单个文件修改、明确的修复 | 类型错误修复、测试失败修复 |
| 中等 | 多个文件、需要规划 | 新功能开发、代码重构 |
| 复杂 | 架构变更、新建包 | 创建新生态系统包、性能优化 |

2. **需求理解**:

- 阅读用户需求，明确目标
- 理解项目背景和上下文
- 确定任务边界和范围

3. **复杂度判定**:

- 使用 `analyze-task` Skill 分析
- 根据任务类型匹配相应入口

---

## 阶段 2: 任务规划

### 简单任务: 跳过规划，直接开发

- 直接匹配对应的 Skill Chain
- 调用相关 Skill 执行

### 中等任务: 创建 Plan

**核心 Skill**: [create-plan](../.trae/skills/create-plan/SKILL.md)

**Plan 文档应包含**:
- 任务概述
- 实现步骤
- 涉及文件
- 验证标准
- 时间估算

### 复杂任务: 创建 Spec

**核心 Skill**: [create-spec](../.trae/skills/create-spec/SKILL.md)

**Spec 文档应包含**:
- 需求分析
- 设计方案
- 技术选型
- 实现计划（`tasks.md`）
- 验收标准（`checklist.md`）
- 风险评估

---

## 阶段 3: 任务执行

### Skill 调用原则（来自 skill-usage）

1. **原子性调用**: 每个 Skill 只解决一个具体问题
2. **按需调用**: 完成一步，调用下一步
3. **链式组合**: Skill 输出作为下一个 Skill 输入

### 执行步骤

1. **创建分支**: 使用 `git-workflow` Skill
2. **调用对应 Skill**: 按 Skill Chain 顺序
3. **编写代码**: 遵循 `code-style`、`function-standards` 等
4. **本地验证**: 边开发边检查

---

## 阶段 4: 验证与提交

### 必做验证三步曲

```bash
# 1. 类型检查（必须通过）
pnpm type-check

# 2. 代码检查（分包避免内存溢出）
pnpm lint:batch
# 或单个包
pnpm eslint packages/ecosystem/packages/router/src --max-warnings 0

# 3. 运行测试（必须通过）
pnpm test
```

### Git 提交规范

**核心 Skill**: [git-workflow](../.trae/skills/git-workflow/SKILL.md)

**提交格式**:

```
type(scope): 中文描述

type 可选值: feat, fix, docs, style, refactor, perf, test, chore
scope 可选值: reactivity, vdom, compiler, core, renderer, common-*, web, tools, plugins, ecosystem
```

**分支命名**:

- `feature/xxx` - 新功能开发
- `fix/xxx` - Bug 修复
- `refactor/xxx` - 代码重构
- `docs/xxx` - 文档更新

---

## 阶段 5: 任务复盘（必做！）

**核心 Skill**: [retrospective](../.trae/skills/retrospective/SKILL.md)

**复盘内容**:

1. **回顾目标与结果差距**: 任务是否完成？目标是否达成？
2. **分析效率**: 时间是否合理？是否有可优化的地方？
3. **质量检查**: 代码质量如何？是否有潜在问题？
4. **提取可复用经验**: 有哪些经验可以复用？
5. **评估 Skill 变更**: 是否需要新建或完善 Skill？

---

## Skill Chain 场景映射表

| 用户需求关键词 | 匹配 Skill Chain | 复杂度 | 主要 Skill 组合 |
|--------------|----------------|--------|----------------|
| 类型错误、type-check 失败 | [fix-type-error](../.trae/skills/skill-chains/SKILL.md#fix-type-error-修复类型错误) | 简单 | type-check-issues → type-fix → testing |
| 测试失败、test 报错 | [fix-test-failure](../.trae/skills/skill-chains/SKILL.md#fix-test-failure-修复测试失败) | 简单 | test-issues → fix-test-failures → testing |
| 构建失败、build 报错 | [fix-build-error](../.trae/skills/skill-chains/SKILL.md#fix-build-error-修复构建失败) | 简单 | build-issues → lint-guide → testing |
| 运行报错、功能异常 | [fix-runtime-error](../.trae/skills/skill-chains/SKILL.md#fix-runtime-error-修复运行时报错) | 简单 | troubleshooting → debug-console → [具体修复 Skill] |
| 添加功能、实现需求 | [new-feature](../.trae/skills/skill-chains/SKILL.md#new-feature-新功能开发) | 中等 | create-plan → architecture-overview → code-style → test-template |
| 重构代码、改写 | [refactor-code](../.trae/skills/skill-chains/SKILL.md#refactor-code-代码重构) | 中等 | create-plan → code-smells → refactoring-patterns |
| 优化性能（单模块） | [perf-optimize-local](../.trae/skills/skill-chains/SKILL.md#perf-optimize-local-局部性能优化) | 中等 | create-plan → perf-bottlenecks → perf-best-practices |
| 优化性能（全面） | [perf-optimize-system](../.trae/skills/skill-chains/SKILL.md#perf-optimize-system-系统级性能优化) | 复杂 | create-spec → perf-bottlenecks → vnode-pool-optimization / signal-optimization |
| 创建生态包、新建模块 | [create-package](../.trae/skills/skill-chains/SKILL.md#create-package-创建生态包) | 复杂 | create-spec → architecture-overview → create-ecosystem-package |
| 创建插件 | [create-plugin](../.trae/skills/skill-chains/SKILL.md#create-plugin-创建插件) | 复杂 | create-spec → create-plugin |
| 写文档、更新文档 | [write-docs](../.trae/skills/skill-chains/SKILL.md#write-docs-编写文档) | 中等 | create-plan → chinese-writing-standards → documentation |
| 发布 npm、版本更新 | [publish-release](../.trae/skills/skill-chains/SKILL.md#publish-release-发布版本) | 中等 | manage-version → generate-changelog → publish-package |

---

## Skill 原子技能索引

### 1. 开发类核心 Skill

| 类别 | Skill | 作用 | 文件 |
|-----|-------|------|------|
| 架构 | architecture-overview | 理解 8 层架构 | [SKILL.md](../.trae/skills/architecture-overview/SKILL.md) |
| 架构 | dependency-rules | 依赖单向规则 | [SKILL.md](../.trae/skills/dependency-rules/SKILL.md) |
| 架构 | project-mapping | 目录结构映射 | [SKILL.md](../.trae/skills/project-mapping/SKILL.md) |
| 开发 | dev-guide | 开发指南 | [SKILL.md](../.trae/skills/dev-guide/SKILL.md) |
| 风格 | code-style | 代码风格导航 | [SKILL.md](../.trae/skills/code-style/SKILL.md) |
| 风格 | code-formatting | 格式化规则 | [SKILL.md](../.trae/skills/code-formatting/SKILL.md) |
| 风格 | naming-conventions | 命名规范 | [SKILL.md](../.trae/skills/naming-conventions/SKILL.md) |
| 风格 | function-standards | 函数规范 | [SKILL.md](../.trae/skills/function-standards/SKILL.md) |
| 风格 | comment-standards | 注释规范 | [SKILL.md](../.trae/skills/comment-standards/SKILL.md) |
| 规范 | zero-dependency-rules | 零依赖检查清单 | [SKILL.md](../.trae/skills/zero-dependency-rules/SKILL.md) |
| 规范 | native-api-guide | 原生 API 使用 | [SKILL.md](../.trae/skills/native-api-guide/SKILL.md) |

### 2. 测试与验证类 Skill

| 类别 | Skill | 作用 | 文件 |
|-----|-------|------|------|
| 测试 | testing | 测试命令指南 | [SKILL.md](../.trae/skills/testing/SKILL.md) |
| 测试 | test-template | 测试代码模板 | [SKILL.md](../.trae/skills/test-template/SKILL.md) |
| 测试 | fix-test-failures | 修复测试失败 | [SKILL.md](../.trae/skills/fix-test-failures/SKILL.md) |
| 测试 | test-memory-optimization | 测试内存优化 | [SKILL.md](../.trae/skills/test-memory-optimization/SKILL.md) |
| 类型 | type-fix | 类型修复 | [SKILL.md](../.trae/skills/type-fix/SKILL.md) |
| 类型 | type-check-issues | 类型问题排查 | [SKILL.md](../.trae/skills/type-check-issues/SKILL.md) |
| 代码审查 | code-review-checklist | 审查清单 | [SKILL.md](../.trae/skills/code-review-checklist/SKILL.md) |
| 代码审查 | code-review-process | 审查流程 | [SKILL.md](../.trae/skills/code-review-process/SKILL.md) |

### 3. 创建与发布类 Skill

| 类别 | Skill | 作用 | 文件 |
|-----|-------|------|------|
| 创建 | create-ecosystem-package | 创建生态包 | [SKILL.md](../.trae/skills/create-ecosystem-package/SKILL.md) |
| 创建 | create-plugin | 创建插件 | [SKILL.md](../.trae/skills/create-plugin/SKILL.md) |
| 创建 | create-tool-script | 创建脚本 | [SKILL.md](../.trae/skills/create-tool-script/SKILL.md) |
| 创建 | create-spec | 创建 Spec 规范 | [SKILL.md](../.trae/skills/create-spec/SKILL.md) |
| 创建 | create-plan | 创建 Plan 规划 | [SKILL.md](../.trae/skills/create-plan/SKILL.md) |
| 发布 | publish-package | 发布 npm 包 | [SKILL.md](../.trae/skills/publish-package/SKILL.md) |
| 发布 | generate-changelog | 生成变更日志 | [SKILL.md](../.trae/skills/generate-changelog/SKILL.md) |
| 发布 | manage-version | 版本管理 | [SKILL.md](../.trae/skills/manage-version/SKILL.md) |
| 迁移 | migrate-package | 迁移包 | [SKILL.md](../.trae/skills/migrate-package/SKILL.md) |

### 4. 性能与安全类 Skill

| 类别 | Skill | 作用 | 文件 |
|-----|-------|------|------|
| 性能 | perf-analysis-methods | 性能分析方法 | [SKILL.md](../.trae/skills/perf-analysis-methods/SKILL.md) |
| 性能 | perf-bottlenecks | 性能瓶颈识别 | [SKILL.md](../.trae/skills/perf-bottlenecks/SKILL.md) |
| 性能 | perf-best-practices | 性能优化建议 | [SKILL.md](../.trae/skills/perf-best-practices/SKILL.md) |
| 性能 | vnode-pool-optimization | VNode 对象池 | [SKILL.md](../.trae/skills/vnode-pool-optimization/SKILL.md) |
| 性能 | signal-optimization | Signal 优化 | [SKILL.md](../.trae/skills/signal-optimization/SKILL.md) |
| 性能 | ssr-stress-test | SSR 压测 | [SKILL.md](../.trae/skills/ssr-stress-test/SKILL.md) |
| 安全 | security-checklist | 安全检查清单 | [SKILL.md](../.trae/skills/security-checklist/SKILL.md) |
| 安全 | xss-check | XSS 风险检查 | [SKILL.md](../.trae/skills/xss-check/SKILL.md) |

**完整 Skill 索引**: [SKILL_INDEX.md](../.trae/skills/SKILL_INDEX.md)

---

## 实战流程示例

### 示例 1: 修复类型错误（简单任务）

```
1. 用户："修复 type-check 错误"
   ↓
2. 匹配 skill-chain：fix-type-error
   ↓
3. 调用 type-check-issues 排查问题
   ↓
4. 调用 type-fix 修复
   ↓
5. 调用 testing 验证
   ↓
6. pnpm type-check 通过
   ↓
7. Git 提交
   ↓
8. 调用 retrospective 复盘
```

### 示例 2: 创建新功能（中等任务）

```
1. 用户："实现一个新组件"
   ↓
2. 匹配 skill-chain：new-feature
   ↓
3. 调用 create-plan → 生成 plan.md
   ↓
4. 调用 architecture-overview → 确定放置层级
   ↓
5. 调用 code-style → 遵循规范
   ↓
6. 调用 test-template → 编写测试
   ↓
7. 开发功能
   ↓
8. 验证（type-check + lint + test）
   ↓
9. Git 提交
   ↓
10. 调用 retrospective 复盘
```

### 示例 3: 创建生态包（复杂任务）

```
1. 用户："创建一个新的 UI 组件包"
   ↓
2. 匹配 skill-chain：create-package
   ↓
3. 调用 create-spec → 生成 spec.md + tasks.md + checklist.md
   ↓
4. 调用 architecture-overview → 理解架构
   ↓
5. 调用 create-ecosystem-package → 创建包
   ↓
6. 按 tasks.md 执行开发
   ↓
7. 验证
   ↓
8. Git 提交
   ↓
9. 调用 retrospective 复盘
```

---

## 记忆口诀

### 开发五步走

1. **分析**（analyze-task）→ 定复杂度
2. **规划**（Plan/Spec）→ 选路径
3. **执行**（按 Skill Chain）→ 原子级开发
4. **验证**（type-check + lint + test）→ 确保质量
5. **复盘**（retrospective）→ 沉淀经验

### Skill 调用三原则

1. 原子性，一个 Skill 一件事
2. 按需调用，一步步来
3. 链式组合，前后衔接

---

## 关键文档导航

| 文档 | 作用 | 链接 |
|-----|------|------|
| 入口规则 | 项目入口，必看 | [AGENTS.md](../../AGENTS.md) |
| 技能链 | 预定义 Skill 组合 | [skill-chains](../.trae/skills/skill-chains/SKILL.md) |
| 任务类型 | 任务与 Skill 映射 | [task-types](../.trae/skills/task-types/SKILL.md) |
| 完整索引 | 所有 Skill 列表 | [SKILL_INDEX.md](../.trae/skills/SKILL_INDEX.md) |
| 命令参考 | 常用命令速查 | [command-reference](../.trae/skills/command-reference/SKILL.md) |
| 开发规范 | 详细开发规范 | [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) |
| 架构设计 | 8 层架构详解 | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| AI IDE 规则 | AI IDE 开发核心规则 | [AI_IDE_RULES.md](./AI_IDE_RULES.md) |

---

**文档版本**: v1.0
**最后更新**: 2026-05-18
**维护者**: LytJS Team
