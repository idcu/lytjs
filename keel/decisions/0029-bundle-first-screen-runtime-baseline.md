---
scope: meta
status: active
last-verified: 2026-11-12
keywords: [bundle, 体积预算, first-screen-runtime, 基线上调, 决策]
type: decision
created: 2026-11-12
superseded-by:
---

# ADR 0029 · first-screen-runtime 基线签字上调（+182 B）

- 状态：**已批准**（owner 2026-11-12）。
- 决策：仅 `first-screen-runtime` baseline 37466 → **37648 B**（预算 38400 B）；
  其余入口与 `minimal-app` 硬上限 95948 B 不变，容忍度 2% 与判据不变。
- owner 明确：留 **54 B（约 0.14%）** 余量，用于避免逐笔体积裁决；
  **该余量不留给未来功能增长**。

## 逐提交归因（可复现）

隔离重建相关包 dist 后实测。先以 `4197fd10` 源码复测得 38245 B，
与审计报告逐字节一致，确认测量口径无漂移。

| 源码状态 | 实测 | 增量 |
| --- | --- | --- |
| `c99a2478`（ADR 0027 记录 38157） | 38157 | — |
| `d7ac26f4` security SSR URL 白名单 | 38179 | +22 |
| `ed74f751` defineExpose | 38179 | 0 |
| `22c3c81c` Suspense 口径 | 38179 | 0 |
| `4197fd10` kebab 属性/事件 | 38245 | +66 |
| 本批 `ab2bf164` sanitizeHTML XSS | 38304 | +59 |
| 本批 `0c6460e7` hoisted vnode 克隆 | 38346 | +42 |

本批两笔的增量用「单独回退一方再重建」拆分实测：59 + 42 = 101，
与 38245 → 38346 的总增量一致。基线 37648 不是实测值，而是判据的
+2% 基数：floor(37648 × 1.02) = 38400，恰好覆盖 38346 并留 54 B。

## 无「可回退的不必要依赖」的证据

- 首屏闭包 = 入口 + 静态 import 可达 chunk：111.2 KB raw / 38346 B gzip，
  编译器不在闭包内，闭包内 `src` 输入为 0（无 tsconfig paths 泄漏）。
- `plugin` 14.3 KB raw：`createApp().use()` 静态可达 `PluginRegistry` /
  `PluginValidator`，改动态 import 会破坏同步 API，不属可回退依赖。
- `security` 4.0 KB raw：`v-html` 经 `dom-runtime` 调用 `sanitizeHTML`，
  是运行期真路径，非仅 re-export。
- 其余模块（vdom / reactivity / component / error）均被 `createApp` 运行路径引用；
  未发现重复打包或可删的整包依赖。

## 体积专项债务（登记，不在本轮做）

- `plugin` 与 `common-error` 目录改为按需加载（懒实例化 + 模块拆分），
  预期可降首屏数 KB。
- 后续任何入口再上调，必须先提交减重尝试与实测对比，证明不可行后才走本 ADR 流程。

## 未采纳备选

- 长期红：会持续阻挡 slow 档门禁，等于拿债务换绿灯。
- 立即做体积专项：打断 P0 收口，owner 裁决另起批次。
