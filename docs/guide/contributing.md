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
- `adapter-web`, `web`, `dom`, `dom-runtime`
- `shared-types`, `host-contract`
- `ecosystem`, `lytui`, `plugins`, `tools`
- `docs`, `ci`, `release`

## 代码审查流程

### PR 审查标准

所有 Pull Request 必须通过以下审查标准：

1. **代码质量**：代码逻辑清晰、可读性好，遵循项目既定的编码规范和设计模式
2. **测试覆盖**：新增或变更的功能必须有对应的单元测试，测试覆盖率不低于 80%
3. **类型安全**：TypeScript 类型定义完整，无 `any` 滥用，`strict` 模式下无类型错误
4. **文档完整性**：公共 API 变更需同步更新相关文档（JSDoc、类型定义、使用指南等）

### 审查者要求

- 每个 PR 至少需要 **1 人** 审查通过后方可合并
- 审查者应关注代码正确性、性能影响、向后兼容性等方面
- 对于涉及核心模块（reactivity、vdom、renderer、compiler）的变更，建议增加审查人数

### 合并条件

PR 满足以下全部条件时方可合并：

1. **CI 通过**：所有自动化检查（构建、测试、代码检查）均通过
2. **审查通过**：至少 1 名审查者批准（Approved）
3. **无冲突**：与目标分支无合并冲突
