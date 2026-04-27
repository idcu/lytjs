# @lytjs/component

Lyt.js 组件系统 - 提供 defineComponent、组件生命周期、插槽、内置组件等能力。

## 安装

```bash
npm install @lytjs/component

# 或使用 pnpm
pnpm add @lytjs/component
```

## 特性

- 📦 defineComponent
- 🔄 完整生命周期钩子
- 🎯 插槽系统
- 💾 KeepAlive 缓存
- ⏳ Suspense 异步
- 🎭 Teleport 传送门

## 快速开始

### 定义组件

```javascript
import { defineComponent } from '@lytjs/component';

const MyComponent = defineComponent({
  props: {
    msg: {
      type: String,
      default: 'Hello'
    }
  },
  emits: ['click'],
  setup(props, { emit }) {
    const handleClick = () => {
      emit('click', props.msg);
    };
    return { handleClick };
  },
  template: `
    <div>
      <p>{{ msg }}</p>
      <button @click="handleClick">Click me</button>
    </div>
  `
});
```

### 使用插槽

```javascript
import { defineComponent } from '@lytjs/component';

const Layout = defineComponent({
  template: `
    <div class="layout">
      <header>
        <slot name="header">默认头部</slot>
      </header>
      <main>
        <slot></slot>
      </main>
      <footer>
        <slot name="footer"></slot>
      </footer>
    </div>
  `
});
```

### 作用域插槽

```javascript
import { defineComponent, ref } from '@lytjs/component';

const List = defineComponent({
  props: ['items'],
  template: `
    <ul>
      <li each="item in items" :key="item.id">
        <slot name="item" :item="item" :index="index"></slot>
      </li>
    </ul>
  `
});
```

## API 参考

### 组件定义

| API | 说明 |
|------|------|
| `defineComponent(options)` | 定义组件 |
| `defineAsyncComponent(loader)` | 定义异步组件 |
| `resolveComponent(name)` | 解析组件 |
| `resolveDynamicComponent(component)` | 解析动态组件 |

### 生命周期

| 钩子 | 说明 |
|------|------|
| `onBeforeMount` | 组件挂载前 |
| `onMounted` | 组件挂载后 |
| `onBeforeUpdate` | 组件更新前 |
| `onUpdated` | 组件更新后 |
| `onBeforeUnmount` | 组件卸载前 |
| `onUnmounted` | 组件卸载后 |
| `onActivated` | KeepAlive 激活时 |
| `onDeactivated` | KeepAlive 失活时 |
| `onErrorCaptured` | 捕获后代错误时 |

### 内置组件

| 组件 | 说明 |
|------|------|
| `KeepAlive` | 缓存组件实例 |
| `Teleport` | 传送门 |
| `Transition` | 过渡动画 |
| `TransitionGroup` | 列表过渡 |
| `Suspense` | 异步依赖 |

## 内置组件使用

### KeepAlive

```javascript
import { defineComponent, KeepAlive } from '@lytjs/component';

const App = defineComponent({
  template: `
    <KeepAlive :include="['Home,About">
      <component :is="currentComponent"></component>
    </KeepAlive>
  `
});
```

### Teleport

```javascript
import { defineComponent, Teleport } from '@lytjs/component';

const Modal = defineComponent({
  props: ['show'],
  template: `
    <Teleport to="body">
      <div v-if="show" class="modal">
        <slot></slot>
      </div>
    </Teleport>
  `
});
```

### Transition

```javascript
import { defineComponent, Transition } from '@lytjs/component';

const App = defineComponent({
  template: `
    <Transition name="fade" mode="out-in">
      <div v-if="show">Hello</div>
    </Transition>
  `
});
```

### Suspense

```javascript
import { defineComponent, Suspense, defineAsyncComponent } from '@lytjs/component';

const AsyncComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
);

const App = defineComponent({
  template: `
    <Suspense>
      <template #default>
        <AsyncComponent />
      </template>
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  `
});
```

## 示例

### 完整组件示例

```javascript
import { defineComponent, ref, computed } from '@lytjs/component';

const Counter = defineComponent({
  props: {
    initial: {
      type: Number,
      default: 0
    }
  },
  emits: ['update:count'],
  setup(props, { emit }) {
    const count = ref(props.initial);

    const doubled = computed(() => count.value * 2);

    function increment() {
      count.value++;
      emit('update:count', count.value);
    }

    return { count, doubled, increment };
  },
  template: `
    <div class="counter">
      <p>Count: {{ count }}</p>
      <p>Doubled: {{ doubled }}</p>
      <button @click="increment">+1</button>
    </div>
  `
});
```

### 使用插槽示例

```javascript
import { defineComponent } from '@lytjs/component';

const Card = defineComponent({
  template: `
    <div class="card">
      <div class="card-header">
        <slot name="header"></slot>
      </div>
      <div class="card-body">
        <slot></slot>
      </div>
      <div class="card-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  `
});

// 使用
const App = defineComponent({
  components: { Card },
  template: `
    <Card>
      <template #header>
        <h2>标题</h2>
      </template>
      <p>内容</p>
      <template #footer>
        <button>确定</button>
      </template>
    </Card>
  `
});
```

## 性能

- 体积：3.55 KB (ESM gzip)
- 零运行时依赖
- 高效的组件实例管理

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
