# Lyt.js API 快速参考

## 响应式 API (@lytjs/reactivity)

### ref

创建响应式引用：

```javascript
import { ref } from '@lytjs/reactivity';

const count = ref(0);
console.log(count.value); // 0
count.value++;
```

### reactive

创建响应式对象：

```javascript
import { reactive } from '@lytjs/reactivity';

const state = reactive({ name: 'Lyt' });
state.name = 'Lyt.js';
```

### computed

创建计算属性：

```javascript
import { computed, ref } from '@lytjs/reactivity';

const count = ref(0);
const double = computed(() => count.value * 2);
```

### watch

监听数据变化：

```javascript
import { watch, ref } from '@lytjs/reactivity';

const count = ref(0);
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} -> ${newVal}`);
});
```

## 组件 API (@lytjs/component)

### defineComponent

定义组件：

```javascript
import { defineComponent } from '@lytjs/component';

const MyComponent = defineComponent({
  name: 'MyComponent',
  props: {
    title: String
  },
  emits: ['click'],
  setup(props, { emit }) {
    return {};
  },
  template: '<div>{{ title }}</div>'
});
```

### 生命周期钩子

```javascript
import { onMounted, onUnmounted, onUpdated } from '@lytjs/component';

onMounted(() => console.log('mounted'));
onUpdated(() => console.log('updated'));
onUnmounted(() => console.log('unmounted'));
```

## 核心 API (@lytjs/core)

### createApp

创建应用：

```javascript
import { createApp } from '@lytjs/core';

const app = createApp({
  template: '<div>{{ message }}</div>',
  state: { message: 'Hello' }
});

app.mount('#app');
```

### defineProps / defineEmits

在 script setup 中定义 props 和 emits：

```javascript
import { defineProps, defineEmits } from '@lytjs/core';

const props = defineProps({
  title: String
});

const emit = defineEmits(['click']);
```

## 路由 API (@lytjs/router)

### createRouter

创建路由：

```javascript
import { createRouter } from '@lytjs/router';

const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
});

app.use(router);
```

### useRouter / useRoute

在组件中使用路由：

```javascript
import { useRouter, useRoute } from '@lytjs/router';

const router = useRouter();
const route = useRoute();

router.push('/about');
console.log(route.path);
```

## 状态管理 API (@lytjs/store)

### createStore

创建 Store：

```javascript
import { createStore } from '@lytjs/store';

const counter = createStore('counter', {
  state: { count: 0 },
  getters: {
    double: state => state.count * 2
  },
  actions: {
    increment(state) {
      state.count++;
    }
  }
});
```

### useStore

在组件中使用 Store：

```javascript
import { useStore } from '@lytjs/store';

const counter = useStore('counter');
counter.increment();
```

## 模板语法

### 插值

```html
<span>{{ message }}</span>
```

### 属性绑定

```html
<div :class="className" :id="id"></div>
<img :src="imageUrl">
```

### 事件绑定

```html
<button @click="handleClick"></button>
```

### 条件渲染

```html
<div if="condition">显示</div>
<div else-if="otherCondition">其他</div>
<div else">默认</div>
```

### 列表渲染

```html
<ul>
  <li each="item in items" :key="item.id">
    {{ item.name }}
  </li>
</ul>
```

### 双向绑定

```html
<input model="username">
<textarea model="description"></textarea>
```
