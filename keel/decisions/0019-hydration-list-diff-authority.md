---
scope: core
status: active
last-verified: 2026-11-07
keywords: [hydration, 水合, list diff, keyed diff, 单一权威, ADR 0011, ADR 0017]
type: decision
created: 2026-11-07
superseded-by:
---

# 0019 · hydration / keyed list diff 的单一权威

## 背景

评估报告 P0-4 记录了两处同一语义的多套实现：

- hydration：`adapter-web/src/web-hydration.ts`（约 518 行）与
  `renderer/src/hydration/enhanced-hydration.ts`（约 790 行）。
  后者内部又调用 `renderer/src/ssr/ssr-island.ts` 的 `hydrateVNode` 副本。
- keyed list diff：`vdom/src/list-diff.ts` 的 `patchKeyedChildren` 与
  `dom-runtime/src/index.ts` 的 `reconcileArray` 各自实现 key 匹配 / 移动。

ADR 0011 要求同名能力只保留一份权威实现，其余入口只转发。

## 决策

### 1. hydration

- **唯一匹配实现**：`@lytjs/adapter-web` 的 `hydrateNode` / `hydrateVNodeTree`。
  `createHydrationFunctions` 保留公开导出（删除属破坏性变更），内部调用
  `hydrateVNodeTree`。
- `renderer/src/hydration/enhanced-hydration.ts` 的 `hydrateApp` 不再调用
  `ssr-island.hydrateVNode`，改为调用 `hydrateVNodeTree`。它仍负责
  选择性 / 懒加载 / 统计 / 错误恢复等编排，不复制匹配逻辑。
- `createApp(root).mount(el, { hydrate: true })` 走 vdom 渲染器自带的
  **交互式水合**（会建立组件实例与响应式 effect），与本条不是同一条产品路径；
  其行为由 `scripts/check-hydration.mjs`（52 条断言）守住。
- **残留债**：`ssr-island.ts` 的 `hydrateVNode` 仍是 island 内部副本，
  已在 `public-names.json` 的 `hydration` 条目登记；不属 S12 范围。

### 2. keyed list diff

- **唯一算法**：`@lytjs/common-algorithm` 的 `planKeyedDiff` 负责
  key 匹配（含无 key 节点的类型匹配）与 LIS 最小移动计划。
- `vdom/src/list-diff.ts` 的 `patchKeyedChildren` 只把计划应用到 vnode
  （patch / unmount / move）。
- `dom-runtime/src/index.ts` 的 `reconcileArray` 只把计划应用到 signal 路径
  的 DOM 节点，不再自建 key 匹配表（满足登记册的「只允许委托」）。
- 两条路径的输入模型不同（vnode vs item），DOM 应用层必然不同；
  但「哪些节点复用、哪些删除、哪些移动」只有一份实现。

## 验收证据

- `check-hydration`：**52/52** 全绿（原 52 条不变）。
- 新增 `check-list-diff`（fast）：10 组列表变化，**36/36** 全绿，
  覆盖 DOM 结构/顺序、节点复用、删除项移除。
- 负控：把 `reconcileArray` 的 `getNewKey` 注入为倒序索引后，
  `check-list-diff` **27/36**、退出码 1；恢复后 36/36。
- `adapter-web` 152 测试、`renderer` 652 测试、`vdom` 573、`dom-runtime` 204 全绿。

## 后果与边界

- `hydrateApp` 现在与 `createHydrationFunctions` 共用匹配实现，根级多余节点
  也统一由 `hydrateVNodeTree` 裁掉（此前只有 island 路径会裁）。
- 不重构 renderer：island 内部水合仍保留，待单独任务收敛。
- keyed diff 的 DOM 应用层差异（vnode patch vs fragment 重建）保留；
  新增任一 keyed diff 实现必须重新登记到 `public-names.json`。
