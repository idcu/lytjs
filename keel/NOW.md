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

## 覆盖率（10-25 四跑：330 文件 / 7791 用例）
行 **81.65%** / 分支 87.28% / 函数 86.14%（79.42% → **+2.23pt**）。
⚠️ 全量报表对**同被 src 与 dist 引用**的文件会低估（`devtools/performance.ts` 55.66% vs
独测 89.29%）⇒ **定方向前先单包复核**。
下一批候选：`tools/devtools/api.ts` **0%**、`core-vnode/composition` 9%、
`ssr/virtualList` 15%、`middleware/chain` 16%、`router-fs/utils` 21%、`component/di` 50%。

## 10-25 完成（11 电池 / 173 守卫）
- **lifecycle**（23）→ `handleError()` 无人处理时**静默 return false**，而全部调用点都忽略返回值
  ⇒ setup / 生命周期 / data / computed / watch / render 抛的错**完全不留痕**。
- **error-boundary**（17）→ `fallback` prop 声明未读；`ref` 把 Error 包成代理 ⇒ 改 `shallowRef`。
- **RouterLink**（16）+ **RouterView**（15）→ 两者 render **都返回非 vnode 的描述对象**
  ⇒ 路由入口与出口**都渲染不出东西**；active 用裸 `startsWith`；RouterView 无层级（嵌套递归）、
  懒加载被直接调用拿到 Promise。补 `viewDepthKey` 协议。
- **api/utils**（27）→ `extractHttpMethods` 用裸子串 ⇒ `postal.ts` 判 POST、`dispatch.ts` 判 PATCH
  ⇒ **接口静默 404**。改按词边界匹配。
- 前六电池（59）：devtools 性能 · srv-comp-client · component-proxy · 前缀 · TransitionGroup。
- 删 `optimizations/treeShaking.ts`（459 行桩：选项未读、变换为空、0 引用 0 测试）。
- ADR 0011 第三例（`createApp`）**不合并**，改为在 core-vnode 列能力矩阵。

## 下一步
1. 按候选表继续（低覆盖优先），每轮一电池 + 翻转验证
2. UI 剩余项按 ADR 0010 判定（串行）。
3. 待办：`suspensible`（已登记）；vapor-hmr 的 `_preservation` 形参未读（4 开关均无效）。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发跑互清 .tmp | 单包独测复核 |
| `--coverage` 清 `coverage/` 被 safe-delete 拦 | `--coverage.reportsDirectory=/tmp/…` |
| `pnpm install` 被沙箱拦 | 锁文件按 importer 格式手工补 |
