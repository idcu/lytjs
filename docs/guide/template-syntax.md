# 模板语法

LytJS 使用虚拟 DOM 渲染函数（`h` 函数）来描述 UI 结构，同时支持模板编译。

## h 函数

`h(tag, props, children)` 用于创建虚拟节点（VNode）。

```typescript
import { h } from "@lytjs/vdom";

// 创建一个 div 元素
const vnode = h("div", { id: "app" }, "Hello LytJS");

// 嵌套子节点
const vnode = h("div", { class: "container" }, [
  h("h1", null, "标题"),
  h("p", null, "段落内容"),
]);
```

## 属性绑定

使用 `props` 参数传递 HTML 属性和事件监听器。

```typescript
// 静态属性
h("input", { type: "text", placeholder: "请输入" });

// 动态属性
h("div", { class: isActive ? "active" : "inactive" });

// 事件绑定
h("button", { onClick: () => console.log("clicked") }, "点击我");
```

## 条件渲染

通过三元表达式或逻辑与操作实现条件渲染。

```typescript
// 三元表达式
h("div", null, isLoggedIn ? h(UserProfile) : h(LoginForm));

// 逻辑与
h("div", null, [
  h("h1", null, "用户列表"),
  users.length > 0 && users.map(user => h(UserItem, { key: user.id, user })),
]);
```

## 列表渲染

使用数组的 `map` 方法渲染列表，务必提供唯一的 `key`。

```typescript
const items = ["苹果", "香蕉", "橙子"];

const vnode = h("ul", null,
  items.map((item, index) =>
    h("li", { key: index }, item)
  )
);
```

## 插槽

组件通过 `slots` 支持内容分发。

```typescript
// 父组件传递插槽
h(MyComponent, null, {
  default: () => h("p", null, "默认插槽内容"),
  header: () => h("h1", null, "头部插槽"),
});
```
