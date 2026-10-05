---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [SSR, hydration, hydrateMarkers, 默认值, breaking]
type: decision
created: 2026-10-05
superseded-by:
---

# 0003 主 SSR 水合标记默认关

## 背景

`hydrateVisible` 需要 `data-hydrate` 标记才能选元素，而主 `renderToString` 不写任何水合标记
（只有 ssr-kit 写）。给主 SSR 加标记会改变**所有人**的 HTML 输出（含体积与缓存键）。

## 决定

`SSRInput.hydrateMarkers?: boolean` **默认 false**；开启后按本次渲染内顺序写
`data-hydrate="lyt-hydrate-N"`（与 ssr-kit 格式一致，计数器按调用创建、不串号）。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 默认开启 | 对既有输出 = breaking change，不该由框架悄悄做 |
| 只改 ssr-kit | 主 SSR 路径的选择性水合仍不可用 |

## 影响

- 判据 3 条：默认不写 / 顺序 1-2-3 无 4 / 两次渲染一致；
- 端到端选择性水合仍需调用方显式开 `hydrateMarkers`。
