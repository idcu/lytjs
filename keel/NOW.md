---
scope: now
status: active
last-verified: 2026-11-05
updated: 2026-11-05
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》A 阶段止血（验证链 / 配置安全 / signal 编译保真 / 组件契约 /
CLI 脚手架 / 循环扫描）已全部完成；进入 B 阶段。

## 11-05 完成（A01–A07 / A14）
- **A01–A03** 锁文件守卫、8720 测试全绿、ESLint 45 errors 清零；slow 14/14。
- **A05** 五个合并/克隆入口统一拒绝 `__proto__/constructor/prototype`；负向注入 2 红。
- **A04 / D1** `optimizeSignal` 默认关；基础 codegen 修四类静默丢内容 + `:key` 从未生效；
  `check-compiler-parity`（fast，5 模板真实 DOM + 更新）入库，分叉基线只减不增。
  注入：默认切回优化器 ⇒ 6 项红；compiler 1669/1669。决策 `0012`。
- **A14 / D2** Golden 20 冻结：仅 20 个 stable，其余 41 个保留导出但 `experimental` + note。
  `check-component-status` 输出 `mislabeled_stable = 0`；注入（Table→stable）立红。决策 `0013`。
- **A06** CLI：SSR 用 `createApp(App)` 注入模板编译器（此前每请求 500）；未知模板抛错；
  JSX 产物 `.tsx`；SFC `{{ title }}`；service/store 改 signal `set()/update()`；插件 tsconfig 内联。
  `check-scaffold` 113 条：6 模板 `tsc --noEmit`（抓到 `components` 缺类型 ⇒ 补
  `ComponentOptions`）+ 真启 SSR 断言 200/`Hello LytJS!` + 未知模板抛错。
  注入：去掉 `createApp()` ⇒ [7] 红（500）。
- **A07** 循环检查器递归化：61 → **76/76**，断言「扫描数 == manifest 目录数」；
  `--src` 退出 0（8 条基线内，新增 0），dist 同 76 包 0 环；基线只减不增。
  注入：在旧实现漏掉的 `ssg` 包里造环 ⇒ 新增 1 条、退出 1。
- 门禁：fast 41/41（120s）；slow 14/14（651s）。

## 下一步（下一批，≤5 任务）
1. **A08** 响应式三处语义缺口；**A09** signal `v-html` 消毒与 vnode 对齐；
   **A10** core-signal `setup` 第二参 / `inject<T>` 诚实化。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发清 .tmp / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |
