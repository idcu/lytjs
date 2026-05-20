# 组合式 API

组合式 API（Composition API）是 LytJS 提供的一组函数式 API，允许开发者按照逻辑关注点组织代码，而不是按选项类型分散代码。

## setup() 函数

`setup()` 是组合式 API 的入口函数，在组件创建之前执行。它接收 `props` 和上下文对象作为参数。

```typescript
import { ref } from '@lytjs/core';

const Counter = {
  props: {
    initialCount: { type: Number, default: 0 },
  },
  setup(props, ctx) {
    // ctx 包含 attrs、slots、emit、expose
    const count = ref(props.initialCount);

    const increment = () => count.value++;

    // 返回的属性和方法可以在模板中使用
    return { count, increment };
  },
};
```

`setup` 的上下文对象 `ctx` 包含以下属性：

| 属性     | 说明                                        |
| -------- | ------------------------------------------- |
| `attrs`  | 非 props 的透传属性（等同于 `this.$attrs`） |
| `slots`  | 插槽（等同于 `this.$slots`）                |
| `emit`   | 触发事件（等同于 `this.$emit`）             |
| `expose` | 显式暴露组件的公共属性/方法                 |

## ref 和 reactive

### ref

`ref` 用于创建一个包含单个值的响应式引用。在 JS 中通过 `.value` 访问，在模板中会自动解包。

```typescript
import { ref } from '@lytjs/core';

const count = ref(0);
const message = ref('hello');
const user = ref({ name: '张三', age: 25 });

// 读取和修改
console.log(count.value); // 0
count.value++;

// 对象类型也需要 .value
user.value.name = '李四';
```

### reactive

`reactive` 用于创建深层响应式对象。不能替换整个对象（会丢失响应性），不能解构（会丢失响应性）。

```typescript
import { reactive } from '@lytjs/core';

const state = reactive({
  count: 0,
  user: { name: '张三', age: 25 },
});

// 直接访问属性，无需 .value
state.count++;
state.user.name = '李四';
```

### ref vs reactive 选择

```typescript
// ref：适合基本类型和需要替换整个值的场景
const count = ref(0);
const list = ref([1, 2, 3]);
list.value = [4, 5, 6]; // 可以替换

// reactive：适合对象，不需要 .value
const state = reactive({ name: '张三', age: 25 });
// state = { name: '李四' }; // 错误！会丢失响应性
```

## computed

`computed` 创建一个只读或可写的计算属性。

### 只读计算属性

```typescript
import { ref, computed } from '@lytjs/core';

const firstName = ref('张');
const lastName = ref('三');

const fullName = computed(() => `${firstName.value}${lastName.value}`);

console.log(fullName.value); // "张三"
```

### 可写计算属性

```typescript
const firstName = ref('张');
const lastName = ref('三');

const fullName = computed({
  get() {
    return `${firstName.value}${lastName.value}`;
  },
  set(newValue) {
    const [first, ...rest] = newValue.split('');
    firstName.value = first;
    lastName.value = rest.join('');
  },
});

fullName.value = '李四';
console.log(firstName.value); // "李"
console.log(lastName.value); // "四"
```

## watch 和 watchEffect

### watch

`watch` 显式指定要监听的数据源，在数据变化时执行回调。

```typescript
import { ref, reactive, watch } from '@lytjs/core';

// 监听 ref
const count = ref(0);
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} → ${newVal}`);
});

// 监听 getter 函数
const state = reactive({ name: '张三' });
watch(
  () => state.name,
  (newVal, oldVal) => {
    console.log(`name: ${oldVal} → ${newVal}`);
  },
);

// 监听多个数据源
const firstName = ref('张');
const lastName = ref('三');
watch([firstName, lastName], ([newFirst, newLast], [oldFirst, oldLast]) => {
  console.log('姓或名发生变化');
});

// 配置选项
watch(
  () => state.name,
  (newVal) => {
    console.log('name 变化:', newVal);
  },
  {
    immediate: true, // 立即执行一次
    deep: true, // 深层监听
    flush: 'post', // DOM 更新后执行
  },
);
```

### watchEffect

`watchEffect` 立即执行回调，自动追踪其中使用的响应式依赖。

```typescript
import { ref, watchEffect } from '@lytjs/core';

const count = ref(0);
const name = ref('张三');

watchEffect(() => {
  console.log(`count: ${count.value}, name: ${name.value}`);
});
// 立即输出: count: 0, name: 张三

count.value++; // 输出: count: 1, name: 张三
```

### watchPostEffect 和 watchSyncEffect

```typescript
import { watchPostEffect, watchSyncEffect } from '@lytjs/core';

// DOM 更新后执行（默认 flush: 'post'）
watchPostEffect(() => {
  // 可以安全地访问更新后的 DOM
});

// 同步执行（在响应式数据变化时立即触发）
watchSyncEffect(() => {
  console.log('同步执行');
});
```

## 生命周期钩子注册

在 `setup` 中使用 `on*` 函数注册生命周期钩子：

```typescript
import {
  onMounted,
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount,
  onUpdated,
  onBeforeUpdate,
  ref,
} from '@lytjs/core';

