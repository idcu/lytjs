---
scope: now
status: active
last-verified: 2026-10-25
updated: 2026-10-25
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾（行为电池）+ 缺陷按 ADR 0010 二分 + 平行实现按 ADR 0011 收敛；棘轮只上不下。UI 走非 UI 车道。

## 覆盖率实测（10-24 五跑）
全局 **79.42%**（+2.16pt）。非 UI 未覆盖 Top：`treeShaking` 250（未完成）、
`codegen-signal-optimized` 176、`dom-runtime/index` 115。快照 `~/.workbuddy-ai/tmp/cov-1024/`

## 10-25 完成（2 电池 / 39 守卫）
- **devtools/panel/performance**（14，含既有 20）→ 三个面板的**带参命令读 `msg.data`** 而契约是
  `payload` ⇒ 取指标**连回包都没有**、改配置纹丝不动；`panel/index` 切页签/选组件同样失效。
  另补 FPS（rAF）、`findSlowRenders`、`performance.memory`。⚠️ `devtools` 有**两个包**。
- **renderer/ssr/ssr-stream**（25）→ **真实 `<Suspense>` 输出空串**：判别要求「组件位」而真实 vnode 是
  `ARRAY_CHILDREN|SUSPENSE`；插槽读 `props.default` 而框架放在 `children`。**`setup()` 返回渲染函数**
  时 SSR 也为空（解析助手只认 vnode / setup 对象 + render）——同步与流式两入口皆空。

## 10-24 摘要（5 电池 / 126 守卫）
- plugin-sdk（schema 不校验、不等异步 install）· events（多类型失效）· time-travel（无游标）·
  transition-group（判别靠 name）· test-utils（mount 未 await）。覆盖率 77.26% → **79.42%**。

## 下一步
1. **非 UI 车道**：Top 缺口已清完 ⇒ **重跑覆盖率重排**再定方向。
2. 按 ADR 0010 判定 UI 剩余项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用返回假记录；`suspensible`、`ServerComponentOptions` 的 3 个输出选项、
   HMR 的 `_preservation`/`mounted`、`appConfig.performance` 从未读取；**core 与 core-vnode 各有
   一份 `createApp`**（ADR 0011 第三例）；`TransitionGroup` 组件是 pass-through。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**，曾回退源文件） | 串行 | 显式路径 add；改完**立刻验证文件内容** |
