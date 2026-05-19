# 贡献指南

欢迎参与 LytJS 项目的贡献！本指南将帮助你了解如何开始贡献。

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### 开发流程

1. Fork 并克隆仓库
2. 执行 `pnpm install` 安装依赖
3. 执行 `pnpm build` 构建所有包
4. 执行 `pnpm test` 运行测试

## 开发规范

### 代码风格

- 使用 TypeScript 编写所有代码
- 遵循零外部依赖原则（运行时代码）
- 运行 `pnpm lint` 检查代码风格
- 运行 `pnpm type-check` 进行类型检查

### 提交规范

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

## 测试

- 运行所有测试：`pnpm test`
- 运行特定包测试：`pnpm test --filter @lytjs/xxx`
- 确保所有测试通过后再提交 PR

## 构建

- 构建所有包：`pnpm build`
- 构建特定包：`pnpm build --filter @lytjs/xxx`

## 提交 Pull Request

1. 确保你的代码符合项目规范
2. 确保所有测试通过
3. 更新相关文档
4. 提交 PR 并详细描述变更内容

## 项目结构

```
lytjs/
├── packages/       # 所有包
│   ├── core/      # 核心包
│   ├── reactivity/# 响应式系统
│   ├── ui/        # UI 组件库
│   └── ...        # 其他包
├── docs/          # 文档
├── scripts/       # 构建脚本
└── ...
```

## 更多资源

详细的开发指南请参阅 [docs/development/](./docs/development/)。
