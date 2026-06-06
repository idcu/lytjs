# LytJS 项目智能体规则

> **AI 必读**：本文件为项目入口规则。
> 
> ⚡ **AI 快速上手**：请**第一步先读 [.ai/QUICKSTART.md](.ai/QUICKSTART.md) - 为您准备的AI助手快速上手指南，帮您快速了解项目，节省Token！
> 
> AI 应首先阅读此文件，然后根据任务类型匹配技能链执行。

## 项目速览

- **名称**：LytJS - 现代 JavaScript 响应式框架
- **结构**：Monorepo，零外部依赖原则
- **语言**：中文文档优先

---

## 任务入口

**第一步**：识别用户意图，匹配 [skill-chains](.trae/skills/skill-chains/SKILL.md) 中的预定义技能链。

| 任务复杂度 | 入口             | 说明                   |
| ---------- | ---------------- | ---------------------- |
| 简单任务   | 技能链直接执行   | 无需规划，按链顺序执行 |
| 中等任务   | 技能链 + /plan | 生成 Plan 后按链执行   |
| 复杂任务   | 技能链 + /spec | 生成 Spec 后按链执行   |

### 常用技能链速查

| 场景         | 技能链                                                                                                                                                                                                                                                           | 复杂度             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 类型错误     | [类型错误](.trae/skills/skill-chains/SKILL.md#fix-type-error---修复类型错误) | 简单               |
| 测试失败     | [测试失败](.trae/skills/skill-chains/SKILL.md#fix-test-failure---修复测试失败) | 简单               |
| 构建失败     | [构建失败](.trae/skills/skill-chains/SKILL.md#fix-build-error---修复构建错误) | 简单               |
| **PATCH 版本开发**     | **[PATCH 版本开发](.trae/skills/skill-chains/SKILL.md#patch-version---patch-版本开发)** | **简单**               |
| 新功能开发     | [新功能开发](.trae/skills/skill-chains/SKILL.md#new-feature---新功能开发) | 中等               |
| 代码重构     | [代码重构](.trae/skills/skill-chains/SKILL.md#refactor-code---代码重构) | 中等               |
| 局部性能优化     | [局部性能优化](.trae/skills/skill-chains/SKILL.md#perf-optimize-local---局部性能优化) | 中等               |
| 安全审查     | [安全审查](.trae/skills/skill-chains/SKILL.md#security-audit---安全审查) | 中等               |
| 发布版本     | [发布版本](.trae/skills/skill-chains/SKILL.md#publish-release---发布版本) | 中等               |
| **MINOR 版本开发**     | **[MINOR 版本开发](.trae/skills/skill-chains/SKILL.md#minor-version---minor-版本开发)** | **中等**               |
| 系统级性能优化     | [系统级性能优化](.trae/skills/skill-chains/SKILL.md#perf-optimize-system---系统级性能优化) | 复杂               |
| 创建生态包     | [创建生态包](.trae/skills/skill-chains/SKILL.md#create-package---创建生态包) | 复杂               |
| 创建插件     | [创建插件](.trae/skills/skill-chains/SKILL.md#create-plugin---创建插件) | 复杂               |
| **MAJOR 版本开发**     | **[MAJOR 版本开发](.trae/skills/skill-chains/SKILL.md#major-version---major-版本开发)** | **复杂**               |
| **版本升级**     | **[版本升级](.trae/skills/skill-chains/SKILL.md#version-upgrade---版本升级推荐)** | **复杂**               |

> 完整技能链列表见 [skill-chains](.trae/skills/skill-chains/SKILL.md)

---

## 语义化版本开发原则

基于语义化版本号（MAJOR.MINOR.PATCH）的版本开发：

- **PATCH 版本（vX.X.1）**：Bug 修复，最小化变更，保持向后兼容
- **MINOR 版本（vX.1.0）**：新增功能，向后兼容，模块化开发
- **MAJOR 版本（v1.0.0）**：不兼容的 API 变更，分阶段发布（Alpha/Beta/RC）

详细流程参见：[版本开发流程](docs/contribute/development/version-workflow.md)

---

## 验证流程（提交前必做）

```bash
pnpm type-check    # 类型检查
pnpm lint:check    # 代码检查（内存不足用 pnpm lint:batch）
pnpm test    # 运行测试
```

---

## 常用修复命令

| 命令                  | 用途                       | 场景         |
| --------------------- | -------------------------- | ------------ |
| `pnpm lint`           | 自动修复可修复的 lint 问题 | 优先使用     |
| `pnpm lint:check`           | 检查 lint 错误 | 查看当前状态     |
| `pnpm lint:batch`           | 批量检查（内存优化） | 大规模检查     |
| `pnpm lint:batch:fix`           | 批量自动修复 | 大规模修复     |

**推荐修复流程**：

1. 运行 `pnpm lint` 自动修复
2. 运行 `pnpm lint:check` 查看剩余问题
3. 使用 lint-fix skill 按优先级手动修复
4. 提交代码

---

## 任务复盘（每次任务后必做）

每次任务完成后，**必须**调用 [retrospective](.trae/skills/retrospective/SKILL.md) 进行复盘：

1. 回顾目标与结果的差距
2. 提取可复用的经验
3. 评估是否新建或完善 Skill

---

## Skill 技能

| 场景           | Skill                                                        |
| -------------- | ------------------------------------------------------------ |
| 技能链速查 | [技能链速查](.trae/skills/skill-chains/SKILL.md) |
| 如何使用 Skill | [如何使用 Skill](.trae/skills/skill-usage/SKILL.md) |
| 如何设计 Skill | [如何设计 Skill](.trae/skills/skill-design/SKILL.md) |
| 如何维护 Skill | [如何维护 Skill](.trae/skills/skill-maintenance/SKILL.md) |
| 新建 Skill | [新建 Skill](.trae/skills/create-skill/SKILL.md) |
| 新建 Spec | [新建 Spec](.trae/skills/create-spec/SKILL.md) |
| 新建 Plan | [新建 Plan](.trae/skills/create-plan/SKILL.md) |

---

## 发布与运维

| 场景           | Skill                                                        |
| -------------- | ------------------------------------------------------------ |
| **环境配置管理** | **[环境配置管理](.trae/skills/env-setup/SKILL.md)** |
| **Roadmap 管理** | **[Roadmap 管理](.trae/skills/roadmap-management/SKILL.md)** |
| **一键版本升级** | **[一键版本升级](.trae/skills/skill-chains/SKILL.md#version-upgrade---版本升级推荐)** |
| 发布 npm 包 | [发布 npm 包](.trae/skills/npm-publish/SKILL.md) |
| 发布包 | [发布包](.trae/skills/publish-package/SKILL.md) |
| 版本管理 | [版本管理](.trae/skills/manage-version/SKILL.md) |
| 生成 CHANGELOG | [生成 CHANGELOG](.trae/skills/generate-changelog/SKILL.md) |
| CI/CD 配置 | [CI/CD 配置](.trae/skills/setup-cicd/SKILL.md) |
| 依赖管理 | [依赖管理](.trae/skills/manage-dependencies/SKILL.md) |
| 代码调试 | [代码调试](.trae/skills/debug-code/SKILL.md) |

---

## 完整指南

- [开发流程指南](docs/development/WORKFLOW.md) - 完整开发工作流程梳理（必读）
- [技能链](.trae/skills/skill-chains/SKILL.md) - 预定义技能组合（首选）
- [工作流程](.trae/skills/workflow/SKILL.md) - 完整开发流程
- [任务类型映射](.trae/skills/task-types/SKILL.md) - 任务与 Skill 对照
- [Skill 索引](.trae/skills/SKILL_INDEX.md) - 所有 Skill 列表

---

## 关键约定

### Git 提交

- 格式：`type(scope): 描述`
- 类型：`feat`/`fix`/`refactor`/`docs`/`test`/`chore`
- 分支：`feature/xxx`/`fix/xxx`/`refactor/xxx`/`docs/xxx`

### 代码规范

- 零外部依赖（工程化工具除外）
- 类型安全优先
- 测试覆盖核心逻辑

### 终端/Shell 兼容性

- PowerShell 不支持 && 语法：在 Windows 环境中运行多命令时，请使用分号 ; 代替 &&，或者分别执行每个命令
- 使用 cd <path>; <command> 代替 cd <path> && <command>


<!---
⚠️ 此文件由 .trae/tools/generate-agents.ts 自动生成
   从 .trae/meta/agents-meta.json 生成，最后更新于 2026-06-06
   请不要直接编辑此文件，而是编辑元数据文件！
-->
