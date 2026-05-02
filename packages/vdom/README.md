# @lytjs/vdom

> LytJS 虚拟 DOM 实现，提供 VNode 创建、Diff 算法和渲染器接口

## 安装

```bash
npm install @lytjs/vdom
```

## 核心 API

### createVNode

创建虚拟 DOM 节点

```typescript
import { createVNode } from '@lytjs/vdom';
```

### createRenderer

创建渲染器实例，支持自定义渲染后端

```typescript
import { createRenderer, createDOMRendererOptions } from '@lytjs/vdom';
```

### Fragment / Text / Comment

虚拟节点类型常量和工具

```typescript
import { Fragment, Text, Comment } from '@lytjs/vdom';
```

### cloneVNode / mergeProps

VNode 克隆和属性合并

```typescript
import { cloneVNode, mergeProps } from '@lytjs/vdom';
```

### normalizeChildren / getShapeFlag

子节点规范化和形状标志

```typescript
import { normalizeChildren, getShapeFlag } from '@lytjs/vdom';
```

## 相关包

- [@lytjs/renderer](../renderer) - DOM/SSR 渲染后端，基于 vdom 包
- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/common-vnode](../common-vnode) - 共享 VNode 类型和常量
