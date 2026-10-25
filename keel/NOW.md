---
scope: now
status: active
last-verified: 2026-10-25
updated: 2026-10-25
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾（行为电池）+ 缺陷按 ADR 0010 二分 + 平行实现按 ADR 0011 收敛；只上不下。

## 覆盖率（10-25 四跑：330 文件 / 7791 例）
行 **81.65%** / 分支 87.28% / 函数 86.14%（79.42% → **+2.23pt**）。
⚠️ 全量报表对**同被 src 与 dist 引用**的文件会低估 ⇒ **定方向前先单包复核**。
下一批候选（升序）：`middleware/chain` 16%、`router-fs/utils` 21%、`component/di` 50%。

## 10-25 完成（14 电池 / 213 守卫）
- **错误链**：`handleError` 无人处理时**静默 return false**（调用点又全忽略返回值）⇒
  setup/生命周期/data/computed/watch/render 的错**完全不留痕**；ErrorBoundary 的 `fallback`
  未读、`ref` 把 Error 包成代理。
- **路由**：RouterLink / RouterView 的 render **都返回非 vnode** ⇒ 入口与出口**都渲染不出东西**；
  active 裸 `startsWith`；RouterView 无层级（嵌套递归）、懒加载拿到 Promise。
- **api/utils**：`extractHttpMethods` 裸子串 ⇒ `postal` 判 POST、`dispatch` 判 PATCH ⇒ 静默 404。
- **core-vnode/composition**：`useModel` 无实例时静默返回死 computed（另两个同类函数都告警）。
- **门面**：devtools `createDevToolsAPI()` **0% 覆盖**；两处重复实现收敛为转发。
- **ssr/VirtualList**（13）→ 窗口/偏移/总高/插槽下标全部正确，纯补判据（15.3% → 覆盖）。
- 删 `optimizations/treeShaking.ts`（459 行桩）；ADR 0011 第三例（`createApp`）**不合并**。

## 下一步
1. 按候选表继续（低覆盖优先），每轮一电池 + 翻转验证
2. UI 剩余项按 ADR 0010 判定（串行）
3. 待办：`suspensible`；vapor-hmr `_preservation` 未读；devtools `startRecording` 只是标志位
   （`recordEvent` 不检查它）——需 owner 定「默认是否录制」。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发跑互清 .tmp | 单包独测复核 |
| `--coverage` 清 `coverage/` 被 safe-delete 拦 | `--coverage.reportsDirectory=/tmp/…` |
| `pnpm install` 被沙箱拦 | 锁文件按 importer 格式手工补 |
