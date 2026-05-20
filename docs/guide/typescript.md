# TypeScript 支持

LytJS 使用 TypeScript 编写，提供完整的类型定义，开箱即用地支持 TypeScript 开发。

## 基础配置

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "jsxImportSource": "@lytjs/core",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

## 组件类型

### defineComponent

使用 `defineComponent` 可以获得完整的类型推导：

```typescript
import { defineComponent, ref, computed } from '@lytjs/core';

export default defineComponent({
  props: {
    title: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  emits: {
    update: (value: number) => typeof value === 'number',
  },
  setup(props, { emit }) {
    const doubled = computed(() => props.count * 2);

    const increment = () => {
      emit('update', props.count + 1);
    };

    return { doubled, increment };
  },
});
```

### 组合式 API 类型

```typescript
import { ref, reactive, computed, watch, type Ref } from '@lytjs/core';

// ref 自动推导类型
const count = ref(0); // Ref<number>
const name = ref('hello'); // Ref<string>

// 显式指定类型
const list = ref<string[]>([]);

// reactive 推导类型
const state = reactive({
  count: 0,
  name: 'hello',
}); // { count: number; name: string }

// computed 推导类型
const doubled = computed(() => count.value * 2); // ComputedRef<number>

// watch 类型安全
watch(count, (newVal, oldVal) => {
  // newVal: number, oldVal: number
  console.log(newVal, oldVal);
});
```

## API 类型参考

### createApp

```typescript
import type { App, Component } from '@lytjs/core';

const app: App = createApp(rootComponent);
```

### VNode 类型

```typescript
import type { VNode, VNodeChildren } from '@lytjs/core';

// VNode 类型在渲染函数中自动推导
```

### 插件类型

```typescript
import type { App, Plugin } from '@lytjs/core';

const myPlugin: Plugin = {
  install(app: App, ...options: unknown[]) {
    // 类型安全的插件实现
  },
};
```

## Signal 模式类型

`@lytjs/core-signal` 提供额外的 Signal 相关类型：

```typescript
import {
  signal,
  computedSignal,
  readonlySignal,
  type Signal,
  type ComputedSignal,
  type WritableSignal,
  type ReadonlySignal,
} from '@lytjs/core-signal';

const count: WritableSignal<number> = signal(0);
const doubled: ComputedSignal<number> = computedSignal(() => count() * 2);
const readonly: ReadonlySignal<number> = readonlySignal(count);
```

## JSX 类型

在 `.tsx` 文件中使用 JSX 时，确保 `tsconfig.json` 中配置了正确的 `jsxImportSource`：

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@lytjs/core"
  }
}
```

```tsx
import { defineComponent, ref } from '@lytjs/core';

export default defineComponent({
  setup() {
    const count = ref(0);
    return () => <button onClick={() => count.value++}>Count: {count.value}</button>;
  },
});
```
