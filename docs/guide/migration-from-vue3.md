# 从 Vue 3 迁移到 Lyt.js

Lyt.js 的 API 高度兼容 Vue 3，配合 `@lytjs/compat` 兼容层，迁移成本低。本指南帮助你快速从 Vue 3 迁移到 Lyt.js。

## 概述

### 为什么要从 Vue 3 迁移到 Lyt.js？

- **更轻量**：Lyt.js 核心体积更小，零外部依赖
- **双模式响应式**：同时支持 Proxy 和 Signal 两种响应式模式
- **更灵活**：提供更多自定义和扩展能力
- **兼容性好**：通过 `@lytjs/compat` 兼容层，大部分 Vue 3 代码可以无缝迁移

### 迁移策略

1. **渐进式迁移**：先安装 `@lytjs/compat`，逐步替换导入
2. **自动化工具**：使用 `vue-to-lyt` CLI 工具自动转换代码
3. **手动调整**：处理不兼容的部分

---

## API 兼容性对照表

### 响应式 API

| Vue 3 API | Lyt.js (@lytjs/compat) | 兼容性 | 说明 |
|-----------|------------------------|--------|------|
| `ref()` | `ref()` | 完全兼容 | 直接使用 |
| `reactive()` | `reactive()` | 完全兼容 | 直接使用 |
| `computed()` | `computed()` | 完全兼容 | 直接使用 |
| `watch()` | `watch()` | 完全兼容 | 直接使用 |
| `watchEffect()` | `watchEffect()` | 完全兼容 | 直接使用 |
| `watchPostEffect()` | `watchPostEffect()` | 完全兼容 | 直接使用 |
| `watchSyncEffect()` | `watchSyncEffect()` | 完全兼容 | 直接使用 |
| `shallowRef()` | `shallowRef()` | 完全兼容 | 直接使用 |
| `shallowReactive()` | `shallowReactive()` | 完全兼容 | 直接使用 |
| `triggerRef()` | `triggerRef()` | 完全兼容 | 直接使用 |
| `readonly()` | `readonly()` | 完全兼容 | 直接使用 |
| `isRef()` | `isRef()` | 完全兼容 | 直接使用 |
| `isReactive()` | `isReactive()` | 完全兼容 | 直接使用 |
| `isReadonly()` | `isReadonly()` | 完全兼容 | 直接使用 |
| `isProxy()` | `isProxy()` | 完全兼容 | 直接使用 |
| `toRaw()` | `toRaw()` | 完全兼容 | 直接使用 |
| `markRaw()` | `markRaw()` | 完全兼容 | 直接使用 |
| `toRef()` | `toRef()` | 完全兼容 | 直接使用 |
| `toRefs()` | `toRefs()` | 完全兼容 | 直接使用 |
| `unref()` | `unref()` | 完全兼容 | 直接使用 |
| `proxyRefs()` | `proxyRefs()` | 占位 | 使用 `reactive()` 或 `toRefs()` 替代 |
| `effect()` | `effect()` | 完全兼容 | 直接使用 |
| `nextTick()` | `nextTick()` | 完全兼容 | 直接使用 |

### 生命周期钩子

| Vue 3 API | Lyt.js (@lytjs/compat) | 兼容性 | 说明 |
|-----------|------------------------|--------|------|
| `onMounted()` | `onMounted()` | 完全兼容 | 直接使用 |
| `onUpdated()` | `onUpdated()` | 完全兼容 | 直接使用 |
| `onUnmounted()` | `onUnmounted()` | 完全兼容 | 直接使用 |
| `onBeforeMount()` | `onBeforeMount()` | 完全兼容 | 直接使用 |
| `onBeforeUpdate()` | `onBeforeUpdate()` | 完全兼容 | 直接使用 |
| `onBeforeUnmount()` | `onBeforeUnmount()` | 完全兼容 | 直接使用 |
| `onErrorCaptured()` | `onErrorCaptured()` | 占位 | 仅打印警告 |
| `onRenderTracked()` | `onRenderTracked()` | 占位 | 仅打印警告 |
| `onRenderTriggered()` | `onRenderTriggered()` | 占位 | 仅打印警告 |
| `onActivated()` | `onActivated()` | 占位 | 仅打印警告 |
| `onDeactivated()` | `onDeactivated()` | 占位 | 仅打印警告 |
| `onServerPrefetch()` | `onServerPrefetch()` | 占位 | 仅打印警告 |

