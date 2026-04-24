# 代码规范

这篇文档介绍 Lyt.js 的代码风格和规范，帮助你写出符合项目要求的代码。

## 📝 TypeScript 规范

### 类型定义

```typescript
// 优先使用 interface 描述对象结构
interface User {
  id: number;
  name: string;
}

// 使用 type 定义类型别名和联合类型
type Status = 'pending' | 'success' | 'error';
type Maybe<T> = T | null | undefined;

// 导出类型使用 export type
export type { User, Status };
```

### 严格模式

项目使用 TypeScript 严格模式：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

## 🎨 代码风格

### 缩进

使用 2 空格缩进：

```typescript
// ✅ 正确
function foo() {
  if (condition) {
    bar();
  }
}

// ❌ 错误
function foo() {
    if (condition) {
        bar();
    }
}
```

### 引号

使用单引号：

```typescript
// ✅ 正确
const message = 'Hello';

// ❌ 错误
const message = "Hello";
```

### 分号

不使用分号：

```typescript
// ✅ 正确
const a = 1
const b = 2

// ❌ 错误
const a = 1;
const b = 2;
```

### 逗号

不使用 trailing comma：

```typescript
// ✅ 正确
const obj = {
  a: 1,
  b: 2
}

// ❌ 错误
const obj = {
  a: 1,
  b: 2,
}
```

## 📦 命名规范

### 文件命名

使用 kebab-case：

```
html-parser.ts
create-app.ts
reactive.ts
```

### 变量和函数

使用 camelCase：

```typescript
// ✅ 正确
const userName = 'lyt'
function getUserInfo() {}

// ❌ 错误
const UserName = 'lyt'
function GetUserInfo() {}
```

### 类和类型

使用 PascalCase：

```typescript
// ✅ 正确
class ReactiveEffect {}
interface UserInfo {}

// ❌ 错误
class reactive_effect {}
interface userInfo {}
```

### 常量

使用 UPPER_SNAKE_CASE：

```typescript
// ✅ 正确
const MAX_COUNT = 100
const API_BASE_URL = 'https://api.example.com'

// ❌ 错误
const maxCount = 100
const ApiBaseUrl = 'https://api.example.com'
```

### 私有成员

使用下划线前缀（仅用于内部实现，不代表真正的私有）：

```typescript
// ✅ 正确
class Example {
  _privateProp: string
  _privateMethod() {}
}

// ❌ 错误
class Example {
  privateProp: string
  privateMethod() {}
}
```

## 💬 注释规范

### JSDoc 注释

公共 API 必须有 JSDoc 注释：

```typescript
/**
 * 创建响应式代理
 *
 * 使用 Proxy 拦截对象的访问，实现响应式。
 * 嵌套对象会递归代理。
 *
 * @param target - 要代理的目标对象
 * @param options - 配置选项
 * @returns 响应式代理对象
 *
 * @example
 * ```ts
 * const state = reactive({ count: 0 })
 * effect(() => console.log(state.count))
 * state.count++
 * ```
 */
export function reactive<T extends object>(
  target: T,
  options?: ReactiveOptions
): T {
  // 实现
}
```

### 行内注释

复杂逻辑需要行内注释：

```typescript
// 使用 WeakMap 缓存代理对象，确保同一个原始对象
// 始终返回同一个代理对象，同时允许 GC 回收
const proxyMap = new WeakMap<object, any>()

// 跳过依赖收集，避免在内部操作中触发不必要的更新
pauseTracking()
try {
  // 执行操作
} finally {
  resetTracking()
}
```

### TODO 注释

使用 TODO 标记待办事项：

```typescript
// TODO: 实现这个功能
// FIXME: 修复这个 bug
// HACK: 临时解决方案，需要重构
```

## 📂 项目结构规范

### 模块组织

每个包的结构应该是：

```
packages/[package-name]/
├── src/
│   ├── index.ts           # 统一入口
│   ├── [module1].ts
│   ├── [module2].ts
│   └── [subdir]/
│       └── [module3].ts
├── __tests__/
│   ├── [module1].test.ts
│   └── [module2].test.ts
├── dist/                  # 构建输出
└── package.json
```

### 入口文件

`index.ts` 应该只做导出，不包含实现：

```typescript
// ✅ 正确
export { reactive, ref } from './reactive'
export { effect, stop } from './effect'
export type { Ref, ReactiveEffect } from './types'

// ❌ 错误
export function reactive() {
  // 实现代码
}
```

## 🧪 测试规范

### 测试文件命名

使用 `.test.ts` 后缀：

```
reactivity.test.ts
component.test.ts
```

### 测试结构

使用 describe-it 结构：

```typescript
import { reactive, effect } from '../src'

describe('reactivity', () => {
  describe('reactive', () => {
    it('should create a reactive proxy', () => {
      const state = reactive({ count: 0 })
      expect(state).toBeDefined()
    })
    
    it('should trigger effect on change', () => {
      const state = reactive({ count: 0 })
      let dummy
      effect(() => {
        dummy = state.count
      })
      state.count++
      expect(dummy).toBe(1)
    })
  })
})
```

### 测试原则

1. **清晰**：测试名称描述清楚测试的内容
2. **独立**：每个测试应该独立运行
3. **覆盖边界**：测试边界情况和错误处理
4. **不依赖执行顺序**：测试不应该依赖执行顺序

## 🔧 Git 提交规范

### 提交格式

遵循 Conventional Commits：

```
<type>(<scope>): <subject>

<body>
```

### Type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链 |

### Scope 范围

使用包名：

```
reactivity
compiler
renderer
component
core
router
store
cli
```

### 示例

```
feat(reactivity): add watchEffect API
fix(renderer): correct patch order for keyed children
docs(readme): update installation guide
chore: update dependencies
```

## 🚀 性能优化建议

### 避免不必要的响应式

```typescript
// ❌ 不需要响应式的对象也用 reactive
const config = reactive({
  apiUrl: 'https://api.example.com',
  timeout: 5000
})

// ✅ 使用普通对象
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
}
```

### 使用 shallowRef / shallowReactive

```typescript
// ❌ 大型对象不需要深层响应式
const bigData = reactive({
  // 大量数据...
})

// ✅ 使用浅层响应式
const bigData = shallowReactive({
  // 大量数据...
})
```

### 避免频繁的 effect 创建

```typescript
// ❌ 在循环中创建 effect
for (let i = 0; i < 1000; i++) {
  effect(() => { /* ... */ })
}

// ✅ 尽量复用 effect
```

## 📚 资源

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)
