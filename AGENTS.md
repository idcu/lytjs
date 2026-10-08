# LytJS 项目智能体规则

> **AI 必读**：本文件为项目入口规则。
>
> ⚡ **AI 快速上手**：请\*\*第一步先读 [.ai/QUICKSTART.md](.ai/QUICKSTART.md) - 为您准备的AI助手快速上手指南，帮您快速了解项目，节省Token！
>
> AI 应首先阅读此文件，然后根据任务类型匹配相应流程执行。

> ⚠️ **关于 AI 工具链（2026-10 更新）**：历史上的 `.trae/skills/**` 工具链**已废弃**
> （`.trae/` 已列入 `.gitignore`、不作为仓库内容）。当前唯一真源为 **keel**：
> 入口 [keel/INDEX.md](keel/INDEX.md)、操作手册 [keel/skills/INDEX.md](keel/skills/INDEX.md)、
> 坑库 [keel/pitfalls/INDEX.md](keel/pitfalls/INDEX.md)、门禁真源 [keel/checks/rules.md](keel/checks/rules.md)。
> 完整开发流程以 [docs/contribute/development/workflow.md](docs/contribute/development/workflow.md) 内联内容为准。

**点火锚点（keel，规范原文，禁止改写）：** 任何任务开始前，先读 keel/INDEX.md 与其中指向的 NOW.md，并遵守 INDEX.md 里的检索协议。

## 项目速览

- **名称**：LytJS - 现代 JavaScript 响应式框架
- **结构**：Monorepo，零外部依赖原则
- **语言**：中文文档优先

---

## 任务入口

**第一步**：读 [keel/INDEX.md](keel/INDEX.md) → [keel/NOW.md](keel/NOW.md)，按检索协议定位资料；再识别用户意图与任务复杂度。

| 任务复杂度 | 入口        | 说明                             |
| ---------- | ----------- | -------------------------------- |
| 简单任务   | 直接执行    | 无需规划，按流程执行             |
| 中等任务   | Plan + 执行 | 生成 plan 后按步骤执行           |
| 复杂任务   | Spec + 执行 | 生成 spec/tasks/checklist 后执行 |

> 完整流程见 [开发流程指南](docs/contribute/development/workflow.md)。

### 常见任务速查

