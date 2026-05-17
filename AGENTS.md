# LytJS 项目规则与架构

**注意**: 这是 Trae SOLO Code 模式的主要入口文档，请先阅读本文档了解项目

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

每次任务完成后，都需要进行以下分析，以持续改进开发效率和优化资源消耗：

### 1. 任务复盘

- **成功因素**：分析任务顺利完成的关键因素，记录可复用的经验
- **遇到的问题**：记录开发过程中遇到的困难和解决方案
- **时间消耗**：评估任务实际耗时与预期的差异，找出优化点

### 2. Skill 评估

在每次任务结束时，必须评估以下可能性：

#### 新建 Skill
- 是否存在重复执行的任务模式，可以抽象为新的 Skill？
- 是否有复杂的多步骤流程，可以通过 Skill 自动化？
- 是否有领域特定的知识，可以封装为 Skill 供未来使用？

#### 融入现有 Skill
- 现有 Skill 是否可以优化以覆盖本次任务的场景？
- 是否可以增强现有 Skill 的功能，使其更通用？
- 是否可以简化现有 Skill 的使用方式？

### 3. 代码资产复用

- **公共类型提取**：检查是否存在可以抽象为公共类型的重复类型定义，将其提取到 @lytjs/common 或相应包中
- **公共函数提取**：识别多次复用的函数逻辑，评估是否可以抽象为公共函数或工具函数
- **接口规范化**：确保提取的公共代码符合现有架构规范（参考 architecture skill）

### 4. 开发效率优化措施

- **流程优化**：识别可以简化或自动化的开发流程
- **文档改进**：是否需要更新或补充文档以减少未来的重复工作？
- **工具改进**：是否需要开发新的工具或脚本？

### 5. Token 消耗优化

- **上下文管理**：评估如何更有效地管理对话上下文，减少不必要的重复信息
- **工具使用**：优化工具调用策略，减少冗余操作
- **代码复用**：优先使用已有的代码和 Skill，避免重复开发

### 6. 记录与反馈

将分析结果记录在相应的文档中，并及时反馈给团队，推动持续改进。

---

**详细文档参考:
- 开发规范: [docs/development/DEVELOPMENT_GUIDELINES.md](file:///f:/trae/lytjs/docs/development/DEVELOPMENT_GUIDELINES.md)
- 常见问题: [docs/development/TROUBLESHOOTING.md](file:///f:/trae/lytjs/docs/development/TROUBLESHOOTING.md)
- 完整知识库: [docs/development/KNOWLEDGE_BASE.md](file:///f:/trae/lytjs/docs/development/KNOWLEDGE_BASE.md)
