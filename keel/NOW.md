---
scope: now
status: active
last-verified: 2026-11-05
updated: 2026-11-05
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》：A 阶段止血已完成；正在推进 A08–A10（响应式 / signal 安全 /
core-signal 诚实化）。

## 11-05 完成（A01–A08 / A14）
- **A01–A03** 锁文件守卫、8720 测试全绿、ESLint 45 errors 清零；slow 14/14。
- **A05** 五个合并/克隆入口统一拒绝 `__proto__/constructor/prototype`；负向注入 2 红。
- **A08** 响应式三处语义缺口：`reactive` 解包函数型 Signal（读 + 写穿）；`Map.set`
  新增 key 按 ADD 触发（`size`/`keys()` 跟随），去掉 add/delete 重复 ITERATE（曾双跑），
  非字符串 key 回落 ITERATE；`computedSignal` 求值设 activeEffect（getter 读 reactive 可追踪）。
  `check-reactivity-semantics` 23 条（fast）；回退三处分别 5/5/3 红；reactivity 385/385。
- **A04 / D1** `optimizeSignal` 默认关；基础 codegen 修四类静默丢内容 + `:key` 从未生效。
  `check-compiler-parity` 入库（分叉基线只减不增）；注入切回优化器 ⇒ 6 红；1669/1669。决策 `0012`。
- **A14 / D2** Golden 20 冻结：20 stable，41 个保留导出但 `experimental`+note；
  `mislabeled_stable=0`；注入（Table→stable）立红。决策 `0013`。
- **A06** CLI：SSR 用 `createApp(App)` 注入模板编译器（此前每请求 500）；未知模板抛错；
  JSX 产物 `.tsx`；SFC `{{ title }}`；service/store 改 signal `set()/update()`；插件 tsconfig 内联。
  `check-scaffold` 113 条（6 模板 `tsc --noEmit` + 真启 SSR 断言 200/`Hello LytJS!` + 未知模板抛错）；
  注入：去掉 `createApp()` ⇒ [7] 红（500）。
- **A07** 循环检查器递归化：61 → **76/76**，断言「扫描数 == manifest 目录数」；`--src` 0 新增，
  dist 76 包 0 环；基线只减不增。注入：在旧实现漏掉的 `ssg` 包造环 ⇒ 新增 1 条、退出 1。
- 门禁：fast 42/42（120s）；slow 14/14（651s）。

## 下一步（本批剩余）
1. **A09** signal `v-html` 消毒与 vnode 对齐；**A10** core-signal `setup` 第二参 /
   `inject<T>` 诚实化。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发清 .tmp / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |
