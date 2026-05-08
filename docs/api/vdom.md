# @lytjs/vdom API 参考

`@lytjs/vdom` 是 LytJS 的虚拟 DOM 核心包，提供 VNode 创建、diff 算法、Block Tree 优化和跨平台渲染抽象。

---

## VNode 创建

### createVNode()

创建一个虚拟节点（VNode）。

```ts
function createVNode(
  type: VNodeTypes,
  props?: VNodeData,
  children?: VNodeChildren,
  flags?: number,
  sourceLocation?: VNodeSourceLocation,
): VNode;
```

**参数：**

| 参数             | 类型                  | 说明                                 |
| ---------------- | --------------------- | ------------------------------------ |
| `type`           | `VNodeTypes`          | 节点类型：HTML 标签名、组件、文本等  |
| `props`          | `VNodeData`           | 节点属性（class, style, onClick 等） |
| `children`       | `VNodeChildren`       | 子节点                               |
| `flags`          | `number`              | PatchFlags，用于编译时优化           |
| `sourceLocation` | `VNodeSourceLocation` | 模板源码位置（调试用）               |

**示例：**

```ts
import { createVNode, h } from '@lytjs/vdom';

// 元素节点
const divVNode = createVNode('div', { class: 'container' }, 'Hello');

// 组件节点
const CompVNode = createVNode(MyComponent, { msg: 'hi' });

// 使用 h 函数更简洁
const button = h('button', { onClick: handleClick }, 'Click me');
```

---

### h() / createElement()

`h` 是 `createVNode` 的别名，提供更简洁的调用方式。

```ts
// 与 createVNode 完全等价
const vnode = h('div', { id: 'app' }, 'Content');

// 支持 children 数组
h('ul', null, [h('li', null, 'Item 1'), h('li', null, 'Item 2')]);

// 支持嵌套 children
h('div', { class: 'wrapper' }, [h('header', null, 'Title'), h('main', null, 'Main content')]);
```

---

### createTextVNode()

创建文本节点。

```ts
function createTextVNode(text: string, flag?: number): VNode;
```

**示例：**

```ts
import { createTextVNode } from '@lytjs/vdom';

const textNode = createTextVNode('Hello World');
```

---

### createCommentVNode()

创建注释节点。

```ts
function createCommentVNode(text: string = '', asRoot: boolean = false): VNode;
```

**示例：**

```ts
import { createCommentVNode } from '@lytjs/vdom';

// 条件渲染时生成注释节点作为占位
const comment = createCommentVNode('v-if placeholder');
```

---

### cloneVNode()

克隆 VNode，保留原始属性并可覆盖。

```ts
function cloneVNode(
  vnode: VNode,
  extraProps?: Record<string, unknown> | null,
  mergeExtraProps?: boolean,
): VNode;
```

**示例：**

```ts
import { cloneVNode, h } from '@lytjs/vdom';

const original = h('button', { class: 'btn', disabled: false }, 'Click');
const cloned = cloneVNode(original, { disabled: true });
// cloned 的 class 保持不变，disabled 被覆盖为 true
```

---

### mergeProps()

合并多个 VNode 的属性。

```ts
function mergeProps(...args: VNodeData[]): VNodeData;
```

**示例：**

```ts
import { mergeProps } from '@lytjs/vdom';

const base = { class: 'base', id: 'main' };
const override = { class: 'override' };

const merged = mergeProps(base, override);
// { class: 'override', id: 'main' }
```

---

### normalizeChildren()

规范化子节点，确保 children 符合 VNode 格式。

```ts
function normalizeChildren(vnode: VNode, children: VNodeChildren): void;
```

---

## VNode 类型判断

### isVNode()

判断对象是否为 VNode。

```ts
function isVNode(value: unknown): value is VNode;
```

---

### isSameVNodeType()

判断两个 VNode 是否类型相同（用于 diff 算法优化）。

```ts
function isSameVNodeType(a: VNode, b: VNode): boolean;
```

---

### isFragment()

判断是否为 Fragment 节点。

```ts
function isFragment(vnode: VNode): boolean;
```

---

### isTextVNode()

判断是否为文本节点。

```ts
function isTextVNode(vnode: VNode): boolean;
```

