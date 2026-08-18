# 开发规范指南

> 本文档包含 LytJS 项目的详细开发规范

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
pnpm type-check          # 类型检查
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
interface UserProfile {}
class Component {}
const MyComponent = defineComponent({});

// camelCase: 变量、函数、属性
const userName = ref('');
function getUserInfo() {}

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

## TypeScript 编码规范

### 类型定义原则

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

### 类型安全实践

```typescript
// ✅ 推荐：使用类型守卫
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value && 'name' in value;
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

### Reactivity 模块编码规范

#### Ref 和 Signal 使用规范

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
  name: 'LytJS',
});

// ❌ 避免：在 signal.set 的回调中做太多事情
// count.set(c => {
//   // 避免复杂逻辑
//   return c + 1;
// });
```

#### 批量更新最佳实践

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

### VDOM 模块编码规范

#### VNode 创建规范

```typescript
// ✅ 推荐：使用 h 函数创建 VNode
import { h, Text, Comment, Fragment } from '@lytjs/vdom';

const vnode = h('div', { class: 'container' }, [
  h('h1', { key: 'title' }, 'Hello LytJS'),
  h(Text, 'World'),
  h(Comment, '这是注释'),
]);

// ✅ 推荐：使用 PatchFlags 优化动态内容
import { PatchFlags } from '@lytjs/common-constants';

h(
  'span',
  {
    key: 'text',
    [PatchFlags.TEXT]: true,
  },
  dynamicText,
);
```

#### 列表渲染规则

```typescript
// ✅ 推荐：始终使用唯一的 key
const list = items.map((item) => h('li', { key: item.id }, item.name));

// ✅ 推荐：使用 @lytjs/common-algorithm 中的 LIS
import { lis } from '@lytjs/common-algorithm';

// ❌ 避免：使用索引作为 key（当列表会变化时）
// items.map((item, index) => h('li', { key: index }, ...));
```

### Core 模块编码规范

#### 组件定义规范

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
      h('button', { onClick: ctx.increment }, 'Increment'),
    ]);
  },
});
```

#### 生命周期钩子使用

```typescript
// ✅ 推荐：明确的生命周期使用
import { onMounted, onUnmounted, onUpdated, onActivated, onDeactivated } from '@lytjs/core';

onMounted(() => {
  // 组件挂载后执行
  console.log('组件已挂载');
});

onUnmounted(() => {
  // 组件卸载前清理
  // 清理定时器、事件监听等
});
```

### Renderer 模块编码规范

#### 渲染器实现规范

```typescript
// ✅ 推荐：遵循 Host Contract 接口
import { HostContract } from '@lytjs/host-contract';

const host: HostContract = {
  createElement: (tag) => document.createElement(tag),
  createText: (text) => document.createTextNode(text),
  // ... 其他方法
};
```

#### DOM 操作规范

```typescript
// ✅ 推荐：使用 web adapter
import { webAdapter } from '@lytjs/adapter-web';

// ✅ 推荐：使用 @lytjs/web 工具
import { cssVars, resizeObserver } from '@lytjs/web';

// ✅ 推荐：使用事件正规化
import { normalizeEvent } from '@lytjs/common-event-normalizer';
```

### 错误处理规范

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
    public context?: unknown,
  ) {
    super(message);
    this.name = 'LytJSError';
  }
}

// ✅ 推荐：使用 @lytjs/common-warn
import { warn, error } from '@lytjs/common-warn';

if (__DEV__ && condition) {
  warn('这是一个警告信息');
}

if (criticalCondition) {
  error('这是一个严重错误');
}
```

### 性能关键代码规范

#### 避免常见的性能陷阱

```typescript
// ❌ 避免：在渲染中创建新对象
// const App = defineComponent({
//   render() {
//     return h('div', {
//       style: { color: 'red' } // 每次渲染都创建新对象
//     });
//   }
// });

// ✅ 推荐：在 setup 中创建并复用
const style = { color: 'red' };
const App = defineComponent({
  render() {
    return h('div', { style });
  },
});
```

#### 懒加载和代码分割

```typescript
// ✅ 推荐：使用 defineAsyncComponent
import { defineAsyncComponent } from '@lytjs/core';

const HeavyComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
});
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

### 避免重复造轮子

```typescript
// ✅ 推荐：复用已有的工具函数
import { toPascalCase, camelize } from '@lytjs/common-string';

// ✅ 推荐：使用 common-dom-helpers
import { querySelector, addEventListener, removeEventListener } from '@lytjs/common-dom-helpers';
```

---

## 项目结构

详细内容请参考 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 性能要求

### 测试覆盖率

| 模块       | 最低覆盖率 |
| ---------- | ---------- |
| reactivity | ≥ 90%      |
| vdom       | ≥ 85%      |
| compiler   | ≥ 80%      |
| core       | ≥ 80%      |

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

````typescript
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
````

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

## 8 层架构开发规范

详细内容请参考 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 相关文档链接：

- [插件开发指南](./PLUGIN_DEVELOPMENT.md) - 官方插件开发的详细指南
- [第三方插件生态](./third-party-ecosystem.md) - 生态建设与插件审核
- [知识库](./KNOWLEDGE_BASE.md) - 开发经验和最佳实践

---

**文档版本**: v2.1
**最后更新**: 2026-05-17
**维护者**: LytJS Team
