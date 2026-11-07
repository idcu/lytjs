---
scope: architecture
status: active
resolution: pending
last-verified: 2026-11-08
keywords: [S22, host-contract, RendererHost, 宿主, 接入, 前置条件]
type: decision
created: 2026-11-08
superseded-by:
---

# 0025 · host-contract 接入暂缓：前置条件是出现第二个宿主目标

## 背景

S22 任务行原写「`shared-types` / `host-contract` 进 core/component/dom-runtime」。
现状（2026-11-08 实测）：`@lytjs/host-contract` 已有公开契约
（`RendererHost` / `HostRect` / `HostEvent` / `TransitionDurationInfo` 等），
消费方是 vdom、adapter-web、renderer 与 5 个 common 子包（均为 type import），
**实现只有 Web 一侧**（`adapter-web/src/web-host.ts` 的 `WebRendererHost`）。

## 决定

**维持不接**：不把 host-contract 引入 core / component / dom-runtime。
接入的前置条件写成可判定的门槛，而不是「以后再说」。

## 前置条件（全部满足才重新裁决）

1. **出现第二个宿主目标**：一个非 DOM 的 `RendererHost` 实现（如 canvas /
   terminal / native），且它与 Web 实现共享同一契约、有不同的宿主原语。
2. 该目标的消费方需要**跨包**拿到 `RendererHost` 类型，而不是在包内自定义。
3. 接入能减少重复定义或消除 `as unknown as`（有实测计数），而不是为对称而接。

只有 Web 一个实现时，把契约塞进 core/component/dom-runtime 只会增加
依赖层级和产物体积，判据（`check-deps` / bundle 上限）反而更难守。

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| 按任务行照字面接入 | 只有一个宿主实现，接入没有消费者，等于为接而接 |
| 把 `RendererHost` 复制进 core | 两份契约必然漂移，重演「同名多实现」缺陷族 |
| 先删 host-contract 并入 vdom | 已发布且有公开导出面，删除需独立批次与迁移路径 |

## 后果

- 好处：S22 收尾不再悬着「接不接」；门槛可判定，避免半年后重复讨论。
- 代价：core/component/dom-runtime 仍看不到宿主契约；第二个宿主目标出现时
  需要重新评估依赖方向（可能触碰 ARCHITECTURE 分层）。
