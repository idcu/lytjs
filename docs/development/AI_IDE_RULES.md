# AI IDE 开发规则 - LytJS 项目

> 基于 LytJS v6.0.0 项目特点制定的高效开发规范，适用于所有 AI 辅助编程工具

---

## 📋 目录

- [1. 项目开发规范](#1-项目开发规范)
- [2. 代码组织规范](#2-代码组织规范)
- [3. AI 辅助编码规则](#3-ai-辅助编码规则)
- [4. 工具命令规范](#4-工具命令规范)
- [5. 性能优化规范](#5-性能优化规范)
- [6. 协作开发规范](#6-协作开发规范)

---

## 1. 项目开发规范

### 1.1 工作流程规范

#### 🚀 日常开发流程

```
1. 从 develop 分支创建功能分支
   → git checkout -b feature/xxx-功能描述

2. 开发过程中
   → 小步提交，每个功能点一个 commit
   → 提交前运行：pnpm lint:check && pnpm type-check

3. 功能开发完成
   → 更新文档
   → 添加测试用例
   → 运行完整测试：pnpm test

4. 提交和推送
   → 禁用 husky 钩子直接提交（如遇内存问题）
   → 推送到远程，创建 PR
```

#### 📦 新包开发流程

```
1. 使用模板创建新包
   → 参考 packages/_templates/

2. 包结构必须包含
   → src/index.ts - 入口文件
   → tests/index.test.ts - 测试文件
   → package.json - 包配置
   → tsconfig.json - TypeScript 配置
   → tsup.config.ts - 构建配置
   → README.md - 文档（中文）

3. 立即更新
   → 根目录 tsconfig.eslint.json
   → eslint.config.js（添加项目引用）
   → size-limit 配置（如需要）
```

### 1.2 分支管理规范

| 分支名 | 用途 | 说明 |
| --- | --- | --- |
| `main` | 生产分支 | 只接受合并，不直接提交 |
| `develop` | 开发分支 | 日常开发基于此分支 |
| `feature/xxx` | 功能分支 | 新功能开发 |
| `fix/xxx` | 修复分支 | Bug 修复 |
| `refactor/xxx` | 重构分支 | 代码重构 |
| `docs/xxx` | 文档分支 | 文档更新 |

### 1.3 Commit 提交规范

使用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<type> 可选值：
  - feat:     新功能
  - fix:      Bug 修复
  - docs:     文档更新
  - style:    代码格式（不影响代码运行）
  - refactor: 重构
  - perf:     性能优化
  - test:     测试相关
  - chore:    构建/工具相关

<scope> 可选值：
  - reactivity, vdom, compiler, core, renderer
  - common-*, web, tools, docs
  - * (表示多个模块)

<subject> 要求：
  - 使用中文描述
  - 简洁明了，不超过 50 字符
  - 使用祈使句，如"修复"、"添加"、"优化"

示例：
  feat(reactivity): 添加批量更新 API
  fix(vdom): 修复过渡动画清理问题
  docs: 更新架构文档
```

---

## 2. 代码组织规范

### 2.1 注释规范

#### ✅ 必须包含中文注释

**原则：所有文档和注释都使用中文**

```typescript
/**
 * 函数功能描述（中文）
 *
 * @param paramName - 参数描述（中文）
 * @returns 返回值描述（中文）
 * @example
 * ```typescript
 * // 使用示例
 * const result = functionName(参数);
 * ```
 */
```

#### 代码注释要求

| 场景 | 注释要求 |
| --- | --- |
| 公共 API | 必须有 JSDoc 注释（中文） |
| 复杂算法 | 必须有算法说明和示例 |
| 关键业务逻辑 | 必须有逻辑说明 |
| 临时代码 | 必须标注 TODO 或 FIXME |
| 性能敏感代码 | 必须标注性能指标和优化说明 |

#### 示例

```typescript
/**
 * 创建响应式引用（Ref）
 *
 * @param value - 初始值
 * @returns 响应式引用对象，可通过 .value 访问和修改
 *
 * @example
 * ```typescript
 * const count = ref(0);
 * console.log(count.value); // 0
 * count.value++;
 * console.log(count.value); // 1
 * ```
 */
export function ref<T>(value: T): Ref<T> {
  // ... 实现
}
```

### 2.2 编码规范

#### 文件编码检查

**所有文件必须使用 UTF-8 编码，无 BOM**

检查命令：
```bash
# 检查文件编码
file -i **/*.ts **/*.md

# 转换为 UTF-8（如需要）
iconv -f GBK -t UTF-8 input.ts > output.ts
```

#### 换行符规范

- Windows: CRLF (Git 自动处理)
- Linux/macOS: LF

.gitattributes 已配置，无需手动处理。

### 2.3 包依赖规范

#### 依赖使用原则

1. **优先使用 @lytjs/common-* 工具包**
   ```typescript
   // ✅ 推荐
   import { isArray, isString, hasChanged } from '@lytjs/common-is';

   // ❌ 不推荐
   const isArray = Array.isArray;
   ```

2. **避免循环依赖**
   - 使用 `pnpm run check-circular` 检查
   - 通过 `@lytjs/shared-types` 共享类型
   - 接口与实现分离

3. **版本同步**
   - 所有包版本保持一致
   - 使用 `pnpm run sync-versions` 同步

---

## 3. AI 辅助编码规则

### 3.1 TypeScript 代码规范

#### 3.1.1 类型定义原则

```typescript
// ✅ 推荐：明确的类型定义
interface User {
  id: string;
  name: string;
  age: number;
}

// ✅ 推荐：使用类型别名增强可读性
type UserId = string;
type UserMap = Map<UserId, User>;

// ✅ 推荐：使用泛型约束
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}

// ❌ 避免：any 类型
// function process(data: any) { ... }

// ❌ 避免：过度使用 as unknown as
// const result = input as unknown as TargetType;
```

#### 3.1.2 类型安全实践

```typescript
// ✅ 推荐：使用类型守卫
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}

// ✅ 推荐：使用可空类型
function findUser(id: string): User | null {
  return users.get(id) ?? null;
}

// ✅ 推荐：使用类型断言函数
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new TypeError('不是有效的 User 类型');
  }
}
```

### 3.2 Reactivity 模块编码规则

#### 3.2.1 Ref 和 Signal 使用规范

```typescript
// ✅ 推荐：优先使用 signal 模式（新代码）
import { signal, computed } from '@lytjs/reactivity';

const count = signal(0);
const doubled = computed(() => count.value * 2);

// ✅ 推荐：ref 用于需要响应式的基础类型
const name = ref('LytJS');

// ✅ 推荐：reactive 用于对象响应式
const state = reactive({
  count: 0,
  name: 'LytJS'
});

// ❌ 避免：在 signal.set 的回调中做太多事情
// count.set(c => {
//   // 避免复杂逻辑
//   return c + 1;
// });
```

#### 3.2.2 批量更新最佳实践

```typescript
// ✅ 推荐：使用 batch 合并多次更新
import { batch } from '@lytjs/reactivity';

batch(() => {
  count.set(1);
  name.set('LytJS');
  age.set(25);
});

// ✅ 推荐：使用 batchScope 进行作用域管理
import { batchScope } from '@lytjs/reactivity';

batchScope(() => {
  // 多次更新会被合并
});
```

### 3.3 VDOM 模块编码规则

#### 3.3.1 VNode 创建规范

```typescript
// ✅ 推荐：使用 h 函数创建 VNode
import { h, Text, Comment, Fragment } from '@lytjs/vdom';

const vnode = h('div', { class: 'container' }, [
  h('h1', { key: 'title' }, 'Hello LytJS'),
  h(Text, 'World'),
  h(Comment, '这是注释')
]);

// ✅ 推荐：使用 PatchFlags 优化动态内容
import { PatchFlags } from '@lytjs/common-constants';

h('span', { 
  key: 'text', 
  [PatchFlags.TEXT]: true 
}, dynamicText);
```

#### 3.3.2 列表渲染规则

```typescript
// ✅ 推荐：始终使用唯一的 key
const list = items.map(item => 
  h('li', { key: item.id }, item.name)
);

// ✅ 推荐：使用 @lytjs/common-algorithm 中的 LIS
import { lis } from '@lytjs/common-algorithm';

// ❌ 避免：使用索引作为 key（当列表会变化时）
// items.map((item, index) => h('li', { key: index }, ...))
```

### 3.4 Core 模块编码规则

#### 3.4.1 组件定义规范

```typescript
// ✅ 推荐：使用 defineComponent
import { defineComponent, ref } from '@lytjs/core';

const Counter = defineComponent({
  name: 'Counter',

  setup() {
    const count = ref(0);
    
    function increment() {
      count.value++;
    }
    
    return { count, increment };
  },

  render(ctx) {
    return h('div', [
      h('span', `Count: ${ctx.count}`),
      h('button', { onClick: ctx.increment }, 'Increment')
    ]);
  }
});
```

#### 3.4.2 生命周期钩子使用

```typescript
// ✅ 推荐：明确的生命周期使用
import { 
  onMounted, 
  onUnmounted, 
  onUpdated,
  onActivated,
  onDeactivated
} from '@lytjs/core';

onMounted(() => {
  // 组件挂载后执行
  console.log('组件已挂载');
});

onUnmounted(() => {
  // 组件卸载前清理
  // 清理定时器、事件监听等
});
```

### 3.5 Common 工具包使用规则

#### 3.5.1 优先使用 @lytjs/common-*

```typescript
// ✅ 推荐：使用 common-is
import { 
  isArray, 
  isString, 
  isObject, 
  isFunction,
  isPromise,
  hasChanged
} from '@lytjs/common-is';

// ✅ 推荐：使用 common-constants
import { 
  EMPTY_OBJ, 
  EMPTY_ARR, 
  NOOP,
  REACTIVITY_MAX_TRIGGER_DEPTH
} from '@lytjs/common-constants';

// ✅ 推荐：使用 common-vnode
import { isSameVNodeType } from '@lytjs/common-vnode';

// ✅ 推荐：使用 common-transition-engine
import { TransitionEngine } from '@lytjs/common-transition-engine';
```

#### 3.5.2 避免重复造轮子

```typescript
// ✅ 推荐：复用已有的工具函数
import { toPascalCase, camelize } from '@lytjs/common-string';

// ✅ 推荐：使用 common-dom-helpers
import { 
  querySelector, 
  addEventListener, 
  removeEventListener 
} from '@lytjs/common-dom-helpers';
```

### 3.6 Renderer 模块编码规则

#### 3.6.1 渲染器实现规范

```typescript
// ✅ 推荐：遵循 Host Contract 接口
import { HostContract } from '@lytjs/host-contract';

const host: HostContract = {
  createElement: (tag) => document.createElement(tag),
  createText: (text) => document.createTextNode(text),
  // ... 其他方法
};
```

#### 3.6.2 DOM 操作规范

```typescript
// ✅ 推荐：使用 web adapter
import { webAdapter } from '@lytjs/adapter-web';

// ✅ 推荐：使用 @lytjs/web 工具
import { cssVars, resizeObserver } from '@lytjs/web';

// ✅ 推荐：使用事件正规化
import { normalizeEvent } from '@lytjs/common-event-normalizer';
```

### 3.7 代码风格规则

#### 3.7.1 命名约定

```typescript
// ✅ 推荐：PascalCase 用于类型、类、组件
interface UserProfile { ... }
class Component { ... }
const MyComponent = defineComponent({ ... });

// ✅ 推荐：camelCase 用于变量、函数、属性
const userName = ref('');
function getUserInfo() { ... }

// ✅ 推荐：UPPER_CASE 用于常量
const MAX_COUNT = 100;
const API_BASE_URL = 'https://api.lytjs.dev';

// ✅ 推荐：前缀下划线用于私有成员
class Service {
  private _cache = new Map();
}
```

#### 3.7.2 函数写法规范

```typescript
// ✅ 推荐：命名函数（方便调试和错误追踪）
export function processData(data: Data): Result {
  // 实现
}

// ✅ 推荐：箭头函数用于回调
data.map(item => transform(item));

// ✅ 推荐：明确的返回类型
function calculate(a: number, b: number): number {
  return a + b;
}

// ✅ 推荐：单一职责，函数不超过 50 行
function doOneThingWell() { ... }
```

### 3.8 错误处理规则

#### 3.8.1 错误处理最佳实践

```typescript
// ✅ 推荐：使用 try/catch 进行错误处理
async function fetchData() {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    logger.error('获取数据失败:', error);
    // 降级处理
    return fallbackData;
  }
}

// ✅ 推荐：使用自定义错误类型
class LytJSError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: unknown
  ) {
    super(message);
    this.name = 'LytJSError';
  }
}
```

#### 3.8.2 开发模式警告

```typescript
// ✅ 推荐：使用 @lytjs/common-warn
import { warn, error } from '@lytjs/common-warn';

if (__DEV__ && condition) {
  warn('这是一个警告信息');
}

if (criticalCondition) {
  error('这是一个严重错误');
}
```

### 3.9 性能关键代码规则

#### 3.9.1 避免常见的性能陷阱

```typescript
// ✅ 推荐：避免在渲染中创建新对象
// const App = defineComponent({
//   render() {
//     return h('div', { 
//       style: { color: 'red' } // 避免：每次渲染都创建新对象
//     });
//   }
// });

// ✅ 推荐：在 setup 中创建并复用
const style = { color: 'red' };
const App = defineComponent({
  render() {
    return h('div', { style });
  }
});
```

#### 3.9.2 懒加载和代码分割

```typescript
// ✅ 推荐：使用 defineAsyncComponent
import { defineAsyncComponent } from '@lytjs/core';

const HeavyComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue')
});
```

### 3.10 AI 辅助开发最佳实践

#### 3.10.1 代码生成原则

- **保持简单**：生成的代码应该尽可能简单直接，避免过度设计
- **遵循现有模式**：在生成新代码前，先阅读和理解现有代码的模式和风格
- **增量改进**：优先修改现有代码而非重写，除非有充分理由
- **可维护性优先**：生成的代码应该易于理解和维护

#### 3.10.2 代码审查要点

当 AI 生成代码后，人工审查应关注：

1. **正确性**：逻辑是否正确，边界情况是否处理
2. **类型安全**：是否正确使用 TypeScript 类型
3. **性能影响**：是否存在性能问题
4. **安全性**：是否有潜在的安全漏洞
5. **一致性**：是否符合项目代码规范

#### 3.10.3 重构建议

- 识别重复代码模式时，主动提出抽象建议
- 发现性能瓶颈时，提供优化方案
- 检测到潜在的 bug 时，给出修复建议
- 但只在用户明确要求时才进行重构

---

## 4. 工具命令规范

### 4.1 日常开发命令

| 命令 | 说明 | 使用场景 |
| --- | --- | --- |
| `pnpm install` | 安装依赖 | 首次克隆或更新依赖 |
| `pnpm dev` | 启动开发模式 | 开发时实时编译 |
| `pnpm build` | 构建所有包 | 发布前或验证修复 |
| `pnpm test` | 运行所有测试 | 提交代码前验证 |
| `pnpm lint` | 自动修复 lint 问题 | 代码整理 |
| `pnpm lint:check` | 检查 lint 问题 | 提交前验证 |
| `pnpm type-check` | 类型检查 | 确保类型安全 |
| `pnpm format` | 格式化代码 | 统一代码风格 |

### 4.2 高级检查命令

| 命令 | 说明 | 使用场景 |
| --- | --- | --- |
| `pnpm run check-deps` | 检查依赖版本 | 更新依赖前 |
| `pnpm run check-circular` | 检查循环依赖 | 重构前 |
| `pnpm run memlab` | 内存泄漏检查 | 性能问题排查 |
| `pnpm run size-check` | 包体积检查 | 优化包大小 |
| `pnpm run bench` | 性能基准测试 | 性能优化对比 |

### 4.3 Git 操作规范

#### 禁用 husky 钩子提交（如遇内存问题）

```bash
# 方案 1: 使用环境变量
$env:HUSKY=0; git commit -m "..."

