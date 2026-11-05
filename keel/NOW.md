---
scope: now
status: active
last-verified: 2026-11-05
updated: 2026-11-05
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》A 阶段止血：验证链、配置安全、signal 编译保真、组件契约诚实化
（Golden 20）与 CLI 脚手架（A06）已完成；剩余 A07 循环依赖扫描。

## 11-05 完成（A01–A06 / A14）
- **A01–A03** 锁文件守卫、8720 测试全绿、ESLint 45 errors 清零；A-1 slow 首次 14/14。
- **A05** 五个合并/克隆入口统一拒绝 `__proto__/constructor/prototype`，负向注入 2 红。
- **A04 / D1** `optimizeSignal` 默认关；基础 codegen 修四类静默丢内容 + `:key` 从未生效。
  `check-compiler-parity`（fast，5 模板真实 DOM + 更新）；优化器分叉基线只减不增。
  注入验证（默认切回优化器 ⇒ 6 项红）；compiler 1669/1669。
  决策 `decisions/0012-signal-optimizer-default-off.md`。
- **A14 / D2** Golden 20 冻结：仅 20 个 stable，其余 41 个保留导出但 `experimental` + note。
  `check-component-status`（fast）输出 `mislabeled_stable = 0`；注入（Table→stable）立红。
  决策 `decisions/0013-golden-20-freeze.md`。
- **A06** CLI：SSR 模板用 `createApp(App)` 注入模板编译器（此前每请求 500）；未知模板抛错；
  component/page/layout 含 JSX ⇒ `.tsx`；SFC `{{ title }}`；service/store 改 signal
  `set()/update()`；插件 tsconfig 内联。`check-scaffold` 113 条：6 模板 `tsc --noEmit`
  （抓到 router/full `components` 缺类型 ⇒ 补 `ComponentOptions`）+ 真启 SSR 断言 200/
  `Hello LytJS!` + 未知模板抛错。注入：去掉 `createApp()` ⇒ [7] 红（500）。
  门禁数字：fast 41/41（120s）；slow 14/14（651s）。

## 下一步
1. **A07**：循环依赖扫描覆盖全部包 + 递归化，批末复跑 fast。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发清 .tmp / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |
