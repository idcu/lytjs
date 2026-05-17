# LytJS 项目规则与架构

**注意**: 这是 Trae SOLO Code 模式的主要入口文档，请先阅读本文档了解项目

---

## ⚡ Skill 自动调度（重要）

### 自动调用机制

**Agent 应该在以下时机自动调用 Skill**：

| 场景 | 时机 | 自动调用的 Skill |
|------|------|----------------|
| **任务开始** | 用户提出新任务时 | `master-skill-dispatcher` |
| **遇到问题** | 测试失败、类型错误等 | `master-skill-dispatcher` |
| **任务完成** | 用户表示完成时 | `task-retrospective` |

### 如何使用

```markdown
# 任务开始时
Skill: master-skill-dispatcher

# 任务结束时
Skill: master-skill-dispatcher
# 然后自动触发
Skill: task-retrospective
```

### 快速参考

- 查看所有 Skill：[SKILLS.md](file:///f:/trae/lytjs/SKILLS.md)
- Skill 使用指南：[.trae/skills/master-skill-dispatcher/SKILL.md](file:///e:/trae/lytjs/.trae/skills/master-skill-dispatcher/SKILL.md)

---

## 快速开始

### 1. 常用命令

```bash
pnpm install          # 安装依赖
pnpm build            # 构建
pnpm test             # 测试
pnpm lint:check        # 代码检查
pnpm type-check     # 类型检查
```

### 2. Git 工作流

```bash
git checkout -b feature/xxx
pnpm lint:check && pnpm type-check
git commit --no-verify -m "feat(scope): 描述"
```

---

## 项目核心规则

### 语言与类型

- **语言**: 所有回答使用中文，变量名函数名用英文（camelCase/PascalCase）
- **注释**: 公共 API 必须有中文 JSDoc，关键逻辑加中文注释
- **类型**: 禁止 any（测试除外），优先 import type
- **代码**: 单个函数不超过 50 行，避免过度设计
- **零依赖**: L0-L6 层运行时无第三方依赖，优先用 @lytjs/common-*

---

## 包速查

| 包 | 路径 | 说明 |
|----|------|------|
| @lytjs/reactivity | packages/reactivity/ | 响应式核心 |
| @lytjs/vdom | packages/vdom/ | 虚拟 DOM |
| @lytjs/component | packages/component/ | 组件系统 |
| @lytjs/core | packages/core/ | 核心框架 |
| @lytjs/ui | packages/ecosystem/packages/ui/ | UI 组件库 |
| @lytjs/router | packages/ecosystem/packages/router/ | 路由 |
| @lytjs/store | packages/ecosystem/packages/store/ | 状态管理 |
| @lytjs/ssr | packages/ecosystem/packages/ssr/ | 服务端渲染 |

---

## Monorepo 结构

```
lytjs/
├── packages/
│   ├── reactivity/
│   ├── vdom/
│   ├── component/
│   ├── core/
│   └── ecosystem/packages/
│       ├── ui/
│       ├── router/
│       ├── store/
│       └── ssr/
├── .trae/          # Trae SOLO 目录
│   └── skills/      # Trae SOLO 技能文档
├── docs/
│   └── development/
└── benchmarks/
```

---

## 当前项目进度 (2026-05-17)

### v6.x 完成度: 93%

- v6.1: 57%
- v6.2: 100% ✅
- v6.3: 100% ✅

### 剩余任务 (v6.1)

- js-framework-benchmark 集成
- 性能排名验证

---

## 下一步

1. 查看 [SKILLS.md](file:///f:/trae/lytjs/SKILLS.md) - 技能索引
2. 查看 [INDEX.md](file:///f:/trae/lytjs/INDEX.md) - AI 索引（新！）
3. 参考 [docs/development/PENDING_TASKS.md](file:///f:/trae/lytjs/docs/development/PENDING_TASKS.md) - 任务清单

---

## 任务结束后的经验教训分析

每次任务完成后，**必须调用 `task-retrospective` Skill** 进行完整的任务复盘：

### ⚡ 快速启动：使用 task-retrospective Skill

任务结束时立即执行：

```
Skill: task-retrospective
```

这个 Skill 将引导你完成：
1. ✅ 任务状态确认
2. ✅ 成功因素分析
3. ✅ 遇到的问题记录
4. ✅ Skill 评估（新建/改进）
5. ✅ 代码资产复用分析
6. ✅ 开发效率优化建议
7. ✅ 文档记录

### Skill 使用场景

| 任务类型 | 是否使用 | 说明 |
|---------|---------|------|
| 功能开发 | ✅ 是 | 完整功能开发必须复盘 |
| Bug 修复 | ✅ 是 | 问题解决经验需要记录 |
| Release 发布 | ✅ 是 | 发布流程需要优化 |
| 文档更新 | ⚠️ 视情况 | 重大文档更新建议复盘 |
| 小修复/微调 | ❌ 否 | 单次小修改可省略 |

---

**详细文档参考:
- [task-retrospective Skill](file:///e:/trae/lytjs/.trae/skills/task-retrospective/SKILL.md) - 完整任务复盘指南
- 开发规范: [docs/development/DEVELOPMENT_GUIDELINES.md](file:///f:/trae/lytjs/docs/development/DEVELOPMENT_GUIDELINES.md)
- 常见问题: [docs/development/TROUBLESHOOTING.md](file:///f:/trae/lytjs/docs/development/TROUBLESHOOTING.md)
- 完整知识库: [docs/development/KNOWLEDGE_BASE.md](file:///f:/trae/lytjs/docs/development/KNOWLEDGE_BASE.md)
