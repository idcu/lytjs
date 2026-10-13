---
scope: <域：db / api / auth / finance / meta …>
status: active          # active | distilled（已上提宪法） | archived（移入 archive/ 并删 INDEX 行，ADR 0009）
severity: P2            # P0 资金/数据/安全；P1 主流程阻断；P2 局部返工；P3 体验
last-verified: 2026-09-30
triggers: 0             # 每次触发 +1（commit-msg 钩子自动）；≥3 由 lint 提醒蒸馏
keywords: [中英混合, 便于 grep, 同义词也写]
---

<!-- 三段式缺任一段即 lint fail。文件名必须是关键词，不能带日期、不能是大写。
     复制时：删掉本注释、换文件名，并在 pitfalls/INDEX.md 加一行。 -->

## 症状

<现象：可观测的报错/表现。写"看到了什么"，不写"为什么">

## 根因

<机制：为什么会必然发生。要到能被反驳的粒度——"大概"不算根因>

## 正解

- <能照着直接做的动作。判据：能照着直接改代码吗？不能就重写>

<!-- 「正解」写**具体动作**而非"不要那样做"：例「先 grep 消费点再 grep 写入点」，不写「不要只改一处」。 -->
