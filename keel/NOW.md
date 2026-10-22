---
scope: now
status: active
last-verified: 2026-10-23
updated: 2026-10-23
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。UI 由并行会话在写 ⇒ 走非 UI 车道。

## 覆盖率实测（10-22 四跑）
全局 **77.26%**。非 UI 未覆盖 Top：`treeShaking` 250、
`codegen-signal-optimized` 176/1629、`component/keep-alive` 117/334(65%)。快照 `~/.workbuddy-ai/tmp/cov-1022/`。

## 10-23 完成（1 电池 / 12 条新增）
- **devtools/panel/time-travel**（39 条，含既有 27）→ **面板命令读错字段**（`BridgeMessage` 是
  `payload`、处理器读 `msg.data`）⇒ 跳转/导入/取 diff **静默失效**；`jumpToHistory` 用
  `newValue !== undefined` ⇒ 值置 undefined 的变更跳不过去；`recordingDuration` 停止后仍增长；
  导入不过滤非对象条目 ⇒ 后续跳转 TypeError；`compareSnapshots` 遇 BigInt/循环引用抛错。

## 10-22 摘要（6 电池 / 170 守卫；明细见日志）
- 三个「机制空转」：`useTemplateRef` 恒 null、`useCssVars` 依赖未收集、HMR 生成代码空操作。
- 两个「跨层不一致」：`toHandlerKey` 缺 kebab→camel、渲染器批量 DOM 插反 + 资源表无写入方。

## 下一步
1. **非 UI 车道**：`component/keep-alive`(117, 65%) → `tools/test-utils`(162, 40%)。
2. 按 ADR 0010 判定 UI 剩余项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用返回假记录；`canRedo` 恒 false；`suspensible` 从未读取；
   `ServerComponentOptions` 的 3 个输出/前缀选项、HMR 的 `_preservation`/`mounted` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**，曾回退源文件） | 串行 | 显式路径 add；**改完立刻验证文件内容**；恢复 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 |
