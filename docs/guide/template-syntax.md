# 模板语法

LytJS 使用虚拟 DOM 渲染函数（`h` 函数）来描述 UI 结构，同时支持模板编译。

## h 函数

`h(tag, props, children)` 用于创建虚拟节点（VNode）。

```typescript
import { h } from '@lytjs/vdom';

// 创建一个 div 元素
const vnode = h('div', { id: 'app' }, 'Hello LytJS');

// 嵌套子节点
const vnode = h('div', { class: 'container' }, [h('h1', null, '标题'), h('p', null, '段落内容')]);
```

## 属性绑定

使用 `props` 参数传递 HTML 属性和事件监听器。

```typescript
// 静态属性
h('input', { type: 'text', placeholder: '请输入' });

// 动态属性
h('div', { class: isActive ? 'active' : 'inactive' });

// 事件绑定
h('button', { onClick: () => console.log('clicked') }, '点击我');
```

## 条件渲染

通过三元表达式或逻辑与操作实现条件渲染。

```typescript
// 三元表达式
h('div', null, isLoggedIn ? h(UserProfile) : h(LoginForm));

// 逻辑与
h('div', null, [
  h('h1', null, '用户列表'),
  users.length > 0 && users.map((user) => h(UserItem, { key: user.id, user })),
]);
```

## 列表渲染

使用数组的 `map` 方法渲染列表，务必提供唯一的 `key`。

```typescript
const items = ['苹果', '香蕉', '橙子'];

const vnode = h(
  'ul',
  null,
  items.map((item, index) => h('li', { key: index }, item)),
);
```

## 插槽

组件通过 `slots` 支持内容分发。

```typescript
// 父组件传递插槽
h(MyComponent, null, {
  default: () => h('p', null, '默认插槽内容'),
  header: () => h('h1', null, '头部插槽'),
});
```

## 所见即所得指令语法

LytJS 支持一种独特的"所见即所得"（WYSIWYG）模板指令模式，允许你在模板中直接使用**裸指令**（不带 `v-` 前缀），使模板更加简洁、可读性更强。

### 什么是"所见即所得"模式

在传统的 Vue 风格模板中，指令需要以 `v-` 前缀开头，例如 `v-if`、`v-for`、`v-model`。LytJS 的"所见即所得"模式允许你省略 `v-` 前缀，直接使用指令名称作为 HTML 属性：

```html
<!-- 传统写法 -->
<div v-if="show">Hello</div>
<li v-for="item in list" :key="item.id">{{ item.name }}</li>
<input v-model="text" />

<!-- 所见即所得写法 -->
<div if="show">Hello</div>
<li for="item in list" :key="item.id">{{ item.name }}</li>
<input model="text" />
```

### 支持的 13 个裸指令

LytJS 共支持以下 13 个裸指令，它们与对应的 `v-` 前缀指令完全等价：

| 裸指令    | 等价的 v- 指令  | 说明               |
| --------- | --------------- | ------------------ |
| `if`      | `v-if`          | 条件渲染           |
| `else-if` | `v-else-if`     | 条件分支           |
| `else`    | `v-else`        | 否则分支           |
| `for`     | `v-for`         | 列表渲染           |
| `each`    | `v-for`（别名） | 列表渲染（同 for） |
| `model`   | `v-model`       | 双向绑定           |
| `show`    | `v-show`        | 显示/隐藏          |
| `text`    | `v-text`        | 文本内容           |
| `html`    | `v-html`        | HTML 内容          |
| `once`    | `v-once`        | 只渲染一次         |
| `memo`    | `v-memo`        | 记忆化子树         |
| `pre`     | `v-pre`         | 跳过编译           |
| `cloth`   | `v-cloak`       | 隐藏未编译模板     |

### 与 v- 前缀指令的等价性

裸指令在编译阶段会被自动转换为对应的 `v-` 前缀指令，运行时行为完全一致。你可以自由混用两种风格：

```html
<template>
  <!-- 混合使用完全没问题 -->
  <div if="isLoggedIn" class="greeting">
    <span v-text="username"></span>
  </div>
  <div v-else>
    <button model="loginForm.email">登录</button>
  </div>
</template>
```

### 冲突检测机制

由于裸指令使用的是原生 HTML 属性名，可能与某些 HTML 元素的固有属性产生冲突。LytJS 内置了冲突检测机制，在以下场景中会自动处理：

#### label + for 冲突

`<label>` 元素的 `for` 属性在 HTML 中用于关联表单控件，而 `for` 也是 LytJS 的列表渲染指令。当编译器检测到 `<label>` 上的 `for` 属性时，会根据值的格式自动判断意图：

```html
<!-- 列表渲染：值包含 "in" 或 "of" 关键字 -->
<label for="item in items">{{ item.label }}</label>

<!-- HTML 原生 for：值是一个 ID 字符串 -->
<label for="username">用户名</label>
```

#### dialog + show 冲突

`<dialog>` 元素的 `show` 属性在 HTML 中用于以非模态方式显示对话框，而 `show` 也是 LytJS 的显示/隐藏指令。编译器会根据 `<dialog>` 元素自动区分：

```html
<!-- LytJS v-show 指令：值是动态表达式 -->
<dialog show="isVisible">内容</dialog>

<!-- HTML 原生 show：布尔属性（无值或值为空） -->
<dialog show>原生对话框</dialog>
```

### attr- 转义前缀

如果裸指令与 HTML 原生属性产生歧义，你可以使用 `attr-` 前缀来强制指定为原生 HTML 属性：

```html
<!-- 强制使用原生 HTML for 属性 -->
<label attr-for="my-input">标签</label>

<!-- 强制使用原生 HTML show 属性 -->
<dialog attr-show>原生对话框</dialog>
```

同样，你可以使用 `v-` 前缀来强制指定为 LytJS 指令：

```html
<!-- 强制使用 LytJS v-for 指令 -->
<label v-for="item in items">{{ item.label }}</label>

<!-- 强制使用 LytJS v-show 指令 -->
<dialog v-show="isVisible">内容</dialog>
```

### 配置开关

如果项目不需要"所见即所得"模式，可以在应用配置中全局关闭裸指令支持：

```typescript
import { createApp } from '@lytjs/core';

const app = createApp(App);

// 关闭裸指令，所有指令必须使用 v- 前缀
app.config.bareDirectives = false;

app.mount('#app');
```

关闭后，模板中的裸属性将被视为普通 HTML 属性，不会被编译为指令。

### 完整示例

```html
<template>
  <div class="app">
    <!-- 条件渲染 -->
    <div if="type === 'A'">类型 A</div>
    <div else-if="type === 'B'">类型 B</div>
    <div else>其他类型</div>

    <!-- 列表渲染 -->
    <ul>
      <li for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>

    <!-- 双向绑定 -->
    <input model="message" placeholder="请输入" />
    <p text="message"></p>

    <!-- 显示/隐藏 -->
    <div show="isLoading">加载中...</div>

    <!-- 只渲染一次 -->
    <div once>
      <p>这个内容只会渲染一次：{{ timestamp }}</p>
    </div>

    <!-- 记忆化子树 -->
    <div :memo="[item.id]">
      <span>{{ item.name }}</span>
    </div>

    <!-- 跳过编译 -->
    <div pre>{{ this will not be compiled }}</div>

    <!-- 隐藏未编译模板 -->
    <div cloth>加载完成前隐藏</div>
  </div>
</template>
```
