# 组件

组件是 LytJS 应用的基本构建单元。组件将 UI 拆分为独立、可复用的部分。

## 定义组件

使用对象语法定义组件，包含 `props`、`data`、`methods`、`setup` 等选项。

```typescript
import { createApp } from "@lytjs/core";

const Counter = {
  name: "Counter",
  props: {
    initialCount: { type: Number, default: 0 },
  },
  data() {
    return { count: this.initialCount };
  },
  methods: {
    increment() {
      this.count++;
    },
  },
  render(ctx) {
    return h("div", [
      h("p", `Count: ${ctx.count}`),
      h("button", { onClick: () => ctx.increment() }, "Increment"),
    ]);
  },
};

const app = createApp(Counter, { initialCount: 10 });
app.mount("#app");
```

## Setup 函数

`setup` 是 Composition API 的入口，在组件创建之前执行。

```typescript
const MyComponent = {
  name: "MyComponent",
  setup(props, ctx) {
    const count = ref(0);
    const increment = () => count.value++;

    return { count, increment };
  },
};
```

## Props

通过 `props` 选项声明组件接收的属性，支持类型验证和默认值。

```typescript
const UserCard = {
  props: {
    name: { type: String, required: true },
    age: { type: Number, default: 0 },
  },
  render(ctx) {
    return h("div", `${ctx.name}, ${ctx.age} 岁`);
  },
};
```

## 生命周期

组件提供完整的生命周期钩子：`beforeCreate`、`created`、`beforeMount`、`mounted`、`beforeUpdate`、`updated`、`beforeUnmount`、`unmounted`。

```typescript
const MyComponent = {
  mounted() {
    console.log("组件已挂载");
  },
  unmounted() {
    console.log("组件已卸载");
  },
};
```
