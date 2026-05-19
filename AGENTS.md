# LytJS 项目智能体规则

> **AI 必读**：本文件为项目入口规则。AI 应首先阅读此文件，然后根据任务类型匹配技能链执行。

## 项目速览

- **名称**：LytJS - 现代 JavaScript 响应式框架
- **结构**：Monorepo，零外部依赖原则
- **语言**：中文文档优先

---

## 任务入口

**第一步**：识别用户意图，匹配 [skill-chains](.trae/skills/skill-chains/SKILL.md) 中的预定义技能链。

| 任务复杂度 | 入口 | 说明 |
|-----------|------|------|
| 简单任务 | 技能链直接执行 | 无需规划，按链顺序执行 |
| 中等任务 | 技能链 + `/plan` | 生成 Plan 后按链执行 |
| 复杂任务 | 技能链 + `/spec` | 生成 Spec 后按链执行 |

### 常用技能链速查

| 场景 | 技能链 | 复杂度 |
|------|--------|--------|
| 类型错误 | [fix-type-error](.trae/skills/skill-chains/SKILL.md#fix-type-error--修复类型错误) | 简单 |
| 测试失败 | [fix-test-failure](.trae/skills/skill-chains/SKILL.md#fix-test-failure--修复测试失败) | 简单 |
| 构建失败 | [fix-build-error](.trae/skills/skill-chains/SKILL.md#fix-build-error--修复构建失败) | 简单 |
| 新功能开发 | [new-feature](.trae/skills/skill-chains/SKILL.md#new-feature--新功能开发) | 中等 |
| 代码重构 | [refactor-code](.trae/skills/skill-chains/SKILL.md#refactor-code--代码重构) | 中等 |
| 性能优化 | [perf-optimize-local](.trae/skills/skill-chains/SKILL.md#perf-optimize-local--局部性能优化) / [perf-optimize-system](.trae/skills/skill-chains/SKILL.md#perf-optimize-system--系统级性能优化) | 中等/复杂 |
| 创建包 | [create-package](.trae/skills/skill-chains/SKILL.md#create-package--创建生态包) | 复杂 |
| 创建插件 | [create-plugin](.trae/skills/skill-chains/SKILL.md#create-plugin--创建插件) | 复杂 |
| 安全审查 | [security-audit](.trae/skills/skill-chains/SKILL.md#security-audit--安全审查) | 中等 |
| 发布版本 | [publish-release](.trae/skills/skill-chains/SKILL.md#publish-release--发布版本) | 中等 |

> 完整技能链列表见 [skill-chains](.trae/skills/skill-chains/SKILL.md)

---

## 验证流程（提交前必做）

```bash
pnpm type-check    # 类型检查
pnpm lint:check    # 代码检查（内存不足用 pnpm lint:batch）
pnpm test          # 运行测试
```

---

## 任务复盘（每次任务后必做）

每次任务完成后，**必须**调用 [retrospective](.trae/skills/retrospective/SKILL.md) 进行复盘：
1. 回顾目标与结果的差距
2. 提取可复用的经验
3. 评估是否新建或完善 Skill

---

## Skill 技能

| 场景 | Skill |
|------|-------|
| 技能链速查 | [skill-chains](.trae/skills/skill-chains/SKILL.md) |
| 如何使用 Skill | [skill-usage](.trae/skills/skill-usage/SKILL.md) |
| 如何设计 Skill | [skill-design](.trae/skills/skill-design/SKILL.md) |
| 如何维护 Skill | [skill-maintenance](.trae/skills/skill-maintenance/SKILL.md) |
| 新建 Skill | [create-skill](.trae/skills/create-skill/SKILL.md) |
| 新建 Spec | [create-spec](.trae/skills/create-spec/SKILL.md) |
| 新建 Plan | [create-plan](.trae/skills/create-plan/SKILL.md) |

---

## 发布与运维

| 场景 | Skill |
|------|-------|
| 发布 npm 包 | [publish-package](.trae/skills/publish-package/SKILL.md) |
| 版本管理 | [manage-version](.trae/skills/manage-version/SKILL.md) |
| 生成 CHANGELOG | [generate-changelog](.trae/skills/generate-changelog/SKILL.md) |
| CI/CD 配置 | [setup-cicd](.trae/skills/setup-cicd/SKILL.md) |
| 依赖管理 | [manage-dependencies](.trae/skills/manage-dependencies/SKILL.md) |
| 代码调试 | [debug-code](.trae/skills/debug-code/SKILL.md) |

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
- **PowerShell 不支持 && 语法**：在 Windows 环境中运行多命令时，请使用分号 `;` 代替 `&&`，或者分别执行每个命令
- 使用 `cd <path>; <command>` 代替 `cd <path> && <command>`
