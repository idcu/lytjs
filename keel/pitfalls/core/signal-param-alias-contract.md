---
scope: compiler
status: active
severity: P1
last-verified: 2026-11-06
triggers: 1
keywords: [SignalRenderer, new Function, 参数名, 短别名, import 剥离, ReferenceError]
---

## 症状

`SignalRenderer` 渲染时报 `ReferenceError: <单字母> is not defined`，栈里没有模板行号；
编译产物单独看却完全正常（import 都在）。

## 根因

`signal-renderer.ts` 把产物 `import{...}from'...';` 按行剥掉，helper 只能靠
`new Function(paramNames, ...)` 的参数名注入。也就是说：

- 编译器 `RUNTIME_SHORT_NAMES`（产物调用点短名）
- 产物首行 `//lytjs-signal:<短名>=<原名>;`（人工映射）
- renderer 的 `paramNames` / args 顺序

三者是**同一契约的三种表示**，必须同步。改任意一侧而漏改另一侧 ⇒ 断链。

## 正解

- 改别名表时，同一提交内改 `paramNames` + args；
- 首行映射只是注释，不参与执行，不能依赖它“自动还原”；
- 任何涉及产物的改动都跑 `scripts/check-compiler-parity.mjs`（它会真实执行产物）。