| 场景               | 参考                                                                                       | 复杂度   |
| ------------------ | ------------------------------------------------------------------------------------------ | -------- |
| 类型错误           | [开发流程 · 场景映射表](docs/contribute/development/workflow.md#场景映射表)                | 简单     |
| 测试失败           | [keel 坑库 · verify](keel/pitfalls/INDEX.md)                                               | 简单     |
| 构建失败           | [keel 坑库 · build](keel/pitfalls/INDEX.md)                                                | 简单     |
| **PATCH 版本开发** | [版本开发流程 · PATCH](docs/contribute/development/version-workflow.md#patch-版本开发流程) | **简单** |
| 新功能开发         | [开发流程指南](docs/contribute/development/workflow.md)                                    | 中等     |
| 代码重构           | [开发流程指南](docs/contribute/development/workflow.md)                                    | 中等     |
| 局部性能优化       | [keel 操作手册](keel/skills/INDEX.md)                                                      | 中等     |
| 安全审查           | [keel 门禁真源](keel/checks/rules.md)                                                      | 中等     |
| 发布版本           | [版本开发流程 · 通用发布](docs/contribute/development/version-workflow.md#通用发布流程)    | 中等     |
| **MINOR 版本开发** | [版本开发流程 · MINOR](docs/contribute/development/version-workflow.md#minor-版本开发流程) | **中等** |
| 系统级性能优化     | [keel 操作手册](keel/skills/INDEX.md) + [keel 决策](keel/decisions/INDEX.md)               | 复杂     |
| 创建生态包         | [开发流程指南](docs/contribute/development/workflow.md)                                    | 复杂     |
| 创建插件           | [插件开发指南](docs/contribute/plugins/plugin-development.md)                              | 复杂     |
| **MAJOR 版本开发** | [版本开发流程 · MAJOR](docs/contribute/development/version-workflow.md#major-版本开发流程) | **复杂** |
| **版本升级**       | [版本开发流程](docs/contribute/development/version-workflow.md)                            | **复杂** |

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
pnpm check-build-order   # 构建顺序守卫（新增/删除包后必跑）
pnpm type-check          # 类型检查
pnpm lint:check          # 代码检查（内存不足用 pnpm lint:batch）
pnpm test                # 运行测试
```

门禁真源见 [keel/checks/rules.md](keel/checks/rules.md)（快/慢档、棘轮规则）。

---

## 常用修复命令

| 命令                  | 用途                       | 场景         |
| --------------------- | -------------------------- | ------------ |
| `pnpm lint`           | 自动修复可修复的 lint 问题 | 优先使用     |
| `pnpm lint:check`     | 检查 lint 错误             | 查看当前状态 |
| `pnpm lint:batch`     | 批量检查（内存优化）       | 大规模检查   |
| `pnpm lint:batch:fix` | 批量自动修复               | 大规模修复   |

**推荐修复流程**：

1. 运行 `pnpm lint` 自动修复
2. 运行 `pnpm lint:check` 查看剩余问题
3. 按 [keel 坑库](keel/pitfalls/INDEX.md) 与场景映射表手动修复
4. 提交代码

---

## 任务复盘（每次任务后必做）

每次任务完成后，**必须写回 keel**（否则本轮不算完成）：

1. 更新 [keel/NOW.md](keel/NOW.md)：本轮完成 / 下一步 / 阻塞
2. 新坑登记进 [keel/pitfalls/INDEX.md](keel/pitfalls/INDEX.md)，并维护 triggers
3. 回顾目标与结果的差距，提取可复用经验

协议原文见 [keel/INDEX.md](keel/INDEX.md)「检索协议」第 5 条。

---

## 智能体工具（keel）

| 场景        | 入口                                               |
| ----------- | -------------------------------------------------- |
| 检索协议    | [keel/INDEX.md](keel/INDEX.md)                     |
| 当前焦点    | [keel/NOW.md](keel/NOW.md)                         |
| 操作手册    | [keel/skills/INDEX.md](keel/skills/INDEX.md)       |
| 坑库        | [keel/pitfalls/INDEX.md](keel/pitfalls/INDEX.md)   |
| 门禁真源    | [keel/checks/rules.md](keel/checks/rules.md)       |
| 架构/依赖   | [keel/ARCHITECTURE.md](keel/ARCHITECTURE.md)       |
| 决策记录    | [keel/decisions/INDEX.md](keel/decisions/INDEX.md) |
| 契约真源    | [keel/contracts/INDEX.md](keel/contracts/INDEX.md) |
| 环境/依赖锁 | [keel/env/INDEX.md](keel/env/INDEX.md)             |
| 术语表      | [keel/GLOSSARY.md](keel/GLOSSARY.md)               |

---

## 发布与运维

| 场景             | 入口                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| **一键版本升级** | [版本开发流程 · 通用发布](docs/contribute/development/version-workflow.md#通用发布流程)                               |
| 发布 npm 包      | `pnpm publish:prepare` → `pnpm publish:all` → `pnpm publish:restore`（见 [PUBLISH-MANIFEST.md](PUBLISH-MANIFEST.md)） |
| 版本管理         | `pnpm run sync-versions` / `pnpm run versions:update`                                                                 |
| 生成 CHANGELOG   | 见 [版本开发流程](docs/contribute/development/version-workflow.md) 步骤 3                                             |
| 环境配置         | [keel/env/INDEX.md](keel/env/INDEX.md) + [keel/env/setup.md](keel/env/setup.md)                                       |
| Roadmap 管理     | [docs/contribute/roadmap/current.md](docs/contribute/roadmap/current.md)                                              |

---

## 完整指南

- [开发流程指南](docs/contribute/development/workflow.md) - 完整开发工作流程（必读）
- [版本开发流程](docs/contribute/development/version-workflow.md) - PATCH/MINOR/MAJOR
- [keel 入口](keel/INDEX.md) - AI 工具链真源
- [AI 助手开发指南](docs/contribute/ai/assistant-guide.md) - 省 Token 使用指南
- [开发规范](docs/contribute/development/guidelines.md) - 详细规范

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
⚠️ 此文件原由 .trae/tools/generate-agents.ts 自动生成（生成脚本与元数据当前不在仓内）。
   2026-10-08：技能映射表已由手工重写，去除已废弃的 `.trae/skills/**` 死链，改锚 keel 与内联流程文档。
   keel 点火锚点（2026-10-05 加入）为手工维护，规范原文禁止改写。
-->