### 依赖注入

| Vue 3 API | Lyt.js (@lytjs/compat) | 兼容性 | 说明 |
|-----------|------------------------|--------|------|
| `provide()` | `provide()` | 完全兼容 | 直接使用 |
| `inject()` | `inject()` | 完全兼容 | 直接使用 |

### 组件 API

| Vue 3 API | Lyt.js (@lytjs/compat) | 兼容性 | 说明 |
|-----------|------------------------|--------|------|
| `createApp()` | `createApp()` | 完全兼容 | 直接使用 |
| `defineComponent()` | `defineComponent()` | 完全兼容 | 直接使用 |
| `defineAsyncComponent()` | `defineAsyncComponent()` | 完全兼容 | 直接使用 |
| `h()` | `h()` | 完全兼容 | 直接使用 |
| `Fragment` | `Fragment` | 完全兼容 | 直接使用 |
| `getCurrentInstance()` | `getCurrentInstance()` | 完全兼容 | 直接使用 |
| `defineProps()` | `defineProps()` | 占位 | 编译器宏，使用 props 选项 |
| `defineEmits()` | `defineEmits()` | 占位 | 编译器宏，使用 emits 选项 |
| `withDefaults()` | `withDefaults()` | 占位 | 编译器宏，使用 props default |
| `defineExpose()` | `defineExpose()` | 占位 | setup 返回值自动暴露 |
| `useSlots()` | `useSlots()` | 占位 | 通过 setup 上下文访问 |
| `useAttrs()` | `useAttrs()` | 占位 | 通过 setup 上下文访问 |
| `useTemplateRef()` | `useTemplateRef()` | 占位 | 使用 ref() 替代 |

### 内置组件

| Vue 3 组件 | Lyt.js (@lytjs/compat) | 兼容性 | 说明 |
|-----------|------------------------|--------|------|
| `<KeepAlive>` | `<KeepAlive>` | 完全兼容 | 从 @lytjs/compat 导入 |
| `<Teleport>` | `<Teleport>` | 占位 | 基本导出，功能有限 |
| `<Transition>` | `<Transition>` | 完全兼容 | 从 @lytjs/compat 导入 |
| `<TransitionGroup>` | `<TransitionGroup>` | 完全兼容 | 从 @lytjs/compat 导入 |
| `<Suspense>` | `<Suspense>` | 完全兼容 | 从 @lytjs/compat 导入 |

### 模板指令

| Vue 3 指令 | Lyt.js 指令 | 兼容性 | 说明 |
|-----------|------------|--------|------|
| `v-if` | `if` | 语法变更 | 去掉 `v-` 前缀 |
| `v-else-if` | `else-if` | 语法变更 | 去掉 `v-` 前缀 |
| `v-else` | `else` | 语法变更 | 去掉 `v-` 前缀 |
| `v-for` | `v-each` | 语法变更 | `v-for` 变为 `v-each` |
| `v-model` | `model` | 语法变更 | 去掉 `v-` 前缀 |
| `v-model.trim` | `model.trim` | 语法变更 | 修饰符语法一致 |
| `v-model.number` | `model.number` | 语法变更 | 修饰符语法一致 |
| `v-model.lazy` | `model.lazy` | 语法变更 | 修饰符语法一致 |
| `v-show` | `show` | 语法变更 | 去掉 `v-` 前缀 |
| `v-html` | `html` | 语法变更 | 去掉 `v-` 前缀 |
| `v-text` | `text` | 语法变更 | 去掉 `v-` 前缀 |
| `v-on:` | `on:` | 语法变更 | `v-on:` 变为 `on:` |
| `@click` | `@click` | 完全兼容 | 简写语法一致 |
| `v-bind:` | `:` | 完全兼容 | 推荐使用简写 |
| `v-slot:` | `slot:` | 语法变更 | `v-slot:` 变为 `slot:` |
| `#name` | `#name` | 完全兼容 | 简写语法一致 |
| `v-once` | `once` | 语法变更 | 去掉 `v-` 前缀 |
| `v-pre` | `pre` | 语法变更 | 去掉 `v-` 前缀 |
| `v-cloak` | `cloak` | 语法变更 | 去掉 `v-` 前缀 |
| `v-memo` | - | 不支持 | 使用 computed 替代 |

