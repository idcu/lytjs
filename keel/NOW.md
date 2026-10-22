---
scope: now
status: active
last-verified: 2026-10-22
updated: 2026-10-22
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。UI 由并行会话在写 ⇒ 走非 UI 车道。

## 覆盖率实测（10-22 四跑）
全局 **77.26%**。非 UI 未覆盖 Top：`treeShaking` 250、
`codegen-signal-optimized` 176/1629、`adapter-web/web-dom-renderer` 142/256(45%)。快照 `~/.workbuddy-ai/tmp/cov-1022/`。

## 10-22 完成（5 电池 / 146 守卫）
- **vdom/patch**（23，纯测试）→ 覆盖 legacy options 适配、组件更新的三条判定、事件清理注册表、
  三种 ref 卸载清理、Fragment move、hydrate 退化。**行为都对，未发现缺陷**。
- **vapor/vapor-hmr**（32）→ 生成的 accept 回调**是空操作**（HMR 接受但界面不变）；id 未转义
  ⇒ 含引号/反斜杠时生成的文件语法错误。
- **vdom/render-helpers**（40）→ **`toHandlerKey` 没转 kebab→camel**（事件键与 `emit()` 对不上）；
  静态节点多造、`renderList` 负数抛 RangeError、`_isVList` 可枚举、RegExp 退化。
- **core/composition**（24）→ **`useTemplateRef()` 恒为 null**；**`useCssVars()` 依赖从未被收集**。
- **reactivity/batch**（27）→ void 回调抛错、异步失败变 unhandledRejection、`flushBatchScopes` 空操作。

## 下一步
1. **非 UI 车道**：`adapter-web/web-dom-renderer`(142, 45%) → `devtools/panel/time-travel`。
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
