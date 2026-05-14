# LytJS 项目规则 - 通义灵码适配版

## 项目基础信息

- **项目名称**: Lyt.js - 下一代轻量级前端框架
- **当前版本**: v6.0.0
- **包管理器**: pnpm (>= 9.0.0)
- **Node.js 版本**: >= 18.0.0
- **主要语言**: TypeScript（严格模式）
- **测试框架**: Vitest（根目录配置 + 包级配置）
- **默认分支**: develop
- **项目结构**: Monorepo（pnpm workspaces）

---

## 核心交互规则

### 语言规范

- **所有回答都使用中文表述**
- 技术术语可保留英文（如 API、SDK、TypeScript、React 等）
- 代码中的变量名、函数名使用英文（遵循 camelCase/PascalCase 规范）

### 代码生成原则

1. **注释要求**
   - 所有公共 API 必须添加 JSDoc 注释（中文）
   - 关键逻辑和复杂算法必须添加中文注释
   - 单行注释使用 `//`，多行注释使用 `/** */`

2. **代码长度控制**
   - 当生成的代码超过 20 行时，优先考虑是否可以进行适当的抽象或聚合
   - 单个函数不超过 50 行（单一职责原则）

3. **类型安全**
   - 禁止使用 `any` 类型（测试文件除外）
   - 优先使用明确的类型定义和类型守卫
   - 优先使用 `import type` 导入类型

4. **避免过度设计**
   - 只实现用户明确要求的功能
   - 不添加额外的抽象层
   - 不进行不必要的重构

---

## 开发流程规范

### Git 工作流

```bash
# 1. 创建功能分支
git checkout -b feature/xxx-功能描述

# 2. 开发完成后检查
pnpm lint:check && pnpm type-check

# 3. 提交代码（如遇内存问题跳过 husky）
git add .
git commit --no-verify -m "feat(scope): 功能描述"
git push origin feature/xxx-功能描述
```

**分支命名规范**：
- `feature/xxx` - 新功能开发
- `fix/xxx` - Bug 修复
- `refactor/xxx` - 代码重构
- `docs/xxx` - 文档更新

**Commit 规范**（Conventional Commits）：
```
<type>(<scope>): <中文描述>

type 可选值：feat, fix, docs, style, refactor, perf, test, chore
scope 可选值：reactivity, vdom, compiler, core, renderer, common-*, web, tools, plugins
```

### 常用命令

```bash
# 依赖管理
pnpm install              # 安装依赖
pnpm add @lytjs/xxx       # 添加依赖

# 开发
pnpm dev                  # 启动开发模式
pnpm build                # 构建所有包
pnpm test                 # 运行所有测试

# 代码质量
pnpm lint                 # 自动修复 lint 问题
pnpm lint:check           # 检查 lint 问题
pnpm type-check           # 类型检查
pnpm format               # 格式化代码

# 高级检查
pnpm run check-deps       # 检查依赖版本
pnpm run check-zero-deps  # 检查零依赖规范
pnpm run check-circular   # 检查循环依赖
pnpm run size-check       # 包体积检查
```

---

## 代码规范

### 编码风格

- **缩进**: 2 空格
- **引号**: 单引号
- **分号**: 必须
- **换行符**: LF（Linux/macOS）或 CRLF（Windows，Git 自动处理）
- **文件编码**: UTF-8 无 BOM

### 命名约定

```typescript
// PascalCase: 类型、类、组件、接口
interface UserProfile { }
class Component { }
const MyComponent = defineComponent({ });

// camelCase: 变量、函数、属性
const userName = ref('');
function getUserInfo() { }

// UPPER_CASE: 常量
const MAX_COUNT = 100;
const API_BASE_URL = 'https://api.lytjs.dev';

// _prefix: 私有成员
class Service {
  private _cache = new Map();
}
```

### 导入顺序

```typescript
// 1. 外部依赖
import { ref, computed } from '@lytjs/reactivity';
import { h } from '@lytjs/vdom';

// 2. 内部模块（按字母顺序）
import { isArray } from '@lytjs/common-is';
import { EMPTY_OBJ } from '@lytjs/common-constants';

// 3. 相对路径导入
import { helper } from './helper';
import type { Config } from './types';
```

