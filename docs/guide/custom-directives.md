# 自定义指令

LytJS 内置了常用的指令（如 `v-bind`、`v-on`、`v-model`、`v-if`、`v-for`、`v-show` 等），可以满足大多数开发需求。

## 内置指令

### v-bind

动态绑定一个或多个属性，或组件 prop 到表达式：

```html
<!-- 绑定 attribute -->
<img v-bind:src="imageSrc" />

<!-- 缩写 -->
<img :src="imageSrc" :alt="imageAlt" />

<!-- 动态 attribute 名 -->
<button :[attributeName]="value">按钮</button>
```

### v-on

给元素绑定事件监听器：

```html
<!-- 完整语法 -->
<button v-on:click="handleClick">点击</button>

<!-- 缩写 -->
<button @click="handleClick">点击</button>

<!-- 动态事件名 -->
<button @[eventName]="handler">按钮</button>

<!-- 修饰符 -->
<input @keyup.enter="submit" />
<form @submit.prevent="onSubmit" />
```

### v-model

在表单控件或组件上创建双向绑定：

```html
<input v-model="message" placeholder="编辑我" />
<textarea v-model="content"></textarea>
<select v-model="selected">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

```typescript
import { createApp, ref } from '@lytjs/core';

createApp({
  setup() {
    const message = ref('');
    const content = ref('');
    const selected = ref('a');
    return { message, content, selected };
  },
  template: `
    <div>
      <input v-model="message" />
      <p>{{ message }}</p>
    </div>
  `,
}).mount('#app');
```

## 自定义指令

::: warning 尚未实现
LytJS 目前暂不支持完整的自定义指令 API（`app.directive()` 注册全局指令）。以下为未来规划的 API 设计，具体实现请关注后续版本更新。
:::

未来版本计划支持以下自定义指令钩子：

```typescript
// 未来 API 设计（尚未实现）
const myDirective = {
  created(el, binding, vnode) {
    // 指令绑定到元素后调用
  },
  beforeMount(el, binding, vnode) {},
  mounted(el, binding, vnode) {
    // 元素插入 DOM 后调用
  },
  beforeUpdate(el, binding, vnode, prevVNode) {},
  updated(el, binding, vnode, prevVNode) {},
  beforeUnmount(el, binding, vnode) {},
  unmounted(el, binding, vnode) {},
};
```

## 指令钩子参数

自定义指令的钩子会接收以下参数：

- **`el`**：指令绑定到的元素，可以直接操作 DOM。
- **`binding`**：包含以下属性的对象：
  - `value`：传递给指令的值，如 `v-my-directive="1 + 1"` 中为 `2`。
  - `oldValue`：指令之前的值（仅在 `updated` 和 `beforeUpdate` 中可用）。
  - `arg`：传递给指令的参数，如 `v-my-directive:foo` 中为 `"foo"`。
  - `modifiers`：包含修饰符的对象，如 `v-my-directive.foo.bar` 中为 `{ foo: true, bar: true }`。
- **`vnode`**：编译生成的虚拟节点。
- **`prevVNode`**：上一个虚拟节点（仅在 `updated` 和 `beforeUpdate` 中可用）。
