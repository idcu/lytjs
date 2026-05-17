# LytJS 项目规则与架构

## 项目概述

LytJS 是一个从零构建的现代 JavaScript 框架项目，采用 Monorepo 结构管理多个包。

## 🤖 智能体行为规范

### 核心原则

> Agent 必须根据任务上下文，自动参考相关的 Skill 文档，无需用户显式调用！

### 工作原理

所有 Skill 文档位于 `.trae/skills/` 目录，按层级组织。Agent 在处理任务时：

1. **自动识别任务类型**：分析用户请求，确定是功能开发、Bug 修复、重构等
2. **自动查找相关 Skill**：根据任务类型，读取对应的 Skill 文档
3. **自动应用指导**：按照 Skill 文档中的指南执行任务

### 任务类型 → Skill 映射表

| 任务类型 | 自动参考的 Skill 文档 | 说明 |
|---------|---------------------|------|
| 新功能开发 | [master-skill-dispatcher](file:///e:/trae/lytjs/.trae/skills/7-organ/master-skill-dispatcher/SKILL.md) → [dev-guide](file:///e:/trae/lytjs/.trae/skills/4-organic/dev-guide/SKILL.md) → [testing](file:///e:/trae/lytjs/.trae/skills/3-inorganic/testing/SKILL.md) | 完整开发流程 |
| Bug 修复 | [troubleshooting](file:///e:/trae/lytjs/.trae/skills/3-inorganic/troubleshooting/SKILL.md) → [testing](file:///e:/trae/lytjs/.trae/skills/3-inorganic/testing/SKILL.md) | 问题排查与修复 |
| 代码重构 | [refactoring](file:///e:/trae/lytjs/.trae/skills/4-organic/refactoring/SKILL.md) → [code-review](file:///e:/trae/lytjs/.trae/skills/3-inorganic/code-review/SKILL.md) | 代码质量改进 |
| 创建新包 | [create-ecosystem-package](file:///e:/trae/lytjs/.trae/skills/5-cellular/create-ecosystem-package/SKILL.md) | 生态包开发 |
| 性能优化 | [performance-optimization](file:///e:/trae/lytjs/.trae/skills/4-organic/performance-optimization/SKILL.md) | 性能分析与优化 |
| 添加测试 | [testing](file:///e:/trae/lytjs/.trae/skills/3-inorganic/testing/SKILL.md) → [add-test-cases](file:///e:/trae/lytjs/.trae/skills/2-molecular/add-test-cases/SKILL.md) | 测试用例开发 |
| 快速查询 | [quick-reference](file:///e:/trae/lytjs/.trae/skills/1-atomic/quick-reference/SKILL.md) | 项目信息查询 |
| 查找命令 | [command-reference](file:///e:/trae/lytjs/.trae/skills/1-atomic/command-reference/SKILL.md) | 常用命令参考 |
| 任务完成 | [task-retrospective](file:///e:/trae/lytjs/.trae/skills/7-organ/task-retrospective/SKILL.md) | 任务复盘总结 |
| 智能分析 | [smart-task-analysis](file:///e:/trae/lytjs/.trae/skills/4-organic/smart-task-analysis/SKILL.md) | 任务类型识别 |
| 预定义工作流 | [predefined-workflows](file:///e:/trae/lytjs/.trae/skills/8-organism/predefined-workflows/SKILL.md) | 标准工作流程 |

### 自动调用 Checklist

在处理任何任务时，Agent 必须：

- [ ] **分析任务类型**：识别用户请求的性质
- [ ] **查找相关 Skill**：读取对应层级的 Skill 文档
- [ ] **应用 Skill 指导**：按照 Skill 文档中的步骤执行
- [ ] **使用 TodoWrite**：根据 Skill 创建任务清单
- [ ] **任务完成复盘**：最后参考 task-retrospective 进行总结

---

## 🧬 Skill 组织体系

本项目采用**从原子到生物体**的 Skill 层级架构：

```
原子 (Atomic) → 分子 (Molecular) → 无机物 (Inorganic) → 有机物 (Organic)
→ 细胞 (Cellular) → 组织 (Tissue) → 器官 (Organ) → 生物体 (Organism)
```

详细说明请参考：[SKILL_ORGANIZATION.md](file:///e:/trae/lytjs/.trae/skills/SKILL_ORGANIZATION.md)

---

## ⚡ 核心工作流（必须遵守）

```
用户提出任务
    ↓
[阶段1] 调用 master-skill-dispatcher（器官级）→ 获取任务规划
    ↓
[阶段2] 使用 TodoWrite 创建任务清单
    ↓
[阶段3] 执行任务（按需调用相关 Skill：原子 → 有机物级）
    ↓
[阶段4] 调用 task-retrospective（器官级）进行复盘
```

### 强制规则

- ✅ **必须调用**：任何新任务开始时，首先调用 `master-skill-dispatcher`
- ❌ **禁止跳过**：不允许直接开始执行任务
- 📋 **必须规划**：获取规划后，必须用 `TodoWrite` 创建任务清单

---

## 📋 任务开始前 Checklist

- [ ] 已调用 master-skill-dispatcher 获取任务规划
- [ ] 已明确任务类型和涉及的技术栈
- [ ] 已获取推荐的 Skill 列表
- [ ] 已使用 TodoWrite 创建任务清单
- [ ] 已确认任务范围和边界

---

## 🎯 何时调用 Skill

| 阶段 | 时机 | Skill | 层级 |
|------|------|-------|------|
| 任务开始前 | 新任务时 | `master-skill-dispatcher` | 器官级 |
| 任务开始前 | 识别任务类型时 | `smart-task-analysis` | 有机物级 |
| 需要工作流 | 套用标准流程时 | `predefined-workflows` | 生物体级 |
| 任务规划 | 制定步骤时 | `TodoWrite` | - |
| 需要清单 | 生成检查清单 | `task-checklist` | 原子级 |
| 需要命令 | 查找命令 | `command-reference` | 原子级 |
| 需要模板 | 获取代码模板 | `template-provider` | 原子级 |
| 快速查询 | 包/进度查询 | `quick-reference` | 原子级 |
| Git 操作 | 提交/分支 | `git-workflow` | 分子级 |
| 构建项目 | 构建相关 | `build-guide` | 分子级 |
| 运行测试 | 测试相关 | `test-commands` | 分子级 |
| 完整测试 | 测试指南 | `testing` | 无机物级 |
| 修复问题 | 问题排查 | `troubleshooting` | 无机物级 |
| 开发新功能 | 完整开发 | `dev-guide` | 有机物级 |
| 创建包 | 包创建 | `create-ecosystem-package` | 细胞级 |
| 任务完成 | 复盘 | `task-retrospective` | 器官级 |

---

## 📚 详细文档索引

### Skill 目录索引

| 层级 | 路径 | 说明 |
|------|------|------|
| 原子级 | `.trae/skills/1-atomic/` | 最小可复用单元 |
| 分子级 | `.trae/skills/2-molecular/` | 多个原子组合 |
| 无机物级 | `.trae/skills/3-inorganic/` | 功能模块 |
| 有机物级 | `.trae/skills/4-organic/` | 完整工作流 |
| 细胞级 | `.trae/skills/5-cellular/` | 独立功能模块 |
| 组织级 | `.trae/skills/6-tissue/` | 相关功能组织 |
| 器官级 | `.trae/skills/7-organ/` | 完整能力系统 |
| 生物体级 | `.trae/skills/8-organism/` | 端到端完整体验 |

### 关键文档

- [SKILL_ORGANIZATION.md](file:///e:/trae/lytjs/.trae/skills/SKILL_ORGANIZATION.md) - 🌟 Skill 组织体系说明
- [DEVELOPMENT_GUIDELINES.md](file:///f:/trae/lytjs/docs/development/DEVELOPMENT_GUIDELINES.md) - 完整开发规范
- [TROUBLESHOOTING.md](file:///f:/trae/lytjs/docs/development/TROUBLESHOOTING.md) - 常见问题

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

**注意**: 大型项目 lint 使用 `pnpm lint:batch` 避免内存溢出

---

## ⚡ 快速启动

```markdown
# 任务开始时（必须）
Skill: master-skill-dispatcher

# 识别任务类型（推荐）
Skill: smart-task-analysis

# 套用标准工作流
Skill: predefined-workflows

# 快速查询（原子级）
Skill: quick-reference
Skill: command-reference
Skill: template-provider

# 特定工作流（分子级）
Skill: git-workflow
Skill: build-guide
Skill: test-commands

# 完整工作流（有机物/细胞级）
Skill: dev-guide
Skill: testing
Skill: troubleshooting

# 任务结束时
Skill: task-retrospective
```

---

## 💡 最佳实践

1. **控制 Skill 内容粒度**：保持每个 Skill 清晰、聚焦、易于理解
2. **避免冲突**：各 Skill 之间不得彼此冲突或相互覆盖
3. **路径规范**：在指定文件路径时，使用相对于项目根目录的相对路径
4. **规则更新**：新建或修改规则后，建议开启全新对话使用
5. **代码重构**：若项目已有大量不符合规范的代码，明确任务为"重构"并强制遵循新规则
