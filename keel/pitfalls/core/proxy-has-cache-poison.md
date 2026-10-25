---
scope: core
status: active
severity: P1
last-verified: 2026-10-25
triggers: 1
keywords: [Proxy, has, get, accessCache, 缓存, 桶, 公共实例, 探测污染]
---

## 症状

`'x' in obj` 为真，紧接着 `obj.x` 却是 `undefined`；只在**这个顺序**下复现（先取值再探测正常）。
同一个 key 一旦被探测过，之后所有读取永久为空。

## 根因

代理用 `accessCache` 缓存"该 key 属于哪个来源桶"，`get` 按桶去取。`has` 命中后只写一个
粗粒度标记（`CONTEXT`，语义"在 target 上"），`get` 读到就**只去 `target` 取值** ——
而命中其实来自 `setupState`/`data`/`props`，值不在 `target` 上 ⇒ `undefined`。
缓存是**粘性**的 ⇒ 一次探测污染该 key 之后全部读取。

## 正解

- `has` 与 `get` **共用同一套桶判定**，写缓存时写**命中的那个桶**；
- 判据必须成对：`expect('k' in vm).toBe(true)` 紧跟 `expect(vm.k).toBe(值)` ——
  只测 `in` 或只测取值都发现不了（本项目 30 条电池，回退源码后 10 条同时变红）。
