# 贡献指南

欢迎为 Lyt.js 贡献代码！

## 开发环境搭建

```bash
# 克隆仓库
git clone https://gitee.com/lytjs/lytjs.git
cd lytjs

# 安装依赖
pnpm install

# 构建
pnpm build

# 运行测试
pnpm test
```

## 如何提交 Issue

1. 先搜索现有 Issue，避免重复
2. 使用合适的 Issue 模板
3. 提供尽可能详细的信息

## 如何提交 Pull Request

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 代码风格规范

### TypeScript 规范

- 项目使用 TypeScript 进行开发，请遵循严格的类型检查
- 所有公共 API 必须包含完整的类型定义和 JSDoc 注释
- 避免使用 `any`，优先使用具体类型或泛型
- 使用 `interface` 定义对象形状，使用 `type` 定义联合类型和工具类型

### ESLint 配置

- 项目根目录提供 `eslint.config.js` 配置文件
- 提交前请运行 `pnpm lint` 检查代码风格
- CI 流水线会自动运行 lint 检查，不通过的 PR 将无法合并

```bash
# 运行 lint 检查
pnpm lint

# 自动修复可修复的问题
pnpm lint --fix
```

## Commit 消息规范

项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（既不是新功能也不是修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建过程或辅助工具变更 |
| `ci` | CI 配置变更 |

### scope 范围

- `core` - 核心包 (@lytjs/core)
- `reactivity` - 响应式系统 (@lytjs/reactivity)
- `compiler` - 编译器 (@lytjs/compiler)
- `renderer` - 渲染器 (@lytjs/renderer)
- `component` - 组件系统 (@lytjs/component)
- `components` - 组件库 (@lytjs/components)
- `router` - 路由 (@lytjs/router)
- `store` - 状态管理 (@lytjs/store)
- `cli` - 命令行工具 (@lytjs/cli)

### 示例

```
feat(core): 添加 createApp 错误边界支持
fix(reactivity): 修复嵌套 computed 循环依赖检测
docs(components): 更新 Button 组件 API 文档
```

## PR 提交模板

提交 PR 时请确保：

1. **标题清晰**：使用 Conventional Commits 格式作为 PR 标题
2. **描述完整**：
   - 说明变更的动机和背景
   - 列出主要改动点
   - 如有相关 Issue，使用 `Fixes #xxx` 或 `Closes #xxx` 关联
3. **测试覆盖**：
   - 为新功能添加对应的测试用例
   - 确保所有现有测试通过（`pnpm test`）
   - 代码风格检查通过（`pnpm lint`）
4. **文档更新**：
   - 公共 API 变更需要更新对应的文档
   - 破坏性变更需要在 PR 描述中明确标注

## 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 主分支，保持稳定可发布状态 |
| `develop` | 开发分支，集成最新开发中的功能 |
| `feature/*` | 功能分支，从 `develop` 创建 |
| `fix/*` | 修复分支，从 `develop` 创建 |
| `release/*` | 发布分支，从 `develop` 创建，用于版本发布准备 |
| `hotfix/*` | 紧急修复分支，从 `main` 创建 |

### 分支工作流

1. 从 `develop` 创建 `feature/xxx` 分支进行开发
2. 开发完成后提交 PR 到 `develop`
3. 代码审查通过后合并到 `develop`
4. 准备发版时从 `develop` 创建 `release/x.x.x` 分支
5. 测试通过后合并 `release/x.x.x` 到 `main` 并打 tag
6. 同时将 `release/x.x.x` 合并回 `develop`

## 开发工作流

1. 创建 Issue 讨论
2. 获得反馈
3. 提交 PR
4. 代码审查
5. 合并

感谢你的贡献！
