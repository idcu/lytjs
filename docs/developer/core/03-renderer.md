# Renderer 渲染器

渲染器负责将虚拟 DOM 渲染为真实 DOM。

## 🎯 什么是渲染器？

渲染器是连接虚拟 DOM 和真实 DOM 的桥梁：

```
虚拟 DOM (VNode) → 渲染器 → 真实 DOM
```

## 🏗️ 渲染器架构

Lyt.js 的渲染器是可配置的，支持不同的平台。

**源代码位置**：`packages/renderer/src/`

## 📦 核心概念

### VNode（虚拟 DOM 节点）

VNode 是一个普通的 JavaScript 对象：

```typescript
{
  type: string | object | Function,  // 标签名或组件
  props: object | null,              // 属性
  children: VNode[] | string | null,  // 子节点
  el: Element | null                 // 真实 DOM 元素
}
```

### 渲染流程

#### 1. 挂载（Mount）

```typescript
function mount(vnode, container) {
  const el = document.createElement(vnode.type)
  if (vnode.props) {
    patchProps(el, null, vnode.props)
  }
  if (typeof vnode.children === 'string') {
    el.textContent = vnode.children
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => mount(child, el))
  }
  container.appendChild(el)
  vnode.el = el
}
```

#### 2. 更新（Patch）

当数据变化时，对比新旧 VNode，只更新变化的部分。

#### 3. 卸载（Unmount）

```typescript
function unmount(vnode) {
  const parent = vnode.el.parentNode
  parent.removeChild(vnode.el)
}
```

## 💡 推荐阅读顺序

1. 了解 VNode 结构
2. 阅读 mount 逻辑
3. 阅读 patch 逻辑
4. 阅读 diff 算法（特别是 keyed children）

## 📚 相关文档

- [reactivity](./01-reactivity.md)
- [component](./04-component.md)
