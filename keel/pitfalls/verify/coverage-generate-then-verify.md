---
scope: verify
status: active
severity: P1
last-verified: 2026-11-15
triggers: 1
keywords: [覆盖率, 门禁, 自比对, 生成即校验, 基线]
---

## 症状

门禁绿，但删测试、把源文件挤出插桩范围仍绿。

## 根因

旧 `check-coverage-snapshot` 在同一档内三步闭环：`test:coverage` 生成产物 →
`coverage:snapshot` 把它的 sha256 + HEAD 写进快照 → 校验脚本拿产物与快照比。
三个输入同源，只能证明「第 2 步跑过」，不能证明覆盖率没降。sha256、HEAD、
冻结清单都是严格性信号，所以它读起来像门禁，实际约束的是流程顺序。

识别方法：上游若在本档内生成被判对象，就是自比对。

## 正解

ADR 0034：基线改为受版本控制的静态文件，只由 `--update` 写入（三次取 min、
打印 diff、人工确认）；门禁只比「现场产物 vs 静态基线」，逐文件/全局
statements·functions·lines 的 covered 不低于基线、未插桩集合不新增。
判死：删测试 ⇒ 该文件 48→41 ⇒ 红；挤出插桩 ⇒ 未插桩 7→8 ⇒ 红。
支路抖动（branchMap 移位）不参与判据。