---

## 核心工具包使用

**原则：优先使用 `@lytjs/common-*` 系列工具包，不要重复造轮子**

### 常用工具包

```typescript
// 类型检查
import { isArray, isString, isObject, isFunction, hasChanged } from '@lytjs/common-is';

// 常量定义
import { EMPTY_OBJ, EMPTY_ARR, NOOP } from '@lytjs/common-constants';

// VNode 工具
import { isSameVNodeType } from '@lytjs/common-vnode';

// 字符串处理
import { camelize, toPascalCase } from '@lytjs/common-string';

// DOM 操作
import { querySelector, addEventListener } from '@lytjs/common-dom-helpers';

// 警告和错误
import { warn, error } from '@lytjs/common-warn';
```

---

## 项目结构

```
packages/
├── reactivity/          # 响应式系统（signal, ref, computed, effect）
├── vdom/                # 虚拟 DOM（h, patch, diff）
├── core/                # 核心包（defineComponent, lifecycle）
├── renderer/            # 渲染器
├── compiler/            # 编译器
├── adapter-web/         # Web 适配器
├── common/              # 通用工具包
│   ├── common-is/       # 类型检查
│   ├── common-constants/# 常量定义
│   ├── common-vnode/    # VNode 工具
│   ├── common-string/   # 字符串处理
│   ├── common-algorithm/# 算法（LIS 等）
│   └── ...
├── plugins/             # 官方插件
│   ├── plugin-theme/    # 主题插件
│   ├── plugin-logger/   # 日志插件
│   ├── plugin-auth/     # 权限插件
│   ├── plugin-storage/  # 存储插件
│   ├── plugin-i18n/     # 国际化插件
│   └── plugin-vite/     # Vite 集成插件
├── ecosystem/           # 生态系统包
│   ├── router/          # 路由
│   ├── store/           # 状态管理
│   ├── ui/              # UI 组件库
│   └── ...
└── _templates/          # 新包模板
```

---

## 性能要求

### 测试覆盖率

| 模块 | 最低覆盖率 |
|------|-----------|
| reactivity | ≥ 90% |
| vdom | ≥ 85% |
| compiler | ≥ 80% |
| core | ≥ 80% |

### 包体积限制

- 每个核心包 < 10KB (gzip)
- 使用 tsup 构建并生成类型声明（`dts: true`）
- 合理使用 Tree Shaking

---

## AI 辅助编码最佳实践

### 代码生成原则

1. **保持简单直接**：避免过度设计和抽象
2. **遵循现有模式**：生成前先阅读和理解现有代码
3. **增量改进**：优先修改而非重写
4. **可维护性优先**：代码应易于理解和维护

### 代码审查要点

生成代码后，人工应关注：
- ✅ 正确性：逻辑是否正确，边界情况是否处理
- ✅ 类型安全：是否正确使用 TypeScript 类型
- ✅ 性能影响：是否存在性能问题
- ✅ 安全性：是否有潜在的安全漏洞
- ✅ 一致性：是否符合项目代码规范

### 重构建议

- 识别重复代码时，主动提出抽象建议
- 发现性能瓶颈时，提供优化方案
- 检测到潜在 bug 时，给出修复建议
- **但只在用户明确要求时才进行重构**

---

## 文档和注释规范

### JSDoc 注释模板

```typescript
/**
 * 函数功能描述（中文）
 *
 * @description
 * 详细描述函数的作用和实现思路
 *
 * @param paramName - 参数描述（中文）
 * @returns 返回值描述（中文）
 *
 * @example
 * ```typescript
 * const result = functionName(参数);
 * ```
 *
 * @template T - 泛型说明
 * @see relatedFunction - 相关函数
 */
export function functionName<T>(paramName: T): ReturnType {
  // 实现
}
```

### 代码注释示例

