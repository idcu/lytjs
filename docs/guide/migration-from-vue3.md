# 从 Vue 3 迁移

Lyt.js 的 API 高度兼容 Vue 3，迁移成本低。本指南帮助你快速从 Vue 3 迁移到 Lyt.js。

## API 兼容性对照表

| Vue 3 API | Lyt.js | 兼容性 |
|-----------|--------|--------|
| `createApp()` | `createApp()` | ✅ 完全兼容 |
| `defineComponent()` | `defineComponent()` | ✅ 完全兼容 |
| `ref()` | `ref()` | ✅ 完全兼容 |
| `reactive()` | `reactive()` | ✅ 完全兼容 |
| `computed()` | `computed()` | ✅ 完全兼容 |
| `watch()` | `watch()` | ✅ 完全兼容 |
| `watchEffect()` | `watchEffect()` | ✅ 完全兼容 |
| `onMounted()` | `onMounted()` | ✅ 完全兼容 |
| `onBeforeUnmount()` | `onBeforeUnmount()` | ✅ 完全兼容 |
| `provide()` / `inject()` | `provide()` / `inject()` | ✅ 完全兼容 |
| `nextTick()` | `nextTick()` | ✅ 完全兼容 |
| `h()` | `h()` | ✅ 完全兼容 |
| `v-if` | `if` | ⚠️ 去掉 v- 前缀 |
| `v-for` | `each` | ⚠️ 去掉 v- 前缀 |
| `v-model` | `model` | ⚠️ 去掉 v- 前缀 |
| `v-show` | `show` | ⚠️ 去掉 v- 前缀 |
| `v-on` | `on:` | ⚠️ 语法变更 |
| `v-bind` | `:` | ✅ 语法一致 |
| `v-slot` | `slot` | ⚠️ 语法变更 |
| `v-html` | `html` | ⚠️ 去掉 v- 前缀 |
| `v-text` | `text` | ⚠️ 去掉 v- 前缀 |
| `Vue Router` | `@lytjs/router` | ⚠️ API 类似 |
| `Pinia` | `@lytjs/store` | ⚠️ API 类似 |
| `<Transition>` | `<Transition>` | ✅ 完全兼容 |
| `<KeepAlive>` | `<KeepAlive>` | ✅ 完全兼容 |
| `<Suspense>` | `<Suspense>` | ✅ 完全兼容 |

## 迁移步骤

### 1. 安装 Lyt.js

```bash
npm install @lytjs/core @lytjs/reactivity @lytjs/component
# 或
npm install @lytjs/lytjs
```

### 2. 替换导入

```javascript
// Vue 3
import { createApp, ref, reactive } from 'vue'

// Lyt.js
import { createApp } from '@lytjs/core'
import { ref, reactive } from '@lytjs/reactivity'
```

### 3. 修改模板语法

```html
<!-- Vue 3 -->
<template>
  <div v-if="show">
    <span v-for="item in items" :key="item.id">{{ item.name }}</span>
    <input v-model="text" />
    <button v-on:click="handleClick">Click</button>
  </div>
</template>

<!-- Lyt.js -->
<template>
  <div if="show">
    <span each="item in items" :key="item.id">{{ item.name }}</span>
    <input model="text" />
    <button on:click="handleClick">Click</button>
  </div>
</template>
```

### 4. 替换路由

```javascript
// Vue Router
import { createRouter, createWebHistory } from 'vue-router'

// Lyt.js
import { createRouter, createWebHistory } from '@lytjs/router'
```

### 5. 替换状态管理

```javascript
// Pinia
import { defineStore } from 'pinia'
const useCounter = defineStore('counter', { state: () => ({ count: 0 }) })

// Lyt.js Store
import { createStore } from '@lytjs/store'
const counter = createStore('counter', { state: { count: 0 } })
```

## 不支持的 Vue 3 特性

以下 Vue 3 特性在 Lyt.js 中暂不支持：

- `<Teleport>`（计划支持）
- `$refs`（使用 ref 替代）
- `$emit`（使用 emit 函数替代）
- 自定义指令（计划支持）
- `<script setup>` 语法糖（使用 setup() 函数）
- CSS Modules
- `defineProps` / `defineEmits` 编译器宏

## 获取帮助

如果在迁移过程中遇到问题，请通过 [Gitee Issues](https://gitee.com/lytjs/lytjs/issues) 提交反馈。