# 方案 2: 使用 --no-verify
git commit --no-verify -m "..."
```

#### 快速提交并推送（本地环境已配置好）

```bash
# 查看变更
git status

# 添加所有变更
git add .

# 提交（跳过 husky）
git commit --no-verify -m "fix: 修复 xxx 问题"

# 推送到远程
git push origin <branch-name>
```

---

## 5. 性能优化规范

### 5.1 核心模块优化原则

#### Reactivity 模块

```typescript
// ✅ 推荐：使用批量更新
import { batch, signal } from '@lytjs/reactivity';

const count = signal(0);
const double = signal(0);

batch(() => {
  count.set(1);
  double.set(2);
});

// ❌ 避免：分散更新导致多次触发
count.set(1);
double.set(2);
```

#### VDOM 模块

```typescript
// ✅ 推荐：使用 PatchFlags 优化
import { h, PatchFlags } from '@lytjs/vdom';

h('div', { class: 'container' }, [
  h('span', { key: 'text', [PatchFlags.TEXT]: true }, 'Hello'),
]);

// ✅ 推荐：使用 Block Tree
import { block } from '@lytjs/vdom';
```

### 5.2 包体积优化规范

1. **每个包使用 tsup 配置并生成类型声明**
   ```typescript
   // tsup.config.ts
   export default defineConfig({
     dts: true,  // ✅ 必须启用
     splitting: true,
     clean: true,
     // ...
   });
   ```

2. **合理使用 Tree Shaking**
   - 导出为 ESM 格式
   - 避免副作用
   - 使用纯函数标注

3. **Size Limit 监控**
   - 每个核心包添加 .size-limit 配置
   - 保持单个包体积 < 10KB (gzip)

---

## 6. 协作开发规范

### 6.1 测试规范

#### 测试覆盖率要求

| 模块 | 覆盖率要求 |
| --- | --- |
| reactivity | ≥ 90% |
| vdom | ≥ 85% |
| compiler | ≥ 80% |
| core | ≥ 80% |

#### 测试文件组织

```
packages/
  my-package/
    src/
      index.ts
    tests/
      index.test.ts        # 主测试文件
      edge-cases.test.ts   # 边界情况
      performance.test.ts  # 性能测试（可选）