### 生态系统

| Vue 3 生态 | Lyt.js 替代 | 兼容性 | 说明 |
|-----------|------------|--------|------|
| Vue Router | `@lytjs/router` | API 类似 | 导入路径不同 |
| Pinia | `@lytjs/store` | API 类似 | 需要调整 API 调用 |
| Vuex | `@lytjs/store` | API 不同 | 需要重写状态管理 |

---

## 迁移步骤

### 1. 安装 @lytjs/compat

```bash
npm install @lytjs/compat
```

`@lytjs/compat` 会自动安装以下依赖：
- `@lytjs/core`
- `@lytjs/reactivity`
- `@lytjs/component`

### 2. 修改 import 语句

```javascript
// Vue 3
import { createApp, ref, reactive, computed, watch, onMounted } from 'vue'

// Lyt.js（使用 compat 兼容层）
import { createApp, ref, reactive, computed, watch, onMounted } from '@lytjs/compat'
```

也可以直接使用 Lyt.js 原生包：

```javascript
import { createApp, h, Fragment } from '@lytjs/core'
import { ref, reactive, computed, watch, nextTick } from '@lytjs/reactivity'
import { defineComponent, onMounted, onUnmounted, provide, inject } from '@lytjs/component'
```

### 3. SFC 语法调整

#### 模板语法

```html
<!-- Vue 3 -->
<template>
  <div v-if="show">
    <span v-for="item in items" :key="item.id">{{ item.name }}</span>
    <input v-model="text" />
    <button v-on:click="handleClick">Click</button>
    <button @click.prevent="handleSubmit">Submit</button>
    <div v-show="isVisible">Content</div>
    <div v-html="rawHtml"></div>
    <div v-once>Static</div>
  </div>
</template>

<!-- Lyt.js -->
<template>
  <div if="show">
    <span v-each="item in items" key="item.id">{{ item.name }}</span>
    <input model="text" />
    <button on:click="handleClick">Click</button>
    <button @click.prevent="handleSubmit">Submit</button>
    <div show="isVisible">Content</div>
    <div html="rawHtml"></div>
    <div once>Static</div>
  </div>
</template>
```

#### 脚本语法

```html
<!-- Vue 3 -->
<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { defineStore } from 'pinia'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

<!-- Lyt.js -->
<script setup>
import { ref, computed } from '@lytjs/compat'
import { useRouter } from '@lytjs/router'
import { createStore } from '@lytjs/store'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>
```

#### 样式

```html
<!-- Vue 3 -->
<style scoped>
.app { color: red; }
</style>

<!-- Lyt.js（完全兼容） -->
<style scoped>
.app { color: red; }
</style>
```

### 4. 运行迁移工具

使用 `vue-to-lyt` CLI 工具自动转换代码：

```bash
# 转换单个文件
npx @lytjs/compat vue-to-lyt ./src/MyComponent.vue

# 转换整个目录
npx @lytjs/compat vue-to-lyt ./src --recursive

# 预览转换（不实际写入文件）
npx @lytjs/compat vue-to-lyt ./src --recursive --dry-run

# 转换到指定输出目录
npx @lytjs/compat vue-to-lyt ./src --recursive --output ./lyt-src
```

也可以在代码中使用迁移 API：

```typescript
import { migrateVueFile, formatMigrationReport } from '@lytjs/compat'

const source = `
<template>
  <div v-if="show">{{ message }}</div>
</template>
<script setup>
import { ref } from 'vue'
const message = ref('Hello')
</script>
`

const report = migrateVueFile(source)
console.log('兼容性评分:', report.compatibilityScore)
console.log('转换后代码:', report.code)
console.log('需要手动修改:', report.manualFixes)
console.log(formatMigrationReport(report))
```

### 5. 手动处理不兼容的部分

迁移工具会自动检测并标记需要手动修改的部分。常见的需要手动处理的情况：

- `defineProps` / `defineEmits` 编译器宏
- `$refs` / `$emit` / `$el` 实例属性
- CSS Modules
- `v-memo` 指令
- Pinia/Vuex 状态管理 API 差异

---

## 常见迁移问题

### v-model 差异

