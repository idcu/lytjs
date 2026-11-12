---
scope: now
status: active
last-verified: 2026-11-13
updated: 2026-11-13
keywords: [S35, P0 止血, 体积裁决, 负控, 覆盖率快照, core/runtime, 打包契约]
---

# NOW · main

## 本轮（2026-11-13）

- [ADR 0030](decisions/0030-runtime-entry-no-compiler-contract.md)：core/runtime 剥离编译器；
  signal 模板改为抛可操作错误；新增 `@lytjs/renderer/app` 子路径。
- 硬判据「runtime-app 不含编译器」已反证（接回 barrel ⇒ 红 + 94,170 B）。
- 25/25 断言绿：runtime-app 33,481 / minimal-app 79,748 / first-screen-runtime 29,724 B。
- 四道门禁与快照门禁通过，未 `--update`；示例/文档/playground 无静默失效调用。

## 当前焦点

- **S35 收口**：P0 8 笔已提交 push；历史取证见 [ui-contracts-na-audit](checks/ui-contracts-na-audit.md)。
- first-screen-runtime 基线 37648（预算 38400），见 [ADR 0029](decisions/0029-bundle-first-screen-runtime-baseline.md)。
- `checks/rules.md` 与 `gate.mjs` 对齐 76 条（59 fast / 17 slow）。

## P0 账

| 笔 | 哈希 | 缺陷 |
| --- | --- | --- |
| 1 | ab2bf164 | sanitizeHTML XSS |
| 2 | 731617b4 | RAWTEXT 解析死循环 |
| 3 | b3f4fe27 | v-else/v-else-if + v-for 断链 |
| 4 | 695b3671 | script setup 局部变量进顶层绑定 |
| 5 | 165bb746 | script setup import 不进模板作用域 |
| 6 | 0c6460e7 | 静态提升 vnode 跨实例共享 |
| 7 | 74ab0ed1 | popstate 绕过守卫与重定向 |
| 8 | c26a284d | SSG 路径穿越 |

## 遗留

- check-ui-styles 78 条欠账（Calendar 4 / Cascader 16 / ColorPicker 9 /
  DatePicker 24 / TimePicker 12 / Upload 13），只减不增，登记为发布前置债。
- 体积专项债务：plugin / common-error 按需加载（ADR 0029）。

## 下一步

- 依 [ADR 0028](decisions/0028-owner-authorized-strategy-decisions.md) 推进批次与发布。
- 6 个空样式组件补设计；8.0.0 删 createVaporRenderer / VaporRenderer 与 optimizeSignal。

## 阻塞

- 78 条裸 DOM 样式欠账缺设计输入，本轮禁止改组件 DOM（删类名）。
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
