---
scope: now
status: active
last-verified: 2026-11-15
updated: 2026-11-15
keywords: [S35, P0 止血, 体积裁决, 负控, 覆盖率基线, 逐文件棘轮, signal 收编, 快照基线, 产物求值, core/runtime]
---

# NOW · main

## 本轮（2026-11-15）

- 覆盖率门禁重做（[ADR 0034](decisions/0034-coverage-per-file-ratchet-baseline.md)）：静态基线逐文件/全局
  statements·functions·lines 不得降，未插桩不新增，branches 仅记录。
- 发布门禁去手工环境（workspace 派生 + 幂等补链 + 本树解析）；序列=全档门禁→version→build→升版后子集。
- CLI 版本改构建期注入 `__CLI_VERSION__`，删回落；`check-runtime-version` 覆盖 cli ESM+CJS `--version`。
- slow 22 项（21 命名 + 1 自动前置）。上一轮见 [NOW 快照](NOW-history/2026-11-14-signal收编与产物门禁.md)。

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
- 覆盖率：54932/61988、3886/4336；branches 仅信息；棘轮 66.5/72.2/86.2（ADR 0034）。

## 下一步

- 依 [ADR 0028](decisions/0028-owner-authorized-strategy-decisions.md) 推进批次与发布。
- 6 个空样式组件补设计；8.0.0 删 Vapor 与 optimizeSignal。

## 阻塞

- 覆盖率基线 vs 本轮删码：cli/run.ts 已覆盖 104→91，slow 2 项红；是否 `--update` 待 owner 定。
- 78 条裸 DOM 样式欠账缺设计输入，禁改组件 DOM。
