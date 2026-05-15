# 组件

组件是 LytJS 应用的基本构建单元。组件将 UI 拆分为独立、可复用的部分。

::: tip 提示
如果你是新手，建议先阅读 [组件基础](../tutorial/components) 教程。
:::

## 简单组件

使用 `defineComponent` 定义组件（推荐使用 Signal API）：

```typescript
import { defineComponent, signal } from '@lytjs/core';

export default defineComponent({
  name: 'Counter',

  setup() {
    const count = signal(0);
    const increment = () => count(count() + 1);

    return { count, increment };
  },

  template: `
    <div class="counter">
      <p>Count: {{ count }}</p>
      <button @click="increment">Increment</button>
    </div>
  `
});
```

## 使用 Vue SFC 语法（推荐）

使用 `.vue` 单文件组件，更直观：

```vue
<script setup lang="ts">
import { signal } from '@lytjs/core';

const count = signal(0);
const increment = () => count(count() + 1);
</script>

<template>
  <div class="counter">
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<style scoped>
.counter {
  padding: 20px;
}
</style>
```

## Props

通过 `props` 选项声明组件接收的属性：

```typescript
defineComponent({
  name: 'UserCard',

  props: {
    name: { type: String, required: true },
    age: { type: Number, default: 0 },
  },

  setup(props) {
    // 使用 props.name 访问属性
    return { props };
  },

  template: `
    <div class="user-card">
      <h3>{{ props.name }}</h3>
      <p>Age: {{ props.age }}</p>
    </div>
  `
});
```

在父组件中使用：

```vue
<template>
  <UserCard name="张三" :age="25" />
</template>

<script setup>
import UserCard from './UserCard.vue';
</script>
```

## Events

子组件通过事件向父组件通信：

```typescript
defineComponent({
  name: 'SubmitButton',

  emits: ['click', 'submit'],

  setup(props, { emit }) {
    const handleClick = () => {
      emit('click');
    };

    const handleSubmit = () => {
      emit('submit', { success: true });
    };

    return { handleClick, handleSubmit };
  },

  template: `
    <button @click="handleClick">Click</button>
    <button @click="handleSubmit">Submit</button>
  `
});
```

父组件监听事件：

```vue
<template>
  <SubmitButton @click="onClick" @submit="onSubmit" />
</template>

<script setup>
const onClick = () => console.log('clicked');
const onSubmit = (data) => console.log('data:', data);
</script>
```

## 生命周期

组件提供完整的生命周期钩子：

```typescript
import { 
  onMounted, 
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount 
} from '@lytjs/core';

defineComponent({
  setup() {
    onMounted(() => {
      console.log('组件已挂载');
    });

    onUnmounted(() => {
      console.log('组件已卸载');
    });

    return {};
  }
});
```

## Provide/Inject

跨层级传递数据：

```typescript
// 祖先组件
import { provide, signal } from '@lytjs/core';

defineComponent({
  setup() {
    const theme = signal('light');
    provide('theme', theme);
    return {};
  }
});

// 后代组件
import { inject } from '@lytjs/core';

defineComponent({
  setup() {
    const theme = inject('theme');
    return { theme };
  }
});
```

## 下一步

- [响应式系统](./reactivity) - 深入了解响应式原理
- [自定义指令](./custom-directives) - 学习自定义指令
- [内置组件](./built-in-components) - 使用内置组件
