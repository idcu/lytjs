---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [Suspense, fallback, 设计项目, vdom, 暂缓]
type: decision
created: 2026-10-05
superseded-by:
---

# 0002 `<Suspense>` fallback 暂缓（设计项目）

## 背景

实测四处耦合：① `patchSuspense` 在挂载子组件**之前**检查 `isAsyncPlaceholder`（恒 false）；
② `suspenseLinker` 桥接要求 `vnode.component`，shapeFlag 分派下实例永不创建（死代码）；
③ 切回依赖"下次更新的 patchSuspense"而**无触发器**；④ "卸载 default 再重挂"会重新触发
async setup ⇒ 反复进 fallback。另：只支持数组形态 children。

## 决定

**暂缓实现**。维持既有 `it.fails`（KNOWN_FAIL）判据作为修复验证器；不做局部补丁式假修复。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 只调正 `isAsync` 检查顺序 | 只遮表层，②③ 仍在，fallback 依旧不可达 |
| 卸载/重挂 default | 反复触发 async setup，引入新缺陷面 |
| 删掉 Suspense 用例 | 丢失"修复验证器"，违反 KNOWN_FAIL 纪律 |

## 影响

- 4 条 KNOWN_FAIL 继续挂在 `packages/renderer/tests/*suspense*`；
- 重新评估条件：vdom 为 Suspense 引入实例或显式触发机制时。
