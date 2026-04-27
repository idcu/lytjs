# Vue 3 → Lyt.js 迁移指南

本指南将帮助你将 Vue 3 项目迁移到 Lyt.js，享受零运行时依赖和更轻量的体积。

## 目录

- [为什么迁移](#为什么迁移)
- [快速开始](#快速开始)
- [API 对照表](#api-对照表)
- [模板语法转换](#模板语法转换)
- [组件迁移](#组件迁移)
- [工具和辅助函数](#工具和辅助函数)
- [常见问题](#常见问题)

## 为什么迁移

### 优势对比

| 特性 | Vue 3 | Lyt.js |
|------|------|------|
| **核心体积** | ~34KB (gzip) | ~34KB (gzip) - 但是完整框架 |
| **运行时依赖** | 有（Vue 核心 + 其他） | 0 |
| **Vue 3 API 兼容** | - | ✅ 完全兼容 |
| **模板语法** | `v-` 前缀 | 无前缀，更简洁 |
| **TypeScript 支持** | ✅ 优秀 | ✅ 优秀 |
| **学习曲线** | 适中 | 非常平滑（Vue 用户） |

### 性能优势

- **更轻的体积** - 核心包更精简，按需使用
- **零运行时依赖** - 无第三方库，代码完全可控
- **编译时优化** - 更多优化在编译时完成

## 快速开始

### 1. 安装依赖

```bash
# 卸载 Vue 相关依赖
npm uninstall vue vue-router vuex

# 安装 Lyt.js 核心包
npm install @lytjs/core @lytjs/reactivity

# 可选包
npm install @lytjs/router @lytjs/store @lytjs/compat
```

### 2. 使用兼容层（推荐）

对于渐进式迁移，可以先使用 `@lytjs/compat` 兼容层：

```javascript
// main.js
import { createApp } from '@lytjs/compat'; // 替换 'vue'
import App from './App.vue';

createApp(App).mount('#app');
```

### 3. 使用 vue-to-lyt 工具转换

```bash
# 转换单个文件
npx vue-to-lyt src/components/MyComponent.vue

# 转换整个目录
npx vue-to-lyt src/
```

## API 对照表

### 响应式系统

| Vue 3 API | Lyt.js API | 状态 |
|----------|----------|------|
| `ref()` | `@lytjs/reactivity/ref()` | ✅ 完全兼容 |
| `reactive()` | `@lytjs/reactivity/reactive()` | ✅ 完全兼容 |
| `computed()` | `@lytjs/reactivity/computed()` | ✅ 完全兼容 |
| `watch()` | `@lytjs/reactivity/watch()` | ✅ 完全兼容 |
| `watchEffect()` | `@lytjs/reactivity/watchEffect()` | ✅ 完全兼容 |
| `effect()` | `@lytjs/reactivity/effect()` | ✅ 完全兼容 |
| `isRef()` | `@lytjs/reactivity/isRef()` | ✅ 完全兼容 |
| `toRef()` | `@lytjs/reactivity/toRef()` | ✅ 完全兼容 |
| `toRefs()` | `@lytjs/reactivity/toRefs()` | ✅ 完全兼容 |
| `unref()` | `@lytjs/reactivity/unref()` | ✅ 完全兼容 |
| `nextTick()` | `@lytjs/reactivity/nextTick()` | ✅ 完全兼容 |

### 组件和应用

| Vue 3 API | Lyt.js API | 状态 |
|----------|----------|------|
| `createApp()` | `@lytjs/core/createApp()` | ✅ 完全兼容 |
| `defineComponent()` | `@lytjs/core/defineComponent()` | ✅ 完全兼容 |
| `defineAsyncComponent()` | `@lytjs/core/defineAsyncComponent()` | ✅ 完全兼容 |
| `h()` | `@lytjs/core/h()` | ✅ 完全兼容 |
| `Teleport` | `@lytjs/core/Teleport` | ✅ 完全兼容 |
| `Suspense` | `@lytjs/core/Suspense` | ✅ 完全兼容 |
| `Transition` | `@lytjs/core/Transition` | ✅ 完全兼容 |
| `TransitionGroup` | `@lytjs/core/TransitionGroup` | ✅ 完全兼容 |
| `KeepAlive` | `@lytjs/core/KeepAlive` | ✅ 完全兼容 |

### 生命周期钩子

| Vue 3 Hook | Lyt.js Hook | 状态 |
|----------|----------|------|
| `onBeforeMount()` | `@lytjs/core/onBeforeMount()` | ✅ 完全兼容 |
| `onMounted()` | `@lytjs/core/onMounted()` | ✅ 完全兼容 |
| `onBeforeUpdate()` | `@lytjs/core/onBeforeUpdate()` | ✅ 完全兼容 |
| `onUpdated()` | `@lytjs/core/onUpdated()` | ✅ 完全兼容 |
| `onBeforeUnmount()` | `@lytjs/core/onBeforeUnmount()` | ✅ 完全兼容 |
| `onUnmounted()` | `@lytjs/core/onUnmounted()` | ✅ 完全兼容 |
| `onActivated()` | `@lytjs/core/onActivated()` | ✅ 完全兼容 |
| `onDeactivated()` | `@lytjs/core/onDeactivated()` | ✅ 完全兼容 |
| `onErrorCaptured()` | `@lytjs/core/onErrorCaptured()` | ✅ 完全兼容 |
| `onRenderTracked()` | `@lytjs/core/onRenderTracked()` | ⚠️ 占位符 |
| `onRenderTriggered()` | `@lytjs/core/onRenderTriggered()` | ⚠️ 占位符 |
| `onServerPrefetch()` | `@lytjs/core/onServerPrefetch()` | ⚠️ 占位符 |

## 模板语法转换

### 条件渲染

```vue
<!-- Vue 3 -->
<div v-if="show">显示内容</div>
<div v-else-if="loading">加载中...</div>
<div v-else>其他内容</div>

<!-- Lyt.js -->
<div if="show">显示内容</div>
<div else-if="loading">加载中...</div>
<div else>其他内容</div>
```

### 列表渲染

```vue
<!-- Vue 3 -->
<ul>
  <li v-for="item in items" :key="item.id">
    {{ item.text }}
  </li>
</ul>

<!-- Lyt.js -->
<ul>
  <li each="item in items" :key="item.id">
    {{ item.text }}
  </li>
</ul>
```

### 事件绑定

```vue
<!-- Vue 3 和 Lyt.js 相同 -->
<button v-on:click="handleClick">点击</button>
<button @click="handleClick">点击</button>
<button @click.prevent="handleClick">阻止默认</button>
```

### 属性绑定

```vue
<!-- Vue 3 -->
<div v-bind:title="title">鼠标悬停</div>
<div :title="title">鼠标悬停</div>

<!-- Lyt.js -->
<div :title="title">鼠标悬停</div>
```

### 双向绑定

```vue
<!-- Vue 3 和 Lyt.js 相同 -->
<input v-model="text" />
```

### class 和 style 绑定

```vue
<!-- Vue 3 和 Lyt.js 相同 -->
<div :class="{ active: isActive, 'text-red': hasError }">
  动态 class
</div>
<div :style="{ color: textColor, fontSize: textSize + 'px' }">
  动态 style
</div>
```

## 组件迁移

### 完整示例对比

#### Vue 3 组件

```vue
<template>
  <div class="counter">
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubledCount }}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  title: String,
  initialCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:count']);

const count = ref(props.initialCount);
const doubledCount = computed(() => count.value * 2);

function increment() {
  count.value++;
  emit('update:count', count.value);
}

function decrement() {
  count.value--;
  emit('update:count', count.value);
}

onMounted(() => {
  console.log('Component mounted');
});
</script>
```

#### Lyt.js 组件

```vue
<template>
  <div class="counter">
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubledCount }}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from '@lytjs/reactivity';
import { defineComponent } from '@lytjs/core';

const props = defineProps({
  title: String,
  initialCount: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['update:count']);

const count = ref(props.initialCount);
const doubledCount = computed(() => count.value * 2);

function increment() {
  count.value++;
  emit('update:count', count.value);
}

function decrement() {
  count.value--;
  emit('update:count', count.value);
}

onMounted(() => {
  console.log('Component mounted');
});
</script>
```

## 工具和辅助函数

### 使用 vue-to-lyt CLI

```bash
# 全局安装
npm install -g @lytjs/cli

# 转换文件
vue-to-lyt src/components/MyComponent.vue

# 转换目录
vue-to-lyt src/components/

# 指定输出目录
vue-to-lyt src/components/ -o src/lytjs-components/

# 仅列出需要转换的文件
vue-to-lyt src/components/ --dry-run
```

### 批量迁移脚本

创建 `migrate.js` 脚本进行批量迁移：

```javascript
import { convertVueSfcToLyt } from '@lytjs/compat';
import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('src');

async function migrateDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      await migrateDirectory(fullPath);
    } else if (file.endsWith('.vue')) {
      console.log(`Converting: ${file}`);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const converted = convertVueSfcToLyt(content);
      fs.writeFileSync(fullPath, converted);
      console.log(`Converted: ${file}`);
    }
  }
}

console.log('Starting migration...');
await migrateDirectory(srcDir);
console.log('Migration complete!');
```

### 检查转换结果

```bash
# 检查是否还有未转换的 v-if 等指令
grep -r 'v-if' src/components/
grep -r 'v-for' src/components/
grep -r 'from "vue"' src/

# 检查是否还有从 'vue' 的导入
grep -r "from 'vue'" src/
```

## 路由迁移

### Vue Router → @lytjs/router

```javascript
// Vue Router 配置
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
});

// Lyt.js Router 配置（相同 API）
import { createRouter, createWebHistory } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
});
```

### 使用路由

```vue
<script setup>
import { useRouter, useRoute } from '@lytjs/router';

const router = useRouter();
const route = useRoute();

function goToAbout() {
  router.push('/about');
}
</script>

<template>
  <div>
    <router-link to="/">Home</router-link>
    <router-link to="/about">About</router-link>
    <router-view />
  </div>
</template>
```

## 状态管理迁移

### Vuex / Pinia → @lytjs/store

```javascript
// Pinia store
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    doubledCount: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++;
    }
  }
});

// Lyt.js Store（相同 API）
import { defineStore } from '@lytjs/store';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    doubledCount: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++;
    }
  }
});
```

### 组合式 Store

```javascript
import { defineStore } from '@lytjs/store';
import { ref, computed } from '@lytjs/reactivity';

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0);
  const doubledCount = computed(() => count.value * 2);

  function increment() {
    count.value++;
  }

  return { count, doubledCount, increment };
});
```

## 常见问题

### Q: 迁移成本高吗？

A: 非常低！Lyt.js 完全兼容 Vue 3 API，主要工作是：
1. 修改导入路径（vue → @lytjs/core）
2. 转换模板语法（v-if → if, v-for → each）

### Q: 第三方 Vue 组件库怎么办？

A:
- 短期：使用 @lytjs/compat 兼容层，保持 Vue 组件正常工作
- 长期：寻找 Lyt.js 版本，或自行迁移简单组件

### Q: 性能提升明显吗？

A: 取决于项目：
- 小型项目：主要是体积减小
- 大型项目：通过编译时优化获得显著性能提升
- 所有项目：零运行时依赖意味着更少的维护成本

### Q: 如何验证迁移是否成功？

A:
1. 运行测试套件
2. 功能回归测试
3. 性能对比测试
4. 打包体积对比

### Q: 可以部分迁移吗？

A: 完全可以！使用 micro-frontend 或者逐步替换组件。

## 迁移检查清单

- [ ] 更新 package.json 依赖
- [ ] 使用 @lytjs/compat 兼容层
- [ ] 运行 vue-to-lyt 转换工具
- [ ] 检查并修复导入路径
- [ ] 测试响应式功能
- [ ] 测试组件交互
- [ ] 测试路由功能
- [ ] 测试状态管理
- [ ] 运行完整测试套件
- [ ] 性能对比测试
- [ ] 更新文档
- [ ] 移除 Vue 相关依赖

## 更多资源

- [Lyt.js 官方文档](./lytjs_发展建议与开发文档_v4.2.0.md)
- [API 参考](./lytjs_发展建议与开发文档_v4.2.0.md)
- [Playground](./playground/README.md)
- [GitHub 仓库](https://github.com/lytjs/lytjs)
- [Gitee 仓库](https://gitee.com/lytjs/lytjs)

## 获得帮助

如果在迁移过程中遇到问题：
- 提交 Issue 到 GitHub/Gitee
- 查看示例和文档
- 参考核心包的 README.md

## License

MIT
