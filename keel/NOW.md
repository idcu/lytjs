---
scope: now
status: active
last-verified: 2026-11-15
updated: 2026-11-15
keywords: [S35, P0 止血, 体积裁决, 负控, 覆盖率基线, 逐文件棘轮, signal 收编, 快照基线, 产物求值, core/runtime]
---

# NOW · main

## 本轮（2026-11-15）

- 覆盖率门禁重做（[ADR 0034](decisions/0034-coverage-per-file-ratchet-baseline.md)）：改为受版本控制的静态基线
  `scripts/coverage-baseline.json`，逐文件/全局 statements·functions·lines `covered` 不得下降，
  未插桩集合不新增；`branches` 仅记录不参与判据。旧「sha256 + HEAD 双指纹」是档内自比对，已删。
- 基线由 `--update` 连跑三次 `test:coverage` 取逐文件 min（无容差），三项抖动 0 文件；
  slow 22 项（21 命名 + 1 自动前置）。上一轮记录见 [NOW 快照](NOW-history/2026-11-14-signal收编与产物门禁.md)。

## 当前焦点

- **S35 收口**：P0 8 笔已 push；取证见 [ui-contracts-na-audit](checks/ui-contracts-na-audit.md)。
- first-screen-runtime 基线 37648/38400（[0029](decisions/0029-bundle-first-screen-runtime-baseline.md)）。
- `checks/rules.md` 与 `gate.mjs`：83 条（61 fast / 22 slow）。

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
  DatePicker 24 / TimePicker 12 / Upload 13），只减不增。
- 体积债：plugin / common-error 按需加载（ADR 0029）。
- 覆盖率（三次取 min，全分母）：54932/61988 88.617%、3886/4336 89.622%；branches 16598/18854 仅信息；棘轮 66.5/72.2/86.2。旧口径 97.5/97.99 不可横比

## 下一步

- 依 [ADR 0028](decisions/0028-owner-authorized-strategy-decisions.md) 推进批次与发布。
- 6 个空样式组件补设计；8.0.0 删 Vapor 与 optimizeSignal。

## 阻塞

- 78 条裸 DOM 样式欠账缺设计输入，本轮禁止改组件 DOM（删类名）。
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
