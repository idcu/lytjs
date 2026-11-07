---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S10 完成（属性安全三模式统一），下一步 S11 style 单位。

## 11-07 完成
- **S01** `check-deps`+`check-src-hygiene` 入 gate；`check:fast` 与 CI 改委托 `gate.mjs`。
- **S02** `check-deps` 补 24 包层级、删 7 幽灵包名；未登记包/依赖直接红；覆盖 **76/76**，fast **50/50 · 138.1s**。
- **S06** 富实现下沉 `@lytjs/component`，core/core-vnode 只转发；契约按 core，行为 27 例绿。
- **S07** `h/directives/composition/lifecycle` 权威收敛到 `@lytjs/core-vnode`；7 例对拍，fast **50/50 · 126.1s**。
- **S08** 修饰符表/解析/拦截收敛到 `@lytjs/common-events`；三路径共用
  `isEventModifierIntercepted`；三模式对拍 11 例，check-event-semantics 45/45；fast **50/50 · 126.3s**。
- **S09** ADR 0017 + `public-names.json`：unified **28 名**强制单实现，registered **4 组**结构债显式登记；
  `check-public-names` 入 fast；负控（注入第二份 `h`）退出 1；fast **51/51 · 119.6s**。
- **S10** `dom-runtime.setAttribute` 复用 `isSafeAttribute`，signal 路径拦截 `javascript:`/内联事件；
  新增 `check-render-parity`（vnode/signal/SSR 三模式 6 断言）；负控（临时禁用判定）退出 1；
  修复后 6/6、dom-runtime 85 例绿；fast **52/52 · 119.8s**。
- ⚠️ 发现（非 S06 引入）：`pnpm build` 因 `sideEffects:false` 丢弃 `builtin-components`
  副作用，component dist 缺内置组件注册；根配置测试绿，core 包级 dist 测试 5 红，待批次0 处理。
- **待决项 C3**：`@lytjs/ui` 依赖 reactivity/vdom/component/core，与
  `keel/ARCHITECTURE.md:26` 冲突；S02 只登记 allowlist，待 owner 裁定。

## 11-06 完成
- A15 体积预算；B01a 对拍 77/100；B01b 别名回退；B01 未达成（`0015` 草稿）；B04 契约红 15→0；B05 i18n 29→0、a11y 19/0/1、keyboard 11/0/9、Playwright 9/9。

## 下一步
1. **S11** style 单位 → **S12** hydration/list-diff 收敛。
2. 批次0 余项 **S03/S04/S05**（re-export 检查、CI/文档同步、负控框架）。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
