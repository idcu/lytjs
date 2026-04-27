# @lytjs/lytjs

Lyt.js 聚合包 - 一键安装所有核心运行时功能。

## 安装

```bash
npm install @lytjs/lytjs

# 或使用 pnpm
pnpm add @lytjs/lytjs
```

## 特性

- 📦 一键安装所有核心包
- 🎯 零运行时依赖
- 💡 方便快速开发
- 🔧 完整导出所有 API

## 快速开始

```javascript
import { createApp, defineComponent, ref, computed } from '@lytjs/lytjs';

const App = defineComponent({
  setup() {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);

    return { count, doubled };
  },
  template: `
    <div>
      <h1>Count: {{ count }}</h1>
      <p>Doubled: {{ doubled }}</p>
      <button @click="count++">Increment</button>
    </div>
  `
});

const app = createApp(App);
app.mount('#app');
```

## 导出的包

| 包名 | 说明 |
|------|------|
| `@lytjs/core` | 核心入口 |
| `@lytjs/reactivity` | 响应式系统 |
| `@lytjs/component` | 组件系统 |
| `@lytjs/compiler` | 模板编译器 |
| `@lytjs/renderer` | 渲染器 |
| `@lytjs/vdom` | 虚拟 DOM |
| `@lytjs/common` | 公共工具库 |

## 导出的 API

### 响应式

```javascript
import {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  effect,
  nextTick,
  signal
} from '@lytjs/lytjs';
```

### 组件和应用

```javascript
import {
  createApp,
  defineComponent,
  defineAsyncComponent,
  provide,
  inject,
  h
} from '@lytjs/lytjs';
```

### 生命周期

```javascript
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onErrorCaptured,
  onActivated,
  onDeactivated
} from '@lytjs/lytjs';
```

### 内置组件

```javascript
import {
  KeepAlive,
  Teleport,
  Transition,
  TransitionGroup,
  Suspense
} from '@lytjs/lytjs';
```

### 工具函数

```javascript
import {
  isString,
  isNumber,
  isObject,
  isFunction,
  deepClone,
  deepMerge
} from '@lytjs/lytjs';
```

## 使用示例

### 完整应用

```javascript
import {
  createApp,
  defineComponent,
  ref,
  computed,
  onMounted
} from '@lytjs/lytjs';

const App = defineComponent({
  setup() {
    const message = ref('Hello Lyt.js');
    const count = ref(0);
    const doubled = computed(() => count.value * 2);

    onMounted(() => {
      console.log('App mounted');
    });

    return { message, count, doubled };
  },
  template: `
    <div>
      <h1>{{ message }}</h1>
      <p>Count: {{ count }}</p>
      <p>Doubled: {{ doubled }}</p>
      <button @click="count++">Increment</button>
    </div>
  `
});

const app = createApp(App);
app.mount('#app');
```

### 响应式数据

```javascript
import { ref, reactive, computed, watch, watchEffect } from '@lytjs/lytjs';

const count = ref(0);
const state = reactive({ a: 1, b: 2 });
const sum = computed(() => count.value + state.a + state.b);

watch(count, (newVal, oldVal) => {
  console.log('count changed:', oldVal, '->', newVal);
});

watchEffect(() => {
  console.log('sum:', sum.value);
});
```

### 组件通信

```javascript
import {
  defineComponent,
  provide,
  inject,
  createApp
} from '@lytjs/lytjs';

const Child = defineComponent({
  setup() {
    const message = inject('message');
    return { message };
  },
  template: `<p>{{ message }}</p>`
});

const Parent = defineComponent({
  setup() {
    provide('message', 'Hello from parent');
  },
  template: `<Child />`,
  components: { Child }
});

createApp(Parent).mount('#app');
```

## 包结构

```
@lytjs/lytjs
├── reactivity
├── core
├── component
├── compiler
├── renderer
├── vdom
└── common
```

## 性能

- 聚合包，方便使用
- 零运行时依赖
- 按需 tree-shakable
- 高效的响应式系统

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