```typescript
// ✅ 推荐：中文注释
// 检查是否为空值
const isEmpty = value == null;

// 复杂逻辑分段注释
function process(data: Data): Result {
  // 步骤 1: 数据验证
  if (!isValid(data)) {
    throw new Error('数据无效');
  }

  // 步骤 2: 数据处理
  const processed = transform(data);

  // 步骤 3: 返回结果
  return formatResult(processed);
}
```

### TODO 和 FIXME

```typescript
// TODO: 待实现功能 - 2026-05-12
// 说明待实现的具体内容

// FIXME: 临时解决方案 - 2026-05-12
// 说明问题和更好的解决方案
```

---

## 常见问题排查

### Husky 钩子导致内存不足

```bash
# 跳过 husky 钩子提交
git commit --no-verify -m "fix: 修复 xxx 问题"
```

### 类型检查失败

```bash
# 1. 确保已安装依赖
pnpm install

# 2. 检查具体错误
pnpm type-check

# 3. 查看 tsconfig.json 配置
```

### 构建失败

常见原因：
- 缺少依赖：重新运行 `pnpm install`
- 类型错误：运行 `pnpm type-check`
- tsup 配置：检查 `tsup.config.ts`（必须启用 `dts: true`）
- 包未迁移：检查 pnpm-workspace.yaml 是否包含新包

### 文件编码问题

```bash
# 检查文件编码
file -i filename.ts

# 转换为 UTF-8
iconv -f GBK -t UTF-8 input.ts > output.ts
```

### 插件测试配置问题

**问题**：测试无法解析 `@lytjs/reactivity/scope` 等子路径导出

**原因**：vitest 路径别名不支持通配符子路径匹配

**解决方案**：
```typescript
// 直接导入构建后的文件而非源码
const pluginModule = require('../dist/index.cjs');
```

**步骤**：
1. 先运行 `pnpm build` 构建依赖包
2. 在测试中使用 require() 导入构建后的文件
3. 这样可以避免路径别名配置问题

### 内存不足问题

**问题**：vitest 运行大量测试时内存溢出

**解决方案**：
- 减少并发测试数量
- 分批运行测试
- 单个包目录下运行 `pnpm test` 而非全局运行
- 考虑使用 `--maxWorkers` 参数限制工作进程数

### 类型检查常见问题

**问题 1**：`Cannot find name '__DEV__'`

**解决方案**：
在包的 src 目录下创建 `env.d.ts` 文件，内容如下：
```typescript
// 全局 __DEV__ 声明
// 规范版本位于 @lytjs/shared-types/src/global.d.ts
// 此处保留直接声明以确保 tsup DTS 构建时类型可用
declare const __DEV__: boolean;
```

**问题 2**：`'xxx' is declared but its value is never read`

**解决方案**：
- 在变量名前添加下划线前缀：`const _unusedVar = ...`
- 或者删除未使用的变量

**问题 3**：找不到某个包的类型声明文件

**解决方案**：
- 先单独构建该包：`cd packages/xxx && pnpm build`
- 确保 tsup.config.ts 中启用了 `dts: true`
- 再次运行类型检查

### 大型项目 lint 检查内存问题

**问题**：`pnpm lint:check` 出现内存溢出

**解决方案**：
- 可以在单个包目录下运行 lint 检查
- 优先使用类型检查来发现代码问题
- 内存限制较大时，可以跳过全局 lint 检查，专注于单个包

---

## 快速参考

### 5 分钟开始工作

```bash
# 1. 检查环境
node -v   # >= 18
pnpm -v   # >= 9

# 2. 安装依赖
pnpm install

# 3. 检查代码质量
pnpm lint:check && pnpm type-check

# 4. 构建验证
pnpm build

# 5. 开始开发
git checkout -b feature/你的功能
```

### 核心包速查

| 功能 | 包名 |
|------|------|
| 类型检查 | `@lytjs/common-is` |
| 常量定义 | `@lytjs/common-constants` |
| VNode 工具 | `@lytjs/common-vnode` |
| 过渡动画 | `@lytjs/common-transition-engine` |
| DOM 操作 | `@lytjs/common-dom-helpers` |
| 响应式系统 | `@lytjs/reactivity` |
| 虚拟 DOM | `@lytjs/vdom` |
| 核心框架 | `@lytjs/core` |