```

#### 测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { ref } from '../src';

describe('ref', () => {
  it('应该能创建响应式引用', () => {
    const r = ref(0);
    expect(r.value).toBe(0);
  });

  it('应该能更新值', () => {
    const r = ref(0);
    r.value++;
    expect(r.value).toBe(1);
  });
});
```

### 6.2 文档规范

#### 文档语言

- **所有文档使用中文**
- 英文术语可保留，如 API、SDK、UI 等
- 保持一致性，如统一使用"组件"而非"元件"

#### 文档结构

每个包的 README.md 结构：

```markdown
# @lytjs/<package-name>

> 包功能描述（一句话）

## 安装

```bash
npm install @lytjs/<package-name>
```

## 使用示例

```typescript
import { ... } from '@lytjs/<package-name>';

// 使用示例
```

## API 文档

### 函数名

#### 参数
- `param1`: 参数描述
- `param2`: 参数描述

#### 返回值
返回值描述

## 相关链接

- [架构文档](../../docs/...)
- [其他包](../...)
```

---

## 7. 快速参考卡

### 🚀 5 分钟开始工作

```bash
# 1. 确保环境
node -v  # >= 18
pnpm -v  # >= 9

# 2. 安装依赖
pnpm install

# 3. 检查现有问题
pnpm lint:check
pnpm type-check

# 4. 构建验证
pnpm build

# 5. 开始开发
git checkout -b feature/你的功能
```

