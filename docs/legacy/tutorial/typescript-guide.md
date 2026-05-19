# LytJS TypeScript 类型指南

本指南帮助你在 LytJS 项目中充分利用 TypeScript 的类型安全特性。

## 目录
1. [类型系统概述](#类型系统概述)
2. [核心类型导入](#核心类型导入)
3. [组件类型安全](#组件类型安全)
4. [响应式类型](#响应式类型)
5. [插件类型](#插件类型)
6. [SSR/SSG 类型](#ssrssg-类型)
7. [类型最佳实践](#类型最佳实践)
8. [类型调试技巧](#类型调试技巧)

---

## 类型系统概述

LytJS 提供完整的 TypeScript 类型系统，包括：

- **零第三方依赖类型** - 全部自研类型
- **严格类型检查** - 默认为 strict 模式
- **完整类型推断** - 自动类型推导
- **泛型支持** - 灵活的类型参数

---

## 核心类型导入

### 类型导入方式

```typescript
// ✅ 推荐的类型导入方式
import type { 
  ComponentPublicInstance,
  BaseAppConfig,
  BaseAppContext,
  Directive,
  DirectiveBinding,
  SlotFunction,
  InternalSlots,
  Plugin
} from '@lytjs/shared-types';

// 类型定义
import { signal, computed, effect } from '@lytjs/reactivity';
import type { Signal, Computed } from '@lytjs/reactivity';
```

### 完整类型列表

| 导入来源 | 类型 | 说明 |
|---------|------|------|
| `@lytjs/shared-types` | `ComponentPublicInstance` | 组件公共实例类型 |
| `@lytjs/shared-types` | `ComponentInternalInstance` | 组件内部实例类型 |
| `@lytjs/shared-types` | `ComponentOptionsBase` | 组件选项类型 |
| `@lytjs/shared-types` | `BaseAppConfig` | 应用配置类型 |
| `@lytjs/shared-types` | `BaseAppContext` | 应用上下文类型 |
| `@lytjs/shared-types` | `Plugin` | 插件类型 |
| `@lytjs/shared-types` | `Directive` | 指令类型 |
| `@lytjs/shared-types` | `DirectiveBinding` | 指令绑定类型 |
| `@lytjs/shared-types` | `SlotFunction` | 插槽函数类型 |
| `@lytjs/shared-types` | `InternalSlots` | 内部插槽类型 |

---

## 组件类型安全

### defineComponent 类型

```typescript
import { defineComponent } from '@lytjs/core';
import type { ComponentPublicInstance } from '@lytjs/shared-types';

interface Props {
  title: string;
  count?: number;
}

interface Emits {
  'update:count': (value: number) => void;
  'click': () => void;
}

const MyComponent = defineComponent<Props, Emits>({
  props: {
    title: String,
    count: {
      type: Number,
      default: 0
    }
  },
  emits: ['update:count', 'click'],
  
  setup(props, { emit }) {
    // props 会有类型提示
    console.log(props.title);
    
    // emit 会有类型检查
    emit('update:count', 100);
    
    return {};
  }
});

// 使用时类型安全
<MyComponent 
  title="Hello" 
  @update:count={(val) => console.log(val)} 
/>
```

### 类型组件实例类型

```typescript
import { ref, onMounted } from '@lytjs/core';
import type { ComponentPublicInstance } from '@lytjs/shared-types';

const MyComponent = defineComponent({
  expose: ['increment'],
  
  setup() {
    const count = ref(0);
    
    const increment = () => {
      count.value++;
    };
    
    return { count, increment };
  }
});

// 使用时类型安全
const compRef = ref<InstanceType<typeof MyComponent> | null>(null);

onMounted(() => {
  compRef.value?.increment(); // ✅ 类型安全
});
```

---

## 响应式类型

### Signal 类型

```typescript
import { signal, computed, effect } from '@lytjs/reactivity';
import type { Signal, Computed } from '@lytjs/reactivity';

// 基础类型
const count = signal(0);
const message = signal('Hello');
const isActive = signal(false);

// 对象类型
interface User {
  name: string;
  age: number;
}

const user = signal<User>({
  name: 'Alice',
  age: 25
});

// Computed 类型
const doubleCount = computed(() => count.value * 2);

// 类型安全的访问
count.value = 100;
user.value.name = 'Bob';
```

### 自定义响应式类型

```typescript
import { signal, computed } from '@lytjs/reactivity';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// 类型安全的 Todo Store
function useTodoStore() {
  const todos = signal<Todo[]>([]);
  
  const completedCount = computed(() => 
    todos.value.filter(todo => todo.done).length
  );
  
  const addTodo = (text: string) => {
    todos.value = [...todos.value, {
      id: Date.now(),
      text,
      done: false
    }];
  };
  
  const toggleTodo = (id: number) => {
    todos.value = todos.value.map(todo => 
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
  };
  
  return {
    todos,
    completedCount,
    addTodo,
    toggleTodo
  };
}
```

---

## 插件类型

### definePlugin 类型

```typescript
import { definePlugin, type PluginDefinition } from '@lytjs/core';

interface PluginOptions {
  apiBaseUrl: string;
  timeout?: number;
  debug?: boolean;
}

const myPlugin = definePlugin<PluginOptions>({
  name: 'my-plugin',
  schema: {
    type: 'object',
    properties: {
      apiBaseUrl: { type: 'string', required: true },
      timeout: { type: 'number', default: 5000 },
      debug: { type: 'boolean', default: false }
    }
  },
  install(app, options) {
    // options 类型安全
    console.log(options.apiBaseUrl);
    
    // 全局属性
    app.config.globalProperties.$api = {
      baseUrl: options.apiBaseUrl
    };
  }
});

// 使用时类型检查
app.use(myPlugin, {
  apiBaseUrl: 'https://api.example.com',
  debug: true
});
```

---

## SSR/SSG 类型

### SSR 渲染类型

```typescript
import { renderToString, renderToHtml } from '@lytjs/ssr';
import type { SSGPage, SSGOptions } from '@lytjs/ssr';

// SSG 页面类型
const pages: SSGPage[] = [
  {
    path: '/',
    component: h('div', 'Home'),
    head: {
      title: 'Home',
      meta: {
        description: 'Welcome'
      }
    }
  }
];

// SSG 选项类型
const ssgOptions: SSGOptions = {
  baseUrl: 'https://example.com',
  outDir: 'dist',
  defaultTitle: 'My Site',
  generateSitemap: true
};
```

---

## 类型最佳实践

### 1. 启用严格模式

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 2. 使用类型守卫

```typescript
import { isString, isNumber, isFunction } from '@lytjs/common-is';

function processValue(value: unknown) {
  if (isString(value)) {
    // value: string
    return value.toUpperCase();
  }
  
  if (isNumber(value)) {
    // value: number
    return value * 2;
  }
  
  if (isFunction(value)) {
    // value: Function
    return value();
  }
  
  throw new Error('Invalid value');
}
```

### 3. 类型注解与推断

```typescript
// ✅ 推荐：优先使用类型推断
const count = signal(0); // 自动推断为 Signal<number>

// ✅ 必要时显式注解
const data = signal<User[]>([]);

// ✅ 使用 typeof 简化类型
const someValue = signal(100);
type ValueType = typeof someValue.value; // number
```

### 4. 类型工具

```typescript
// 类型工具示例
type PartialProps<T> = Partial<T>;
type RequiredProps<T> = Required<T>;
type PickProps<T, K extends keyof T> = Pick<T, K>;
type OmitProps<T, K extends keyof T> = Omit<T, K>;

interface Props {
  title: string;
  count: number;
  optional?: boolean;
}

// 使用示例
type PropsWithDefaults = PartialProps<Props>;
type RequiredTitle = PickProps<Props, 'title'>;
type WithoutCount = OmitProps<Props, 'count'>;
```

---

## 类型调试技巧

### 1. typeof 和 keyof

```typescript
// 获取值的类型
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};

type Config = typeof config;
// { apiUrl: string; timeout: number; }

type ConfigKeys = keyof Config;
// 'apiUrl' | 'timeout'
```

### 2. 类型断言

```typescript
// ✅ 谨慎使用类型断言
const element = document.getElementById('app') as HTMLElement;

// ✅ 使用类型守卫更安全
function isHTMLElement(element: unknown): element is HTMLElement {
  return element instanceof HTMLElement;
}

const el = document.getElementById('app');
if (isHTMLElement(el)) {
  el.classList.add('active');
}
```

### 3. 类型调试

```typescript
// 使用 typeof 检查类型
console.log(typeof 100); // number

// 使用泛型查看推断类型
function inspectType<T>(value: T) {
  return value;
}

const inspected = inspectType({ name: 'Test' });
// 悬停查看 inferred type
```

---

## 常见问题

### Q: 如何处理 any 类型？

A: 避免使用 any，使用 unknown 或具体类型：

```typescript
// ❌ 避免
function badExample(data: any) {
  return data.value;
}

// ✅ 更好
function goodExample(data: unknown) {
  if (isObject(data) && 'value' in data) {
    return data.value;
  }
  return null;
}
```

### Q: Signal 的类型怎么写？

A: 直接赋值让 TypeScript 推断，或者显式注解：

```typescript
// 推断类型
const count = signal(0); // Signal<number>

// 显式注解
const items = signal<Item[]>([]);
```

### Q: 如何定义插件配置的类型？

A: 使用 definePlugin 的泛型参数：

```typescript
interface Options {
  apiKey: string;
  enabled?: boolean;
}

const plugin = definePlugin<Options>({
  /* ... */
});
```

---

## 相关文档

- [核心概念](./index.md) - 基础概念学习
- [CLI 指南](./cli-guide.md) - 使用 CLI 工具
- [SSR 指南](./ssr-guide.md) - 服务端渲染
- [实战案例](./实战案例教程.md) - 完整项目示例