### 官方插件包速查

| 功能 | 包名 |
|------|------|
| 主题管理 | `@lytjs/plugin-theme` |
| 日志记录 | `@lytjs/plugin-logger` |
| 权限控制 | `@lytjs/plugin-auth` |
| 本地存储 | `@lytjs/plugin-storage` |
| 国际化 | `@lytjs/plugin-i18n` |
| 图表渲染 | `@lytjs/plugin-chart` |
| Vite 集成 | `@lytjs/plugin-vite` |

### 生态系统包速查

| 功能 | 包名 |
|------|------|
| 路由 | `@lytjs/router` |
| 状态管理 | `@lytjs/store` |
| UI 组件库 | `@lytjs/ui` |
| 开发者工具 | `@lytjs/devtools` |
| SSR | `@lytjs/ssr` |
| 平台适配器 | `@lytjs/platform-adapter` |

---

## 开发 Skill（AI 辅助开发模板）

### Skill 1: 添加新测试用例

**适用场景**: 为已有模块补充测试覆盖

**模板**:
```typescript
// packages/{module}/tests/{feature}.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionName } from '../src/{source-file}';

describe('{feature}', () => {
  beforeEach(() => {
    // 初始化
  });

  it('应正确处理基本场景', () => {
    // Arrange
    const input = ...;
    // Act
    const result = functionName(input);
    // Assert
    expect(result).toBe(expected);
  });

  it('应处理边界情况', () => {
    // 边界条件测试
  });

  it('应正确处理错误输入', () => {
    // 错误处理测试
  });
});
```

**注意事项**:
- vdom 包测试需要使用 `--config packages/vdom/vitest.config.ts` 指定 jsdom 环境
- mock 外部依赖时使用 `vi.mock()`
- 使用 `vi.fn()` 创建 spy
- 如遇路径别名问题，可直接导入构建后的 CJS 文件
- **UI 组件测试注意事项**：
  - 先查看组件实际实现，确认 props 名称和默认值，避免假设
  - 对于函数返回的默认值（如 Array、Object），只需验证函数存在，不要比较返回值
  - 对于可能为 undefined 的默认值，使用 `toBeUndefined()` 而非 `toBe('')` 或 `toBe(0)`
  - 组件测试应覆盖：基本渲染、props 定义、默认值、导出正确性等基本检查

### Skill 2: 创建新生态系统包

**适用场景**: 在 packages/ecosystem/packages/ 下创建新包

**步骤**:
1. 创建目录结构：`src/`, `tests/`, `package.json`, `tsconfig.json`, `tsup.config.ts`
2. package.json 中声明 workspace 依赖
3. tsup.config.ts 启用 `dts: true`
4. 在 src/index.ts 中统一导出
5. 编写测试文件
6. 在根 vitest.config.ts 中添加别名（如需）
7. 在根 package.json 中添加构建脚本
8. 更新 pnpm-workspace.yaml

**包模板**:
```json
{
  "name": "@lytjs/{package-name}",
  "version": "6.0.0",
  "type": "module",
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.mjs", "types": "./dist/index.d.ts" }
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "dev": "tsup --watch"
  }
}
```

### Skill 3: 修复测试失败

**适用场景**: 测试运行失败时的排查流程

**排查步骤**:
1. 确认测试环境（node vs jsdom）
2. 检查 vitest 配置（根目录 vs 包目录）
3. 确认依赖包已构建（`pnpm build`）
4. 检查 mock 是否正确
5. 检查 API 签名是否与源码一致
6. 如遇路径别名问题，尝试直接导入构建后文件

**常见问题**:
- `document is not defined` → 需要使用 jsdom 环境
- `Cannot find module` → 需要先构建依赖包
- `process is not defined` → vitest 与 Node.js 版本兼容性问题
- 子路径导出无法解析 → 使用 require() 导入构建后文件

### Skill 4: DevTools 功能开发

**适用场景**: 扩展 DevTools 功能

**架构说明**:
- `ecosystem/devtools`: 轻量级内嵌面板，面向开发者快速调试
- `tools/devtools`: 浏览器扩展后端，提供高级调试能力

