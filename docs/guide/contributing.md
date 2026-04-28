# 贡献指南

感谢你对 Lyt.js 的关注！本文档将帮助你参与项目开发。

## 开发环境

```bash
# 克隆仓库（主仓库在 Gitee）
git clone git@gitee.com:lytjs/lytjs.git
cd lytjs

# 切换到 develop 分支
git checkout develop

# 安装依赖
pnpm install

# 运行测试
pnpm test

# 运行构建
pnpm build
```

## 开发流程

1. 从 `develop` 创建功能分支：`feat/your-feature`
2. 编写代码和测试
3. 确保所有测试通过：`pnpm test`
4. 确保代码检查通过：`pnpm lint`
5. 提交代码（遵循 Conventional Commits）
6. 创建 Pull Request 到 `develop`

## 代码规范

- 使用 TypeScript strict 模式
- 遵循 ESLint 配置
- 遵循 Prettier 格式化规则
- 测试覆盖率不低于 80%

## Commit 规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档变更
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `build`: 构建
- `ci`: CI 配置
- `chore`: 杂项

### Scope

- `common`, `reactivity`, `vdom`, `compiler`, `renderer`, `component`, `core`
- `ecosystem`, `lytui`, `plugins`, `tools`
- `docs`, `ci`, `release`