### ⚡ 常用命令速查

```bash
# 类型检查
pnpm type-check

# Lint 检查
pnpm lint:check

# Lint 自动修复
pnpm lint

# 构建核心包
pnpm --filter="@lytjs/*" build

# 运行测试
pnpm test

# 运行单个测试
pnpm test -- filter="反应式"
```

### 📦 常用包速查

| 功能 | 包名 |
| --- | --- |
| 类型检查 | @lytjs/common-is |
| 常量定义 | @lytjs/common-constants |
| 信号工具 | @lytjs/common-vnode |
| 过渡动画 | @lytjs/common-transition-engine |
| DOM 操作 | @lytjs/common-dom-helpers |

---

## 8. 问题排查指南

### 常见问题

#### Q: Husky 钩子导致内存不足？

A: 禁用钩子提交：
```bash
git commit --no-verify -m "..."
```

#### Q: 类型检查失败？

A: 按以下步骤排查：
```bash
1. 确保已运行 pnpm install
2. 检查 tsconfig.json 配置
3. 查看具体错误信息定位问题
```

#### Q: 构建失败？

A: 常见原因：
- 缺少依赖：重新运行 pnpm install
- 类型错误：运行 pnpm type-check
- tsup 配置：检查 tsup.config.ts（必须启用 dts: true）

---

## 9. 持续改进

此规范会根据项目发展持续更新。如有建议，请提交 Issue 或 PR！

---

**文档版本**: v1.0
**最后更新**: 2026-05-12
**维护者**: LytJS Team
