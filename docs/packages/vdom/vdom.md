# @lytjs/vdom

> LytJS 虚拟 DOM 实现，提供 VNode 创建、Diff 算法、对象池优化和渲染器接口

## 安装

```bash
npm install @lytjs/vdom
```

## 核心 API

### createVNode

创建虚拟 DOM 节点

```typescript
import { createVNode, Fragment, Text, Comment } from '@lytjs/vdom';

// 创建元素 VNode
const div = createVNode('div', { class: 'container' }, 'Hello');

// 创建组件 VNode
const component = createVNode(MyComponent, { prop: 'value' });

// 创建 Fragment
const fragment = createVNode(Fragment, null, [child1, child2]);

// 创建文本节点
const text = createVNode(Text, null, 'text content');

// 创建注释节点
const comment = createVNode(Comment, null, 'comment');
```

### createVNodePooled

创建 VNode（使用对象池优化版本），减少 GC 压力

```typescript
import { createVNodePooled, releaseVNode, getVNodePoolStats } from '@lytjs/vdom';

// 使用对象池创建 VNode
const vnode = createVNodePooled('div', { class: 'item' }, 'Content');

// 使用完毕后归还到对象池
releaseVNode(vnode);

// 获取池化统计信息（用于调试）
const stats = getVNodePoolStats();
console.log(`Hit: ${stats.hit}, Miss: ${stats.miss}, Pool Size: ${stats.size}`);
```

### VNode 对象池

为减少高频 VNode 创建带来的 GC 压力，提供对象池机制：

```typescript
import {
  createVNodePooled,
  releaseVNode,
  getVNodePoolStats,
  resetVNodePoolStats,
} from '@lytjs/vdom';

// 高频创建场景使用池化版本
function renderList(items: string[]) {
  return items.map((item) => {
    const vnode = createVNodePooled('li', null, item);
    // 注意：需要在适当的时候调用 releaseVNode 归还对象
    return vnode;
  });
}

// 重置统计信息
resetVNodePoolStats();
```

### createRenderer

创建渲染器实例，支持自定义渲染后端

```typescript
import { createRenderer, type RendererOptions } from '@lytjs/vdom';

const options: RendererOptions = {
  createElement: (tag) => document.createElement(tag),
  insert: (el, parent, anchor) => parent.insertBefore(el, anchor),
  // ...其他选项
};

const renderer = createRenderer(options);
renderer.render(vnode, container);
```

### Fragment / Text / Comment

虚拟节点类型常量和工具

```typescript
import { Fragment, Text, Comment, isFragment, isTextVNode, isCommentVNode } from '@lytjs/vdom';

// 类型检查
if (isFragment(vnode)) {
  console.log('这是一个 Fragment');
}
```

### cloneVNode / mergeProps

VNode 克隆和属性合并

```typescript
import { cloneVNode, mergeProps } from '@lytjs/vdom';

// 克隆 VNode
const cloned = cloneVNode(originalVNode);

// 克隆并合并额外 props
const merged = cloneVNode(originalVNode, { class: 'extra-class' });

// 合并多个 props 对象
const props = mergeProps({ class: 'a', style: { color: 'red' } }, { class: 'b', onClick: handler });
// 结果: { class: 'a b', style: { color: 'red' }, onClick: handler }
```

### normalizeChildren / getShapeFlag

子节点规范化和形状标志

```typescript
import { normalizeChildren, getShapeFlag, ShapeFlags } from '@lytjs/vdom';

const vnode = createVNode('div');
normalizeChildren(vnode, ['child1', 'child2']);

const flag = getShapeFlag('div'); // ShapeFlags.ELEMENT
```

## Diff 算法优化

### canUseFastDiff / countNewNodes / countRemovedNodes

Diff 算法辅助函数，用于优化列表更新

```typescript
import { canUseFastDiff, countNewNodes, countRemovedNodes } from '@lytjs/vdom';

// 检查是否可以使用快速 diff
if (canUseFastDiff(oldChildren, newChildren)) {
  // 使用优化的 diff 算法
}

// 统计新增节点数量
const newCount = countNewNodes(oldChildren, newChildren);

// 统计移除节点数量
const removedCount = countRemovedNodes(oldChildren, newChildren);
```

### patchKeyedChildren / patchUnkeyedChildren

列表 Diff 算法

```typescript
import { patchKeyedChildren, patchUnkeyedChildren, registerDOMOperations } from '@lytjs/vdom';

// 注册 DOM 操作函数
registerDOMOperations({
  insert: (el, parent, anchor) => parent.insertBefore(el, anchor),
  remove: (el) => el.remove(),
  // ...
});

// 带 key 的子节点 diff
patchKeyedChildren(oldChildren, newChildren, container, anchor);

// 不带 key 的子节点 diff
patchUnkeyedChildren(oldChildren, newChildren, container, anchor);
```

## Block Tree 运行时

Block Tree 用于优化更新时的 diff 范围

```typescript
import {
  openBlock,
  closeBlock,
  createBlock,
  isBlock,
  getCurrentBlock,
  getBlockStackDepth,
  resetBlockStack,
} from '@lytjs/vdom';

// 在渲染函数中使用
function render() {
  openBlock();
  const block = createBlock('div', null, children);
  closeBlock();
  return block;
}

// 检查当前 Block 深度
const depth = getBlockStackDepth();

// 重置 Block 栈（用于测试）
resetBlockStack();
```

## Fragment 工具函数

```typescript
import {
  isFragmentVNode,
  getFragmentChildren,
  getFragmentChildCount,
  createFragment,
} from '@lytjs/vdom';

// 检查是否为 Fragment VNode
if (isFragmentVNode(vnode)) {
  const children = getFragmentChildren(vnode);
  const count = getFragmentChildCount(vnode);
}

// 创建 Fragment
const fragment = createFragment([child1, child2]);
```

## VNode 工具函数

```typescript
import {
  isStaticVNode,
  isDynamicVNode,
  getVNodeText,
  hasDynamicChildren,
  collectDynamicChildren,
  hasArrayChildren,
  hasTextChildren,
  getArrayChildren,
} from '@lytjs/vdom';

// 检查 VNode 类型
if (isStaticVNode(vnode)) {
  // 静态节点，无需更新
}

if (isDynamicVNode(vnode)) {
  // 动态节点，需要 diff
}

// 获取文本内容
const text = getVNodeText(vnode);

// 收集动态子节点
const dynamicChildren = collectDynamicChildren(vnode);
```

## 类型定义

```typescript
import type {
  VNode,
  VNodeTypes,
  VNodeChildren,
  Props,
  HostElement,
  HostNode,
  Component,
  RendererOptions,
  SuspenseBoundary,
  InternalComponentInstance,
  Block,
} from '@lytjs/vdom';
```

## 相关包

- [@lytjs/renderer](../renderer) - DOM/SSR 渲染后端，基于 vdom 包
- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/common-vnode](../common/packages/vnode) - 共享 VNode 类型和常量
- [@lytjs/host-contract](../host-contract) - 渲染器宿主抽象
