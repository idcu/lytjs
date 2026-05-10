# 计数器示例

一个简单的计数器应用，展示 Lyt.js 的基础响应式特性。

## 在线演示

[在 StackBlitz 上打开](https://stackblitz.com/edit/lytjs-counter)

## 完整代码

```vue
<template>
  <div class="counter">
    <h1>计数器</h1>
    <p class="count">{{ count }}</p>
    <div class="buttons">
      <button @click="decrement" :disabled="count <= 0">-</button>
      <button @click="reset">重置</button>
      <button @click="increment">+</button>
    </div>
    <p class="hint">点击按钮改变数值</p>
  </div>
</template>

<script setup>
import { ref } from '@lytjs/core'

// 响应式状态
const count = ref(0)

// 方法
const increment = () => {
  count.value++
}

const decrement = () => {
  if (count.value > 0) {
    count.value--
  }
}

const reset = () => {
  count.value = 0
}
</script>

<style scoped>
.counter {
  text-align: center;
  padding: 2rem;
  font-family: system-ui, sans-serif;
}

.count {
  font-size: 4rem;
  font-weight: bold;
  color: #3eaf7c;
  margin: 1rem 0;
}

.buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1rem 0;
}

button {
  padding: 0.5rem 1.5rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 4px;
  background: #3eaf7c;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #369f6e;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.hint {
  color: #666;
  font-size: 0.9rem;
}
</style>
```

## 关键代码解释

### 1. 响应式状态

```typescript
import { ref } from '@lytjs/core'

const count = ref(0)
```

使用 `ref` 创建响应式数据。`ref` 返回一个包装对象，通过 `.value` 访问和修改值。当 `count.value` 改变时，视图会自动更新。

### 2. 事件处理

```vue
<button @click="increment">+</button>
```

使用 `v-on` 指令（简写为 `@`）绑定点击事件。`increment` 是在 `<script setup>` 中定义的函数。

### 3. 条件渲染

```vue
<button @click="decrement" :disabled="count <= 0">-</button>
```

使用 `v-bind` 指令（简写为 `:`）动态绑定 `disabled` 属性。当 `count <= 0` 时，按钮会被禁用。

### 4. 模板插值

```vue
<p class="count">{{ count }}</p>
```

使用双大括号 `{{ }}` 进行文本插值，将响应式数据渲染到视图中。

## 进阶：使用 Signal 模式

同样的计数器使用 Signal 模式实现：

```vue
<script setup>
import { ref } from '@lytjs/core-signal'

const count = ref(0)

// Signal 模式下，访问值不需要 .value
const increment = () => {
  count.value++
}
</script>
```

Signal 模式提供了更细粒度的更新，在数据密集型场景下性能更好。

## 下一步

- 学习 [响应式系统](../guide/reactivity) 的更多特性
- 了解 [模板语法](../guide/template-syntax)
- 尝试 [待办事项示例](./todomvc)
