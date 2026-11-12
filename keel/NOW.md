---
scope: now
status: active
last-verified: 2026-11-12
updated: 2026-11-12
keywords: [S35, P0 止血, 体积裁决, 负控, 覆盖率快照, 门禁台账]
---

# NOW · main

## 当前焦点

- **S35 审计收口**：P0 8 笔已逐笔提交并 push（security XSS、RAWTEXT 死循环、
  v-else+v-for 断链、script setup 局部变量/import、hoisted vnode、popstate、SSG 穿越）。
  历史取证：S30 V5/V6 34 格审计见 [ui-contracts-na-audit](checks/ui-contracts-na-audit.md)。
- **第二批**：first-screen-runtime 基线按 owner 裁决上调至 37648（预算 38400，
  实测 38346，留 54 B），见 [ADR 0029](decisions/0029-bundle-first-screen-runtime-baseline.md)；
  负控登记表 75 verified + 1 uninjectable，`--quick` 57/57；覆盖率快照刷新到
  `ef71dfe8`（445/436 = 97.98%）。
- **第三批**：`checks/rules.md` 与 `gate.mjs` 对齐到 76 条（59 fast / 17 slow）；
  UI 契约 v-model/slots 探针改为 AST 判据（107 pass / 0 red / 33 n/a）。

## P0 账

| 笔 | 哈希 | 缺陷 |
| --- | --- | --- |
| 1 | ab2bf164 | sanitizeHTML XSS（slash 事件/实体/越界码点） |
| 2 | 731617b4 | RAWTEXT 解析死循环 |
| 3 | b3f4fe27 | v-else/v-else-if + v-for 断链 |
| 4 | 695b3671 | script setup 局部变量进顶层绑定 |
| 5 | 165bb746 | script setup import 不进模板作用域 |
| 6 | 0c6460e7 | 静态提升 vnode 跨实例共享 |
| 7 | 74ab0ed1 | popstate 绕过守卫与重定向 |
| 8 | c26a284d | SSG 路径穿越 |

## 遗留

- **check-ui-styles 78 条欠账未消**（Calendar 4 / Cascader 16 / ColorPicker 9 /
  DatePicker 24 / TimePicker 12 / Upload 13），按约定只减不增、未动基线。
  两条正解（补 CSS 或删组件类名）分别需要设计输入与 DOM 变更授权，本轮均不可做，
  登记为发布前置债。
- 体积专项债务：plugin / common-error 按需加载（ADR 0029 已登记）。

## 下一步

- 依 [ADR 0028](decisions/0028-owner-authorized-strategy-decisions.md) 推进剩余批次与发布。
- 6 个空样式组件补设计；8.0.0 删 createVaporRenderer / VaporRenderer 与 optimizeSignal。

## 阻塞

- 78 条裸 DOM 样式欠账缺设计输入（补样式）且本轮禁止改组件 DOM（删类名）。
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
