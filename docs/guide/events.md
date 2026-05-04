# 事件处理

LytJS 提供了灵活的事件处理机制，支持内联处理器、方法处理器、事件修饰符和按键修饰符。

## v-on 指令

使用 `v-on` 指令（简写 `@`）监听 DOM 事件。

```html
<template>
  <!-- 完整语法 -->
  <button v-on:click="handleClick">点击</button>

  <!-- 简写语法 -->
  <button @click="handleClick">点击</button>
</template>
```

## 内联事件处理器

直接在模板中编写简单的逻辑。

```html
<template>
  <button @click="count++">计数: {{ count }}</button>

  <button @click="count = 0">重置</button>

  <!-- 传递参数 -->
  <button @click="say('hello')">打招呼</button>
</template>

<script>
export default {
  data() {
    return { count: 0 };
  },
  methods: {
    say(msg) {
      console.log(msg);
    },
  },
};
</script>
```

在内联处理器中访问原始 DOM 事件，使用 `$event` 变量：

```html
<template>
  <button @click="warn('表单不能为空', $event)">提交</button>
</template>

<script>
export default {
  methods: {
    warn(message, event) {
      if (event) {
        event.preventDefault();
      }
      alert(message);
    },
  },
};
</script>
```

## 方法事件处理器

将事件指向组件方法，方法会自动接收原生事件对象作为参数。

```html
<template>
  <button @click="handleClick">点击</button>
</template>

<script>
export default {
  methods: {
    handleClick(event) {
      console.log('点击事件:', event);
      console.log('目标元素:', event.target);
    },
  },
};
</script>
```

## 事件修饰符

LytJS 支持以下事件修饰符，以点号开头附加在事件名之后：

### .stop

阻止事件冒泡。

```html
<!-- 阻止点击事件冒泡 -->
<button @click.stop="handleClick">点击</button>
```

### .prevent

阻止默认行为。

```html
<!-- 阻止表单默认提交 -->
<form @submit.prevent="onSubmit">
  <button type="submit">提交</button>
</form>

<!-- 阻止链接跳转 -->
<a href="/api" @click.prevent>阻止跳转</a>
```

### .capture

使用捕获模式监听事件。

```html
<!-- 在捕获阶段处理事件 -->
<div @click.capture="handleOuterClick">
  <button @click="handleInnerClick">点击</button>
</div>
```

### .self

仅当事件是从事件绑定的元素本身触发时才处理。

```html
<!-- 只在 div 本身被点击时触发，子元素点击不触发 -->
<div @click.self="handleClick">
  <button>子按钮</button>
</div>
```

### .once

事件只触发一次。

```html
<button @click.once="handleClick">只触发一次</button>
```

### .passive

以 `{ passive: true }` 模式添加事件监听器，提升滚动性能。

```html
<!-- 提升滚动性能 -->
<div @scroll.passive="onScroll">滚动区域</div>
```

修饰符可以串联使用：

```html
<!-- 阻止默认行为 + 阻止冒泡 -->
<a @click.stop.prevent="handleClick">链接</a>

<!-- 修饰符顺序很重要 -->
<!-- @click.prevent.self 会阻止所有点击的默认行为
     @click.self.prevent 只阻止元素自身点击的默认行为 -->
```

## 按键修饰符

在监听键盘事件时，可以使用按键修饰符。

```html
<template>
  <!-- 按键名称 -->
  <input @keyup.enter="submit" />
  <input @keyup.esc="cancel" />
  <input @keyup.tab="handleTab" />
  <input @keyup.delete="handleDelete" />
  <input @keyup.space="handleSpace" />
  <input @keyup.up="handleUp" />
  <input @keyup.down="handleDown" />
  <input @keyup.left="handleLeft" />
  <input @keyup.right="handleRight" />
</template>
```

### 系统修饰键

配合鼠标或键盘事件使用，仅在对应按键按下时触发。

```html
<template>
  <!-- Ctrl + Click -->
  <button @click.ctrl="handleCtrlClick">Ctrl + 点击</button>

  <!-- Alt + Enter -->
  <input @keyup.alt.enter="handleAltEnter" />

  <!-- Shift + Click -->
  <div @click.shift="handleShiftClick">Shift + 点击</div>

  <!-- Meta (Cmd/Ctrl) + Click -->
  <button @click.meta="handleMetaClick">Meta + 点击</button>
</template>
```

### .exact 修饰符

精确控制系统修饰键的组合。

```html
<template>
  <!-- 仅在 Ctrl 被按下且没有其他修饰键时触发 -->
  <button @click.ctrl.exact="handleClick">仅 Ctrl</button>

  <!-- 没有任何修饰键时触发 -->
  <button @click.exact="handleClick">无修饰键</button>
</template>
```

## 自定义事件

组件可以通过 `emits` 选项声明和触发自定义事件。

### 声明事件

使用 `emits` 选项声明组件可以触发的自定义事件：

```typescript
const MyForm = {
  emits: ['submit', 'cancel'],
  methods: {
    handleSubmit() {
      this.$emit('submit', { name: '张三', age: 25 });
    },
    handleCancel() {
      this.$emit('cancel');
    },
  },
};
```

### defineEmits（Composition API）

在 `setup` 中使用 `defineEmits` 声明事件：

```typescript
const MyForm = {
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const handleSubmit = () => {
      emit('submit', { name: '张三', age: 25 });
    };

    const handleCancel = () => {
      emit('cancel');
    };

    return { handleSubmit, handleCancel };
  },
};
```

### 事件校验

可以对事件参数进行校验，校验失败时控制台会发出警告：

```typescript
const MyForm = {
  emits: {
    submit(payload: { name: string; age: number }) {
      // 返回 true 表示校验通过
      return payload.name && payload.name.length > 0;
    },
  },
  setup(props, { emit }) {
    const submit = () => {
      emit('submit', { name: '张三', age: 25 }); // 校验通过
      emit('submit', { name: '', age: 25 }); // 校验失败，控制台警告
    };
    return { submit };
  },
};
```

### 监听自定义事件

父组件通过 `@` 或 `v-on` 监听子组件触发的自定义事件：

```html
<template>
  <MyForm @submit="onSubmit" @cancel="onCancel" />
</template>

<script>
export default {
  methods: {
    onSubmit(data) {
      console.log('表单提交:', data);
    },
    onCancel() {
      console.log('表单取消');
    },
  },
};
</script>
```

### v-model 与自定义事件

`v-model` 本质上是 `modelValue` prop 和 `update:modelValue` 事件的语法糖：

```html
<template>
  <!-- 父组件 -->
  <ChildComponent v-model="message" />
  <!-- 等价于 -->
  <ChildComponent :modelValue="message" @update:modelValue="message = $event" />
</template>
```

```typescript
// 子组件
const ChildComponent = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  methods: {
    updateValue(newValue) {
      this.$emit('update:modelValue', newValue);
    },
  },
};
```

支持多个 `v-model` 绑定：

```html
<template>
  <UserForm v-model:name="userName" v-model:email="userEmail" />
</template>
```