---

### isCommentVNode()

判断是否为注释节点。

```ts
function isCommentVNode(vnode: VNode): boolean;
```

---

### hasPatchFlag()

检查 VNode 是否包含特定 PatchFlag。

```ts
function hasPatchFlag(vnode: VNode, flag: PatchFlags): boolean;
```

---

## Fragment 工具

### createFragment()

创建一个 Fragment 节点。

```ts
function createFragment(children?: VNodeChildren): VNode;
```

---

### isFragmentVNode()

判断 VNode 是否为 Fragment 类型。

```ts
function isFragmentVNode(vnode: VNode): boolean;
```

---

### getFragmentChildren()

获取 Fragment 的子节点。

```ts
function getFragmentChildren(vnode: VNode): VNode[];
```

---

### getFragmentChildCount()

获取 Fragment 子节点数量。

```ts
function getFragmentChildCount(vnode: VNode): number;
```

---

## Block Tree 运行时

Block Tree 是 LytJS 编译时优化的核心机制。通过 `openBlock` 和 `createBlock` 配合 PatchFlags，实现节点级别的精确更新。

### openBlock()

打开一个 Block，开启动态节点追踪。

```ts
function openBlock(): void;
```

---

### closeBlock()

关闭当前 Block。

```ts
function closeBlock(): void;
```

---

### createBlock()

创建一个 Block（动态节点容器）。

```ts
function createBlock(
  type: VNodeTypes,
  props?: VNodeData,
  children?: VNodeChildren,
  flags?: number,
): VNode;
```

**示例：**

```ts
import { openBlock, createBlock, createVNode } from '@lytjs/vdom';

openBlock();
const block = createBlock('div', { class: 'container' }, dynamicChildren);
closeBlock();
```

---

### trackDynamicChild()

追踪动态子节点（编译时由 transform 插件调用）。

```ts
function trackDynamicChild(index: number, child: VNode): void;
```

---

### isBlock()

判断 VNode 是否为 Block。

```ts
function isBlock(vnode: unknown): vnode is VNode;
```

---

### getCurrentBlock()

获取当前打开的 Block。

```ts
function getCurrentBlock(): VNode | null;
```

---

### getBlockStackDepth()

获取 Block 栈深度。

```ts
function getBlockStackDepth(): number;
```

---

### resetBlockStack()

重置 Block 栈。

```ts
function resetBlockStack(): void;
```

---

## 列表 Diff

### patchKeyedChildren()

对带 key 的子节点列表进行高效 diff。

```ts
function patchKeyedChildren(
  c1: VNode[],
  c2: VNode[],
  parent: VNode,
  parentInstance: ComponentInternalInstance,
): void;
```

**算法：** 基于最长递增子序列 (LIS) 的移动优化，时间复杂度 O(n)。

---

### patchUnkeyedChildren()

对不带 key 的子节点列表进行 diff。

```ts
function patchUnkeyedChildren(
  c1: VNode[],
  c2: VNode[],
  parent: VNode,
  parentInstance: ComponentInternalInstance,
): void;
```

---

### registerDOMOperations()

注册 DOM 操作回调（用于性能分析）。

```ts
function registerDOMOperations(ops: DOMOperations): void;
```

**DOMOperations：**

```ts
interface DOMOperations {
  createElement?: (tag: string) => void;
  removeElement?: (el: unknown) => void;
  setElementText?: (el: unknown, text: string) => void;
  insertElement?: (el: unknown, parent: unknown, anchor: unknown) => void;
}
```

---

## Diff 工具

### canUseFastDiff()

判断是否可以使用快速 diff 算法（首尾元素相同时）。

```ts
function canUseFastDiff(c1: VNode[], c2: VNode[]): boolean;
```

---

### countNewNodes()

统计新增节点数量。

```ts
function countNewNodes(c1: VNode[], c2: VNode[]): number;
```

---

### countRemovedNodes()

统计移除节点数量。

```ts
function countRemovedNodes(c1: VNode[], c2: VNode[]): number;
```

---

## 渲染器

### createRenderer()

创建一个通用的平台无关渲染器。

```ts
function createRenderer<HN, HE>(options: RendererOptions<HN, HE>): Renderer<HN, HE>;
```

