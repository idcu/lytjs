# 组件基础

组件是 LytJS 应用的核心构建块，用于封装可复用的 UI 和逻辑。本教程将介绍如何创建和使用组件。

## 什么是组件？

组件是可复用的独立单元，包含：

- **视图（Template）**：组件的 UI 结构
- **逻辑（Script）**：组件的行为和数据处理
- **样式（Style）**：组件的视觉表现

## 简单组件示例

让我们从一个简单的计数器组件开始：

```vue
<script setup lang="ts">
import { signal } from '@lytjs/core';

const count = signal(0);
const increment = () => count(count() + 1);
</script>

<template>
  <div class="counter">
    <p>计数: {{ count }}</p>
    <button @click="increment">+1</button>
  </div>
</template>

<style scoped>
.counter {
  padding: 20px;
  text-align: center;
}
</style>
```

## 定义组件

使用 `defineComponent` 定义组件：

```typescript
import { defineComponent, signal } from '@lytjs/core';

export default defineComponent({
  name: 'MyComponent',

  setup() {
    const count = signal(0);

    const increment = () => {
      count(count() + 1);
    };

    return {
      count,
      increment,
    };
  },

  template: `
    <div class="counter">
      <h2>计数器</h2>
      <p>当前计数: {{ count }}</p>
      <button @click="increment">增加</button>
    </div>
  `,
});
```

## 使用组件

在模板中使用组件：

```vue
<template>
  <div>
    <h1>我的应用</h1>
    <MyComponent />
    <MyComponent />
  </div>
</template>

<script setup>
import MyComponent from './components/MyComponent.vue';
</script>
```

## Props

Props 用于父组件向子组件传递数据。

### 定义 Props

```typescript
export default defineComponent({
  name: 'UserCard',

  props: {
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      default: 0,
    },
    avatar: String,
  },

  setup(props) {
    // 使用 props.name 访问
    console.log(props.name);

    return {};
  },

  template: `
    <div class="user-card">
      <img v-if="avatar" :src="avatar" :alt="name" />
      <h3>{{ name }}</h3>
      <p>年龄: {{ age }}</p>
    </div>
  `,
});
```

### 使用 Props

```vue
<template>
  <UserCard name="张三" :age="25" avatar="/avatar.jpg" />
</template>
```

## Events

Events 用于子组件向父组件通信。

### 定义 Events

```typescript
export default defineComponent({
  name: 'SubmitButton',

  emits: ['click', 'submit'],

  setup(props, { emit }) {
    const handleClick = () => {
      emit('click');
    };

    const handleSubmit = () => {
      emit('submit', { success: true });
    };

    return {
      handleClick,
      handleSubmit,
    };
  },

  template: `
    <button @click="handleClick">点击</button>
    <button @click="handleSubmit">提交</button>
  `,
});
```

### 监听 Events

```vue
<template>
  <SubmitButton @click="onClick" @submit="onSubmit" />
</template>

<script setup>
const onClick = () => {
  console.log('按钮被点击');
};

const onSubmit = (data) => {
  console.log('提交数据:', data);
};
</script>
```

## 插槽

插槽用于在组件中预留内容分发区域。

### 默认插槽

```typescript
export default defineComponent({
  name: 'Card',

  template: `
    <div class="card">
      <div class="card-header">
        <h3>卡片标题</h3>
      </div>
      <div class="card-body">
        <slot></slot>
      </div>
    </div>
  `,
});
```

使用默认插槽：

```vue
<template>
  <Card>
    <p>这是卡片内容</p>
    <button>操作按钮</button>
  </Card>
</template>
```

### 命名插槽

```typescript
export default defineComponent({
  name: 'Modal',

  template: `
    <div class="modal">
      <div class="modal-header">
        <slot name="header">
          <h2>默认标题</h2>
        </slot>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div class="modal-footer">
        <slot name="footer">
          <button>确定</button>
        </slot>
      </div>
    </div>
  `,
});
```

使用命名插槽：

```vue
<template>
  <Modal>
    <template #header>
      <h2>自定义标题</h2>
    </template>

    <p>弹窗内容</p>

    <template #footer>
      <button>取消</button>
      <button>确定</button>
    </template>
  </Modal>
</template>
```

## 生命周期

LytJS 提供丰富的生命周期钩子：

### 常用生命周期

```typescript
import {
  onMounted,
  onUpdated,
  onUnmounted,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
} from '@lytjs/core';

export default defineComponent({
  setup() {
    // 组件实例创建前
    console.log('Setup called');

    // 挂载前
    onBeforeMount(() => {
      console.log('Before mount');
    });

    // 挂载后（常用）
    onMounted(() => {
      console.log('Mounted');
      // 进行 DOM 操作、API 调用等
    });

    // 更新前
    onBeforeUpdate(() => {
      console.log('Before update');
    });

    // 更新后
    onUpdated(() => {
      console.log('Updated');
    });

    // 卸载前
    onBeforeUnmount(() => {
      console.log('Before unmount');
    });

    // 卸载后（常用）
    onUnmounted(() => {
      console.log('Unmounted');
      // 清理定时器、取消订阅等
    });

    return {};
  },
});
```

## 组件通信

### Props 向下传递

父组件向子组件传递数据：

```typescript
// 父组件
const userName = signal('张三')

return {
  userName
}

// 模板
<UserCard :name="userName()" />
```

### Events 向上传递

子组件向父组件发送事件：

```typescript
// 子组件
const handleClick = () => {
  emit('custom-event', { data: 'some data' })
}

// 父组件监听
<UserCard @custom-event="handleCustom" />

const handleCustom = (data) => {
  console.log(data) // { data: 'some data' }
}
```

### Provide/Inject

跨层级传递数据：

```typescript
// 祖先组件
import { provide, signal } from '@lytjs/core';

const theme = signal('light');
provide('theme', theme);

// 后代组件
import { inject } from '@lytjs/core';

const theme = inject('theme');
console.log(theme()); // 'light'
```

## 组件样式

### Scoped CSS

```typescript
export default defineComponent({
  template: `
    <div class="container">
      <h1 class="title">标题</h1>
    </div>
  `,

  styles: `
    .container {
      padding: 20px;
    }
    
    .title {
      font-size: 24px;
      color: #333;
    }
  `,
});
```

### CSS 变量

使用 CSS 变量实现主题定制：

```typescript
template: `
  <div class="button" :style="{
    '--button-color': color,
    '--button-bg': backgroundColor
  }">
    <slot></slot>
  </div>
`;
```

## 组件最佳实践

### ✅ 推荐做法

```typescript
// 1. 使用有意义的组件名
const UserProfile = defineComponent({ ... })
const ProductList = defineComponent({ ... })

// 2. 明确定义 Props 类型
props: {
  title: { type: String, required: true },
  items: { type: Array as () => Item[], default: () => [] }
}

// 3. 及时清理副作用
onUnmounted(() => {
  clearInterval(timer)
  subscription.unsubscribe()
})
```

### ❌ 避免做法

```typescript
// 避免：组件名过于简单
const Button = defineComponent({ ... })
const List = defineComponent({ ... })

// 避免：不定义 Props 类型
props: {
  title: String // 缺少验证
}

// 避免：在 setup 中进行大量计算
setup() {
  // ...
  return { /* 返回大量数据 */ }
}
```

## 下一步

- 学习 [Todo 应用实战](./todo-app-example) - 构建一个完整的应用
- 阅读 [状态管理](./state-management) - 学习更高级的状态管理
- 查看 [路由导航](./routing) - 了解路由使用
- 参考 [示例项目](../examples) - 查看更多代码示例