export default {
  setup() {
    const data = ref(null);
    const timer = ref(null);

    onBeforeMount(() => {
      console.log('组件即将挂载');
    });

    onMounted(async () => {
      console.log('组件已挂载');
      data.value = await fetchData();

      // 设置定时器
      timer.value = setInterval(() => {
        data.value = await fetchData();
      }, 30000);
    });

    onBeforeUpdate(() => {
      console.log('DOM 即将更新');
    });

    onUpdated(() => {
      console.log('DOM 已更新');
    });

    onBeforeUnmount(() => {
      console.log('组件即将卸载');
    });

    onUnmounted(() => {
      console.log('组件已卸载');
      clearInterval(timer.value);
    });

    return { data };
  },
};

async function fetchData() {
  // 获取数据...
}
```

## provide / inject

`provide` 和 `inject` 实现跨层级组件的依赖注入，避免逐层传递 props（prop drilling）。

### 基本用法

```typescript
import { provide, inject, ref } from '@lytjs/core';

// 祖先组件
const ParentComponent = {
  setup() {
    const theme = ref('dark');
    const toggleTheme = () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
    };

    // 提供数据
    provide('theme', theme);
    provide('toggleTheme', toggleTheme);

    return { theme, toggleTheme };
  },
};

// 后代组件
const ChildComponent = {
  setup() {
    // 注入数据
    const theme = inject('theme');
    const toggleTheme = inject('toggleTheme');

    return { theme, toggleTheme };
  },
};
```

### 默认值和类型

```typescript
// 提供默认值
const theme = inject('theme', 'light');

// 使用工厂函数作为默认值
const config = inject('config', () => ({
  apiUrl: '/api',
  timeout: 5000,
}));
```

### 应用级 provide

在应用级别提供全局依赖：

```typescript
import { createApp } from '@lytjs/core';

const app = createApp(App);

app.provide('globalConfig', {
  apiUrl: 'https://api.example.com',
  version: '1.0.0',
});

app.mount('#app');
```

## useSlots / useAttrs / useModel

### useSlots

在 `setup` 中访问插槽内容。

```typescript
import { useSlots } from '@lytjs/core';

const MyComponent = {
  setup() {
    const slots = useSlots();

    // 检查默认插槽是否存在
    const hasDefaultSlot = !!slots.default;

    return { hasDefaultSlot };
  },
};
```

### useAttrs

在 `setup` 中访问透传属性。

```typescript
import { useAttrs } from '@lytjs/core';

const MyButton = {
  setup() {
    const attrs = useAttrs();

    console.log(attrs.class); // 父组件传递的 class
    console.log(attrs.style); // 父组件传递的 style

    return {};
  },
};
```

### useModel

简化 `v-model` 的实现，自动处理 prop 和 emit。

```typescript
import { useModel } from '@lytjs/core';

const TextInput = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props) {
    // 等价于手动创建 computed
    const value = useModel(props, 'modelValue');

    // value 是可写的 ref
    // 读取 value 等同于读取 props.modelValue
    // 写入 value 等同于 emit('update:modelValue', newValue)

    return { value };
  },
};
```

支持命名 `v-model`：

```typescript
const UserForm = {
  props: ['name', 'email'],
  emits: ['update:name', 'update:email'],
  setup(props) {
    const name = useModel(props, 'name');
    const email = useModel(props, 'email');

    return { name, email };
  },
};
```

## 完整示例

```typescript
import {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  onMounted,
  onUnmounted,
  provide,
  inject,
} from '@lytjs/core';

const TodoApp = {
  setup() {
    // 响应式状态
    const todos = ref([]);
    const newTodo = ref('');
    const filter = ref('all');

    // 计算属性
    const filteredTodos = computed(() => {
      switch (filter.value) {
        case 'active':
          return todos.value.filter((t) => !t.done);
        case 'done':
          return todos.value.filter((t) => t.done);
        default:
          return todos.value;
      }
    });

    const remaining = computed(() => todos.value.filter((t) => !t.done).length);

    // 方法
    const addTodo = () => {
      if (!newTodo.value.trim()) return;
      todos.value.push({ id: Date.now(), text: newTodo.value, done: false });
      newTodo.value = '';
    };

    const toggleTodo = (todo) => {
      todo.done = !todo.done;
    };

    const removeTodo = (id) => {
      todos.value = todos.value.filter((t) => t.id !== id);
    };

    // 监听器
    watch(
      todos,
      (newTodos) => {
        localStorage.setItem('todos', JSON.stringify(newTodos));
      },
      { deep: true },
    );

    // 副作用
    watchEffect(() => {
      document.title = `${remaining.value} 项待办`;
    });

    // 依赖注入
    provide('todoCount', todos);

    // 生命周期
    onMounted(() => {
      const saved = localStorage.getItem('todos');
      if (saved) todos.value = JSON.parse(saved);
    });

    return {
      todos: filteredTodos,
      newTodo,
      filter,
      remaining,
      addTodo,
      toggleTodo,
      removeTodo,
    };
  },
};
```
