# 贡献指南

感谢你对 Lyt.js 的关注！我们欢迎任何形式的贡献，包括但不限于代码提交、Bug 报告、功能建议、文档改进和代码审查。

> 「轻写轻跑，所见即代码」—— Lyt.js

## 目录

- [开发环境搭建](#开发环境搭建)
- [项目结构概览](#项目结构概览)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [测试规范](#测试规范)
- [文档规范](#文档规范)
- [PR 检查清单](#pr-检查清单)

## 开发环境搭建

### 前置要求

- **Node.js** >= 18.0.0
- **pnpm**（推荐最新版本）
- **Git**

### Fork & Clone

```bash
# 1. Fork 本仓库到你的 GitHub/Gitee 账号

# 2. 克隆你 Fork 的仓库
git clone https://gitee.com/<your-username>/lytjs.git
cd lytjs

# 3. 添加上游仓库（方便后续同步）
git remote add upstream https://gitee.com/lytjs/lytjs.git
```

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
pnpm build
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

### 代码检查

```bash
# 运行 lint 检查
pnpm lint

# 自动修复可修复的问题
pnpm lint:fix
```

## 项目结构概览

Lyt.js 采用 **Monorepo** 架构，使用 pnpm workspace 管理，所有包位于 `packages/` 目录下：

```
lytjs/
├── packages/
│   ├── core/           # 核心包 — createApp、h()、插件系统、错误处理
│   ├── reactivity/     # 响应式系统 — ref、reactive、computed、watch、effect、signal
│   ├── renderer/       # 渲染器 — DOM 渲染、SSR 渲染、MiniApp 渲染、Vapor 模式
│   ├── compiler/       # 编译器 — 模板编译、SFC 编译、WASM 编译器
│   ├── component/      # 组件系统 — defineComponent、生命周期、Props、Slots、内置组件
│   ├── components/     # 组件库 — UI 组件集合（Button、Modal、Table 等）
│   ├── common/         # 公共工具 — 通用工具函数、事件总线、调度器
│   ├── compat/         # 兼容层 — Vue 3 API 兼容
│   ├── cli/            # 命令行工具 — create、dev、build、generate
│   ├── devtools/       # 开发者工具 — 组件树、状态检查、性能分析、时间旅行
│   ├── router/         # 路由
│   ├── store/          # 状态管理
│   ├── lytx/           # 全栈框架 — SSR、API 路由、中间件
│   ├── ai/             # AI 辅助 — AI 代码补全、组件生成
│   ├── plugin-sdk/     # 插件 SDK — 插件管理、注册、脚手架
│   ├── plugin-i18n/    # 国际化插件
│   ├── plugin-auth/    # 认证插件
│   ├── plugin-logger/  # 日志插件
│   ├── plugin-storage/ # 存储插件
│   ├── plugin-theme/   # 主题插件
│   ├── plugins/        # 插件聚合包
│   ├── test-utils/     # 测试工具
│   ├── lytjs/          # 主入口包
│   └── vdom/           # 虚拟 DOM
├── tests/              # 集成测试
├── benchmarks/         # 性能基准测试
├── examples/           # 示例项目
├── playground/         # 开发调试环境
├── docs/               # 文档站点
├── scripts/            # 构建、发布、版本管理等脚本
├── eslint.config.js    # ESLint 配置
├── tsconfig.json       # TypeScript 根配置
├── llms.txt            # AI 文档同步（供 LLM 使用）
└── CHANGELOG.md        # 变更日志
```

## 开发流程

### 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 主分支，保持稳定可发布状态 |
| `develop` | 主开发分支，集成最新开发中的功能 |
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

### 分支命名规范

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/core-error-boundary` |
| `fix/` | Bug 修复 | `fix/reactivity-nested-computed` |
| `docs/` | 文档更新 | `docs/component-api` |
| `refactor/` | 代码重构 | `refactor/renderer-patch` |
| `perf/` | 性能优化 | `perf/vdom-diff` |
| `test/` | 测试相关 | `test/compiler-edge-cases` |
| `ci/` | CI/CD 相关 | `ci/add-coverage` |
| `chore/` | 构建/工具变更 | `chore/update-deps` |

### 提交信息规范

项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### type 类型

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

#### scope 范围

| Scope | 对应包 |
|-------|--------|
| `core` | @lytjs/core |
| `reactivity` | @lytjs/reactivity |
| `compiler` | @lytjs/compiler |
| `renderer` | @lytjs/renderer |
| `component` | @lytjs/component |
| `components` | @lytjs/components |
| `router` | @lytjs/router |
| `store` | @lytjs/store |
| `cli` | @lytjs/cli |
| `devtools` | @lytjs/devtools |
| `lytx` | @lytjs/lytx |
| `ai` | @lytjs/ai |
| `common` | @lytjs/common |

#### 示例

```
feat(core): 添加 createApp 错误边界支持
fix(reactivity): 修复嵌套 computed 循环依赖检测
docs(components): 更新 Button 组件 API 文档
perf(renderer): 优化 DOM diff 算法性能
```

### PR 提交流程

1. **创建 Issue**：先创建 Issue 讨论要解决的问题或要实现的功能
2. **获取反馈**：与维护者讨论方案，获得认可后再开始开发
3. **创建分支**：从 `develop` 创建功能分支
4. **开发与测试**：编写代码和对应的测试用例
5. **提交 PR**：向 `develop` 分支提交 Pull Request
6. **代码审查**：响应审查意见，修改代码
7. **合并**：审查通过后由维护者合并

## 代码规范

### TypeScript 规范

- 项目使用 TypeScript 进行开发，启用严格模式（`strict: true`）
- 所有公共 API 必须包含完整的类型定义和 JSDoc 注释
- 避免使用 `any`，优先使用具体类型或泛型
- 使用 `interface` 定义对象形状，使用 `type` 定义联合类型和工具类型

### ESLint 配置

项目根目录提供 `eslint.config.js` 配置文件，基于 `typescript-eslint`：

```bash
# 运行 lint 检查
pnpm lint

# 自动修复可修复的问题
pnpm lint:fix
```

CI 流水线会自动运行 lint 检查，不通过的 PR 将无法合并。

### 代码风格

以下规则由 ESLint 强制执行：

| 规则 | 配置 |
|------|------|
| 引号 | 单引号（`'`），避免转义时允许双引号 |
| 缩进 | 2 空格 |
| 分号 | 必须使用分号 |
| 逗号 | 多行时尾逗号（arrays、objects、imports、exports） |
| 函数逗号 | 不使用尾逗号 |
| `prefer-const` | 推荐使用 `const` |
| 未使用变量 | 下划线 `_` 开头的变量名允许未使用 |

### 编码规范

- **文件编码**：UTF-8，无 BOM
- **换行符**：LF（Unix 风格）
- **中文标点**：文档和注释中的中文内容使用中文全角标点符号
- **行尾**：文件末尾保留一个空行
- **行宽**：建议不超过 120 字符（非强制）

## 测试规范

### 测试框架

- 测试运行器：项目自定义测试运行器（`tests/test-runner.ts`）
- 测试工具：`@lytjs/test-utils`
- 覆盖率工具：`c8`
- DOM 模拟：`jsdom`

### 测试文件位置

- 单元测试：各包的 `__tests__/` 目录下
  - 命名格式：`<package-name>.test.ts`、`<package-name>-edge-cases.test.ts`
- 集成测试：根目录 `tests/` 下

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

### 测试编写要求

- 为新功能编写对应的测试用例
- 为 Bug 修复编写回归测试
- 测试文件应覆盖正常路径、边界情况和错误情况
- 测试描述使用清晰、具体的中文描述
- Mock 外部依赖，保持测试的独立性和可重复性

### 测试覆盖率

- 核心包（core、reactivity、renderer、compiler）应保持较高的测试覆盖率
- 新增代码应附带对应的测试用例
- CI 流水线会运行测试，不通过的 PR 将无法合并

## 文档规范

### 文档类型和位置

| 文档类型 | 位置 | 说明 |
|----------|------|------|
| 包 README | `packages/<name>/README.md` | 各包的独立说明文档 |
| API 文档 | 包 README 或独立文档 | 公共 API 的详细说明 |
| 变更日志 | `CHANGELOG.md` | 项目级变更日志 |
| AI 文档同步 | `llms.txt` / `llms-full.txt` | 供 LLM 使用的项目文档 |
| 开发者指南 | `CONTRIBUTING.md` | 本文件 |
| 安全策略 | `SECURITY.md` | 安全漏洞报告流程 |
| 行为准则 | `CODE_OF_CONDUCT.md` | 社区行为准则 |

### CHANGELOG 管理

项目使用自定义的 changelog 管理工具：

```bash
# 添加变更记录
pnpm changelog:add

# 预览变更日志
pnpm changelog:preview

# 发布版本时生成变更日志
pnpm changelog:release
```

### AI 文档同步

项目维护 `llms.txt` 和 `llms-full.txt` 文件，供 AI 工具（如 Cursor、Trae）使用。当公共 API 发生变更时，需要同步更新这些文件。

## PR 检查清单

提交 PR 前，请确认以下事项：

- [ ] **构建通过**：`pnpm build` 成功
- [ ] **测试通过**：`pnpm test` 全部通过
- [ ] **Lint 通过**：`pnpm lint` 无错误
- [ ] **文档已更新**：公共 API 变更已更新对应文档
- [ ] **CHANGELOG 已添加**：使用 `pnpm changelog:add` 添加变更记录
- [ ] **编码检查通过**：文件编码为 UTF-8 无 BOM（可运行 `pnpm docs:check-encoding` 检查）
- [ ] **提交信息规范**：遵循 Conventional Commits 规范
- [ ] **PR 标题清晰**：使用 Conventional Commits 格式作为 PR 标题
- [ ] **关联 Issue**：在 PR 描述中使用 `Fixes #xxx` 或 `Closes #xxx` 关联相关 Issue
- [ ] **破坏性变更已标注**：如有破坏性变更，在 PR 描述中明确标注

---

再次感谢你的贡献！如有任何问题，欢迎通过 Issue 与我们讨论。
