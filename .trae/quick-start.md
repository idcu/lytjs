# Lyt.js 快速入门

## 安装

### 使用 CLI 创建项目

```bash
npx @lytjs/cli create my-app
cd my-app
npm install
npm run dev
```

### 直接使用 CDN

```html
<!DOCTYPE html>
<html>
<head>
  <title>Lyt.js</title>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    import { createApp } from '@lytjs/core';

    const app = createApp({
      template: '<div>{{ message }}</div>',
      state: { message: 'Hello Lyt.js!' }
    });

    app.mount('#app');
  </script>
</body>
</html>
```

## 第一个组件

```javascript
// Counter.lyt
<template>
  <div class="counter">
    <p>Count: {{ count }}</p>
    <p>Double: {{ double }}</p>
    <button @click="increment">+</button>
    <button @click="decrement">-</button>
  </div>
</template>

<script setup>
import { ref, computed } from '@lytjs/reactivity';

const count = ref(0);
const double = computed(() => count.value * 2);

function increment() {
  count.value++;
}

function decrement() {
  count.value--;
}
</script>

<style scoped>
.counter {
  padding: 20px;
}

button {
  margin: 0 5px;
  padding: 8px 16px;
}
</style>
```

## 添加路由

```javascript
// main.js
import { createApp } from '@lytjs/core';
import { createRouter } from '@lytjs/router';
import Home from './Home.lyt';
import About from './About.lyt';

const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
});

const app = createApp({
  template: `
    <div>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <router-view></router-view>
    </div>
  `
});

app.use(router);
app.mount('#app');
```

## 添加状态管理

```javascript
// stores/counter.js
import { createStore } from '@lytjs/store';

export const counter = createStore('counter', {
  state: { count: 0 },
  getters: {
    double: state => state.count * 2
  },
  actions: {
    increment(state) {
      state.count++;
    },
    decrement(state) {
      state.count--;
    }
  }
});
```

```javascript
// 在组件中使用
<script setup>
import { useStore } from '@lytjs/store';

const counter = useStore('counter');
</script>

<template>
  <div>
    <p>{{ counter.count }}</p>
    <button @click="counter.increment">+</button>
  </div>
</template>
```

## 下一步

1. 查看 [API 快速参考](./api-reference.md)
2. 阅读 [最佳实践](./best-practices.md)
3. 了解如何使用 [AI 辅助开发](./ai-integration-examples.md)