**示例：**

```ts
import { createRenderer } from '@lytjs/vdom';
import { webHost } from '@lytjs/adapter-web';

const renderer = createRenderer(webHost);
renderer.render(vnode, container);
```

---

## 工具函数

### isStaticVNode()

判断是否为静态节点（无动态属性）。

```ts
function isStaticVNode(vnode: VNode): boolean;
```

---

### isDynamicVNode()

判断是否为动态节点。

```ts
function isDynamicVNode(vnode: VNode): boolean;
```

---

### getVNodeText()

获取 VNode 的文本内容。

```ts
function getVNodeText(vnode: VNode): string;
```

---

### hasDynamicChildren()

检查 VNode 是否有动态子节点。

```ts
function hasDynamicChildren(vnode: VNode): boolean;
```

---

### collectDynamicChildren()

收集所有动态子节点。

```ts
function collectDynamicChildren(vnode: VNode): VNode[];
```

---

### hasArrayChildren()

检查 children 是否为数组。

```ts
function hasArrayChildren(vnode: VNode): boolean;
```

---

### hasTextChildren()

检查 children 是否为文本。

```ts
function hasTextChildren(vnode: VNode): boolean;
```

---

### getArrayChildren()

获取数组形式的 children。

```ts
function getArrayChildren(vnode: VNode): VNode[];
```

---

## 类型

### VNode

```ts
interface VNode {
  type: VNodeTypes;
  props: VNodeData | null;
  children: VNodeChildren | null;
  el: HostNode | null;
  key: string | null;
  ref: unknown;
  flags: number;
  shapeFlag: number;
  sourceLocation?: VNodeSourceLocation;
}
```

---

### VNodeTypes

```ts
type VNodeTypes = string | Component | FunctionalComponent | symbol;
```

---

### VNodeChildren

```ts
type VNodeChildren = VNode[] | string | number | null;
```

---

### VNodeData

```ts
interface VNodeData {
  key?: string | number;
  ref?: unknown;
  class?: string | string[] | Record<string, boolean>;
  style?: string | Record<string, string | number>;
  [key: string]: unknown;
}
```

---

### ShapeFlags

```ts
enum ShapeFlags {
  ELEMENT = 1, // 元素
  FUNCTIONAL_COMPONENT = 1 << 1, // 函数式组件
  STATEFUL_COMPONENT = 1 << 2, // 有状态组件
  TEXT_CHILDREN = 1 << 3, // 文本子节点
  ARRAY_CHILDREN = 1 << 4, // 数组子节点
  SLOTS_CHILDREN = 1 << 5, // 插槽子节点
  TELEPORT = 1 << 6, // Teleport
  SUSPENSE = 1 << 7, // Suspense
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // KeepAlive
  COMPONENT_KEPT_ALIVE = 1 << 9, // 保持激活
  FRAGMENT = 1 << 10, // Fragment
}
```

---

### PatchFlags

```ts
enum PatchFlags {
  TEXT = 1, // 文本内容变化
  CLASS = 2, // class 变化
  STYLE = 4, // style 变化
  PROPS = 8, // props 变化（除 class/style/event）
  FULL_PROPS = 16, // 完整 props 变化
  HYDRATION_EVENTS = 32, // 合成事件绑定
  NEED_PATCH = 32, // 需要 patch
  STABLE_FRAGMENT = 64, // 稳定 Fragment
  KEYED_FRAGMENT = 128, // 带 key 的 Fragment
  UNKEYED_FRAGMENT = 256, // 不带 key 的 Fragment
  DYNAMIC_SLOTS = 512, // 动态插槽
  DEV_ROOT_FRAGMENT = 1024, // 开发环境根 Fragment
  HOISTED = -1, // 静态提升
  BAIL = -2, // 退出优化
}
```

---

## PatchFlags 常量

### describePatchFlag()

获取 PatchFlag 的描述文本。

```ts
function describePatchFlag(flag: PatchFlags | number): string;
```

**示例：**

```ts
import { describePatchFlag, PatchFlags } from '@lytjs/vdom';

describePatchFlag(PatchFlags.TEXT); // 'TEXT'
describePatchFlag(PatchFlags.CLASS); // 'CLASS'
```
