# @lytjs/vdom

Lyt.js 虚拟 DOM 实现 - 提供高效的节点创建、Diff 算法和 Patch 操作。

## 安装

```bash
npm install @lytjs/vdom

# 或使用 pnpm
pnpm add @lytjs/vdom
```

## 特性

- 🚀 Block Tree 优化
- 📦 Patch Flag 差异化更新
- 🔍 LIS 最长递增子序列优化
- 🎯 零运行时依赖

## 快速开始

### 创建 VNode

```javascript
import { createVNode, createBlock } from '@lytjs/vdom';

// 创建普通虚拟节点
const vnode = createVNode('div', { class: 'container' }, [
  createVNode('h1', null, 'Hello Lyt.js')
]);

// 创建 Block (优化过的)
const block = createBlock('div', { class: 'container' }, [
  createVNode('h1', null, 'Hello Lyt.js')
]);
```

### Patch Flags

```javascript
import { createVNode, PatchFlags } from '@lytjs/vdom';

const vnode = createVNode('div', { class: 'foo' }, 'text', PatchFlags.TEXT);
```

| Flag | 值 | 说明 |
|------|-----|------|
| TEXT | 1 | 动态文本 |
| CLASS | 2 | 动态 class |
| STYLE | 4 | 动态 style |
| PROPS | 8 | 动态属性 |
| FULL_PROPS | 16 | 完整属性 |
| TEXT | 1 | 动态文本 |
| STABLE_FRAGMENT | 64 | 稳定的 Fragment |
| KEYED_FRAGMENT | 128 | 带 key 的 Fragment |
| UNKEYED_FRAGMENT | 256 | 无 key 的 Fragment |

## API 参考

### VNode 创建

| API | 说明 |
|------|------|
| `createVNode(type, props, children, patchFlag)` | 创建虚拟节点 |
| `createBlock(type, props, children, patchFlag)` | 创建 Block (根节点 |
| `cloneVNode(vnode)` | 克隆虚拟节点 |
| `createTextVNode(text)` | 创建文本虚拟节点 |
| `createCommentVNode(text)` | 创建注释虚拟节点 |

### VNode 工具

| API | 说明 |
|------|------|
| `isVNode(vnode)` | 判断是否为 VNode |
| `isSameVNodeType(n1, n2)` | 判断 VNode 类型是否相同 |
| `normalizeVNode(child)` | 规范化子节点 |
| `normalizeChildren(children)` | 规范化子节点列表 |

## Block Tree

Block Tree 是 Lyt.js 的虚拟 DOM 优化方案，通过静态分析提升性能：

```javascript
// 模板
<div>
  <h1>Static</h1>
  <p>{{ text }}</p>
</div>

// Block Tree
Block(
  type: 'div',
  children: [
    VNode('h1'), // 静态
    VNode('p', null, '{{ text }}', PatchFlags.TEXT) // 动态
  ],
  dynamicChildren: [1] // 只有索引 1 是动态的
)
```

## Diff 算法

Lyt.js 使用双端对比 + LIS 优化的 Diff 算法：

```javascript
import { patch } from '@lytjs/vdom';

// 对比新旧 VNode
patch(oldVNode, newVNode, container);
```

### 算法特点：

- 双端对比，快速处理常见模式
- LIS 最长递增子序列优化移动最小化
- Patch Flag 跳过不必要的对比
- 动态子节点列表跳过静态节点

## 示例

### 基本使用

```javascript
import { createVNode, createBlock, render } from '@lytjs/vdom';

// 创建旧 VNode
const oldVNode = createBlock('div', null, [
  createVNode('p', null, 'Hello')
]);

// 渲染
const container = document.getElementById('app');
render(oldVNode, container);

// 更新
const newVNode = createBlock('div', null, [
  createVNode('p', null, 'Hello World')
]);
render(newVNode, container);
```

### 带 Key 的列表

```javascript
import { createVNode, createBlock, PatchFlags } from '@lytjs/vdom';

const items = [
  { id: 1, text: 'A' },
  { id: 2, text: 'B' },
  { id: 3, text: 'C' }
];

const vnode = createBlock('ul', null, 
  items.map(item => 
    createVNode('li', { key: item.id }, item.text)
  )
);
```

## 性能

- 体积：3.57 KB (ESM gzip)
- 零运行时依赖
- Block Tree + Patch Flag 优化
- LIS 优化列表重排

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
