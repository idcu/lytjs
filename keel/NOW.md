---
scope: now
status: active
last-verified: 2026-11-14
updated: 2026-11-14
keywords: [S35, P0 止血, 体积裁决, 负控, 覆盖率快照, signal 收编, 快照基线, 产物求值, core/runtime]
---

# NOW · main

## 本轮（2026-11-14）

- 覆盖率：现场产物 + 双指纹 + 冻结清单；fast 不声称覆盖率。
- signal 收编：第 2 步 `processConditional`、第 3 步 `processElement` 已下沉 shared，
  两版只保留拼写；每步以 230 份逐字快照 + 100 模板对拍为验收。
- 快照基线：按 `fa7beaa4`/`d839b156` 逐笔归因刷新；负控改拼写 ⇒ 22 红，还原回绿（`488bf995`）。
- optimized/for13 缺 import 已修（运行时标记透传）；新增产物自洽求值门禁。
- 口径：读 dist 的门禁标 needsDist，自动前置 freshness；stale 拒跑 exit 1。
- ADR 0033：优化器拆 `signal-optimized` 子入口+显式注册；first-screen 80763→74595 B。

## 当前焦点

- **S35 收口**：P0 8 笔已提交 push；历史取证见 [ui-contracts-na-audit](checks/ui-contracts-na-audit.md)。
- first-screen-runtime 基线 37648（预算 38400），见 [ADR 0029](decisions/0029-bundle-first-screen-runtime-baseline.md)。
- `checks/rules.md` 与 `gate.mjs` 对齐 78 条（58 fast / 20 slow）。

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
