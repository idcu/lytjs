# TypeScript 类型系统增强指南

> 本文档概述了 LytJS 项目的 TypeScript 类型系统状态、最佳实践和未来增强计划
>
> **当前状态**: ✅ 类型检查 100% 通过
> **最后更新**: 2026-05-17

---

## 目录

1. [当前类型系统状态](#当前类型系统状态)
2. [TypeScript 配置](#typescript-配置)
3. [类型系统最佳实践](#类型系统最佳实践)
4. [类型增强计划](#类型增强计划)
5. [常见模式与示例](#常见模式与示例)

---

## 当前类型系统状态

### ✅ 已验证状态

| 检查项           | 状态    | 说明                         |
| ---------------- | ------- | ---------------------------- |
| **总体类型检查** | ✅ 通过 | 69/70 项目全部通过           |
| **Strict 模式**  | ✅ 启用 | tsconfig 配置了 strict: true |
| **类型覆盖率**   | ✅ 高   | 所有核心包均有完整类型       |
| **零依赖检查**   | ✅ 通过 | 无第三方运行时依赖           |

### 📊 已完成的类型增强

- ✅ 严格的类型检查（noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch）
- ✅ 精确的索引访问检查（noUncheckedIndexedAccess）
- ✅ 模块语法严格（verbatimModuleSyntax）
- ✅ 完整的路径别名配置
- ✅ 所有包均有独立的 tsconfig.json
- ✅ UI 组件类型全面修复（已移除 any 类型）

---

## TypeScript 配置

### 根目录配置（tsconfig.base.json）

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true
    // ... 其他配置
  }
}
```

### 配置亮点

| 配置项                       | 值     | 说明                                   |
| ---------------------------- | ------ | -------------------------------------- |
| `strict`                     | `true` | 启用所有严格类型检查                   |
| `noUnusedLocals`             | `true` | 禁止未使用的局部变量                   |
| `noUnusedParameters`         | `true` | 禁止未使用的参数                       |
| `noFallthroughCasesInSwitch` | `true` | 禁止 case 穿透（除非显式 fallthrough） |
| `noUncheckedIndexedAccess`   | `true` | 索引访问结果可能为 undefined           |
| `verbatimModuleSyntax`       | `true` | 严格的模块导入/导出语法                |

---

## 类型系统最佳实践

### 1. 避免使用 any 类型

```typescript
// ❌ 避免：使用 any
function process(data: any) {
  return data.toUpperCase();
}

// ✅ 推荐：使用 unknown 配合类型守卫
function process(data: unknown): string {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  throw new TypeError('需要 string 类型');
}

// ✅ 推荐：使用具体类型
interface UserData {
  name: string;
  age: number;
}
function process(data: UserData) {
  return data.name;
}
```

### 2. 使用类型守卫

```typescript
// ✅ 推荐：类型守卫
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

function isLytComponent(value: unknown): value is Component {
  return typeof value === 'object' && value !== null && 'setup' in value && 'render' in value;
}
```

### 3. 类型断言函数

```typescript
// ✅ 推荐：类型断言函数
function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

function assertString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError('需要 string 类型');
  }
}

function assertSignal<T>(value: unknown): asserts value is Signal<T> {
  if (!(value && typeof value === 'function' && 'set' in value)) {
    throw new TypeError('需要 Signal 类型');
  }
}
```

### 4. 可空类型处理

```typescript
// ✅ 推荐：显式处理可空类型
function findUser(id: string): User | null {
  return users.get(id) ?? null;
}

function processUser(user: User | null) {
  if (user === null) {
    // 处理 null 情况
    return;
  }
  // 这里 user 已经被收窄为 User 类型
  return user.name;
}
```

### 5. 泛型使用

```typescript
// ✅ 推荐：使用泛型
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}

interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  return response.json();
}
```

### 6. 区分类型导入

```typescript
// ✅ 推荐：使用 type 关键字仅导入类型
import type { User, UserId } from './types';
import { createUser } from './utils'; // 导入值

// ✅ 推荐：混合导入时明确区分
import { createUser, type User, type UserId } from './module';
```

---

## 类型增强计划

### 🎯 短期计划（v6.2）

| 任务                                    | 优先级 | 状态      | 说明                   |
| --------------------------------------- | ------ | --------- | ---------------------- |
| **更严格的 exactOptionalPropertyTypes** | 🟡 中  | ⏳ 待启用 | 精确的可选属性类型检查 |
| **类型测试覆盖**                        | 🟡 中  | ⏳ 待添加 | 确保关键类型行为有测试 |
| **类型文档完善**                        | 🟢 低  | ⏳ 待添加 | 增强 JSDoc 注释        |

### 🚀 中期计划（v6.3 - v6.4）

| 任务               | 优先级 | 状态      | 说明               |
| ------------------ | ------ | --------- | ------------------ |
| **类型推断优化**   | 🟡 中  | ⏳ 待计划 | 改善泛型推断体验   |
| **模板字面量类型** | 🟢 低  | ⏳ 待计划 | 增强字符串类型安全 |
| **条件类型优化**   | 🟢 低  | ⏳ 待计划 | 更强大的条件类型   |

### 🌟 长期探索（v7.0+）

| 任务                    | 状态    | 说明                     |
| ----------------------- | ------- | ------------------------ |
| **类型级编程**          | 🤔 探索 | 探索高级类型模式         |
| **运行时类型检查**      | 🤔 探索 | 考虑 io-ts 或 zod 风格   |
| **TypeScript 版本升级** | ⏳ 计划 | 保持最新 TypeScript 版本 |

---

## 常见模式与示例

### Signal 类型模式

```typescript
// Signal 的标准类型定义
interface Signal<T> {
  (): T;
  set: (value: T | ((prev: T) => T)) => void;
}

// ✅ 使用示例
const count = signal(0);
count.set(1);
count.set((c) => c + 1);

// Computed 信号
const doubled = computed(() => count() * 2);
```

### 组件 Prop 类型

```typescript
// ✅ 组件 Props 类型定义
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (event: Event) => void;
  children?: VNodeChildren;
}

// ✅ 使用 PropType
import { PropType } from '@lytjs/component';

const Button = defineComponent({
  props: {
    variant: String as PropType<ButtonProps['variant']>,
    size: String as PropType<ButtonProps['size']>,
    disabled: Boolean,
    onClick: Function as PropType<ButtonProps['onClick']>,
  },
});
```

### VNode 类型

```typescript
// VNode 类型安全
import { h, Text, Comment, Fragment } from '@lytjs/vdom';
import type { VNode, VNodeChildren } from '@lytjs/vdom';

const vnode: VNode = h('div', { class: 'container' }, [h('h1', 'Hello'), h(Text, 'World')]);
```

---

## 类型检查与验证

### 运行类型检查

```bash
# 运行全项目类型检查
pnpm type-check

# 运行单个包的类型检查
cd packages/reactivity
pnpm type-check
```

### 与其他检查配合

```bash
# 完整的检查流程
pnpm lint:check       # Lint 检查
pnpm type-check       # TypeScript 类型检查
pnpm test            # 测试
pnpm build           # 构建
```

---

## 相关文档

- [开发规范指南](./DEVELOPMENT_GUIDELINES.md) - 完整的开发规范
- [架构设计](./ARCHITECTURE.md) - 8 层架构设计
- [知识库](./KNOWLEDGE_BASE.md) - 开发经验汇总

---

**文档版本**: v1.0
**最后更新**: 2026-05-17
**维护者**: LytJS Team
