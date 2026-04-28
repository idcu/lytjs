# 贡献指南

感谢你对 Lyt.js 的关注！我们欢迎任何形式的贡献。

## 欢迎贡献

无论是提交 Bug 报告、功能建议、文档改进，还是直接提交代码，我们都非常欢迎。在贡献之前，请阅读本指南了解开发流程和规范。

## 开发环境搭建

### Fork 并 Clone 仓库

```bash
# 1. Fork 本仓库到你的 GitHub/Gitee 账号

# 2. 克隆你 Fork 的仓库
git clone https://gitee.com/<your-username>/lytjs.git
cd lytjs

# 3. 添加上游仓库（方便后续同步）
git remote add upstream https://gitee.com/lytjs/lytjs.git
```

### 安装 Node.js 18+

确保你的开发环境安装了 Node.js 18 或更高版本：

```bash
node -v  # 确认版本 >= 18.0.0
```

### 安装依赖

```bash
npm install
```

### 构建

```bash
npm run build
```

### 测试

```bash
npm run test
```

## 代码规范

### TypeScript Strict 模式

项目使用 TypeScript 进行开发，启用严格模式（`strict: true`）。所有公共 API 必须包含完整的类型定义和 JSDoc 注释。避免使用 `any`，优先使用具体类型或泛型。

### ESLint 检查

项目根目录提供 `eslint.config.js` 配置文件，提交代码前请确保通过 lint 检查：

```bash
npm run lint
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `MyComponent` |
| 工具函数 | camelCase | `formatDate` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |

### 文件组织

项目采用 Monorepo 架构，每个包在 `packages/` 下独立目录：

```
packages/
├── core/           # 核心包
├── reactivity/     # 响应式系统
├── renderer/       # 渲染器
├── compiler/       # 编译器
├── component/      # 组件系统
├── components/     # 组件库
├── common/         # 公共工具
├── router/         # 路由
├── store/          # 状态管理
└── ...
```

## 提交规范

项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>
```

### type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档 |
| `style` | 格式 |
| `refactor` | 重构 |
| `perf` | 性能 |
| `test` | 测试 |
| `chore` | 构建/工具 |

### 示例

```
feat(core): 添加 createApp 错误边界支持
fix(reactivity): 修复嵌套 computed 循环依赖检测
docs(components): 更新 Button 组件 API 文档
```

## PR 流程

### 1. 创建分支

从 `develop` 分支创建功能分支：

```bash
git checkout develop
git pull upstream develop
git checkout -b feat/your-feature
```

### 2. 开发并测试

编写代码和对应的测试用例，确保所有测试通过：

```bash
npm run build
npm run test
npm run lint
```

### 3. 提交 PR

向 `develop` 分支提交 Pull Request，PR 描述中请使用 `Fixes #xxx` 或 `Closes #xxx` 关联相关 Issue。

### 4. 等待审查

响应审查意见，修改代码，审查通过后由维护者合并。

## 测试要求

### 新功能必须包含测试

所有新功能和 Bug 修复都应附带对应的测试用例。

### 测试文件位置

测试文件放在各包的 `__tests__/` 目录下：

```
packages/<包名>/__tests__/<包名>.test.ts
```

### 测试 API

使用 `describe/it/expect` API 编写测试：

```typescript
import { describe, it, expect } from '@lytjs/test-utils';

describe('MyFeature', () => {
  it('should work correctly', () => {
    expect(result).toBe(expected);
  });
});
```

---

再次感谢你的贡献！如有任何问题，欢迎通过 Issue 与我们讨论。