Vue 3 的 `v-model` 在 Lyt.js 中变为 `model`，修饰符语法保持一致：

```html
<!-- Vue 3 -->
<input v-model.trim="text" />
<input v-model.number="count" />
<input v-model.lazy="value" />

<!-- Lyt.js -->
<input model.trim="text" />
<input model.number="count" />
<input model.lazy="value" />
```

### 生命周期差异

大部分生命周期钩子完全兼容。以下钩子为占位实现：

- `onErrorCaptured` — 仅打印警告，不会实际捕获错误
- `onRenderTracked` / `onRenderTriggered` — 仅打印警告
- `onActivated` / `onDeactivated` — 仅打印警告
- `onServerPrefetch` — 仅打印警告

### 指令差异

| 差异点 | Vue 3 | Lyt.js |
|--------|-------|--------|
| 条件渲染 | `v-if` / `v-else-if` / `v-else` | `if` / `else-if` / `else` |
| 列表渲染 | `v-for` | `v-each` |
| 双向绑定 | `v-model` | `model` |
| 事件绑定 | `v-on:click` 或 `@click` | `on:click` 或 `@click` |
| 属性绑定 | `v-bind:src` 或 `:src` | `:src` |
| 插槽 | `v-slot:name` 或 `#name` | `slot:name` 或 `#name` |

### 组件库差异

Vue 3 的组件库（如 Element Plus、Ant Design Vue）无法直接在 Lyt.js 中使用。你需要：

1. 寻找 Lyt.js 的替代组件库
2. 使用原生 HTML 元素 + 自定义样式
3. 封装常用的 UI 组件

### $refs / $emit / $el 替代方案

```javascript
// Vue 3
export default {
  mounted() {
    this.$refs.input.focus()
    this.$emit('change', this.value)
    console.log(this.$el)
  }
}

// Lyt.js（Composition API）
import { ref, onMounted } from '@lytjs/compat'

// setup() {
//   const inputRef = ref(null)
//   const emit = (event, ...args) => { /* 使用 setup 上下文的 emit */ }
//
//   onMounted(() => {
//     inputRef.value?.focus()
//     emit('change', value.value)
//   })
//
//   return { inputRef }
// }
```

### defineProps / defineEmits 替代方案

```javascript
// Vue 3（script setup）
const props = defineProps({ title: String })
const emit = defineEmits(['update'])

// Lyt.js（defineComponent）
import { defineComponent } from '@lytjs/compat'

export default defineComponent({
  props: {
    title: String,
  },
  emits: ['update'],
  setup(props, { emit }) {
    // 使用 props.title 和 emit('update', value)
  },
})
```

---

## 最佳实践

### 1. 渐进式迁移

不要一次性迁移整个项目。建议按以下顺序：

1. 先迁移工具函数和纯逻辑模块
2. 再迁移简单的展示型组件
3. 最后迁移复杂的交互型组件

### 2. 使用 @lytjs/compat 兼容层

在迁移初期，使用 `@lytjs/compat` 可以最大程度减少代码修改。等迁移完成后，可以逐步切换到 Lyt.js 原生包以获得更好的类型支持和性能。

### 3. 利用迁移工具

使用 `vue-to-lyt` CLI 工具和 `migrateVueFile` API 来自动化转换。迁移工具会生成兼容性评分和详细的问题报告，帮助你了解迁移难度。

### 4. 编写迁移测试

迁移后，确保所有功能正常工作。建议：

- 为每个迁移的组件编写单元测试
- 运行端到端测试确保用户交互正常
- 检查控制台是否有兼容层警告

### 5. 关注占位 API

兼容层中标记为"占位"的 API 不会实际执行任何操作，只会打印警告。如果你的代码依赖这些 API，需要寻找替代方案。

### 6. 利用 Signal 模式

Lyt.js 独有的 Signal 响应式模式可以提供更好的性能。迁移完成后，可以考虑将部分组件从 Proxy 模式切换到 Signal 模式：

```javascript
import { defineComponent } from '@lytjs/component'

export default defineComponent({
  reactivityMode: 'signal', // 使用 Signal 模式
  setup() {
    // Signal 模式下的状态管理
  },
})
```

---

## 获取帮助

如果在迁移过程中遇到问题，请通过 [Gitee Issues](https://gitee.com/lytjs/lytjs/issues) 提交反馈。
