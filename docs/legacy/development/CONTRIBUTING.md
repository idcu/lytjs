# LytJS 贡献者指南

感谢您对 LytJS 的关注！本指南将帮助您了解如何为 LytJS 项目做出贡献。

## 目录

- [如何贡献](#如何贡献)
- [开发环境](#开发环境)
- [快速开始](#快速开始)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)
- [插件开发](#插件开发)
- [社区规范](#社区规范)

---

## 如何贡献

### 贡献类型

LytJS 欢迎各种形式的贡献：

#### 1. 代码贡献

| 类型 | 说明 |
|------|------|
| Bug 修复 | 修复现有问题 |
| 新功能 | 实现新特性 |
| 性能优化 | 提升框架性能 |
| 代码重构 | 改善代码结构 |

#### 2. 文档贡献

| 类型 | 说明 |
|------|------|
| 文档完善 | 补充缺失内容 |
| 翻译文档 | 多语言支持 |
| 教程撰写 | 使用教程 |
| 案例分享 | 实战案例 |

#### 3. 社区贡献

| 类型 | 说明 |
|------|------|
| 问题解答 | 回答社区问题 |
| 代码审查 | Review Pull Request |
| 功能测试 | 验证新功能 |
| 反馈建议 | 改进建议 |

---

## 开发环境

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### 开发流程

1. Fork 并克隆仓库
2. 执行 `pnpm install` 安装依赖
3. 执行 `pnpm build` 构建所有包
4. 执行 `pnpm test` 运行测试

详细的开发指南请参阅 [WORKFLOW.md](./WORKFLOW.md)。

---

## 快速开始

1. 从 `develop` 创建功能分支：`feature/xxx` 或 `fix/xxx`
2. 编写代码和测试
3. 确保所有测试通过：`pnpm test`
4. 确保代码检查通过：`pnpm lint`
5. 提交代码（遵循 Conventional Commits）
6. 创建 Pull Request 到 `develop`

---

## 代码规范

### 代码风格

- 使用 TypeScript 编写所有代码
- 遵循零外部依赖原则（运行时代码）
- 运行 `pnpm lint` 检查代码风格
- 运行 `pnpm type-check` 进行类型检查

详细规范请参阅 [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)。

---

## 提交规范

提交信息格式：
```
type(scope): description
```

类型包括：
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 代码重构
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 构建/工具相关

### 分支管理

- `main`: 主分支，稳定版本
- `develop`: 开发分支
- 功能分支：`feature/xxx`
- 修复分支：`fix/xxx`

---

## 测试要求

- 运行所有测试：`pnpm test`
- 运行特定包测试：`pnpm test --filter @lytjs/xxx`
- 确保所有测试通过后再提交 PR

---

## 架构设计

了解 LytJS 架构请参阅 [ARCHITECTURE.md](./ARCHITECTURE.md)。

---

## 社区规范

- 尊重其他贡献者
- 使用欢迎和包容的语言
- 接受建设性批评
- 关注社区利益

---

## 更多资源

- [开发工作流](./WORKFLOW.md)
- [开发规范](./DEVELOPMENT_GUIDELINES.md)
- [架构设计](./ARCHITECTURE.md)
- [插件开发](./PLUGIN_DEVELOPMENT.md)
- [路线图](./ROADMAP_NEXT_STEPS.md)

---

**感谢您的贡献！**