**开发指南**:
- ecosystem 版本：直接修改 `src/devtools.ts` 中的面板渲染逻辑
- tools 版本：在对应子模块（signals/events/snapshots/panel/*）中添加功能
- 新增功能需同步更新 `src/index.ts` 导出和测试文件

### Skill 5: 创建官方插件

**适用场景**: 在 packages/plugins/packages/ 下创建新官方插件

**步骤**:
1. 使用 PLUGIN_DEVELOPMENT.md 中提供的模板创建插件
2. 确保包名格式为 `@lytjs/plugin-{name}`
3. 使用 definePlugin() API 实现插件功能
4. 添加配置验证 schema
5. 基于 common-is、common-constants 等工具实现，零第三方依赖
6. 编写完整测试（使用 require() 导入构建后文件）
7. 在 packages/plugins/packages/index.ts 中统一导出
8. 更新根 package.json 的 build:plugins 脚本
9. 更新插件文档 README.md

**测试技巧**:
```typescript
const pluginModule = require('../dist/index.cjs');

describe('@lytjs/plugin-{name}', () => {
  it('应导出默认插件', () => {
    expect(pluginModule.default).toBeDefined();
  });
  
  it('应导出主要工具函数', () => {
    expect(pluginModule.someFunction).toBeDefined();
  });
});
```

### Skill 6: 包迁移与重构

**适用场景**: 将包从一个目录移动到另一个目录（如从 ecosystem 迁移到 plugins）

**步骤**:
1. 复制目标包的完整目录结构
2. 重命名包名（如从 `@lytjs/i18n` 到 `@lytjs/plugin-i18n`）
3. 更新 package.json 中的 name、repository、keywords 等字段
4. 统一构建脚本和测试脚本风格
5. 更新所有引用该包的地方（导入语句、文档等）
6. 在根 package.json 中更新构建脚本
7. 删除旧的包目录
8. 运行构建和测试验证
9. 更新 pnpm-workspace.yaml

**验证检查**:
- [ ] 构建成功，无类型错误
- [ ] 所有测试通过
- [ ] 零依赖规范检查通过
- [ ] 文档已更新
- [ ] 无残留的旧包引用

### Skill 7: 创建工程化工具脚本

**适用场景**: 开发项目级别的脚本工具（如零依赖检查、版本同步等）

**步骤**:
1. 在 `scripts/` 目录下创建新脚本
2. 使用 Node.js 原生 API，零第三方依赖
3. 在 package.json 中添加对应脚本命令
4. 编写脚本的测试用例（可选）
5. 更新 AGENTS.md 文档加入新命令

**零依赖检查脚本示例**:
```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// 扫描指定目录下的所有 package.json
// 检查 dependencies 是否只包含 @lytjs/* 包
// 发现违规时提供清晰报告并退出
```

---

## 8 层架构开发规范

### 架构概述

LytJS 采用 8 层架构设计，从底层到上层分别为：

| 层级 | 层名 | 核心能力 |
| --- | --- | --- |
| L0 | 基础工具层 | 原生 JS 工具封装、常量定义 |
| L1 | 核心原语层 | 响应式系统、虚拟 DOM、编译器 |
| L2 | 渲染引擎层 | Vapor 渲染器、VDOM 渲染器、组件系统 |
| L3 | 核心运行时层 | 应用实例、生命周期、插件机制 |
| L4 | 插件与适配层 | 官方插件、跨平台适配器、Web 适配 |
| L5 | 组件基础层 | 组件通用逻辑、通信机制 |
| L6 | 生态系统层 | UI 组件库、路由、状态管理、SSR |
| L7 | 工程化工具层 | 构建工具、CLI、DevTools、测试工具 |

> **详细文档**：请参考 [ARCHITECTURE.md](./ARCHITECTURE.md) 获取完整的架构说明

### 分层依赖规则

- **基础工具层开放**：L0 基础工具层（common-*）可被所有上层直接依赖
- **分层合理依赖**：核心层（L1-L4）遵循分层原则，尽量减少跨层依赖，但允许必要的跨层访问
- **单向依赖**：只能从上层依赖下层，禁止反向依赖
- **循环依赖检查**：使用 `pnpm run check-circular` 定期检查

```typescript
// ✅ 正确：任意层都可以直接依赖 L0 基础工具层
import { isArray } from '@lytjs/common-is';
import { EMPTY_OBJ } from '@lytjs/common-constants';

// ✅ 正确：上层依赖紧邻的下层
import { render } from '@lytjs/renderer';

// ✅ 允许：必要时可跨层依赖核心层
import { ref, computed } from '@lytjs/reactivity';
```

### 各层开发规范

#### L0 基础工具层
- 只提供纯函数，无副作用
- 禁止依赖任何其他层
- 必须有完整的单元测试覆盖
- 文档必须详细说明每个函数的用途、参数和返回值

#### L1 核心原语层
- 响应式系统（signal/ref/computed）
- 虚拟 DOM（VNode）
- 模板编译器
- 零第三方依赖，性能优先

#### L2 渲染引擎层
- 基于 Host Contract 接口开发
- 支持 Vapor 和 VDOM 双模式
- 提供可插拔的渲染器实现
- 组件系统核心逻辑

#### L3 核心运行时层
- 提供最小化的 API
- 插件注册与卸载机制
- 应用实例生命周期管理
- 依赖注入容器实现

#### L4 插件与适配层
- 统一插件接口定义（基于 definePlugin API）
- 插件依赖解析与生命周期管理
- 跨平台适配器实现（Web、未来可扩展）
- 官方插件实现（主题、日志、认证等）

#### L5 组件基础层
- 统一组件 API
- 组件通信机制
- 样式规范定义
- 主题适配接口

#### L6 生态系统层
- 基于组件基础层开发
- 支持主题定制
- 可以引入第三方依赖
- 提供完整的测试用例和文档

#### L7 工程化工具层
- 只在开发/构建时使用
- 不影响运行时
- 可以引入第三方依赖
- 提供零依赖规范校验、构建优化等工具

---

## 零第三方依赖开发规范

### 零依赖原则

- **运行时零依赖**：所有 L0-L6 层的运行时代码不引入任何第三方库
- **开发时例外**：构建工具、测试工具等仅在开发时使用的依赖可以接受
- **优先自研**：需要的功能优先考虑自研实现，而非引入第三方库

### 零依赖开发检查清单

开发新功能前必须检查：

```
✅ 是否引入了不必要的第三方依赖？
✅ 现有 @lytjs/common-* 工具包是否已有相关功能？
✅ 是否可以用原生 API 实现？
✅ 运行时（非 devDependencies）是否会引入第三方依赖？
✅ 已运行 pnpm run check-zero-deps 验证通过？
```

### 原生 API 使用指南

#### 常用原生 API 替代方案

| 功能需求 | 原生 API 方案                      |
| -------- | ---------------------------------- |
| 日期处理 | `Date` 对象、`Intl.DateTimeFormat` |
| 深拷贝   | `structuredClone()`                |
| 数组操作 | 原生 `Array` 方法                  |
| 对象操作 | `Object.assign()`、展开运算符      |
| URL 处理 | `URL`、`URLSearchParams`           |
| DOM 操作 | 原生 DOM API                       |

```typescript
// ✅ 推荐：使用原生日期处理
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

// ❌ 避免：引入第三方日期库
// import dayjs from 'dayjs';
```

### 依赖检查流程

1. **添加新依赖前**：先检查是否真的需要
2. **区分依赖类型**：
   - `devDependencies`：构建、测试工具 ✅ 允许
   - `dependencies`：运行时依赖 ⚠️ 严格禁止
3. **定期审查**：使用 `pnpm run check-deps` 检查依赖使用情况
4. **零依赖验证**：使用 `pnpm run check-zero-deps` 验证所有包是否遵守零依赖规范

### 自研工具优先

优先使用项目已有的 common 工具包：

```typescript
// ✅ 推荐：使用 common-is
import { isArray, isString } from '@lytjs/common-is';

// ✅ 推荐：使用 common-constants
import { EMPTY_OBJ, NOOP } from '@lytjs/common-constants';

// ✅ 推荐：使用 common-string
import { camelize, toPascalCase } from '@lytjs/common-string';

// ❌ 避免：重复造轮子
// const isArray = Array.isArray;
// const isString = (val) => typeof val === 'string';
```

### 零依赖组件开发标准流程

```
1. 基于组件基础层开发
2. 适配主题插件
3. 支持 Vapor 渲染模式
4. 编写单元测试（覆盖率 > 80%）
5. 验证无第三方运行时依赖
6. 编写文档与示例
7. 提交 PR 审查
```

---

## 详细文档

- **AI IDE 开发规则**: `docs/development/AI_IDE_RULES.md`
- **中文文档指南**: `docs/development/CHINESE_DOCS_GUIDE.md`
- **开发路线图**: `docs/development/ROADMAP_NEXT_STEPS.md`
- **项目结构说明**: `docs/development/PROJECT_STRUCTURE.md`
- **插件开发指南**: `docs/development/PLUGIN_DEVELOPMENT.md`
- **架构设计文档**: `docs/development/ARCHITECTURE.md`

---

## 开发经验总结 (v7.0 新增)

### ROADMAP 维护最佳实践

1. **定期拆分已完成任务**
   - 将已完成的历史记录移到 CHANGELOG.md
   - 保持 ROADMAP_NEXT_STEPS.md 简洁，聚焦未完成任务
   - 便于快速了解项目当前状态和下一步行动项

2. **清晰的任务状态标记**
   - ✅ 已完成：全部完成的任务
   - 🔄 进行中：正在处理的任务
   - 🔴 高优先级：影响生产稳定性的任务
   - 🟡 中优先级：提升用户体验的任务
   - 🟢 低优先级：生态建设等任务
   - ⏸️ 暂缓：当前不需要投入资源的任务

3. **下一步行动项结构**
   - 问题分析：识别问题根因
   - 修复策略：明确的修复步骤
   - 验证方法：如何确认修复成功

### 项目状态检查最佳实践

在开始新的开发任务前，建议按以下顺序检查项目状态：

1. **Git 状态检查**
   ```bash
   git status
   git branch
   ```
   - 确保工作区干净
   - 确认当前分支正确

2. **类型检查**
   ```bash
   pnpm type-check
   ```
   - 这是最快速验证代码健康状态的方式
   - 优先于完整的构建和测试

3. **关键包测试验证**
   - 对于核心包（reactivity、vdom、core），优先运行其单独测试
   - 不必每次都运行所有测试，节省时间

4. **构建验证（可选）**
   - 只有在修改了构建相关配置或新增包时才需要完整构建

### 处理大型测试套件的技巧

1. **并行测试注意事项**
   - 当测试数量很大时，Vitest 可能出现内存警告
   - 这通常是环境问题，不影响实际功能
   - 可以通过单个包目录运行测试来避免

2. **测试警告分类**
   - **source map 警告**：通常是 Vite 配置问题，不影响功能
   - **预期警告**：很多测试特意验证错误处理场景，这些警告是预期的
   - 学会区分真正的错误和预期的警告输出

3. **测试覆盖率提升策略**
   - 优先保证核心模块的高覆盖率（reactivity、vdom、core）
   - UI 组件优先保证交互和 props 测试
   - 插件测试优先保证 API 稳定性和主要功能

### 高效开发工作流

1. **增量改进而非重写**
   - 项目已经非常成熟，优先修改而非重写
   - 利用已有的架构和工具

2. **文档同步更新**
   - 每次完成任务后，及时更新 ROADMAP_NEXT_STEPS.md
   - 重要的经验和教训同步到 AGENTS.md

3. **及时提交**
   - 完成小任务后立即提交，保持 git 历史清晰
   - 遵循 Conventional Commits 规范

4. **优先级管理**
   - 明确标记「暂缓」的任务，避免在低优先级任务上浪费时间
   - 优先处理里程碑任务，然后是工程化改进

---

**文档版本**: v4.5  
**最后更新**: 2026-05-14  
**维护者**: LytJS Team
