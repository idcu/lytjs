---
scope: core
status: active
severity: P1
last-verified: 2026-10-13
triggers: 1
keywords: [平行实现, 只修一处, 双触发, 冒泡]
---

## 症状

同一能力一条路径正常、另一条不生效（或**发生两次**），不报错、测试绿。
实测：① 钩子在 `core` 正常、`core-vnode` **一个都不触发**；
② `Slider` 按一次 ArrowRight 前进 **2 个 step**，回调被调 **2 次**。

## 根因

**同族副本未被识别为同一缺陷的多个载体**。三形态：
- **平行实现**：两条 `createApp` 修钩子只改一份，消费侧 `?.()` ⇒ 静默跳过；
- **修一处漏一处**：`emit('input', v)` 已调 `props.onInput`，其后又直接调一次 ⇒ 双触发；
  只修了 `handleKeydown`，漏 `handleMouseMove` / `handleMouseUp`；
- **父子同 handler**：同一 handler 挂根与把手，子元素在容器内 ⇒ 冒泡后再处理一次。

## 正解

- 先 grep **消费点**再 grep **写入点**：有几个改几个；
- handler 只挂**真正可聚焦 / 可交互**的那个元素；容器不可聚焦就别挂；
- 判据：每条路径写用例并断言**恰好一次**（`toEqual([x])`，不用 `toContain`）。
