# @lytjs/common-vnode

LytJS VNode 类型定义与常量。提供 VNode 类型符号、形状/补丁标志枚举、VNode 类型定义，以及一组判断与描述工具函数。

## 安装

```bash
pnpm add @lytjs/common-vnode
```

## 使用示例

```ts
import {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
  isVNode,
  isFragment,
  isTextVNode,
  isCommentVNode,
  isSameVNodeType,
  hasPatchFlag,
  describePatchFlag,
  createBaseVNode,
} from '@lytjs/common-vnode';

const vnode = createBaseVNode({
  type: 'div',
  patchFlag: PatchFlags.CLASS | PatchFlags.STYLE,
});

isVNode(vnode); // true
isFragment(vnode); // false
describePatchFlag(vnode.patchFlag); // 'CLASS | STYLE'
hasPatchFlag(vnode, PatchFlags.CLASS); // true
```

## API 说明

### VNode 类型符号

- `Fragment` / `Text` / `Comment`——由 `Symbol.for()` 定义的全局唯一类型符号，用于区分 Fragment、文本与注释节点

### ShapeFlags / PatchFlags 枚举

- `ShapeFlags`——VNode 形状标志：`ELEMENT` / `FUNCTIONAL_COMPONENT` / `STATEFUL_COMPONENT` / `TEXT_CHILDREN` / `ARRAY_CHILDREN` / `SLOTS_CHILDREN` / `SUSPENSE` / `TELEPORT` / `COMPONENT_SHOULD_KEEP_ALIVE` / `COMPONENT_KEPT_ALIVE`
- `PatchFlags`——补丁标志：`TEXT` / `CLASS` / `STYLE` / `PROPS` / `FULL_PROPS` / `HYDRATE_EVENTS` / `STABLE_FRAGMENT` / `KEYED_FRAGMENT` / `UNKEYED_FRAGMENT` / `NEED_PATCH` / `DYNAMIC_SLOTS` / `DYNAMIC_CHILDREN` / `HOISTED`(-1) / `BAIL`(-2)

### VNode 类型定义

- `VNodeTypes`——`string | typeof Fragment | typeof Text | typeof Comment | object`
- `VNodeChildren` / `VNodeData` / `VNodeSourceLocation`
- `VNode`——完整的 VNode 接口（type / key / ref / props / shapeFlag / patchFlag / dynamicChildren / component / el 等）
- `ComponentPublicInstance` / `ComponentInternalInstance`——组件公共实例与内部实例接口（精简版，权威来源见各自包）
- `BaseComponentOptions`——基础组件选项接口

### 默认值与工厂函数

- `VNODE_DEFAULTS`——包含所有 VNode 字段默认值的常量对象
- `createBaseVNode(overrides)`——基于默认值创建完整 VNode，未指定的字段自动填充默认值

### 判断工具函数

- `isVNode(value)`——判断是否为 VNode（检查 `__v_isVNode` 标记）
- `isFragment(vnode)` / `isTextVNode(vnode)` / `isCommentVNode(vnode)`——分别判断是否为 Fragment / Text / Comment 类型
- `isSameVNodeType(n1, n2)`——判断两个 VNode 的 type 与 key 是否相同
- `hasPatchFlag(vnode, flag)`——判断 VNode 是否包含指定 patch flag（HOISTED/BAIL 视为恒真）
- `describePatchFlag(flag)`——将 patch flag 描述为可读的名称字符串

## 相关包

- [`@lytjs/common`](../common/README.md) — 聚合包，re-export 全部 `@lytjs/common-*` 子包

## 许可证

[MIT](../../../../LICENSE)
